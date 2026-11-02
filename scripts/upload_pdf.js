const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wstvwushpwcdsmhpunvh.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error('LỖI: Vui lòng thiết lập biến môi trường SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function uploadPdf() {
  const fileBuffer = fs.readFileSync('thoat_vi_dia_dem.pdf');
  const bucket = 'documents';
  const fileName = 'thoat_vi_dia_dem_mld.pdf';
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;

  let res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/pdf',
    },
    body: fileBuffer,
  });

  if (res.ok) {
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
    console.log('PDF Uploaded OK:', publicUrl);
    return publicUrl;
  }

  // If already exists or error, try with upsert / unique name
  const altName = `thoat_vi_dia_dem_${Date.now()}.pdf`;
  const altUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${altName}`;
  res = await fetch(altUrl, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/pdf',
    },
    body: fileBuffer,
  });

  if (res.ok) {
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${altName}`;
    console.log('PDF Uploaded OK (alt):', publicUrl);
    return publicUrl;
  }

  const err = await res.text();
  console.error('Failed to upload PDF:', res.status, err);
}

uploadPdf().catch(console.error);

