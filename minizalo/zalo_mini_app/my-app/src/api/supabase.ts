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
    address: 'Số 186 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3',
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
    name: 'Chi nhánh Hà Nội - MLD Academy',
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
  price: 650000,
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
    bio: 'Giảng viên thực hành MLD Academy, trên 7 năm kinh nghiệm dẫn lưu giải độc hệ bạch huyết.',
  },
];

// Fallback Courses - Đầy đủ toàn bộ 11 khóa học y khoa chuẩn của Học viện MLD Việt Nam
export const DEFAULT_COURSES: Course[] = [
  {
    id: '30303030-0001-0001-0001-000000000001',
    title: 'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI MỚI BẮT ĐẦU - Level 0',
    category: 'Người mới bắt đầu',
    level: 'Cơ bản',
    durationWeeks: 4,
    totalHours: 24,
    theoryHours: 12,
    practiceHours: 12,
    tuitionFee: 599000,
    depositFee: 200000,
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    instructorName: 'ThS. Nguyễn Thu Hà',
    instructorTitle: 'Giảng viên chuyên môn MLD',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: '6 buổi · Linh hoạt online & thực hành',
    description: 'Lý thuyết nền tảng Master Lymphatic Therapy Level 0. Hiểu sâu về dòng chảy hệ bạch huyết, cấu trúc mao mạch và nguyên lý kích hoạt tự chữa lành của cơ thể.',
    youtubeId: 'mDhpMX4EeY8',
  },
  {
    id: '30303030-0001-0001-0001-000000000003',
    title: 'Workshop: HƯỚNG DẪN PHÒNG NGỪA PHÙ TAY SAU PHẪU THUẬT UNG THƯ VÚ',
    category: 'Người mới bắt đầu',
    level: 'Cơ bản',
    durationWeeks: 1,
    totalHours: 8,
    theoryHours: 4,
    practiceHours: 4,
    tuitionFee: 350000,
    depositFee: 100000,
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Trần Minh Phương',
    instructorTitle: 'Chuyên gia Trị liệu & Phục hồi',
    instructorAvatar: 'https://images.unsplash.com/photo-1594824813633-4f90bf4a8585',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Chủ nhật · 09:00–12:00',
    description: 'Chuyên đề lâm sàng hướng dẫn thực hành các kỹ thuật tự dẫn lưu nhẹ nhàng và tư thế sinh hoạt tránh ứ trệ dịch bạch huyết sau phẫu thuật ung thư vú.',
    youtubeId: 'QA-xR_E24G8',
  },
  {
    id: '30303030-0001-0001-0001-000000000004',
    title: 'Workshop: HƯỚNG DẪN XÂY DỰNG CHẾ ĐỘ ĂN PHÒNG NGỪA BỆNH LÝ TUYẾN VÚ',
    category: 'Người mới bắt đầu',
    level: 'Cơ bản',
    durationWeeks: 1,
    totalHours: 6,
    theoryHours: 3,
    practiceHours: 3,
    tuitionFee: 350000,
    depositFee: 100000,
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=600&q=80',
    instructorName: 'ThS. Nguyễn Thu Hà',
    instructorTitle: 'Chuyên gia Dinh dưỡng & MLD',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Thứ 7 · 14:00–17:00',
    description: 'Dinh dưỡng lâm sàng hỗ trợ giảm viêm mô kẽ và bảo vệ sức khỏe tuyến vú chủ động.',
    youtubeId: 'QA-xR_E24G8',
  },
  {
    id: '30303030-0001-0001-0001-000000000005',
    title: 'Workshop: HƯỚNG DẪN VẬN ĐỘNG PHÒNG NGỪA PHÙ TAY SAU PHẪU THUẬT TUYẾN VÚ',
    category: 'Người mới bắt đầu',
    level: 'Cơ bản',
    durationWeeks: 1,
    totalHours: 8,
    theoryHours: 4,
    practiceHours: 4,
    tuitionFee: 350000,
    depositFee: 100000,
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Trần Minh Phương',
    instructorTitle: 'Kỹ thuật viên Trưởng',
    instructorAvatar: 'https://images.unsplash.com/photo-1594824813633-4f90bf4a8585',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Chủ nhật · 14:00–17:00',
    description: 'Bài tập vận động trị liệu kích hoạt bơm cơ cải thiện hồi lưu tuần hoàn bạch huyết chi trên.',
    youtubeId: 'QA-xR_E24G8',
  },
  {
    id: '30303030-0001-0001-0001-000000000009',
    title: 'Khoá học Chuyên đề: CHĂM SÓC MẸ SAU SINH',
    category: 'Người mới bắt đầu',
    level: 'Cơ bản',
    durationWeeks: 2,
    totalHours: 16,
    theoryHours: 8,
    practiceHours: 8,
    tuitionFee: 1200000,
    depositFee: 500000,
    image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=600&q=80',
    instructorName: 'ThS. Nguyễn Thu Hà',
    instructorTitle: 'Giảng viên chuyên môn MLD',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Thứ 6 & Thứ 7 · 09:00–12:00',
    description: 'Dẫn lưu tiêu phù sau sinh, hỗ trợ phục hồi tử cung và giảm ứ dịch toàn thân an toàn.',
    youtubeId: 'QA-xR_E24G8',
  },
  {
    id: '30303030-0001-0001-0001-000000000002',
    title: 'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI LÀM NGHỀ - Level 1',
    category: 'Kỹ thuật viên',
    level: 'Nâng cao',
    durationWeeks: 4,
    totalHours: 32,
    theoryHours: 12,
    practiceHours: 20,
    tuitionFee: 3500000,
    depositFee: 1000000,
    image: 'https://images.unsplash.com/photo-1512290900672-1f41e06d9e0d?auto=format&fit=crop&w=600&q=80',
    instructorName: 'ThS. Nguyễn Thu Hà',
    instructorTitle: 'Master Vodder Quốc Tế',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Thứ 2–4–6 · 13:00–17:00',
    description: 'Nâng tầm kỹ năng cho KTV Spa/Thẩm mỹ với 4 kỹ thuật Vodder gốc, ứng dụng trong trị liệu chăm sóc phục hồi da mặt và toàn thân.',
    youtubeId: 'QA-xR_E24G8',
  },
  {
    id: '30303030-0001-0001-0001-000000000006',
    title: 'DẪN LƯU BẠCH HUYẾT NÂNG CAO CHO NGƯỜI LÀM NGHỀ - Level 2',
    category: 'Kỹ thuật viên',
    level: 'Nâng cao',
    durationWeeks: 6,
    totalHours: 48,
    theoryHours: 16,
    practiceHours: 32,
    tuitionFee: 6500000,
    depositFee: 2000000,
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
    instructorName: 'ThS. Nguyễn Thu Hà',
    instructorTitle: 'Master Vodder Quốc Tế',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Thứ 3–5–7 · 13:00–17:00',
    description: 'Chuyên sâu phục hồi phù nề sau phẫu thuật gọt hàm, nâng mũi, hút mỡ và tạo hình thành bụng.',
    youtubeId: 'QA-xR_E24G8',
  },
  {
    id: '30303030-0001-0001-0001-000000000010',
    title: 'DẪN LƯU BẠCH HUYẾT CHUYÊN SÂU CHO NGƯỜI LÀM NGHỀ - Level 3',
    category: 'Kỹ thuật viên',
    level: 'Chuyên sâu',
    durationWeeks: 8,
    totalHours: 64,
    theoryHours: 20,
    practiceHours: 44,
    tuitionFee: 9500000,
    depositFee: 3000000,
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
    instructorName: 'ThS.BS Trần Kim Dung',
    instructorTitle: 'Cố vấn Chuyên môn Y khoa',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Thứ 6 – Thứ 7 – Chủ Nhật',
    description: 'Kỹ thuật Vodder chuyên sâu xử lý các ca phù bạch huyết lymphedema tiên phát và thứ phát, mô sẹo xơ cứng lâu năm.',
    youtubeId: 'QA-xR_E24G8',
  },
  {
    id: '30303030-0001-0001-0001-000000000007',
    title: 'GIẢM PHÙ BẰNG DẪN LƯU BẠCH HUYẾT VÀ BĂNG ÉP CDT',
    category: 'Bác sĩ/Y sĩ',
    level: 'Chuyên sâu',
    durationWeeks: 6,
    totalHours: 48,
    theoryHours: 20,
    practiceHours: 28,
    tuitionFee: 8500000,
    depositFee: 2500000,
    image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=600&q=80',
    instructorName: 'ThS.BS Trần Kim Dung',
    instructorTitle: 'Cố vấn Chuyên môn Y khoa',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Cuối tuần · 08:30–16:30',
    description: 'Liệu pháp phức hợp chống phù nề (CDT) kết hợp MLD và kỹ thuật quấn băng ép đa lớp chuẩn y khoa Đức.',
    youtubeId: 'QA-xR_E24G8',
  },
  {
    id: '30303030-0001-0001-0001-000000000011',
    title: 'Chương trình: PHÁT TRIỂN GIẢNG VIÊN VÀ HỌC THUẬT',
    category: 'Bác sĩ/Y sĩ',
    level: 'Chuyên sâu',
    durationWeeks: 12,
    totalHours: 96,
    theoryHours: 40,
    practiceHours: 56,
    tuitionFee: 15000000,
    depositFee: 5000000,
    image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=600&q=80',
    instructorName: 'ThS. Nguyễn Thu Hà',
    instructorTitle: 'Chủ tịch Hội đồng Chuyên môn',
    instructorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Theo đợt tập trung chuyên môn',
    description: 'Đào tạo giảng viên chuyển giao công nghệ dẫn lưu bạch huyết chuẩn hóa phương pháp sư phạm y học.',
    youtubeId: 'QA-xR_E24G8',
  },
  {
    id: '30303030-0001-0001-0001-000000000008',
    title: 'LYMPHATIC WELLNESS SIGNATURE PROGRAM',
    category: 'Người đang làm nghề',
    level: 'Nâng cao',
    durationWeeks: 8,
    totalHours: 60,
    theoryHours: 24,
    practiceHours: 36,
    tuitionFee: 12000000,
    depositFee: 4000000,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80',
    instructorName: 'Trần Minh Phương',
    instructorTitle: 'Master Trainer',
    instructorAvatar: 'https://images.unsplash.com/photo-1594824813633-4f90bf4a8585',
    branch: 'Học viện MLD Việt Nam',
    schedule: 'Linh hoạt',
    description: 'Bộ phác đồ chăm sóc toàn diện hệ miễn dịch và tái sinh năng lượng thông qua giải phóng tuần hoàn bạch huyết.',
    youtubeId: 'QA-xR_E24G8',
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

  // 5. Courses - Trả về đầy đủ toàn bộ khóa học y khoa chuẩn của Học viện MLD Việt Nam
  async getCourses(): Promise<Course[]> {
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
    } catch {}
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

  // 8. Curriculum (Chapters & Lessons)
  async getCourseCurriculum(courseId?: string): Promise<Chapter[]> {
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
    } catch {}
    return [];
  },

  markLessonDone(courseId: string, lessonId: string): string[] {
    const raw = localStorage.getItem('mld_completed_lessons');
    let list: string[] = [];
    try {
      if (raw) list = JSON.parse(raw);
    } catch {}
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
    } catch {}
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
    } catch {}
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

