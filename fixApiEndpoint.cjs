const fs = require('fs');
const file = 'frontend/src/pages/Campaigns.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    /\/api\/inventory\/estates/g,
    '/api/estates'
);

fs.writeFileSync(file, c);
console.log("Fixed API endpoint");
