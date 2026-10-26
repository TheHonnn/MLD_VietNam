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

const mockChaptersAndLessons = [
  {
    course_id: '30303030-0001-0001-0001-000000000001', // Dẫn lưu cơ bản Level 0
    chapters: [
      {
        chapter_order: 1,
        title: 'Chương 1: Tổng quan và Giải phẫu Hệ Bạch Huyết',
        description: 'Kiến thức cốt lõi về cấu trúc mao mạch, hạch bạch huyết và sinh lý học Vodder',
        lessons: [
          {
            lesson_order: 1,
            title: 'Bài 01: Đại cương hệ bạch huyết & Phương pháp Vodder',
            lesson_type: 'VIDEO',
            duration_minutes: 18,
            video_url: 'https://www.youtube.com/watch?v=QA-xR_E24G8',
            content_text: 'Phương pháp dẫn lưu bạch huyết Vodder (Dr. Emil Vodder) là liệu pháp kích thích tuần hoàn bạch huyết nhẹ nhàng, giúp đào thải độc tố và giảm ứ đọng dịch mô.',
            is_free_preview: true
          },
          {
            lesson_order: 2,
            title: 'Bài 02: Các vùng hạch bạch huyết trọng điểm trên cơ thể',
            lesson_type: 'VIDEO',
            duration_minutes: 24,
            video_url: 'https://www.youtube.com/watch?v=0h9sC3wK-yA',
            content_text: 'Xác định chính xác vị trí hạch cổ, nách, bẹn và hạch bụng để giải phóng đường thoát dịch.',
            is_free_preview: false
          }
        ]
      },
      {
        chapter_order: 2,
        title: 'Chương 2: 4 Thao tác Kỹ thuật Thủ công Căn bản',
        description: 'Vòng xoay tĩnh, vuốt xoắn ốc, bơm đẩy và dịch chuyển mô chuẩn y khoa',
        lessons: [
          {
            lesson_order: 3,
            title: 'Bài 03: Thao tác Vòng xoay tĩnh (Stationary Circles)',
            lesson_type: 'VIDEO',
            duration_minutes: 22,
            video_url: 'https://www.youtube.com/watch?v=2r1pZ3Wf2lA',
            content_text: 'Hướng dẫn áp lực tay 30-40 mmHg, chuyển động hình elip theo nhịp sinh học cơ thể.',
            is_free_preview: false
          },
          {
            lesson_order: 4,
            title: 'Bài 04: Thao tác Bơm đẩy (Pump Technique) vùng cổ và mặt',
            lesson_type: 'VIDEO',
            duration_minutes: 20,
            video_url: 'https://www.youtube.com/watch?v=Zz1X1U0v6g0',
            content_text: 'Thực hành thao tác bơm đẩy tiếp xúc toàn bộ lòng bàn tay dọc theo động mạch cảnh và cơ ức đòn chũm.',
            is_free_preview: false
          }
        ]
      }
    ]
  },
  {
    course_id: '30303030-0001-0001-0001-000000000002', // Dẫn lưu cơ bản cho người làm nghề - Level 1
    chapters: [
      {
        chapter_order: 1,
        title: 'Chương 1: Phác đồ Trị liệu Bạch huyết Chuyên sâu',
        description: 'Quy trình chuẩn hóa dịch vụ tại Spa & Trung tâm Y khoa',
        lessons: [
          {
            lesson_order: 1,
            title: 'Bài 01: Quy trình đón tiếp và đánh giá phù nề ban đầu',
            lesson_type: 'VIDEO',
            duration_minutes: 25,
            video_url: 'https://www.youtube.com/watch?v=XvcJpA_k24k',
            content_text: 'Cách sử dụng thước đo chu vi, kiểm tra dấu hiệu ấn lõm (Pitting edema test) và ghi nhận nhật ký.',
            is_free_preview: true
          },
          {
            lesson_order: 2,
            title: 'Bài 02: Kỹ thuật Dẫn lưu Chi trên và Vùng Ngực',
            lesson_type: 'VIDEO',
            duration_minutes: 30,
            video_url: 'https://www.youtube.com/watch?v=Yp69xN1D9Xk',
            content_text: 'Kỹ thuật định hướng dòng bạch huyết từ cánh tay về hạch nách và ống ngực chính.',
            is_free_preview: false
          }
        ]
      }
    ]
  },
  {
    course_id: '30303030-0001-0001-0001-000000000003', // Workshop Phù tay sau phẫu thuật ung thư vú
    chapters: [
      {
        chapter_order: 1,
        title: 'Chương 1: Hướng dẫn Tự chăm sóc & Phục hồi tại nhà',
        description: 'Bộ video hướng dẫn tự dẫn lưu và vận động cho bệnh nhân',
        lessons: [
          {
            lesson_order: 1,
            title: 'Bài 01: Bài tập vận động nhẹ nhàng phòng ngừa ứ trệ chi trên',
            lesson_type: 'VIDEO',
            duration_minutes: 15,
            video_url: 'https://www.youtube.com/watch?v=QA-xR_E24G8',
            content_text: 'Các động tác hít thở sâu cơ hoành kết hợp nâng tay nhẹ nhàng kích thích ống bạch huyết ngực.',
            is_free_preview: true
          }
        ]
      }
    ]
  }
];

async function seed() {
  console.log('Seeding YouTube video chapters and lessons...');
  for (const group of mockChaptersAndLessons) {
    for (const chap of group.chapters) {
      // 1. Create chapter
      const chapRes = await req('/rest/v1/course_chapters', 'POST', {
        course_id: group.course_id,
        chapter_order: chap.chapter_order,
        title: chap.title,
        description: chap.description
      });
      if (chapRes.status >= 200 && chapRes.status < 300 && chapRes.data && chapRes.data[0]) {
        const chapterId = chapRes.data[0].id;
        console.log(`Created Chapter: ${chap.title} (ID: ${chapterId})`);

        // 2. Create lessons
        for (const lesson of chap.lessons) {
          const lessonRes = await req('/rest/v1/course_lessons', 'POST', {
            chapter_id: chapterId,
            lesson_order: lesson.lesson_order,
            title: lesson.title,
            lesson_type: lesson.lesson_type,
            duration_minutes: lesson.duration_minutes,
            video_url: lesson.video_url,
            content_text: lesson.content_text,
            is_free_preview: lesson.is_free_preview
          });
          if (lessonRes.status >= 200 && lessonRes.status < 300) {
            console.log(`  -> Created Lesson: ${lesson.title} [${lesson.video_url}]`);
          } else {
            console.error('  Failed to create lesson:', lessonRes);
          }
        }
      } else {
        console.error('Failed to create chapter:', chapRes);
      }
    }
  }
  console.log('Finished seeding video lessons!');
}

seed();

