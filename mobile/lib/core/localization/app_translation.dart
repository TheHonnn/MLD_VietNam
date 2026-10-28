import 'package:flutter/material.dart';

/// Dịch vụ Bản địa hóa & Dịch thuật Đa ngôn ngữ Chuẩn Y khoa MLD Việt Nam
/// Đảm bảo 100% giao diện và dữ liệu động từ Database chuyển sang tiếng Anh khi chọn ngôn ngữ English
class AppTranslation {
  AppTranslation._();

  /// Kiểm tra xem ứng dụng có đang ở ngôn ngữ tiếng Anh hay không
  static bool isEnglish(BuildContext context) {
    try {
      final locale = Localizations.localeOf(context);
      return locale.languageCode.toLowerCase() == 'en';
    } catch (_) {
      return false;
    }
  }

  /// Dịch chuỗi văn bản (Tĩnh hoặc Động từ Database) sang Tiếng Anh
  static String translate(String? text, {required bool isEn}) {
    if (text == null || text.isEmpty) return text ?? '';
    if (!isEn) return text;

    final trimmed = text.trim();

    // 1. Khớp chính xác trong từ điển
    if (_dictionary.containsKey(trimmed)) {
      return _dictionary[trimmed]!;
    }

    // 2. Khớp không phân biệt chữ hoa chữ thường
    final lower = trimmed.toLowerCase();
    if (_lowerDictionary.containsKey(lower)) {
      return _lowerDictionary[lower]!;
    }

    // 3. Xử lý các mẫu câu/chuỗi động
    return _translateDynamicPatterns(trimmed);
  }

