import 'dart:convert';

class CourseModel {
  final String id;
  final String title;
  final String category; // 'Người mới bắt đầu' / 'Người đang làm nghề'
  final String level; // Cơ bản, Nâng cao, Chuyên nghiệp, Master
  final int durationWeeks;
  final int totalHours;
  final int theoryHours;
  final int practiceHours;
  final double tuitionFee;
  final double depositFee;
  final double? originalPrice;
  final String targetAudience;
  final String targetNeed;
  final String courseGroup;
  final String image;
  final String instructorName;
  final String instructorTitle;
  final String instructorAvatar;
  final String branch;
  final String schedule;
  final String description;
  final String tag;
  final int progressPercentage;
  final String status; // 'IN_PROGRESS', 'UPCOMING', 'COMPLETED'

  const CourseModel({
    required this.id,
    required this.title,
    required this.category,
    required this.level,
    required this.durationWeeks,
    required this.totalHours,
    required this.theoryHours,
    required this.practiceHours,
    required this.tuitionFee,
    required this.depositFee,
    this.originalPrice,
    this.targetAudience = 'Tất cả đối tượng',
    this.targetNeed = 'Tất cả nhu cầu',
    this.courseGroup = 'Người mới bắt đầu',
    required this.image,
    required this.instructorName,
    required this.instructorTitle,
    required this.instructorAvatar,
    required this.branch,
    required this.schedule,
    required this.description,
    this.tag = 'Thực hành chuyên nghiệp',
    this.progressPercentage = 45,
    this.status = 'IN_PROGRESS',
  });

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> outcomes = {};
    if (json['learning_outcomes'] is Map) {
      outcomes = Map<String, dynamic>.from(json['learning_outcomes'] as Map);
    } else if (json['learning_outcomes'] is String) {
      try {
        final decoded = jsonDecode(json['learning_outcomes']);
        if (decoded is Map) outcomes = Map<String, dynamic>.from(decoded);
      } catch (_) {}
    }

    final audience = json['targetAudience']?.toString() ??
        outcomes['target_audience']?.toString() ??
        'Tất cả đối tượng';
    final need = json['targetNeed']?.toString() ??
        outcomes['target_need']?.toString() ??
        'Tất cả nhu cầu';
    final group = json['courseGroup']?.toString() ??
        outcomes['course_group']?.toString() ??
        (json['categoryName']?.toString() ?? json['category']?.toString() ?? 'Người mới bắt đầu');
    final orig = (json['originalPrice'] as num?)?.toDouble() ??
        (outcomes['original_price'] as num?)?.toDouble();

