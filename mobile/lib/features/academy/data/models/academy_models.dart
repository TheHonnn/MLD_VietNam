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
    this.progressPercentage = 0,
    this.status = 'UPCOMING',
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
      status: json['status']?.toString() ?? 'UPCOMING',
    );
  }

  CourseModel copyWith({
    String? id,
    String? title,
    String? category,
    String? level,
    int? durationWeeks,
    int? totalHours,
    int? theoryHours,
    int? practiceHours,
    double? tuitionFee,
    double? depositFee,
    double? originalPrice,
    String? targetAudience,
    String? targetNeed,
    String? courseGroup,
    String? image,
    String? instructorName,
    String? instructorTitle,
    String? instructorAvatar,
    String? branch,
    String? schedule,
    String? description,
    String? tag,
    int? progressPercentage,
    String? status,
  }) {
    return CourseModel(
      id: id ?? this.id,
      title: title ?? this.title,
      category: category ?? this.category,
      level: level ?? this.level,
      durationWeeks: durationWeeks ?? this.durationWeeks,
      totalHours: totalHours ?? this.totalHours,
      theoryHours: theoryHours ?? this.theoryHours,
      practiceHours: practiceHours ?? this.practiceHours,
      tuitionFee: tuitionFee ?? this.tuitionFee,
      depositFee: depositFee ?? this.depositFee,
      originalPrice: originalPrice ?? this.originalPrice,
      targetAudience: targetAudience ?? this.targetAudience,
      targetNeed: targetNeed ?? this.targetNeed,
      courseGroup: courseGroup ?? this.courseGroup,
      image: image ?? this.image,
      instructorName: instructorName ?? this.instructorName,
      instructorTitle: instructorTitle ?? this.instructorTitle,
      instructorAvatar: instructorAvatar ?? this.instructorAvatar,
      branch: branch ?? this.branch,
      schedule: schedule ?? this.schedule,
      description: description ?? this.description,
      tag: tag ?? this.tag,
      progressPercentage: progressPercentage ?? this.progressPercentage,
      status: status ?? this.status,
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
  final String? videoUrl;
  final String? contentText;
  final bool isFreePreview;
  final int lessonOrder;

  const LessonModel({
    required this.id,
    required this.title,
    required this.durationMinutes,
    this.isCompleted = false,
    this.videoUrl,
    this.contentText,
    this.isFreePreview = false,
    this.lessonOrder = 1,
  });

  factory LessonModel.fromJson(Map<String, dynamic> json) {
    final vUrl = json['video_url']?.toString() ?? json['videoUrl']?.toString();
    int dMin = (json['duration_minutes'] as num?)?.toInt() ??
        (json['durationMinutes'] as num?)?.toInt() ??
        18;
    if (vUrl != null && vUrl.contains('mDhpMX4EeY8')) {
      dMin = 95;
    }

    return LessonModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      durationMinutes: dMin,
      isCompleted: json['is_completed'] == true || json['isCompleted'] == true,
      videoUrl: vUrl,
      contentText: json['content_text']?.toString() ?? json['contentText']?.toString(),
      isFreePreview: false, // Mọi bài học đều bắt buộc đăng ký khóa học
      lessonOrder: (json['lesson_order'] as num?)?.toInt() ?? 1,
    );
  }

  /// Định dạng chuẩn thời lượng hiển thị khớp chính xác với độ dài thực tế của clip
  String get formattedDuration {
    if (videoUrl != null && videoUrl!.contains('mDhpMX4EeY8')) {
      return '94:48';
    }
    if (durationMinutes >= 60) {
      final hours = durationMinutes ~/ 60;
      final mins = durationMinutes % 60;
      return '$hours:${mins.toString().padLeft(2, '0')}:00';
    }
    return '${durationMinutes.toString().padLeft(2, '0')}:00';
  }
}

class ChapterModel {
  final String id;
  final String title;
  final String? description;
  final bool isCompleted;
  final int chapterOrder;
  final List<LessonModel> lessons;

  const ChapterModel({
    required this.id,
    required this.title,
    this.description,
    this.isCompleted = false,
    this.chapterOrder = 1,
    required this.lessons,
  });

