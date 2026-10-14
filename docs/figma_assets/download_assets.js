const https = require('https');
const fs = require('fs');
const path = require('path');

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || '';
const FILE_KEY = 'ctH76PAiMBTQLJE0BxNjOI';

const TARGET_DIR = path.join(__dirname, '..', 'mobile', 'assets', 'images');
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Key nodes to export from Figma
const NODES = {
  'logo.png': '8107:6931',
  'logo_login.png': '8107:6899',
  'onboarding_hero.png': '8107:5535',
  'splash_leaf_1.png': '8107:5507',
  'splash_leaf_2.png': '8107:5508',
  'banner_promo_1.png': '8109:18624',
  'banner_promo_2.png': '8109:18649',
  'clinic_1.png': '8109:18429',
  'clinic_2.png': '8109:18439',
  'doctor_1.png': '8109:18691',
  'doctor_2.png': '8109:18701',
  'doctor_3.png': '8109:18711',
};

async function getFigmaImageUrls(nodeIds) {
  return new Promise((resolve, reject) => {
    const ids = Object.values(nodeIds).join(',');
    const options = {
      hostname: 'api.figma.com',
      path: `/v1/images/${FILE_KEY}?ids=${ids}&format=png&scale=3`,
      headers: {
        'X-Figma-Token': FIGMA_TOKEN,
      },
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.images || {});
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching image URLs from Figma API...');
  const urls = await getFigmaImageUrls(NODES);
  
  for (const [filename, nodeId] of Object.entries(NODES)) {
    const url = urls[nodeId];
    if (url) {
      const dest = path.join(TARGET_DIR, filename);
      console.log(`Downloading ${filename} from Figma (${nodeId})...`);
      try {
        await downloadFile(url, dest);
        console.log(`Saved ${filename} (${fs.statSync(dest).size} bytes)`);
      } catch (err) {
        console.error(`Error downloading ${filename}:`, err.message);
      }
    } else {
      console.warn(`No URL for ${filename} (${nodeId})`);
    }
  }

  // Also copy local lOGO (2).png as fallback/high-res if available
  const localLogo = path.join(__dirname, 'screens', 'lOGO (2).png');
  if (fs.existsSync(localLogo)) {
    fs.copyFileSync(localLogo, path.join(TARGET_DIR, 'logo_original.png'));
    console.log('Copied local logo_original.png');
  }

  console.log('All Figma assets downloaded successfully!');
}

main().catch(console.error);

