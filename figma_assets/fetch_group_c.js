const https = require('https');
const fs = require('fs');
const path = require('path');

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || '';
const FILE_KEY = 'ctH76PAiMBTQLJE0BxNjOI';

function fetchNode(nodeId) {
  return new Promise((resolve, reject) => {
    const encodedId = encodeURIComponent(nodeId);
    const options = {
      hostname: 'api.figma.com',
      path: `/v1/files/${FILE_KEY}/nodes?ids=${encodedId}&geometry=paths`,
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
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching Group C nodes from Figma...');
  
  // 1. Group C Main: 8111:26450
  console.log('Fetching 8111:26450 (Đặt lịch và thanh toán)...');
  const groupCMain = await fetchNode('8111:26450');
  fs.writeFileSync(
    path.join(__dirname, 'group_c_main_raw.json'),
    JSON.stringify(groupCMain, null, 2)
  );
  console.log('Saved group_c_main_raw.json');

  // 2. Group C Expanded: 8111:27684
  console.log('Fetching 8111:27684 (Nhóm C — Trạng thái & thành phần mở rộng)...');
  const groupCExpanded = await fetchNode('8111:27684');
  fs.writeFileSync(
    path.join(__dirname, 'group_c_expanded_raw.json'),
    JSON.stringify(groupCExpanded, null, 2)
  );
  console.log('Saved group_c_expanded_raw.json');
}

run().catch(console.error);
