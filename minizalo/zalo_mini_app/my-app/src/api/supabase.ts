import {
  Branch,
  SpaService,
  Specialist,
  Appointment,
  Course,
  Chapter,
  CommunityPost,
  PortalBanner,
  UserProfile,
} from '@/core/types';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://wstvwushpwcdsmhpunvh.supabase.co';
const SUPABASE_ANON_KEY =
  (import.meta as any).env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// Fallback Branches
export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'aaaaaaaa-0001-0001-0001-000000000001',
    name: 'Trụ sở MLD Việt Nam (5 Master LV3)',
    phone: '096.7786.399',
    address: 'Số 260, Ngõ 271 Bùi Xương Trạch, Khương Đình, Hà Nội, Phường Khương Đình, Thành phố Hà Nội',
    city: 'TP. Hồ Chí Minh',
    district: 'Quận 3',
    distanceKm: '0.0',
    openingHours: '08:30 - 20:30 (Cả tuần)',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef',
    services: ['Dẫn lưu bạch huyết MLD', 'Điều trị phù bạch huyết', 'Đào tạo Master Vodder'],
  },
  {
    id: 'bbbbbbbb-0002-0002-0002-000000000002',
    name: 'Chi nhánh Hà Nội - MLD',
    phone: '096.7786.399',
    address: 'Tòa nhà Charmvit, 117 Trần Duy Hưng, Cầu Giấy',
    city: 'Hà Nội',
    district: 'Cầu Giấy',
    distanceKm: '0.0',
    openingHours: '08:30 - 20:30 (Cả tuần)',
    rating: 4.95,
    imageUrl: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8',
    services: ['Dẫn lưu bạch huyết MLD', 'Đào tạo Kỹ thuật viên'],
  },
];

// Fallback Core Service
export const DEFAULT_CORE_SERVICE: SpaService = {
  id: '235166f2-66c9-4231-bbe1-af91b48fc67c',
  name: 'Điều trị dẫn lưu phù bạch huyết chuyên sâu (Vodder MLD)',
  categoryName: 'Dẫn lưu bạch huyết MLD',
  shortDescription: 'Phương pháp chuẩn Y khoa Quốc tế kích hoạt hệ tuần hoàn bạch huyết, tiêu phù nề sau phẫu thuật và giảm đau nhức.',
  fullDescription: 'Ứng dụng kỹ thuật Vodder MLD nhẹ nhàng kích hoạt hệ mao mạch bạch huyết dưới bề mặt da, hỗ trợ giải phóng dịch ứ đọng, tăng cường miễn dịch và thải độc tế bào.',
  durationMinutes: 60,
  price: 700000,
  vatRate: 0.08,
  imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef',
  isFeatured: true,
};

// Fallback Specialist
export const DEFAULT_SPECIALISTS: Specialist[] = [
  {
    id: 'spec-01',
    name: 'Trần Minh Phương',
    title: 'Kỹ Thuật Viên Vodder MLD',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813633-4f90bf4a8585',
    branchName: 'Chi nhánh Quận 3 - TP.HCM',
    experienceYears: 6,
    bio: 'Chứng chỉ Vodder Quốc tế, chuyên trị liệu dẫn lưu phù nề sau tạo hình và sau phẫu thuật thẩm mỹ.',
  },
  {
    id: 'spec-02',
    name: 'Nguyễn Thu Hà',
    title: 'Chuyên Viên Phục Hồi Lâm Sàng',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branchName: 'Chi nhánh Cầu Giấy - Hà Nội',
    experienceYears: 7,
    bio: 'Giảng viên thực hành MLD, trên 7 năm kinh nghiệm dẫn lưu giải độc hệ bạch huyết.',
  },
];

