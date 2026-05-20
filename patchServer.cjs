const fs = require('fs');
const file = 'backend/src/server.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    /import ticketRoutes from '\.\/routes\/ticketRoutes\.js';/,
    `import ticketRoutes from './routes/ticketRoutes.js';\nimport referralRoutes from './routes/referralRoutes.js';`
);

c = c.replace(
    /app\.use\('\/api\/tickets', ticketRoutes\);/,
    `app.use('/api/tickets', ticketRoutes);\napp.use('/api/referrals', referralRoutes);`
);

fs.writeFileSync(file, c);
console.log("Server.ts patched");
