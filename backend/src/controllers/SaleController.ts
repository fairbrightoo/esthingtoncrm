import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DocumentAutomationService } from '../services/DocumentAutomationService.js';
import { uploadFile } from '../services/StorageService.js';
import prisma from '../config/prisma.js';


export const SaleController = {
    // 1. Create a Sale (Assign Product to Lead)
    createSale: async (req: Request, res: Response) => {
        try {
            const { 
                leadId,
                plotId,
                nameOnDocument, 
                phoneOnDocument, 
                addressOnDocument, 
                termsAccepted,
                discountCode,  // Optional code
                marketerId     // For cross-selling attribution
            } = req.body as any;

            const plot = await prisma.plot.findUnique({ where: { id: String(plotId) } });
            if (!plot) return res.status(404).json({ error: "Plot not found" });

            if (plot.status !== 'AVAILABLE') {
                return res.status(400).json({ error: `Cannot sell plot. It is currently ${plot.status}.` });
            }

            const lead = await prisma.lead.findUnique({ where: { id: String(leadId) } });
            if (!lead) return res.status(404).json({ error: "Lead not found" });

            const resolvedMarketerId = marketerId || lead.assignedToUserId;

            // Pricing Logic
            let finalPrice = plot.price;

            // Discount Logic
            let activeDiscountId = null;
            if (discountCode) {
                const discount = await prisma.discountCode.findUnique({ 
                    where: { code: String(discountCode).toUpperCase().trim() },
                    include: { _count: { select: { sales: true } } }
                });

                if (discount && discount.isActive) {
                    if (discount.expiresAt && new Date() > new Date(discount.expiresAt)) {
                        return res.status(400).json({ error: "This discount code has expired." });
                    }
                    if (discount.maxUses && discount._count.sales >= discount.maxUses) {
                        return res.status(400).json({ error: "This discount code has reached its maximum usage limit." });
                    }

                    activeDiscountId = discount.id;
                    if (discount.type === 'FLAT') {
                        finalPrice -= discount.value;
                    } else if (discount.type === 'PERCENTAGE') {
                        finalPrice -= (finalPrice * (discount.value / 100));
                    }
                    if (finalPrice < 0) finalPrice = 0; // Guard against over-discount
                } else {
                    return res.status(400).json({ error: "Invalid or inactive discount code." });
                }
            }


            let marketerCommissionRate = 5.0;
            let referrerId = null;
            let referrerCommissionRate = null;

            if (resolvedMarketerId) {
                const marketerInfo = await prisma.user.findUnique({
                    where: { id: resolvedMarketerId },
                    include: { referrer: true }
                });

                if (marketerInfo) {
                    marketerCommissionRate = marketerInfo.commissionRate || 5.0;
                    
                    if (marketerInfo.referrer) {
                        referrerId = marketerInfo.referrer.id;
                        referrerCommissionRate = Math.max(0, (marketerInfo.referrer.commissionRate || 10.0) - marketerCommissionRate);
                    }
                }
            }

            const sale = await prisma.sale.create({
                data: {
                    leadId: String(leadId),
                    marketerId: resolvedMarketerId,
                    plotId: String(plotId),
                    plotNumber: plot.plotNumber,
                    agreedPrice: finalPrice,
                    isCornerPiece: plot.isCornerPiece,
                    nameOnDocument: nameOnDocument ? String(nameOnDocument) : null,
                    phoneOnDocument: phoneOnDocument ? String(phoneOnDocument) : null,
                    addressOnDocument: addressOnDocument ? String(addressOnDocument) : null,
                    termsAccepted: Boolean(termsAccepted),
                    termsAcceptedAt: termsAccepted ? new Date() : null,
                    discountCodeId: activeDiscountId,
                    marketerCommissionRate,
                    referrerId,
                    referrerCommissionRate
                }
            });

            // Notification for Cross-Selling
            if (marketerId && marketerId !== lead.assignedToUserId) {
                await prisma.activity.create({
                    data: {
                        leadId: lead.id,
                        type: 'NOTE',
                        direction: 'INBOUND',
                        notes: `[SYSTEM] CROSS-SALE RECORDED: This new sale was attributed to a different marketer.`,
                    }
                });
            }

            // Status Update: As long as payment is ongoing, mark Plot as RESERVED
            await prisma.plot.update({
                where: { id: plotId },
                data: { status: 'RESERVED' }
            });

            // Fire off background task to email the Offer Letter automatically
            try {
                await DocumentAutomationService.dispatchDocuments(sale.id, 'OFFER');
            } catch (docError: any) {
                return res.status(500).json({ 
                    error: `Purchase created, but failed to generate/email Offer Letter. Reason: ${docError.message}` 
                });
            }

            res.status(201).json(sale);
        } catch (error) {
            console.error("Create Sale Error", error);
            res.status(500).json({ error: "Failed to create sale" });
        }
    },

    // 2. Get Sales for a Lead
    getLeadSales: async (req: Request, res: Response) => {
        try {
            const { leadId } = req.params;
            const sales = await prisma.sale.findMany({
                where: { leadId: String(leadId) },
                include: {
                    plot: {
                        include: { 
                            estate: {
                                include: {
                                    company: true,
                                    branch: {
                                        include: {
                                            users: {
                                                where: { role: 'ACCOUNTANT', isActive: true },
                                                take: 1
                                            }
                                        }
                                    }
                                }
                            } 
                        }
                    },
                    lead: { include: { branch: true } },
                    payments: { orderBy: { date: 'desc' } }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(sales);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch sales" });
        }
    },

    // 3. Record Payment (Installment) with Proof Upload OR Equity Wallet
    recordPayment: async (req: Request, res: Response) => {
        try {
            const { saleId } = req.params;
            const { amount, method, reference, userId, accountPaidTo, notes, virtualLoanAmount } = req.body;

            const sale = await prisma.sale.findUnique({
                where: { id: String(saleId) },
                include: { lead: { include: { assignedToUser: true } } }
            });
            if (!sale) {
                res.status(404).json({ error: "Sale not found" });
                return;
            }

            // --- VIRTUAL LOAN VALIDATION ---
            const numericAmount = Number(amount);
            const loanAmount = Number(virtualLoanAmount) || 0;
            
            if (loanAmount > 0) {
                const commissionRate = sale.marketerCommissionRate || sale.lead.assignedToUser?.commissionRate || 5.0;
                const maxLoan = (numericAmount * commissionRate) / 100;
                if (loanAmount > maxLoan) {
                    return res.status(400).json({ error: `Virtual loan exceeds maximum eligible amount of ₦${maxLoan.toLocaleString()}` });
                }
            }

            // --- EQUITY WALLET LOGIC ---
            if (method === 'EQUITY_WALLET') {
                if (sale.lead.equityWalletBalance < numericAmount) {
                    return res.status(400).json({ error: "Insufficient equity wallet balance." });
                }

                await prisma.$transaction(async (tx) => {
                    // Deduct from Wallet
                    await tx.lead.update({
                        where: { id: sale.leadId },
                        data: { equityWalletBalance: { decrement: numericAmount } }
                    });

                    // Create Auto-Approved Payment
                    const payment = await tx.payment.create({
                        data: {
                            saleId: sale.id,
                            amount: numericAmount,
                            method: 'EQUITY_WALLET',
                            reference: reference || null,
                            status: 'APPROVED',
                            recordedByUserId: userId,
                            accountPaidTo: accountPaidTo || null,
                            notes: notes || null,
                            virtualLoanAmount: loanAmount,
                            isCommissionPaid: true // User requested no commission on reused equity
                        }
                    });

                    // Instantly Apply to Sale (Cash + Virtual Loan)
                    const newTotal = sale.totalPaid + numericAmount + loanAmount;
                    const isCompleted = newTotal >= sale.agreedPrice;

                    await tx.sale.update({
                        where: { id: sale.id },
                        data: {
                            totalPaid: newTotal,
                            status: isCompleted ? 'COMPLETED' : 'ONGOING',
                            updatedAt: new Date()
                        }
                    });

                    if (isCompleted) {
                        await tx.plot.update({
                            where: { id: sale.plotId },
                            data: { status: 'SOLD' }
                        });
                    }
                });

                return res.status(201).json({ message: "Equity payment successful" });
            }

            // --- STANDARD CASH LOGIC ---
            if (!req.files || !(Array.isArray(req.files)) || req.files.length === 0) {
                res.status(400).json({ error: "Proof of payment is required." });
                return;
            }

            const savedUrls: string[] = [];
            for (const file of req.files as Express.Multer.File[]) {
                const url = await uploadFile(file.buffer, file.originalname, 'receipts');
                savedUrls.push(url);
            }

            // Serialize array of URLs
            const proofOfPaymentUrl = JSON.stringify(savedUrls);

            // Deduce receiving branch from accountPaidTo
            let receivingBranchId: string | null = null;
            if (accountPaidTo) {
                const parts = accountPaidTo.split(' - ');
                const accountNum = parts[parts.length - 1]?.trim();
                if (accountNum) {
                    const corporateAccount = await prisma.corporateBankAccount.findFirst({
                        where: { accountNumber: accountNum }
                    });
                    if (corporateAccount) {
                        receivingBranchId = corporateAccount.branchId;
                    }
                }
            }

            // Create Payment with PENDING status
            const payment = await prisma.payment.create({
                data: {
                    saleId: String(saleId),
                    amount: Number(amount),
                    method,
                    reference,
                    proofOfPaymentUrl,
                    status: 'PENDING',
                    recordedByUserId: userId,
                    accountPaidTo: accountPaidTo || null,
                    notes: notes || null,
                    virtualLoanAmount: loanAmount,
                    receivingBranchId,
                    bankBranchConfirmation: receivingBranchId ? 'PENDING' : null
                }
            });

            res.status(201).json(payment);
        } catch (error: any) {
            console.error("Record Payment Error", error);
            res.status(500).json({ error: "Failed to record payment", details: error.message });
        }
    },

    // 4. Get Pending Payments (For Managing Director & Accountant Verification)
    getPendingPayments: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            
            let whereClause: any = { status: 'PENDING' };

            let companyBranchIds: string[] = [];

            // Respect Cross-Company & Branch boundaries
            if (!['SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GROUP_MANAGING_DIRECTOR'].includes(user?.role)) {
                const effectiveCompanyId = user?.companyId;
                const effectiveBranchId = user?.branchId;
                
                if (['MANAGING_DIRECTOR', 'ACCOUNTANT', 'GENERAL_MANAGER', 'BRANCH_ADMIN'].includes(user?.role)) {
                    // Restricted to their specific BRANCH
                    whereClause.OR = [
                        { sale: { marketer: { branchId: effectiveBranchId } } },
                        { sale: { plot: { estate: { managingBranchId: effectiveBranchId } } } },
                        { receivingBranchId: effectiveBranchId }
                    ];
                } else {
                    whereClause.sale = { marketer: { companyId: effectiveCompanyId } };
                }
            } else if (user?.role === 'GROUP_MANAGING_DIRECTOR') {
                const branches = await prisma.branch.findMany({ where: { companyId: user?.companyId } });
                companyBranchIds = branches.map(b => b.id);
            }

            const payments = await prisma.payment.findMany({
                where: whereClause,
                include: {
                    sale: {
                        include: {
                            plot: { 
                                include: { 
                                    estate: {
                                        include: {
                                            company: true,
                                            branch: {
                                                include: {
                                                    users: {
                                                        where: { role: 'ACCOUNTANT', isActive: true },
                                                        take: 1
                                                    }
                                                }
                                            }
                                        }
                                    } 
                                } 
                            },
                            lead: true,
                            marketer: { select: { fullName: true, role: true, companyId: true, branchId: true } }
                        }
                    },
                    recordedByUser: {
                        select: { fullName: true, email: true, role: true }
                    },
                    messages: {
                        select: { senderId: true, createdAt: true },
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Categorize Payments
            const directSales: any[] = [];
            const outboundCrossSales: any[] = [];
            const inboundCrossSales: any[] = [];
            const bankConfirmations: any[] = [];

            if (user?.role === 'SUPER_ADMIN') {
                directSales.push(...payments);
            } else {
                const effectiveCompanyId = user?.companyId;
                const effectiveBranchId = user?.branchId;

                payments.forEach(payment => {
                    const isSellingCompany = payment.sale.marketer?.companyId === effectiveCompanyId;
                    const isSellingBranch = payment.sale.marketer?.branchId === effectiveBranchId;
                    const isManagingCompany = payment.sale.plot.estate.companyId === effectiveCompanyId;
                    const isManagingBranch = payment.sale.plot.estate.managingBranchId === effectiveBranchId;
                    
                    // Deduce Receiving Branch matching
                    // Determine if the current user is acting on behalf of the receiving bank branch
                    let isReceivingBank = false;
                    if (payment.receivingBranchId) {
                        if (['ACCOUNTANT', 'MANAGING_DIRECTOR', 'GENERAL_MANAGER', 'BRANCH_ADMIN'].includes(user?.role)) {
                            isReceivingBank = payment.receivingBranchId === effectiveBranchId;
                        } else if (user?.role === 'GROUP_MANAGING_DIRECTOR') {
                            isReceivingBank = companyBranchIds.includes(payment.receivingBranchId);
                        }
                    }

                    // Direct Sale: We sold it AND we manage it
                    if (isSellingCompany && isManagingCompany) {
                        directSales.push(payment);
                    }
                    // Outbound Cross-Sale: We sold it, but someone else manages it
                    else if (isSellingCompany && !isManagingCompany) {
                        outboundCrossSales.push(payment);
                    }

                    // Inbound Cross-Sale: Someone else sold it, but we manage it
                    // NOTE: Removed "else" so it can be evaluated independently from selling company logic
                    if (!isSellingCompany && isManagingCompany) {
                        inboundCrossSales.push(payment);
                    }

                    // Bank Confirmation: We hold the cash
                    // Should appear here if we did NOT sell it. (If we sold it, we just approve the sale directly).
                    if (isReceivingBank && !isSellingCompany) {
                        bankConfirmations.push(payment);
                    }
                });
            }

            res.json({
                directSales,
                outboundCrossSales,
                inboundCrossSales,
                bankConfirmations
            });
        } catch (error) {
            console.error("Get Pending Payments Error", error);
            res.status(500).json({ error: "Failed to fetch pending payments" });
        }
    },

    // 4.b Get Processed Payments (History for MDs)
    getProcessedPayments: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { startDate, endDate } = req.query;
            let whereClause: any = { status: { in: ['APPROVED', 'REJECTED'] } };

            if (startDate && endDate) {
                whereClause.date = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                };
            }

            let companyBranchIds: string[] = [];

            // Respect Cross-Company & Branch boundaries
            if (!['SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GROUP_MANAGING_DIRECTOR'].includes(user?.role)) {
                const effectiveCompanyId = user?.companyId;
                const effectiveBranchId = user?.branchId;
                
                if (['MANAGING_DIRECTOR', 'ACCOUNTANT', 'GENERAL_MANAGER', 'BRANCH_ADMIN'].includes(user?.role)) {
                    // Restricted to their specific BRANCH
                    whereClause.OR = [
                        { sale: { marketer: { branchId: effectiveBranchId } } },
                        { sale: { plot: { estate: { managingBranchId: effectiveBranchId } } } },
                        { receivingBranchId: effectiveBranchId }
                    ];
                } else {
                    whereClause.sale = { marketer: { companyId: effectiveCompanyId } };
                }
            } else if (user?.role === 'GROUP_MANAGING_DIRECTOR') {
                const branches = await prisma.branch.findMany({ where: { companyId: user?.companyId } });
                companyBranchIds = branches.map(b => b.id);
            }

            const payments = await prisma.payment.findMany({
                where: whereClause,
                include: {
                    sale: {
                        include: {
                            plot: { 
                                include: { 
                                    estate: {
                                        include: {
                                            company: true,
                                            branch: {
                                                include: {
                                                    users: {
                                                        where: { role: 'ACCOUNTANT', isActive: true },
                                                        take: 1
                                                    }
                                                }
                                            }
                                        }
                                    } 
                                } 
                            },
                            lead: true,
                            marketer: { select: { fullName: true, role: true, companyId: true, branchId: true } }
                        }
                    },
                    recordedByUser: {
                        select: { fullName: true, email: true, role: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                ...(startDate && endDate ? {} : { take: 100 }) // Limit history for performance unless filtering
            });

            // Categorize Payments
            const directSales: any[] = [];
            const outboundCrossSales: any[] = [];
            const inboundCrossSales: any[] = [];
            const bankConfirmations: any[] = [];

            if (user?.role === 'SUPER_ADMIN') {
                directSales.push(...payments);
            } else {
                const effectiveCompanyId = user?.companyId;
                const effectiveBranchId = user?.branchId;

                payments.forEach(payment => {
                    const isSellingCompany = payment.sale.marketer?.companyId === effectiveCompanyId;
                    const isSellingBranch = payment.sale.marketer?.branchId === effectiveBranchId;
                    const isManagingCompany = payment.sale.plot.estate.companyId === effectiveCompanyId;
                    const isManagingBranch = payment.sale.plot.estate.managingBranchId === effectiveBranchId;
                    
                    // Determine if the current user is acting on behalf of the receiving bank branch
                    let isReceivingBank = false;
                    if (payment.receivingBranchId) {
                        if (['ACCOUNTANT', 'MANAGING_DIRECTOR', 'GENERAL_MANAGER', 'BRANCH_ADMIN'].includes(user?.role)) {
                            isReceivingBank = payment.receivingBranchId === effectiveBranchId;
                        } else if (user?.role === 'GROUP_MANAGING_DIRECTOR') {
                            isReceivingBank = companyBranchIds.includes(payment.receivingBranchId);
                        }
                    }

                    // Direct Sale: We sold it AND we manage it
                    if (isSellingCompany && isManagingCompany) {
                        directSales.push(payment);
                    }
                    // Outbound Cross-Sale: We sold it, but someone else manages it
                    else if (isSellingCompany && !isManagingCompany) {
                        outboundCrossSales.push(payment);
                    }

                    // Inbound Cross-Sale: Someone else sold it, but we manage it
                    if (!isSellingCompany && isManagingCompany) {
                        inboundCrossSales.push(payment);
                    }

                    // Bank Confirmation: We hold the cash
                    if (isReceivingBank && !isSellingCompany) {
                        bankConfirmations.push(payment);
                    }
                });
            }

            res.json({
                directSales,
                outboundCrossSales,
                inboundCrossSales,
                bankConfirmations
            });
        } catch (error) {
            console.error("Get Processed Payments Error", error);
            res.status(500).json({ error: "Failed to fetch processed payments" });
        }
    },

    // 5. Update Payment Status (Managing Director Approves/Rejects)
    updatePaymentStatus: async (req: Request, res: Response) => {
        try {
            const { paymentId } = req.params as { paymentId: string };
            const { status, rejectionReason } = req.body; // 'APPROVED' or 'REJECTED'

            if (!['APPROVED', 'REJECTED'].includes(status)) {
                res.status(400).json({ error: "Invalid status update" });
                return;
            }

            const payment = await prisma.payment.update({
                where: { id: paymentId },
                data: { 
                    status: String(status),
                    rejectionReason: status === 'REJECTED' ? (rejectionReason || null) : null
                }
            });

            // If approved, update the sale totals
            if (status === 'APPROVED') {
                const sale = await prisma.sale.findUnique({
                    where: { id: payment.saleId },
                    include: { lead: true }
                });

                if (sale) {
                    const newTotal = sale.totalPaid + payment.amount + (payment.virtualLoanAmount || 0);
                    const isCompleted = newTotal >= sale.agreedPrice;

                    await prisma.sale.update({
                        where: { id: sale.id },
                        data: {
                            totalPaid: newTotal,
                            status: isCompleted ? 'COMPLETED' : 'ONGOING',
                            updatedAt: new Date()
                        }
                    });

                    // If full payment is achieved, update Plot status to SOLD
                    if (isCompleted) {
                        await prisma.plot.update({
                            where: { id: sale.plotId },
                            data: { status: 'SOLD' }
                        });
                    }

                    // AUTO-CONVERT Lead to CLIENT if not already
                    if (sale.lead.status === 'PROSPECT') {
                        await prisma.lead.update({
                            where: { id: sale.leadId },
                            data: { status: 'CLIENT' }
                        });
                    }

                    // Fire off background task to email Receipt & Allocation Letters
                    try {
                        await DocumentAutomationService.dispatchDocuments(sale.id, 'PAYMENT', payment.id);
                    } catch (docError: any) {
                        return res.status(500).json({ 
                            error: `Payment approved, but failed to generate/email documents. Reason: ${docError.message}` 
                        });
                    }
                }
            }

            res.json(payment);
        } catch (error) {
            console.error("Update Payment Status Error", error);
            res.status(500).json({ error: "Failed to update payment status" });
        }
    },

    // 6. Assign Plot Number
    assignPlotNumber: async (req: Request, res: Response) => {
        try {
            const { saleId } = req.params as { saleId: string };
            const { plotNumber } = req.body;

            const sale = await prisma.sale.update({
                where: { id: saleId },
                data: { plotNumber }
            });
            res.json(sale);
        } catch (error) {
            console.error("Assign Plot Error", error);
            res.status(500).json({ error: "Failed to assign plot number" });
        }
    },

    // 7. Exchange Plot
    exchangePlot: async (req: Request, res: Response) => {
        try {
            const { saleId } = req.params as { saleId: string };
            const { newPlotId, userId } = req.body;
            
            const user = (req as any).user;
            if (!['BRANCH_ADMIN', 'MANAGING_DIRECTOR', 'SUPER_ADMIN'].includes(user?.role)) {
                return res.status(403).json({ error: "Unauthorized. Only Admins or MD can execute plot exchanges." });
            }

            const saleA = await prisma.sale.findUnique({
                where: { id: String(saleId) },
                include: { lead: true }
            });

            if (!saleA) return res.status(404).json({ error: "Original sale not found" });

            const plotB = await prisma.plot.findUnique({ where: { id: String(newPlotId) } });
            if (!plotB) return res.status(404).json({ error: "New plot not found" });

            if (plotB.status !== 'AVAILABLE') return res.status(400).json({ error: "The new plot is not available for exchange." });

            const totalEquity = saleA.totalPaid;
            
            let transferredAmount = 0;
            let surplus = 0;

            if (plotB.price <= totalEquity) {
                transferredAmount = plotB.price;
                surplus = totalEquity - plotB.price;
            } else {
                transferredAmount = totalEquity;
                surplus = 0;
            }

            const isCompleted = transferredAmount >= plotB.price;

            await prisma.$transaction(async (tx) => {
                // 1. Mark SaleA as EXCHANGED
                await tx.sale.update({
                    where: { id: saleId },
                    data: { status: 'EXCHANGED' }
                });

                // 2. Mark PlotA as AVAILABLE
                await tx.plot.update({
                    where: { id: saleA.plotId },
                    data: { status: 'AVAILABLE' }
                });

                // 3. Mark PlotB as SOLD or RESERVED
                await tx.plot.update({
                    where: { id: newPlotId },
                    data: { status: isCompleted ? 'SOLD' : 'RESERVED' }
                });

                // 4. Create SaleB
                const saleB = await tx.sale.create({
                    data: {
                        leadId: saleA.leadId,
                        plotId: newPlotId,
                        agreedPrice: plotB.price,
                        totalPaid: transferredAmount,
                        status: isCompleted ? 'COMPLETED' : 'ONGOING',
                        nameOnDocument: saleA.nameOnDocument,
                        phoneOnDocument: saleA.phoneOnDocument,
                        addressOnDocument: saleA.addressOnDocument,
                        isCornerPiece: plotB.isCornerPiece
                    }
                });

                // 5. Create synthetic Equity Virtual Payment on SaleB
                if (transferredAmount > 0) {
                    await tx.payment.create({
                        data: {
                            saleId: saleB.id,
                            amount: transferredAmount,
                            method: 'EQUITY_TRANSFER',
                            status: 'APPROVED',
                            proofOfPaymentUrl: 'SYSTEM_MIGRATION',
                            recordedByUserId: user?.userId, 
                            isCommissionPaid: true, // Prevents dual-commission
                        }
                    });
                }

                // 6. Deposit Surplus into Wallet
                if (surplus > 0) {
                    await tx.lead.update({
                        where: { id: saleA.leadId },
                        data: {
                            equityWalletBalance: {
                                increment: surplus
                            }
                        }
                    });
                }
            });

            res.json({ message: "Plot exchanged successfully", surplusStored: surplus });
        } catch (error) {
            console.error("Exchange Plot Error:", error);
            res.status(500).json({ error: "Failed to exchange plot" });
        }
    },

    // 10. Legacy Sales Onboarding (Single & Bulk)
    onboardLegacySales: async (req: Request, res: Response) => {
        try {
            const { salesData, companyId, branchId } = req.body;
            // @ts-ignore
            const recordedByUserId = req.user?.id || req.user?.userId;

            if (!Array.isArray(salesData)) {
                return res.status(400).json({ error: "salesData must be an array" });
            }

            let successfulImports = 0;
            let errors = [];

            for (let i = 0; i < salesData.length; i++) {
                const data = salesData[i];
                try {
                    await prisma.$transaction(async (tx) => {
                        // 0. Resolve Marketer
                        let resolvedMarketerId = data.marketerId || null;
                        if (!resolvedMarketerId && data.marketerEmail) {
                            const marketer = await tx.user.findFirst({
                                where: { email: data.marketerEmail, companyId }
                            });
                            if (marketer) resolvedMarketerId = marketer.id;
                        }

                        // 1. Verify/Create Lead
                        let lead = await tx.lead.findFirst({
                            where: { phone: data.clientPhone, companyId }
                        });
                        
                        const saleDate = data.dateOfSale ? new Date(data.dateOfSale) : new Date();

                        if (!lead) {
                            lead = await tx.lead.create({
                                data: {
                                    fullName: data.clientName,
                                    phone: data.clientPhone,
                                    email: data.clientEmail || null,
                                    companyId,
                                    branchId: branchId || null,
                                    status: 'CLIENT',
                                    assignedToUserId: resolvedMarketerId,
                                    createdAt: saleDate
                                }
                            });
                        } else {
                            // Upgrade status to CLIENT if needed, and always bump updatedAt so it jumps to top
                            await tx.lead.update({
                                where: { id: lead.id },
                                data: { 
                                    status: 'CLIENT',
                                    updatedAt: new Date()
                                }
                            });
                        }

                        // Log Activity to ensure 'Last Activity' changes
                        await tx.activity.create({
                            data: {
                                leadId: lead.id,
                                type: 'NOTE',
                                notes: `Legacy Sale onboarded for Plot ${data.plotNumber}`,
                                createdByUserId: recordedByUserId,
                                timestamp: new Date()
                            }
                        });

                        // 2. Plot Assignment / Dynamic Creation
                        let plot = await tx.plot.findUnique({
                            where: { plotNumber: data.plotNumber }
                        });

                        if (!plot) {
                            plot = await tx.plot.create({
                                data: {
                                    estateId: data.estateId,
                                    plotNumber: data.plotNumber,
                                    prototype: data.prototype || 'Legacy Plot',
                                    size: Number(data.size) || 0,
                                    price: Number(data.agreedPrice), 
                                    status: 'AVAILABLE',
                                    createdAt: saleDate
                                }
                            });
                        }

                        // Safety Check
                        if (plot.status === 'SOLD' || plot.status === 'RESERVED') {
                            const existingSale = await tx.sale.findFirst({
                                where: { plotId: plot.id, leadId: lead.id }
                            });
                            if (existingSale) {
                                throw new Error(`Plot ${plot.plotNumber} is already sold to this client.`);
                            } else {
                                throw new Error(`Plot ${plot.plotNumber} is already taken by someone else.`);
                            }
                        }

                        const numericAmountPaid = Number(data.amountPaidSoFar) || 0;
                        const numericAgreedPrice = Number(data.agreedPrice) || plot.price;
                        const isCompleted = numericAmountPaid >= numericAgreedPrice;

                        // 3. Sale Creation
                        const sale = await tx.sale.create({
                            data: {
                                leadId: lead.id,
                                plotId: plot.id,
                                agreedPrice: numericAgreedPrice,
                                totalPaid: numericAmountPaid,
                                status: isCompleted ? 'COMPLETED' : 'ONGOING',
                                marketerId: resolvedMarketerId || lead.assignedToUserId || null,
                                createdAt: saleDate
                            }
                        });

                        // 4. Historical Payment Injection
                        if (numericAmountPaid > 0) {
                            await tx.payment.create({
                                data: {
                                    saleId: sale.id,
                                    amount: numericAmountPaid,
                                    method: 'TRANSFER',
                                    status: 'APPROVED',
                                    reference: `LEGACY-${Date.now()}-${i}`,
                                    notes: 'Legacy system migration import',
                                    recordedByUserId: recordedByUserId,
                                    date: saleDate,
                                    isCommissionPaid: true,
                                    createdAt: new Date()
                                }
                            });
                        }

                        // 5. Plot Status Update
                        await tx.plot.update({
                            where: { id: plot.id },
                            data: { status: isCompleted ? 'SOLD' : 'RESERVED' }
                        });
                    });
                    successfulImports++;
                } catch (err: any) {
                    errors.push(`Row for ${data.clientName || 'Unknown'} failed: ${err.message}`);
                }
            }

            res.json({ message: `Successfully imported ${successfulImports} legacy sales.`, successfulImports, errors });
        } catch (error) {
            console.error("Legacy Onboarding Error:", error);
            res.status(500).json({ error: "Failed to onboard legacy sales" });
        }
    },

    // 11. Bank Receipt Confirmation
    bankConfirmPayment: async (req: Request, res: Response) => {
        try {
            const { paymentId } = req.params;
            const { status, note } = req.body;

            const payment = await prisma.payment.update({
                where: { id: paymentId as string },
                data: {
                    bankBranchConfirmation: status, // 'RECEIVED' or 'NOT_RECEIVED'
                    bankBranchConfirmationNote: note || null
                }
            });

            res.json(payment);
        } catch (error) {
            console.error("Bank Confirm Payment Error", error);
            res.status(500).json({ error: "Failed to confirm bank receipt" });
        }
    },

    // 12. Add Payment Message
    addPaymentMessage: async (req: Request, res: Response) => {
        try {
            const { paymentId } = req.params;
            const { content } = req.body;
            const user = (req as any).user;

            const message = await prisma.paymentMessage.create({
                data: {
                    paymentId: paymentId as string,
                    senderId: user.userId || user.id,
                    content
                },
                include: {
                    sender: { select: { fullName: true, role: true } }
                }
            });

            res.status(201).json(message);
        } catch (error) {
            console.error("Add Payment Message Error", error);
            res.status(500).json({ error: "Failed to add payment message" });
        }
    },

    // 13. Get Payment Messages
    getPaymentMessages: async (req: Request, res: Response) => {
        try {
            const { paymentId } = req.params;
            
            const messages = await prisma.paymentMessage.findMany({
                where: { paymentId: paymentId as string },
                include: {
                    sender: { select: { fullName: true, role: true } }
                },
                orderBy: { createdAt: 'asc' }
            });

            res.json(messages);
        } catch (error) {
            console.error("Get Payment Messages Error", error);
            res.status(500).json({ error: "Failed to fetch payment messages" });
        }
    }
};
