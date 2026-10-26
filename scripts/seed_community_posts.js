const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE';
const HOST = 'wstvwushpwcdsmhpunvh.supabase.co';

const articles = [
  {
    kind: 'COMMUNITY',
    title: 'Dẫn lưu bạch huyết có hỗ trợ giảm đau mỏi xương khớp không?',
    summary: 'Phân tích cơ chế giảm áp lực nội khớp, tăng nuôi dưỡng mô sụn và tiêu thoát dịch viêm ứ đọng quanh bao hoạt dịch bằng kỹ thuật Vodder.',
    content_text: `Đau mỏi xương khớp là tình trạng thường gặp, đặc biệt ở người trung niên và lớn tuổi. Nhiều người không chỉ đau khi vận động mà còn cảm thấy nhức mỏi, căng cứng do dịch ứ đọng quanh bao khớp và các mô mềm lân cận.

1. Nguyên nhân sâu xa từ hệ bạch huyết:
Ít ai biết rằng, hiện tượng viêm sưng khớp thường đi kèm với sự ứ trệ dịch bạch huyết cục bộ. Khi các mạch bạch huyết bị tắc nghẽn, các chất trung gian gây viêm và protein thừa không được thu dọn kịp thời, tạo áp lực lên các đầu mút dây thần kinh cảm giác, gây đau nhức kéo dài.

2. Cơ chế hỗ trợ của Dẫn lưu bạch huyết Vodder (MLD):
- Giảm áp lực nội khớp: Kỹ thuật miết nhẹ nhàng theo cung hạch bạch huyết giúp tiêu thoát dịch viêm ứ đọng quanh bao hoạt dịch khớp.
- Tăng cường tuần hoàn nuôi dưỡng mô sụn: Khi dịch ứ được giải phóng, tuần hoàn máu tươi giàu oxy và dưỡng chất dễ dàng tiếp cận nuôi dưỡng mô sụn khớp.
- Thư giãn cơ co thắt: Giúp các dải cơ quanh khớp được thả lỏng tự nhiên mà không gây đau đớn hay tổn thương thêm cho sụn khớp.

3. Khuyến nghị từ Chuyên gia MLD:
Người bệnh nên kết hợp liệu trình MLD định kỳ 1–2 lần/tuần cùng chế độ vận động nhẹ nhàng để duy trì sự dẻo dai của hệ cơ xương khớp.`,
    image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&fit=crop',
    file_url: 'https://mldvietnam.edu.vn/docs/dan-luu-bach-huyet-giam-dau-khop.pdf',
    category: 'Xương khớp & Phục hồi',
    author_name: 'Trung tâm Ứng dụng Khoa học Bạch huyết Việt Nam',
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    sort_order: 1
  },
  {
    kind: 'COMMUNITY',
    title: 'Tại sao dẫn lưu bạch huyết thủ công lại không gây đau?',
    summary: 'Khám phá nguyên lý "Áp lực lông vũ" (30-40 mmHg) và giải phẫu hệ mao mạch bạch huyết nông ngay dưới bề mặt biểu bì da.',
    content_text: `"Nhẹ như vậy thì có tác dụng không?" là câu hỏi phổ biến nhất của khách hàng khi lần đầu tiên trải nghiệm liệu pháp Dẫn lưu bạch huyết thủ công (Manual Lymphatic Drainage - MLD) theo phương pháp Vodder.

1. Giải phẫu hệ bạch huyết nông:
Hơn 70% mạng lưới mao mạch bạch huyết của cơ thể nằm ngay dưới lớp biểu bì da (độ sâu chỉ từ 0.3mm đến 1.5mm). Đây là các mạch cực kỳ mỏng manh với các van vi mô một chiều.

2. Nguyên tắc "Áp lực lông vũ" (Feather-light pressure):
- Áp lực tối ưu của MLD chỉ dao động từ 30 đến 40 mmHg — nhẹ như động tác vuốt ve lông vũ trên da.
- Nếu tác động lực quá mạnh (như massage mô sâu hay bấm huyệt), các mao mạch bạch huyết sẽ lập tức co thắt và xẹp lại, làm dòng chảy dịch bị chặn đứng hoàn toàn.

3. Cảm giác êm dịu, phục hồi sâu:
MLD tác động trực tiếp lên hệ thần kinh phó giao cảm (Parasympathetic nervous system), giúp cơ thể giảm tiết cortisol, giải phóng căng thẳng và đưa khách hàng vào trạng thái thư giãn sâu, hoàn toàn không gây đau rát hay bầm tím.`,
    image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&fit=crop',
    file_url: 'https://mldvietnam.edu.vn/docs/nguyen-ly-ap-luc-long-vu-vodder.pdf',
    category: 'Kỹ thuật MLD Vodder',
    author_name: 'BS. CKI Lê Hoài An',
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    sort_order: 2
  },
  {
    kind: 'COMMUNITY',
    title: 'Dẫn lưu bạch huyết MLD – Giải pháp vàng tiêu dịch và giảm phù nề sau phẫu thuật',
    summary: 'Rút ngắn thời gian phục hồi sau hút mỡ, nâng ngực, tạo hình thành bụng và ngăn ngừa nguy cơ hình thành mô sẹo xơ cứng (fibrosis).',
    content_text: `Sau các ca phẫu thuật thẩm mỹ hoặc phẫu thuật tạo hình (hút mỡ bụng/đùi, nâng ngực, tạo hình thành bụng, căng da mặt, nâng mũi), cơ thể phản ứng bằng việc tiết ra một lượng lớn dịch viêm để bảo vệ mô, gây phù nề, bầm tím và cảm giác căng tức khó chịu.

1. Nguy cơ khi để dịch ứ đọng kéo dài:
Nếu dịch kẽ không được tiêu thoát kịp thời trong 2–4 tuần đầu sau phẫu thuật, nguy cơ cao hình thành các tổ chức xơ cứng (fibrosis), da gồ ghề lồi lõm hoặc tụ dịch dưới da cần can thiệp chọc hút.

2. Vai trò của Dẫn lưu MLD Vodder trong giai đoạn vàng:
- Đẩy nhanh tốc độ tiêu sưng gấp 3–4 lần so với để cơ thể tự phục hồi.
- Làm mềm các mô sẹo, ngăn ngừa hiện tượng xơ hóa mô mỡ sau hút mỡ.
- Giảm rõ rệt các vết bầm tím nhờ hỗ trợ dọn dẹp xác hồng cầu ứ đọng.

3. Lộ trình điều trị khuyến nghị:
Nên bắt đầu buổi MLD đầu tiên từ ngày thứ 3 đến ngày thứ 5 sau phẫu thuật (theo chỉ định của bác sĩ điều trị) với liệu trình từ 5 đến 10 buổi liên tục.`,
    image_url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&fit=crop',
    file_url: 'https://mldvietnam.edu.vn/docs/mld-giam-phu-ne-hau-phau.pdf',
    category: 'Giảm phù nề hậu phẫu',
    author_name: 'Hội đồng Khoa học MLD Việt Nam',
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    sort_order: 3
  },
  {
    kind: 'COMMUNITY',
    title: 'Nguyên tắc 4 KHÔNG trong chăm sóc hệ bạch huyết tại nhà theo chuẩn Vodder',
    summary: 'Hướng dẫn tự chăm sóc an toàn: Tránh xoa bóp thô bạo, không chườm nóng trực tiếp và hạn chế các trang phục chèn ép hạch.',
    content_text: `Để duy trì hiệu quả sau các ca trị liệu tại cơ sở, khách hàng cần nắm vững các nguyên tắc chăm sóc hệ bạch huyết tại nhà:

1. KHÔNG xoa bóp thô bạo: Tuyệt đối không dùng lực bóp nắn mạnh vào vùng đang phù nề hoặc mới phẫu thuật.
2. KHÔNG chườm nóng trực tiếp: Nhiệt độ cao làm giãn mao mạch máu, khiến huyết tương thoát mạch nhiều hơn và làm sưng phù nặng hơn.
3. KHÔNG mặc đồ quá chật chèn ép hạch: Tránh các loại trang phục có đai thắt lưng hoặc chun quá siết tại các vùng trạm hạch (bẹn, nách, cổ).
4. KHÔNG nằm bất động kéo dài: Cần vận động nhẹ nhàng (đi bộ chậm, hít thở cơ hoành) để kích hoạt bơm cơ đẩy dịch bạch huyết lưu thông.`,
    image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&fit=crop',
    file_url: 'https://mldvietnam.edu.vn/docs/nguyen-tac-cham-soc-he-bach-huyet-tai-nha.pdf',
    category: 'Chăm sóc tại nhà',
    author_name: 'KTV. Nguyễn Thu Hà (Master LV3)',
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    sort_order: 4
  },
  {
    kind: 'COMMUNITY',
    title: 'Sự khác biệt căn bản giữa Massage thông thường và Dẫn lưu bạch huyết y khoa MLD',
    summary: 'So sánh chi tiết về đối tượng giải phẫu tác động, hướng lực, áp lực vi mô và mục tiêu lâm sàng giữa hai phương pháp.',
    content_text: `Rất nhiều người thường đánh đồng Dẫn lưu bạch huyết với các hình thức Massage Body thông thường. Dưới đây là các khác biệt mang tính cốt lõi:

1. Đối tượng tác động:
- Massage thông thường: Tác động vào các bó cơ sâu, gân và khớp nhằm giải phóng co thắt cơ học.
- MLD Vodder: Tác động vi mô vào hệ mao mạch bạch huyết nằm ngay sát bề mặt biểu bì.

2. Hướng lực và nhịp điệu:
- Massage thông thường: Lực mạnh, nhịp nhanh, miết sâu.
- MLD Vodder: Chuyển động xoay vòng chậm rãi (khoảng 1 chuyển động mỗi giây) chính xác theo hướng dòng chảy về các hạch bạch huyết chính (hạch cổ, hạch nách, hạch bẹn).

3. Mục tiêu trị liệu:
MLD được coi là phương pháp y khoa phục hồi chức năng và giảm phù nề, có chỉ định lâm sàng rõ ràng và được bảo hiểm y tế tại nhiều quốc gia châu Âu chi trả.`,
    image_url: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=800&fit=crop',
    file_url: 'https://mldvietnam.edu.vn/docs/so-sanh-mld-vodder-va-massage-thong-thuong.pdf',
    category: 'Kỹ thuật MLD Vodder',
    author_name: 'BS. CKI Lê Hoài An',
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    sort_order: 5
  },
  {
    kind: 'COMMUNITY',
    title: 'Kinh nghiệm phân biệt Phù mỡ (Lipedema) và Phù bạch huyết (Lymphedema)',
    summary: 'Chia sẻ ca lâm sàng thực tế giúp kỹ thuật viên chẩn đoán phân biệt chính xác dấu hiệu Stemmer và đối xứng hai chi.',
    content_text: `Bài viết chia sẻ các dấu hiệu nhận biết quan trọng như dấu hiệu Stemmer (véo da mu ngón chân), tính chất đối xứng ở hai chân của Lipedema và khả năng đáp ứng đặc thù với kỹ thuật dẫn lưu MLD kết hợp băng ép ngắn Rosidal K.

1. Tính chất đối xứng:
- Phù mỡ (Lipedema): Thường đối xứng cả hai chân từ mông xuống cổ chân, bàn chân hoàn toàn bình thường (dấu hiệu "vòng lắc" ở mắt cá).
- Phù bạch huyết (Lymphedema): Thường xuất hiện không đối xứng ở một bên chi, bao gồm cả mu bàn chân và ngón chân.

2. Dấu hiệu Stemmer:
- Âm tính trong Lipedema đơn thuần (vẫn véo được nếp da mu ngón chân thứ hai).
- Dương tính rõ rệt trong Lymphedema (da mu ngón chân căng mọng, không thể véo gấp lại được).`,
    image_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&fit=crop',
    file_url: 'https://mldvietnam.edu.vn/docs/phan-biet-lipedema-va-lymphedema.pdf',
    category: 'Xương khớp & Phục hồi',
    author_name: 'KTV. Nguyễn Thu Hà (Master LV3)',
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    sort_order: 6
  }
];

function sendRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = https.request({
      hostname: HOST,
      path: path,
      method: method,
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('--- Checking & Seeding Community Posts in Supabase miniapp_shared_content ---');
  
  // 1. Delete old COMMUNITY posts to have clean dynamic data
  console.log('1. Cleaning existing COMMUNITY rows...');
  await sendRequest('DELETE', '/rest/v1/miniapp_shared_content?kind=eq.COMMUNITY');
  
  // 2. Insert fresh community posts with cover images and PDF URLs
  console.log('2. Inserting articles with image_url, title, and file_url (PDF)...');
  const res = await sendRequest('POST', '/rest/v1/miniapp_shared_content', articles);
  console.log(`Successfully seeded ${Array.isArray(res) ? res.length : 0} community articles!`);
}

run().catch(console.error);