    return CourseModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      category: json['categoryName']?.toString() ?? json['category']?.toString() ?? group,
      level: json['level']?.toString() ?? 'Cơ bản',
      durationWeeks: (json['durationWeeks'] as num?)?.toInt() ?? 12,
      totalHours: (json['totalHours'] as num?)?.toInt() ?? (json['total_hours'] as num?)?.toInt() ?? 144,
      theoryHours: (json['theoryHours'] as num?)?.toInt() ?? (json['theory_hours'] as num?)?.toInt() ?? 48,
      practiceHours: (json['practiceHours'] as num?)?.toInt() ?? (json['practice_hours'] as num?)?.toInt() ?? 96,
      tuitionFee: (json['tuitionFee'] as num?)?.toDouble() ?? (json['tuition_fee'] as num?)?.toDouble() ?? 9000000,
      depositFee: (json['depositAmount'] as num?)?.toDouble() ?? (json['depositFee'] as num?)?.toDouble() ?? (json['deposit_amount'] as num?)?.toDouble() ?? 2000000,
      originalPrice: orig,
      targetAudience: audience,
      targetNeed: need,
      courseGroup: group,
      image: json['imageUrl']?.toString() ?? json['image_url']?.toString() ?? json['image']?.toString() ?? 'assets/images/gioithieu_1.png',
      instructorName: json['instructorName']?.toString() ?? 'ThS. Nguyễn Thu Hà',
      instructorTitle: json['instructorTitle']?.toString() ?? 'Giảng viên chuyên môn MLD',
      instructorAvatar: json['instructorAvatar']?.toString() ?? 'assets/images/nguyen_thu_ha.png',
      branch: json['branchName']?.toString() ?? json['branch']?.toString() ?? 'Học viện MLD Việt Nam',
      schedule: json['schedule']?.toString() ?? 'Thứ 6–7–Chủ nhật · 13:00–17:00',
      description: json['fullDescription']?.toString() ?? json['shortDescription']?.toString() ?? json['full_description']?.toString() ?? json['description']?.toString() ?? '',
      tag: json['tag']?.toString() ?? 'Chứng nhận Y khoa',
      progressPercentage: (json['progressPercentage'] as num?)?.toInt() ?? (json['progress_percentage'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString() ?? 'IN_PROGRESS',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'category': category,
    'level': level,
    'durationWeeks': durationWeeks,
    'totalHours': totalHours,
    'theoryHours': theoryHours,
    'practiceHours': practiceHours,
    'tuitionFee': tuitionFee,
    'depositFee': depositFee,
    'originalPrice': originalPrice,
    'targetAudience': targetAudience,
    'targetNeed': targetNeed,
    'courseGroup': courseGroup,
    'image': image,
    'instructorName': instructorName,
    'instructorTitle': instructorTitle,
    'instructorAvatar': instructorAvatar,
    'branch': branch,
    'schedule': schedule,
    'description': description,
    'tag': tag,
    'progressPercentage': progressPercentage,
    'status': status,
  };

  int get sessionCount {
    final match = RegExp(r'(\\d+)\\s*buổi').firstMatch(schedule);
    if (match != null) {
      return int.tryParse(match.group(1)!) ?? (totalHours ~/ 4 > 0 ? totalHours ~/ 4 : 1);
    }
    if (totalHours <= 8) return 2;
    if (totalHours <= 16) return 4;
    if (totalHours <= 24) return 6;
    if (totalHours <= 48) return 12;
    if (totalHours <= 72) return 18;
    return (totalHours ~/ 4 > 0 ? totalHours ~/ 4 : 1);
  }

  int? get discountPercentage {
    if (originalPrice != null && originalPrice! > tuitionFee && originalPrice! > 0) {
      return (((originalPrice! - tuitionFee) / originalPrice!) * 100).round();
    }
    return null;
  }
}

class InstructorModel {
  final String id;
  final String name;
  final String title;
  final List<String> specialties;
  final String avatar;
  final String bio;

  const InstructorModel({
    required this.id,
    required this.name,
    required this.title,
    required this.specialties,
    required this.avatar,
    required this.bio,
  });
}

class LessonModel {
  final String id;
  final String title;
  final int durationMinutes;
  final bool isCompleted;

  const LessonModel({
    required this.id,
    required this.title,
    required this.durationMinutes,
    this.isCompleted = false,
  });
}

class ChapterModel {
  final String id;
  final String title;
  final bool isCompleted;
  final List<LessonModel> lessons;

  const ChapterModel({
    required this.id,
    required this.title,
    this.isCompleted = false,
    required this.lessons,
  });
}

class AttendanceScheduleItem {
  final DateTime date;
  final String timeSlot;
  final String title;
  final String room;
  final String type; // online, class, practice, exam

