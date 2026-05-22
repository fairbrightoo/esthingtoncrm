const fs = require('fs');

let content = fs.readFileSync('src/pages/ReportsDashboard.tsx', 'utf8');

const targetSalesHeader = `                                {activeTab === 'SALES' && (
                                <div className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm flex items-center">
                                    Total Sales: <span className="ml-2">{formatCurrency(salesData.reduce((sum, sale) => sum + sale.amountPaid, 0))}</span>
                                </div>
                            )}`;

const newSalesHeader = `                                {activeTab === 'SALES' && (
                                <div className="flex gap-4">
                                    <div className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm flex items-center">
                                        Total Sales: <span className="ml-2">{formatCurrency(salesData.reduce((sum, sale) => sum + sale.amountPaid, 0))}</span>
                                    </div>
                                    <div className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm flex items-center">
                                        Total Comm: <span className="ml-2">{formatCurrency(salesData.reduce((sum, sale) => sum + (sale.commissionAccrued || 0) + (sale.referralCommissionAccrued || 0), 0))}</span>
                                    </div>
                                </div>
                            )}`;

content = content.replace(targetSalesHeader, newSalesHeader);

const oldColHeader = `                                        <th className="p-3">Comm. Accrued</th>
                                        <th className="p-3">Estate</th>`;

const newColHeader = `                                        <th className="p-3">Comm. Accrued</th>
                                        <th className="p-3 text-indigo-600 bg-indigo-50/50">Referrer</th>
                                        <th className="p-3 text-indigo-600 bg-indigo-50/50">Ref. Comm.</th>
                                        <th className="p-3">Estate</th>`;

content = content.replace(oldColHeader, newColHeader);

const oldRowContent = `                                                <td className="p-3 text-gray-600">{formatCurrency(sale.commissionAccrued)}</td>
                                                <td className="p-3">{sale.estateName}</td>`;

const newRowContent = `                                                <td className="p-3 text-gray-600">{formatCurrency(sale.commissionAccrued)}</td>
                                                <td className="p-3 text-indigo-600 bg-indigo-50/10 font-medium">{sale.referrerName !== 'N/A' ? sale.referrerName : <span className="text-gray-400 font-normal">N/A</span>}</td>
                                                <td className="p-3 text-indigo-600 bg-indigo-50/10 font-bold">{sale.referralCommissionAccrued > 0 ? formatCurrency(sale.referralCommissionAccrued) : <span className="text-gray-400 font-normal">₦0</span>}</td>
                                                <td className="p-3">{sale.estateName}</td>`;

content = content.replace(oldRowContent, newRowContent);

content = content.replace('colSpan={13}', 'colSpan={15}');

content = content.replace(/\r?\n/g, '\r\n');
fs.writeFileSync('src/pages/ReportsDashboard.tsx', content);
console.log("Replaced Reports Dashboard!");
