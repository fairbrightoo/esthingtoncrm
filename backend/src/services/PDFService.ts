import puppeteer from 'puppeteer';

export const PDFService = {
    /**
     * Converts a raw HTML string into a beautiful A4 PDF Buffer.
     */
    async generatePdfBuffer(htmlContent: string): Promise<Buffer> {
        // Wrap the HTML in proper A4 layout formatting to match the frontend Print output
        const fullHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        @page { size: A4; margin: 0; }
                        body { 
                            margin: 0; 
                            -webkit-print-color-adjust: exact; 
                            print-color-adjust: exact; 
                            font-family: "Times New Roman", Times, serif;
                            color: black;
                            font-size: 14px;
                            line-height: 1.5;
                        }
                        .print-content { 
                            padding: 20mm; 
                            width: 210mm; 
                            min-height: 297mm; 
                            box-sizing: border-box; 
                        }
                        p { margin-bottom: 1rem; text-align: justify; }
                        ol { padding-left: 1.5rem; margin-bottom: 1rem; list-style-type: decimal; }
                        ul { padding-left: 1.5rem; margin-bottom: 1rem; list-style-type: disc; }
                        li { margin-bottom: 0.5rem; }
                        strong { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="print-content">
                        ${htmlContent}
                    </div>
                </body>
            </html>
        `;

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        try {
            const page = await browser.newPage();
            // Inject HTML
            await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
            
            // Generate PDF Buffer
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' }
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    },

    /**
     * Process Template Variables (Identical to Frontend Logic)
     */
    processTemplate(template: string, sale: any, companyInfo: any, branchInfo: any, accountantInfo?: any, documentType?: 'OFFER' | 'PROVISIONAL_ALLOCATION' | 'FINAL_ALLOCATION' | 'RECEIPT', branchMDUser?: any): string {
        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
        };

        const today = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

        let html = template;

        // Gender Salutation Logic
        const gender = sale.lead?.gender?.toLowerCase() || 'male';
        const correctSalutation = (gender === 'female') ? 'Dear Ma,' : 'Dear Sir,';
        // Replace permutations of "Dear Sir/Ma", "Dear sir/ma", "Dear sir/madam", etc.
        html = html.replace(/Dear\s*sir\/?ma\w*,?/gi, correctSalutation);

        // General Info
        html = html.replace(/{{CURRENT_DATE}}/g, today);
        
        // Client Info
        html = html.replace(/{{CLIENT_NAME}}/g, sale.nameOnDocument || sale.lead?.fullName || 'Client');
        html = html.replace(/{{CLIENT_ADDRESS}}/g, sale.addressOnDocument || sale.lead?.address || '___________________________');
        html = html.replace(/{{CLIENT_PHONE}}/g, sale.phoneOnDocument || sale.lead?.phone || '___________________________');

        // Plot Info
        html = html.replace(/{{ESTATE_NAME}}/g, sale.plot?.estate?.name || 'Estate');
        html = html.replace(/{{LOCATION}}/g, sale.plot?.estate?.location || 'Location');
        html = html.replace(/{{PLOT_SIZE}}/g, `${sale.plot?.size} sqm`);
        html = html.replace(/{{PLOT_NUMBER}}/g, sale.plot?.plotNumber || sale.plotNumber || '____________________');
        html = html.replace(/{{PROTOTYPE}}/g, sale.plot?.prototype || 'Prototype');
        // Dynamic Fees
        const supervisionFee = sale.plot?.estate?.projectSupervisionFee || 0;
        let settingOutFee = 400000; // fallback
        let infrastructureFee = 3000000; // fallback

        if (sale.plot?.estate?.plotConfigs && sale.plot?.prototype && sale.plot?.size) {
            const config = sale.plot.estate.plotConfigs.find((c: any) => c.prototype === sale.plot.prototype && c.size === sale.plot.size);
            if (config) {
                settingOutFee = config.settingOutFee;
                infrastructureFee = config.infrastructureFee;
            }
        }

        html = html.replace(/{{PROJECT_SUPERVISION_FEE}}/g, formatCurrency(supervisionFee));
        html = html.replace(/{{SETTING_OUT_FEE}}/g, formatCurrency(settingOutFee));
        html = html.replace(/{{INFRASTRUCTURE_FEE}}/g, formatCurrency(infrastructureFee));

        // Financials
        html = html.replace(/{{AGREED_PRICE}}/g, formatCurrency(sale.agreedPrice || 0));
        html = html.replace(/{{AMOUNT_PAID}}/g, formatCurrency(sale.totalPaid || 0));
        const balance = (sale.agreedPrice || 0) - (sale.totalPaid || 0);
        html = html.replace(/{{BALANCE_OUTSTANDING}}/g, formatCurrency(balance > 0 ? balance : 0));
        html = html.replace(/{{BALANCE_AMOUNT}}/g, formatCurrency(balance > 0 ? balance : 0));
        
        // Calculate Balance Deadline: 6 months from the date of the first installment (Sale createdAt)
        const firstInstallmentDate = new Date(sale.createdAt || new Date());
        const balanceDeadline = new Date(firstInstallmentDate);
        balanceDeadline.setMonth(balanceDeadline.getMonth() + 6);
        const balanceDateStr = new Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).format(balanceDeadline);
        html = html.replace(/{{BALANCE_DATE}}/g, balanceDateStr);

        // Note: Production API base URL must be set in ENV. Fallback to localhost if missing.
        const baseUrl = process.env.VITE_API_URL || 'http://localhost:3000';

        // Company Branding (Rendered as image tags if urls exist)
        const resolvedLogoUrl = companyInfo?.logoUrl ? (companyInfo.logoUrl.startsWith('http') ? companyInfo.logoUrl : `${baseUrl}${companyInfo.logoUrl}`) : '';
        const logoHtml = resolvedLogoUrl ? `<img src="${resolvedLogoUrl}" style="max-width: 250px; max-height: 80px; display: block; margin: 0 auto; border: none; outline: none;" alt="Logo" />` : `<h2 style="text-align: right; margin: 0;">${companyInfo?.name || 'Company Name'}</h2>`;
        html = html.replace(/{{COMPANY_LOGO}}/g, logoHtml);

        // Dynamic Signature and MD Name based on Document Type and Head Office Flag
        let finalMdName = 'Managing Director';
        let finalMdTitle = 'Managing Director';
        let finalSignatureUrl = '';

        const isHeadOffice = branchInfo?.isHeadOffice === true;
        const branchGeneralManagerName = branchInfo?.managerName || '';
        const branchGeneralManagerSig = branchInfo?.signatureUrl || '';
        const branchMDName = branchMDUser?.fullName || branchGeneralManagerName;
        const branchMDSig = branchMDUser?.signatureUrl || branchGeneralManagerSig;
        const groupMDName = companyInfo?.managingDirectorName || '';
        const groupMDSig = companyInfo?.signatureUrl || '';

        if (documentType === 'OFFER') {
            if (isHeadOffice) {
                finalMdName = branchMDName;
                finalMdTitle = 'Managing Director';
                finalSignatureUrl = branchMDSig;
            } else {
                finalMdName = branchGeneralManagerName;
                finalMdTitle = 'General Manager';
                finalSignatureUrl = branchGeneralManagerSig;
            }
        } else if (documentType === 'PROVISIONAL_ALLOCATION' || documentType === 'FINAL_ALLOCATION') {
            if (isHeadOffice) {
                finalMdName = groupMDName;
                finalMdTitle = 'Group Managing Director';
                finalSignatureUrl = groupMDSig;
            } else {
                finalMdName = branchMDName;
                finalMdTitle = 'Managing Director';
                finalSignatureUrl = branchMDSig;
            }
        } else {
            // Default fallback
            finalMdName = branchGeneralManagerName || groupMDName;
            finalMdTitle = branchGeneralManagerName ? 'General Manager' : 'Managing Director';
            finalSignatureUrl = branchGeneralManagerSig || groupMDSig;
        }

        const resolvedSignatureUrl = finalSignatureUrl ? (finalSignatureUrl.startsWith('http') ? finalSignatureUrl : `${baseUrl}${finalSignatureUrl}`) : '';
        const sigHtml = resolvedSignatureUrl ? `<img src="${resolvedSignatureUrl}" style="max-height: 60px; display: block; border: none;" alt="Signature" />` : ``;
        html = html.replace(/{{COMPANY_SIGNATURE}}/g, sigHtml);
        html = html.replace(/{{MD_NAME}}/g, finalMdName || 'Managing Director');
        html = html.replace(/{{MD_TITLE}}/g, finalMdTitle || 'Managing Director');

        // Receipt Specific Signatures (Accountant -> MD)
        const receiptSignerName = accountantInfo?.fullName || finalMdName;
        const receiptSignerRole = accountantInfo ? 'Accountant' : 'Authorized Signature';
        const receiptSigUrl = accountantInfo?.signatureUrl || finalSignatureUrl;
        const resolvedReceiptSigUrl = receiptSigUrl ? (receiptSigUrl.startsWith('http') ? receiptSigUrl : `${baseUrl}${receiptSigUrl}`) : '';
        const receiptSigHtml = resolvedReceiptSigUrl ? `<img src="${resolvedReceiptSigUrl}" style="max-height: 60px; display: block; border: none;" alt="Signature" />` : ``;
        html = html.replace(/{{RECEIPT_SIGNATURE}}/g, receiptSigHtml);
        html = html.replace(/{{RECEIPT_NAME}}/g, receiptSignerName);
        html = html.replace(/{{RECEIPT_ROLE}}/g, receiptSignerRole);
        html = html.replace(/{{COMPANY_NAME}}/g, companyInfo?.name || 'Company Name');
        html = html.replace(/{{COMPANY_WEBSITE}}/g, companyInfo?.website || 'www.company.com');
        html = html.replace(/{{COMPANY_EMAIL}}/g, companyInfo?.email || 'info@company.com');

        // Dynamic Branch Context
        html = html.replace(/{{BRANCH_ADDRESS}}/g, sale.lead?.branch?.address || companyInfo?.address || 'Branch Office');
        html = html.replace(/{{BRANCH_PHONE}}/g, sale.lead?.branch?.phone || companyInfo?.phone || 'Customer Care Line');
        html = html.replace(/{{BRANCH_EMAIL}}/g, sale.lead?.branch?.email || companyInfo?.email || 'Branch Email');

        return html;
    },

    /**
     * Hard-Coded Beautiful Generic Receipt
     */
    getGenericReceiptTemplate(): string {
        return `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
                <div style="text-align: right; margin-bottom: 30px;">
                    {{COMPANY_LOGO}}
                    <p style="margin: 5px 0; color: #666; font-size: 12px;">{{COMPANY_WEBSITE}} | {{COMPANY_EMAIL}}</p>
                    <p style="margin: 5px 0; color: #666; font-size: 12px;">{{BRANCH_PHONE}}</p>
                </div>
                
                <h1 style="color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px;">OFFICIAL RECEIPT</h1>
                
                <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                    <div>
                        <h4 style="margin: 0; color: #7f8c8d;">RECEIVED FROM:</h4>
                        <h2 style="margin: 5px 0; color: #2c3e50;">{{CLIENT_NAME}}</h2>
                        <p style="margin: 0;">{{CLIENT_PHONE}}</p>
                    </div>
                    <div style="text-align: right;">
                        <h4 style="margin: 0; color: #7f8c8d;">DATE:</h4>
                        <p style="margin: 5px 0; font-weight: bold;">{{CURRENT_DATE}}</p>
                    </div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 40px;">
                    <thead>
                        <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 12px; text-align: left;">DESCRIPTION</th>
                            <th style="padding: 12px; text-align: right;">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 15px 12px;">
                                <strong>Payment for Plot at {{ESTATE_NAME}}</strong><br/>
                                <span style="color: #666; font-size: 13px;">Plot Size: {{PLOT_SIZE}}, Location: {{LOCATION}}</span>
                            </td>
                            <td style="padding: 15px 12px; text-align: right; font-weight: bold;">
                                {{TRANSACTION_AMOUNT}}
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="width: 40%;">
                        <div style="border-bottom: 1px solid #333; margin-top: 40px; margin-bottom: 5px; padding-bottom: 5px; text-align: center;">
                            {{RECEIPT_SIGNATURE}}
                        </div>
                        <p style="text-align: center; margin: 0; font-weight: bold;">{{RECEIPT_NAME}}</p>
                        <p style="text-align: center; margin: 0; color: #666; font-size: 12px;">{{RECEIPT_ROLE}}</p>
                    </div>
                    <div style="width: 45%; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Property Price:</span>
                            <strong>{{AGREED_PRICE}}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Total Paid To Date:</span>
                            <strong>{{AMOUNT_PAID}}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 10px; border-top: 1px solid #dee2e6; padding-top: 10px;">
                            <span style="font-weight: bold; color: #e74c3c;">Outstanding Balance:</span>
                            <strong style="color: #e74c3c;">{{BALANCE_OUTSTANDING}}</strong>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 50px; text-align: center; color: #95a5a6; font-size: 12px;">
                    <p>Thank you for doing business with {{COMPANY_NAME}}.</p>
                </div>
            </div>
        `;
    }
};
