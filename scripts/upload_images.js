const fs = require('fs');

const SUPABASE_URL = 'https://wstvwushpwcdsmhpunvh.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE';

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

