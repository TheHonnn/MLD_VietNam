const fs = require('fs');

const SUPABASE_URL = 'https://wstvwushpwcdsmhpunvh.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE';

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

