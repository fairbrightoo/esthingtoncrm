const fs = require('fs');

const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes("import { GlobalClientsDatabase }")) {
    c = c.replace(/import { GlobalUserManagement } from '\.\/pages\/GlobalUserManagement';/, `import { GlobalUserManagement } from './pages/GlobalUserManagement';\nimport { GlobalClientsDatabase } from './pages/GlobalClientsDatabase';`);
}

if (!c.includes('path="/admin/global-clients"')) {
    c = c.replace(/<Route path="\/admin\/users" element=\{<DashboardLayout><GlobalUserManagement \/><\/DashboardLayout>\} \/>/, `<Route path="/admin/users" element={<DashboardLayout><GlobalUserManagement /></DashboardLayout>} />\n            <Route path="/admin/global-clients" element={<DashboardLayout><GlobalClientsDatabase /></DashboardLayout>} />`);
}

fs.writeFileSync(file, c);
console.log('App.tsx updated');
