const fs = require('fs');
const file = 'src/pages/BranchReports.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    /const \[dateRange, setDateRange\] = useState\<'ALL' \| 'THIS_MONTH' \| 'LAST_90_DAYS'\>\('ALL'\);/,
    `const [dateRange, setDateRange] = useState<'ALL' | 'MONTHLY_CYCLE' | 'THIS_MONTH' | 'LAST_90_DAYS' | 'CUSTOM'>('MONTHLY_CYCLE');
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');`
);

c = c.replace(
    /}, \[user, dateRange\]\);/,
    `}, [user, dateRange, customStart, customEnd]);`
);

c = c.replace(
    /if \(targetBranchId\) {\s*fetchStats\(targetBranchId\);\s*} else {/,
    `if (targetBranchId) {
            if (dateRange === 'CUSTOM' && (!customStart || !customEnd)) {
                return; // Wait for both dates
            }
            fetchStats(targetBranchId);
        } else {`
);

c = c.replace(
    /} else if \(dateRange === 'LAST_90_DAYS'\) \{\s*const ninetyDaysAgo = new Date\(\);\s*ninetyDaysAgo\.setDate\(ninetyDaysAgo\.getDate\(\) - 90\);\s*startParams = \`&startDate=\$\{ninetyDaysAgo\.toISOString\(\)\}\`;\s*\}/,
    `} else if (dateRange === 'LAST_90_DAYS') {
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                startParams = \`&startDate=\${ninetyDaysAgo.toISOString()}\`;
            } else if (dateRange === 'MONTHLY_CYCLE') {
                const now = new Date();
                let year = now.getFullYear();
                let month = now.getMonth() + 1;

                let cycleMonth = month;
                let cycleYear = year;
                if (now.getDate() >= 26) {
                    cycleMonth = month + 1;
                    if (cycleMonth > 12) {
                        cycleMonth = 1;
                        cycleYear++;
                    }
                }

                let startMonth = cycleMonth - 1;
                let startYear = cycleYear;
                if (startMonth === 0) {
                    startMonth = 12;
                    startYear--;
                }
                const startDateStr = \`\${startYear}-\${startMonth.toString().padStart(2, '0')}-26T00:00:00.000Z\`;
                const endDateStr = \`\${cycleYear}-\${cycleMonth.toString().padStart(2, '0')}-25T23:59:59.999Z\`;

                startParams = \`&startDate=\${startDateStr}&endDate=\${endDateStr}\`;
            } else if (dateRange === 'CUSTOM') {
                if (customStart && customEnd) {
                    startParams = \`&startDate=\${new Date(customStart).toISOString()}&endDate=\${new Date(customEnd).toISOString()}\`;
                }
            }`
);

// also the select drop down options
c = c.replace(
    /<option value="ALL">All-Time Revenue<\/option>\s*<option value="THIS_MONTH">This Month<\/option>\s*<option value="LAST_90_DAYS">Last 90 Days<\/option>/,
    `<option value="ALL">All-Time Revenue</option>
                                <option value="MONTHLY_CYCLE">Monthly Cycle (26th-25th)</option>
                                <option value="THIS_MONTH">This Month</option>
                                <option value="LAST_90_DAYS">Last 90 Days</option>
                                <option value="CUSTOM">Custom Date</option>`
);

c = c.replace(
    /<\/select>\s*<\/div>\s*<button/,
    `</select>
                        </div>
                        {dateRange === 'CUSTOM' && (
                            <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                                <input 
                                    type="date" 
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm text-gray-700 py-1 pl-2"
                                />
                                <span className="text-gray-400">-</span>
                                <input 
                                    type="date" 
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm text-gray-700 py-1 pr-2"
                                />
                            </div>
                        )}
                        <button`
);

fs.writeFileSync(file, c);
console.log("Done");
