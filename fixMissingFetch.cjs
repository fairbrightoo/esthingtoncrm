const fs = require('fs');
const file = 'frontend/src/pages/Campaigns.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    /useEffect\(\(\) => \{\s*fetchCampaigns\(\);\s*fetchTemplates\(\);\s*fetchWhatsAppTemplates\(\);\s*\}, \[\]\);/,
    `useEffect(() => {
        fetchCampaigns();
        fetchTemplates();
        fetchWhatsAppTemplates();
        fetchEstates();
    }, []);`
);

fs.writeFileSync(file, c);
console.log("Fixed missing fetchEstates call");
