const fs = require('fs');

// Patch ticketRoutes.ts
const ticketRoutesFile = 'src/routes/ticketRoutes.ts';
let routesContent = fs.readFileSync(ticketRoutesFile, 'utf8');
routesContent = routesContent.replace(
    /import { authenticateToken } from '\.\.\/middleware\/authMiddleware\.js';/,
    `import { authenticateToken } from '../middleware/authMiddleware.js';\nimport { upload } from '../middleware/uploadMiddleware.js';`
);
routesContent = routesContent.replace(
    /router\.post\('\/', HelpdeskTicketController\.create\);/,
    `router.post('/', upload.single('attachment'), HelpdeskTicketController.create);`
);
fs.writeFileSync(ticketRoutesFile, routesContent);

// Patch HelpdeskTicketController.ts
const ticketControllerFile = 'src/controllers/HelpdeskTicketController.ts';
let controllerContent = fs.readFileSync(ticketControllerFile, 'utf8');

controllerContent = controllerContent.replace(
    /import prisma from '\.\.\/config\/prisma\.js';/,
    `import prisma from '../config/prisma.js';\nimport { uploadFile } from '../services/StorageService.js';`
);

controllerContent = controllerContent.replace(
    /const \{ title, description, priority, category, leadId \} = req\.body;/,
    `const { title, description, priority, category, leadId } = req.body;
            let attachmentUrl = null;
            if (req.file) {
                attachmentUrl = await uploadFile(req.file.buffer, req.file.originalname, 'helpdesk');
            }`
);

controllerContent = controllerContent.replace(
    /category: category \|\| 'GENERAL',/,
    `category: category || 'GENERAL',\n                    attachmentUrl,`
);

fs.writeFileSync(ticketControllerFile, controllerContent);
console.log("Backend routes and controller patched successfully.");
