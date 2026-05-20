const fs = require('fs');
const file = 'src/pages/AccountantDashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Add pagination states
const stateVars = `
    const [historyRowsPerPage, setHistoryRowsPerPage] = useState<number>(10);
    const [historyPaymentsPage, setHistoryPaymentsPage] = useState<number>(1);
    const [historyCommissionsPage, setHistoryCommissionsPage] = useState<number>(1);
    const [historyRequisitionsPage, setHistoryRequisitionsPage] = useState<number>(1);
    
    // Pagination helpers
    const getPaginatedData = (data: any[], page: number, rows: number) => {
        const start = (page - 1) * rows;
        return data.slice(start, start + rows);
    };
    
    const renderPagination = (dataLength: number, currentPage: number, setPage: (p: number) => void) => {
        const totalPages = Math.ceil(dataLength / historyRowsPerPage);
        if (dataLength === 0) return null;
        return (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/30">
                <span className="text-xs text-gray-500">
                    Showing {((currentPage - 1) * historyRowsPerPage) + 1} to {Math.min(currentPage * historyRowsPerPage, dataLength)} of {dataLength} entries
                </span>
                <div className="flex items-center gap-1">
                    <button 
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                        className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-600 disabled:opacity-50 hover:bg-gray-100"
                    >Prev</button>
                    <span className="text-xs font-medium px-2 py-1">{currentPage} / {totalPages}</span>
                    <button 
                        disabled={currentPage === totalPages}
                        onClick={() => setPage(currentPage + 1)}
                        className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-600 disabled:opacity-50 hover:bg-gray-100"
                    >Next</button>
                </div>
            </div>
        );
    };

    const token = localStorage.getItem('token');
`;

c = c.replace(/    const token = localStorage\.getItem\('token'\);/, stateVars);

// 2. Add 'Rows per page' selector next to date filters
const filtersStr = `                                                <input 
                                                type="date" 
                                                value={historyEndDate}
                                                onChange={(e) => setHistoryEndDate(e.target.value)}
                                                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="ml-auto flex items-center gap-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rows per page</label>
                                            <select 
                                                value={historyRowsPerPage}
                                                onChange={(e) => {
                                                    setHistoryRowsPerPage(Number(e.target.value));
                                                    setHistoryPaymentsPage(1);
                                                    setHistoryCommissionsPage(1);
                                                    setHistoryRequisitionsPage(1);
                                                }}
                                                className="px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                            </select>
                                        </div>
                                    </div>`;

c = c.replace(/                                                <input \s*type="date" \s*value=\{historyEndDate\}\s*onChange=\{\(e\) => setHistoryEndDate\(e\.target\.value\)\}\s*className="px-3 py-1\.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"\s*\/>\s*<\/div>\s*<\/div>/, filtersStr);

// 3. Processed Payments - Add Marketer column & Pagination
const processedPaymentsOld = `<table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Date</th>
                                                            <th className="px-6 py-4">Client</th>
                                                            <th className="px-6 py-4">Amount</th>
                                                            <th className="px-6 py-4">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {historyData.payments.length === 0 ? (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : historyData.payments.map((p, i) => (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{new Date(p.date).toLocaleDateString()}</td>
                                                                <td className="px-6 py-3 font-medium">{p.sale?.lead?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono">₦{p.amount.toLocaleString()}</td>
                                                                <td className="px-6 py-3">
                                                                    <span className={\`px-2 py-1 text-[10px] font-bold rounded uppercase \${p.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}\`}>
                                                                        {p.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>`;

