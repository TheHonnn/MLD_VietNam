class CourseModel {
  final String id;
  final String title;
  final String category; // Massage, Chăm sóc da, Kỹ thuật chuyên sâu
  final String level; // Cơ bản, Nâng cao, Chuyên nghiệp
  final int durationWeeks;
  final int totalHours;
  final int theoryHours;
  final int practiceHours;
  final double tuitionFee;
  final double depositFee;
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
    return CourseModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      category: json['categoryName']?.toString() ?? json['category']?.toString() ?? 'Đào tạo Spa',
      level: json['level']?.toString() ?? 'Cơ bản',
      durationWeeks: (json['durationWeeks'] as num?)?.toInt() ?? 12,
      totalHours: (json['totalHours'] as num?)?.toInt() ?? (json['total_hours'] as num?)?.toInt() ?? 144,
      theoryHours: (json['theoryHours'] as num?)?.toInt() ?? (json['theory_hours'] as num?)?.toInt() ?? 48,
      practiceHours: (json['practiceHours'] as num?)?.toInt() ?? (json['practice_hours'] as num?)?.toInt() ?? 96,
      tuitionFee: (json['tuitionFee'] as num?)?.toDouble() ?? (json['tuition_fee'] as num?)?.toDouble() ?? 9000000,
      depositFee: (json['depositAmount'] as num?)?.toDouble() ?? (json['depositFee'] as num?)?.toDouble() ?? (json['deposit_amount'] as num?)?.toDouble() ?? 2000000,
      image: json['imageUrl']?.toString() ?? json['image']?.toString() ?? 'assets/images/gioithieu_1.png',
      instructorName: json['instructorName']?.toString() ?? 'ThS. Nguyễn Thu Hà',
      instructorTitle: json['instructorTitle']?.toString() ?? 'Giảng viên chuyên môn',
      instructorAvatar: json['instructorAvatar']?.toString() ?? 'assets/images/nguyen_thu_ha.png',
      branch: json['branchName']?.toString() ?? json['branch']?.toString() ?? 'Chi nhánh Quận 3',
      schedule: json['schedule']?.toString() ?? 'Thứ 6–7–Chủ nhật · 13:00–17:00',
      description: json['fullDescription']?.toString() ?? json['shortDescription']?.toString() ?? json['description']?.toString() ?? '',
      tag: json['tag']?.toString() ?? 'Thực hành chuyên nghiệp',
      progressPercentage: (json['progressPercentage'] as num?)?.toInt() ?? (json['progress_percentage'] as num?)?.toInt() ?? 45,
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
    CourseModel(
      id: 'course_01',
      title: 'Kỹ thuật Dẫn lưu bạch huyết MLD Chuyên Sâu',
      category: 'Người đang làm nghề',
      level: 'Chuyên nghiệp',
      durationWeeks: 12,
      totalHours: 144,
      theoryHours: 48,
      practiceHours: 96,
      tuitionFee: 9000000,
      depositFee: 0,
      image: 'assets/images/specialist_hero_1.png',
      instructorName: 'Nguyễn Thanh Hương',
      instructorTitle: 'Giảng viên kỹ thuật MLD',
      instructorAvatar: 'assets/images/nguyen_thu_ha.png',
      branch: 'Chi nhánh Quận 3',
      schedule: 'Thứ 6–7–Chủ nhật · 13:00–17:00',
      description: 'Chương trình đào tạo nâng cao dành cho KTV đang làm nghề: phác đồ Vodder, can thiệp hậu phẫu và kiểm soát phù bạch huyết chuẩn y khoa.',
    ),
    CourseModel(
      id: 'course_02',
      title: 'Kỹ thuật Trị liệu Phục Hồi Hậu Phẫu Nâng Cao',
      category: 'Người đang làm nghề',
      level: 'Nâng cao',
      durationWeeks: 8,
      totalHours: 96,
      theoryHours: 32,
      practiceHours: 64,
      tuitionFee: 7500000,
      depositFee: 0,
      image: 'assets/images/branch_room_1.png',
      instructorName: 'Trần Minh Phương',
      instructorTitle: 'Chuyên gia Da liễu & Trị liệu',
      instructorAvatar: 'assets/images/tran_minh_phuong.png',
      branch: 'Chi nhánh Quận 3',
      schedule: 'Thứ 2–4–6 · 09:00–12:00',
      description: 'Nâng cao tay nghề cho chuyên viên: xử lý biến chứng phù dịch mô mềm, chăm sóc bệnh nhân sau phẫu thuật thẩm mỹ và tạo hình.',
      progressPercentage: 0,
      status: 'UPCOMING',
    ),
    CourseModel(
      id: 'course_03',
      title: 'Khóa học Nghề Trị Liệu & MLD Cho Người Mới Bắt Đầu',
      category: 'Người mới bắt đầu làm nghề',
      level: 'Cơ bản',
      durationWeeks: 6,
      totalHours: 72,
      theoryHours: 24,
      practiceHours: 48,
      tuitionFee: 5000000,
      depositFee: 0,
      image: 'assets/images/branch_hero_1.png',
      instructorName: 'Lê Hoài An',
      instructorTitle: 'Kỹ thuật viên Trưởng',
      instructorAvatar: 'assets/images/le_hoai_an.png',
      branch: 'Chi nhánh mẫu 02 — Quận 1',
      schedule: 'Thứ 3–5–7 · 18:00–21:00',
      description: 'Dành riêng cho người mới bắt đầu bước chân vào nghề: giải phẫu học cơ bản, nguyên lý dòng chảy bạch huyết và thao tác cầm tay chỉ việc.',
      progressPercentage: 100,
      status: 'COMPLETED',
    ),
    CourseModel(
      id: 'course_04',
      title: 'Đào Tạo Thực Hành KTV Trị Liệu Nền Tảng',
      category: 'Người mới bắt đầu làm nghề',
      level: 'Cơ bản',
      durationWeeks: 10,
      totalHours: 120,
      theoryHours: 40,
      practiceHours: 80,
      tuitionFee: 8500000,
      depositFee: 0,
      image: 'assets/images/specialist_avatar_1.png',
      instructorName: 'Nguyễn Thanh Hương',
      instructorTitle: 'Giảng viên kỹ thuật MLD',
      instructorAvatar: 'assets/images/nguyen_thu_ha.png',
      branch: 'Chi nhánh Quận 3',
      schedule: 'Thứ 7–Chủ nhật · 08:30–17:30',
      description: 'Chương trình toàn diện trang bị nghề nghiệp vững chắc cho người mới: quy chuẩn phòng khám, giao tiếp khách hàng và thực hành 100% trên người thật.',
    ),
  ];

  static const List<InstructorModel> instructors = [
    InstructorModel(
      id: 'inst_01',
      name: 'Nguyễn Thanh Hương',
      title: 'Giảng viên kỹ thuật Spa',
      specialties: ['Massage', 'Chăm sóc cơ thể', 'Quy trình dịch vụ'],
      avatar: 'assets/images/nguyen_thu_ha.png',
      bio: 'Cô Hương đồng hành cùng học viên từ thao tác nền tảng đến thực hành quy trình hoàn chỉnh. Phương pháp hướng dẫn chú trọng vệ sinh, giao tiếp và điều chỉnh thao tác theo phản hồi của khách hàng.',
    ),
    InstructorModel(
      id: 'inst_02',
      name: 'Trần Minh Phương',
      title: 'Chuyên gia Da liễu & Trị liệu',
      specialties: ['Chăm sóc da', 'Peel sinh học', 'Điện di y khoa'],
      avatar: 'assets/images/tran_minh_phuong.png',
      bio: 'Chuyên gia đào tạo chuyên sâu về cấu trúc da, phân tích bệnh lý da và phác đồ điều trị chuẩn y khoa với 8 năm kinh nghiệm.',
    ),
    InstructorModel(
      id: 'inst_03',
      name: 'Lê Hoài An',
      title: 'Kỹ thuật viên Trưởng',
      specialties: ['Massage bấm huyệt', 'Dưỡng sinh Đông Y'],
      avatar: 'assets/images/le_hoai_an.png',
      bio: 'Nhiều năm kinh nghiệm đào tạo thực tế, tận tâm chỉ dẫn từng thao tác bấm huyệt và thái độ phục vụ khách hàng chuẩn 5 sao.',
    ),
  ];

  static const InstructorModel defaultInstructor = InstructorModel(
    id: 'inst_01',
    name: 'Nguyễn Thanh Hương',
    title: 'Giảng viên kỹ thuật Spa',
    specialties: ['Massage', 'Chăm sóc cơ thể', 'Quy trình dịch vụ'],
    avatar: 'assets/images/nguyen_thu_ha.png',
    bio: 'Cô Hương đồng hành cùng học viên từ thao tác nền tảng đến thực hành quy trình hoàn chỉnh. Phương pháp hướng dẫn chú trọng vệ sinh, giao tiếp và điều chỉnh thao tác theo phản hồi của khách hàng.',
  );

  static const List<ChapterModel> syllabusChapters = [
    ChapterModel(
      id: 'ch_01',
      title: 'Chương 1: Giới thiệu nghề Spa',
      isCompleted: true,
      lessons: [
        LessonModel(id: 'les_01', title: 'Bài 1: Tổng quan ngành Spa', durationMinutes: 12, isCompleted: true),
        LessonModel(id: 'les_02', title: 'Bài 2: Vệ sinh & Quy chuẩn phòng dịch vụ', durationMinutes: 15, isCompleted: true),
        LessonModel(id: 'les_03', title: 'Bài 3: Giao tiếp & Tư vấn khách hàng', durationMinutes: 18, isCompleted: true),
      ],
    ),
    ChapterModel(
      id: 'ch_02',
      title: 'Chương 2: Giải phẫu & Huyệt đạo cơ bản',
      isCompleted: false,
      lessons: [
        LessonModel(id: 'les_04', title: 'Bài 4: Hệ cơ và hệ tuần hoàn vùng cổ vai', durationMinutes: 20, isCompleted: true),
        LessonModel(id: 'les_05', title: 'Bài 05: Kỹ thuật Massage cơ bản', durationMinutes: 18, isCompleted: false),
        LessonModel(id: 'les_06', title: 'Bài 6: Định vị các huyệt đạo trọng yếu', durationMinutes: 22, isCompleted: false),
      ],
    ),
    ChapterModel(
      id: 'ch_03',
      title: 'Chương 3: Thực hành kỹ thuật xoa bóp trị liệu',
      isCompleted: false,
      lessons: [
        LessonModel(id: 'les_07', title: 'Bài 7: Kỹ thuật miết, day và ấn huyệt', durationMinutes: 25, isCompleted: false),
        LessonModel(id: 'les_08', title: 'Bài 8: Thực hành massage toàn thân 60 phút', durationMinutes: 30, isCompleted: false),
      ],
    ),
  ];

  static List<AttendanceScheduleItem> getAttendanceSchedule() {
    return [
      AttendanceScheduleItem(
        date: DateTime(2026, 10, 12),
        timeSlot: '13:00–17:00',
        title: 'Lý thuyết huyệt đạo vùng đầu và cổ vai gáy',
        room: 'Phòng học lý thuyết 01',
        type: 'class',
      ),
      AttendanceScheduleItem(
        date: DateTime(2026, 10, 14),
        timeSlot: '19:00–21:00',
        title: 'Thảo luận trực tuyến: Phân biệt các loại tinh dầu',
        room: 'Zoom Online',
        type: 'online',
      ),
      AttendanceScheduleItem(
        date: DateTime(2026, 10, 16),
        timeSlot: '13:00–17:00',
        title: 'Thực hành kỹ thuật massage vai gáy',
        room: 'Phòng thực hành 02',
        type: 'practice',
      ),
      AttendanceScheduleItem(
        date: DateTime(2026, 10, 17),
        timeSlot: '13:00–17:00',
        title: 'Thực hành quy trình chăm sóc body toàn diện',
        room: 'Phòng thực hành 02',
        type: 'practice',
      ),
      AttendanceScheduleItem(
        date: DateTime(2026, 10, 18),
        timeSlot: '14:00–16:00',
        title: 'Kiểm tra kỹ năng thực hành giữa kỳ',
        room: 'Phòng thi thực hành 01',
        type: 'exam',
      ),
    ];
  }
}
