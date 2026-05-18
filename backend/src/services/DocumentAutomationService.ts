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
                                    } 
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
                    const html = PDFService.processTemplate(offerTemplate.content, sale, companyInfo, branchInfo, accountantInfo);
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
                    
                    const html = PDFService.processTemplate(receiptHtml, sale, companyInfo, branchInfo, accountantInfo);
                    const pdfBuffer = await PDFService.generatePdfBuffer(html);
                    attachments.push({ filename: `Receipt_${payment.reference || payment.id.substring(0,6)}.pdf`, content: pdfBuffer });
                }

                // 2. Generate Allocation Letter
                const isCompleted = sale.totalPaid >= sale.agreedPrice;
                const allocationType = isCompleted ? 'FINAL_ALLOCATION' : 'PROVISIONAL_ALLOCATION';
                const allocationTemplate = templates.find(t => t.type === allocationType);
                
                if (allocationTemplate) {
                    const html = PDFService.processTemplate(allocationTemplate.content, sale, companyInfo, branchInfo, accountantInfo);
                    const pdfBuffer = await PDFService.generatePdfBuffer(html);
                    attachments.push({ filename: `${isCompleted ? 'Final' : 'Provisional'}_Allocation_Letter.pdf`, content: pdfBuffer });
                }

                emailSubject = `Payment Receipt & Allocation Documents for ${sale.plot?.estate?.name}`;
                emailBody += `<p>We have successfully registered your recent payment. Please find attached your official Receipt along with your ${isCompleted ? 'Final Allocation Letter and deed documents' : 'Provisional Allocation Letter'}.</p>`;
            }

            // Dispatch Email if attachments exist
            if (attachments.length > 0) {
                emailBody += `<p>Thank you for choosing ${companyInfo?.name || "Us"}.</p>`;
                const fromAddress = branchInfo?.email || companyInfo?.email || undefined;
                await EmailService.send(sale.lead.email, emailSubject, emailBody, attachments, fromAddress);
                console.log(`[DocAuto] Successfully emailed ${attachments.length} documents for Sale ${saleId}`);
            }

        } catch (error: any) {
            console.error(`[DocAuto] Failed to dispatch documents for sale ${saleId}:`, error);
            throw error;
        }
    }
};
