const fs = require('fs');
const path = require('path');

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || '';
const FILE_KEY = 'ctH76PAiMBTQLJE0BxNjOI';

async function inspectSections() {
  const sectionIds = [
    '8107:5498',  // GROUP A: ONBOARDING & AUTH
    '8109:14560', // GROUP B: HOME & SERVICE DISCOVERY
    '8111:26449', // GROUP C: BOOKING & PAYMENT
    '8112:7818',  // GROUP D: TREATMENT & CUSTOMER CARE
    '8120:13676', // GROUP F: MEMBERSHIP & PROFILE
    '8123:49290', // GROUP W: WEB ADMIN
  ];

  const url = `https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${sectionIds.join(',')}&depth=2`;
  const res = await fetch(url, { headers: { 'X-Figma-Token': FIGMA_TOKEN } });
  const data = await res.json();

  const report = {};

  for (const [id, nodeData] of Object.entries(data.nodes || {})) {
    const document = nodeData.document;
    const groupName = document.name;
    const screens = (document.children || []).map(child => ({
      id: child.id,
      name: child.name,
      type: child.type,
      width: Math.round(child.absoluteBoundingBox?.width || 0),
      height: Math.round(child.absoluteBoundingBox?.height || 0),
    }));
    report[groupName] = screens;
  }

  const outPath = path.join(__dirname, '..', 'figma_assets', 'all_screens_breakdown.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log('=== DANH SÁCH CHI TIẾT TỪNG MÀN HÌNH THEO NHÓM ===\n');
  for (const [group, screens] of Object.entries(report)) {
    console.log(`📂 ${group} (${screens.length} màn hình):`);
    for (const s of screens) {
      console.log(`   ├─ [${s.type}] ${s.name} (${s.width}x${s.height}) [ID: ${s.id}]`);
    }
  }
}

inspectSections().catch(console.error);

