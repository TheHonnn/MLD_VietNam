const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wstvwushpwcdsmhpunvh.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error('LỖI: Vui lòng thiết lập biến môi trường SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function uploadFile(filePath, destName) {
  const fileBuffer = fs.readFileSync(filePath);
  const bucket = 'services';
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${destName}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'image/webp',
    },
    body: fileBuffer,
  });

  if (res.ok) {
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${destName}`;
    console.log('Upload OK:', publicUrl);
    return publicUrl;
  } else {
    const txt = await res.text();
    console.error('Upload failed:', res.status, txt);
    return null;
  }
}

async function main() {
  const img1 = await uploadFile('extracted_media/image1.webp', 'thoat_vi_dia_dem_1.webp');
  const img2 = await uploadFile('extracted_media/image2.webp', 'thoat_vi_dia_dem_2.webp');
  const img3 = await uploadFile('extracted_media/image3.webp', 'thoat_vi_dia_dem_3.webp');
  console.log('Results:', { img1, img2, img3 });
}

main().catch(console.error);