  const AttendanceScheduleItem({
    required this.date,
    required this.timeSlot,
    required this.title,
    required this.room,
    required this.type,
  });
}

class MockAcademyData {
  static const List<CourseModel> courses = [
    // --- 1. Nhóm: Người mới bắt đầu ---
    CourseModel(
      id: '30303030-0001-0001-0001-000000000001',
      title: 'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI MỚI BẮT ĐẦU - Level 0',
      category: 'Người mới bắt đầu',
      courseGroup: 'Người mới bắt đầu',
      targetAudience: 'Người mới bắt đầu học nghề',
      targetNeed: 'Học để có kiến thức nền tảng và tự chăm sóc cơ bản',
      level: 'Cơ bản',
      durationWeeks: 4,
      totalHours: 24,
      theoryHours: 12,
      practiceHours: 12,
      tuitionFee: 599000,
      depositFee: 200000,
      originalPrice: 6000000,
      image: 'assets/images/course_banner_clean.png',
      instructorName: 'ThS. Nguyễn Thu Hà',
      instructorTitle: 'Giảng viên chuyên môn MLD',
      instructorAvatar: 'assets/images/nguyen_thu_ha.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: '6 buổi · Linh hoạt online & thực hành',
      description: 'Lý thuyết nền tảng Master Lymphatic Therapy Level 0. Hiểu sâu về dòng chảy hệ bạch huyết, cấu trúc mao mạch và nguyên lý kích hoạt tự chữa lành của cơ thể.',
      tag: 'Cấp chứng nhận Level 0',
    ),
    CourseModel(
      id: '30303030-0001-0001-0001-000000000003',
      title: 'Workshop: HƯỚNG DẪN PHÒNG NGỪA PHÙ TAY SAU PHẪU THUẬT UNG THƯ VÚ',
      category: 'Người mới bắt đầu',
      courseGroup: 'Người mới bắt đầu',
      targetAudience: 'Người mới bắt đầu học nghề',
      targetNeed: 'Học để có kiến thức nền tảng và tự chăm sóc cơ bản',
      level: 'Cơ bản',
      durationWeeks: 1,
      totalHours: 8,
      theoryHours: 4,
      practiceHours: 4,
      tuitionFee: 350000,
      depositFee: 100000,
      originalPrice: 350000,
      image: 'assets/images/course_banner_clean.png',
      instructorName: 'Trần Minh Phương',
      instructorTitle: 'Chuyên gia Trị liệu & Phục hồi',
      instructorAvatar: 'assets/images/tran_minh_phuong.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Chủ nhật · 09:00–12:00',
      description: 'Chuyên đề lâm sàng hướng dẫn thực hành các kỹ thuật tự dẫn lưu nhẹ nhàng và tư thế sinh hoạt tránh ứ trệ dịch bạch huyết sau phẫu thuật ung thư vú.',
      tag: 'Workshop chuyên đề',
    ),
    CourseModel(
      id: '30303030-0001-0001-0001-000000000004',
      title: 'Workshop: HƯỚNG DẪN XÂY DỰNG CHẾ ĐỘ ĂN PHÒNG NGỪA BỆNH LÝ TUYẾN VÚ',
      category: 'Người mới bắt đầu',
      courseGroup: 'Người mới bắt đầu',
      targetAudience: 'Người mới bắt đầu học nghề',
      targetNeed: 'Học để có kiến thức nền tảng và tự chăm sóc cơ bản',
      level: 'Cơ bản',
      durationWeeks: 1,
      totalHours: 8,
      theoryHours: 4,
      practiceHours: 4,
      tuitionFee: 350000,
      depositFee: 100000,
      originalPrice: 350000,
      image: 'assets/images/course_banner_clean.png',
      instructorName: 'ThS. Nguyễn Thu Hà',
      instructorTitle: 'Chuyên gia Dinh dưỡng & Miễn dịch',
      instructorAvatar: 'assets/images/nguyen_thu_ha.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Thứ 7 · 14:00–17:00',
      description: 'Workshop dinh dưỡng trị liệu: Nguyên lý tương tác giữa dinh dưỡng kháng viêm và dòng chảy hệ tuần hoàn bạch huyết, chế độ ăn lành mạnh bảo vệ tuyến vú.',
      tag: 'Workshop dinh dưỡng',
    ),
    CourseModel(
      id: '30303030-0001-0001-0001-000000000005',
      title: 'Workshop: HƯỚNG DẪN VẬN ĐỘNG PHÒNG NGỪA PHÙ TAY SAU PHẪU THUẬT TUYẾN VÚ',
      category: 'Người mới bắt đầu',
      courseGroup: 'Người mới bắt đầu',
      targetAudience: 'Người mới bắt đầu học nghề',
      targetNeed: 'Học để có kiến thức nền tảng và tự chăm sóc cơ bản',
      level: 'Cơ bản',
      durationWeeks: 1,
      totalHours: 8,
      theoryHours: 4,
      practiceHours: 4,
      tuitionFee: 350000,
      depositFee: 100000,
      originalPrice: 350000,
      image: 'assets/images/course_banner_clean.png',
      instructorName: 'Lê Hoài An',
      instructorTitle: 'Kỹ thuật viên Trưởng',
      instructorAvatar: 'assets/images/le_hoai_an.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Chủ nhật · 14:00–17:00',
      description: 'Bài tập vận động nhẹ nhàng kích hoạt bơm cơ mao mạch vùng ngực và cánh tay, duy trì tầm vận động khớp và chống phù nề sau mổ.',
      tag: 'Workshop phục hồi',
    ),

    // --- 2. Nhóm: Người đang làm nghề ---
    CourseModel(
      id: '30303030-0001-0001-0001-000000000002',
      title: 'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI LÀM NGHỀ',
      category: 'Người đang làm nghề',
      courseGroup: 'Người đang làm nghề',
      targetAudience: 'Kỹ thuật viên XBBH/PHCN/VLTL',
      targetNeed: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      level: 'Chuyên nghiệp',
      durationWeeks: 6,
      totalHours: 72,
      theoryHours: 24,
      practiceHours: 48,
      tuitionFee: 15000000,
      depositFee: 3000000,
      originalPrice: 30000000,
      image: 'assets/images/course_banner_clean.png',
      instructorName: 'Nguyễn Thanh Hương',
      instructorTitle: 'Giảng viên kỹ thuật MLD Vodder',
      instructorAvatar: 'assets/images/nguyen_thu_ha.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Thứ 6–7–Chủ nhật · 13:00–17:00',
      description: 'Chuẩn hóa kỹ thuật dẫn lưu bạch huyết thủ công Vodder quốc tế với áp lực 30-40 mmHg. Đào tạo cầm tay chỉ việc, ứng dụng ngay vào cơ sở chăm sóc sức khỏe.',
      tag: 'Chứng chỉ hành nghề MLD',
    ),
    CourseModel(
      id: '30303030-0001-0001-0001-000000000006',
      title: 'DẪN LƯU BẠCH HUYẾT NÂNG CAO CHO NGƯỜI LÀM NGHỀ',
      category: 'Người đang làm nghề',
      courseGroup: 'Người đang làm nghề',
      targetAudience: 'Kỹ thuật viên XBBH/PHCN/VLTL',
      targetNeed: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      level: 'Nâng cao',
      durationWeeks: 8,
      totalHours: 96,
      theoryHours: 32,
      practiceHours: 64,
      tuitionFee: 25000000,
      depositFee: 5000000,
      originalPrice: 30000000,
      image: 'assets/images/course_banner_clean.png',
      instructorName: 'Nguyễn Thanh Hương',
      instructorTitle: 'Giảng viên kỹ thuật MLD Vodder',
      instructorAvatar: 'assets/images/nguyen_thu_ha.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Thứ 2–4–6 · 09:00–12:00',
      description: 'Kỹ thuật can thiệp sâu các trường hợp phù bạch huyết phức tạp, điều trị phục hồi sau phẫu thuật thẩm mỹ và tạo hình, nạo vét hạch hoặc xạ trị.',
      tag: 'Kỹ thuật viên Chuyên sâu',
    ),
    CourseModel(
      id: '30303030-0001-0001-0001-000000000007',
      title: 'GIẢM PHÙ BẰNG DẪN LƯU BẠCH HUYẾT VÀ BĂNG ÉP CDT',
      category: 'Người đang làm nghề',
      courseGroup: 'Người đang làm nghề',
      targetAudience: 'Nhân viên y tế/bác sĩ',
      targetNeed: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      level: 'Chuyên gia',
      durationWeeks: 10,
      totalHours: 120,
      theoryHours: 40,
      practiceHours: 80,
      tuitionFee: 30000000,
      depositFee: 6000000,
      originalPrice: 35000000,
      image: 'assets/images/course_banner_clean.png',
      instructorName: 'BS. Lê Hoài An',
      instructorTitle: 'Chuyên gia Y học Phục hồi & CDT',
      instructorAvatar: 'assets/images/le_hoai_an.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Thứ 3–5–7 · 13:30–17:30',
      description: 'Liệu pháp phức hợp giảm ứ trệ dịch (CDT): phối hợp kỹ thuật xoa bóp dẫn lưu Vodder và nghệ thuật băng ép nhiều lớp phân tầng áp lực chuẩn y học.',
      tag: 'Chứng chỉ Chuyên đề CDT',
    ),
    CourseModel(
      id: '30303030-0001-0001-0001-000000000008',
      title: 'LYMPHATIC WELLNESS SIGNATURE PROGRAM',
      category: 'Người đang làm nghề',
      courseGroup: 'Người đang làm nghề',
      targetAudience: 'Spa & Wellness',
      targetNeed: 'Học nghề để mở cơ sở chăm sóc',
      level: 'Master',
      durationWeeks: 16,
      totalHours: 200,
      theoryHours: 60,
      practiceHours: 140,
      tuitionFee: 350000000,
      depositFee: 50000000,
      originalPrice: 350000000,
      image: 'assets/images/course_banner_clean.png',
      instructorName: 'Ban Cố Vấn Y Khoa MLD',
      instructorTitle: 'Hội đồng Chuyên gia Quốc tế',
      instructorAvatar: 'assets/images/nguyen_thu_ha.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Chương trình chuyển giao độc quyền toàn diện',
      description: 'Chương trình chuyển giao toàn diện mô hình Trung tâm Chăm sóc Phục hồi Hệ Bạch huyết: đào tạo chuyên môn độc quyền, quy chuẩn phòng khám, cấp chứng nhận thương hiệu và tư vấn vận hành.',
      tag: 'Chuyển giao Toàn diện',
    ),
  ];

