import { PDFService } from './PDFService.js';
import { EmailService } from './EmailService.js';
import prisma from '../config/prisma.js';


export const DocumentAutomationService = {
    async dispatchDocuments(saleId: string, trigger: 'OFFER' | 'PAYMENT', paymentId?: string) {
        try {
            // Fetch everything we need
            const sale = await prisma.sale.findUnique({
                where: { id: saleId },
                include: {
                    lead: { include: { branch: true } },
                    plot: { 
                        include: { 
                            estate: { 
                                include: { 
                                    branch: {
                                        include: {
                                            users: {
                                                where: { role: 'ACCOUNTANT', isActive: true },
                                                take: 1
                                            }
                                        }
                                    },
                                    plotConfigs: true
                                } 
                            } 
                        } 
                    }
                }
            });

            if (!sale || !sale.lead.email) {
                console.warn(`[DocAuto] Cannot send documents for sale ${saleId}: No email attached to lead.`);
                return;
            }

            const companyId = sale.plot?.estate?.companyId;
            if (!companyId) return;

            const companyInfo = await prisma.company.findUnique({ where: { id: companyId } });
            // Prioritize the managing branch of the estate, fallback to the marketer's branch
            const branchInfo = sale.plot?.estate?.branch || sale.lead.branch;
            
            // Extract the managing branch's accountant if present
            const accountantInfo = sale.plot?.estate?.branch?.users?.[0] || null;

            // Fetch the branch's managing director
            const branchMDUser = branchInfo?.id ? await prisma.user.findFirst({
                where: {
                    branchId: branchInfo.id,
                    role: 'MANAGING_DIRECTOR'
                }
            }) : null;

            // Fetch templates
            const templates = await prisma.documentTemplate.findMany({
                where: { companyId }
            });

            const attachments: { filename: string, content: Buffer }[] = [];
            let emailSubject = "Your Documents from " + (companyInfo?.name || "Us");
            let emailBody = `<p>Dear ${sale.nameOnDocument || sale.lead.fullName},</p>`;

            if (trigger === 'OFFER') {
                const offerTemplate = templates.find(t => t.type === 'OFFER');
                if (offerTemplate) {
                    const html = PDFService.processTemplate(offerTemplate.content, sale, companyInfo, branchInfo, accountantInfo, 'OFFER', branchMDUser);
                    const pdfBuffer = await PDFService.generatePdfBuffer(html);
                    attachments.push({ filename: 'Offer_Letter.pdf', content: pdfBuffer });
                    
                    emailSubject = `Your Offer Letter for ${sale.plot?.estate?.name}`;
                    emailBody += `<p>Congratulations on taking the first step! Please find attached your official Offer Letter for your new property at <b>${sale.plot?.estate?.name}</b>.</p>`;
                }
            } else if (trigger === 'PAYMENT' && paymentId) {
                const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
                
                // 1. Generate Receipt
                if (payment) {
                    // We temporarily mock the generic receipt format
                    let receiptHtml = PDFService.getGenericReceiptTemplate();
                    
                    // Specific payment tweaks
                    receiptHtml = receiptHtml.replace(/{{TRANSACTION_AMOUNT}}/g, new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(payment.amount));
                    
                    const html = PDFService.processTemplate(receiptHtml, sale, companyInfo, branchInfo, accountantInfo, 'RECEIPT', branchMDUser);
                    const pdfBuffer = await PDFService.generatePdfBuffer(html);
                    attachments.push({ filename: `Receipt_${payment.reference || payment.id.substring(0,6)}.pdf`, content: pdfBuffer });
                }

                // 2. Generate Allocation Letter
                const isCompleted = sale.totalPaid >= sale.agreedPrice;
                const allocationType = isCompleted ? 'FINAL_ALLOCATION' : 'PROVISIONAL_ALLOCATION';
                const allocationTemplate = templates.find(t => t.type === allocationType);
                
                if (allocationTemplate) {
                    const html = PDFService.processTemplate(allocationTemplate.content, sale, companyInfo, branchInfo, accountantInfo, allocationType as any, branchMDUser);
                    const pdfBuffer = await PDFService.generatePdfBuffer(html);
                    attachments.push({ filename: `${isCompleted ? 'Final' : 'Provisional'}_Allocation_Letter.pdf`, content: pdfBuffer });
                }

                emailSubject = `Payment Receipt & Allocation Documents for ${sale.plot?.estate?.name}`;
                emailBody += `<p>We have successfully registered your recent payment. Please find attached your official Receipt along with your ${isCompleted ? 'Final Allocation Letter and deed documents' : 'Provisional Allocation Letter'}.</p>`;
            }

            // Dispatch Email if attachments exist
            if (attachments.length > 0) {
                emailBody += `<p>Thank you for choosing ${companyInfo?.name || "Us"}.</p>`;
                
                // Construct a fromAddress using the verified domain to avoid Resend domain verification errors
                const envEmail = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';
                const rawEmail = envEmail.includes('<') ? envEmail.match(/<([^>]+)>/)?.[1] || envEmail : envEmail;
                const fromName = companyInfo?.name || "Esthington Group";
                const fromAddress = `"${fromName}" <${rawEmail}>`;
                
                // Set the replyTo to the actual company email
                const replyToAddress = branchInfo?.email || companyInfo?.email || undefined;

                await EmailService.send(sale.lead.email, emailSubject, emailBody, attachments, fromAddress, replyToAddress);
                console.log(`[DocAuto] Successfully emailed ${attachments.length} documents for Sale ${saleId}`);
            }

        } catch (error: any) {
            console.error(`[DocAuto] Failed to dispatch documents for sale ${saleId}:`, error);
            throw error;
        }
    },

    async resendDocuments(
        saleId: string, 
        documentType: 'OFFER' | 'ALLOCATION' | 'PROVISIONAL_ALLOCATION' | 'FINAL_ALLOCATION' | 'RECEIPT' | 'ALL' = 'OFFER', 
        options?: { paymentId?: string; customEmail?: string; customMessage?: string; userId?: string }
    ) {
        try {
            const sale = await prisma.sale.findUnique({
                where: { id: saleId },
                include: {
                    lead: { include: { branch: true } },
                    plot: { 
                        include: { 
                            estate: { 
                                include: { 
                                    branch: {
                                        include: {
                                            users: {
                                                where: { role: 'ACCOUNTANT', isActive: true },
                                                take: 1
                                            }
                                        }
                                    },
                                    plotConfigs: true
                                } 
                            } 
                        } 
                    },
                    payments: {
                        where: { status: 'APPROVED' },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            if (!sale) {
                throw new Error("Sale record not found.");
            }

            const targetEmail = options?.customEmail?.trim() || sale.lead?.email;
            if (!targetEmail) {
                throw new Error("No client email address is registered for this sale. Please update the client's email in Biodata first.");
            }

            const companyId = sale.plot?.estate?.companyId;
            if (!companyId) throw new Error("Sale is not associated with an estate company.");

            const companyInfo = await prisma.company.findUnique({ where: { id: companyId } });
            const branchInfo = sale.plot?.estate?.branch || sale.lead?.branch;
            const accountantInfo = sale.plot?.estate?.branch?.users?.[0] || null;

            const branchMDUser = branchInfo?.id ? await prisma.user.findFirst({
                where: {
                    branchId: branchInfo.id,
                    role: 'MANAGING_DIRECTOR'
                }
            }) : null;

            const templates = await prisma.documentTemplate.findMany({
                where: { companyId }
            });

            const attachments: { filename: string, content: Buffer }[] = [];
            const estateName = sale.plot?.estate?.name || "Property";
            const clientName = sale.nameOnDocument || sale.lead?.fullName || "Valued Client";
            const companyName = companyInfo?.name || "Esthington Group";

            let emailSubject = `Updated Official Documents: ${estateName} - ${companyName}`;
            let emailBody = `<p>Dear <b>${clientName}</b>,</p>`;

            if (options?.customMessage) {
                emailBody += `<p>${options.customMessage.replace(/\n/g, '<br/>')}</p>`;
            } else {
                emailBody += `<p>Please find attached your updated official documentation for your property at <b>${estateName}</b>. All records and client particulars have been confirmed.</p>`;
            }

            // 1. Offer Letter
            if (documentType === 'OFFER' || documentType === 'ALL') {
                const offerTemplate = templates.find(t => t.type === 'OFFER');
                if (offerTemplate) {
                    const html = PDFService.processTemplate(offerTemplate.content, sale, companyInfo, branchInfo, accountantInfo, 'OFFER', branchMDUser);
                    const pdfBuffer = await PDFService.generatePdfBuffer(html);
                    attachments.push({ filename: `Offer_Letter_${estateName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, content: pdfBuffer });
                }
            }

            // 2. Allocation Letter
            if (documentType === 'ALLOCATION' || documentType === 'PROVISIONAL_ALLOCATION' || documentType === 'FINAL_ALLOCATION' || documentType === 'ALL') {
                const isCompleted = sale.totalPaid >= sale.agreedPrice;
                const allocationType = (documentType === 'FINAL_ALLOCATION' || (documentType !== 'PROVISIONAL_ALLOCATION' && isCompleted))
                    ? 'FINAL_ALLOCATION'
                    : 'PROVISIONAL_ALLOCATION';
                
                const allocationTemplate = templates.find(t => t.type === allocationType);
                if (allocationTemplate) {
                    const html = PDFService.processTemplate(allocationTemplate.content, sale, companyInfo, branchInfo, accountantInfo, allocationType as any, branchMDUser);
                    const pdfBuffer = await PDFService.generatePdfBuffer(html);
                    attachments.push({ filename: `${allocationType === 'FINAL_ALLOCATION' ? 'Final' : 'Provisional'}_Allocation_Letter.pdf`, content: pdfBuffer });
                }
            }

            // 3. Receipt
            if (documentType === 'RECEIPT' || documentType === 'ALL') {
                const targetPayment = options?.paymentId 
                    ? await prisma.payment.findUnique({ where: { id: options.paymentId } })
                    : sale.payments?.[0];

                if (targetPayment) {
                    let receiptHtml = PDFService.getGenericReceiptTemplate();
                    receiptHtml = receiptHtml.replace(/{{TRANSACTION_AMOUNT}}/g, new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(targetPayment.amount));
                    const html = PDFService.processTemplate(receiptHtml, sale, companyInfo, branchInfo, accountantInfo, 'RECEIPT', branchMDUser);
                    const pdfBuffer = await PDFService.generatePdfBuffer(html);
                    attachments.push({ filename: `Payment_Receipt_${targetPayment.reference || targetPayment.id.substring(0, 6)}.pdf`, content: pdfBuffer });
                }
            }

            if (attachments.length === 0) {
                throw new Error(`No document templates found for ${documentType}. Please ensure company document templates are configured in Settings.`);
            }

            emailBody += `<p>Thank you for choosing ${companyName}.</p>`;

            const envEmail = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';
            const rawEmail = envEmail.includes('<') ? envEmail.match(/<([^>]+)>/)?.[1] || envEmail : envEmail;
            const fromName = companyInfo?.name || "Esthington Group";
            const fromAddress = `"${fromName}" <${rawEmail}>`;
            const replyToAddress = branchInfo?.email || companyInfo?.email || undefined;

            await EmailService.send(targetEmail, emailSubject, emailBody, attachments, fromAddress, replyToAddress);

            // Log activity on lead
            await prisma.activity.create({
                data: {
                    leadId: sale.leadId,
                    type: 'EMAIL_SENT',
                    direction: 'OUTBOUND',
                    notes: `Resent updated official documents (${documentType}) with ${attachments.length} attachment(s) to ${targetEmail}`,
                    createdByUserId: options?.userId
                }
            });

            console.log(`[DocAuto] Successfully resent ${attachments.length} document(s) for Sale ${saleId} to ${targetEmail}`);

            return {
                success: true,
                message: `Successfully sent ${attachments.length} document(s) to ${targetEmail}`,
                targetEmail,
                attachmentCount: attachments.length
            };
        } catch (error: any) {
            console.error(`[DocAuto] Failed to resend documents for sale ${saleId}:`, error);
            throw error;
        }
    }
};
