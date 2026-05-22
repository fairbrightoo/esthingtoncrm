const fs = require('fs');

let content = fs.readFileSync('src/pages/ReportsDashboard.tsx', 'utf8');

const targetPDF = `    // Export Sales PDF
    const exportSalesPDF = () => {
        const doc = new jsPDF('landscape');
        doc.text(\`Sales Report - \${filters.month}/\${filters.year}\`, 14, 15);
        
        const tableColumn = ["S/N", "Trans Date", "Clients", "Desc", "Sqm", "Corner", "Amount Paid", "Comm Paid", "Estate", "Marketer", "Acct Paid To", "Sale Type", "Managing Branch"];
        const tableRows: any[] = [];

        let totalAmount = 0;
        let totalComm = 0;

        salesData.forEach(sale => {
            totalAmount += sale.amountPaid;
            totalComm += sale.commissionAccrued;
            const rowData = [
                sale.sn,
                formatDate(sale.date),
                sale.clientName,
                sale.description,
                sale.plotSize,
                sale.isCornerPiece,
                formatCurrencyForExport(sale.amountPaid),
                formatCurrencyForExport(sale.commissionAccrued),
                sale.estateName,
                sale.marketerName,
                sale.accountPaidTo,
                sale.saleType || 'Direct Sale',
                sale.managingBranchName || 'Head Office'
            ];
            tableRows.push(rowData);
        });

        tableRows.push(["", "", "", "", "", "GRAND TOTAL", formatCurrencyForExport(totalAmount), formatCurrencyForExport(totalComm), "", "", "", "", ""]);`;

const newPDF = `    // Export Sales PDF
    const exportSalesPDF = () => {
        const doc = new jsPDF('landscape');
        doc.text(\`Sales Report - \${filters.month}/\${filters.year}\`, 14, 15);
        
        const tableColumn = ["S/N", "Trans Date", "Clients", "Desc", "Sqm", "Corner", "Amount Paid", "Comm Paid", "Referrer", "Ref Comm", "Estate", "Marketer", "Acct Paid To", "Sale Type", "Managing Branch"];
        const tableRows: any[] = [];

        let totalAmount = 0;
        let totalComm = 0;

        salesData.forEach(sale => {
            totalAmount += sale.amountPaid;
            totalComm += sale.commissionAccrued + (sale.referralCommissionAccrued || 0);
            const rowData = [
                sale.sn,
                formatDate(sale.date),
                sale.clientName,
                sale.description,
                sale.plotSize,
                sale.isCornerPiece,
                formatCurrencyForExport(sale.amountPaid),
                formatCurrencyForExport(sale.commissionAccrued),
                sale.referrerName,
                formatCurrencyForExport(sale.referralCommissionAccrued || 0),
                sale.estateName,
                sale.marketerName,
                sale.accountPaidTo,
                sale.saleType || 'Direct Sale',
                sale.managingBranchName || 'Head Office'
            ];
            tableRows.push(rowData);
        });

        tableRows.push(["", "", "", "", "", "GRAND TOTAL", formatCurrencyForExport(totalAmount), formatCurrencyForExport(totalComm), "", "", "", "", "", "", ""]);`;

content = content.replace(targetPDF, newPDF);

const targetCSV = `    // Export Sales CSV
    const exportSalesCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "S/N,Trans Date,Clients,Desc,Sqm,Corner,Amount Paid,Comm Paid,Estate,Marketer,Acct Paid To,Sale Type,Managing Branch\\n";
        
        let totalAmount = 0;
        let totalComm = 0;

        salesData.forEach(sale => {
            totalAmount += sale.amountPaid;
            totalComm += sale.commissionAccrued;
            csvContent += \`\${sale.sn},\${formatDate(sale.date)},\${sale.clientName},\${sale.description},\${sale.plotSize},\${sale.isCornerPiece},\${sale.amountPaid},\${sale.commissionAccrued},\${sale.estateName},\${sale.marketerName},\${sale.accountPaidTo},\${sale.saleType || 'Direct Sale'},\${sale.managingBranchName || 'Head Office'}\\n\`;
        });

        csvContent += \`,,,,,,GRAND TOTAL,\${totalAmount},\${totalComm},,,,\\n\`;`;

const newCSV = `    // Export Sales CSV
    const exportSalesCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "S/N,Trans Date,Clients,Desc,Sqm,Corner,Amount Paid,Comm Paid,Referrer,Ref Comm,Estate,Marketer,Acct Paid To,Sale Type,Managing Branch\\n";
        
        let totalAmount = 0;
        let totalComm = 0;

        salesData.forEach(sale => {
            totalAmount += sale.amountPaid;
            totalComm += sale.commissionAccrued + (sale.referralCommissionAccrued || 0);
            csvContent += \`\${sale.sn},\${formatDate(sale.date)},\${sale.clientName},\${sale.description},\${sale.plotSize},\${sale.isCornerPiece},\${sale.amountPaid},\${sale.commissionAccrued},\${sale.referrerName},\${sale.referralCommissionAccrued || 0},\${sale.estateName},\${sale.marketerName},\${sale.accountPaidTo},\${sale.saleType || 'Direct Sale'},\${sale.managingBranchName || 'Head Office'}\\n\`;
        });

        csvContent += \`,,,,,,GRAND TOTAL,\${totalAmount},\${totalComm},,,,,,\\n\`;`;

content = content.replace(targetCSV, newCSV);

content = content.replace(/\r?\n/g, '\r\n');
fs.writeFileSync('src/pages/ReportsDashboard.tsx', content);
console.log("Replaced CSV and PDF!");
