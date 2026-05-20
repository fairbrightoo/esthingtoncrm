const fs = require('fs');

const fixGlobalUsers = () => {
    const file = 'src/pages/GlobalUserManagement.tsx';
    let c = fs.readFileSync(file, 'utf8');

    // 1. Add Pagination import
    if (!c.includes("import { Pagination, getPaginatedData }")) {
        c = c.replace("import { Search, Save, X, Edit, ShieldAlert, BadgeCheck, PowerOff, Building, Network, Eye } from 'lucide-react';", "import { Search, Save, X, Edit, ShieldAlert, BadgeCheck, PowerOff, Building, Network, Eye } from 'lucide-react';\nimport { Pagination, getPaginatedData } from '../components/Pagination';");
    }

    // 2. Add pagination state
    if (!c.includes("const [page, setPage]")) {
        const stateVars = `    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState(10);`;
        c = c.replace(/    const \[loading, setLoading\] = useState\(false\);/, stateVars);
    }

    // 3. filteredUsers loop
    const usersRegex = /filteredUsers\.map\(\(user\) => \(/;
    if (usersRegex.test(c)) {
        c = c.replace(usersRegex, `getPaginatedData(filteredUsers, page, rows).map((user) => (`);
        c = c.replace(/<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*\)\}/, `</tbody>
                        </table>
                    </div>
                    {filteredUsers.length > 0 && <Pagination dataLength={filteredUsers.length} currentPage={page} rowsPerPage={rows} setPage={setPage} setRowsPerPage={setRows} />}
                </div>
            )}`);
    }

    // reset page on filter
    if (!c.includes("setPage(1);")) {
        c = c.replace(/fetchMetadata\(\);\s*fetchUsers\(\);/, `fetchMetadata();
        fetchUsers();
        setPage(1);`);
    }
    
    // search term reset
    if (c.includes('onChange={(e) => setSearchTerm(e.target.value)}')) {
         c = c.replace(/onChange=\{\(e\) => setSearchTerm\(e\.target\.value\)\}/, `onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}`);
    }

    fs.writeFileSync(file, c);
    console.log("GlobalUserManagement fixed");
};

fixGlobalUsers();
