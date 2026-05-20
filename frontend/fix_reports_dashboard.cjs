const fs = require('fs');

const file = 'src/pages/ReportsDashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/const tableColumn = \["S\/N", "Trans Date", "Clients", "Desc", "Sqm", "Corner", "Amount Paid", "Comm Paid", "Estate", "Marketer", "Acct Paid To"\];/, `const tableColumn = ["S/N", "Trans Date", "Clients", "Desc", "Sqm", "Corner", "Amount Paid", "Comm Paid", "Estate", "Marketer", "Acct Paid To", "Sale Type", "Managing Branch"];`);

c = c.replace(/sale\.marketerName,\s+sale\.accountPaidTo\s+\];/, `sale.marketerName,
                sale.accountPaidTo,
                sale.saleType || 'Direct Sale',
                sale.managingBranchName || 'Head Office'
            ];`);

c = c.replace(/"Marketer": sale\.marketerName,\s+"Acct Paid To": sale\.accountPaidTo\s+\}\)\);/, `"Marketer": sale.marketerName,
            "Acct Paid To": sale.accountPaidTo,
            "Sale Type": sale.saleType || 'Direct Sale',
            "Managing Branch": sale.managingBranchName || 'Head Office'
        }));`);

c = c.replace(/<th className="p-3">Marketer<\/th>\s+<th className="p-3">Acct Paid To<\/th>\s+<\/tr>/, `<th className="p-3">Marketer</th>
                                        <th className="p-3">Acct Paid To</th>
                                        <th className="p-3">Sale Type</th>
                                        <th className="p-3">Managing Branch</th>
                                    </tr>`);

c = c.replace(/<td className="p-3 text-indigo-600 font-medium">\{sale\.accountPaidTo\}<\/td>\s+<\/tr>/g, `<td className="p-3 text-indigo-600 font-medium">{sale.accountPaidTo}</td>
                                                <td className="p-3">
                                                    <span className={\`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest \${
                                                        sale.saleType === 'Inbound Cross-Sale' ? 'bg-purple-100 text-purple-700' : 
                                                        sale.saleType === 'Outbound Cross-Sale' ? 'bg-orange-100 text-orange-700' : 
                                                        'bg-blue-100 text-blue-700'
                                                    }\`}>{sale.saleType || 'Direct Sale'}</span>
                                                </td>
                                                <td className="p-3 font-semibold text-gray-700">{sale.managingBranchName || 'Head Office'}</td>
                                            </tr>`);

c = c.replace(/<td colSpan=\{11\} className="p-6 text-center text-gray-500">/, `<td colSpan={13} className="p-6 text-center text-gray-500">`);

fs.writeFileSync(file, c);
console.log('ReportsDashboard.tsx updated');
