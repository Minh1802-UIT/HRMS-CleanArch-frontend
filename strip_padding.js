const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, fileList);
        } else if (filePath.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const targetDir = path.join(__dirname, 'src', 'app', 'features');
const htmlFiles = getFiles(targetDir);

// Matches the very first HTML opening tag that has a class attribute
const firstTagRegex = /^(<[a-z0-9\-]+\s+[^>]*?class=["'])([^"']*)(["'][^>]*>)/i;

const paddingClassesToStrip = [
    'p-3', 'p-4', 'p-5', 'p-6', 'p-8',
    'px-4', 'py-4', 'px-5', 'py-5', 'px-6', 'py-6', 'px-8', 'py-8'
];

let modifiedCount = 0;

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');

    // Find the exact first tag by skipping leading whitespace
    const match = content.match(/<[a-z0-9\-]+[^>]*>/i);
    if (!match) continue;

    const firstTagContent = match[0];
    const firstTagIndex = match.index;

    // Check if the first tag has a class attribute
    const classMatch = firstTagContent.match(/(class=["'])([^"']*)(["'])/i);

    if (classMatch) {
        let rawClasses = classMatch[2];
        let classList = rawClasses.split(/\s+/).filter(Boolean);

        // Filter out the unwanted padding classes
        let newClassList = classList.filter(c => !paddingClassesToStrip.includes(c));

        // Check if anything changed
        if (classList.length !== newClassList.length) {
            // Reconstruct the first tag with updated classes
            const newClassString = newClassList.join(' ');
            const newFirstTagContent = firstTagContent.replace(
                /(class=["'])([^"']*)(["'])/i,
                `$1${newClassString}$3`
            );

            // Replace only the first tag in the whole file content
            content = content.substring(0, firstTagIndex) +
                newFirstTagContent +
                content.substring(firstTagIndex + firstTagContent.length);

            fs.writeFileSync(file, content, 'utf8');
            console.log(`Updated padding in: ${file}`);
            modifiedCount++;
        }
    }
}

console.log(`\nDone. Stripped redundant root padding from ${modifiedCount} files.`);