// Fallback Courses - Đầy đủ 11 khóa học y khoa chuẩn của Học viện MLD Việt Nam khớp 100% CSDL
export const DEFAULT_COURSES: Course[] = [
  {
    id: '5a84ecd9-a4f3-48bd-bbaa-0b54b8f235f8',
    title: 'Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú',
    category: 'Người mới bắt đầu',
    level: 'Cơ bản',
    durationWeeks: 1,
    totalHours: 8,
    theoryHours: 4,
    practiceHours: 4,
    tuitionFee: 350000,
    depositFee: 100000,
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Master Vodder MLD',
    instructorTitle: 'Chuyên gia Trị liệu & Phục hồi',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Chủ nhật · 09:00–12:00',
    description: 'Chuyên đề lâm sàng hướng dẫn thực hành các kỹ thuật tự dẫn lưu nhẹ nhàng và tư thế sinh hoạt tránh ứ trệ dịch bạch huyết sau phẫu thuật ung thư vú.',
    youtubeId: '1F2b2Uf0a88',
  },
  {
    id: '046185ac-2f31-411e-8e55-a7188b43c3b9',
    title: 'Hướng dẫn xây dựng chế độ ăn phòng ngừa bệnh lý tuyến vú',
    category: 'Người mới bắt đầu',
    level: 'Cơ bản',
    durationWeeks: 1,
    totalHours: 6,
    theoryHours: 3,
    practiceHours: 3,
    tuitionFee: 350000,
    depositFee: 100000,
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Master Vodder MLD',
    instructorTitle: 'Chuyên gia Dinh dưỡng & MLD',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Thứ 7 · 14:00–17:00',
    description: 'Dinh dưỡng lâm sàng hỗ trợ giảm viêm mô kẽ và bảo vệ sức khỏe tuyến vú chủ động.',
    youtubeId: 'e_s9dI7j81w',
  },
  {
    id: 'c6532ed9-3da5-403a-80e9-966caf549ba1',
    title: 'Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật tuyến vú',
    category: 'Người mới bắt đầu',
    level: 'Cơ bản',
    durationWeeks: 1,
    totalHours: 8,
    theoryHours: 4,
    practiceHours: 4,
    tuitionFee: 350000,
    depositFee: 100000,
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Master Vodder MLD',
    instructorTitle: 'Kỹ thuật viên Trưởng',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Chủ nhật · 14:00–17:00',
    description: 'Bài tập vận động trị liệu kích hoạt bơm cơ cải thiện hồi lưu tuần hoàn bạch huyết chi trên.',
    youtubeId: 'kJQP7kiw5Fk',
  },
  {
    id: 'fef4cb51-36ba-4a11-b0db-6b45a6435d8e',
    title: 'Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu',
    category: 'Người mới bắt đầu',
    level: 'Nền tảng',
    durationWeeks: 4,
    totalHours: 20,
    theoryHours: 12,
    practiceHours: 8,
    tuitionFee: 599000,
    depositFee: 200000,
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Master Vodder MLD',
    instructorTitle: 'Giảng viên Chuyên môn Quốc tế',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: '6 buổi · Linh hoạt online & thực hành',
    description: 'Khóa học nhập môn chi phí hợp lý giúp người mới hiểu đúng cơ chế giải độc, tăng miễn dịch tự nhiên và kỹ thuật tự dẫn lưu cơ bản.',
    youtubeId: '1F2b2Uf0a88',
  },
  {
    id: '15fb79f0-c533-4bbd-9860-2ff586c0c2be',
    title: 'Khoá học Chuyên đề Chăm sóc mẹ sau sinh',
    category: 'Người mới bắt đầu',
    level: 'Cơ bản',
    durationWeeks: 3,
    totalHours: 24,
    theoryHours: 10,
    practiceHours: 14,
    tuitionFee: 10000000,
    depositFee: 2000000,
    image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Master Vodder MLD',
    instructorTitle: 'Giảng viên chuyên môn MLD',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Thứ 6 & Thứ 7 · 09:00–12:00',
    description: 'Dẫn lưu tiêu phù sau sinh, hỗ trợ phục hồi tử cung và giảm ứ dịch toàn thân an toàn.',
    youtubeId: 'aqz-KE-bpKQ',
  },
  {
    id: 'ae1be598-a83a-4ddf-ba78-591745db7285',
    title: 'Dẫn lưu bạch huyết cơ bản cho người làm nghề',
    category: 'Người đang làm nghề',
    level: 'Cơ bản nghề',
    durationWeeks: 4,
    totalHours: 60,
    theoryHours: 24,
    practiceHours: 36,
    tuitionFee: 15000000,
    depositFee: 2000000,
    image: 'https://images.unsplash.com/photo-1512290900672-1f41e06d9e0d?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Master Vodder MLD',
    instructorTitle: 'Master Vodder Quốc Tế',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Thứ 2–4–6 · 13:00–17:00',
    description: 'Nắm vững giải phẫu hệ tuần hoàn bạch huyết nông, lực miết lông vũ 30-40 mmHg và các thao tác dẫn lưu toàn thân cơ bản.',
    youtubeId: '1F2b2Uf0a88',
  },
  {
    id: '62f22649-4eac-426c-8ac6-a2b7840ead66',
    title: 'Dẫn lưu bạch huyết chuyên sâu cho người làm nghề',
    category: 'Người đang làm nghề',
    level: 'Chuyên sâu',
    durationWeeks: 6,
    totalHours: 90,
    theoryHours: 30,
    practiceHours: 60,
    tuitionFee: 20000000,
    depositFee: 3000000,
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Master Vodder MLD',
    instructorTitle: 'Cố vấn Chuyên môn Y khoa',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Thứ 6 – Thứ 7 – Chủ Nhật',
    description: 'Chương trình chuyên sâu đào tạo kỹ thuật định tuyến dòng chảy bạch huyết, can thiệp xử lý phù nề sau phẫu thuật và chăm sóc bệnh lý mô mềm.',
    youtubeId: 'e_s9dI7j81w',
  },
  {
    id: 'd9f96bca-4ea0-47da-9bf9-95a289659b8a',
    title: 'Dẫn lưu bạch huyết nâng cao cho người làm nghề',
    category: 'Người đang làm nghề',
    level: 'Nâng cao',
    durationWeeks: 8,
    totalHours: 100,
    theoryHours: 35,
    practiceHours: 65,
    tuitionFee: 25000000,
    depositFee: 3000000,
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Master Vodder MLD',
    instructorTitle: 'Master Vodder Quốc Tế',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Thứ 3–5–7 · 13:00–17:00',
    description: 'Kỹ thuật khai mở chuỗi hạch bạch huyết sâu, xử lý xơ hóa mô sẹo, phối hợp vật lý trị liệu phục hồi chức năng sau mổ.',
    youtubeId: 'kJQP7kiw5Fk',
  },
  {
    id: 'f942ba92-d6b0-466c-bdba-3aa25c389771',
    title: 'Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT',
    category: 'Người đang làm nghề',
    level: 'Chuyên sâu CDT',
    durationWeeks: 8,
    totalHours: 110,
    theoryHours: 40,
    practiceHours: 70,
    tuitionFee: 30000000,
    depositFee: 5000000,
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Master Vodder MLD',
    instructorTitle: 'Master Trainer CDT',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Tập trung chuyên đề lâm sàng',
    description: 'Liệu pháp phức hợp chống phù nề (CDT) kết hợp MLD và kỹ thuật quấn băng ép đa lớp chuẩn y khoa Đức.',
    youtubeId: 'aqz-KE-bpKQ',
  },
  {
    id: '42015c6f-66f4-4bba-bddf-4aad1449fb5f',
    title: 'Chương trình phát triển giảng viên và học thuật',
    category: 'Người đang làm nghề',
    level: 'Chuyên gia & Giảng viên',
    durationWeeks: 12,
    totalHours: 120,
    theoryHours: 40,
    practiceHours: 80,
    tuitionFee: 35000000,
    depositFee: 5000000,
    image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Master Vodder MLD',
    instructorTitle: 'Chủ tịch Hội đồng Chuyên môn',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Theo đợt tập trung chuyên môn',
    description: 'Đào tạo và chuẩn hóa đội ngũ giảng viên, chuyên gia học thuật chuyển giao phương pháp dẫn lưu bạch huyết chuẩn y khoa quốc tế.',
    youtubeId: '1F2b2Uf0a88',
  },
  {
    id: '3c90e0c8-47bc-49a0-8a16-dcf03d8d64ab',
    title: 'Lymphatic Wellness Signature Program',
    category: 'Người đang làm nghề',
    level: 'Master VIP Signature',
    durationWeeks: 16,
    totalHours: 300,
    theoryHours: 100,
    practiceHours: 200,
    tuitionFee: 350000000,
    depositFee: 50000000,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Master Vodder MLD',
    instructorTitle: 'Master Trainer',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Đào tạo 1-1 Chuyển giao trọn đời',
    description: 'Chương trình huấn luyện tinh hoa Master toàn diện: Đào tạo cá nhân 1-1, chuyển giao toàn bộ phác đồ độc quyền và hỗ trợ setup trung tâm trị liệu chuẩn quốc tế.',
    youtubeId: 'e_s9dI7j81w',
  },
];

