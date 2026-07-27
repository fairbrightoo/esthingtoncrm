const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'pages');

const replaceInFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // We want to replace `flex justify-between items-center` with `flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0`
    // We will only replace instances that are likely headers: containing mb-, p-4, p-5, p-6, p-8, border-b, or <header
    
    let modified = false;
    
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('flex justify-between items-center')) {
            // Check if it's a small card that shouldn't wrap, like `text-xs` or just a minor list item.
            // Generally, large headers have padding or margins.
            if (line.includes('mb-') || line.includes('p-4') || line.includes('p-5') || line.includes('p-6') || line.includes('p-8') || line.includes('border-b') || line.includes('<header')) {
                lines[i] = line.replace('flex justify-between items-center', 'flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0');
                modified = true;
            }
        }
    }
    
    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log(`Updated ${path.basename(filePath)}`);
    }
};

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        filelist = fs.statSync(path.join(dir, file)).isDirectory()
            ? walkSync(path.join(dir, file), filelist)
            : filelist.concat(path.join(dir, file));
    });
    return filelist;
};

const files = walkSync(pagesDir).filter(f => f.endsWith('.tsx'));
files.forEach(replaceInFile);

// Also check components
const componentsDir = path.join(__dirname, 'components');
if (fs.existsSync(componentsDir)) {
    const compFiles = walkSync(componentsDir).filter(f => f.endsWith('.tsx'));
    compFiles.forEach(replaceInFile);
}

console.log("Done.");