const processedPaymentsNew = `<table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Date</th>
                                                            <th className="px-6 py-4">Marketer</th>
                                                            <th className="px-6 py-4">Client</th>
                                                            <th className="px-6 py-4">Amount</th>
                                                            <th className="px-6 py-4">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {historyData.payments.length === 0 ? (
                                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : getPaginatedData(historyData.payments, historyPaymentsPage, historyRowsPerPage).map((p: any, i: number) => (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{new Date(p.date).toLocaleDateString()}</td>
                                                                <td className="px-6 py-3 font-medium">{p.sale?.marketer?.fullName || '-'}</td>
                                                                <td className="px-6 py-3 font-medium">{p.sale?.lead?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono">₦{p.amount.toLocaleString()}</td>
                                                                <td className="px-6 py-3">
                                                                    <span className={\`px-2 py-1 text-[10px] font-bold rounded uppercase \${p.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}\`}>
                                                                        {p.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {renderPagination(historyData.payments.length, historyPaymentsPage, setHistoryPaymentsPage)}
                                        </div>`;

c = c.replace(processedPaymentsOld, processedPaymentsNew);

// 4. Paid Commissions - Pagination
const paidCommissionsOld = `<tbody className="divide-y divide-gray-50">
                                                        {historyData.commissions.length === 0 ? (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : historyData.commissions.map((p, i) => {
                                                            const rate = p.sale?.marketer?.commissionRate || 5;
                                                            const commissionAmount = ((p.amount * rate) / 100) - (p.virtualLoanAmount || 0);
                                                            return (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{p.commissionDisbursedAt ? new Date(p.commissionDisbursedAt).toLocaleDateString() : '-'}</td>
                                                                <td className="px-6 py-3 font-medium">{p.sale?.marketer?.fullName}</td>
                                                                <td className="px-6 py-3 text-gray-500">{p.sale?.lead?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono font-bold text-emerald-600">₦{commissionAmount.toLocaleString()}</td>
                                                            </tr>
                                                        )})}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>`;

const paidCommissionsNew = `<tbody className="divide-y divide-gray-50">
                                                        {historyData.commissions.length === 0 ? (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : getPaginatedData(historyData.commissions, historyCommissionsPage, historyRowsPerPage).map((p: any, i: number) => {
                                                            const rate = p.sale?.marketer?.commissionRate || 5;
                                                            const commissionAmount = ((p.amount * rate) / 100) - (p.virtualLoanAmount || 0);
                                                            return (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{p.commissionDisbursedAt ? new Date(p.commissionDisbursedAt).toLocaleDateString() : '-'}</td>
                                                                <td className="px-6 py-3 font-medium">{p.sale?.marketer?.fullName}</td>
                                                                <td className="px-6 py-3 text-gray-500">{p.sale?.lead?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono font-bold text-emerald-600">₦{commissionAmount.toLocaleString()}</td>
                                                            </tr>
                                                        )})}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {renderPagination(historyData.commissions.length, historyCommissionsPage, setHistoryCommissionsPage)}
                                        </div>`;
c = c.replace(paidCommissionsOld, paidCommissionsNew);


// 5. Disbursed Requisitions - Pagination
const disbursedReqOld = `<tbody className="divide-y divide-gray-50">
                                                        {historyData.requisitions.length === 0 ? (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : historyData.requisitions.map((r, i) => (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{new Date(r.requestDate).toLocaleDateString()}</td>
                                                                <td className="px-6 py-3 font-medium">{r.title}</td>
                                                                <td className="px-6 py-3 text-gray-500">{r.requestedByUser?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono font-bold text-blue-600">₦{r.amountApproved?.toLocaleString() || 0}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>`;
const disbursedReqNew = `<tbody className="divide-y divide-gray-50">
                                                        {historyData.requisitions.length === 0 ? (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : getPaginatedData(historyData.requisitions, historyRequisitionsPage, historyRowsPerPage).map((r: any, i: number) => (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{new Date(r.requestDate).toLocaleDateString()}</td>
                                                                <td className="px-6 py-3 font-medium">{r.title}</td>
                                                                <td className="px-6 py-3 text-gray-500">{r.requestedByUser?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono font-bold text-blue-600">₦{r.amountApproved?.toLocaleString() || 0}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {renderPagination(historyData.requisitions.length, historyRequisitionsPage, setHistoryRequisitionsPage)}
                                        </div>`;
c = c.replace(disbursedReqOld, disbursedReqNew);

fs.writeFileSync(file, c);
console.log("Successfully added pagination and marketer column!");
