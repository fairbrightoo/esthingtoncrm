import React from 'react';

interface ReceiptProps {
    sale: any;
    payment: any;
    lead: any;
    branding: {
        name: string;
        address?: string;
        logoUrl?: string;
        phone?: string;
        email?: string;
        website?: string;
        signatureUrl?: string;
        managingDirectorName?: string;
        signatureRole?: string;
    };
}

export const ReceiptTemplate = React.forwardRef<HTMLDivElement, ReceiptProps>((props, ref) => {
    const { sale, payment, lead, branding } = props;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    // Ensure urls resolve correctly since this runs in the browser locally
    const buildImageUrl = (path?: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${path}`;
    };

    const logoUrl = buildImageUrl(branding.logoUrl);
    const signatureUrl = buildImageUrl(branding.signatureUrl);

    return (
        <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', color: '#333', padding: '20mm', width: '210mm', minHeight: '297mm', boxSizing: 'border-box', backgroundColor: 'white' }}>
            <div style={{ textAlign: 'right', marginBottom: '30px' }}>
                {logoUrl ? (
                    <img src={logoUrl} style={{ maxWidth: '250px', maxHeight: '80px', marginBottom: '5px' }} alt="Logo" />
                ) : (
                    <h2 style={{ margin: '0 0 5px 0' }}>{branding.name}</h2>
                )}
                {branding.website && <p style={{ margin: '5px 0', color: '#666', fontSize: '12px' }}>{branding.website}</p>}
                {branding.email && <p style={{ margin: '5px 0', color: '#666', fontSize: '12px' }}>{branding.email}</p>}
                {branding.phone && <p style={{ margin: '5px 0', color: '#666', fontSize: '12px' }}>{branding.phone}</p>}
            </div>
            
            <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>OFFICIAL RECEIPT</h1>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                <div>
                    <h4 style={{ margin: '0', color: '#7f8c8d' }}>RECEIVED FROM:</h4>
                    <h2 style={{ margin: '5px 0', color: '#2c3e50' }}>{sale?.nameOnDocument || lead?.fullName}</h2>
                    <p style={{ margin: '0' }}>{sale?.phoneOnDocument || lead?.phone}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h4 style={{ margin: '0', color: '#7f8c8d' }}>DATE:</h4>
                    <p style={{ margin: '5px 0', fontWeight: 'bold' }}>
                        {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(payment.createdAt || Date.now()))}
                    </p>
                </div>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '40px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>DESCRIPTION</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '15px 12px' }}>
                            <strong style={{ display: 'block', marginBottom: '2px' }}>Payment for Plot at {sale?.plot?.estate?.name || sale?.product?.estateName || 'Estate'}</strong>
                            <span style={{ color: '#666', fontSize: '13px' }}>
                                Plot Size: {sale?.plot?.size || sale?.product?.size || ''}sqm, 
                                Location: {sale?.plot?.estate?.location || sale?.product?.location || ''}
                            </span>
                            <div style={{ color: '#aaa', fontSize: '11px', marginTop: '4px' }}>Ref: {payment.reference}</div>
                        </td>
                        <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: 'bold' }}>
                            {formatCurrency(payment.amount)}
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ width: '40%' }}>
                    <div style={{ borderTop: '1px solid #333', marginTop: '40px', marginBottom: '5px', textAlign: 'center', height: '60px', position: 'relative' }}>
                        {signatureUrl && (
                            <img src={signatureUrl} alt="Signature" style={{ maxHeight: '60px', position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)' }} />
                        )}
                    </div>
                    <p style={{ textAlign: 'center', margin: '0', fontWeight: 'bold' }}>{branding.managingDirectorName || 'Managing Director'}</p>
                    <p style={{ textAlign: 'center', margin: '0', color: '#666', fontSize: '12px' }}>{branding.signatureRole || 'Authorized Signature'}</p>
                </div>
                <div style={{ width: '45%', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span>Property Price:</span>
                        <strong>{formatCurrency(sale.agreedPrice)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span>Total Paid To Date:</span>
                        <strong>{formatCurrency(sale.totalPaid)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', borderTop: '1px solid #dee2e6', paddingTop: '10px' }}>
                        <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>Outstanding Balance:</span>
                        <strong style={{ color: '#e74c3c' }}>{formatCurrency((sale.agreedPrice || 0) - (sale.totalPaid || 0))}</strong>
                    </div>
                </div>
            </div>
            
            <div style={{ marginTop: '50px', textAlign: 'center', color: '#95a5a6', fontSize: '12px' }}>
                <p>Thank you for doing business with {branding.name}.</p>
            </div>
        </div>
    );
});
