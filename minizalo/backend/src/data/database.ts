export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'patient' | 'student' | 'admin';
  avatar: string;
  tier: 'Silver' | 'Gold' | 'Platinum';
  points: number;
  dob: string;
  gender: 'Nam' | 'Nữ';
  address: string;
  preferredBranch?: string;
  skinType?: string;
  healthNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface CourseEnrollment {
  id: string;
  code: string;
  courseId: string;
  courseTitle: string;
  courseImage: string;
  studentName: string;
  phone: string;
  email: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  hospital: string;
  experienceYears: number;
  rating: number;
  reviewsCount: number;
  avatar: string;
  consultationFee: number;
  bio: string;
}

export interface MedicalService {
  id: string;
  title: string;
  category: string;
  price: number;
  originalPrice?: number;
  durationMinutes: number;
  rating: number;
  reviewsCount: number;
  badge?: string;
  image: string;
  description: string;
  indicatorsCount: number;
  preparationNotes: string[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
}

export interface Booking {
  id: string;
  code: string;
  userId: string;
  userName: string;
  userPhone: string;
  serviceId: string;
  serviceTitle: string;
  doctorId: string;
  doctorName: string;
  branchId: string;
  branchName: string;
  date: string;
  timeSlot: string;
  price: number;
  discount: number;
  finalPrice: number;
  paymentMethod: 'vnpay' | 'momo' | 'zalopay' | 'hospital';
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  notes?: string;
  qrCode: string;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  price: number;
  duration: string;
  instructor: string;
  instructorAvatar: string;
  rating: number;
  studentsCount: number;
  badge?: string;
  image: string;
  description: string;
  modulesCount: number;
  lessonsCount: number;
  lessons: {
    id: string;
    title: string;
    duration: string;
    videoUrl: string;
    isCompleted: boolean;
  }[];
  quiz: {
    id: string;
    title: string;
    passingScore: number;
    questionsCount: number;
    questions: {
      id: string;
      question: string;
      options: string[];
      correctAnswerIndex: number;
    }[];
  };
}

export interface MedicalRecord {
  id: string;
  userId: string;
  recordCode: string;
  diagnosisDate: string;
  doctorName: string;
  facility: string;
  diagnosis: string;
  vitalSigns: {
    bloodPressure: string;
    heartRate: number;
    spO2: number;
    temperature: number;
    weight: number;
  };
  labIndicators: {
    name: string;
    value: string;
    unit: string;
    status: 'Bình thường' | 'Cao' | 'Thấp';
    referenceRange: string;
  }[];
  prescription: {
    medicineName: string;
    dosage: string;
    schedule: string;
    notes: string;
  }[];
  doctorAdvice: string;
}

export interface Voucher {
  code: string;
  discountAmount?: number;
  discountPercent?: number;
  minOrderValue: number;
  title: string;
  description: string;
  expiryDate: string;
  id?: string;
  scope?: 'service' | 'course' | 'all';
  discountType?: 'fixed' | 'percent';
  discountValue?: number;
  maxDiscountAmount?: number | null;
  applicableCategories?: string[];
  startsAt?: string;
  status?: 'available' | 'used' | 'expired';
}

// Initial In-Memory Database Seed
export const database = {
  users: [
    {
      id: 'usr_001',
      name: 'Nguyễn Minh Anh',
      phone: '0912345678',
      email: 'minh.anh@example.com',
      role: 'patient',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      tier: 'Gold',
      points: 2450,
      dob: '15/08/1998',
      gender: 'Nữ',
      address: '123 Đường Mẫu, Quận 3, TP. Hồ Chí Minh',
    },
    {
      id: 'usr_002',
      name: 'Trần Ngọc Linh',
      phone: '0987654321',
      email: 'ngoclinh@example.com',
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
      tier: 'Silver',
      points: 1250,
      dob: '22/11/1999',
      gender: 'Nữ',
      address: 'Cầu Giấy, Hà Nội',
    },
  ] as User[],

  doctors: [
    {
      id: 'doc_01',
      name: 'Trần Minh Phương',
      title: 'Kỹ thuật viên massage',
      specialty: 'Massage thư giãn & Dẫn lưu bạch huyết',
      hospital: 'MLD Chi nhánh Quận 3',
      experienceYears: 4,
      rating: 4.7,
      reviewsCount: 142,
      avatar: 'https://images.unsplash.com/photo-1594824813639-509930438d15?w=300&auto=format&fit=crop&q=80',
      consultationFee: 450000,
      bio: 'Phương là nhân viên chuyên viên massage giỏi, luôn hòa nhã và hướng dẫn liệu trình chu đáo.',
    },
    {
      id: 'doc_02',
      name: 'Nguyễn Thu Hà',
      title: 'Chuyên viên chăm sóc da',
      specialty: 'Chăm sóc da & Trị liệu chuyên sâu',
      hospital: 'MLD Chi nhánh Quận 3',
      experienceYears: 6,
      rating: 5.0,
      reviewsCount: 198,
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
      consultationFee: 650000,
      bio: 'Kinh nghiệm 6 năm chăm sóc da liễu và spa trị liệu, quy trình làm sạch dịu nhẹ và thư giãn tuyệt đối.',
    },
    {
      id: 'doc_03',
      name: 'Lê Hoài An',
      title: 'Chuyên viên chăm sóc cơ thể',
      specialty: 'Chăm sóc cơ thể & Giảm đau mỏi',
      hospital: 'MLD Chi nhánh Cầu Giấy',
      experienceYears: 5,
      rating: 4.8,
      reviewsCount: 120,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      consultationFee: 550000,
      bio: 'Chuyên gia xoa bóp trị liệu cơ xương khớp và chăm sóc thư giãn toàn thân bằng tinh dầu thiên nhiên.',
    },
  ] as Doctor[],

  branches: [
    {
      id: 'br_01',
      name: 'Chi nhánh mẫu 01 — Quận 3',
      address: '123 Đường Mẫu, Phường 10, Quận 3, TP. Hồ Chí Minh',
      city: 'TP. Hồ Chí Minh',
      phone: '028 3856 1234',
    },
    {
      id: 'br_02',
      name: 'Chi nhánh mẫu 02 — Cầu Giấy',
      address: '45 Đường Mẫu, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
      city: 'Hà Nội',
      phone: '024 3789 5678',
    },
  ] as Branch[],

  services: [
    {
      id: 'srv_01',
      title: 'Massage thư giãn toàn thân',
      category: 'Massage',
      price: 450000,
      originalPrice: 600000,
      durationMinutes: 60,
      rating: 4.9,
      reviewsCount: 312,
      badge: 'Phổ biến nhất',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop&q=80',
      description: 'Thả lỏng cơ thể trong không gian yên tĩnh. Bài trị liệu kết hợp tinh dầu thiên nhiên xua tan căng thẳng.',
      indicatorsCount: 4,
      preparationNotes: [
        'Đến trước giờ hẹn 10 phút để được phục vụ chu đáo nhất',
        'Uống trà thảo mộc chào mừng ấm nóng',
        'Báo trước với chuyên viên nếu bạn có vùng đau mỏi đặc biệt',
      ],
    },
    {
      id: 'srv_02',
      title: 'Chăm sóc da chuyên sâu',
      category: 'Chăm sóc da',
      price: 650000,
      originalPrice: 850000,
      durationMinutes: 90,
      rating: 5.0,
      reviewsCount: 245,
      badge: 'Yêu thích',
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&auto=format&fit=crop&q=80',
      description: 'Chăm sóc làn da với quy trình nhẹ nhàng, chu đáo. Làm sạch sâu, cấp ẩm đa tầng và nâng cơ.',
      indicatorsCount: 6,
      preparationNotes: [
        'Không tẩy tế bào chết hóa học mạnh trong 24h trước liệu trình',
        'Chuyên viên soi da và tư vấn liệu trình phù hợp riêng',
      ],
    },
    {
      id: 'srv_03',
      title: 'Dẫn lưu bạch huyết MLD Vodder',
      category: 'Dẫn lưu bạch huyết',
      price: 800000,
      originalPrice: 1100000,
      durationMinutes: 75,
      rating: 5.0,
      reviewsCount: 189,
      badge: 'Chuẩn Vodder',
      image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=500&auto=format&fit=crop&q=80',
      description: 'Phương pháp dẫn lưu dịch bạch huyết y khoa theo chuẩn Dr. Vodder Châu Âu, hỗ trợ thải độc và tăng miễn dịch.',
      indicatorsCount: 8,
      preparationNotes: [
        'Uống 1 cốc nước ấm trước khi thực hiện',
        'Nghỉ ngơi thả lỏng trong suốt quá trình kỹ thuật viên thao tác',
      ],
    },
    {
      id: 'srv_04',
      title: 'Trị liệu cơ xương khớp',
      category: 'Trị liệu',
      price: 550000,
      originalPrice: 700000,
      durationMinutes: 60,
      rating: 4.8,
      reviewsCount: 164,
      badge: 'Chuyên sâu',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&auto=format&fit=crop&q=80',
      description: 'Giải phóng bó cơ tắc nghẽn vùng cổ vai gáy và thắt lưng, cải thiện biên độ vận động tức thì.',
      indicatorsCount: 5,
      preparationNotes: [
        'Thông báo với kỹ thuật viên tiền sử chấn thương hoặc thoát vị nếu có',
      ],
    },
  ] as MedicalService[],

  bookings: [
    {
      id: 'bk_001',
      code: 'MED-2026-9812',
      userId: 'usr_001',
      userName: 'Nguyễn Minh Anh',
      userPhone: '0912345678',
      serviceId: 'srv_01',
      serviceTitle: 'Massage thư giãn toàn thân',
      doctorId: 'doc_01',
      doctorName: 'Trần Minh Phương',
      branchId: 'br_01',
      branchName: 'Chi nhánh mẫu 01 — Quận 3',
      date: '15/10/2026',
      timeSlot: '09:30 - 10:30',
      price: 450000,
      discount: 200000,
      finalPrice: 250000,
      paymentMethod: 'zalopay',
      status: 'confirmed',
      notes: 'Thư giãn giảm căng thẳng cổ vai gáy',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MED-2026-9812',
      createdAt: '12/10/2026 14:30',
    },
    {
      id: 'bk_002',
      code: 'MED-2026-7731',
      userId: 'usr_001',
      userName: 'Nguyễn Minh Anh',
      userPhone: '0912345678',
      serviceId: 'srv_02',
      serviceTitle: 'Chăm sóc da chuyên sâu',
      doctorId: 'doc_02',
      doctorName: 'Nguyễn Thu Hà',
      branchId: 'br_01',
      branchName: 'Chi nhánh mẫu 01 — Quận 3',
      date: '08/10/2026',
      timeSlot: '14:00 - 15:30',
      price: 650000,
      discount: 100000,
      finalPrice: 550000,
      paymentMethod: 'vnpay',
      status: 'completed',
      notes: 'Quy trình lụa cấp ẩm đa tầng',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MED-2026-7731',
      createdAt: '06/10/2026 10:15',
    },
    {
      id: 'bk_003',
      code: 'MED-2026-5510',
      userId: 'usr_001',
      userName: 'Nguyễn Minh Anh',
      userPhone: '0912345678',
      serviceId: 'srv_04',
      serviceTitle: 'Trị liệu cơ xương khớp',
      doctorId: 'doc_03',
      doctorName: 'Lê Hoài An',
      branchId: 'br_02',
      branchName: 'Chi nhánh mẫu 02 — Cầu Giấy',
      date: '01/10/2026',
      timeSlot: '16:00 - 17:00',
      price: 550000,
      discount: 0,
      finalPrice: 550000,
      paymentMethod: 'hospital',
      status: 'cancelled',
      notes: 'Bận công tác đột xuất',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MED-2026-5510',
      createdAt: '29/09/2026 15:20',
    },
  ] as Booking[],

  courses: [
    {
      id: 'crs_01',
      title: 'Kỹ Thuật Massage Chuyên Nghiệp',
      category: 'Đào Tạo Spa',
      price: 9000000,
      duration: '20 buổi (60 giờ)',
      instructor: 'Nguyễn Thanh Hương',
      instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
      rating: 4.9,
      studentsCount: 165,
      badge: 'Chứng Chỉ Quốc Gia',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&auto=format&fit=crop&q=80',
      description: 'Chương trình chuẩn đào tạo kỹ thuật viên spa từ nền tảng đến kỹ thuật chuyên sâu, thực hành trực tiếp trên mẫu.',
      modulesCount: 5,
      lessonsCount: 20,
      lessons: [
        {
          id: 'les_01',
          title: 'Bài 1: Tổng quan về giải phẫu hệ cơ và huyệt đạo',
          duration: '18:45',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          isCompleted: true,
        },
        {
          id: 'les_02',
          title: 'Bài 2: Kỹ thuật xoa bóp, day miết vùng vai gáy',
          duration: '24:10',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          isCompleted: true,
        },
        {
          id: 'les_03',
          title: 'Bài 3: Kỹ thuật ấn huyệt thư giãn toàn thân',
          duration: '32:00',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          isCompleted: false,
        },
      ],
      quiz: {
        id: 'qz_01',
        title: 'Bài kiểm tra lý thuyết Kỹ thuật Massage Chuyên Nghiệp',
        passingScore: 80,
        questionsCount: 3,
        questions: [
          {
            id: 'q1',
            question: 'Khi thực hiện massage thư giãn, lực tác động nên bắt đầu như thế nào?',
            options: [
              'Bắt đầu nhẹ nhàng làm quen rồi tăng dần theo ngưỡng chịu đựng',
              'Dùng lực tối đa ngay từ đầu',
              'Chỉ ấn mạnh vào các khớp xương',
              'Tùy ý không cần theo quy tắc',
            ],
            correctAnswerIndex: 0,
          },
          {
            id: 'q2',
            question: 'Huyệt Kiên Tỉnh nằm ở vị trí nào và có tác dụng gì?',
            options: [
              'Ở đỉnh vai, giúp giải tỏa đau mỏi cổ vai gáy',
              'Ở gan bàn chân, hỗ trợ giấc ngủ',
              'Ở hõm cổ, hỗ trợ hô hấp',
              'Ở thái dương, giảm đau đầu',
            ],
            correctAnswerIndex: 0,
          },
          {
            id: 'q3',
            question: 'Mục tiêu chính của liệu pháp Dẫn lưu bạch huyết (MLD) là gì?',
            options: [
              'Tăng thể tích cơ bắp',
              'Kích thích lưu thông dịch bạch huyết và đào thải độc tố tự nhiên',
              'Gây tê liệt dây thần kinh',
              'Làm khô da nhanh chóng',
            ],
            correctAnswerIndex: 1,
          },
        ],
      },
    },
    {
      id: 'crs_02',
      title: 'Dẫn Lưu Bạch Huyết MLD Vodder Quốc Tế',
      category: 'Đào Tạo MLD',
      price: 12000000,
      duration: '15 buổi (45 giờ)',
      instructor: 'Trần Minh Phương',
      instructorAvatar: 'https://images.unsplash.com/photo-1594824813639-509930438d15?w=200&auto=format&fit=crop&q=80',
      rating: 5.0,
      studentsCount: 98,
      badge: 'Chứng Chỉ Vodder',
      image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=500&auto=format&fit=crop&q=80',
      description: 'Chuyên đề sâu về hệ thống tuần hoàn bạch huyết chuẩn Châu Âu, ứng dụng thải độc và phục hồi hậu phẫu.',
      modulesCount: 4,
      lessonsCount: 15,
      lessons: [
        {
          id: 'les_mld_01',
          title: 'Bài 1: Sinh lý học hệ bạch huyết và cơ chế Vodder',
          duration: '22:30',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          isCompleted: true,
        },
      ],
      quiz: {
        id: 'qz_02',
        title: 'Sát hạch kỹ thuật Vodder',
        passingScore: 80,
        questionsCount: 2,
        questions: [
          {
            id: 'qm1',
            question: 'Lực áp dụng trong kỹ thuật Vodder chuẩn là bao nhiêu?',
            options: [
              'Rất nhẹ, chỉ khoảng 30 - 40 mmHg tác động lên lớp nông',
              'Rất mạnh, ấn sâu vào màng xương',
              'Không chạm vào da',
              'Dùng máy rung công suất cao',
            ],
            correctAnswerIndex: 0,
          },
          {
            id: 'qm2',
            question: 'Chiều vuốt dẫn lưu bạch huyết luôn hướng về đâu?',
            options: [
              'Hướng về các cụm hạch bạch huyết khu vực (nách, bẹn, cổ)',
              'Hướng ra đầu ngón tay và ngón chân',
              'Vuốt ngược chiều kim đồng hồ',
              'Không quan trọng hướng vuốt',
            ],
            correctAnswerIndex: 0,
          },
        ],
      },
    },
  ] as Course[],

  medicalRecords: [
    {
      id: 'rec_01',
      userId: 'usr_001',
      recordCode: 'EMR-2026-7841',
      diagnosisDate: '10/10/2026',
      doctorName: 'Trần Minh Phương',
      facility: 'MLD Vietnam - Chi nhánh Quận 3',
      diagnosis: 'Căng cơ cổ vai gáy do tư thế văn phòng, Đọng dịch bạch huyết nhẹ',
      vitalSigns: {
        bloodPressure: '120/80 mmHg',
        heartRate: 74,
        spO2: 99,
        temperature: 36.6,
        weight: 52.0,
      },
      labIndicators: [
        {
          name: 'Độ đàn hồi cơ vùng cổ',
          value: 'Khá cứng',
          unit: 'Thang điểm MLD',
          status: 'Cao',
          referenceRange: 'Mềm mại',
        },
        {
          name: 'Lưu thông dịch bạch huyết',
          value: 'Chậm',
          unit: 'Đánh giá vi tuần hoàn',
          status: 'Thấp',
          referenceRange: 'Bình thường',
        },
        {
          name: 'Độ ẩm tế bào biểu bì',
          value: '42%',
          unit: '%',
          status: 'Bình thường',
          referenceRange: '40% - 60%',
        },
      ],
      prescription: [
        {
          medicineName: 'Tinh dầu gừng & oải hương MLD Care',
          dosage: 'Thoa 1 lần / tối',
          schedule: 'Sau khi tắm',
          notes: 'Massage nhẹ nhàng vùng cổ vai gáy trước khi đi ngủ',
        },
        {
          medicineName: 'Trà thảo mộc thanh lọc MLD Herbal',
          dosage: '1 gói / ngày',
          schedule: 'Pha ấm uống buổi sáng',
          notes: 'Uống đủ 2 lít nước ấm mỗi ngày',
        },
      ],
      doctorAdvice: 'Thực hiện kéo giãn cơ cổ vai gáy sau mỗi 45 phút làm việc trên máy tính. Duy trì lịch dẫn lưu bạch huyết 1 lần/tuần.',
    },
  ] as MedicalRecord[],

  vouchers: [
    {
      code: 'MEDIVIP200',
      discountAmount: 200000,
      minOrderValue: 400000,
      title: 'Giảm 200.000 ₫ Đặt Lịch Spa',
      description: 'Áp dụng cho tất cả các dịch vụ Massage & Dẫn lưu bạch huyết tại MLD',
      expiryDate: '31/12/2026',
    },
    {
      code: 'MLD50',
      discountAmount: 50000,
      minOrderValue: 300000,
      title: 'Giảm 50.000 ₫ Khách Hàng Mới',
      description: 'Chào mừng bạn đến với MLD Vietnam',
      expiryDate: '30/11/2026',
    },
    {
      code: 'ACADEMY1000',
      discountAmount: 1000000,
      minOrderValue: 8000000,
      title: 'Giảm 1.000.000 ₫ Khóa Đào Tạo Nghề',
      description: 'Hỗ trợ học phí khóa học Kỹ thuật massage chuyên nghiệp',
      expiryDate: '31/12/2026',
    },
  ] as Voucher[],

  // Group W: Admin Data Seed
  admin: {
    kpis: {
      todayRevenue: 8550000,
      yesterdayRevenue: 7200000,
      newBookingsToday: 3,
      upcomingAppointments: 2,
      servingNow: 1,
      completedToday: 2,
      roomOccupancyRate: 85,
      cashOnHand: 2150000,
      bankTransfer: 6400000,
    },
    weeklyRevenue: [
      { day: '01/10', amount: 4500000 },
      { day: '02/10', amount: 5200000 },
      { day: '03/10', amount: 6800000 },
      { day: '04/10', amount: 6100000 },
      { day: '05/10', amount: 7200000 },
      { day: '06/10', amount: 8550000 },
      { day: '07/10', amount: 9100000 },
    ],
    staffSchedules: [
      {
        techId: 'doc_01',
        techName: 'Trần Minh Phương',
        role: 'Kỹ thuật viên massage',
        branch: 'Quận 3',
        morningSlot: '09:30 - 10:30 (Khách: Nguyễn Minh Anh - Massage thư giãn)',
        afternoonSlot: '14:00 - 15:00 (Khách: Đặng Quốc Huy - Massage thư giãn)',
        eveningSlot: '18:00 - 19:00 (Khách: Vũ Thảo Vy - Dẫn lưu bạch huyết)',
        status: 'Đang làm việc',
      },
      {
        techId: 'doc_02',
        techName: 'Nguyễn Thu Hà',
        role: 'Chuyên viên chăm sóc da',
        branch: 'Quận 3',
        morningSlot: '10:00 - 11:30 (Khách: Trần Ngọc Linh - Chăm sóc da chuyên sâu)',
        afternoonSlot: '14:30 - 16:00 (Trống lịch)',
        eveningSlot: '17:30 - 19:00 (Khách: Hoàng Hải Nam - Chăm sóc da)',
        status: 'Đang làm việc',
      },
      {
        techId: 'doc_03',
        techName: 'Lê Hoài An',
        role: 'Chuyên viên chăm sóc cơ thể',
        branch: 'Cầu Giấy',
        morningSlot: '09:00 - 10:00 (Trống lịch)',
        afternoonSlot: '13:30 - 15:00 (Khách: Lê Thị Lan - Trị liệu cơ khớp)',
        eveningSlot: '18:00 - 19:30 (Khách: Phạm Thanh Mai - Massage)',
        status: 'Sẵn sàng',
      },
    ],
    posReceipts: [
      {
        receiptCode: 'HD-2026-001',
        customerName: 'Nguyễn Minh Anh',
        serviceTitle: 'Massage thư giãn toàn thân (60 phút)',
        techName: 'Trần Minh Phương',
        room: 'Phòng 01 - Quận 3',
        amount: 450000,
        discount: 200000,
        finalAmount: 250000,
        paymentMethod: 'Chuyển khoản QR ngân hàng',
        status: 'Đã thanh toán',
        time: '12/10/2026 14:30',
      },
      {
        receiptCode: 'HD-2026-002',
        customerName: 'Trần Ngọc Linh',
        serviceTitle: 'Chăm sóc da chuyên sâu (90 phút)',
        techName: 'Nguyễn Thu Hà',
        room: 'Phòng 02 - Quận 3',
        amount: 650000,
        discount: 50000,
        finalAmount: 600000,
        paymentMethod: 'Tiền mặt',
        status: 'Đã thanh toán',
        time: '12/10/2026 11:30',
      },
      {
        receiptCode: 'HD-2026-003',
        customerName: 'Phạm Thanh Mai',
        serviceTitle: 'Học phí Kỹ Thuật Massage Chuyên Nghiệp',
        techName: 'Nguyễn Thanh Hương',
        room: 'Lớp K01 - Quận 3',
        amount: 9000000,
        discount: 1000000,
        finalAmount: 8000000,
        paymentMethod: 'Chuyển khoản Vietcombank',
        status: 'Đã thanh toán',
        time: '11/10/2026 16:00',
      },
    ],
    students: [
      {
        id: 'stu_01',
        name: 'Nguyễn Minh Anh',
        phone: '0912345678',
        courseTitle: 'Kỹ Thuật Massage Chuyên Nghiệp',
        courseId: 'crs_01',
        progress: 85,
        completedLessons: '17/20',
        feeStatus: 'Đã đóng đủ (9.000.000 ₫)',
        examScore: '92/100 (Đạt)',
        certificateStatus: 'Đã cấp chứng chỉ',
      },
      {
        id: 'stu_02',
        name: 'Vũ Thảo Vy',
        phone: '0933112233',
        courseTitle: 'Dẫn Lưu Bạch Huyết MLD Vodder Quốc Tế',
        courseId: 'crs_02',
        progress: 60,
        completedLessons: '9/15',
        feeStatus: 'Đã đóng đợt 1 (6.000.000 ₫)',
        examScore: 'Chưa thi',
        certificateStatus: 'Đang học',
      },
      {
        id: 'stu_03',
        name: 'Hoàng Hải Nam',
        phone: '0977889900',
        courseTitle: 'Kỹ Thuật Massage Chuyên Nghiệp',
        courseId: 'crs_01',
        progress: 100,
        completedLessons: '20/20',
        feeStatus: 'Đã đóng đủ (9.000.000 ₫)',
        examScore: '96/100 (Xuất sắc)',
        certificateStatus: 'Đã cấp chứng chỉ',
      },
    ],
  },
};
