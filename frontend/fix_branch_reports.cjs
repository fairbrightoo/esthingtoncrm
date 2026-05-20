const fs = require('fs');

const file = 'src/pages/BranchReports.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/\{\/\* Main Profit Banner \*\/\}([\s\S]*?)\{\/\* Sub-KPI Metric Cards \*\/\}/, `{/* Main Split-View Revenue Banners */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                    <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Banknote size={100} /></div>
                        <div className="relative z-10">
                            <p className="text-blue-100 font-semibold tracking-widest uppercase text-xs mb-1 opacity-90 flex items-center"><ArrowDownRight size={14} className="mr-1"/> Direct Cash Inflow</p>
                            <h2 className="text-3xl font-black tracking-tight">₦{(stats.kpis?.directBranchRevenue || 0).toLocaleString()}</h2>
                            <p className="text-xs text-blue-200 mt-2">Cash deposited to this branch's bank accounts.</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-900 to-purple-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={100} /></div>
                        <div className="relative z-10">
                            <p className="text-purple-100 font-semibold tracking-widest uppercase text-xs mb-1 opacity-90 flex items-center"><TrendingUp size={14} className="mr-1"/> Cross-Branch Value</p>
                            <h2 className="text-3xl font-black tracking-tight">₦{(stats.kpis?.crossBranchGenerated || 0).toLocaleString()}</h2>
                            <p className="text-xs text-purple-200 mt-2">Value your staff generated for other branches.</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={100} /></div>
                        <div className="relative z-10">
                            <p className="text-gray-100 font-semibold tracking-widest uppercase text-xs mb-1 opacity-90 flex items-center"><PieIcon size={14} className="mr-1"/> Total Staff Volume</p>
                            <h2 className="text-3xl font-black tracking-tight">₦{(stats.kpis?.totalStaffSalesVolume || 0).toLocaleString()}</h2>
                            <p className="text-xs text-gray-200 mt-2">Combined total sales volume of your staff.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-900 to-green-700 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center justify-between text-white relative overflow-hidden mb-6">
                    <div className="relative z-10 w-full flex justify-between items-end">
                        <div>
                            <p className="text-green-100 font-semibold tracking-widest uppercase text-xs mb-1 opacity-90">Net Branch Profit / Loss</p>
                            <h2 className="text-4xl font-black tracking-tight">₦{(stats.kpis?.netBranchProfit || 0).toLocaleString()}</h2>
                        </div>
                        <div className="text-sm font-medium opacity-90 text-right">
                            <div><span className="opacity-75">Gross Cash Revenue:</span> ₦{(stats.kpis?.grossRevenue || 0).toLocaleString()}</div>
                            <div><span className="opacity-75">Total Deductions:</span> ₦{((stats.kpis?.grossRevenue || 0) - (stats.kpis?.netBranchProfit || 0)).toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Sub-KPI Metric Cards */}`);

fs.writeFileSync(file, c);
console.log('BranchReports.tsx updated');
