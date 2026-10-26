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

    // Mẫu giờ học / khóa học
    final hoursReg = RegExp(r'(\d+)\s+giờ học');
    res = res.replaceAllMapped(hoursReg, (m) => '${m[1]} learning hours');

    final coursesReg = RegExp(r'(\d+)\s+khóa đang tham gia');
    res = res.replaceAllMapped(coursesReg, (m) => '${m[1]} enrolled courses');

    final sessionsLeftReg = RegExp(r'(\d+)\s+buổi còn lại');
    res = res.replaceAllMapped(sessionsLeftReg, (m) => '${m[1]} sessions left');

    final sessionsUsedReg = RegExp(r'(\d+)\s+buổi đã dùng');
    res = res.replaceAllMapped(sessionsUsedReg, (m) => '${m[1]} sessions completed');

    final sessionsCompletedReg = RegExp(r'(\d+)\s+buổi hoàn thành');
    res = res.replaceAllMapped(sessionsCompletedReg, (m) => '${m[1]} sessions completed');

    final packagesActiveReg = RegExp(r'(\d+)\s+gói đang dùng');
    res = res.replaceAllMapped(packagesActiveReg, (m) => '${m[1]} active packages');

    final usedOnlyReg = RegExp(r'(\d+)\s+đã dùng');
    res = res.replaceAllMapped(usedOnlyReg, (m) => '${m[1]} used');

    final sessionIdxReg = RegExp(r'Buổi\s+(\d+)');
    res = res.replaceAllMapped(sessionIdxReg, (m) => 'Session ${m[1]}');

    final upcomingTabReg = RegExp(r'Sắp tới\s*\((\d+)\)');
    res = res.replaceAllMapped(upcomingTabReg, (m) => 'Upcoming (${m[1]})');

    final completedTabReg = RegExp(r'Đã hoàn thành\s*\((\d+)\)');
    res = res.replaceAllMapped(completedTabReg, (m) => 'Completed (${m[1]})');

    final sessionsReg = RegExp(r'(\d+)\s+buổi');
    res = res.replaceAllMapped(sessionsReg, (m) => '${m[1]} sessions');

    final weeksReg = RegExp(r'(\d+)\s+tuần');
    res = res.replaceAllMapped(weeksReg, (m) => '${m[1]} weeks');

    // Ngày tháng
    final monthReg = RegExp(r'Tháng\s+(\d+),\s+(\d+)');
    final monthNames = {
      1: 'January', 2: 'February', 3: 'March', 4: 'April',
      5: 'May', 6: 'June', 7: 'July', 8: 'August',
      9: 'September', 10: 'October', 11: 'November', 12: 'December'
    };
    res = res.replaceAllMapped(monthReg, (m) {
      final mNum = int.tryParse(m[1] ?? '') ?? 1;
      return '${monthNames[mNum] ?? m[1]}, ${m[2]}';
    });

    return res;
  }

  // Từ điển ánh xạ toàn diện Database + UI Strings
  static final Map<String, String> _dictionary = {
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
    'Đặt cọc trước (20%)': 'Advance Deposit (20%)',
    'Đặt cọc trước': 'Advance Deposit',
    'Thanh toán tại cơ sở': 'Remaining at Branch',
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
    'Số 186 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu': 'No. 186 Nam Ky Khoi Nghia, Vo Thi Sau Ward',
    'Số 45 Nguyễn Thị Minh Khai, Phường Bến Nghé': 'No. 45 Nguyen Thi Minh Khai, Ben Nghe Ward',
    'Chi nhánh thực hiện': 'Selected Branch',
    'Chọn chi nhánh': 'Select Branch',
    'Chọn cơ sở / chi nhánh': 'Select Branch / Facility',
    'Vui lòng chọn cơ sở/chi nhánh trị liệu': 'Please select a therapy branch / facility',
    'Tất cả cơ sở': 'All Branches',
    'Tất cả chi nhánh': 'All Branches',
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
    'Cơ bản': 'Basic',
    'Nâng cao': 'Advanced',
    'Chuyên sâu': 'Intensive',
    'Chuyên nghiệp': 'Professional',
    'Học trực tiếp': 'In-Person Training',
    'Trực tiếp & Online': 'Hybrid (In-person & Online)',
    'Học viên': 'Students',
    'Học phí': 'Tuition',
    'Học viện MLD Việt Nam': 'MLD Vietnam Academy',
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
    'Bạn hiện chưa ghi danh khóa đào tạo nào tại Học viện MLD. Sau khi đăng ký, lịch học lý thuyết, các buổi thực hành và mã QR điểm danh sẽ xuất hiện tại đây.': 'You have not enrolled in any MLD Academy course yet. Class schedule, practice sessions, and attendance QR code will appear here after enrollment.',
    'Bạn chưa có kết quả học tập & chứng nhận nào': 'No learning results or certificates yet',
    'Bạn hiện chưa tham gia khóa đào tạo nào tại Học viện MLD. Sau khi đăng ký và hoàn thành khóa học, toàn bộ kết quả đánh giá kỹ năng và chứng nhận số sẽ xuất hiện tại đây.': 'You have not completed any course at MLD Academy yet. Skill assessments and digital certificates will appear here after completion.',
    'Bạn chưa có khóa học nào': 'You have no courses yet',
    'Khám phá danh mục các khóa đào tạo nghề Spa & Trị liệu dưỡng sinh của Học viện MLD để nâng cao tay nghề.': 'Explore MLD Academy training courses in therapy and skincare to advance your skills.',
    'Bạn chưa có gói liệu trình nào đang hoạt động': 'You have no active treatment packages',
    'Khám phá các dịch vụ & gói chăm sóc sức khỏe hệ bạch huyết để bắt đầu phục hồi cơ thể.': 'Explore lymphatic health services & treatment packages to start your recovery journey.',
    'Chưa có nhật ký trị liệu': 'No care journal entries yet',
    'Các buổi trị liệu và ghi nhận tiến trình phục hồi của bạn sẽ được lưu trữ chi tiết tại đây.': 'Your therapy sessions and recovery progress records will be detailed here.',
    'Chủ động đặt lịch ngay hôm nay': 'Book an appointment today',
    'Đăng nhập ngay': 'Sign In Now',
    'Đăng ký tài khoản': 'Sign Up',
    'Học viện MLD': 'MLD Academy',

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
    'Thanh toán: Tại cơ sở / QR': 'Payment: At branch / QR',
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
    'Đội ngũ chuyên viên': 'Specialist Team',
    'Tìm kiếm dịch vụ, chuyên viên hoặc chi nhánh': 'Search services, specialists or branches',
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