// Fallback Chapters & Lessons - Khôi phục chính xác clip YouTube 94:48 đã chỉnh sửa hôm qua
export const DEFAULT_CHAPTERS: Chapter[] = [
  {
    id: 'ch-01',
    title: 'Chương 1: Giải phẫu & Sinh lý hệ bạch huyết',
    lessons: [
      {
        id: 'les_01',
        title: 'Bài 1: Nhận biết sớm dấu hiệu phù - chủ động giảm nguy cơ phù tay sau phẫu thuật',
        durationMinutes: 95,
        youtubeId: 'mDhpMX4EeY8',
        isFreePreview: false,
      },
      {
        id: 'les_02',
        title: 'Bài 2: Cấu tạo mao mạch và hạch bạch huyết',
        durationMinutes: 20,
        youtubeId: '0h9sC3wK-yA',
        isFreePreview: false,
      },
      {
        id: 'les_03',
        title: 'Bài 3: Áp lực mô và cơ chế hình thành dịch phù',
        durationMinutes: 25,
        youtubeId: '2r1pZ3Wf2lA',
        isFreePreview: false,
      },
    ],
  },
  {
    id: 'ch-02',
    title: 'Chương 2: Nguyên lý 4 thao tác dẫn lưu cơ bản',
    lessons: [
      {
        id: 'les_04',
        title: 'Bài 4: Thao tác xoay tròn tĩnh (Stationary Circles)',
        durationMinutes: 20,
        youtubeId: 'Zz1X1U0v6g0',
        isFreePreview: false,
      },
      {
        id: 'les_05',
        title: 'Bài 5: Thao tác Áp bơm (Pump technique)',
        durationMinutes: 25,
        youtubeId: 'XvcJpA_k24k',
        isFreePreview: false,
      },
      {
        id: 'les_06',
        title: 'Bài 6: Thao tác Múc và Cuộn (Scoop & Rotary)',
        durationMinutes: 30,
        youtubeId: 'Yp69xN1D9Xk',
        isFreePreview: false,
      },
    ],
  },
  {
    id: 'ch-03',
    title: 'Chương 3: Phác đồ lâm sàng & Thực hành cầm tay chỉ việc',
    lessons: [
      {
        id: 'les_07',
        title: 'Bài 7: Quy trình dẫn lưu vùng cổ vai gáy và đầu mặt',
        durationMinutes: 30,
        youtubeId: 'QA-xR_E24G8',
        isFreePreview: false,
      },
      {
        id: 'les_08',
        title: 'Bài 8: Xử lý phù chi và phòng ngừa biến chứng',
        durationMinutes: 35,
        youtubeId: '0h9sC3wK-yA',
        isFreePreview: false,
      },
    ],
  },
];

