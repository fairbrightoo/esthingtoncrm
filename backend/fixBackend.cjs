const fs = require('fs');
const file = 'src/controllers/CampaignController.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    /if \(filters\.source && typeof filters\.source === 'string' && filters\.source\.trim\(\) !== ''\) \{\s*whereClause\.source = \{ contains: filters\.source \};\s*\}/,
    `if (filters.source && typeof filters.source === 'string' && filters.source.trim() !== '') {
                whereClause.source = { contains: filters.source };
            }
            if (filters.estateId) {
                whereClause.sales = {
                    some: {
                        plot: {
                            estateId: filters.estateId
                        }
                    }
                };
            }`
);

fs.writeFileSync(file, c);
console.log("Backend Patched");
