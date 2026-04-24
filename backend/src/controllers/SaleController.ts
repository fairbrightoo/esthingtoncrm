import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { DocumentAutomationService } from '../services/DocumentAutomationService.js';
import { uploadFile } from '../services/StorageService.js';

const prisma = new PrismaClient();

export const SaleController = {
    // 1. Create a Sale (Assign Product to Lead)
    createSale: async (req: Request, res: Response) => {
        try {
            const { 
                leadId, 
                plotId, 
                isCornerPiece, 
                nameOnDocument, 
                phoneOnDocument, 
                addressOnDocument, 
                termsAccepted,
                discountCode  // Optional code
            } = req.body as any;

            const plot = await prisma.plot.findUnique({ where: { id: String(plotId) } });
            if (!plot) return res.status(404).json({ error: "Plot not found" });

            if (plot.status !== 'AVAILABLE') {
                return res.status(400).json({ error: `Cannot sell plot. It is currently ${plot.status}.` });
            }

            // Pricing Logic
            let finalPrice = plot.price;
            if (isCornerPiece) finalPrice += 500000; // 500k surcharge

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

            const sale = await prisma.sale.create({
                data: {
                    leadId: String(leadId),
                    plotId: String(plotId),
                    isCornerPiece: Boolean(isCornerPiece),
                    agreedPrice: finalPrice,
                    status: 'ONGOING',
                    nameOnDocument: nameOnDocument ? String(nameOnDocument) : null,
                    phoneOnDocument: phoneOnDocument ? String(phoneOnDocument) : null,
                    addressOnDocument: addressOnDocument ? String(addressOnDocument) : null,
                    termsAccepted: Boolean(termsAccepted),
                    termsAcceptedAt: termsAccepted ? new Date() : null,
                    discountCodeId: activeDiscountId
                }
            });

            // Status Update: As long as payment is ongoing, mark Plot as RESERVED
            await prisma.plot.update({
                where: { id: plotId },
                data: { status: 'RESERVED' }
            });

            // Fire off background task to email the Offer Letter automatically
            DocumentAutomationService.dispatchDocuments(sale.id, 'OFFER').catch(e => console.error("Doc Auto Error:", e));

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
                        include: { estate: true }
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
            const { amount, method, reference, userId } = req.body;

            const sale = await prisma.sale.findUnique({
                where: { id: String(saleId) },
                include: { lead: true }
            });
            if (!sale) {
                res.status(404).json({ error: "Sale not found" });
                return;
            }

            // --- EQUITY WALLET LOGIC ---
            if (method === 'EQUITY_WALLET') {
                const numericAmount = Number(amount);
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
                            isCommissionPaid: true // User requested no commission on reused equity
                        }
                    });

                    // Instantly Apply to Sale
                    const newTotal = sale.totalPaid + numericAmount;
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

            // Create Payment with PENDING status
            const payment = await prisma.payment.create({
                data: {
                    saleId: String(saleId),
                    amount: Number(amount),
                    method,
                    reference,
                    proofOfPaymentUrl,
                    status: 'PENDING',
                    recordedByUserId: userId
                }
            });

            res.status(201).json(payment);
        } catch (error) {
            console.error("Record Payment Error", error);
            res.status(500).json({ error: "Failed to record payment" });
        }
    },

    // 4. Get Pending Payments (For Managing Director & Accountant Verification)
    getPendingPayments: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const whereClause: any = { status: 'PENDING' };

            // Respect Cross-Company & Branch boundaries
            if (user?.role !== 'SUPER_ADMIN') {
                const saleFilter: any = { plot: { estate: { companyId: user?.companyId } } };
                // If Accountant, restrict to Branch (MD sees full company)
                if (user?.role === 'ACCOUNTANT' && user?.branchId) {
                    saleFilter.lead = { branchId: user?.branchId };
                }
                whereClause.sale = saleFilter;
            }

            const payments = await prisma.payment.findMany({
                where: whereClause,
                include: {
                    sale: {
                        include: {
                            plot: { include: { estate: true } },
                            lead: true
                        }
                    },
                    recordedByUser: {
                        select: { fullName: true, email: true, role: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(payments);
        } catch (error) {
            console.error("Get Pending Payments Error", error);
            res.status(500).json({ error: "Failed to fetch pending payments" });
        }
    },

    // 4.b Get Processed Payments (History for MDs)
    getProcessedPayments: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const whereClause: any = { status: { in: ['APPROVED', 'REJECTED'] } };

            // Respect Cross-Company & Branch boundaries
            if (user?.role !== 'SUPER_ADMIN') {
                const saleFilter: any = { plot: { estate: { companyId: user?.companyId } } };
                // If Accountant, restrict to Branch (MD sees full company)
                if (user?.role === 'ACCOUNTANT' && user?.branchId) {
                    saleFilter.lead = { branchId: user?.branchId };
                }
                whereClause.sale = saleFilter;
            }

            const payments = await prisma.payment.findMany({
                where: whereClause,
                include: {
                    sale: {
                        include: {
                            plot: { include: { estate: true } },
                            lead: true
                        }
                    },
                    recordedByUser: {
                        select: { fullName: true, email: true, role: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 100 // Limit history for performance
            });
            res.json(payments);
        } catch (error) {
            console.error("Get Processed Payments Error", error);
            res.status(500).json({ error: "Failed to fetch processed payments" });
        }
    },

    // 5. Update Payment Status (Managing Director Approves/Rejects)
    updatePaymentStatus: async (req: Request, res: Response) => {
        try {
            const { paymentId } = req.params as { paymentId: string };
            const { status } = req.body; // 'APPROVED' or 'REJECTED'

            if (!['APPROVED', 'REJECTED'].includes(status)) {
                res.status(400).json({ error: "Invalid status update" });
                return;
            }

            const payment = await prisma.payment.update({
                where: { id: paymentId },
                data: { status: String(status) }
            });

            // If approved, update the sale totals
            if (status === 'APPROVED') {
                const sale = await prisma.sale.findUnique({
                    where: { id: payment.saleId },
                    include: { lead: true }
                });

                if (sale) {
                    const newTotal = sale.totalPaid + payment.amount;
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
                    DocumentAutomationService.dispatchDocuments(sale.id, 'PAYMENT', payment.id).catch(e => console.error("Doc Auto Error:", e));
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
    }
};