  static const List<InstructorModel> instructors = [
    InstructorModel(
      id: 'inst_01',
      name: 'ThS. Nguyễn Thu Hà',
      title: 'Giảng viên chuyên môn MLD',
      specialties: ['Dẫn lưu bạch huyết', 'Dinh dưỡng kháng viêm', 'Phục hồi chức năng'],
      avatar: 'assets/images/nguyen_thu_ha.png',
      bio: 'Thạc sĩ chuyên ngành y học phục hồi với hơn 10 năm nghiên cứu và giảng dạy liệu pháp dẫn lưu bạch huyết Vodder chuẩn quốc tế.',
    ),
    InstructorModel(
      id: 'inst_02',
      name: 'Trần Minh Phương',
      title: 'Chuyên gia Da liễu & Trị liệu',
      specialties: ['Chăm sóc hậu phẫu', 'Phù bạch huyết chi', 'Điện di y khoa'],
      avatar: 'assets/images/tran_minh_phuong.png',
      bio: 'Chuyên gia đào tạo chuyên sâu về cấu trúc vi tuần hoàn, can thiệp giảm phù nề sau phẫu thuật tạo hình thẩm mỹ.',
    ),
    InstructorModel(
      id: 'inst_03',
      name: 'Lê Hoài An',
      title: 'Kỹ thuật viên Trưởng',
      specialties: ['Băng ép CDT', 'Thực hành thao tác Vodder', 'Vận động trị liệu'],
      avatar: 'assets/images/le_hoai_an.png',
      bio: 'Nhiều năm kinh nghiệm đào tạo thực tế, trực tiếp hướng dẫn học viên từng lực ấn nhẹ 30-40 mmHg và kỹ thuật băng ép đa lớp.',
    ),
  ];

