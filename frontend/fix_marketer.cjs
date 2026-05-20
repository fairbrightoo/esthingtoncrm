const fs = require('fs');

const fixMarketerDashboard = () => {
    const file = 'src/pages/MarketerDashboard.tsx';
    let c = fs.readFileSync(file, 'utf8');

    // 1. Add Pagination import
    if (!c.includes("import { Pagination, getPaginatedData }")) {
        c = c.replace("import { AnnouncementWidget }", "import { AnnouncementWidget } from '../components/AnnouncementWidget';\nimport { Pagination, getPaginatedData } from '../components/Pagination';");
    }

    // 2. Add pagination state
    if (!c.includes("const [leadsPage,")) {
        const stateVars = `    // Quick Message State
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    
    // Pagination States
    const [leadsPage, setLeadsPage] = useState(1);
    const [leadsRowsPerPage, setLeadsRowsPerPage] = useState(10);
    const [salesPage, setSalesPage] = useState(1);
    const [salesRowsPerPage, setSalesRowsPerPage] = useState(10);
`;
        c = c.replace(/    \/\/ Quick Message State\s*const \[isMessageModalOpen, setIsMessageModalOpen\] = useState\(false\);/, stateVars);
    }

    // 3. Replace mapping for Prospects / Clients (My Leads)
    const pipelineRegex = /\{\(activeTab === 'clients' \? mData\.recentClients : mData\.recentProspects\)\.map\(\(item: any\) => \(/;
    if (pipelineRegex.test(c)) {
        c = c.replace(pipelineRegex, `{getPaginatedData((activeTab === 'clients' ? mData.recentClients : mData.recentProspects), leadsPage, leadsRowsPerPage).map((item: any) => (`);
        
        // Add Pagination component at the bottom of the list
        c = c.replace(/\{\(activeTab === 'clients' \? mData\.recentClients : mData\.recentProspects\)\.length === 0 && \(\s*<div className="p-8 text-center text-gray-500">\s*No \{activeTab\} found yet\.\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>/, `{(activeTab === 'clients' ? mData.recentClients : mData.recentProspects).length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    No {activeTab} found yet.
                                </div>
                            )}
                        </div>
                        <Pagination 
                            dataLength={(activeTab === 'clients' ? mData.recentClients : mData.recentProspects).length} 
                            currentPage={leadsPage} 
                            rowsPerPage={leadsRowsPerPage} 
                            setPage={setLeadsPage} 
                            setRowsPerPage={setLeadsRowsPerPage} 
                        />
                    </div>
                </div>`);
    }

    // 4. Replace mapping for Recent Payments
    const paymentsRegex = /\{mData\.recentPayments\.map\(\(p: any\) => \(/;
    if (paymentsRegex.test(c)) {
        c = c.replace(paymentsRegex, `{getPaginatedData(mData.recentPayments, salesPage, salesRowsPerPage).map((p: any) => (`);
        
        // Add Pagination component
        c = c.replace(/<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, `</div>
                            )}
                        </div>
                        <Pagination 
                            dataLength={mData.recentPayments.length} 
                            currentPage={salesPage} 
                            rowsPerPage={salesRowsPerPage} 
                            setPage={setSalesPage} 
                            setRowsPerPage={setSalesRowsPerPage} 
                        />
                    </div>
                </div>
            </div>`);
    }

    fs.writeFileSync(file, c);
    console.log("MarketerDashboard fixed");
};

fixMarketerDashboard();
