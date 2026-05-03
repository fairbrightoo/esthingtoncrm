const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      // Ignore config directory to avoid replacing in prisma.ts itself
      if (f !== 'config') {
          walkDir(dirPath, callback);
      }
    } else if (f.endsWith('.ts')) {
      callback(path.join(dir, f));
    }
  });
}

const targetDir = path.join(__dirname, 'src');

walkDir(targetDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (content.includes("import { PrismaClient } from '@prisma/client';") || content.includes("import { PrismaClient } from \"@prisma/client\";")) {
    
    // Calculate relative path to src/config/prisma.js
    const srcDir = path.join(__dirname, 'src');
    const relativeToSrc = path.relative(path.dirname(filePath), srcDir);
    let relativeToPrisma = path.join(relativeToSrc, 'config/prisma.js').replace(/\\/g, '/');
    
    if (!relativeToPrisma.startsWith('.')) {
      relativeToPrisma = './' + relativeToPrisma;
    }

    content = content.replace(/import\s+{\s*PrismaClient\s*}\s+from\s+['"]@prisma\/client['"];\s*/g, '');
    
    // Some files might have multiple declarations or different spacing
    content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\(\);\s*/g, '');
    
    // Add the import at the top (after other imports)
    const newImport = `import prisma from '${relativeToPrisma}';\n`;
    
    // Find the last import line to append after, or just put at the top if no imports
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
            lastImportIdx = i;
        }
    }
    
    if (lastImportIdx >= 0) {
        lines.splice(lastImportIdx + 1, 0, newImport);
        content = lines.join('\n');
    } else {
        content = newImport + content;
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