  static const InstructorModel defaultInstructor = InstructorModel(
    id: 'inst_01',
    name: 'ThS. Nguyễn Thu Hà',
    title: 'Giảng viên chuyên môn MLD',
    specialties: ['Dẫn lưu bạch huyết', 'Dinh dưỡng kháng viêm', 'Phục hồi chức năng'],
    avatar: 'assets/images/nguyen_thu_ha.png',
    bio: 'Thạc sĩ chuyên ngành y học phục hồi với hơn 10 năm nghiên cứu và giảng dạy liệu pháp dẫn lưu bạch huyết Vodder chuẩn quốc tế.',
  );

  static const List<ChapterModel> syllabusChapters = [
    ChapterModel(
      id: 'ch_01',
      title: 'Chương 1: Giải phẫu & Sinh lý hệ bạch huyết',
      isCompleted: true,
      lessons: [
        LessonModel(id: 'les_01', title: 'Bài 1: Tổng quan và nguồn gốc phương pháp Emil Vodder', durationMinutes: 15, isCompleted: true),
        LessonModel(id: 'les_02', title: 'Bài 2: Cấu tạo mao mạch và hạch bạch huyết', durationMinutes: 20, isCompleted: true),
        LessonModel(id: 'les_03', title: 'Bài 3: Áp lực mô và cơ chế hình thành dịch phù', durationMinutes: 25, isCompleted: true),
      ],
    ),
    ChapterModel(
      id: 'ch_02',
      title: 'Chương 2: Nguyên lý 4 thao tác dẫn lưu cơ bản',
      isCompleted: false,
      lessons: [
        LessonModel(id: 'les_04', title: 'Bài 4: Thao tác xoay tròn tĩnh (Stationary Circles)', durationMinutes: 20, isCompleted: true),
        LessonModel(id: 'les_05', title: 'Bài 5: Thao tác ép bơm (Pump technique)', durationMinutes: 25, isCompleted: false),
        LessonModel(id: 'les_06', title: 'Bài 6: Thao tác múc và cuộn (Scoop & Rotary)', durationMinutes: 30, isCompleted: false),
      ],
    ),
    ChapterModel(
      id: 'ch_03',
      title: 'Chương 3: Phác đồ lâm sàng & Thực hành cầm tay chỉ việc',
      isCompleted: false,
      lessons: [
        LessonModel(id: 'les_07', title: 'Bài 7: Quy trình dẫn lưu vùng cổ vai gáy và đầu mặt', durationMinutes: 30, isCompleted: false),
        LessonModel(id: 'les_08', title: 'Bài 8: Xử lý phù chi và phòng ngừa biến chứng', durationMinutes: 35, isCompleted: false),
      ],
    ),
  ];

