const fs = require('fs');

const fixTeamMng = () => {
    const file = 'src/pages/TeamManagement.tsx';
    let c = fs.readFileSync(file, 'utf8');

    // 1. Add Pagination import
    if (!c.includes("import { Pagination, getPaginatedData }")) {
        c = c.replace("import { useToast } from '../context/ToastContext';", "import { useToast } from '../context/ToastContext';\nimport { Pagination, getPaginatedData } from '../components/Pagination';");
    }

    // 2. Add pagination state
    if (!c.includes("const [page, setPage]")) {
        const stateVars = `    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState(10);`;
        c = c.replace(/    const \[isLoading, setIsLoading\] = useState\(true\);/, stateVars);
    }

    // 3. Members loop
    const membersRegex = /members\.map\(m => \(/;
    if (membersRegex.test(c)) {
        c = c.replace(membersRegex, `getPaginatedData(members, page, rows).map(m => (`);
        c = c.replace(/<\/tbody>\s*<\/table>\s*<\/div>/, `</tbody>
                </table>
                {members.length > 0 && <Pagination dataLength={members.length} currentPage={page} rowsPerPage={rows} setPage={setPage} setRowsPerPage={setRows} />}
            </div>`);
    }

    fs.writeFileSync(file, c);
    console.log("TeamManagement fixed");
};

fixTeamMng();