// Fallback Articles / Posts
export const DEFAULT_POSTS: CommunityPost[] = [
  {
    id: 'post-01',
    title: 'Phương pháp Dẫn lưu Bạch huyết Vodder trong Điều trị Thoát vị Đĩa đệm và Giảm Đau Cột sống',
    summary: 'Nghiên cứu lâm sàng ứng dụng kỹ thuật dẫn lưu bạch huyết giải tỏa phù nề rễ thần kinh và phục hồi chức năng vận động.',
    content: `Dẫn lưu bạch huyết bằng tay (Manual Lymphatic Drainage - MLD) theo phương pháp Vodder là một kỹ thuật trị liệu chuyên sâu, tác động nhẹ nhàng lên hệ thống bạch huyết dưới da nhằm kích hoạt lưu thông dịch kẽ, giảm ứ trệ tuần hoàn và tiêu sưng phù mô liên kết.\n\nTrong bệnh lý thoát vị đĩa đệm, sự chèn ép rễ thần kinh thường đi kèm với tình trạng viêm vô khuẩn và ứ trệ vi tuần hoàn quanh rễ. MLD hỗ trợ giảm áp lực thẩm thấu mô, giảm sưng nề màng tủy và tạo điều kiện tối ưu để phục hồi vận động.`,
    authorName: 'Ban Cố vấn Y khoa MLD',
    authorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    authorRole: 'Hội đồng Chuyên môn Y khoa',
    category: 'Nghiên cứu Lâm sàng',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d',
    pdfUrl: 'https://wstvwushpwcdsmhpunvh.supabase.co/storage/v1/object/public/documents/thoat_vi_dia_dem.pdf',
    pdfTitle: 'Tài liệu Chuyên khảo Thoát vị đĩa đệm & MLD Vodder (PDF)',
    pdfFileSize: '3.1 MB',
    publishedAt: '26/10/2026',
    likesCount: 142,
    viewsCount: 1250,
  },
  {
    id: 'post-02',
    title: 'Quy trình dẫn lưu bạch huyết chuẩn Y khoa Vodder sau phẫu thuật thẩm mỹ',
    summary: 'Hướng dẫn chuẩn bị, vệ sinh và thao tác áp lực dưới 30 mmHg để tiêu bầm tím và phòng ngừa xơ hóa mô.',
    content: `Giai đoạn hậu phẫu từ ngày thứ 3 đến ngày thứ 14 là thời điểm vàng để thực hiện MLD. Lực ấn được kiểm soát nghiêm ngặt không vượt quá 30 mmHg để bảo vệ các vi mạch mới tái tạo, giúp dịch thoát tự nhiên về các hạch vùng nách và bẹn.`,
    authorName: 'ThS. Nguyễn Thu Hà',
    authorAvatar: 'https://images.unsplash.com/photo-1594824813633-4f90bf4a8585',
    authorRole: 'Chuyên gia Phục hồi chức năng',
    category: 'Kỹ thuật Thực hành',
    imageUrl: 'https://images.unsplash.com/photo-1512290900672-1f41e06d9e0d',
    publishedAt: '20/10/2026',
    likesCount: 98,
    viewsCount: 890,
  },
];

