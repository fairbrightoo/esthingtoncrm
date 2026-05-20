const fs = require('fs');
const file = 'src/pages/Campaigns.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    /const \[sourceFilter, setSourceFilter\] = useState\(''\);/,
    `const [sourceFilter, setSourceFilter] = useState('');
    const [estateFilter, setEstateFilter] = useState('All');
    const [estates, setEstates] = useState<any[]>([]);`
);

c = c.replace(
    /fetchWhatsAppTemplates\(\);\s*}\), \[\]\);/,
    `fetchWhatsAppTemplates();
        fetchEstates();
    }, []);`
);

c = c.replace(
    /const fetchTemplates = async \(\) => \{/,
    `const fetchEstates = async () => {
        try {
            const res = await axios.get(\`\${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/inventory/estates\`, {
                headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
            });
            setEstates(res.data);
        } catch (error) {
            console.error("Failed to load estates", error);
        }
    };

    const fetchTemplates = async () => {`
);

c = c.replace(
    /const filters: any = \{ gender: genderFilter, status: statusFilter, source: sourceFilter \};/,
    `const filters: any = { gender: genderFilter, status: statusFilter, source: sourceFilter };
            if (statusFilter === 'CLIENT' && estateFilter !== 'All') {
                filters.estateId = estateFilter;
                const est = estates.find(e => e.id === estateFilter);
                if (est) filters.estateName = est.name;
            }`
);

c = c.replace(
    /setSourceFilter\(''\);/,
    `setSourceFilter('');
            setEstateFilter('All');`
);

c = c.replace(
    /if \(f\.source\) parts\.push\(\`Source: \$\{f\.source\}\`\);/,
    `if (f.source) parts.push(\`Source: \${f.source}\`);
                                            if (f.estateName) parts.push(\`Estate: \${f.estateName}\`);`
);

c = c.replace(
    /<div className="grid grid-cols-3 gap-4">/,
    `<div className="grid grid-cols-2 md:grid-cols-4 gap-4">`
);

c = c.replace(
    /<select\s*value=\{statusFilter\} onChange=\{e => setStatusFilter\(e\.target\.value\)\}/,
    `<select
                                            value={statusFilter} onChange={e => {
                                                setStatusFilter(e.target.value);
                                                if (e.target.value !== 'CLIENT') setEstateFilter('All');
                                            }}`
);

c = c.replace(
    /placeholder="e\.g\. Facebook"\s*\/>\s*<\/div>\s*<\/div>/,
    `placeholder="e.g. Facebook"
                                        />
                                    </div>
                                    {statusFilter === 'CLIENT' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Subscribed Estate</label>
                                            <select
                                                value={estateFilter} onChange={e => setEstateFilter(e.target.value)}
                                                className="w-full text-sm border rounded p-1.5"
                                            >
                                                <option value="All">All Estates</option>
                                                {estates.map(e => (
                                                    <option key={e.id} value={e.id}>{e.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>`
);

fs.writeFileSync(file, c);
console.log("Frontend Patched");