  static List<AttendanceScheduleItem> getAttendanceSchedule() {
    return [
      AttendanceScheduleItem(
        date: DateTime(2026, 10, 12),
        timeSlot: '13:00–17:00',
        title: 'Lý thuyết hệ tuần hoàn bạch huyết và dòng chảy mao mạch',
        room: 'Phòng học lý thuyết 01',
        type: 'class',
      ),
      AttendanceScheduleItem(
        date: DateTime(2026, 10, 14),
        timeSlot: '19:00–21:00',
        title: 'Thảo luận trực tuyến: Định vị hạch bạch huyết trọng yếu',
        room: 'Zoom Online',
        type: 'online',
      ),
      AttendanceScheduleItem(
        date: DateTime(2026, 10, 16),
        timeSlot: '13:00–17:00',
        title: 'Thực hành thao tác xoay tròn và ép bơm Vodder 30-40 mmHg',
        room: 'Phòng thực hành 02',
        type: 'practice',
      ),
      AttendanceScheduleItem(
        date: DateTime(2026, 10, 17),
        timeSlot: '13:00–17:00',
        title: 'Thực hành phác đồ dẫn lưu giải phù toàn thân',
        room: 'Phòng thực hành 02',
        type: 'practice',
      ),
      AttendanceScheduleItem(
        date: DateTime(2026, 10, 18),
        timeSlot: '14:00–16:00',
        title: 'Kiểm tra kỹ năng thực hành lâm sàng tốt nghiệp',
        room: 'Phòng thi thực hành 01',
        type: 'exam',
      ),
    ];
  }
}