  /// Xử lý các mẫu văn bản ghép động từ Database
  static String _translateDynamicPatterns(String input) {
    String res = input;

    // Chi nhánh & Hotline
    if (res.contains('Trụ sở MLD Việt Nam') || res.contains('Trụ sở chính MLD')) {
      res = res.replaceAll('Trụ sở MLD Việt Nam', 'MLD Vietnam Headquarters')
               .replaceAll('Trụ sở chính MLD Việt Nam', 'MLD Vietnam HQ');
    }

    // Địa chỉ TP.HCM / Hà Nội
    res = res.replaceAll('Phường Võ Thị Sáu', 'Vo Thi Sau Ward')
             .replaceAll('Phường Bến Nghé', 'Ben Nghe Ward')
             .replaceAll('Quận 3', 'District 3')
             .replaceAll('Quận 1', 'District 1')
             .replaceAll('TP. Hồ Chí Minh', 'Ho Chi Minh City')
             .replaceAll('TP.HCM', 'HCMC');

    // 1. Mẫu Chương học (Chapter)
    final chapterReg = RegExp(r'^Chương\s+(\d+)[:\s]*(.*)$', caseSensitive: false);
    final chapterMatch = chapterReg.firstMatch(res);
    if (chapterMatch != null) {
      final chNum = chapterMatch.group(1);
      final chTitle = chapterMatch.group(2)?.trim() ?? '';
      final translatedChTitle = chTitle.isNotEmpty ? translate(chTitle, isEn: true) : '';
      return translatedChTitle.isNotEmpty ? 'Chapter $chNum: $translatedChTitle' : 'Chapter $chNum';
    }

    // 2. Mẫu Bài học (Lesson)
    final lessonReg = RegExp(r'^(?:Video\s+)?Bài\s+(\d+)[:\s]*(.*)$', caseSensitive: false);
    final lessonMatch = lessonReg.firstMatch(res);
    if (lessonMatch != null) {
      final lNum = lessonMatch.group(1);
      final lTitle = lessonMatch.group(2)?.trim() ?? '';
      final translatedLTitle = lTitle.isNotEmpty ? translate(lTitle, isEn: true) : '';
      return translatedLTitle.isNotEmpty ? 'Lesson $lNum: $translatedLTitle' : 'Lesson $lNum';
    }

    // 3. Mẫu Câu hỏi kiểm tra (Question)
    final questionReg = RegExp(r'^Câu\s+(\d+)[:\s]*(.*)$', caseSensitive: false);
    final questionMatch = questionReg.firstMatch(res);
    if (questionMatch != null) {
      final qNum = questionMatch.group(1);
      final qText = questionMatch.group(2)?.trim() ?? '';
      final translatedQText = qText.isNotEmpty ? translate(qText, isEn: true) : '';
      return translatedQText.isNotEmpty ? 'Question $qNum: $translatedQText' : 'Question $qNum';
    }

    // 4. Mẫu Bài kiểm tra (Quiz Assessment)
    final evalQuizReg = RegExp(r'^Bài kiểm tra đánh giá:\s*(.*)$', caseSensitive: false);
    final evalMatch = evalQuizReg.firstMatch(res);
    if (evalMatch != null) {
      final cTitle = evalMatch.group(1)?.trim() ?? '';
      return 'Evaluation Assessment: ${translate(cTitle, isEn: true)}';
    }

    final moduleQuizReg = RegExp(r'^Bài kiểm tra Module\s+(\d+)[:\s]*(.*)$', caseSensitive: false);
    final moduleMatch = moduleQuizReg.firstMatch(res);
    if (moduleMatch != null) {
      final mNum = moduleMatch.group(1);
      final mTitle = moduleMatch.group(2)?.trim() ?? '';
      return 'Module $mNum Quiz: ${translate(mTitle, isEn: true)}';
    }

    final compQuizReg = RegExp(r'^Bài kiểm tra Đánh giá Năng lực Thực hành Tổng hợp\s*[-–]\s*(.*)$', caseSensitive: false);
    final compMatch = compQuizReg.firstMatch(res);
    if (compMatch != null) {
      final cTitle = compMatch.group(1)?.trim() ?? '';
      return 'Comprehensive Practical Qualification Assessment - ${translate(cTitle, isEn: true)}';
    }

    // 5. Mẫu giờ học / khóa học / video / bài kiểm tra
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+bài học video', caseSensitive: false), (m) => '${m[1]} video lessons');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+bài giảng video', caseSensitive: false), (m) => '${m[1]} video lectures');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+video bài giảng', caseSensitive: false), (m) => '${m[1]} video lectures');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+bài học', caseSensitive: false), (m) => '${m[1]} lessons');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+bài giảng', caseSensitive: false), (m) => '${m[1]} lectures');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+bài kiểm tra trắc nghiệm', caseSensitive: false), (m) => '${m[1]} multiple choice quizzes');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+bài kiểm tra', caseSensitive: false), (m) => '${m[1]} quizzes');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+câu hỏi', caseSensitive: false), (m) => '${m[1]} questions');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+câu', caseSensitive: false), (m) => '${m[1]} questions');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+giờ đào tạo', caseSensitive: false), (m) => '${m[1]} training hours');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+giờ học', caseSensitive: false), (m) => '${m[1]} learning hours');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+khóa đang tham gia', caseSensitive: false), (m) => '${m[1]} enrolled courses');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+buổi còn lại', caseSensitive: false), (m) => '${m[1]} sessions left');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+buổi đã dùng', caseSensitive: false), (m) => '${m[1]} sessions completed');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+buổi hoàn thành', caseSensitive: false), (m) => '${m[1]} sessions completed');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+gói đang dùng', caseSensitive: false), (m) => '${m[1]} active packages');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+đã dùng', caseSensitive: false), (m) => '${m[1]} used');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+bài đạt', caseSensitive: false), (m) => '${m[1]} passed');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+đã đăng ký', caseSensitive: false), (m) => '${m[1]} enrolled');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+video', caseSensitive: false), (m) => '${m[1]} videos');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+phút đọc', caseSensitive: false), (m) => '${m[1]} mins read');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+phút', caseSensitive: false), (m) => '${m[1]} mins');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+buổi', caseSensitive: false), (m) => '${m[1]} sessions');
    res = res.replaceAllMapped(RegExp(r'(\d+)\s+tuần', caseSensitive: false), (m) => '${m[1]} weeks');

    final sessionIdxReg = RegExp(r'Buổi\s+(\d+)');
    res = res.replaceAllMapped(sessionIdxReg, (m) => 'Session ${m[1]}');

    final upcomingTabReg = RegExp(r'Sắp tới\s*\((\d+)\)');
    res = res.replaceAllMapped(upcomingTabReg, (m) => 'Upcoming (${m[1]})');

    final completedTabReg = RegExp(r'Đã hoàn thành\s*\((\d+)\)');
    res = res.replaceAllMapped(completedTabReg, (m) => 'Completed (${m[1]})');

    // Ngày tháng
    final monthReg = RegExp(r'Tháng\s+(\d+)(?:,\s+(\d+))?');
    final monthNames = {
      1: 'January', 2: 'February', 3: 'March', 4: 'April',
      5: 'May', 6: 'June', 7: 'July', 8: 'August',
      9: 'September', 10: 'October', 11: 'November', 12: 'December'
    };
    res = res.replaceAllMapped(monthReg, (m) {
      final mNum = int.tryParse(m[1] ?? '') ?? 1;
      final yearPart = m[2] != null ? ', ${m[2]}' : '';
      return '${monthNames[mNum] ?? m[1]}$yearPart';
    });

    return res;
  }

  // Từ điển ánh xạ toàn diện Database + UI Strings
  static final Map<String, String> _dictionary = {

    // =========================================================================
    // ACADEMY & DOCUMENTS 100% COMPREHENSIVE TRANSLATIONS
    // =========================================================================
    'Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu': 'Foundational Manual Lymphatic Drainage for Beginners',
    'DẪN LƯU BẠCH HUYẾT NỀN TẢNG CHO NGƯỜI MỚI BẮT ĐẦU': 'FOUNDATIONAL MANUAL LYMPHATIC DRAINAGE FOR BEGINNERS',
    'Dẫn lưu bạch huyết cơ bản cho người mới bắt đầu': 'Basic Manual Lymphatic Drainage for Beginners',
    'Dẫn lưu bạch huyết cơ bản cho người mới bắt đầu - Level 0': 'Basic Manual Lymphatic Drainage for Beginners - Level 0',
    'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI MỚI BẮT ĐẦU': 'BASIC MANUAL LYMPHATIC DRAINAGE FOR BEGINNERS',
    'Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú': 'Post-Breast Cancer Surgery Arm Edema Prevention Course',
    'Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú': 'Post-Breast Cancer Surgery Arm Edema Prevention',
    'Hướng dẫn xây dựng chế độ ăn phòng ngừa bệnh lý tuyến vú': 'Nutrition Guidelines for Breast Health Prevention',
    'Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật tuyến vú': 'Post-Breast Surgery Arm Edema Prevention Course',
    'Hướng dẫn phòng ngừa phù tay sau phẫu thuật tuyến vú': 'Post-Breast Surgery Arm Edema Prevention',
    'Khoá học Chuyên đề: CHĂM SÓC MẸ SAU SINH': 'Thematic Course: POSTPARTUM MATERNAL CARE',
    'Khoá học Chuyên đề Chăm sóc mẹ sau sinh': 'Thematic Course: Postpartum Maternal Care',
    'Chăm sóc mẹ sau sinh': 'Postpartum Maternal Care',
    'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI LÀM NGHỀ - Level 1': 'BASIC MANUAL LYMPHATIC DRAINAGE FOR PRACTITIONERS - Level 1',
    'Dẫn lưu bạch huyết cơ bản cho người làm nghề': 'Basic Manual Lymphatic Drainage for Practitioners',
    'DẪN LƯU BẠCH HUYẾT NÂNG CAO CHO NGƯỜI LÀM NGHỀ - Level 2': 'ADVANCED MANUAL LYMPHATIC DRAINAGE FOR PRACTITIONERS - Level 2',
    'Dẫn lưu bạch huyết nâng cao cho người làm nghề': 'Advanced Manual Lymphatic Drainage for Practitioners',
    'DẪN LƯU BẠCH HUYẾT CHUYÊN SÂU CHO NGƯỜI LÀM NGHỀ - Level 3': 'INTENSIVE MANUAL LYMPHATIC DRAINAGE FOR PRACTITIONERS - Level 3',
    'Dẫn lưu bạch huyết chuyên sâu cho người làm nghề': 'Intensive Manual Lymphatic Drainage for Practitioners',
    'DẪN LƯU BẠCH HUYẾT CHUYÊN SÂU CHO NGƯỜI LÀM NGHỀ': 'INTENSIVE MANUAL LYMPHATIC DRAINAGE FOR PRACTITIONERS',
    'Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT': 'Edema Reduction via MLD & CDT Compression Bandaging',
    'Chương trình: PHÁT TRIỂN GIẢNG VIÊN VÀ HỌC THUẬT': 'Program: FACULTY AND ACADEMIC DEVELOPMENT',
    'Chương trình phát triển giảng viên và học thuật': 'Faculty and Academic Development Program',
    'Lymphatic Wellness Signature Program': 'Lymphatic Wellness Signature Program',
    'Dẫn lưu bạch huyết Vodder Chuyên Nghiệp': 'Professional Vodder Manual Lymphatic Drainage',
    'Thoát vị đĩa đệm: dẫn lưu bạch huyết có thể hỗ trợ ở đâu?': 'Herniated Disc: Where Can Manual Lymphatic Drainage Help?',
    'Tại sao dẫn lưu bạch huyết thủ công lại không gây đau?': 'Why is Manual Lymphatic Drainage Pain-Free?',
    'Dẫn lưu bạch huyết MLD – Giải pháp vàng tiêu dịch và giảm phù nề sau phẫu thuật': 'MLD Lymphatic Drainage – The Golden Solution for Fluid Clearance and Post-Op Edema Reduction',
    'Nguyên tắc 4 KHÔNG trong chăm sóc hệ bạch huyết tại nhà theo chuẩn Vodder': 'The 4 NOs Principle in Home Lymphatic Care According to Vodder Standard',
    'Sự khác biệt căn bản giữa Massage thông thường và Dẫn lưu bạch huyết y khoa MLD': 'Fundamental Differences Between Regular Massage and Medical MLD Lymphatic Drainage',
    'Kinh nghiệm phân biệt Phù mỡ (Lipedema) và Phù bạch huyết (Lymphedema)': 'Clinical Insights on Differentiating Lipedema from Lymphedema',
    'Tài liệu & Y khoa MLD': 'Documents & Medical MLD',
    'Tài liệu & Cẩm nang Y khoa MLD': 'MLD Documents & Medical Handbook',
    'Xương khớp & Phục hồi': 'Musculoskeletal & Recovery',
    'Kỹ thuật MLD Vodder': 'MLD Vodder Technique',
    'Giảm phù nề hậu phẫu': 'Post-Op Edema Reduction',
    'Chăm sóc tại nhà': 'Home Care',
    'Chuyên môn': 'Specialized',
    'Cộng đồng MLD Việt Nam': 'MLD Vietnam Community',
    'CỘNG ĐỒNG CHUYÊN GIA MLD': 'MLD SPECIALIST COMMUNITY',
    'Cộng đồng chuyên gia MLD': 'MLD Specialist Community',
    'Cộng đồng MLD': 'MLD Community',
    'Chia sẻ ca lâm sàng & Hướng dẫn phục hồi Vodder': 'Clinical Case Sharing & Vodder Recovery Guidelines',
    'Theo dõi các tài liệu trị liệu và bài viết chuyên môn do đội ngũ Bác sĩ, Giảng viên MLD trực tiếp biên soạn.': 'Follow therapy documents and specialized articles directly written by MLD Doctors and Instructors.',
    'Chia sẻ kiến thức & tài liệu PDF chuyên môn': 'Knowledge Sharing & Specialized PDF Documents',
    'Chỉ đọc y khoa': 'Medical Read-Only',
    'Đọc tài liệu PDF': 'Read PDF Document',
    'Tóm tắt bài viết': 'Article Summary',
    'Xem bài viết': 'Read Article',
    'Các bước thực hiện chuẩn hóa:': 'Standardized Steps:',
    'Khám phù MLD': 'MLD Examination',
    'Đặt trị liệu': 'Book Therapy',
    'Bạn đang cần tư vấn hoặc gặp tình trạng phù nề?': 'Need consultation or experiencing edema / swelling?',
    'Liên hệ chuyên gia hoặc đăng ký kiểm tra phù nề y khoa trực tiếp tại cơ sở MLD Việt Nam.': 'Contact specialists or register for direct medical edema examination at MLD Vietnam.',
    'Tìm bài viết, tài liệu y khoa PDF...': 'Search articles, medical PDF documents...',
    'Tìm tài liệu, nghiên cứu lâm sàng, bài viết...': 'Search documents, clinical studies, articles...',
    'Không tìm thấy tài liệu phù hợp': 'No matching documents found',
    'Vui lòng thử từ khóa khác hoặc chọn danh mục khác': 'Please try another keyword or category',
    'Đang tải tài liệu PDF...': 'Loading PDF document...',
    'Không thể tải tài liệu PDF': 'Could not load PDF document',
    'Chương 1: Kiến thức nền tảng & Giải phẫu hệ bạch huyết': 'Chapter 1: Foundations & Lymphatic System Anatomy',
    'Kiến thức nền tảng & Giải phẫu hệ bạch huyết': 'Foundations & Lymphatic System Anatomy',
    'Bài 1: Tổng quan và nguyên lý áp lực lông vũ Vodder': 'Lesson 1: Overview and Vodder Feather-Touch Pressure Principles',
    'Tổng quan và nguyên lý áp lực lông vũ Vodder': 'Overview and Vodder Feather-Touch Pressure Principles',
    'Bài 2: Hướng dòng chảy và kỹ thuật xoay vòng (Stationary Circles)': 'Lesson 2: Flow Direction and Stationary Circles Technique',
    'Hướng dòng chảy và kỹ thuật xoay vòng (Stationary Circles)': 'Flow Direction and Stationary Circles Technique',
    'Chương 2: Thực hành lâm sàng & Phác đồ trị liệu': 'Chapter 2: Clinical Practice & Therapy Protocols',
    'Thực hành lâm sàng & Phác đồ trị liệu': 'Clinical Practice & Therapy Protocols',
    'Bài 3: Thực hành dẫn lưu vùng cổ gáy và hạch nách': 'Lesson 3: Neck, Nape and Axillary Node Drainage Practice',
    'Thực hành dẫn lưu vùng cổ gáy và hạch nách': 'Neck, Nape and Axillary Node Drainage Practice',
    'Bài 4: Kỹ thuật bơm (Pump technique) và miết đẩy (Scoop technique)': 'Lesson 4: Pump Technique and Scoop Technique',
    'Kỹ thuật bơm (Pump technique) và miết đẩy (Scoop technique)': 'Pump Technique and Scoop Technique',
    'Chương 1: Giải phẫu & Sinh lý hệ bạch huyết': 'Chapter 1: Lymphatic System Anatomy & Physiology',
    'Giải phẫu & Sinh lý hệ bạch huyết': 'Lymphatic System Anatomy & Physiology',
    'Bài 1: Nhận biết sớm dấu hiệu phù - chủ động giảm nguy cơ phù tay sau phẫu thuật': 'Lesson 1: Early Detection of Edema - Proactively Reducing Post-Surgery Arm Swelling',
    'Nhận biết sớm dấu hiệu phù - chủ động giảm nguy cơ phù tay sau phẫu thuật': 'Early Detection of Edema - Proactively Reducing Post-Surgery Arm Swelling',
    'Bài 2: Cấu tạo mao mạch và hạch bạch huyết': 'Lesson 2: Capillary Structure and Lymph Nodes',
    'Cấu tạo mao mạch và hạch bạch huyết': 'Capillary Structure and Lymph Nodes',
    'Bài 3: Áp lực mô và cơ chế hình thành dịch phù': 'Lesson 3: Tissue Pressure and Edema Fluid Formation',
    'Áp lực mô và cơ chế hình thành dịch phù': 'Tissue Pressure and Edema Fluid Formation',
    'Chương 2: Nguyên lý 4 thao tác dẫn lưu cơ bản': 'Chapter 2: Principles of 4 Basic Drainage Strokes',
    'Nguyên lý 4 thao tác dẫn lưu cơ bản': 'Principles of 4 Basic Drainage Strokes',
    'Bài 4: Thao tác xoay tròn tĩnh (Stationary Circles)': 'Lesson 4: Stationary Circles Stroke',
    'Thao tác xoay tròn tĩnh (Stationary Circles)': 'Stationary Circles Stroke',
    'Bài 5: Thao tác ép bơm (Pump technique)': 'Lesson 5: Pump Technique',
    'Thao tác ép bơm (Pump technique)': 'Pump Technique',
    'Bài 6: Thao tác múc và cuộn (Scoop & Rotary)': 'Lesson 6: Scoop & Rotary Strokes',
    'Thao tác múc và cuộn (Scoop & Rotary)': 'Scoop & Rotary Strokes',
    'Chương 3: Phác đồ lâm sàng & Thực hành cầm tay chỉ việc': 'Chapter 3: Clinical Protocols & Hands-On Practice',
    'Phác đồ lâm sàng & Thực hành cầm tay chỉ việc': 'Clinical Protocols & Hands-On Practice',
    'Bài 7: Quy trình dẫn lưu vùng cổ vai gáy và đầu mặt': 'Lesson 7: Neck, Shoulder & Face-Head Drainage Protocol',
    'Quy trình dẫn lưu vùng cổ vai gáy và đầu mặt': 'Neck, Shoulder & Face-Head Drainage Protocol',
    'Bài 8: Xử lý phù chi và phòng ngừa biến chứng': 'Lesson 8: Extremity Edema Management and Complication Prevention',
    'Xử lý phù chi và phòng ngừa biến chứng': 'Extremity Edema Management and Complication Prevention',
    'Kỹ thuật viên XBBH/PHCN/Mẹ & Bé': 'Massage / Rehab / Mother & Baby Technicians',
    'Kỹ thuật viên XBBH/PHCN/VLTL': 'PT / Rehab & Massage Technicians',
    'Kỹ thuật viên XBBH/PHCN/VLTL & Y bác sĩ': 'Technicians & Medical Doctors',
    'Nhân viên y tế/bác sĩ': 'Medical Staff & Doctors',
    'Giảng viên & Kỹ thuật viên Trưởng': 'Instructors & Chief Technicians',
    'Spa & Wellness': 'Spa & Wellness',
    'Khóa học đã đăng ký': 'Enrolled Courses',
    'Học để có kiến thức nền tảng và tự chăm sóc cơ bản': 'Learn foundational knowledge and basic self-care',
    'Tích hợp dịch vụ mới vào cơ sở đã có sẵn': 'Integrate new services into existing facility',
    'Học nghề để mở cơ sở chăm sóc': 'Learn skills to open care facility',
    'Chi tiết lớp học': 'Class Details',
    'Nội dung học': 'Curriculum',
    'Giáo trình & Tài liệu khóa học': 'Course Syllabus & Materials',
    'Bao gồm slide bài giảng, tài liệu kỹ thuật và quy chuẩn vệ sinh Spa.': 'Includes lecture slides, technical documents, and Spa hygiene standards.',
    'Xem lịch học đầy đủ & điểm danh': 'View full class schedule & attendance',
    'Buổi thực hành sắp tới': 'Upcoming Practice Session',
    'Thực hành kỹ thuật massage cơ bản': 'Basic massage technique practice',
    'Phòng thực hành 02 · Chi nhánh Quận 3': 'Practice Room 02 · District 3 Branch',
    'Ban Đào tạo Học viện MLD Việt Nam': 'MLD Vietnam Academy Academic Board',
    'Tháng 10': 'October',
    'Đã học': 'Completed',
    'Vào học': 'Start',
    'Đã hoàn thành tất cả video!': 'Completed all videos!',
    'Bắt đầu học ngay': 'Start Learning Now',
    'Tiếp tục bài học': 'Continue Lesson',
    'Video bài học': 'Video Lessons',
    'Thông tin khóa học': 'Course Information',
    'Giới thiệu tổng quan': 'Course Overview',
    'Bạn sẽ học được gì?': 'What will you learn?',
    'Đăng ký để học': 'Enroll to Learn',
    'Để sau': 'Later',
    'Đã duyệt vào học': 'Enrollment Approved',
    'Hồ sơ đang chờ duyệt': 'Enrollment Pending Approval',
    'Vào học ngay': 'Start Learning',
    'Chờ duyệt hồ sơ': 'Pending Approval',
    'Đăng ký học': 'Enroll Now',
    'Đăng ký khóa học': 'Enroll in Course',
    'Đã đăng ký': 'Enrolled',
    'Chưa đăng ký': 'Not Enrolled',
    'ĐÃ ĐĂNG KÝ': 'ENROLLED',
    'CHỜ DUYỆT': 'PENDING APPROVAL',
    'ĐANG HỌC': 'IN PROGRESS',
    'Khóa học đang chờ Admin xét duyệt': 'Course Pending Admin Approval',
    'Khóa học đang chờ duyệt': 'Course Pending Approval',
    'Khóa học chưa được Admin duyệt': 'Course Not Yet Approved by Admin',
    'Bấm vào video để mở xem clip. Đăng ký để mở khóa toàn bộ khóa học.': 'Tap on a video to play. Enroll to unlock the full course.',
    'Đang cập nhật danh sách video bài giảng...': 'Updating video lecture list...',
    'Video Bài': 'Lesson',
    'Video bài giảng': 'Video Lecture',
    'Đã xem hết ✓': 'Completed ✓',
    'Xem ngay ▶': 'Watch Now ▶',
    'Học thử miễn phí ▶': 'Free Preview ▶',
    'Cần đăng ký 🔒': 'Enrollment Required 🔒',
    'Cần xem bài trước 🔒': 'Previous Lesson Required 🔒',
    'Bạn đã hoàn thành bài học này. Bài học kế tiếp đã được mở khóa.': 'You have completed this lesson. The next lesson has been unlocked.',
    'Hệ thống tự động ghi nhớ vị trí xem. Bạn cần xem hết video để mở khóa bài tiếp theo.': 'The system automatically remembers playback progress. Complete the full video to unlock the next lesson.',
    'Chọn khóa học để làm bài kiểm tra:': 'Select a course to take quiz:',
    'Chưa có bài kiểm tra nào được tạo cho khóa học này.': 'No quizzes created for this course yet.',
    'Chưa làm bài': 'Not Taken',
    'ĐẠT': 'PASSED',
    'CHƯA ĐẠT': 'FAILED',
    'Xem lại bài thi': 'Review Quiz',
    'Bắt đầu làm lại': 'Retake Quiz',
    'Bắt đầu': 'Start',
    'Bài kiểm tra trắc nghiệm': 'Quiz Assessment',
    'Bài kiểm tra': 'Quiz Assessment',
    'Xác nhận nộp bài': 'Confirm Submission',
    'Nộp bài ngay': 'Submit Now',
    'Nộp bài': 'Submit',
    'Làm tiếp': 'Continue',
    'Đã làm:': 'Answered:',
    'Tiêu chí đạt:': 'Passing criteria:',
    'Lần làm gần nhất: ĐẠT': 'Latest attempt: PASSED',
    'Lần làm gần nhất: CHƯA ĐẠT': 'Latest attempt: FAILED',
    'CHÚC MỪNG: ĐẠT TIÊU CHUẨN': 'CONGRATULATIONS: PASSED',
    'KẾT QUẢ: CHƯA ĐẠT': 'RESULT: FAILED',
    'Điểm số đạt được:': 'Score achieved:',
    'Số câu trả lời đúng:': 'Correct answers:',
    'Tiêu chí đạt quy định:': 'Passing criteria:',
    'Xem lại đáp án & Giải thích': 'Review Answers & Explanations',
    'Làm lại bài': 'Retake',
    'Đóng bài thi': 'Close',
    'Giấy chứng nhận tốt nghiệp': 'Graduation Certificate',
    'HỌC VIỆN MLD VIỆT NAM': 'MLD VIETNAM ACADEMY',
    'GIẤY CHỨNG NHẬN ĐÀO TẠO NGHỀ': 'VOCATIONAL TRAINING CERTIFICATE',
    'Chứng nhận học viên': 'Certifies Student',
    'Đã hoàn thành xuất sắc khóa đào tạo chuyên sâu:': 'Has successfully completed the intensive training course:',
    'Mã Giấy chứng nhận:': 'Certificate Code:',
    'Ngày cấp:': 'Date Issued:',
    'Quét mã QR để tra cứu tính xác thực trực tuyến': 'Scan QR code to verify authenticity online',
    'Giấy chứng nhận được lưu trữ điện tử vĩnh viễn trên hệ thống MLD Vietnam.': 'This certificate is permanently stored on the MLD Vietnam system.',
    'Xem chứng nhận': 'View Certificate',
    'Tải chứng nhận PDF': 'Download PDF Certificate',
    'Chưa có kết quả học tập & giấy chứng nhận': 'No learning results & certificates yet',
    'Chưa có lịch học thực hành trực tiếp': 'No live practical schedule yet',
    'Xem danh mục 11 khóa học': 'View 11 Courses Catalog',
    'Học phí niêm yết:': 'Listed Tuition:',
    'Học phí trọn gói:': 'Comprehensive Tuition:',
    '1. Thông tin cá nhân học viên': '1. Student Personal Information',
    '2. Chọn cơ sở đào tạo': '2. Select Training Facility',
    '3. Phân nhóm đối tượng học viên': '3. Student Target Group',
    'Đã hiểu & Hoàn tất': 'Understood & Completed',
    'Chờ nhân viên duyệt': 'Pending Staff Approval',
    'Trạng thái: Chờ nhân viên duyệt': 'Status: Pending Staff Approval',
    'Chờ duyệt tuyển sinh': 'Admissions Pending Approval',
    'Họ và tên *': 'Full Name *',
    'Số điện thoại *': 'Phone Number *',
    'Email liên hệ *': 'Contact Email *',
    'Nhập họ và tên đầy đủ': 'Enter full name',
    'Nhập số điện thoại nhận thông báo': 'Enter phone number for notifications',
    'Nhập địa chỉ email nhận tài liệu': 'Enter email to receive materials',
    'Nền tảng chăm sóc cơ thể và kỹ thuật massage dẫn lưu chuẩn Vodder': 'Foundations of body care and standardized Vodder drainage massage technique',
    'Quy trình chuẩn bị và thực hiện dịch vụ an toàn y khoa': 'Medical-safe preparation and service execution procedures',
    'Tìm hiểu nhu cầu, tư vấn giao tiếp chuyên nghiệp với khách hàng': 'Customer consultation and professional communication standards',
    'Vệ sinh, vô trùng và chuẩn hóa không gian trị liệu': 'Hygiene, sterilization, and therapy environment standardization',
    'Rèn luyện thao tác thực hành lực nhẹ 30-40 mmHg': 'Practice light-pressure strokes at 30-40 mmHg',
    'Tác phong chuyên nghiệp và chuẩn mực đạo đức nghề nghiệp': 'Professional conduct and workplace ethical standards',

    // =========================================================================
    // 1. DỊCH VỤ TRỊ LIỆU (DATABASE SERVICES & CATEGORIES)
    // =========================================================================
    'Điều trị dẫn lưu phù bạch huyết chuyên sâu (Vodder MLD)': 'Intensive Manual Lymphatic Drainage Therapy (Vodder MLD)',
    'Điều trị dẫn lưu phù bạch huyết': 'Manual Lymphatic Drainage Therapy',
    'Lưu phù bạch huyết': 'Manual Lymphatic Drainage',
    'Dẫn lưu bạch huyết giảm phù': 'Manual Lymphatic Drainage - Edema Relief',
    'Dẫn lưu Bạch huyết Giảm phù': 'Manual Lymphatic Drainage - Edema Relief',
    'Dẫn lưu bạch huyết thủ công vùng ngực': 'Manual Lymphatic Drainage - Chest Area',
    'Dẫn lưu ngực': 'Chest Drainage',
    'Dẫn lưu bạch huyết thủ công vùng đầu': 'Manual Lymphatic Drainage - Head Area',
    'Dẫn lưu đầu': 'Head Drainage',
    'Dẫn lưu bạch huyết thủ công vùng cổ vai gáy lưng': 'Manual Lymphatic Drainage - Neck, Shoulders & Back',
    'Dẫn lưu cổ vai gáy lưng': 'Neck, Shoulders & Back Drainage',
    'Dẫn lưu bạch huyết thủ công vùng chân': 'Manual Lymphatic Drainage - Leg Area',
    'Dẫn lưu chân': 'Leg Drainage',
    'Dẫn lưu bạch huyết thủ công vùng bụng': 'Manual Lymphatic Drainage - Abdomen Area',
    'Dẫn lưu bụng': 'Abdomen Drainage',
    'Điều trị phù bạch huyết': 'Lymphedema Therapy',
    'Tất cả dịch vụ': 'All Services',
    'Dịch vụ trị liệu': 'Therapy Services',
    'Dịch vụ trị liệu nổi bật': 'Featured Therapy Services',
    'Dịch vụ': 'Services',
    'Giá dịch vụ': 'Service Price',
    'Tiền dịch vụ': 'Service Fee',
    'Tổng tiền dịch vụ': 'Total Service Fee',
    'Tổng tiền': 'Total Amount',
    'Tổng tiền:': 'Total Amount:',
    'Đặt cọc trước (20%)': 'Advance Deposit (20%)',
    'Đặt cọc trước': 'Advance Deposit',

    'Thời lượng ca': 'Duration',
    'Thời lượng': 'Duration',
    'Phút': 'mins',
    'phút': 'mins',

    // =========================================================================
    // 2. CHI NHÁNH & CƠ SỞ (DATABASE BRANCHES)
    // =========================================================================
    'Trụ sở MLD Việt Nam (5 Master LV3) - Hotline: 096.7786.399': 'MLD Vietnam Headquarters (5 Master LV3) - Hotline: 096.7786.399',
    'Trụ sở chính MLD Việt Nam · Hotline: 096.7786.399': 'MLD Vietnam HQ · Hotline: 096.7786.399',
    'MLD Beauty & Spa — Cơ sở Nguyễn Thị Minh Khai': 'MLD Beauty & Spa — Nguyen Thi Minh Khai Branch',
    'Số 260, Ngõ 271 Bùi Xương Trạch, Khương Đình, Hà Nội, Phường Khương Đình, Thành phố Hà Nội': 'No. 260, Alley 271 Bui Xuong Trach, Khuong Dinh, Hanoi',
    'Số 45 Nguyễn Thị Minh Khai, Phường Bến Nghé': 'No. 45 Nguyen Thi Minh Khai, Ben Nghe Ward',
    'Chi nhánh thực hiện': 'Selected Branch',
    'Chọn chi nhánh': 'Select Branch',
    'Chọn cơ sở / chi nhánh': 'Select Branch / Facility',
    'Vui lòng chọn cơ sở/chi nhánh trị liệu': 'Please select a therapy branch / facility',
    'Tất cả cơ sở': 'All Branches',
    'Tất cả chi nhánh': 'All Branches',
    'Cơ sở': 'Branches',
    'Chi nhánh': 'Branch',
    'Cơ sở đào tạo': 'Training Facility',
    'Xem danh sách tất cả cơ sở': 'View all branches',

    // =========================================================================
    // 3. CHUYÊN VIÊN & KỸ THUẬT VIÊN (DATABASE SPECIALISTS)
    // =========================================================================
    'Kỹ thuật viên bất kỳ': 'Any Available Specialist',
    'Kỹ thuật viên sắp xếp tự động': 'Assigned automatically by branch',
    'Chuyên viên': 'Specialist',
    'Chuyên viên trị liệu': 'Therapy Specialist',
    'Chuyên viên thực hiện': 'Therapy Specialist',
    'Chọn chuyên viên': 'Select Specialist',
    'Kỹ thuật viên': 'Technician',
    'Kỹ thuật viên Trưởng': 'Chief Technician',
    'Kỹ thuật viên chính': 'Lead Technician',
    'Chuyên gia Trị liệu & Phục hồi': 'Therapy & Recovery Specialist',
    'Chuyên gia Dinh dưỡng & Miễn dịch': 'Nutrition & Immunology Specialist',
    'Giảng viên chuyên môn MLD': 'MLD Master Trainer',
    'Giảng viên': 'Instructor',
    'Trần Lan Anh': 'Lan Anh Tran',
    'Lê Quỳnh Nga': 'Quynh Nga Le',
    'Nguyễn Thu Hà': 'Thu Ha Nguyen',
    'Trần Minh Phương': 'Minh Phuong Tran',
    'Lê Hoài An': 'Hoai An Le',
    'Phạm Thảo Vy': 'Thao Vy Pham',
    'Võ Hoàng Yến': 'Hoang Yen Vo',
    'Chuyên viên Trị liệu Cấp cao': 'Senior Therapy Specialist',
    'Chuyên viên Chăm sóc da & Dưỡng sinh': 'Skincare & Body Therapy Specialist',
    'Chuyên viên Chăm sóc Da & Phục hồi': 'Skincare & Recovery Specialist',
    'Kỹ thuật viên Trị liệu & Bấm huyệt': 'Acupressure & Therapy Technician',
    'Chuyên viên Dưỡng sinh Body & Thư giãn': 'Body Care & Relaxation Specialist',
    'Kỹ thuật viên Trưởng — Chăm sóc Toàn thân': 'Lead Body Care Technician',
    'Chuyên viên Thải độc & Trị liệu Thảo dược': 'Herbal Detox & Therapy Specialist',
    'năm kinh nghiệm': 'years of exp',
    'Đánh giá': 'Rating',
    'Lượt phục vụ': 'Served',

    // =========================================================================
    // 4. ĐÀO TẠO & KHÓA HỌC (DATABASE COURSES & ACADEMY)
    // =========================================================================
    'Đào tạo & Khóa học': 'Academy & Courses',
    'Đào tạo': 'Academy',
    'Khóa đào tạo': 'Training Courses',
    'Khóa học': 'Courses',
    'Người mới bắt đầu': 'Beginners',
    'Người mới bắt đầu làm nghề': 'Beginners in Profession',
    'Người mới bắt đầu học nghề': 'Beginners in Profession',
    'Người đang làm nghề': 'Practitioners',
    'Kỹ thuật viên XBBH/VLTL': 'PT & Massage Technicians',
    'Y tế & Phục hồi': 'Medical & Rehab',
    'Tất cả đối tượng': 'All Audiences',
    'Tất cả nhu cầu': 'All Needs',
    'Đối tượng': 'Target Audience',
    'Nhu cầu': 'Learning Needs',
    'Kiến thức nền tảng & Tự chăm sóc': 'Foundations & Self-Care',
    'Tích hợp dịch vụ mới': 'Integrate New Services',
    'Mở cơ sở chăm sóc': 'Start Care Center',
    'Cơ bản': 'Basic',
    'Nâng cao': 'Advanced',
    'Chuyên sâu': 'Intensive',
    'Chuyên nghiệp': 'Professional',
    'Học trực tiếp': 'In-Person Training',
    'Trực tiếp & Online': 'Hybrid (In-person & Online)',
    'Học viên': 'Students',
    'Học phí': 'Tuition',
    'Học viện MLD Việt Nam': 'Học viện MLD Việt Nam',
    'Xem chi tiết khóa học': 'View Course Details',
    'Xem chi tiết': 'View Details',
    'Đăng ký khóa học ngay': 'Enroll in Course Now',
    'Đăng ký ngay': 'Enroll Now',
    'Khám phá khóa đào tạo ngay': 'Explore Courses Now',
    'Khám phá khóa học ngay': 'Explore Courses Now',
    'Khám phá khóa học': 'Explore Courses',
    'Khóa học của tôi': 'My Courses',
    'Lịch học & điểm danh': 'Class Schedule & Attendance',
    'Lịch học': 'Class Schedule',
    'Chứng nhận': 'Certifications',
    'Kết quả học tập': 'Learning Results',
    'đã ghi danh': 'enrolled',
    'đang học': 'in progress',
    'hoàn thành': 'completed',
    'Sắp học': 'Upcoming',
    'Đã hoàn thành': 'Completed',
    'Tổng số giờ tích lũy thực hành và lý thuyết.': 'Total accumulated theory and practice hours.',
    'Chủ động theo dõi lịch đào tạo và các buổi thực hành.': 'Track training schedule and practical sessions proactively.',
    'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI MỚI BẮT ĐẦU - Level 0': 'BASIC MANUAL LYMPHATIC DRAINAGE FOR BEGINNERS - Level 0',
    'Workshop: HƯỚNG DẪN PHÒNG NGỪA PHÙ TAY SAU PHẪU THUẬT UNG THƯ VÚ': 'Workshop: POST-BREAST CANCER SURGERY ARM EDEMA PREVENTION',
    'Workshop: HƯỚNG DẪN XÂY DỰNG CHẾ ĐỘ ĂN PHÒNG NGỪA BỆNH LÝ TUYẾN VÚ': 'Workshop: NUTRITION GUIDELINES FOR BREAST HEALTH PREVENTION',
    'Workshop: HƯỚNG DẪN VẬN ĐỘNG PHÒNG NGỪA PHÙ TAY SAU PHẪU THUẬT TUYẾN VÚ': 'Workshop: REHABILITATION EXERCISES FOR POST-SURGERY EDEMA PREVENTION',
    'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI LÀM NGHỀ': 'BASIC MANUAL LYMPHATIC DRAINAGE FOR PRACTITIONERS',
    'DẪN LƯU BẠCH HUYẾT NÂNG CAO CHO NGƯỜI LÀM NGHỀ': 'ADVANCED MANUAL LYMPHATIC DRAINAGE FOR PRACTITIONERS',
    'GIẢM PHÙ BẰNG DẪN LƯU BẠCH HUYẾT VÀ BĂNG ÉP CDT': 'EDEMA REDUCTION VIA MLD & CDT COMPRESSION BANDAGING',
    'LYMPHATIC WELLNESS SIGNATURE PROGRAM': 'LYMPHATIC WELLNESS SIGNATURE PROGRAM',
    'Thực hành chuyên nghiệp': 'Professional Practice',
    'Cấp chứng nhận Level 0': 'Level 0 Certification',
    'Workshop chuyên đề': 'Specialized Workshop',
    'Workshop dinh dưỡng': 'Nutrition Workshop',
    'Workshop vận động phục hồi': 'Recovery Exercise Workshop',
    'Chứng chỉ nghề chuẩn hóa': 'Standardized Vocational Certificate',
    'Chứng chỉ Master Chuyên sâu': 'Master Intensive Certificate',
    'Chứng chỉ Trị liệu Phù Quốc tế': 'International Edema Therapy Certificate',
    'Chương trình độc quyền': 'Exclusive Signature Program',

    // =========================================================================
    // 5. TÀI LIỆU Y KHOA & CẨM NANG (DATABASE DOCUMENTS / GUIDELINES)
    // =========================================================================
    'Tài liệu & Cẩm nang': 'Documents & Guides',
    'Tài liệu y khoa': 'Medical Documents',
    'Tài liệu': 'Documents',
    'Cẩm nang': 'Handbook',
    'Phù bạch huyết & MLD': 'Lymphedema & MLD',
    'Tài liệu đào tạo': 'Training Materials',
    'Chuyên môn MLD': 'MLD Specialized',
    'Sức khỏe hệ bạch huyết': 'Lymphatic Health',
    'Nghiên cứu lâm sàng': 'Clinical Studies',
    'Hướng dẫn chăm sóc': 'Care Guidelines',
    'Dẫn lưu bạch huyết có hỗ trợ giảm đau mỏi xương khớp không?': 'Does Manual Lymphatic Drainage Help Relieve Joint and Muscle Pain?',
    'Hiệu quả của Dẫn lưu bạch huyết bằng tay (MLD) trong hỗ trợ điều trị phù nề sau phẫu thuật': 'Efficacy of Manual Lymphatic Drainage (MLD) in Post-Surgery Edema Relief',
    'Phác đồ kỹ thuật dẫn lưu bạch huyết chuyên sâu theo phương pháp Vodder chuẩn hóa': 'Standardized Vodder Method Intensive Lymphatic Drainage Protocol',
    'Chuyên gia MLD Vietnam': 'MLD Vietnam Specialist',
    'Xem bài viết chuyên môn': 'Read specialized article',

    // =========================================================================
    // 6. GÓI LIỆU TRÌNH & NHẬT KÝ (DATABASE PACKAGES & JOURNAL)
    // =========================================================================
    'Gói liệu trình của tôi': 'My Treatment Packages',
    'Gói liệu trình': 'Treatment Packages',
    'Liệu trình': 'Packages',
    'Nhật ký trị liệu': 'Care Journal',
    'Liệu Trình Phục Hồi & Trẻ Hóa Da 5 Buổi': '5-Session Skin Rejuvenation & Recovery Package',
    'Gói Dưỡng Sinh Đả Thông Kinh Lạc 10 Buổi': '10-Session Meridian Acupoint Therapy Package',
    'Đang hoạt động': 'Active',
    'Đã hết hạn': 'Expired',
    'Ưu đãi': 'Special Offer',
    'buổi còn lại': 'sessions left',
    'buổi đã dùng': 'sessions completed',
    'buổi đã thực hiện': 'sessions completed',

    // =========================================================================
    // 7. LỊCH HẸN & ĐẶT LỊCH (BOOKING & APPOINTMENTS)
    // =========================================================================
    'Đặt lịch trị liệu': 'Book Therapy Session',
    'Đặt lịch ngay': 'Book Now',
    'Đặt lịch': 'Book Now',
    'Lịch hẹn của tôi': 'My Appointments',
    'Lịch hẹn': 'Appointments',
    'sắp tới': 'upcoming',
    'Sắp tới': 'Upcoming',
    'Đã hủy': 'Cancelled',
    'Chờ xác nhận': 'Pending',
    'Đã xác nhận': 'Confirmed',
    'Đang thực hiện': 'In Progress',
    'Thông tin đặt lịch': 'Booking Summary',
    'Dịch vụ đã chọn': 'Selected Service',
    'Ngày & giờ hẹn': 'Date & Time',
    'Ngày & giờ': 'Date & Time',
    'Ghi chú': 'Notes',
    'Ghi chú thêm cho chuyên viên (không bắt buộc)...': 'Additional notes for specialist (optional)...',
    'Xác nhận đặt lịch': 'Confirm Booking',
    'Đang xử lý...': 'Processing...',
    'Xem lịch hẹn của tôi': 'View My Appointments',
    'Đặt lịch thành công!': 'Booking Confirmed!',
    'Lịch hẹn của bạn đã được ghi nhận. Chuyên viên MLD sẽ liên hệ xác nhận trong ít phút.': 'Your appointment has been booked. An MLD specialist will contact you shortly.',
    'Đổi lịch hẹn': 'Reschedule',
    'Hủy lịch hẹn': 'Cancel Appointment',
    'Chi tiết lịch hẹn': 'Appointment Details',
    'Đặt lại lịch': 'Reschedule',
    'Hủy lịch': 'Cancel',
    'Thời gian': 'Time',
    'Thời gian hẹn': 'Appointment Time',

    // =========================================================================
    // 8. TÀI KHOẢN & CÀI ĐẶT (PROFILE & SETTINGS)
    // =========================================================================
    'Tài khoản của tôi': 'My Account',
    'Cá nhân': 'Profile',
    'Trang chủ': 'Home',
    'DỊCH VỤ TRỊ LIỆU': 'THERAPY SERVICES',
    'ĐÀO TẠO & KHÓA HỌC': 'ACADEMY & COURSES',
    'CÀI ĐẶT & HỖ TRỢ': 'SETTINGS & SUPPORT',
    'Thông tin cá nhân': 'Personal Information',
    'Cài đặt ứng dụng': 'App Settings',
    'Đăng xuất': 'Sign Out',
    'Thành viên': 'Member',
    'Khách hàng': 'Customer',
    'Cài đặt': 'Settings',
    'Ngôn ngữ': 'Language',
    'Tiếng Việt': 'Tiếng Việt (Vietnamese)',
    'Tiếng Anh': 'English',
    'Cơ sở ưu tiên': 'Preferred Branch',
    'Thông báo': 'Notifications',
    'Chế độ giao diện': 'Theme Mode',
    'Sáng': 'Light',
    'Tối': 'Dark',
    'Hệ thống': 'System',
    'Bảo mật & Quyền riêng tư': 'Privacy & Security',
    'Chính sách bảo mật': 'Privacy Policy',
    'Điều khoản sử dụng': 'Terms of Service',
    'Lưu thay đổi': 'Save Changes',
    'Cập nhật': 'Update',
    'Tìm kiếm': 'Search',
    'Tìm kiếm...': 'Search...',
    'Tìm kiếm dịch vụ...': 'Search services...',
    'Tìm kiếm khóa đào tạo, giảng viên...': 'Search courses, instructors...',
    'Tìm kiếm bài viết, tài liệu y khoa...': 'Search articles, medical documents...',
    'Tất cả': 'All',
    'Đóng': 'Close',
    'Quay lại': 'Back',
    'Tiếp tục': 'Continue',
    'Xác nhận': 'Confirm',
    'Hủy': 'Cancel',
    'Đang tải...': 'Loading...',
    'Chưa có dữ liệu': 'No data available',
    'Bạn chưa có lịch hẹn nào': 'You have no appointments yet',
    'Bạn chưa có lịch học & điểm danh': 'No class schedule or attendance yet',
    'Bạn hiện chưa ghi danh khóa đào tạo nào tại Học viện MLD. Sau khi đăng ký, lịch học lý thuyết, các buổi thực hành và mã QR điểm danh sẽ xuất hiện tại đây.': 'You have not enrolled in any training course yet. Class schedule, practice sessions, and attendance QR code will appear here after enrollment.',
    'Bạn chưa có kết quả học tập & chứng nhận nào': 'No learning results or certificates yet',
    'Bạn hiện chưa tham gia khóa đào tạo nào tại Học viện MLD. Sau khi đăng ký và hoàn thành khóa học, toàn bộ kết quả đánh giá kỹ năng và chứng nhận số sẽ xuất hiện tại đây.': 'You have not completed any course yet. Skill assessments and digital certificates will appear here after completion.',
    'Bạn chưa có khóa học nào': 'You have no courses yet',
    'Khám phá danh mục các khóa đào tạo nghề Spa & Trị liệu dưỡng sinh của Học viện MLD để nâng cao tay nghề.': 'Explore training courses in therapy and skincare to advance your skills.',
    'Bạn chưa có gói liệu trình nào đang hoạt động': 'You have no active treatment packages',
    'Khám phá các dịch vụ & gói chăm sóc sức khỏe hệ bạch huyết để bắt đầu phục hồi cơ thể.': 'Explore lymphatic health services & treatment packages to start your recovery journey.',
    'Chưa có nhật ký trị liệu': 'No care journal entries yet',
    'Các buổi trị liệu và ghi nhận tiến trình phục hồi của bạn sẽ được lưu trữ chi tiết tại đây.': 'Your therapy sessions and recovery progress records will be detailed here.',
    'Chủ động đặt lịch ngay hôm nay': 'Book an appointment today',
    'Đăng nhập ngay': 'Sign In Now',
    'Đăng ký tài khoản': 'Sign Up',
    'Học viện MLD': 'Học viện MLD',

    // =========================================================================
    // 9. BỔ SUNG LỊCH HẸN, GÓI LIỆU TRÌNH & TÌM KIẾM CHI TIẾT
    // =========================================================================
    'Đang phục vụ': 'In Service',
    'Hoàn thành': 'Completed',
    'Chi phí dịch vụ': 'Service Cost',
    'Mã lịch hẹn': 'Booking Code',
    'Tiến trình': 'Progress',
    'Đã đặt': 'Booked',
    'Thực hiện': 'In Service',
    'Thông tin dịch vụ': 'Service Information',
    'Dịch vụ:': 'Service:',
    'Chi nhánh:': 'Branch:',
    'Địa chỉ:': 'Address:',
    'Thời gian:': 'Time:',
    'Chuyên viên:': 'Specialist:',
    'Ghi chú:': 'Notes:',
    'Thông tin chi phí': 'Cost Information',
    'Đơn giá:': 'Unit Price:',
    'Thuế VAT (8%):': 'VAT (8%):',
    'Tổng chi phí:': 'Total Cost:',

    'Hotline hỗ trợ: 096.7786.399': 'Support Hotline: 096.7786.399',
    'Hủy lịch hẹn này': 'Cancel this appointment',
    'Không tìm thấy thông tin lịch hẹn.': 'Appointment information not found.',
    'Đã hủy lịch hẹn theo yêu cầu': 'Appointment cancelled upon request',
    'Không thể hủy lịch hẹn. Vui lòng thử lại!': 'Could not cancel appointment. Please try again!',
    'Chưa có lịch hẹn nào sắp tới': 'No upcoming appointments',
    'Đặt lịch để được chăm sóc và phục hồi chức năng hệ bạch huyết chuyên sâu.': 'Book a session for intensive lymphatic care and recovery.',
    'Chưa có lịch hẹn hoàn thành': 'No completed appointments',
    'Các buổi trị liệu sau khi hoàn thành sẽ được lưu trữ tại đây.': 'Your completed therapy sessions will be stored here.',

    'CHĂM SÓC & TRỊ LIỆU': 'CARE & THERAPY',
    'Đang sử dụng': 'Active',
    'Hết hạn': 'Expired',
    'Tổng buổi': 'Total Sessions',
    'Đã dùng': 'Used',
    'Còn lại': 'Remaining',
    'Hạn sử dụng': 'Expiration Date',
    'Đặt buổi tiếp': 'Book Next Session',
    'Bạn chưa có gói liệu trình nào đã hoàn thành.': 'You have no completed treatment packages.',
    'Không có gói liệu trình nào hết hạn.': 'No expired treatment packages.',
    'Khám phá dịch vụ & đặt lịch': 'Explore Services & Book',

    'LỊCH SỬ TRỊ LIỆU': 'TREATMENT HISTORY',
    'Sau mỗi buổi trị liệu tại trung tâm, chuyên viên MLD sẽ ghi chép chi tiết kết quả phục hồi tại đây.': 'After each session at the center, MLD specialists will record your recovery results here.',
    'Đặt lịch trị liệu ngay': 'Book Therapy Now',
    'Ghi chú cá nhân': 'Personal Notes',
    'Ghi lại cảm nhận cơ thể hoặc điều cần trao đổi ở buổi tiếp theo...': 'Record your body feeling or notes for the next session...',
    'Lưu ghi chú': 'Save Note',
    'Đã lưu ghi chú vào nhật ký trị liệu!': 'Note saved to care journal!',
    'Chưa có gói liệu trình': 'No treatment package',
    'Khách hàng MLD': 'MLD Customer',

    'Bạn đang tìm kiếm\nđiều gì?': 'What are you\nlooking for?',
    'Tìm dịch vụ, khóa học, chuyên viên...': 'Search services, courses, specialists...',
    'Xóa tìm kiếm': 'Clear search',
    'Tìm kiếm gần đây': 'Recent Searches',
    'Tìm kiếm phổ biến': 'Popular Searches',
    'Khám phá theo nhu cầu': 'Explore by Category',
    'Dịch vụ thư giãn': 'Relaxation Services',
    'Khóa học nghề spa': 'Spa Vocational Courses',
    'Hệ thống chi nhánh': 'Branch Network',
    'Đang làm nghề': 'Professional / Practitioner',
    'Giải phẫu hệ bạch huyết': 'Lymphatic System Anatomy',
    'Đội ngũ chuyên viên': 'Specialist Team',
    'Tìm kiếm dịch vụ, chuyên viên hoặc chi nhánh': 'Search services, specialists or branches',
    'Áp lực lực ấn tiêu chuẩn trong kỹ thuật Dẫn lưu bạch huyết MLD Vodder là bao nhiêu?': 'What is the standard applied pressure in Vodder Manual Lymphatic Drainage (MLD)?',
    'Vùng nào là trung tâm gom dịch bạch huyết quan trọng nhất cần được kích hoạt đầu tiên?': 'Which region is the primary lymphatic drainage terminus that must be cleared first?',
    'Chống chỉ định tuyệt đối của phương pháp dẫn lưu bạch huyết thủ công là gì?': 'What are the absolute contraindications of manual lymphatic drainage?',
    'Kỹ thuật "Stationary Circles" (Vòng tròn tĩnh) được áp dụng hiệu quả nhất ở vùng nào?': 'In which area is the "Stationary Circles" technique most effectively applied?',
    'Hướng vuốt dẫn lưu dịch bạch huyết luôn tuân thủ nguyên tắc nào?': 'Which directional principle must lymphatic drainage strokes always adhere to?',
    'Trong điều trị phù tay sau phẫu thuật ung thư vú, mục tiêu chính của MLD là gì?': 'What is the primary clinical objective of MLD in post-mastectomy arm lymphedema?',
    'Nhịp điệu thực hiện các thao tác MLD tiêu chuẩn là như thế nào?': 'What is the standard rhythm and tempo for MLD manipulations?',
    'Kỹ thuật "Pump technique" (Kỹ thuật bơm) thường được áp dụng trên vùng nào?': 'On which anatomical areas is the "Pump technique" typically performed?',
    'Vai trò của liệu pháp băng ép CDT (Complex Decongestive Therapy) kết hợp MLD là gì?': 'What is the clinical role of CDT multi-layer bandaging combined with MLD?',
    'Tiêu chí đánh giá học viên hoàn thành đạt tiêu chuẩn của Học viện MLD Việt Nam là gì?': 'What are the qualification passing criteria established by MLD Vietnam Academy?',
    'Lực tác động tối ưu khi thực hiện động tác vuốt dẫn lưu bạch huyết theo kỹ thuật Vodder là bao nhiêu?': 'What is the optimal pressure exerted during Vodder strokes for lymphatic drainage?',
    'Trường hợp nào sau đây là CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI của liệu trình dẫn lưu bạch huyết MLD?': 'Which of the following conditions represents an ABSOLUTE CONTRAINDICATION for MLD therapy?',
    'Thứ tự dẫn lưu chuẩn y khoa theo nguyên lý Vodder là gì?': 'What is the medical sequence of drainage according to the Vodder principle?',
    'Nhịp điệu thao tác tối ưu trong kỹ thuật dẫn lưu Vodder là:': 'The optimal manipulation rhythm in the Vodder technique is:',
    'Giai đoạn nào trong chu kỳ vuốt Vodder có tác dụng hút dịch kẽ vào mao mạch bạch huyết?': 'Which phase of the Vodder stroke cycle facilitates interstitial fluid uptake into initial lymphatics?',
    'Dấu hiệu lâm sàng Stemmer (Stemmer\'s sign) dương tính biểu hiện:': 'A positive clinical Stemmer\'s sign is demonstrated by:',
    'Dấu hiệu lâm sàng Stemmer (Stemmer\\\'s sign) dương tính biểu hiện:': 'A positive clinical Stemmer\'s sign is demonstrated by:',
    'Tại sao không được sử dụng dầu massage có độ trơn cao khi thực hiện kỹ thuật Vodder chuẩn y khoa?': 'Why are high-slip massage oils prohibited when performing medical Vodder MLD?',
    'Động tác Stationary Circles (Xoay tròn tại chỗ) thường được áp dụng ưu tiên ở vùng nào?': 'Which anatomical region is Stationary Circles primarily indicated for?',
    'Tiêu chuẩn vệ sinh và kiểm soát nhiễm khuẩn bắt buộc trước khi MLD cho bệnh nhân sau phẫu thuật là:': 'The mandatory hygiene and infection control standard prior to postoperative MLD is:',
    'Học viện MLD Việt Nam quy định tiêu chí điểm đạt lý thuyết để được tham gia thực hành lâm sàng là:': 'MLD Vietnam Academy requires what passing theoretical score to enter clinical practice?',
    'Thời điểm an toàn nhất để bắt đầu MLD nhẹ nhàng cho bệnh nhân sau phẫu thuật thẩm mỹ (hút mỡ, nâng ngực) là:': 'When is the safest timeframe to initiate gentle MLD following cosmetic surgery (liposuction, mammoplasty)?',
    'Khi thực hiện dẫn lưu cho bệnh nhân phù tay sau phẫu thuật ung thư vú có nạo vét hạch nách, dòng bạch huyết được dẫn về đâu?': 'In post-mastectomy arm lymphedema with axillary node dissection, where is lymphatic fluid rerouted?',
    'Băng ép áp lực đa lớp (Multi-layer Bandaging) trong điều trị phù bạch huyết sử dụng loại băng nào?': 'Which type of compression bandage is indicated in multi-layer lymphedema bandaging?',
    'Mục đích chính của việc chăm sóc da kỹ lưỡng trong phác đồ điều trị phù bạch huyết là:': 'What is the primary objective of meticulous skin care in lymphedema management protocols?',
    'Khi phát hiện vùng điều trị của khách hàng đột ngột đỏ rực, nóng rát, sốt nhẹ và đau nhức tăng vọt, KTV cần:': 'Upon observing acute cutaneous erythema, localized heat, low fever, and surging pain, the therapist must:',
    'Kỹ thuật Pump (Ép bơm) trong Vodder mô phỏng hình dạng chuyển động nào của bàn tay?': 'Which hand movement pattern does the Vodder Pump technique simulate?',
    'Liệu trình MLD tiêu chuẩn trong giai đoạn giảm phù tích cực thường diễn ra với tần suất:': 'Standard MLD sessions during the active decongestive phase are performed at what frequency?',
    'Ống ngực (Thoracic duct) - ống bạch huyết lớn nhất cơ thể - đổ vào hệ tuần hoàn tĩnh mạch tại vị trí:': 'The thoracic duct—the largest lymphatic vessel—drains into venous circulation at:',
    'Trong phác đồ MLD Vodder vùng mặt, hướng vuốt chủ đạo từ giữa mặt là hướng về:': 'In Vodder facial protocols, the primary direction of strokes from midline is directed towards:',
    'Tiêu chí đạt điểm của bài kiểm tra này theo quy định của Ban Đào tạo Học viện là:': 'The passing threshold for this assessment according to Board guidelines is:',
    'Nguyên tắc vàng "Zero Pain" (Không đau đớn) trong kỹ thuật Vodder có ý nghĩa y khoa là:': 'The "Zero Pain" golden rule in Vodder technique holds what clinical significance?',
    'Động tác Rotary (Kỹ thuật cuộn) trong Vodder thường được chỉ định tối ưu cho vùng cơ thể nào?': 'Which body region is the Vodder Rotary technique optimally designated for?',
    'Sự khác biệt cốt lõi giữa Massage Thụy Điển cổ điển và Dẫn lưu bạch huyết Vodder MLD là:': 'What is the core distinction between classic Swedish massage and Vodder MLD?',
    'Khi nào học viên được cấp chứng chỉ thực hành chuyên nghiệp của Học viện MLD Việt Nam?': 'When does a student receive the professional practice certificate from MLD Vietnam Academy?',
    'Phù bạch huyết nguyên phát (Primary Lymphedema) có nguyên nhân chủ yếu do:': 'Primary lymphedema is predominantly caused by:',
    'Kỹ thuật Scoop (Múc) thực hiện theo hình dáng chuyển động xoắn ốc phù hợp nhất trên:': 'The spiral Scoop technique is most suitable for:',
    'Trong trường hợp bệnh nhân bị suy van tĩnh mạch chi dưới kèm phù, liệu trình MLD có tác dụng hỗ trợ:': 'In patients with chronic lower-extremity venous insufficiency and edema, MLD supports:',
    'Trọng lượng phân tử của phân tử Protein trong dịch bạch huyết là nguyên nhân khiến dịch phù:': 'High molecular weight proteins in lymphatic fluid cause the edematous fluid to:',
    'Tư thế nằm chuẩn của khách hàng khi thực hiện MLD toàn thân là:': 'The standard client positioning during full-body MLD is:',
    'Tiêu chuẩn đạt điểm quy định cho kỳ thi trắc nghiệm lý thuyết MLD là:': 'The passing standard for the MLD theoretical assessment is:',
    '30 - 40 mmHg (tương đương sức nặng đồng xu nhẹ)': '30 - 40 mmHg (equivalent to the weight of a coin)',
    '80 - 100 mmHg (ép sâu vào mô cơ)': '80 - 100 mmHg (deep muscular compression)',
    '150 mmHg (tác động lên xương)': '150 mmHg (bone impact pressure)',
    'Không giới hạn áp lực': 'Unlimited pressure',
    'Hố thượng đòn (Terminus / Supraclavicular fossa)': 'Supraclavicular fossa (Terminus)',
    'Hạch bẹn nông (Inguinal nodes)': 'Superficial inguinal lymph nodes',
    'Hạch nách (Axillary nodes)': 'Axillary lymph nodes',
    'Khoang khoeo chân (Popliteal nodes)': 'Popliteal fossa lymph nodes',
    'Nhiễm trùng cấp tính kèm sốt cao, suy tim sung huyết mất bù': 'Acute infection with high fever, decompensated congestive heart failure',
    'Nhức mỏi cơ sau tập luyện thể thao': 'Muscle soreness after athletic training',
    'Phù nề nhẹ do đứng lâu': 'Mild edema due to prolonged standing',
    'Căng thẳng mệt mỏi': 'General fatigue and stress',
    'Vùng cổ, mặt và các chuỗi hạch bạch huyết tập trung': 'Neck, face, and clustered lymphatic node chains',
    'Bắp chân và bàn chân': 'Calves and feet',
    'Vùng lưng dưới': 'Lower back region',
    'Cẳng tay': 'Forearms',
    'Dẫn lưu hướng tâm về cụm hạch vùng tương ứng': 'Centripetal drainage towards corresponding regional lymph nodes',
    'Ly tâm ra xa tim': 'Centrifugal away from the heart',
    'Xoay tròn tại chỗ không định hướng': 'Non-directional circular rubbing in place',
    'Vuốt ngược chiều tuần hoàn': 'Stroking against the circulatory direction',
    'Chuyển hướng dòng dịch ứ đọng sang các vùng dẫn lưu lân cận còn nguyên vẹn': 'Rerouting stagnant fluid to intact adjacent drainage territories',
    'Đánh tan mô mỡ cánh tay': 'Breaking down arm adipose tissue',
    'Làm săn chắc cơ nhị đầu': 'Toning the biceps muscle',
    'Tăng tuần hoàn máu động mạch': 'Accelerating arterial blood circulation',
    'Chậm rãi, nhịp nhàng khoảng 1 giây cho mỗi chu kỳ đẩy': 'Slow, rhythmic, approximately 1 second per working phase cycle',
    'Rất nhanh và liên tục như gõ cơ': 'Very fast and continuous like muscle tapotement',
    'Thao tác mạnh và giữ chặt 10 giây': 'Forceful compression held firmly for 10 seconds',
    'Tùy ý kỹ thuật viên': 'At the discretion of the therapist',
    'Các chi hình trụ (cánh tay, cẳng chân, đùi)': 'Cylindrical limbs (arms, forearms, calves, thighs)',
    'Hốc mắt và cánh mũi': 'Eye sockets and nasal alae',
    'Xương bánh chè': 'Patella area',
    'Đỉnh đầu': 'Vertex of the scalp',
    'Duy trì giảm thể tích dịch sau khi MLD và ngăn ứ đọng tái phát': 'Maintaining reduced fluid volume post-MLD and preventing recurrence',
    'Làm ấm cơ bắp': 'Warming up muscle tissue',
    'Tăng áp lực động mạch ngoại biên': 'Increasing peripheral arterial blood pressure',
    'Chỉ có tác dụng thẩm mỹ': 'Cosmetic aesthetic effect only',
    'Điểm bài kiểm tra lý thuyết >= 8.0/10 và đúng kỹ thuật lực ấn': 'Theoretical score >= 8.0/10 with validated pressure technique',
    'Chỉ cần xem hết video': 'Only watching all lesson videos',
    'Điểm kiểm tra >= 5.0/10': 'Test score >= 5.0/10',
    'Điểm danh đủ buổi không cần thi': 'Attendance without evaluation',
    'Rất nhẹ, khoảng 30 - 40 mmHg (chỉ làm căng nhẹ lớp da bì)': 'Very gentle, approximately 30 - 40 mmHg (slight stretch of dermis only)',
    'Lực mạnh từ 80 - 100 mmHg tác động sâu vào khối cơ': 'Strong pressure 80 - 100 mmHg penetrating deep into muscle mass',
    'Ấn day điểm huyệt liên tục với lực tăng dần': 'Continuous acupressure with progressively increasing pressure',
    'Tùy thuộc vào ngưỡng chịu đau của bệnh nhân': 'Depending on patient pain tolerance threshold',
    'Phù nề nhẹ sau phẫu thuật hút mỡ 3 tuần': 'Mild postoperative edema 3 weeks post-liposuction',
    'Viêm tĩnh mạch huyết khối cấp tính (DVT) & suy tim mất bù': 'Acute deep vein thrombosis (DVT) & decompensated heart failure',
    'Mệt mỏi căng thẳng sau ngày làm việc': 'Fatigue and stress after a work day',
    'Phù nề chân lành sau phẫu thuật thay khớp': 'Edema of uninjured leg after joint replacement surgery',
    'Dẫn lưu từ vùng ngọn chi trước, sau đó mới vào vùng gốc chi': 'Draining distal limb first, then proceeding to proximal root',
    'Khai thông trạm hạch trung tâm (vùng cổ - xương đòn) trước, sau đó dẫn lưu từ gốc chi đến ngọn chi': 'Clearing central node stations (supraclavicular Terminus) first, then proximal-to-distal limb preparation',
    'Tập trung xoa bóp trực tiếp vào vùng phù nề nặng nhất trước': 'Directly massaging the most severe edema site first',
    'Thao tác ngẫu nhiên theo cảm nhận của kỹ thuật viên': 'Random strokes based on practitioner intuition',
    'Nhanh, dồn dập, khoảng 60-80 lần/phút để tăng nhiệt độ da': 'Rapid, vigorous 60-80 strokes/min to elevate skin temperature',
    'Chậm rãi, nhịp nhàng, khoảng 5-7 lần/phút tương ứng nhịp co bóp tự nhiên của mạch bạch huyết': 'Slow, rhythmic, about 5-7 strokes/min matching natural lymphangion pulsations',
    'Ngắt quãng đột ngột, ấn giữ 30 giây rồi thả mạnh': 'Abrupt intermittent pressure held for 30s then released sharply',
    'Thay đổi tốc độ liên tục để kích thích phản xạ thần kinh': 'Constantly varying speed to stimulate neural reflexes',
    'Pha tăng áp (Working phase) làm căng giãn các sợi tơ neo (Anchoring filaments)': 'Working phase stretching anchoring filaments to open junction valves',
    'Pha thả lỏng hoàn toàn tách tay khỏi bề mặt da': 'Rest phase completely lifting hand from the skin surface',
    'Pha ấn sâu giữ nguyên vị trí': 'Deep static compression phase',
    'Pha chà xát sinh nhiệt': 'Friction rubbing phase to generate heat',
    'Da vùng mu ngón chân/tay không thể véo hoặc nhấc lên được do phù bạch huyết xơ hóa': 'Inability to pinch or lift the skin fold at base of second toe/finger due to fibrotic lymphedema',
    'Vết lõm sâu khi ấn tay vào và hồi phục ngay trong 3 giây': 'Deep pitting indentation that rebounds within 3 seconds',
    'Đau nhói khi sờ nắn dọc theo đường đi của tĩnh mạch nông': 'Sharp localized tenderness upon palpation along superficial veins',
    'Da bị bong tróc vảy trắng và ngứa ngáy': 'White flaking skin desquamation with localized pruritus',
    'Dầu trơn làm mất độ bám dính cần thiết để kéo căng và đàn hồi lớp da bì': 'Excessive slip eliminates the skin traction required to stretch dermal fibers',
    'Dầu massage gây kích ứng da 100% người bệnh': 'Massage oil induces dermatitis in 100% of patients',
    'Dầu massage làm tắc nghẽn lỗ chân lông ngay lập tức': 'Massage oil immediately clogs cutaneous pores',
    'Chi phí dầu massage quá cao': 'Massage oil cost is too prohibitive',
    'Vùng cổ (hố thượng đòn, cổ bên), vùng mặt và các chuỗi hạch bạch huyết': 'Cervical region (supraclavicular Terminus, lateral neck), face, and lymph node basins',
    'Vùng bắp chân và gót chân Achilles': 'Calf musculature and Achilles tendon region',
    'Lòng bàn chân và các kẽ ngón': 'Plantar foot and interdigital web spaces',
    'Vùng cơ tam đầu cánh tay': 'Triceps brachii muscle region',
    'Rửa tay sát khuẩn chuẩn y tế, tháo toàn bộ trang sức và cắt ngắn móng tay': 'Medical hand hygiene disinfection, removing all jewelry, and short-trimmed nails',
    'Chỉ cần đeo găng tay nilon dùng một lần': 'Using disposable polyethylene gloves only',
    'Xịt cồn 70 độ trực tiếp lên vết mổ hở của khách hàng': 'Spraying 70% ethanol directly onto open surgical incision',
    'Không có yêu cầu bắt buộc': 'No mandatory infection control requirement',
    'Đạt từ 8.0 / 10 điểm trở lên (>= 80%)': 'Achieving >= 8.0 / 10 points (>= 80%)',
    'Đạt từ 5.0 / 10 điểm': 'Achieving 5.0 / 10 points',
    'Đạt 10/10 điểm tuyệt đối': 'Achieving 10/10 perfect score',
    'Chỉ cần xem hết video bài giảng không cần làm bài thi': 'Watching lecture videos without assessment requirement',
    'Sau khi vết mổ đã liền mép và được sự đồng ý của bác sĩ phẫu thuật (thường từ 48-72h)': 'Once incision margins have approximated with surgical clearance (typically 48-72 hours)',
    'Ngay trong phòng mổ khi bệnh nhân chưa tỉnh thuốc mê': 'Inside operating theater while under anesthesia',
    'Phải chờ tối thiểu sau 6 tháng': 'Must delay for a minimum of 6 months',
    'Bất cứ lúc nào khách hàng cảm thấy mỏi': 'Whenever the client feels muscle soreness',
    'Dẫn lưu qua các đường ranh giới bạch huyết (Watersheds) sang hạch nách lành đối bên hoặc hạch bẹn cùng bên': 'Rerouted across lymphatic watersheds to contralateral healthy axillary nodes or ipsilateral inguinal nodes',
    'Ép mạnh dịch dồn ngược lại vào nách đã nạo vét': 'Forcefully pushing fluid back into dissected axilla',
    'Dẫn lưu thẳng xuống bàn tay': 'Draining directly down to the hand',
    'Để tự nhiên không cần can thiệp': 'Leaving undisturbed without intervention',
    'Băng thun co giãn ngắn (Short-stretch bandages) có áp lực làm việc cao và áp lực nghỉ thấp': 'Short-stretch compression bandages with high working and low resting pressure',
    'Băng thun co giãn dài (Long-stretch) dùng trong thể thao': 'Long-stretch elastic bandages used in athletic taping',
    'Băng keo y tế dán cố định': 'Adhesive surgical tape',
    'Băng gạc thông thường không co giãn': 'Standard non-elastic cotton gauze',
    'Bảo vệ hàng rào da, giữ ẩm và ngăn ngừa tối đa nguy cơ viêm quầng (Erysipelas/Cellulitis)': 'Protecting skin barrier integrity, hydrating tissue, and preventing cellulitis/erysipelas',
    'Làm trắng sáng da vùng điều trị': 'Skin brightening and cosmetic whitening',
    'Làm mềm mô sẹo thẩm mỹ': 'Softening aesthetic scar tissue',
    'Thay thế cho việc tắm rửa hàng ngày': 'Replacing daily hygiene washing',
    'Lập tức dừng trị liệu MLD, cho bệnh nhân nghỉ ngơi và chuyển khám bác sĩ chuyên khoa nghi ngờ nhiễm trùng cấp': 'Cease MLD immediately, rest the patient, and refer urgently for suspected acute cellulitis',
    'Tiếp tục vuốt thật mạnh vào vùng đỏ để phá tan ổ viêm': 'Vigorously massage the erythematous area to break up inflammation',
    'Chườm đá lạnh liên tục 60 phút': 'Apply ice packs continuously for 60 minutes',
    'Yêu cầu bệnh nhân tự uống thuốc giảm đau tại nhà': 'Advise patient to self-medicate analgesics at home',
    'Chuyển động hình elip, ngón tay cái và các ngón còn lại ôm trọn chu vi chi thể dạng hình trụ': 'Elliptical movement with thumb and fingers enclosing cylindrical limb contours',
    'Chuyển động đấm bóp chặt chém': 'Percussive pounding and hacking motion',
    'Chuyển động véo da liên tục': 'Continuous skin pinching and rolling',
    'Chuyển động miết thẳng tạo nhiệt': 'Friction gliding to generate heat',
    'Hàng ngày hoặc 3-5 buổi/tuần kết hợp băng ép CDT': 'Daily or 3-5 sessions/week combined with CDT bandaging',
    '1 tháng 1 lần': 'Once a month',
    '6 tháng 1 lần': 'Once every 6 months',
    'Chỉ khi nào bị sưng to mới làm': 'Only when visible swelling occurs',
    'Hội lưu tĩnh mạch dưới đòn và tĩnh mạch cảnh trong bên trái (Góc tĩnh mạch Pirogoff)': 'Junction of left internal jugular and subclavian veins (venous angle / Pirogoff)',
    'Tâm thất phải của tim': 'Right ventricle of the heart',
    'Tĩnh mạch chủ dưới': 'Inferior vena cava',
    'Động mạch chủ bụng': 'Abdominal aorta',
    'Hướng ra ngoài về phía hạch trước tai (Preauricular) và hạch dưới hàm (Submandibular)': 'Outward laterally towards preauricular and submandibular lymph node stations',
    'Vuốt dồn dịch thẳng đứng xuống môi dưới': 'Stroking fluid straight vertically to lower lip',
    'Vuốt ngược lên đỉnh trán': 'Gliding upward towards cranial vertex',
    'Xoay tròn vùng sống mũi': 'Stationary circular rubbing on nasal bridge',
    'Đạt điểm >= 8.0/10 và hoàn thành 100% thời lượng': 'Scoring >= 8.0/10 and completing 100% lecture hours',
    'Đạt điểm 4.0/10': 'Scoring 4.0/10',
    'Không cần chấm điểm': 'No grading required',
    'Chỉ cần đăng ký tham gia': 'Participation registration only',
    'Áp lực vượt quá ngưỡng đau sẽ kích hoạt hệ thần kinh giao cảm gây co thắt mạch bạch huyết và làm xẹp mao mạch': 'Excessive pressure triggers sympathetic spasms, compressing and collapsing fragile lymphatics',
    'Bệnh nhân chịu đau tốt thì hiệu quả dẫn lưu càng nhanh': 'Higher pain tolerance yields faster drainage velocity',
    'Gây bầm tím mới chứng minh kỹ thuật tác động sâu': 'Hematoma formation proves deep therapeutic penetration',
    'Không có ý nghĩa sinh học cụ thể': 'No specific biological significance',
    'Các diện tích bề mặt phẳng và rộng như lưng, ngực, mông': 'Broad, flat anatomical surfaces such as thorax, back, and gluteal zones',
    'Vùng hốc mắt hẹp': 'Narrow periorbital hollows',
    'Ngón tay và ngón chân': 'Fingers and toes',
    'Chóp mũi': 'Nasal tip',
    'Vodder sử dụng lực cực nhẹ tác động mao mạch nông, trong khi Thụy Điển dùng lực sâu tác động khối cơ bắp': 'Vodder exerts feather-light pressure on initial lymphatics, whereas Swedish penetrates deep muscle bellies',
    'Vodder sử dụng nhiều tinh dầu bôi trơn hơn': 'Vodder utilizes substantial aromatic lubricants',
    'Vodder chỉ thực hiện khi bệnh nhân đứng': 'Vodder is only performed standing up',
    'Không có điểm gì khác biệt': 'No discernible physiological difference',
    'Sau khi hoàn thành bài thi lý thuyết (>= 8.0) và vượt qua kỳ sát hạch thực hành lâm sàng trực tiếp': 'Upon passing the theoretical examination (>= 8.0) and on-site clinical practical assessment',
    'Ngay sau khi đóng học phí': 'Immediately upon paying tuition',
    'Sau 2 tuần mà không cần kiểm tra': 'After 2 weeks without examination',
    'Khi tải ứng dụng về điện thoại': 'Upon downloading mobile app',
    'Bất thường bẩm sinh, thiểu sản hoặc khiếm khuyết cấu trúc hệ bạch huyết di truyền': 'Congenital aplasia, hypoplasia, or genetic structural lymphatic system dysplasia',
    'Do chấn thương gãy xương': 'Secondary to bone fractures',
    'Do biến chứng sau nạo vét hạch ung thư': 'Complications post-cancer lymph node resection',
    'Do nhiễm vi khuẩn giun chỉ': 'Secondary to filarial nematode infection',
    'Các chi thể hình trụ như cẳng tay, cẳng chân': 'Cylindrical anatomical limbs such as forearms and lower legs',
    'Vùng xương bả vai phẳng': 'Flat scapular zone',
    'Vùng trán': 'Forehead region',
    'Bụng dưới': 'Lower abdomen',
    'Giảm tải gánh nặng dịch kẽ ứ trệ, hỗ trợ tuần hoàn trở về và giảm cảm giác nặng nề': 'Alleviating interstitial fluid congestion, aiding venous return, and reducing heaviness sensation',
    'Làm teo biến hoàn toàn các búi tĩnh mạch nông': 'Permanently obliterating superficial varicosities',
    'Thay thế hoàn toàn thuốc điều trị nội khoa': 'Completely replacing oral pharmaceutical management',
    'Làm dày thành mạch tĩnh mạch': 'Thickening venous vascular walls',
    'Dễ bị xơ cứng mô (Fibrosis) nếu không được dẫn lưu và đào thải kịp thời': 'Prone to tissue fibrosis and induration if not decongested and evacuated promptly',
    'Tự động tiêu biến sau vài giờ': 'Spontaneously evaporating within hours',
    'Chuyển hóa thành mỡ thừa': 'Metabolizing into adipose lipid tissue',
    'Bị hòa tan bởi nước muối sinh lý': 'Dissolved completely by normal saline solutions',
    'Nằm ngửa thoải mái, có gối kê nhẹ dưới đầu và vùng khoeo chân để thư giãn tối đa cơ thành bụng': 'Comfortable supine position with support under head and popliteal fossa to relax abdominal wall',
    'Nằm sấp liên tục suốt 90 phút': 'Continuous prone posture for 90 uninterrupted minutes',
    'Ngồi thẳng lưng trên ghế cứng': 'Sitting erect on an unpadded chair',
    'Nằm nghiêng gập sát đùi vào bụng': 'Lateral decubitus position with knees flexed to chest',
    'Đạt ≥ 8.0 / 10 điểm (≥ 80%) theo quy định thống nhất của Ban Đào tạo': 'Achieving >= 8.0 / 10 points (>= 80%) according to Academic Board standards',
    'Đạt 5.0 / 10 điểm': 'Scoring 5.0 / 10 points',
    'Đạt 6.0 / 10 điểm': 'Scoring 6.0 / 10 points',
    'Chỉ cần nộp bài không giới hạn điểm số': 'Submitting test with no minimum passing grade',
    'MLD Vodder tác động vào mao mạch bạch huyết nông ngay dưới lớp biểu bì, áp lực rất nhẹ khoảng 30-40 mmHg để tránh làm xẹp mao mạch bạch huyết.': 'Vodder MLD stimulates superficial initial lymphatics immediately beneath the epidermis, requiring 30-40 mmHg pressure to prevent vascular collapse.',
    'Terminus tại hõm xương đòn là nơi ống ngực và ống bạch huyết phải đổ về tuần hoàn tĩnh mạch, luôn phải được mở thông trước tiên.': 'The Terminus at the supraclavicular fossa is where the thoracic and right lymphatic ducts empty into venous circulation; it must always be cleared first.',
    'Nhiễm trùng cấp có nguy cơ phát tán vi khuẩn qua đường bạch huyết, suy tim mất bù không chịu được lượng dịch tuần hoàn tăng đột ngột.': 'Acute infection risks bacteremia via lymphatic dissemination, and decompensated heart failure cannot tolerate abrupt fluid overload.',
    'Vòng tròn tĩnh giúp căng dãn mô nhẹ nhàng theo hướng dòng chảy bạch huyết, tối ưu nhất tại vùng hạch cổ và mặt.': 'Stationary circles gently stretch tissue in the direction of lymphatic flow, performing optimally on cervical lymph node chains and facial contours.',
    'Dòng bạch huyết di chuyển một chiều nhờ hệ thống van, các thao tác MLD phải luôn định hướng về cụm hạch khu vực gần nhất.': 'Lymph flows unidirectionally via semilunar valves; MLD maneuvers must consistently direct interstitial fluid toward nearest regional nodal basins.',
    'Khi hạch nách bị nạo vét, MLD giúp tạo đường dẫn lưu phụ qua thành ngực sang nách đối bên hoặc xuống hạch bẹn cùng bên.': 'Following axillary lymphadenectomy, MLD promotes collateral drainage routes across thoracic watersheds to the contralateral axilla or ipsilateral groin.',
    'Mạch bạch huyết (Lymphangion) co bóp tự nhiên khoảng 6-10 lần/phút, thao tác chậm rãi kích hoạt tối đa nhịp co bóp sinh học.': 'Lymphangions pulsate naturally at 6-10 cycles per minute; deliberate, slow pacing optimally activates intrinsic bio-rhythmic contractility.',
    'Kỹ thuật bơm với lòng bàn tay ôm trọn bề mặt cong hình trụ của các chi giúp dồn đẩy dịch ứ hiệu quả.': 'The Pump technique with palms enclosing curved cylindrical limb contours effectively propagates accumulated lymph proximally.',
    'Băng ép với băng giãn ngắn (short-stretch bandages) tạo áp lực làm việc cao, ngăn dịch thẩm thấu ngược lại khoang gian bào.': 'Short-stretch compression bandaging yields high working pressure, counteracting capillary filtration and preventing fluid re-accumulation.',
    'Tiêu chuẩn Học viện MLD Việt Nam yêu cầu điểm trắc nghiệm kiến thức đạt tối thiểu 8.0/10 để đảm bảo an toàn y khoa.': 'MLD Vietnam Academy requires a theoretical passing score of at least 8.0/10 to guarantee clinical safety and professional excellence.',
    'Kỹ thuật Vodder yêu cầu áp lực 30-40 mmHg để kích thích mao mạch bạch huyết nông ngay dưới lớp da bì mà không làm xẹp thành mạch.': 'Vodder protocol specifies 30-40 mmHg pressure to stretch superficial dermal anchoring filaments without collapsing initial lymphatic lumens.',
    'DVT và suy tim mất bù là chống chỉ định tuyệt đối vì dẫn lưu có thể làm vỡ cục máu đông hoặc gây quá tải thể tích tuần hoàn cấp.': 'DVT and decompensated heart failure are absolute contraindications, as drainage risks pulmonary embolism or acute circulatory cardiac overload.',
    'Nguyên lý Vodder bắt buộc phải giải phóng các trạm hạch trung tâm vùng cổ (Terminus) để tạo chỗ trống đón nhận dòng bạch huyết từ ngoại vi.': 'Vodder methodology mandates decongesting central cervical lymph node stations (Terminus) first to receive peripheral lymphatic volume.',
    'Mạch bạch huyết (Lymphangion) co bóp tự nhiên 5-8 lần/phút ở trạng thái nghỉ ngơi, do đó thao tác MLD cần chậm rãi và nhịp nhàng tương thích.': 'Resting lymphangions contract spontaneously 5-8 times per minute; MLD manipulations must stay synchronized with this intrinsic rhythm.',
    'Pha tác động (Working phase) làm căng các sợi neo collagen, kéo mở các van mao mạch ban đầu để dịch mô chảy vào lòng mạch.': 'The working phase stretches anchoring collagen filaments, opening microvalves to allow interstitial fluid entry into the lymphatic lumen.',
    'Dấu hiệu Stemmer (không thể nhấc nếp gấp da mu ngón chân thứ 2) là tiêu chuẩn vàng chẩn đoán phù bạch huyết mạn tính.': 'Stemmer sign (inability to pinch a skin fold over the base of the second toe) represents the clinical gold standard for chronic lymphedema.',
    'Vodder đòi hỏi da tiếp xúc trực tiếp để tạo lực kéo căng mô liên kết; dầu trơn sẽ làm trượt tay và vô hiệu hóa lực kéo vi tuần hoàn.': 'Vodder requires direct dermal traction to stretch connective tissue; lubricant slip negates initial microvascular stretching forces.',
    'Xoay tròn tại chỗ (Stationary Circles) lý tưởng cho vùng da mỏng, sát màng xương và các chuỗi hạch bạch huyết cổ, mặt, gáy.': 'Stationary Circles are tailored for thin skin, periosteal surfaces, and lymphatic nodal chains along the cervical, facial, and occipital regions.',
    'Kiểm soát nhiễm khuẩn là nguyên tắc sống còn vì bệnh nhân phù bạch huyết có nguy cơ viêm mô tế bào (Cellulitis) tái phát rất cao.': 'Infection control is paramount as lymphedema patients have severely compromised local immunity and elevated cellulitis vulnerability.',
    'Học viện MLD Việt Nam áp dụng chuẩn đào tạo Quốc tế Vodder: điểm lý thuyết tối thiểu 8.0/10 để đủ điều kiện thực hành trên người bệnh.': 'MLD Vietnam Academy applies international Vodder standards: minimum 8.0/10 theoretical grade to qualify for human clinical practice.',
    'Sau phẫu thuật, khi mép thương tổn đã lành ổn định (thường ngày 2-3), MLD sớm giúp giảm ứ đọng huyết thanh, giảm đau và chống bầm tím.': 'Postoperatively, once incision margins stabilize (days 2-3), early MLD clears seroma, alleviates discomfort, and accelerates ecchymosis resorption.',
    'Dẫn lưu qua đường ranh giới bạch huyết (Watershed) đưa dịch sang các trạm hạch lành lân cận là nguyên tắc cốt lõi của Vodder.': 'Inter-watershed rerouting to intact adjacent nodal territories forms the foundational principle of Vodder lymphedema therapy.',
    'Băng thun co giãn ngắn tạo áp lực cao khi cơ bắp vận động (áp lực làm việc) và áp lực thấp khi nghỉ ngơi, tối ưu dẫn lưu mà không cản máu.': 'Short-stretch bandages exert high working pressure during muscle contractions and safe low resting pressure, optimizing drainage without ischemia.',
    'Tổn thương da là cửa ngõ cho vi khuẩn xâm nhập gây viêm quầng (Erysipelas), một biến chứng cực kỳ nguy hiểm trong phù bạch huyết.': 'Skin lesions open avenues for bacterial invasion causing erysipelas/cellulitis, an extremely hazardous complication in lymphedema.',
    'Dấu hiệu viêm nhiễm cấp tính (sốt, đỏ, nóng, đau) là chống chỉ định tạm thời khẩn cấp của MLD để tránh lan tràn vi khuẩn toàn thân.': 'Acute signs of infection (fever, rubor, calor, dolor) constitute an urgent temporary contraindication to halt systemic microbial dissemination.',
    'Động tác ép bơm mô phỏng chuyển động của piston ép nhẹ nhàng theo trục dọc của các chi, đẩy dòng bạch huyết về gốc chi.': 'The Pump maneuver mirrors a gentle piston action along the longitudinal axis of cylindrical limbs, propelling lymph toward trunk collectors.',
    'Giai đoạn tấn công giảm thể tích phù yêu cầu tần suất cao (3-5 buổi/tuần) phối hợp băng ép để đạt hiệu quả tiêu sưng tối đa.': 'The intensive decongestion phase requires intensive frequency (3-5 sessions weekly) paired with bandaging for maximum volume reduction.',
    'Góc tĩnh mạch Pirogoff bên trái là nơi tiếp nhận hơn 75% lượng dịch bạch huyết toàn cơ thể trước khi hòa vào tuần hoàn chung.': 'The left Pirogoff venous angle receives over 75% of total body lymphatic fluid before entering the systemic cardiovascular circulation.',
    'Dẫn lưu mặt tuân thủ hướng đi tự nhiên của các nhánh mạch bạch huyết vùng hàm mặt đổ về chuỗi hạch mang tai và dưới cằm.': 'Facial drainage adheres to natural anatomic collector trajectories emptying into preauricular and submandibular lymphatic basins.',
    'Tiêu chí đánh giá chất lượng đào tạo Vodder yêu cầu tỷ lệ chính xác từ 80% trở lên nhằm bảo đảm an toàn tuyệt đối cho người bệnh.': 'Vodder training quality metrics mandate >= 80% accuracy to ensure rigorous patient safety and clinical therapeutic precision.',
    'Đau đớn kích thích hệ thần kinh giao cảm gây co thắt cơ trơn mạch bạch huyết, làm nghẽn dòng chảy và phản tác dụng điều trị.': 'Pain stimulates the sympathetic nervous system, inducing lymphatic smooth muscle spasm and impeding therapeutic fluid transport.',
    'Thao tác Rotary (cuộn) được thiết kế đặc thù cho các diện phẳng rộng bằng cách mở - cuộn bàn tay nhịp nhàng theo chiều dòng chảy.': 'The Rotary stroke is specifically configured for broad planar trunk contours by undulating the palm rhythmically along lymphatic pathways.',
    'Khác với massage cơ bắp cổ điển dùng lực mạnh, MLD là liệu pháp vi tuần hoàn y khoa với thao tác siêu nhẹ, chậm và không trơn.': 'Unlike musculoskeletal deep tissue massage, MLD is a medical microcirculatory therapy utilizing feather-light, slow, non-lubricated strokes.',
    'Chứng chỉ chuyên nghiệp chỉ được cấp khi học viên thành thạo toàn diện cả lý thuyết giải phẫu sinh lý và thao tác lâm sàng chuẩn xác.': 'Professional certification is granted solely when students master both anatomical physiology theory and clinical manual proficiency.',
    'Phù nguyên phát do bất thường gen hoặc khiếm khuyết phát triển mạch bạch huyết từ lúc sơ sinh, dậy thì hoặc trưởng thành.': 'Primary lymphedema arises from genetic anomalies or congenital structural dysplasia manifesting in infancy, adolescence, or adulthood.',
    'Thao tác múc (Scoop) ôm gọn chu vi chi dưới và cẳng tay, đẩy dịch theo chiều xoắn ốc hướng tâm.': 'The Scoop maneuver wraps around lower limb and forearm contours, guiding fluid centripetally in a spiral trajectory.',
    'MLD giải phóng thể tích dịch ứ đọng xung quanh các mao mạch, giảm chèn ép vi tuần hoàn và giảm áp lực tĩnh mạch ngoại vi.': 'MLD alleviates perivascular fluid congestion, relieving microcirculatory compression and reducing peripheral venous pressures.',
    'Protein ứ đọng kích thích phản ứng viêm mạn tính và tăng sinh mô sợi liên kết, dẫn đến xơ hóa không hồi phục nếu không can thiệp MLD.': 'Stagnant macromolecular proteins provoke chronic inflammatory cascades and fibrotic proliferation if not evacuated by MLD.',
    'Tư thế nằm ngửa với chân nâng nhẹ và cơ bụng thả lỏng giúp giảm áp lực trong ổ bụng, tối ưu dòng chảy bạch huyết về ống ngực.': 'Supine positioning with elevated extremities and relaxed abdominal muscles reduces intra-abdominal pressure, easing thoracic duct flow.',
    'Học viện MLD Việt Nam áp dụng thang điểm chuẩn Quốc tế Vodder: học viên đạt từ 8.0 điểm trở lên được công nhận ĐẠT tiêu chuẩn chuyên môn.': 'MLD Vietnam Academy implements the international Vodder grading standard: achieving >= 8.0 points earns official qualification.',
    'MLD Viet Nam': 'MLD Vietnam',
    'DAO_TAO': 'TRAINING',
    'LAM_SANG': 'CLINICAL',
    'Tài liệu Y khoa MLD': 'MLD Medical Documents',
    'Hội đồng Y khoa MLD': 'MLD Medical Advisory Board',
    'Trung tâm MLD Việt Nam': 'MLD Vietnam Center',
    'Học viên MLD': 'MLD Student',
    'Học viện MLD Việt Nam - Chi nhánh Quận 3, TP.HCM (Trụ sở chính)': 'MLD Vietnam Academy - District 3 Branch, HCMC (Headquarters)',
    'Học viện MLD Việt Nam - Chi nhánh Cầu Giấy, Hà Nội': 'MLD Vietnam Academy - Cau Giay Branch, Hanoi',
    'Trụ sở MLD Việt Nam (5 Master LV3) - Hotline: 096.7786.399; Địa chỉ: Số 260, Ngõ 271 Bùi Xương Trạch, Khương Đình, Hà Nội, Phường Khương Đình, Thành phố Hà Nội': 'MLD Vietnam Headquarters (5 Master LV3) - Hotline: 096.7786.399; Address: No. 260, Alley 271 Bui Xuong Trach, Khuong Dinh, Hanoi',
    'Trụ sở MLD Việt Nam (5 Master LV3)': 'MLD Vietnam Headquarters (5 Master LV3)',
  
};

  static final Map<String, String> _lowerDictionary = _dictionary.map(
    (key, value) => MapEntry(key.toLowerCase(), value),
  );
}

/// Extension thuận tiện trên BuildContext
extension TranslationContextExtension on BuildContext {
  bool get isEn => AppTranslation.isEnglish(this);

  /// Dịch chuỗi tự động: Nếu isEn = true thì dịch sang tiếng Anh, ngược lại giữ nguyên tiếng Việt
  String tr(String viText, [String? enText]) {
    if (isEn) {
      return enText ?? AppTranslation.translate(viText, isEn: true);
    }
    return viText;
  }
}

/// Extension thuận tiện trên String
extension StringTranslationExtension on String {
  String tr(BuildContext context) => AppTranslation.translate(this, isEn: context.isEn);
  String trWith(bool isEn) => AppTranslation.translate(this, isEn: isEn);
}
