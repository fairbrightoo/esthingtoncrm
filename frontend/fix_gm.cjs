const fs = require('fs');

const fixGMQueue = () => {
    const file = 'src/pages/GMAdvisoryQueue.tsx';
    let c = fs.readFileSync(file, 'utf8');

    // 1. Add Pagination import
    if (!c.includes("import { Pagination, getPaginatedData }")) {
        c = c.replace("import { useToast } from '../context/ToastContext';", "import { useToast } from '../context/ToastContext';\nimport { Pagination, getPaginatedData } from '../components/Pagination';");
    }

    // 2. Add pagination state
    if (!c.includes("const [page, setPage]")) {
        const stateVars = `    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState(10);`;
        c = c.replace(/    const \[loading, setLoading\] = useState\(true\);/, stateVars);
    }

    // 3. Requisitions loop
    const reqRegex = /requisitions\.map\(\(req\) => \{/;
    if (reqRegex.test(c)) {
        c = c.replace(reqRegex, `getPaginatedData(requisitions, page, rows).map((req) => {`);
        c = c.replace(/<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\};/, `</tbody>
                    </table>
                </div>
                {requisitions.length > 0 && <Pagination dataLength={requisitions.length} currentPage={page} rowsPerPage={rows} setPage={setPage} setRowsPerPage={setRows} />}
            </div>
        </div>
    );
};`);
    }

    fs.writeFileSync(file, c);
    console.log("GMAdvisoryQueue fixed");
};

fixGMQueue();
