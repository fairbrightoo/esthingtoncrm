const fs = require('fs');
const path = './src/controllers/CompanyController.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/'MARKETER', 'CUSTOMER_CARE', 'BRANCH_HR'/g, "'MARKETER', 'CUSTOMER_CARE', 'BRANCH_HR', 'ACCOUNTANT'");
fs.writeFileSync(path, content);
console.log('Done replacement in CompanyController');
