const fs = require('fs');

const SUPABASE_URL = 'https://wstvwushpwcdsmhpunvh.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE';

const fullText = fs.readFileSync('extracted_doc.txt', 'utf8');
const lines = fullText.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);

const title = lines[0]; // Thoát vị đĩa đệm: dẫn lưu bạch huyết có thể hỗ trợ ở đâu?
const bodyLines = lines.slice(1); // Toàn bộ nội dung bài viết, bỏ dòng 1 là tiêu đề

const summary = bodyLines[0];

const contentWithImages = bodyLines.map(p => {
  if (p.startsWith('Ảnh 1.')) {
    return `![Ảnh 1. Cảm giác căng và khó chịu vùng lưng](https://wstvwushpwcdsmhpunvh.supabase.co/storage/v1/object/public/services/thoat_vi_dia_dem_1.webp)\n*${p}*`;
  }
  if (p.startsWith('Ảnh 2.')) {
    return `![Ảnh 2. Vận động và phục hồi chức năng](https://wstvwushpwcdsmhpunvh.supabase.co/storage/v1/object/public/services/thoat_vi_dia_dem_2.webp)\n*${p}*`;
  }
  if (p.startsWith('Ảnh 3.')) {
    return `![Ảnh 3. Đĩa đệm bình thường và đĩa đệm thoát vị](https://wstvwushpwcdsmhpunvh.supabase.co/storage/v1/object/public/services/thoat_vi_dia_dem_3.webp)\n*${p}*`;
  }
  return p;
}).join('\n\n');

const coverImage = 'https://wstvwushpwcdsmhpunvh.supabase.co/storage/v1/object/public/services/thoat_vi_dia_dem_3.webp';
const pdfUrl = 'https://wstvwushpwcdsmhpunvh.supabase.co/storage/v1/object/public/documents/thoat_vi_dia_dem_mld.pdf';

console.log('Title:', title);
console.log('Body lines:', bodyLines.length);
console.log('Content total chars:', contentWithImages.length);

async function upsertRecord(table, id, payload) {
  // Check if exists
  const chk = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });
  const data = await chk.json();

  if (data && data.length > 0) {
    console.log(`Updating ${table} (${id})...`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    console.log(`Update ${table} status:`, res.status);
  } else {
    console.log(`Inserting ${table} (${id})...`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...payload })
    });
    console.log(`Insert ${table} status:`, res.status);
    if (!res.ok) {
      console.log('Error details:', await res.text());
    }
  }
}

async function run() {
  // 1. home_care_guidelines
  await upsertRecord('home_care_guidelines', '7c9b0001-e001-4000-8000-000000000001', {
    title: title,
    slug: 'thoat-vi-dia-dem-dan-luu-bach-huyet-co-the-ho-tro-o-dau',
    category: 'Xương khớp & Phục hồi',
    read_time_minutes: 6,
    summary: summary,
    content: contentWithImages,
    image_url: coverImage,
    author_name: 'Hội đồng Y khoa MLD',
    view_count: 240,
    is_featured: true,
    is_published: true,
    updated_at: new Date().toISOString()
  });

  // 2. miniapp_shared_content (COMMUNITY)
  await upsertRecord('miniapp_shared_content', '7c9b0002-e002-4000-8000-000000000002', {
    kind: 'COMMUNITY',
    title: title,
    summary: summary,
    content_text: contentWithImages,
    image_url: coverImage,
    file_url: pdfUrl,
    file_size_bytes: 3107187,
    category: 'Xương khớp & Phục hồi',
    access_level: 'PUBLIC',
    status: 'PUBLISHED',
    author_name: 'Hội đồng Chuyên môn MLD',
    is_featured: true,
    sort_order: 1,
    download_count: 85,
    likes_count: 142,
    comments_count: 28,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // 3. miniapp_shared_content (DOCUMENT)
  await upsertRecord('miniapp_shared_content', '7c9b0003-e003-4000-8000-000000000003', {
    kind: 'DOCUMENT',
    title: title,
    summary: summary,
    content_text: contentWithImages,
    image_url: coverImage,
    file_url: pdfUrl,
    file_size_bytes: 3107187,
    category: 'LAM_SANG',
    access_level: 'PUBLIC',
    status: 'PUBLISHED',
    author_name: 'Hội đồng Chuyên môn MLD',
    is_featured: true,
    sort_order: 1,
    download_count: 96,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  console.log('All 3 records seeded successfully!');
}

run().catch(console.error);

