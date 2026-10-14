const fs = require('fs');
const path = require('path');

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || '';
const FILE_KEY = 'ctH76PAiMBTQLJE0BxNjOI';

async function downloadAllIndividualScreens() {
  const jsonPath = path.join(__dirname, '..', 'figma_assets', 'all_screens_breakdown.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const screensDir = path.join(__dirname, '..', 'figma_assets', 'individual_screens');
  if (!fs.existsSync(screensDir)) {
    fs.mkdirSync(screensDir, { recursive: true });
  }

  const allScreens = [];
  for (const [group, list] of Object.entries(data)) {
    for (const item of list) {
      allScreens.push({ group, ...item });
    }
  }

  console.log(`🚀 Đang chuẩn bị tải ${allScreens.length} màn hình chi tiết...`);

  // Chia nhỏ thành các batch 15 nodes để tránh timeout
  for (let i = 0; i < allScreens.length; i += 15) {
    const chunk = allScreens.slice(i, i + 15);
    const ids = chunk.map(c => c.id).join(',');

    const url = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=2`;
    const res = await fetch(url, { headers: { 'X-Figma-Token': FIGMA_TOKEN } });
    if (!res.ok) {
      console.error(`Lỗi batch ${i}:`, await res.text());
      continue;
    }

    const imgData = await res.json();
    const images = imgData.images || {};

    for (const item of chunk) {
      const imgUrl = images[item.id];
      if (imgUrl) {
        const safeName = `${item.name.replace(/[/\\?%*:|"<>]/g, '_')}.png`;
        const filePath = path.join(screensDir, safeName);
        try {
          const downloadRes = await fetch(imgUrl);
          const buf = await downloadRes.arrayBuffer();
          fs.writeFileSync(filePath, Buffer.from(buf));
          console.log(`  💾 Đã tải: ${safeName}`);
        } catch (e) {
          console.error(`  ⚠️ Lỗi tải ${safeName}:`, e.message);
        }
      }
    }
  }

  console.log('🎉 Đã tải toàn bộ các màn hình chi tiết vào figma_assets/individual_screens!');
}

downloadAllIndividualScreens().catch(console.error);