// Helper: safe fetch with timeout
async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return fallback;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? (data as T) : fallback;
  } catch {
    return fallback;
  }
}

export const SupabaseDataService = {
  // 1. Branches
  async getBranches(): Promise<Branch[]> {
    const url = `${SUPABASE_URL}/rest/v1/branches?is_active=eq.true&order=created_at.asc`;
    const data = await safeFetch<any[]>(url, []);
    if (data.length > 0) {
      return data.map((b) => ({
        id: b.id,
        name: b.name || 'Chi nhánh MLD',
        phone: b.phone || '096.7786.399',
        address: b.address || '',
        city: b.city || 'TP. Hồ Chí Minh',
        district: b.district || 'Quận 3',
        distanceKm: '0.0',
        openingHours: b.opening_hours || '08:30 - 20:30',
        rating: b.rating ? Number(b.rating) : 4.9,
        imageUrl: b.image_url || DEFAULT_BRANCHES[0].imageUrl,
        services: ['Dẫn lưu bạch huyết MLD', 'Điều trị phù nề', 'Đào tạo Vodder'],
      }));
    }
    return DEFAULT_BRANCHES;
  },

  // 2. Services
  async getServices(): Promise<SpaService[]> {
    const url = `${SUPABASE_URL}/rest/v1/services?is_active=eq.true&order=created_at.asc`;
    const data = await safeFetch<any[]>(url, []);
    if (data.length > 0) {
      return data.map((s) => ({
        id: s.id,
        name: s.name,
        categoryName: s.category_name || 'Dẫn lưu bạch huyết MLD',
        shortDescription: s.short_description || s.description || '',
        fullDescription: s.full_description || s.description || '',
        durationMinutes: s.duration_minutes || 60,
        price: Number(s.price) || 650000,
        vatRate: s.vat_rate ? Number(s.vat_rate) : 0.08,
        imageUrl: s.image_url || DEFAULT_CORE_SERVICE.imageUrl,
        isFeatured: true,
      }));
    }
    return [DEFAULT_CORE_SERVICE];
  },

  // 3. Portal Banners
  async getBanners(): Promise<PortalBanner[]> {
    const url = `${SUPABASE_URL}/rest/v1/portal_banners?is_active=eq.true&order=sort_order.asc`;
    const data = await safeFetch<any[]>(url, []);
    if (data.length > 0) {
      return data.map((b) => ({
        id: b.id,
        title: b.title,
        summary: b.summary || '',
        content_text: b.content_text || '',
        image_url: b.image_url,
        target_link: b.target_link || '',
        author_name: b.author_name || 'MLD Việt Nam',
      }));
    }
    return [
      {
        id: 'banner-01',
        title: 'TRUNG TÂM Y KHOA BẠCH HUYẾT MLD VIỆT NAM',
        summary: 'Phương pháp Dẫn lưu phù bạch huyết chuẩn Y khoa Quốc tế Dr. Vodder',
        content_text: 'MLD Việt Nam tự hào là đơn vị tiên phong ứng dụng kỹ thuật dẫn lưu bạch huyết Vodder chuẩn châu Âu.',
        image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef',
        target_link: 'service',
        author_name: 'Hội đồng Y khoa MLD',
      },
    ];
  },

  // 4. Specialists
  async getSpecialists(): Promise<Specialist[]> {
    const url = `${SUPABASE_URL}/rest/v1/technicians?is_active=eq.true&limit=10`;
    const data = await safeFetch<any[]>(url, []);
    if (data.length > 0) {
      return data.map((t) => ({
        id: t.id,
        name: t.name,
        title: t.title || 'Chuyên viên Vodder',
        avatarUrl: t.avatar_url || DEFAULT_SPECIALISTS[0].avatarUrl,
        branchName: t.branch_name || 'Chi nhánh Quận 3',
        experienceYears: t.experience_years || 5,
        bio: t.bio || '',
      }));
    }
    return DEFAULT_SPECIALISTS;
  },

  // 5. Courses - Tải động trực tiếp từ CSDL Supabase, fallback danh mục chuẩn 11 khóa
  async getCourses(): Promise<Course[]> {
    const url = `${SUPABASE_URL}/rest/v1/courses?is_active=eq.true&order=tuition_fee.asc`;
    const data = await safeFetch<any[]>(url, []);
    if (data.length > 0) {
      return data.map((c) => {
        const outcomes = typeof c.learning_outcomes === 'object' && c.learning_outcomes !== null ? c.learning_outcomes : {};
        return {
          id: c.id,
          title: c.title,
          category: outcomes.course_group || (c.level === 'BEGINNER' ? 'Người mới bắt đầu' : 'Người đang làm nghề'),
          level: outcomes.course_group || c.level || 'Cơ bản',
          durationWeeks: Math.max(1, Math.round((c.total_hours || 24) / 6)),
          totalHours: c.total_hours || 24,
          theoryHours: c.theory_hours || 12,
          practiceHours: c.practice_hours || 12,
          tuitionFee: Number(c.tuition_fee) || 0,
          depositFee: Number(c.deposit_amount) || 0,
          image: c.image_url?.startsWith('http')
            ? c.image_url
            : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
          instructorName: 'Master Vodder MLD',
          instructorTitle: 'Giảng viên Chuyên môn Quốc tế',
          instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
          branch: 'Học viện MLD Việt Nam',
          schedule: 'Linh hoạt online & thực hành',
          description: c.short_description || c.full_description || '',
          youtubeId: '1F2b2Uf0a88',
        };
      });
    }
    return DEFAULT_COURSES;
  },

  // 6. Community Posts
  async getCommunityPosts(): Promise<CommunityPost[]> {
    const url = `${SUPABASE_URL}/rest/v1/community_posts?order=created_at.desc`;
    const data = await safeFetch<any[]>(url, []);
    if (data.length > 0) {
      return data.map((p) => ({
        id: p.id,
        title: p.title,
        summary: p.summary || '',
        content: p.content || '',
        authorName: p.author_name || 'Chuyên gia MLD',
        authorAvatar: p.author_avatar || DEFAULT_POSTS[0].authorAvatar,
        authorRole: p.author_role || 'Ban Chuyên Môn',
        category: p.category || 'Nghiên cứu Lâm sàng',
        imageUrl: p.image_url,
        pdfUrl: p.pdf_url,
        pdfTitle: p.pdf_title,
        pdfFileSize: p.pdf_file_size,
        publishedAt: p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : '26/10/2026',
        likesCount: p.likes_count || 120,
        viewsCount: p.views_count || 950,
      }));
    }
    return DEFAULT_POSTS;
  },

  // 7. Appointments (Local Storage + Supabase)
  getStoredAppointments(): Appointment[] {
    try {
      const raw = localStorage.getItem('mld_appointments');
      if (raw) return JSON.parse(raw);
    } catch { }
    return [];
  },

  getAppointments(): Appointment[] {
    return this.getStoredAppointments();
  },

  saveAppointment(app: Appointment) {
    const list = this.getStoredAppointments();
    list.unshift(app);
    localStorage.setItem('mld_appointments', JSON.stringify(list));
  },

  // 8. Curriculum (Chapters & Lessons) - Tải động từ CSDL Supabase
  async getCourseCurriculum(courseId?: string): Promise<Chapter[]> {
    if (courseId) {
      const url = `${SUPABASE_URL}/rest/v1/course_chapters?course_id=eq.${courseId}&select=id,title,course_lessons(id,title,duration_minutes,video_url)&order=chapter_order.asc`;
      const data = await safeFetch<any[]>(url, []);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((ch) => ({
          id: ch.id,
          title: ch.title,
          lessons: (ch.course_lessons || []).map((l: any) => {
            const match = l.video_url?.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            return {
              id: l.id,
              title: l.title,
              durationMinutes: l.duration_minutes || 15,
              videoUrl: l.video_url,
              youtubeId: match ? match[1] : '1F2b2Uf0a88',
              isFreePreview: false,
            };
          }),
        }));
      }
    }
    return DEFAULT_CHAPTERS;
  },

  // 9. Completed Lessons Progress (Key: courseId_lessonId)
  getCompletedLessons(courseId?: string): string[] {
    try {
      const raw = localStorage.getItem('mld_completed_lessons');
      if (raw) {
        const allKeys: string[] = JSON.parse(raw);
        if (courseId) {
          return allKeys.filter((k) => k.startsWith(`${courseId}_`)).map((k) => k.replace(`${courseId}_`, ''));
        }
        return allKeys;
      }
    } catch { }
    return [];
  },

  markLessonDone(courseId: string, lessonId: string): string[] {
    const raw = localStorage.getItem('mld_completed_lessons');
    let list: string[] = [];
    try {
      if (raw) list = JSON.parse(raw);
    } catch { }
    const key = `${courseId}_${lessonId}`;
    if (!list.includes(key)) {
      list.push(key);
      localStorage.setItem('mld_completed_lessons', JSON.stringify(list));
    }
    return this.getCompletedLessons(courseId);
  },

  markLessonCompleted(courseId: string, lessonId: string): string[] {
    return this.markLessonDone(courseId, lessonId);
  },

  isLessonDone(courseId: string, lessonId: string): boolean {
    const list = this.getCompletedLessons();
    return list.includes(`${courseId}_${lessonId}`);
  },

  // 10. Enrolled Courses - Mặc định mở khóa đúng khóa 1 chứa clip YouTube test cho buih73444@gmail.com
  getEnrolledCourseIds(): string[] {
    try {
      const raw = localStorage.getItem('mld_enrolled_courses');
      if (raw) return JSON.parse(raw);
    } catch { }
    return ['30303030-0001-0001-0001-000000000001']; // Mở khóa Khóa 1 (Level 0) để trải nghiệm
  },

  enrollCourse(courseId: string) {
    const list = this.getEnrolledCourseIds();
    if (!list.includes(courseId)) {
      list.push(courseId);
      localStorage.setItem('mld_enrolled_courses', JSON.stringify(list));
    }
  },

  isCourseEnrolled(courseId: string): boolean {
    return this.getEnrolledCourseIds().includes(courseId);
  },

  // 11. User Profile Storage
  getUserProfile(): UserProfile {
    try {
      const raw = localStorage.getItem('mld_user_profile');
      if (raw) return JSON.parse(raw);
    } catch { }
    return {
      id: 'usr-001',
      fullName: 'Khách hàng MLD',
      phone: '0967786399',
      isPhoneVerified: true,
      email: 'buih73444@gmail.com',
      gender: 'Nữ',
      dateOfBirth: '1992-06-15',
      address: 'Quận 3, TP. Hồ Chí Minh',
      avatarUrl: '',
      memberCode: 'MLD-786399',
    };
  },

  saveUserProfile(profile: UserProfile) {
    localStorage.setItem('mld_user_profile', JSON.stringify(profile));
  },

  updateUserProfile(partial: Partial<UserProfile>): UserProfile {
    const current = this.getUserProfile();
    const updated = { ...current, ...partial };
    this.saveUserProfile(updated);
    return updated;
  },
};

export const supabaseApi = SupabaseDataService;
export default SupabaseDataService;

