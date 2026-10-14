const fs = require('fs');
const path = require('path');

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || '';
const FILE_KEY = 'ctH76PAiMBTQLJE0BxNjOI';

async function main() {
  console.log(`🚀 Đang kết nối tới Figma API để tải file [${FILE_KEY}]...`);

  const outputDir = path.join(__dirname, '..', 'figma_assets');
  const screensDir = path.join(outputDir, 'screens');
  if (!fs.existsSync(screensDir)) {
    fs.mkdirSync(screensDir, { recursive: true });
  }

  // 1. Tải thông tin File Document
  const fileRes = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}`, {
    headers: {
      'X-Figma-Token': FIGMA_TOKEN,
    },
  });

  if (!fileRes.ok) {
    const errText = await fileRes.text();
    console.error(`❌ Lỗi từ Figma API (${fileRes.status}):`, errText);
    process.exit(1);
  }

  const fileData = await fileRes.json();
  console.log(`✅ Tải thành công file: "${fileData.name}" (phiên bản: ${fileData.version})`);

  // Lưu metadata rút gọn
  const pages = fileData.document.children || [];
  console.log(`📄 Số lượng Pages trong file: ${pages.length}`);

  const frames = [];

  for (const page of pages) {
    console.log(`\n📌 Page: "${page.name}" (ID: ${page.id})`);
    if (page.children) {
      for (const child of page.children) {
        if (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'SECTION') {
          frames.push({
            id: child.id,
            name: child.name,
            type: child.type,
            page: page.name,
            width: child.absoluteBoundingBox?.width,
            height: child.absoluteBoundingBox?.height,
          });
          console.log(`  - [${child.type}] "${child.name}" (ID: ${child.id}) [${Math.round(child.absoluteBoundingBox?.width || 0)}x${Math.round(child.absoluteBoundingBox?.height || 0)}]`);
        }
      }
    }
  }

  fs.writeFileSync(
    path.join(outputDir, 'frames_summary.json'),
    JSON.stringify({ name: fileData.name, totalFrames: frames.length, frames }, null, 2)
  );

  console.log(`\n📸 Tìm thấy ${frames.length} frames. Bắt đầu xuất ảnh PNG...`);

  // 2. Tải ảnh của tối đa 30 frames đầu tiên (đặc biệt là Mobile Screens)
  const mobileScreens = frames.filter(f => f.type === 'FRAME' && (f.width < 500 || f.name.toLowerCase().includes('screen') || f.name.toLowerCase().includes('page') || f.name.toLowerCase().includes('home') || f.name.toLowerCase().includes('book')));
  const targetFrames = mobileScreens.length > 0 ? mobileScreens.slice(0, 25) : frames.slice(0, 25);
  const nodeIds = targetFrames.map(f => f.id).join(',');

  console.log(`🖼️ Đang render ảnh PNG cho ${targetFrames.length} màn hình qua Figma Image API...`);

  const imgRes = await fetch(
    `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(nodeIds)}&format=png&scale=2`,
    {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN,
      },
    }
  );

  if (!imgRes.ok) {
    console.error(`❌ Lỗi render ảnh: ${await imgRes.text()}`);
    return;
  }

  const imgData = await imgRes.json();
  const images = imgData.images || {};

  for (const frame of targetFrames) {
    const imgUrl = images[frame.id];
    if (imgUrl) {
      const sanitizedName = frame.name.replace(/[/\\?%*:|"<>]/g, '_').trim();
      const filePath = path.join(screensDir, `${sanitizedName}_${frame.id.replace(':', '_')}.png`);
      try {
        const downloadRes = await fetch(imgUrl);
        const buffer = await downloadRes.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));
        console.log(`  💾 Đã lưu: ${path.basename(filePath)}`);
      } catch (e) {
        console.error(`  ⚠️ Lỗi tải ảnh ${frame.name}:`, e.message);
      }
    }
  }

  console.log(`\n🎉 HOÀN TẤT! Toàn bộ thông tin và ảnh màn hình đã được lưu tại: ${screensDir}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

