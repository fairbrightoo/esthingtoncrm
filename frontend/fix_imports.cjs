const fs = require('fs');
const file = 'src/pages/AccountantDashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace("'Eye, FileText, AlertCircle, lucide-react';", "'lucide-react';");
c = c.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
    if (!p1.includes('Eye')) {
        return `import {${p1}, Eye, FileText, AlertCircle} from 'lucide-react';`;
    }
    return match;
});

fs.writeFileSync(file, c);
console.log('Fixed imports');
