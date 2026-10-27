import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useReactToPrint } from 'react-to-print';
import { Printer, FileText, Edit3, Send, AlertTriangle, RefreshCw, X, Check, CheckCircle2 } from 'lucide-react';
import { ResendDocumentModal } from './ResendDocumentModal';

interface Props {
    sale: any;
    documentType: 'OFFER' | 'PROVISIONAL_ALLOCATION' | 'FINAL_ALLOCATION';
    onClose?: () => void;
    onSaleUpdated?: (updatedSale: any) => void;
}

export const OfficialDocumentRenderer = ({ sale, documentType, onClose, onSaleUpdated }: Props) => {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [template, setTemplate] = useState<string | null>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [branchInfo, setBranchInfo] = useState<any>(null); // Branch taking ownership
    const [branchMDUser, setBranchMDUser] = useState<any>(null); // Branch Managing Director user
    const [isLoading, setIsLoading] = useState(true);
    const componentRef = useRef<HTMLDivElement>(null);

    // Active Document Particulars State
    const [docName, setDocName] = useState<string>(sale?.nameOnDocument || sale?.lead?.fullName || '');
    const [docSalutation, setDocSalutation] = useState<string>(sale?.salutationOnDocument || '');
    const [docPhone, setDocPhone] = useState<string>(sale?.phoneOnDocument || sale?.lead?.phone || '');
    const [docAddress, setDocAddress] = useState<string>(sale?.addressOnDocument || sale?.lead?.address || '');

    // Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isUpdatingParticulars, setIsUpdatingParticulars] = useState(false);

    // Form inputs for Particulars Edit Modal
    const [editName, setEditName] = useState('');
    const [editSalutation, setEditSalutation] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [syncToBiodata, setSyncToBiodata] = useState(true);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `${documentType}_${(docName || sale?.lead?.fullName || 'Client').replace(/\s+/g, '_')}`,
        print: async (printIframe) => {
            return new Promise((resolve) => {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                
                if (isIOS) {
                    let timeoutId: any;
                    const cleanup = () => {
                        clearTimeout(timeoutId);
                        window.removeEventListener('afterprint', cleanup);
                        resolve(null);
                    };
                    window.addEventListener('afterprint', cleanup);
                    window.print();
                    timeoutId = setTimeout(cleanup, 2000);
                } else {
                    let timeoutId: any;
                    const cleanup = () => {
                        clearTimeout(timeoutId);
                        printIframe.contentWindow?.removeEventListener('afterprint', cleanup);
                        resolve(null);
                    };
                    printIframe.contentWindow?.addEventListener('afterprint', cleanup);
                    printIframe.contentWindow?.print();
                    timeoutId = setTimeout(cleanup, 2000);
                }
            });
        }
    });

    useEffect(() => {
        if (sale && sale.lead?.companyId) {
            setDocName(sale.nameOnDocument || sale.lead?.fullName || '');
            setDocSalutation(sale.salutationOnDocument || '');
            setDocPhone(sale.phoneOnDocument || sale.lead?.phone || '');
            setDocAddress(sale.addressOnDocument || sale.lead?.address || '');
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

    // Open Edit Particulars Modal
    const handleOpenEditModal = () => {
        setEditName(docName);
        setEditSalutation(docSalutation);
        setEditPhone(docPhone);
        setEditAddress(docAddress);
        setSyncToBiodata(true);
        setIsEditModalOpen(true);
    };

    // Save Updated Particulars
    const handleSaveParticulars = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingParticulars(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await axios.put(`${baseUrl}/api/sales/${sale.id}/document-info`, {
                nameOnDocument: editName.trim() || undefined,
                salutationOnDocument: editSalutation.trim() || undefined,
                phoneOnDocument: editPhone.trim() || undefined,
                addressOnDocument: editAddress.trim() || undefined,
                syncToBiodata
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const updatedSale = res.data.sale;
            setDocName(updatedSale.nameOnDocument || updatedSale.lead?.fullName || editName);
            setDocSalutation(updatedSale.salutationOnDocument || editSalutation);
            setDocPhone(updatedSale.phoneOnDocument || updatedSale.lead?.phone || editPhone);
            setDocAddress(updatedSale.addressOnDocument || updatedSale.lead?.address || editAddress);

            // Mutate current sale prop so subsequent re-renders stay consistent
            sale.nameOnDocument = updatedSale.nameOnDocument;
            sale.salutationOnDocument = updatedSale.salutationOnDocument;
            sale.phoneOnDocument = updatedSale.phoneOnDocument;
            sale.addressOnDocument = updatedSale.addressOnDocument;
            if (syncToBiodata && sale.lead) {
                sale.lead.address = editAddress.trim();
            }

            if (onSaleUpdated) {
                onSaleUpdated(updatedSale);
            }

            addToast("Document particulars updated and saved successfully!", "success");
            setIsEditModalOpen(false);
        } catch (error: any) {
            console.error("Failed to update document particulars:", error);
            addToast(error.response?.data?.error || "Failed to update particulars.", "error");
        } finally {
            setIsUpdatingParticulars(false);
        }
    };

    // Quick Sync Address from Biodata
    const handleQuickSyncBiodata = async () => {
        if (!sale?.lead?.address) return;
        setIsUpdatingParticulars(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await axios.put(`${baseUrl}/api/sales/${sale.id}/document-info`, {
                addressOnDocument: sale.lead.address,
                syncToBiodata: false
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setDocAddress(sale.lead.address);
            sale.addressOnDocument = sale.lead.address;
            if (onSaleUpdated) {
                onSaleUpdated(res.data.sale);
            }
            addToast("Document address updated with client's corrected biodata address!", "success");
        } catch (error: any) {
            console.error("Failed to sync biodata address:", error);
            addToast(error.response?.data?.error || "Failed to sync biodata address.", "error");
        } finally {
            setIsUpdatingParticulars(false);
        }
    };

    // Check if client biodata address differs from document address
    const hasBiodataAddressMismatch = Boolean(
        sale?.lead?.address && 
        docAddress && 
        sale.lead.address.trim().toLowerCase() !== docAddress.trim().toLowerCase()
    );

    const numberToWords = (num: number): string => {
        if (!num || isNaN(num) || num <= 0) return 'Zero Naira';
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        const convertChunk = (n: number): string => {
            let str = '';
            if (n >= 100) {
                str += ones[Math.floor(n / 100)] + ' Hundred';
                n %= 100;
                if (n > 0) str += ' and ';
            }
            if (n >= 20) {
                str += tens[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + ones[n % 10] : '');
            } else if (n > 0) {
                str += ones[n];
            }
            return str.trim();
        };
        
        let integerPart = Math.floor(Math.abs(num));
        const chunks: string[] = [];
        const billions = Math.floor(integerPart / 1000000000);
        integerPart %= 1000000000;
        const millions = Math.floor(integerPart / 1000000);
        integerPart %= 1000000;
        const thousands = Math.floor(integerPart / 1000);
        integerPart %= 1000;
        const remainder = integerPart;
        
        if (billions > 0) chunks.push(convertChunk(billions) + ' Billion');
        if (millions > 0) chunks.push(convertChunk(millions) + ' Million');
        if (thousands > 0) chunks.push(convertChunk(thousands) + ' Thousand');
        if (remainder > 0) chunks.push(convertChunk(remainder));
        
        return (chunks.join(', ') || 'Zero') + ' Naira';
    };

    const processTemplate = () => {
        if (!template || !sale) return '';

        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
        };

        const today = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

        let html = template;

        // Gender Salutation Logic
        const salutationRegex = /Dear\s+(Sir\/?Ma|Sir|Ma|Madam|Mr\.?|Mrs\.?|Ms\.?)[^<\n]*?,?/gi;
        
        if (docSalutation) {
            html = html.replace(salutationRegex, docSalutation);
        } else {
            const gender = sale.lead?.gender?.toLowerCase() || 'male';
            const correctSalutation = (gender === 'female') ? 'Dear Ma,' : 'Dear Sir,';
            html = html.replace(salutationRegex, correctSalutation);
        }

        // General Info
        html = html.replace(/{{CURRENT_DATE}}/g, today);
        
        // Client Info (Using active state)
        html = html.replace(/{{CLIENT_NAME}}/g, docName || sale.lead?.fullName || 'Client');
        html = html.replace(/{{CLIENT_ADDRESS}}/g, docAddress || sale.lead?.address || '___________________________');
        html = html.replace(/{{CLIENT_PHONE}}/g, docPhone || sale.lead?.phone || '___________________________');

        // Plot Info
        const plotSizeNum = Number(sale.plot?.size || sale.size || 0);
        const plotPrototypeStr = (sale.plot?.prototype || sale.prototype || 'Prototype').trim();

        html = html.replace(/{{ESTATE_NAME}}/g, sale.plot?.estate?.name || 'Estate');
        html = html.replace(/{{LOCATION}}/g, sale.plot?.estate?.location || 'Location');
        html = html.replace(/{{PLOT_SIZE}}/g, plotSizeNum ? `${plotSizeNum} sqm` : (sale.plot?.size ? `${sale.plot.size} sqm` : 'Plot Space'));
        html = html.replace(/{{PLOT_NUMBER}}/g, sale.plot?.plotNumber || sale.plotNumber || '____________________');
        html = html.replace(/{{PROTOTYPE}}/g, plotPrototypeStr);

        // Dynamic Fees: Robust matching against PlotPrototypeConfig
        const supervisionFee = Number(sale.plot?.estate?.projectSupervisionFee || 0);
        let settingOutFee = 400000; // default fallback
        let infrastructureFee = 3000000; // default fallback

        const configs: any[] = sale.plot?.estate?.plotConfigs || [];
        if (configs.length > 0) {
            // 1. Exact match (prototype case-insensitive + size)
            let matchedConfig = configs.find((c: any) => 
                c.prototype?.trim().toLowerCase() === plotPrototypeStr.toLowerCase() && 
                Number(c.size) === plotSizeNum
            );

            // 2. Fallback: match by size if prototype has naming variations
            if (!matchedConfig && plotSizeNum > 0) {
                matchedConfig = configs.find((c: any) => Number(c.size) === plotSizeNum);
            }

            // 3. Fallback: match by prototype name if sizes match closely
            if (!matchedConfig && plotPrototypeStr) {
                matchedConfig = configs.find((c: any) => 
                    c.prototype?.trim().toLowerCase() === plotPrototypeStr.toLowerCase()
                );
            }

            if (matchedConfig) {
                settingOutFee = Number(matchedConfig.settingOutFee);
                infrastructureFee = Number(matchedConfig.infrastructureFee);
            }
        }

        html = html.replace(/{{PROJECT_SUPERVISION_FEE}}/g, formatCurrency(supervisionFee));
        html = html.replace(/{{PROJECT_SUPERVISION_FEE_WORDS}}/g, numberToWords(supervisionFee));
        html = html.replace(/{{SETTING_OUT_FEE}}/g, formatCurrency(settingOutFee));
        html = html.replace(/{{SETTING_OUT_FEE_WORDS}}/g, numberToWords(settingOutFee));
        html = html.replace(/{{INFRASTRUCTURE_FEE}}/g, formatCurrency(infrastructureFee));
        html = html.replace(/{{INFRASTRUCTURE_FEE_WORDS}}/g, numberToWords(infrastructureFee));

        const isCornerPiece = sale.plot?.isCornerPiece || sale.isCornerPiece;
        const cornerPieceHtml = isCornerPiece 
            ? `<span style="background-color: #fff3cd; color: #856404; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; text-transform: uppercase; border: 1px solid #ffeeba; display: inline-block;">CORNER PIECE</span>` 
            : '';
        html = html.replace(/{{CORNER_PIECE_TAG}}/g, cornerPieceHtml);

        // Financials
        const agreedPrice = Number(sale.agreedPrice || 0);
        const totalPaid = Number(sale.totalPaid || 0);
        const balance = Math.max(0, agreedPrice - totalPaid);

        html = html.replace(/{{AGREED_PRICE}}/gi, formatCurrency(agreedPrice));
        html = html.replace(/{{AGREED_PRICE_WORDS}}/gi, numberToWords(agreedPrice));
        html = html.replace(/{{AMOUNT_PAID}}/gi, formatCurrency(totalPaid));
        html = html.replace(/{{AMOUNT_PAID_WORDS}}/gi, numberToWords(totalPaid));
        html = html.replace(/{{BALANCE_OUTSTANDING}}/gi, formatCurrency(balance));
        html = html.replace(/{{BALANCE_OUTSTANDING_WORDS}}/gi, numberToWords(balance));
        html = html.replace(/{{BALANCE_AMOUNT}}/gi, formatCurrency(balance));
        html = html.replace(/{{BALANCE_AMOUNT_WORDS}}/gi, numberToWords(balance));

        // Calculate Balance Deadline: 6 months from the date of the first installment (Sale createdAt)
        const firstInstallmentDate = new Date(sale.createdAt || new Date());
        const balanceDeadline = new Date(firstInstallmentDate);
        balanceDeadline.setMonth(balanceDeadline.getMonth() + 6);
        const balanceDateStr = new Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).format(balanceDeadline);
        html = html.replace(/{{BALANCE_DATE}}/g, balanceDateStr);

        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        html = html.replace(/http:\/\/localhost:3000\/uploads\//g, `${baseUrl}/uploads/`);

        // Company Branding (Rendered as image tags if urls exist)
        const resolvedLogoUrl = companyInfo?.logoUrl ? (companyInfo.logoUrl.startsWith('http') ? companyInfo.logoUrl : `${baseUrl}${companyInfo.logoUrl}`) : '';
        const logoHtml = resolvedLogoUrl ? `<img src="${resolvedLogoUrl}" style="max-width: 250px; max-height: 80px; display: block; margin: 0 auto; border: none; outline: none;" alt="Logo" />` : `<h2 style="text-align: right; margin: 0;">${companyInfo?.name || 'Company Name'}</h2>`;
        html = html.replace(/{{COMPANY_LOGO}}/g, logoHtml);

        // Dynamic Signature and MD Name based on Document Type and Head Office Flag
        let finalMdName = 'Managing Director';
        let finalMdTitle = 'Managing Director';
        let finalSignatureUrl = '';

        const isHeadOffice = branchInfo?.isHeadOffice === true || branchInfo?.name?.toLowerCase().includes('head office');
        const branchGeneralManagerName = branchInfo?.managerName || '';
        const branchGeneralManagerSig = branchInfo?.signatureUrl || '';
        const branchMDName = branchMDUser?.fullName || branchGeneralManagerName;
        const branchMDSig = branchMDUser?.signatureUrl || branchGeneralManagerSig;
        const groupMDName = companyInfo?.managingDirectorName || '';
        const groupMDSig = companyInfo?.signatureUrl || '';

        if (documentType === 'OFFER') {
            if (isHeadOffice) {
                finalMdName = branchMDName || groupMDName;
                finalMdTitle = 'Managing Director';
                finalSignatureUrl = branchMDSig || groupMDSig;
            } else {
                finalMdName = branchGeneralManagerName || branchMDName;
                finalMdTitle = 'General Manager';
                finalSignatureUrl = branchGeneralManagerSig || branchMDSig;
            }
        } else if (documentType === 'PROVISIONAL_ALLOCATION' || documentType === 'FINAL_ALLOCATION') {
            if (isHeadOffice) {
                finalMdName = groupMDName || branchMDName;
                finalMdTitle = 'Group Managing Director';
                finalSignatureUrl = groupMDSig || branchMDSig;
            } else {
                finalMdName = branchMDName || groupMDName;
                finalMdTitle = 'Managing Director';
                finalSignatureUrl = branchMDSig || groupMDSig;
            }
        } else {
            // Default fallback
            finalMdName = branchGeneralManagerName || branchMDName || groupMDName;
            finalMdTitle = branchGeneralManagerName ? 'General Manager' : 'Managing Director';
            finalSignatureUrl = branchGeneralManagerSig || branchMDSig || groupMDSig;
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
        return <div className="p-8 text-center animate-pulse text-gray-500 font-medium">Generating Document...</div>;
    }

    return (
        <div className="bg-gray-100 p-2 sm:p-4 rounded-xl border border-gray-200">
            {/* Toolbar */}
            <div className="flex flex-col gap-2.5 mb-3 bg-white p-3 rounded-2xl shadow-xs border border-gray-200/80 sticky top-0 z-10 transition-all">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 sm:p-2 bg-indigo-50/80 text-indigo-600 rounded-lg shadow-sm border border-indigo-100/50">
                            <FileText size={17} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-gray-800 text-xs sm:text-sm uppercase tracking-wide">
                                    {documentType.replace('_', ' ')}
                                </h3>
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100/80 px-1.5 py-0.2 rounded-full font-semibold">
                                    Official
                                </span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-400 font-medium">A4 Document Ready for Export & Delivery</p>
                        </div>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors" title="Close Preview">
                            <X size={17} />
                        </button>
                    )}
                </div>

                {/* Smart Alert: Detects when Client Biodata was corrected, allowing instant sync */}
                {hasBiodataAddressMismatch && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 gap-2 shadow-xs">
                        <div className="flex items-start space-x-2.5">
                            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-amber-800">Biodata Address Correction Detected:</span>
                                <p className="text-amber-700 mt-0.5">
                                    Primary address in Client's profile is: <em>"{sale.lead.address}"</em>, but this document was created with an older address.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleQuickSyncBiodata}
                            disabled={isUpdatingParticulars}
                            className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition shadow-sm flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={isUpdatingParticulars ? 'animate-spin' : ''} />
                            <span>Apply to Document</span>
                        </button>
                    </div>
                )}

                {/* Action Buttons Toolbar */}
                <div className="flex flex-col gap-2 pt-0.5">
                    {/* Primary Hero Action: Print / Save PDF */}
                    <button 
                        type="button"
                        onClick={() => handlePrint()}
                        className="w-full relative overflow-hidden group flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md active:scale-[0.99]"
                    >
                        <Printer size={14} className="shrink-0" />
                        <span className="tracking-wide uppercase text-[11px] font-bold">Print / Save PDF</span>
                    </button>

                    {/* Secondary Dual Actions */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Edit Particulars */}
                        <button 
                            type="button"
                            onClick={handleOpenEditModal}
                            className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-50/80 hover:bg-slate-100/90 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold transition active:scale-95 shadow-2xs hover:border-slate-300"
                            title="Edit name, address, or salutation printed on this document"
                        >
                            <Edit3 size={13} className="text-indigo-600 shrink-0" />
                            <span className="truncate">Edit Particulars</span>
                        </button>

                        {/* Resend via Email */}
                        <button 
                            type="button"
                            onClick={() => setIsEmailModalOpen(true)}
                            className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-purple-50/80 hover:bg-purple-100/90 text-purple-700 border border-purple-200/80 rounded-xl text-xs font-semibold transition active:scale-95 shadow-2xs hover:border-purple-300"
                            title="Resend this document to the client via email"
                        >
                            <Send size={13} className="text-purple-600 shrink-0" />
                            <span className="truncate">Resend Email</span>
                        </button>
                    </div>
                </div>
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
                    {/* Boundary for ReactToPrint to target */}
                    <div ref={componentRef} className="print-content text-sm leading-relaxed" style={{ padding: '10mm 15mm', width: '100%', maxWidth: '210mm', boxSizing: 'border-box' }}>
                        
                        {/* The Injected HTML Template */}
                        <div dangerouslySetInnerHTML={{ __html: processTemplate() }} className="document-prose" />

                        <style>{`
                            @media print {
                                @page { size: A4; margin: 0; }
                                body * { visibility: hidden; }
                                body { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                .print-content, .print-content * { visibility: visible; }
                                .print-content { 
                                    position: absolute !important; 
                                    left: 0 !important; 
                                    top: 0 !important; 
                                    padding: 10mm 15mm !important; 
                                    width: 100% !important; 
                                    max-width: 210mm !important;
                                    background: white !important;
                                }
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

            {/* --- EDIT PARTICULARS MODAL --- */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                        <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
                                    <Edit3 size={20} className="text-blue-200" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">Edit Document Particulars</h3>
                                    <p className="text-xs text-blue-200 mt-0.5">Customize names, address and salutations on legal documents</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveParticulars} className="p-6 space-y-4 overflow-y-auto">
                            {/* Salutation */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                    Salutation on Document
                                </label>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    {['Dear Ma,', 'Dear Sir,', 'Dear Client,'].map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setEditSalutation(opt)}
                                            className={`text-xs py-1.5 px-2 rounded-lg border font-medium transition ${
                                                editSalutation === opt 
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={editSalutation}
                                    onChange={(e) => setEditSalutation(e.target.value)}
                                    placeholder="e.g. Dear Ma, / Dear Sir, / Dear Mr. & Mrs. Doe,"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>

                            {/* Client Name on Document */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                    Name on Document
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Full Legal Name on Document"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>

                            {/* Phone on Document */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                    Phone on Document
                                </label>
                                <input
                                    type="tel"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder="Phone number on Document"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>

                            {/* Address on Document */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                        Primary Address on Document
                                    </label>
                                    {sale?.lead?.address && sale.lead.address !== editAddress && (
                                        <button
                                            type="button"
                                            onClick={() => setEditAddress(sale.lead.address)}
                                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                                        >
                                            <RefreshCw size={11} /> Copy from Biodata
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    rows={3}
                                    value={editAddress}
                                    onChange={(e) => setEditAddress(e.target.value)}
                                    placeholder="Enter client's address to print on offer/allocation letters"
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                                />
                            </div>

                            {/* Sync to Biodata Checkbox */}
                            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex items-start space-x-3">
                                <input
                                    type="checkbox"
                                    id="syncBiodataCheck"
                                    checked={syncToBiodata}
                                    onChange={(e) => setSyncToBiodata(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="syncBiodataCheck" className="text-xs text-indigo-900 cursor-pointer">
                                    <strong>Also sync these changes to Client's Master Biodata</strong>
                                    <p className="text-indigo-700 text-[11px] mt-0.5">
                                        Keeps the Client KYC & Biodata profile permanently updated with this address.
                                    </p>
                                </label>
                            </div>

                            {/* Footer Buttons */}
                            <div className="pt-2 flex items-center justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    disabled={isUpdatingParticulars}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingParticulars}
                                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isUpdatingParticulars ? (
                                        <>
                                            <RefreshCw size={15} className="animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={16} />
                                            <span>Save & Update Document</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- RESEND DOCUMENT VIA EMAIL MODAL --- */}
            <ResendDocumentModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                sale={sale}
                initialDocumentType={documentType}
            />
        </div>
    );
};
