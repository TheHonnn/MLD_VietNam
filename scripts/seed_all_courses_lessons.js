const https = require('https');
const supabaseUrl = 'https://wstvwushpwcdsmhpunvh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE';

async function req(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, supabaseUrl);
    const options = {
      method,
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    const r = https.request(url, options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, body }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

const sampleVideos = [
  'https://www.youtube.com/watch?v=QA-xR_E24G8',
  'https://www.youtube.com/watch?v=0h9sC3wK-yA',
  'https://www.youtube.com/watch?v=2r1pZ3Wf2lA',
  'https://www.youtube.com/watch?v=Zz1X1U0v6g0',
  'https://www.youtube.com/watch?v=XvcJpA_k24k',
  'https://www.youtube.com/watch?v=Yp69xN1D9Xk'
];

async function run() {
  const coursesRes = await req('/rest/v1/courses?select=id,title&order=created_at.asc');
  if (!coursesRes.data || !Array.isArray(coursesRes.data)) {
    console.error('Failed to get courses', coursesRes);
    return;
  }

  const courses = coursesRes.data;
  console.log(`Found ${courses.length} courses in Supabase.`);

  for (const c of courses) {
    // Check if chapters exist
    const chRes = await req(`/rest/v1/course_chapters?course_id=eq.${c.id}&select=id`);
    if (chRes.data && chRes.data.length > 0) {
      console.log(`Course ${c.title} already has ${chRes.data.length} chapters. Skipping.`);
      continue;
    }

    console.log(`Seeding curriculum for course: ${c.title} (${c.id})...`);

    // Chapter 1
    const ch1 = await req('/rest/v1/course_chapters', 'POST', {
      course_id: c.id,
      title: 'Chương 1: Lý thuyết Nền tảng & Giải phẫu Hệ Bạch Huyết',
      description: 'Tổng quan cơ chế mao mạch, dịch kẽ và nguyên lý lưu thông bạch huyết Vodder.',
      chapter_order: 1
    });

    if (ch1.data && ch1.data[0]) {
      const ch1Id = ch1.data[0].id;
      await req('/rest/v1/course_lessons', 'POST', [
        {
          chapter_id: ch1Id,
          lesson_order: 1,
          title: 'Bài 01: Đại cương hệ bạch huyết & Phương pháp Vodder',
          lesson_type: 'VIDEO',
          duration_minutes: 15,
          video_url: sampleVideos[0],
          content_text: 'Tổng quan lịch sử hình thành phương pháp Vodder từ năm 1930 và các nghiên cứu khoa học y khoa chứng minh hiệu quả lưu thông dịch mô.',
          is_free_preview: true
        },
        {
          chapter_id: ch1Id,
          lesson_order: 2,
          title: 'Bài 02: Giải phẫu hệ bạch huyết & vị trí các cụm hạch trọng điểm',
          lesson_type: 'VIDEO',
          duration_minutes: 22,
          video_url: sampleVideos[1],
          content_text: 'Xác định đường dẫn lưu nông dưới da và các chặng hạch chính: hạch cổ, nách, bẹn và hạch mạc treo ruột.',
          is_free_preview: false
        }
      ]);
    }

    // Chapter 2
    const ch2 = await req('/rest/v1/course_chapters', 'POST', {
      course_id: c.id,
      title: 'Chương 2: Kỹ thuật Thao tác Thủ công & Trị liệu Chuyên sâu',
      description: 'Thực hành các kỹ thuật xoay tròn tĩnh, bơm đẩy và phác đồ can thiệp phù nề.',
      chapter_order: 2
    });

    if (ch2.data && ch2.data[0]) {
      const ch2Id = ch2.data[0].id;
      await req('/rest/v1/course_lessons', 'POST', [
        {
          chapter_id: ch2Id,
          lesson_order: 3,
          title: 'Bài 03: Kỹ thuật Vòng xoay tĩnh (Stationary Circles)',
          lesson_type: 'VIDEO',
          duration_minutes: 20,
          video_url: sampleVideos[2],
          content_text: 'Thực hành thao tác xoay tròn elip với áp lực chuẩn 30-40 mmHg, tạo lực căng giãn mao mạch bạch huyết ban đầu.',
          is_free_preview: false
        },
        {
          chapter_id: ch2Id,
          lesson_order: 4,
          title: 'Bài 04: Kỹ thuật Bơm đẩy (Pump) và Miết cuộn (Rotary)',
          lesson_type: 'VIDEO',
          duration_minutes: 25,
          video_url: sampleVideos[3],
          content_text: 'Áp dụng cho các chi trên và chi dưới, hỗ trợ tống xuất dịch ứ đọng về các cụm hạch trung tâm.',
          is_free_preview: false
        },
        {
          chapter_id: ch2Id,
          lesson_order: 5,
          title: 'Bài 05: Phác đồ can thiệp lâm sàng & Chăm sóc tại nhà',
          lesson_type: 'VIDEO',
          duration_minutes: 30,
          video_url: sampleVideos[4],
          content_text: 'Kết hợp dẫn lưu MLD với chế độ dinh dưỡng, vận động nhẹ nhàng và băng ép hỗ trợ theo tiêu chuẩn quốc tế.',
          is_free_preview: false
        }
      ]);
    }

    console.log(`Seeded chapters and lessons for ${c.title} successfully!`);
  }

  console.log('Finished seeding all courses.');
}

run().catch(console.error);

