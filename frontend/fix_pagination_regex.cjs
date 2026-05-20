const fs = require('fs');
const file = 'src/pages/AccountantDashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

// 2. Add 'Rows per page' selector next to date filters
const filtersRegex = /<input\s+type="date"\s+value=\{historyEndDate\}\s+onChange=\{\(e\) => setHistoryEndDate\(e\.target\.value\)\}\s+className="px-3 py-1\.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"\s*\/>\s*<\/div>\s*<\/div>/;

const filtersStr = `<input 
                                                type="date" 
                                                value={historyEndDate}
                                                onChange={(e) => setHistoryEndDate(e.target.value)}
                                                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="ml-auto flex items-center gap-2 border-l border-gray-100 pl-3">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rows per page</label>
                                            <select 
                                                value={historyRowsPerPage}
                                                onChange={(e) => {
                                                    setHistoryRowsPerPage(Number(e.target.value));
                                                    setHistoryPaymentsPage(1);
                                                    setHistoryCommissionsPage(1);
                                                    setHistoryRequisitionsPage(1);
                                                }}
                                                className="px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                            >
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                            </select>
                                        </div>
                                    </div>`;

c = c.replace(filtersRegex, filtersStr);

// 3. Processed Payments - Add Marketer column & Pagination
const processedPaymentsRegex = /<thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">\s*<tr>\s*<th className="px-6 py-4">Date<\/th>\s*<th className="px-6 py-4">Client<\/th>\s*<th className="px-6 py-4">Amount<\/th>\s*<th className="px-6 py-4">Status<\/th>\s*<\/tr>\s*<\/thead>\s*<tbody className="divide-y divide-gray-50">\s*\{historyData\.payments\.length === 0 \? \(\s*<tr><td colSpan=\{4\} className="px-6 py-8 text-center text-gray-400">No records found\.<\/td><\/tr>\s*\) : historyData\.payments\.map\(\(p, i\) => \(\s*<tr key=\{i\} className="hover:bg-gray-50\/50">\s*<td className="px-6 py-3 text-gray-500">\{new Date\(p\.date\)\.toLocaleDateString\(\)\}<\/td>\s*<td className="px-6 py-3 font-medium">\{p\.sale\?\.lead\?\.fullName\}<\/td>\s*<td className="px-6 py-3 font-mono">₦\{p\.amount\.toLocaleString\(\)\}<\/td>\s*<td className="px-6 py-3">\s*<span className=\{\`px-2 py-1 text-\[10px\] font-bold rounded uppercase \$\{p\.status === 'APPROVED' \? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'\}\`\}>\s*\{p\.status\}\s*<\/span>\s*<\/td>\s*<\/tr>\s*\)\)\}\s*<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>/;

const processedPaymentsNew = `<thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
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
c = c.replace(processedPaymentsRegex, processedPaymentsNew);

// 4. Paid Commissions - Pagination
const paidCommissionsRegex = /<tbody className="divide-y divide-gray-50">\s*\{historyData\.commissions\.length === 0 \? \(\s*<tr><td colSpan=\{4\} className="px-6 py-8 text-center text-gray-400">No records found\.<\/td><\/tr>\s*\) : historyData\.commissions\.map\(\(p, i\) => \{\s*const rate = p\.sale\?\.marketer\?\.commissionRate \|\| 5;\s*const commissionAmount = \(\(p\.amount \* rate\) \/ 100\) - \(p\.virtualLoanAmount \|\| 0\);\s*return \(\s*<tr key=\{i\} className="hover:bg-gray-50\/50">\s*<td className="px-6 py-3 text-gray-500">\{p\.commissionDisbursedAt \? new Date\(p\.commissionDisbursedAt\)\.toLocaleDateString\(\) : '-'}<\/td>\s*<td className="px-6 py-3 font-medium">\{p\.sale\?\.marketer\?\.fullName\}<\/td>\s*<td className="px-6 py-3 text-gray-500">\{p\.sale\?\.lead\?\.fullName\}<\/td>\s*<td className="px-6 py-3 font-mono font-bold text-emerald-600">₦\{commissionAmount\.toLocaleString\(\)\}<\/td>\s*<\/tr>\s*\)\}\)\}\s*<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>/;

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
c = c.replace(paidCommissionsRegex, paidCommissionsNew);

// 5. Disbursed Requisitions - Pagination
const disbursedReqRegex = /<tbody className="divide-y divide-gray-50">\s*\{historyData\.requisitions\.length === 0 \? \(\s*<tr><td colSpan=\{4\} className="px-6 py-8 text-center text-gray-400">No records found\.<\/td><\/tr>\s*\) : historyData\.requisitions\.map\(\(r, i\) => \(\s*<tr key=\{i\} className="hover:bg-gray-50\/50">\s*<td className="px-6 py-3 text-gray-500">\{new Date\(r\.requestDate\)\.toLocaleDateString\(\)\}<\/td>\s*<td className="px-6 py-3 font-medium">\{r\.title\}<\/td>\s*<td className="px-6 py-3 text-gray-500">\{r\.requestedByUser\?\.fullName\}<\/td>\s*<td className="px-6 py-3 font-mono font-bold text-blue-600">₦\{r\.amountApproved\?\.toLocaleString\(\) \|\| 0\}<\/td>\s*<\/tr>\s*\)\)\}\s*<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>/;

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
c = c.replace(disbursedReqRegex, disbursedReqNew);

fs.writeFileSync(file, c);
console.log("Regex script execution finished.");
