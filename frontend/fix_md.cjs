const fs = require('fs');

const fixMDDashboard = () => {
    const file = 'src/pages/ManagingDirectorDashboard.tsx';
    let c = fs.readFileSync(file, 'utf8');

    // 1. Add Pagination import
    if (!c.includes("import { Pagination, getPaginatedData }")) {
        c = c.replace("import { AnnouncementWidget }", "import { AnnouncementWidget } from '../components/AnnouncementWidget';\nimport { Pagination, getPaginatedData } from '../components/Pagination';");
    }

    // 2. Add pagination state
    if (!c.includes("const [reqPage,")) {
        const stateVars = `    // Pagination States
    const [reqPage, setReqPage] = useState(1);
    const [reqRows, setReqRows] = useState(10);
    const [payPage, setPayPage] = useState(1);
    const [payRows, setPayRows] = useState(10);
    const [procPayPage, setProcPayPage] = useState(1);
    const [procPayRows, setProcPayRows] = useState(10);
    const [procReqPage, setProcReqPage] = useState(1);
    const [procReqRows, setProcReqRows] = useState(10);

    const fetchPendingPayments = async () => {`;
        c = c.replace(/    const fetchPendingPayments = async \(\) => \{/, stateVars);
    }

    // 3. Requisitions
    const reqRegex = /\{requisitions\.map\(\(req: any\) => \{/;
    if (reqRegex.test(c)) {
        c = c.replace(reqRegex, `{getPaginatedData(requisitions, reqPage, reqRows).map((req: any) => {`);
        c = c.replace(/<\/tbody>\s*<\/table>\s*\)\}\s*<\/div>\s*\)\}/, `</tbody>
                        </table>
                    )}
                    {requisitions.length > 0 && <Pagination dataLength={requisitions.length} currentPage={reqPage} rowsPerPage={reqRows} setPage={setReqPage} setRowsPerPage={setReqRows} />}
                </div>
            )}`);
    }

    // 4. Payments
    const payRegex = /\{payments\.map\(\(p\) => \(/;
    if (payRegex.test(c)) {
        c = c.replace(payRegex, `{getPaginatedData(payments, payPage, payRows).map((p) => (`);
        c = c.replace(/<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/>\s*\)\}/, `</tbody>
                        </table>
                    </div>
                    {payments.length > 0 && <Pagination dataLength={payments.length} currentPage={payPage} rowsPerPage={payRows} setPage={setPayPage} setRowsPerPage={setPayRows} />}
                </div>
            )}
            </>
            )}`);
    }

    // 5. Processed Payments
    if (c.includes("{historyView === 'PAYMENTS' ? (")) {
        c = c.replace(/\{historyView === 'PAYMENTS' \? \(\s*<div className="overflow-x-auto">/, `{historyView === 'PAYMENTS' ? (\n                        <>\n                        <div className="overflow-x-auto">`);
        
        const procPayRegex = /processedPayments\.map\(\(p\) => \(/;
        if (procPayRegex.test(c)) {
            c = c.replace(procPayRegex, `getPaginatedData(processedPayments, procPayPage, procPayRows).map((p) => (`);
            c = c.replace(/<\/tbody>\s*<\/table>\s*<\/div>\s*\) : \(\s*<div className="overflow-x-auto">/, `</tbody>
                            </table>
                        </div>
                        {processedPayments.length > 0 && <Pagination dataLength={processedPayments.length} currentPage={procPayPage} rowsPerPage={procPayRows} setPage={setProcPayPage} setRowsPerPage={setProcPayRows} />}
                        </>\n                    ) : (\n                        <div className="overflow-x-auto">`);
        }
    }

    // 6. Processed Requisitions
    const procReqRegex = /processedRequisitions\.map\(\(req: any\) => \{/;
    if (procReqRegex.test(c)) {
        // wrap Processed Requisitions in a fragment too, because it is the "else" branch
        c = c.replace(/\) : \(\s*<div className="overflow-x-auto">/, `) : (\n                        <>\n                        <div className="overflow-x-auto">`);
        c = c.replace(procReqRegex, `getPaginatedData(processedRequisitions, procReqPage, procReqRows).map((req: any) => {`);
        c = c.replace(/<\/tbody>\s*<\/table>\s*<\/div>\s*\)\}\s*<\/div>\s*\)\}/, `</tbody>
                            </table>
                        </div>
                        {processedRequisitions.length > 0 && <Pagination dataLength={processedRequisitions.length} currentPage={procReqPage} rowsPerPage={procReqRows} setPage={setProcReqPage} setRowsPerPage={setProcReqRows} />}
                        </>\n                    )}\n                </div>\n            )}`);
    }

    fs.writeFileSync(file, c);
    console.log("MD fixed");
};

fixMDDashboard();
