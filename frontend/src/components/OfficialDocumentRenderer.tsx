import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useReactToPrint } from 'react-to-print';
import { Printer, FileText } from 'lucide-react';

interface Props {
    sale: any;
    documentType: 'OFFER' | 'PROVISIONAL_ALLOCATION' | 'FINAL_ALLOCATION';
    onClose?: () => void;
}

export const OfficialDocumentRenderer = ({ sale, documentType, onClose }: Props) => {
    const { token } = useAuth();
    const [template, setTemplate] = useState<string | null>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [branchInfo, setBranchInfo] = useState<any>(null); // Branch taking ownership
    const [branchMDUser, setBranchMDUser] = useState<any>(null); // Branch Managing Director user
    const [isLoading, setIsLoading] = useState(true);
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `${documentType}_${sale?.lead?.fullName?.replace(/\s+/g, '_')}`
    });

    useEffect(() => {
        if (sale && sale.lead?.companyId) {
            fetchData();
        }
    }, [sale]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Ensure the document bears the signature and branding of the Estate's specific Company
            const targetCompanyId = sale.plot?.estate?.companyId;

            if (!targetCompanyId) throw new Error("Missing plot estate data.");

            // 1. Fetch Company Info for Letterhead/Logos
            const compRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const specificCompany = compRes.data.find((c: any) => c.id === targetCompanyId);
            setCompanyInfo(specificCompany);

            // Fetch Estate's managing branch for Signature routing
            const managingBranchId = sale.plot?.estate?.managingBranchId;
            if (managingBranchId) {
                try {
                    const branchRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${targetCompanyId}/branches`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const specificBranch = branchRes.data.find((b: any) => b.id === managingBranchId);
                    setBranchInfo(specificBranch);

                    // Fetch the Branch Managing Director user for signatures
                    const usersRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${targetCompanyId}/branches/${managingBranchId}/users`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const mdUser = usersRes.data.find((u: any) => u.role === 'MANAGING_DIRECTOR');
                    if (mdUser) setBranchMDUser(mdUser);
                } catch (e) { console.warn("Could not fetch branch overrides", e); }
            }

            // 2. Fetch the specific template for that Company (Pass Company ID as parameter)
            const tempRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/documents/templates?companyId=${targetCompanyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const specificTemplate = tempRes.data.find((t: any) => t.type === documentType);
            
            if (specificTemplate) {
                setTemplate(specificTemplate.content);
            } else {
                setTemplate('<p class="text-red-500">Error: No document template found for this company. Please configure it in Global Settings.</p>');
            }
        } catch (error) {
            console.error("Failed to load document dependencies", error);
            setTemplate('<p>Failed to load template.</p>');
        } finally {
            setIsLoading(false);
        }
    };

    const processTemplate = () => {
        if (!template || !sale) return '';

        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
        };

        const today = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

        let html = template;

        // Gender Salutation Logic
        const gender = sale.lead?.gender?.toLowerCase() || 'male';
        const correctSalutation = (gender === 'female') ? 'Dear Ma,' : 'Dear Sir,';
        html = html.replace(/Dear\s*sir\/?ma\w*,?/gi, correctSalutation);

        // General Info
        html = html.replace(/{{CURRENT_DATE}}/g, today);
        
        // Client Info
        html = html.replace(/{{CLIENT_NAME}}/g, sale.nameOnDocument || sale.lead.fullName);
        html = html.replace(/{{CLIENT_ADDRESS}}/g, sale.addressOnDocument || sale.lead.address || '___________________________');
        html = html.replace(/{{CLIENT_PHONE}}/g, sale.phoneOnDocument || sale.lead.phone || '___________________________');

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

        const isCornerPiece = sale.plot?.isCornerPiece || sale.isCornerPiece;
        const cornerPieceHtml = isCornerPiece 
            ? `<span style="background-color: #fff3cd; color: #856404; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; text-transform: uppercase; border: 1px solid #ffeeba; display: inline-block;">CORNER PIECE</span>` 
            : '';
        html = html.replace(/{{CORNER_PIECE_TAG}}/g, cornerPieceHtml);

        // Financials
        html = html.replace(/{{AGREED_PRICE}}/g, formatCurrency(sale.agreedPrice));
        html = html.replace(/{{AMOUNT_PAID}}/g, formatCurrency(sale.totalPaid));
        const balance = sale.agreedPrice - sale.totalPaid;
        html = html.replace(/{{BALANCE_OUTSTANDING}}/g, formatCurrency(balance > 0 ? balance : 0));
        html = html.replace(/{{BALANCE_AMOUNT}}/g, formatCurrency(balance > 0 ? balance : 0));

        // Calculate Balance Deadline: 6 months from the date of the first installment (Sale createdAt)
        const firstInstallmentDate = new Date(sale.createdAt || new Date());
        const balanceDeadline = new Date(firstInstallmentDate);
        balanceDeadline.setMonth(balanceDeadline.getMonth() + 6);
        const balanceDateStr = new Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).format(balanceDeadline);
        html = html.replace(/{{BALANCE_DATE}}/g, balanceDateStr);

        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

        html = html.replace(/{{COMPANY_NAME}}/g, companyInfo?.name || 'Company Name');
        html = html.replace(/{{COMPANY_WEBSITE}}/g, companyInfo?.website || 'www.company.com');
        html = html.replace(/{{COMPANY_EMAIL}}/g, companyInfo?.email || 'info@company.com');

        // Dynamic Branch Context
        html = html.replace(/{{BRANCH_ADDRESS}}/g, branchInfo?.address || companyInfo?.address || 'Branch Office');
        html = html.replace(/{{BRANCH_PHONE}}/g, branchInfo?.phone || companyInfo?.phone || 'Customer Care Line');
        html = html.replace(/{{BRANCH_EMAIL}}/g, branchInfo?.email || companyInfo?.email || 'Branch Email');


        return html;
    };

    if (isLoading) {
        return <div className="p-8 text-center animate-pulse">Generating Document...</div>;
    }

    return (
        <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 mb-4 bg-white p-3 lg:p-4 rounded-xl shadow-sm border border-gray-200/60 sticky top-0 z-10 transition-all">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 sm:p-2 bg-indigo-50/80 text-indigo-600 rounded-lg shadow-sm border border-indigo-100/50">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-[13px] sm:text-sm uppercase tracking-wide">
                                {documentType.replace('_', ' ')}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-gray-400 font-medium">A4 Document Ready for Export</p>
                        </div>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors" title="Close Preview">
                            ✕
                        </button>
                    )}
                </div>

                <button 
                    onClick={() => handlePrint()}
                    className="w-full relative overflow-hidden group flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98]"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                    <Printer size={16} className="relative z-10" />
                    <span className="relative z-10 tracking-wide">Print / Save PDF</span>
                </button>
            </div>

            {/* Print Area Container */}
            <div className="overflow-x-auto bg-gray-200 p-4 rounded-lg flex justify-center custom-scrollbar" style={{ maxHeight: '75vh' }}>
                <div 
                    className="bg-white shadow-xl"
                    style={{
                        width: '210mm',              // A4 Width
                        minHeight: '297mm',          // A4 Height
                        padding: '20mm',             // Standard Print Margins
                        color: 'black',
                        fontFamily: '"Times New Roman", Times, serif', // Formal Letter Font
                    }}
                >
                    {/* Invisible boundary for ReactToPrint to target */}
                    <div ref={componentRef} className="print-content text-sm leading-relaxed" style={{ padding: '20mm', width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
                        
                        {/* The Injected HTML Template */}
                        <div dangerouslySetInnerHTML={{ __html: processTemplate() }} className="document-prose" />

                        <style>{`
                            @media print {
                                @page { size: A4; margin: 0; }
                                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                .print-content { padding: 20mm !important; }
                            }
                            .document-prose p { margin-bottom: 1rem; text-align: justify; }
                            .document-prose ol { padding-left: 1.5rem; margin-bottom: 1rem; list-style-type: decimal; }
                            .document-prose ul { padding-left: 1.5rem; margin-bottom: 1rem; list-style-type: disc; }
                            .document-prose li { margin-bottom: 0.5rem; }
                            .document-prose strong { font-weight: bold; }
                        `}</style>
                    </div>
                </div>
            </div>
        </div>
    );
};