  factory ChapterModel.fromJson(Map<String, dynamic> json) {
    List<LessonModel> lessonList = [];
    if (json['course_lessons'] is List) {
      lessonList = (json['course_lessons'] as List)
          .map((l) => LessonModel.fromJson(Map<String, dynamic>.from(l as Map)))
          .toList();
      lessonList.sort((a, b) => a.lessonOrder.compareTo(b.lessonOrder));
    } else if (json['lessons'] is List) {
      lessonList = (json['lessons'] as List)
          .map((l) => LessonModel.fromJson(Map<String, dynamic>.from(l as Map)))
          .toList();
    }

    return ChapterModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      chapterOrder: (json['chapter_order'] as num?)?.toInt() ?? 1,
      isCompleted: json['is_completed'] == true,
      lessons: lessonList,
    );
  }
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
      image: 'assets/images/DaoTao/Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu 599.000.jpg',
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
      image: 'assets/images/DaoTao/Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú 350.000.jpg',
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
      image: 'assets/images/DaoTao/HƯỚNG DẪN XÂY DỰNG CHẾ ĐỘ ĂN PHÒNG NGỪA BỆNH LÝ TUYẾN VÚ 350.000.jpg',
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
      image: 'assets/images/DaoTao/Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật tuyến vú 350.000.jpg',
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
      id: '30303030-0001-0001-0001-000000000009',
      title: 'Khoá học Chuyên đề: CHĂM SÓC MẸ SAU SINH',
      category: 'Người đang làm nghề',
      courseGroup: 'Người đang làm nghề',
      targetAudience: 'Kỹ thuật viên XBBH/PHCN/Mẹ & Bé',
      targetNeed: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      level: 'Chuyên đề',
      durationWeeks: 4,
      totalHours: 48,
      theoryHours: 16,
      practiceHours: 32,
      tuitionFee: 10000000,
      depositFee: 2000000,
      originalPrice: 15000000,
      image: 'assets/images/DaoTao/Khoá học Chuyên đề CHĂM SÓC MẸ SAU SINH 10.000.000.jpg',
      instructorName: 'ThS. Nguyễn Thu Hà',
      instructorTitle: 'Giảng viên chuyên môn MLD',
      instructorAvatar: 'assets/images/nguyen_thu_ha.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Thứ 7 & Chủ nhật · 08:30–12:30',
      description: 'Kỹ thuật dẫn lưu bạch huyết chuyên sâu dành riêng cho mẹ sau sinh: hỗ trợ hồi phục cơ thể nhanh chóng, giảm phù nề chi dưới, thông tắc tia sữa và săn chắc phục hồi vóc dáng an toàn.',
      tag: 'Chứng nhận Chuyên đề Hậu sản',
    ),
    CourseModel(
      id: '30303030-0001-0001-0001-000000000002',
      title: 'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI LÀM NGHỀ - Level 1',
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
      image: 'assets/images/DaoTao/Dẫn lưu bạch huyết cơ bản cho người làm nghề 15.000.000.jpg',
      instructorName: 'Nguyễn Thanh Hương',
      instructorTitle: 'Giảng viên kỹ thuật MLD Vodder',
      instructorAvatar: 'assets/images/nguyen_thu_ha.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Thứ 6–7–Chủ nhật · 13:00–17:00',
      description: 'Chuẩn hóa kỹ thuật dẫn lưu bạch huyết thủ công Vodder quốc tế với áp lực 30-40 mmHg. Đào tạo cầm tay chỉ việc, ứng dụng ngay vào cơ sở chăm sóc sức khỏe.',
      tag: 'Chứng chỉ hành nghề MLD - Level 1',
    ),
    CourseModel(
      id: '30303030-0001-0001-0001-000000000006',
      title: 'DẪN LƯU BẠCH HUYẾT NÂNG CAO CHO NGƯỜI LÀM NGHỀ - Level 2',
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
      image: 'assets/images/DaoTao/Dẫn lưu bạch huyết nâng cao cho người làm nghề 25.000.000.jpg',
      instructorName: 'Nguyễn Thanh Hương',
      instructorTitle: 'Giảng viên kỹ thuật MLD Vodder',
      instructorAvatar: 'assets/images/nguyen_thu_ha.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Thứ 2–4–6 · 09:00–12:00',
      description: 'Kỹ thuật can thiệp sâu các trường hợp phù bạch huyết phức tạp, điều trị phục hồi sau phẫu thuật thẩm mỹ và tạo hình, nạo vét hạch hoặc xạ trị.',
      tag: 'Kỹ thuật viên Chuyên sâu - Level 2',
    ),
    CourseModel(
      id: '30303030-0001-0001-0001-000000000010',
      title: 'DẪN LƯU BẠCH HUYẾT CHUYÊN SÂU CHO NGƯỜI LÀM NGHỀ - Level 3',
      category: 'Người đang làm nghề',
      courseGroup: 'Người đang làm nghề',
      targetAudience: 'Kỹ thuật viên XBBH/PHCN/VLTL & Y bác sĩ',
      targetNeed: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      level: 'Chuyên sâu',
      durationWeeks: 10,
      totalHours: 120,
      theoryHours: 40,
      practiceHours: 80,
      tuitionFee: 35000000,
      depositFee: 7000000,
      originalPrice: 40000000,
      image: 'assets/images/DaoTao/Dẫn lưu bạch huyết chuyên sâu cho người làm nghề.jpg',
      instructorName: 'BS. Lê Hoài An',
      instructorTitle: 'Chuyên gia Y học Phục hồi & MLD',
      instructorAvatar: 'assets/images/le_hoai_an.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Thứ 3–5–7 · 09:00–13:00',
      description: 'Kỹ thuật can thiệp lâm sàng chuyên sâu, xử lý các ca phù bạch huyết nguyên phát và thứ phát mức độ nặng, xây dựng phác đồ cá nhân hóa chuẩn quốc tế.',
      tag: 'Chuyên gia Trị liệu MLD - Level 3',
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
      image: 'assets/images/DaoTao/Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT 30.000.000.webp',
      instructorName: 'BS. Lê Hoài An',
      instructorTitle: 'Chuyên gia Y học Phục hồi & CDT',
      instructorAvatar: 'assets/images/le_hoai_an.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Thứ 3–5–7 · 13:30–17:30',
      description: 'Liệu pháp phức hợp giảm ứ trệ dịch (CDT): phối hợp kỹ thuật xoa bóp dẫn lưu Vodder và nghệ thuật băng ép nhiều lớp phân tầng áp lực chuẩn y học.',
      tag: 'Chứng chỉ Chuyên đề CDT',
    ),
    CourseModel(
      id: '30303030-0001-0001-0001-000000000011',
      title: 'Chương trình: PHÁT TRIỂN GIẢNG VIÊN VÀ HỌC THUẬT',
      category: 'Người đang làm nghề',
      courseGroup: 'Người đang làm nghề',
      targetAudience: 'Giảng viên & Kỹ thuật viên Trưởng',
      targetNeed: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      level: 'Giảng viên',
      durationWeeks: 12,
      totalHours: 140,
      theoryHours: 50,
      practiceHours: 90,
      tuitionFee: 35000000,
      depositFee: 7000000,
      originalPrice: 45000000,
      image: 'assets/images/DaoTao/Chương trình phát triển giảng viên và học thuật 35.000.000.jpg',
      instructorName: 'Ban Cố Vấn Y Khoa MLD',
      instructorTitle: 'Hội đồng Giảng viên & Học thuật',
      instructorAvatar: 'assets/images/nguyen_thu_ha.png',
      branch: 'Học viện MLD Việt Nam',
      schedule: 'Cuối tuần · 09:00–17:00',
      description: 'Đào tạo bồi dưỡng năng lực sư phạm, phương pháp biên soạn giáo trình và chuẩn hóa kỹ năng sư phạm lâm sàng dành cho các chuyên gia MLD hướng tới vai trò giảng viên.',
      tag: 'Chứng nhận Giảng viên MLD',
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
      image: 'assets/images/DaoTao/LYMPHATIC WELLNESS SIGNATURE PROGRAM 350.000.000.jpg',
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
      isCompleted: false,
      lessons: [
        LessonModel(
          id: 'les_01',
          title: 'Bài 1: Nhận biết sớm dấu hiệu phù - chủ động giảm nguy cơ phù tay sau phẫu thuật',
          durationMinutes: 95,
          isCompleted: false,
          videoUrl: 'https://youtu.be/mDhpMX4EeY8?si=Hd_z_npg-loMZEx8',
          isFreePreview: false,
        ),
        LessonModel(
          id: 'les_02',
          title: 'Bài 2: Cấu tạo mao mạch và hạch bạch huyết',
          durationMinutes: 20,
          isCompleted: false,
          videoUrl: 'https://www.youtube.com/watch?v=0h9sC3wK-yA',
          isFreePreview: false,
        ),
        LessonModel(
          id: 'les_03',
          title: 'Bài 3: Áp lực mô và cơ chế hình thành dịch phù',
          durationMinutes: 25,
          isCompleted: false,
          videoUrl: 'https://www.youtube.com/watch?v=2r1pZ3Wf2lA',
          isFreePreview: false,
        ),
      ],
    ),
    ChapterModel(
      id: 'ch_02',
      title: 'Chương 2: Nguyên lý 4 thao tác dẫn lưu cơ bản',
      isCompleted: false,
      lessons: [
        LessonModel(
          id: 'les_04',
          title: 'Bài 4: Thao tác xoay tròn tĩnh (Stationary Circles)',
          durationMinutes: 20,
          isCompleted: false,
          videoUrl: 'https://www.youtube.com/watch?v=Zz1X1U0v6g0',
          isFreePreview: false,
        ),
        LessonModel(
          id: 'les_05',
          title: 'Bài 5: Thao tác ép bơm (Pump technique)',
          durationMinutes: 25,
          isCompleted: false,
          videoUrl: 'https://www.youtube.com/watch?v=XvcJpA_k24k',
          isFreePreview: false,
        ),
        LessonModel(
          id: 'les_06',
          title: 'Bài 6: Thao tác múc và cuộn (Scoop & Rotary)',
          durationMinutes: 30,
          isCompleted: false,
          videoUrl: 'https://www.youtube.com/watch?v=Yp69xN1D9Xk',
          isFreePreview: false,
        ),
      ],
    ),
    ChapterModel(
      id: 'ch_03',
      title: 'Chương 3: Phác đồ lâm sàng & Thực hành cầm tay chỉ việc',
      isCompleted: false,
      lessons: [
        LessonModel(
          id: 'les_07',
          title: 'Bài 7: Quy trình dẫn lưu vùng cổ vai gáy và đầu mặt',
          durationMinutes: 30,
          isCompleted: false,
          videoUrl: 'https://www.youtube.com/watch?v=QA-xR_E24G8',
          isFreePreview: false,
        ),
        LessonModel(
          id: 'les_08',
          title: 'Bài 8: Xử lý phù chi và phòng ngừa biến chứng',
          durationMinutes: 35,
          isCompleted: false,
          videoUrl: 'https://www.youtube.com/watch?v=0h9sC3wK-yA',
          isFreePreview: false,
        ),
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

  /// Danh sách câu hỏi chuẩn y khoa Vodder Module 1
  static List<QuizQuestionModel> getStandardVodderQuestions(String quizId) {
    return [
      QuizQuestionModel(
        id: '${quizId}_q1',
        quizId: quizId,
        questionNumber: 1,
        questionText: 'Lực tác động tối ưu khi thực hiện động tác vuốt dẫn lưu bạch huyết theo kỹ thuật Vodder là bao nhiêu?',
        options: {
          'A': 'Rất nhẹ, khoảng 30 - 40 mmHg (chỉ làm căng nhẹ lớp da bì)',
          'B': 'Lực mạnh từ 80 - 100 mmHg tác động sâu vào khối cơ',
          'C': 'Ấn day điểm huyệt liên tục với lực tăng dần',
          'D': 'Tùy thuộc vào ngưỡng chịu đau của bệnh nhân',
        },
        correctOption: 'A',
        explanation: 'Kỹ thuật Vodder yêu cầu áp lực 30-40 mmHg để kích thích mao mạch bạch huyết nông ngay dưới lớp da bì mà không làm xẹp thành mạch.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q2',
        quizId: quizId,
        questionNumber: 2,
        questionText: 'Trường hợp nào sau đây là CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI của liệu trình dẫn lưu bạch huyết MLD?',
        options: {
          'A': 'Phù nề nhẹ sau phẫu thuật hút mỡ 3 tuần',
          'B': 'Viêm tĩnh mạch huyết khối cấp tính (DVT) & suy tim mất bù',
          'C': 'Mệt mỏi căng thẳng sau ngày làm việc',
          'D': 'Phù nề chân lành sau phẫu thuật thay khớp',
        },
        correctOption: 'B',
        explanation: 'DVT và suy tim mất bù là chống chỉ định tuyệt đối vì dẫn lưu có thể làm vỡ cục máu đông hoặc gây quá tải thể tích tuần hoàn cấp.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q3',
        quizId: quizId,
        questionNumber: 3,
        questionText: 'Thứ tự dẫn lưu chuẩn y khoa theo nguyên lý Vodder là gì?',
        options: {
          'A': 'Dẫn lưu từ vùng ngọn chi trước, sau đó mới vào vùng gốc chi',
          'B': 'Khai thông trạm hạch trung tâm (vùng cổ - xương đòn) trước, sau đó dẫn lưu từ gốc chi đến ngọn chi',
          'C': 'Tập trung xoa bóp trực tiếp vào vùng phù nề nặng nhất trước',
          'D': 'Thao tác ngẫu nhiên theo cảm nhận của kỹ thuật viên',
        },
        correctOption: 'B',
        explanation: 'Nguyên lý Vodder bắt buộc phải giải phóng các trạm hạch trung tâm vùng cổ (Terminus) để tạo chỗ trống đón nhận dòng bạch huyết từ ngoại vi.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q4',
        quizId: quizId,
        questionNumber: 4,
        questionText: 'Nhịp điệu thao tác tối ưu trong kỹ thuật dẫn lưu Vodder là:',
        options: {
          'A': 'Nhanh, dồn dập, khoảng 60-80 lần/phút để tăng nhiệt độ da',
          'B': 'Chậm rãi, nhịp nhàng, khoảng 5-7 lần/phút tương ứng nhịp co bóp tự nhiên của mạch bạch huyết',
          'C': 'Ngắt quãng đột ngột, ấn giữ 30 giây rồi thả mạnh',
          'D': 'Thay đổi tốc độ liên tục để kích thích phản xạ thần kinh',
        },
        correctOption: 'B',
        explanation: 'Mạch bạch huyết (Lymphangion) co bóp tự nhiên 5-8 lần/phút ở trạng thái nghỉ ngơi, do đó thao tác MLD cần chậm rãi và nhịp nhàng tương thích.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q5',
        quizId: quizId,
        questionNumber: 5,
        questionText: 'Giai đoạn nào trong chu kỳ vuốt Vodder có tác dụng hút dịch kẽ vào mao mạch bạch huyết?',
        options: {
          'A': 'Pha tăng áp (Working phase) làm căng giãn các sợi tơ neo (Anchoring filaments)',
          'B': 'Pha thả lỏng hoàn toàn tách tay khỏi bề mặt da',
          'C': 'Pha ấn sâu giữ nguyên vị trí',
          'D': 'Pha chà xát sinh nhiệt',
        },
        correctOption: 'A',
        explanation: 'Pha tác động (Working phase) làm căng các sợi neo collagen, kéo mở các van mao mạch ban đầu để dịch mô chảy vào lòng mạch.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q6',
        quizId: quizId,
        questionNumber: 6,
        questionText: 'Dấu hiệu lâm sàng Stemmer (Stemmer\'s sign) dương tính biểu hiện:',
        options: {
          'A': 'Da vùng mu ngón chân/tay không thể véo hoặc nhấc lên được do phù bạch huyết xơ hóa',
          'B': 'Vết lõm sâu khi ấn tay vào và hồi phục ngay trong 3 giây',
          'C': 'Đau nhói khi sờ nắn dọc theo đường đi của tĩnh mạch',
          'D': 'Vùng da phù đỏ rực và nóng rát kèm sốt cao',
        },
        correctOption: 'A',
        explanation: 'Dấu hiệu Stemmer đặc hiệu cho phù bạch huyết giai đoạn II-III khi dịch phù chứa nhiều protein gây xơ hóa mô dưới da.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q7',
        quizId: quizId,
        questionNumber: 7,
        questionText: 'Tại sao không được sử dụng dầu massage có độ trơn cao khi thực hiện kỹ thuật Vodder chuẩn y khoa?',
        options: {
          'A': 'Vì dầu massage làm tăng nguy cơ dị ứng cho bệnh nhân',
          'B': 'Vì độ trơn làm tay bị trượt, không tạo được lực kéo căng da tiếp tuyến để kích thích mao mạch bạch huyết',
          'C': 'Vì dầu massage làm bít tắc lỗ chân lông tạm thời',
          'D': 'Vì kỹ thuật viên khó kiểm soát nhiệt độ lòng bàn tay',
        },
        correctOption: 'B',
        explanation: 'Kỹ thuật Vodder yêu cầu độ ma sát tự nhiên giữa da kỹ thuật viên và da bệnh nhân để kéo giãn các sợi tơ neo dưới biểu bì.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q8',
        quizId: quizId,
        questionNumber: 8,
        questionText: 'Động tác Stationary Circles (Xoay tròn tại chỗ) thường được áp dụng ưu tiên ở vùng nào?',
        options: {
          'A': 'Vùng cổ, mặt và các chuỗi trạm hạch bạch huyết',
          'B': 'Bụng chân và khối cơ đùi lớn',
          'C': 'Toàn bộ vùng lưng và cột sống',
          'D': 'Bề mặt khớp gối và cổ chân',
        },
        correctOption: 'A',
        explanation: 'Stationary circles là kỹ thuật cơ bản nhất trong Vodder, đặc biệt dùng để kích thích các chuỗi hạch cổ nông, sâu và trạm hạch nách/bẹn.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q9',
        quizId: quizId,
        questionNumber: 9,
        questionText: 'Tiêu chuẩn vệ sinh và kiểm soát nhiễm khuẩn bắt buộc trước khi MLD cho bệnh nhân sau phẫu thuật là:',
        options: {
          'A': 'Rửa tay sát khuẩn chuẩn ngoại khoa, sát trùng dụng cụ và không can thiệp trực tiếp lên mép vết thương hở',
          'B': 'Chỉ cần đeo găng tay len sạch',
          'C': 'Rửa tay bằng nước ấm thông thường',
          'D': 'Thoa cồn 90 độ trực tiếp lên toàn bộ vùng điều trị',
        },
        correctOption: 'A',
        explanation: 'MLD sau phẫu thuật đòi hỏi quy chuẩn vô khuẩn nghiêm ngặt để phòng ngừa viêm mô tế bào (Cellulitis) - biến chứng nguy hiểm nhất của phù bạch huyết.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q10',
        quizId: quizId,
        questionNumber: 10,
        questionText: 'Học viện MLD Việt Nam quy định tiêu chí điểm đạt lý thuyết để được tham gia thực hành lâm sàng là:',
        options: {
          'A': '≥ 5.0 / 10 điểm (50%)',
          'B': '≥ 6.5 / 10 điểm (65%)',
          'C': '≥ 8.0 / 10 điểm (80% số câu đúng chuẩn Vodder Quốc tế)',
          'D': 'Chỉ cần tham gia đầy đủ không tính điểm thi',
        },
        correctOption: 'C',
        explanation: 'Chuẩn đào tạo y khoa Vodder tại Học viện MLD yêu cầu học viên đạt tối thiểu 8.0/10 điểm lý thuyết (≥80%) để đảm bảo an toàn tuyệt đối cho bệnh nhân trước khi thực hành lâm sàng.',
      ),
    ];
  }

  /// Danh sách câu hỏi Module 2: Phác đồ lâm sàng
  static List<QuizQuestionModel> getClinicalEdemaQuestions(String quizId) {
    return [
      QuizQuestionModel(
        id: '${quizId}_q1',
        quizId: quizId,
        questionNumber: 1,
        questionText: 'Thời điểm an toàn nhất để bắt đầu MLD nhẹ nhàng cho bệnh nhân sau phẫu thuật thẩm mỹ (hút mỡ, nâng ngực) là:',
        options: {
          'A': 'Sau 24 - 48 giờ khi đã rút ống dẫn lưu và bác sĩ phẫu thuật cho phép',
          'B': 'Ngay trong phòng mổ khi vừa khâu vết thương',
          'C': 'Sau 1 tháng khi vết mổ đã lành sẹo hoàn toàn',
          'D': 'Khi bệnh nhân hết cảm giác đau nhức',
        },
        correctOption: 'A',
        explanation: 'MLD sớm sau 24-48 giờ giúp tiêu giảm phù nề, ngăn chặn tình trạng ứ trệ fibrin và giảm bầm tím hiệu quả.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q2',
        quizId: quizId,
        questionNumber: 2,
        questionText: 'Khi thực hiện dẫn lưu cho bệnh nhân phù tay sau phẫu thuật ung thư vú có nạo vét hạch nách, dòng bạch huyết được dẫn về đâu?',
        options: {
          'A': 'Dẫn dịch qua đường ranh giới lưu vực (watershed) sang hạch nách bên lành và hạch bẹn cùng bên',
          'B': 'Dẫn trực tiếp vào trạm hạch nách đã bị nạo vét',
          'C': 'Dẫn xuống ngón tay để thoát dịch tự nhiên',
          'D': 'Dẫn vào vùng cơ ngực bị phẫu thuật',
        },
        correctOption: 'A',
        explanation: 'Kỹ thuật viên phải sử dụng các đường nối bàng hệ qua đường ranh giới lưu vực để đưa dịch phù về các trạm hạch còn nguyên vẹn.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q3',
        quizId: quizId,
        questionNumber: 3,
        questionText: 'Băng ép áp lực đa lớp (Multi-layer Bandaging) trong điều trị phù bạch huyết sử dụng loại băng nào?',
        options: {
          'A': 'Băng co giãn ngắn (Short-stretch bandage) có độ dãn thấp và áp lực làm việc cao',
          'B': 'Băng thun co giãn dài (Long-stretch bandage) đàn hồi mạnh',
          'C': 'Băng dính y tế thông thường',
          'D': 'Băng gạc xốp mềm không tạo lực',
        },
        correctOption: 'A',
        explanation: 'Băng co giãn ngắn tạo áp lực tĩnh thấp khi nghỉ ngơi nhưng tạo áp lực động cao khi co cơ, giúp bơm dịch bạch huyết lưu thông an toàn.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q4',
        quizId: quizId,
        questionNumber: 4,
        questionText: 'Mục đích chính của việc chăm sóc da kỹ lưỡng trong phác đồ điều trị phù bạch huyết là:',
        options: {
          'A': 'Làm trắng da thẩm mỹ',
          'B': 'Bảo toàn hàng rào bảo vệ da, ngăn ngừa vi khuẩn xâm nhập gây viêm mô tế bào (Erysipelas/Cellulitis)',
          'C': 'Làm ấm cơ thể học viên',
          'D': 'Giúp da hấp thụ dầu massage tốt hơn',
        },
        correctOption: 'B',
        explanation: 'Vùng da phù bạch huyết bị suy giảm miễn dịch tại chỗ nghiêm trọng; bất kỳ vết xước nhỏ nào cũng có thể bùng phát nhiễm trùng cấp tính.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q5',
        quizId: quizId,
        questionNumber: 5,
        questionText: 'Khi phát hiện vùng điều trị của khách hàng đột ngột đỏ rực, nóng rát, sốt nhẹ và đau nhức tăng vọt, KTV cần:',
        options: {
          'A': 'Tiếp tục MLD với lực mạnh hơn để giải phóng ứ trệ',
          'B': 'Ngừng ngay buổi MLD và chuyển khám bác sĩ chuyên khoa cấp bách (nghi ngờ nhiễm khuẩn cấp)',
          'C': 'Chườm nóng trực tiếp lên vết đỏ',
          'D': 'Cho khách hàng uống trà thảo mộc nghỉ ngơi',
        },
        correctOption: 'B',
        explanation: 'Dấu hiệu viêm mô tế bào cấp tính là chống chỉ định tuyệt đối tạm thời; thực hiện MLD lúc này sẽ phát tán vi khuẩn vào hệ tuần hoàn.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q6',
        quizId: quizId,
        questionNumber: 6,
        questionText: 'Kỹ thuật Pump (Ép bơm) trong Vodder mô phỏng hình dạng chuyển động nào của bàn tay?',
        options: {
          'A': 'Bàn tay hình muỗng lượn sóng từ ngón đến cổ tay',
          'B': 'Lòng bàn tay áp sát, xoay cổ tay theo hình bầu dục với ngón cái mở nhẹ ép dịch về phía trung tâm',
          'C': 'Đấm bóp nhịp nhàng bằng khớp ngón',
          'D': 'Cấu véo bề mặt da liên tục',
        },
        correctOption: 'B',
        explanation: 'Pump technique ôm trọn chu vi chi thể, sử dụng chuyển động lăn cổ tay để tạo sóng áp lực đẩy dịch dọc theo mao mạch bạch huyết.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q7',
        quizId: quizId,
        questionNumber: 7,
        questionText: 'Liệu trình MLD tiêu chuẩn trong giai đoạn giảm phù tích cực thường diễn ra với tần suất:',
        options: {
          'A': '1 tháng 1 lần',
          'B': '3 - 5 buổi mỗi tuần kết hợp băng ép trị liệu chuyên dụng',
          'C': 'Mỗi ngày 3 lần liên tục',
          'D': 'Chỉ làm duy nhất 1 buổi duy nhất',
        },
        correctOption: 'B',
        explanation: 'Giai đoạn điều trị tích cực (Phase 1 CDT) đòi hỏi tần suất 3-5 buổi/tuần để duy trì dòng lưu thông liên tục trước khi chuyển sang giai đoạn duy trì.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q8',
        quizId: quizId,
        questionNumber: 8,
        questionText: 'Ống ngực (Thoracic duct) - ống bạch huyết lớn nhất cơ thể - đổ vào hệ tuần hoàn tĩnh mạch tại vị trí:',
        options: {
          'A': 'Góc tĩnh mạch cảnh trong và dưới đòn bên trái (Tĩnh mạch Terminus trái)',
          'B': 'Góc tĩnh mạch bên phải',
          'C': 'Tĩnh mạch chủ dưới tại ổ bụng',
          'D': 'Tĩnh mạch phổi',
        },
        correctOption: 'A',
        explanation: 'Ống ngực thu nhận khoảng 75% lượng bạch huyết toàn thân và đổ về góc tĩnh mạch cảnh - dưới đòn bên trái.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q9',
        quizId: quizId,
        questionNumber: 9,
        questionText: 'Trong phác đồ MLD Vodder vùng mặt, hướng vuốt chủ đạo từ giữa mặt là hướng về:',
        options: {
          'A': 'Hướng xuống môi và cằm',
          'B': 'Hướng sang 2 bên về chuỗi hạch mang tai, hạch góc hàm và trạm hạch cổ sâu',
          'C': 'Hướng thẳng đứng lên trán',
          'D': 'Hướng vào cánh mũi',
        },
        correctOption: 'B',
        explanation: 'Mạng lưới bạch huyết vùng mặt dẫn dịch từ trung tâm sang hai bên thái dương, trước tai và góc hàm trước khi chảy xuống cổ.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q10',
        quizId: quizId,
        questionNumber: 10,
        questionText: 'Tiêu chí đạt điểm của bài kiểm tra này theo quy định của Ban Đào tạo Học viện là:',
        options: {
          'A': 'Tối thiểu 8.0 / 10 điểm (Đúng ≥ 8 / 10 câu)',
          'B': 'Tối thiểu 5.0 / 10 điểm',
          'C': 'Tối thiểu 6.0 / 10 điểm',
          'D': 'Không bắt buộc điểm số',
        },
        correctOption: 'A',
        explanation: 'Theo chuẩn đánh giá y khoa MLD Vodder, học viên phải đạt tối thiểu 8.0/10 điểm (≥80%) để đạt yêu cầu hoàn thành module.',
      ),
    ];
  }

  /// Danh sách câu hỏi Đánh giá tổng hợp
  static List<QuizQuestionModel> getComprehensiveQuestions(String quizId) {
    return [
      QuizQuestionModel(
        id: '${quizId}_q1',
        quizId: quizId,
        questionNumber: 1,
        questionText: 'Nguyên tắc vàng "Zero Pain" (Không đau đớn) trong kỹ thuật Vodder có ý nghĩa y khoa là:',
        options: {
          'A': 'Đau đớn gây co thắt phản xạ giao cảm, làm tắc nghẽn co bóp tự nhiên của mạch bạch huyết',
          'B': 'Chỉ nhằm mục đích tạo cảm giác thư giãn cho bệnh nhân',
          'C': 'Giúp kỹ thuật viên không bị mỏi tay',
          'D': 'Tránh làm tróc lớp sừng trên bề mặt biểu bì',
        },
        correctOption: 'A',
        explanation: 'Bất kỳ kích thích đau nào cũng kích hoạt hệ thần kinh giao cảm làm co thắt mạch bạch huyết, triệt tiêu hoàn toàn hiệu quả dẫn lưu.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q2',
        quizId: quizId,
        questionNumber: 2,
        questionText: 'Động tác Rotary (Kỹ thuật cuộn) trong Vodder thường được chỉ định tối ưu cho vùng cơ thể nào?',
        options: {
          'A': 'Các diện phẳng và rộng như lưng, mông và thành ngực',
          'B': 'Vùng ngón tay và ngón chân nhỏ',
          'C': 'Vùng quanh mắt',
          'D': 'Khớp khuỷu tay',
        },
        correctOption: 'A',
        explanation: 'Rotary technique sử dụng bề mặt cổ tay và ô mô út cuộn tròn trên diện rộng, cực kỳ hiệu quả cho vùng lưng và hông.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q3',
        quizId: quizId,
        questionNumber: 3,
        questionText: 'Sự khác biệt cốt lõi giữa Massage Thụy Điển cổ điển và Dẫn lưu bạch huyết Vodder MLD là:',
        options: {
          'A': 'MLD tác động áp lực cực nhẹ (30-40 mmHg) trên hệ mao mạch da, không dùng lực sâu và không gây đỏ da (Hyperemia)',
          'B': 'MLD dùng lực mạnh gấp đôi massage Thụy Điển',
          'C': 'MLD bắt buộc dùng nhiều dầu trơn nóng',
          'D': 'Massage Thụy Điển làm chậm nhịp tim hơn MLD',
        },
        correctOption: 'A',
        explanation: 'Khác với massage Thụy Điển kích thích tăng tưới máu cơ, MLD chỉ tập trung vận chuyển dịch mô và protein mà không kích thích tăng tiết dịch phù.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q4',
        quizId: quizId,
        questionNumber: 4,
        questionText: 'Khi nào học viên được cấp chứng chỉ thực hành chuyên nghiệp của Học viện MLD Việt Nam?',
        options: {
          'A': 'Hoàn thành 100% video bài giảng, đạt ≥ 8.0/10 bài kiểm tra lý thuyết và hoàn thành thực hành lâm sàng',
          'B': 'Chỉ cần đăng ký khóa học và đóng học phí',
          'C': 'Chỉ cần xem 50% số bài học',
          'D': 'Tự động cấp sau 30 ngày',
        },
        correctOption: 'A',
        explanation: 'Quy chuẩn chứng chỉ MLD yêu cầu kết hợp đầy đủ: chuyên cần video, vượt qua kỳ thi đánh giá lý thuyết ≥8.0 và vượt qua sát hạch thao tác tay thực tế.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q5',
        quizId: quizId,
        questionNumber: 5,
        questionText: 'Phù bạch huyết nguyên phát (Primary Lymphedema) có nguyên nhân chủ yếu do:',
        options: {
          'A': 'Bất thường bẩm sinh, thiểu sản hoặc suy giảm cấu trúc van mạch bạch huyết',
          'B': 'Do va đập chấn thương thể thao',
          'C': 'Do ăn quá nhiều muối',
          'D': 'Do thức khuya kéo dài',
        },
        correctOption: 'A',
        explanation: 'Phù nguyên phát phát sinh do khiếm khuyết di truyền/bẩm sinh trong sự phát triển của hệ mạch bạch huyết.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q6',
        quizId: quizId,
        questionNumber: 6,
        questionText: 'Kỹ thuật Scoop (Múc) thực hiện theo hình dáng chuyển động xoắn ốc phù hợp nhất trên:',
        options: {
          'A': 'Các chi thể hình trụ như cẳng tay, cẳng chân',
          'B': 'Vùng xương bả vai phẳng',
          'C': 'Vùng trán',
          'D': 'Bụng dưới',
        },
        correctOption: 'A',
        explanation: 'Thao tác múc (Scoop) ôm gọn chu vi chi dưới và cẳng tay, đẩy dịch theo chiều xoắn ốc hướng tâm.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q7',
        quizId: quizId,
        questionNumber: 7,
        questionText: 'Trong trường hợp bệnh nhân bị suy van tĩnh mạch chi dưới kèm phù, liệu trình MLD có tác dụng hỗ trợ:',
        options: {
          'A': 'Giảm tải gánh nặng dịch kẽ ứ trệ, hỗ trợ tuần hoàn trở về và giảm cảm giác nặng nề',
          'B': 'Làm teo biến hoàn toàn các búi tĩnh mạch nông',
          'C': 'Thay thế hoàn toàn thuốc điều trị nội khoa',
          'D': 'Làm dày thành mạch tĩnh mạch',
        },
        correctOption: 'A',
        explanation: 'MLD giải phóng thể tích dịch ứ đọng xung quanh các mao mạch, giảm chèn ép vi tuần hoàn và giảm áp lực tĩnh mạch ngoại vi.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q8',
        quizId: quizId,
        questionNumber: 8,
        questionText: 'Trọng lượng phân tử của phân tử Protein trong dịch bạch huyết là nguyên nhân khiến dịch phù:',
        options: {
          'A': 'Dễ bị xơ cứng mô (Fibrosis) nếu không được dẫn lưu và đào thải kịp thời',
          'B': 'Tự động tiêu biến sau vài giờ',
          'C': 'Chuyển hóa thành mỡ thừa',
          'D': 'Bị hòa tan bởi nước muối sinh lý',
        },
        correctOption: 'A',
        explanation: 'Protein ứ đọng kích thích phản ứng viêm mạn tính và tăng sinh mô sợi liên kết, dẫn đến xơ hóa không hồi phục nếu không can thiệp MLD.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q9',
        quizId: quizId,
        questionNumber: 9,
        questionText: 'Tư thế nằm chuẩn của khách hàng khi thực hiện MLD toàn thân là:',
        options: {
          'A': 'Nằm ngửa thoải mái, có gối kê nhẹ dưới đầu và vùng khoeo chân để thư giãn tối đa cơ thành bụng',
          'B': 'Nằm sấp liên tục suốt 90 phút',
          'C': 'Ngồi thẳng lưng trên ghế cứng',
          'D': 'Nằm nghiêng gập sát đùi vào bụng',
        },
        correctOption: 'A',
        explanation: 'Tư thế nằm ngửa với chân nâng nhẹ và cơ bụng thả lỏng giúp giảm áp lực trong ổ bụng, tối ưu dòng chảy bạch huyết về ống ngực.',
      ),
      QuizQuestionModel(
        id: '${quizId}_q10',
        quizId: quizId,
        questionNumber: 10,
        questionText: 'Tiêu chuẩn đạt điểm quy định cho kỳ thi trắc nghiệm lý thuyết MLD là:',
        options: {
          'A': 'Đạt ≥ 8.0 / 10 điểm (≥ 80%) theo quy định thống nhất của Ban Đào tạo',
          'B': 'Đạt 5.0 / 10 điểm',
          'C': 'Đạt 6.0 / 10 điểm',
          'D': 'Chỉ cần nộp bài không giới hạn điểm số',
        },
        correctOption: 'A',
        explanation: 'Học viện MLD Việt Nam áp dụng thang điểm chuẩn Quốc tế Vodder: học viên đạt từ 8.0 điểm trở lên được công nhận ĐẠT tiêu chuẩn chuyên môn.',
      ),
    ];
  }

  /// Trả về danh sách bài kiểm tra trắc nghiệm của khóa học
  static List<CourseQuizModel> getQuizzesForCourse(String courseId, [String? courseTitle]) {
    final title = courseTitle ?? 'Khóa học MLD';
    return [
      CourseQuizModel(
        id: 'quiz_${courseId}_01',
        courseId: courseId,
        title: 'Bài kiểm tra Module 1: Lý thuyết Giải phẫu & Kỹ thuật Vodder',
        totalQuestions: 10,
        timeLimitMinutes: 15,
        passingScore: 8.0,
        questions: getStandardVodderQuestions('quiz_${courseId}_01'),
      ),
      CourseQuizModel(
        id: 'quiz_${courseId}_02',
        courseId: courseId,
        title: 'Bài kiểm tra Module 2: Phác đồ lâm sàng & Xử lý phù nề sau phẫu thuật',
        totalQuestions: 10,
        timeLimitMinutes: 15,
        passingScore: 8.0,
        questions: getClinicalEdemaQuestions('quiz_${courseId}_02'),
      ),
      CourseQuizModel(
        id: 'quiz_${courseId}_final',
        courseId: courseId,
        title: 'Bài kiểm tra Đánh giá Năng lực Thực hành Tổng hợp - $title',
        totalQuestions: 10,
        timeLimitMinutes: 20,
        passingScore: 8.0,
        questions: getComprehensiveQuestions('quiz_${courseId}_final'),
      ),
    ];
  }
}

/// Model bài kiểm tra trắc nghiệm theo khóa học (course_quizzes)
class CourseQuizModel {
  final String id;
  final String courseId;
  final String title;
  final int totalQuestions;
  final int timeLimitMinutes;
  final double passingScore;
  final DateTime? createdAt;
  final List<QuizQuestionModel> questions;

  const CourseQuizModel({
    required this.id,
    required this.courseId,
    required this.title,
    this.totalQuestions = 10,
    this.timeLimitMinutes = 15,
    this.passingScore = 8.0,
    this.createdAt,
    this.questions = const [],
  });

  factory CourseQuizModel.fromJson(Map<String, dynamic> json, [List<QuizQuestionModel> questions = const []]) {
    return CourseQuizModel(
      id: json['id']?.toString() ?? '',
      courseId: json['course_id']?.toString() ?? json['courseId']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Bài kiểm tra trắc nghiệm',
      totalQuestions: (json['total_questions'] as num?)?.toInt() ??
          (json['totalQuestions'] as num?)?.toInt() ??
          (questions.isNotEmpty ? questions.length : 10),
      timeLimitMinutes: (json['time_limit_minutes'] as num?)?.toInt() ??
          (json['timeLimitMinutes'] as num?)?.toInt() ?? 15,
      passingScore: (json['passing_score'] as num?)?.toDouble() ??
          (json['passingScore'] as num?)?.toDouble() ?? 8.0,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
      questions: questions,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'course_id': courseId,
    'title': title,
    'total_questions': totalQuestions,
    'time_limit_minutes': timeLimitMinutes,
    'passing_score': passingScore,
  };
}

/// Model câu hỏi trắc nghiệm (quiz_questions)
class QuizQuestionModel {
  final String id;
  final String quizId;
  final int questionNumber;
  final String questionText;
  final Map<String, String> options;
  final String correctOption;
  final String? explanation;

  const QuizQuestionModel({
    required this.id,
    required this.quizId,
    required this.questionNumber,
    required this.questionText,
    required this.options,
    required this.correctOption,
    this.explanation,
  });

  factory QuizQuestionModel.fromJson(Map<String, dynamic> json) {
    Map<String, String> opts = {};
    if (json['options'] is Map) {
      (json['options'] as Map).forEach((k, v) => opts[k.toString()] = v.toString());
    }
    return QuizQuestionModel(
      id: json['id']?.toString() ?? '',
      quizId: json['quiz_id']?.toString() ?? json['quizId']?.toString() ?? '',
      questionNumber: (json['question_number'] as num?)?.toInt() ??
          (json['questionNumber'] as num?)?.toInt() ?? 1,
      questionText: json['question_text']?.toString() ?? json['questionText']?.toString() ?? '',
      options: opts,
      correctOption: json['correct_option']?.toString() ?? json['correctOption']?.toString() ?? 'A',
      explanation: json['explanation']?.toString(),
    );
  }
}

/// Model bài thi đã nộp (quiz_submissions)
class QuizSubmissionModel {
  final String id;
  final String quizId;
  final String courseId;
  final double score;
  final int correctCount;
  final int totalQuestions;
  final bool passed;
  final Map<int, String> submittedAnswers;
  final DateTime submittedAt;

  const QuizSubmissionModel({
    required this.id,
    required this.quizId,
    required this.courseId,
    required this.score,
    required this.correctCount,
    required this.totalQuestions,
    required this.passed,
    required this.submittedAnswers,
    required this.submittedAt,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'quizId': quizId,
    'courseId': courseId,
    'score': score,
    'correctCount': correctCount,
    'totalQuestions': totalQuestions,
    'passed': passed,
    'submittedAnswers': submittedAnswers.map((k, v) => MapEntry(k.toString(), v)),
    'submittedAt': submittedAt.toIso8601String(),
  };

  factory QuizSubmissionModel.fromJson(Map<String, dynamic> json) {
    final Map<int, String> answers = {};
    if (json['submittedAnswers'] is Map) {
      (json['submittedAnswers'] as Map).forEach((k, v) {
        final parsedKey = int.tryParse(k.toString());
        if (parsedKey != null) answers[parsedKey] = v.toString();
      });
    }
    return QuizSubmissionModel(
      id: json['id']?.toString() ?? '',
      quizId: json['quizId']?.toString() ?? json['quiz_id']?.toString() ?? '',
      courseId: json['courseId']?.toString() ?? json['course_id']?.toString() ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0.0,
      correctCount: (json['correctCount'] as num?)?.toInt() ??
          (json['correct_count'] as num?)?.toInt() ?? 0,
      totalQuestions: (json['totalQuestions'] as num?)?.toInt() ??
          (json['total_questions'] as num?)?.toInt() ?? 10,
      passed: json['passed'] == true,
      submittedAnswers: answers,
      submittedAt: json['submittedAt'] != null
          ? DateTime.tryParse(json['submittedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
