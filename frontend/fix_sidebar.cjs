const fs = require('fs');

const file = 'src/components/Sidebar.tsx';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('to="/admin/global-clients"')) {
    c = c.replace(/<NavItem to="\/admin\/users" icon=\{<Users size=\{20\} \/>\} label="Global User Mgmt" \/>/, `<NavItem to="/admin/users" icon={<Users size={20} />} label="Global User Mgmt" />\n                        <NavItem to="/admin/global-clients" icon={<Globe size={20} />} label="Global Clients" />`);
}

fs.writeFileSync(file, c);
console.log('Sidebar.tsx updated');
