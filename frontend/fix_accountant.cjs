const fs = require('fs');

const fixAccountant = () => {
    const file = 'src/pages/AccountantDashboard.tsx';
    let c = fs.readFileSync(file, 'utf8');

    // 2. Add pagination state
    if (!c.includes("const [disbPage,")) {
        const stateVars = `    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Pagination States for Active Tabs
    const [disbPage, setDisbPage] = useState(1);
    const [disbRows, setDisbRows] = useState(10);
    const [payPage, setPayPage] = useState(1);
    const [payRows, setPayRows] = useState(10);
    const [commPage, setCommPage] = useState(1);
    const [commRows, setCommRows] = useState(10);`;
        c = c.replace(/    const \[loading, setLoading\] = useState\(true\);\s*const \[actionLoading, setActionLoading\] = useState\(false\);/, stateVars);
    }

    // 3. disbursements
    const disbRegex = /disbursements\.filter\(req => req\.status !== 'DISBURSED'\)\.map\(req => \{/;
    if (disbRegex.test(c)) {
        c = c.replace(disbRegex, `getPaginatedData(disbursements.filter(req => req.status !== 'DISBURSED'), disbPage, disbRows).map(req => {`);
        c = c.replace(/<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*<\/>\s*\)\}\s*<\/>\s*\)\}/, `</tbody>
                                    </table>
                                </div>
                                {disbursements.filter(req => req.status !== 'DISBURSED').length > 0 && <Pagination dataLength={disbursements.filter(req => req.status !== 'DISBURSED').length} currentPage={disbPage} rowsPerPage={disbRows} setPage={setDisbPage} setRowsPerPage={setDisbRows} />}
                            </div>
                        </>
                    )}
                </>
            )}`);
    }

    // 4. pendingPayments
    const payRegex = /pendingPayments\.map\(p => \(/;
    if (payRegex.test(c)) {
        c = c.replace(payRegex, `getPaginatedData(pendingPayments, payPage, payRows).map(p => (`);
        c = c.replace(/<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*\{!loading && \(/, `</tbody>
                                                </table>
                                            </div>
                                            {pendingPayments.length > 0 && <Pagination dataLength={pendingPayments.length} currentPage={payPage} rowsPerPage={payRows} setPage={setPayPage} setRowsPerPage={setPayRows} />}
                                        </div>
                                        {!loading && (`);
    }

    // 5. pendingCommissions
    const commRegex = /pendingCommissions\.map\(req => \(/;
    if (commRegex.test(c)) {
        c = c.replace(commRegex, `getPaginatedData(pendingCommissions, commPage, commRows).map(req => (`);
        c = c.replace(/<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/>\s*\)\}/, `</tbody>
                                                </table>
                                            </div>
                                            {pendingCommissions.length > 0 && <Pagination dataLength={pendingCommissions.length} currentPage={commPage} rowsPerPage={commRows} setPage={setCommPage} setRowsPerPage={setCommRows} />}
                                        </div>
                                    )}
                                </>
                            )}`);
    }

    fs.writeFileSync(file, c);
    console.log("AccountantDashboard fixed");
};

fixAccountant();
