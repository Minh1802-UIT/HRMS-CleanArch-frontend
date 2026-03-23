const https = require('https');
const fs = require('fs');
const path = require('path');

const logos = [
    { name: 'vingroup.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Vingroup_logo.svg/512px-Vingroup_logo.svg.png' },
    { name: 'fpt.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/FPT_logo_2010.svg/512px-FPT_logo_2010.svg.png' },
    { name: 'viettel.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Viettel_logo_2021.svg/512px-Viettel_logo_2021.svg.png' },
    { name: 'masan.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Logo-Masan-Group-Symbol.png/512px-Logo-Masan-Group-Symbol.png' },
    { name: 'techcombank.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Techcombank_logo.svg/512px-Techcombank_logo.svg.png' },
    { name: 'vnpt.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/VNPT_Logo.svg/512px-VNPT_Logo.svg.png' },
    { name: 'vinfast.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/VinFast_Logo.svg/512px-VinFast_Logo.svg.png' },
    { name: 'sacombank.png', url: 'https://upload.wikimedia.org/wikipedia/vi/thumb/9/91/Sacombank_logo.svg/512px-Sacombank_logo.svg.png' }
];

const dir = path.join(__dirname, 'src', 'assets', 'images', 'partners');

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

function downloadLogo(logo, delay) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const filePath = path.join(dir, logo.name);
            const file = fs.createWriteStream(filePath);

            const req = https.get(logo.url, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }, function (response) {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', function () {
                        file.close();
                        console.log(`Downloaded: ${logo.name}`);
                        resolve(true);
                    });
                } else {
                    console.error(`Failed to download ${logo.name}: ${response.statusCode}`);
                    file.close();
                    fs.unlink(filePath, () => { });
                    resolve(false);
                }
            });

            req.on('error', function (err) {
                fs.unlink(filePath, () => { });
                console.error(`Error downloading ${logo.name}: ${err.message}`);
                resolve(false);
            });

            req.setTimeout(15000, () => {
                req.destroy();
                console.error(`Timeout downloading ${logo.name}`);
                resolve(false);
            });
        }, delay);
    });
}

async function main() {
    console.log('Starting logo downloads with delays...');
    let successCount = 0;
    
    for (let i = 0; i < logos.length; i++) {
        const result = await downloadLogo(logos[i], i * 2000); // 2 second delay between each
        if (result) successCount++;
    }
    
    console.log(`\nDownload complete: ${successCount}/${logos.length} logos downloaded`);
    
    // Check what files were created
    const files = fs.readdirSync(dir);
    console.log('Files in partners folder:', files);
}

main();
