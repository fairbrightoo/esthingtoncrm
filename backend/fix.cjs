const fs = require('fs');
const path = './src/controllers/LeadController.ts';
let content = fs.readFileSync(path, 'utf8');
const search = `            const saveFileFromBuffer = (file: Express.Multer.File, prefix: string) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')) : '';
                const filename = \\\`\\\${prefix}-\\\${uniqueSuffix}\\\${ext}\\\`;
                const filepath = path.join(process.cwd(), 'uploads', filename);
                fs.writeFileSync(filepath, file.buffer);
                return \\\`/uploads/\\\${filename}\\\`;
            };

            if (files?.profilePicture?.[0]) {
                updateData.profilePictureUrl = saveFileFromBuffer(files.profilePicture[0], 'passport');
            }
            if (files?.govtId?.[0]) {
                updateData.govtIdUrl = saveFileFromBuffer(files.govtId[0], 'govtid');
            }`;

const replacement = `            if (files?.profilePicture?.[0]) {
                updateData.profilePictureUrl = await uploadFile(files.profilePicture[0].buffer, files.profilePicture[0].originalname, 'kyc/passports');
            }
            if (files?.govtId?.[0]) {
                updateData.govtIdUrl = await uploadFile(files.govtId[0].buffer, files.govtId[0].originalname, 'kyc/ids');
            }`;

// A more robust regex replacement that ignores whitespace differences
content = content.replace(/const saveFileFromBuffer[\s\S]*?govtid'\);\s*}/m, replacement);
fs.writeFileSync(path, content);
console.log('Done replacement');
