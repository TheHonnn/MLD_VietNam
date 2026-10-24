// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Vietnamese (`vi`).
class AppLocalizationsVi extends AppLocalizations {
  AppLocalizationsVi([String locale = 'vi']) : super(locale);

  @override
  String get appTitle => 'MLD Việt Nam';

  @override
  String get welcomeTitle => 'Chào mừng bạn!';

  @override
  String get welcomeSubtitle =>
      'Trải nghiệm chăm sóc sức khỏe, sắc đẹp & đào tạo chuẩn y khoa.';

  @override
  String get login => 'Đăng nhập';

  @override
  String get register => 'Đăng ký';

  @override
  String get loginWithPhone => 'Số điện thoại';

  @override
  String get loginWithEmail => 'Email & Mật khẩu';

  @override
  String get phoneNumber => 'Số điện thoại';

  @override
  String get phoneNumberHint => 'Nhập số điện thoại của bạn';

  @override
  String get email => 'Địa chỉ Email';

  @override
  String get emailHint => 'example@email.com';

  @override
  String get password => 'Mật khẩu';

  @override
  String get passwordHint => 'Nhập mật khẩu (tối thiểu 6 ký tự)';

  @override
  String get confirmPassword => 'Xác nhận mật khẩu';

  @override
  String get confirmPasswordHint => 'Nhập lại mật khẩu';

  @override
  String get fullName => 'Họ và tên';

  @override
  String get fullNameHint => 'Nguyễn Văn A';

  @override
  String get forgotPassword => 'Quên mật khẩu?';

  @override
  String get forgotPasswordTitle => 'Khôi phục mật khẩu';

  @override
  String get forgotPasswordSubtitle =>
      'Nhập địa chỉ email của bạn để nhận mã OTP đặt lại mật khẩu.';

  @override
  String get sendOtp => 'Gửi mã xác thực';

  @override
  String get resetPassword => 'Đặt lại mật khẩu';

  @override
  String get resetPasswordTitle => 'Thiết lập mật khẩu mới';

  @override
  String get newPassword => 'Mật khẩu mới';

  @override
  String get continueButton => 'Tiếp tục';

  @override
  String get haveAccount => 'Đã có tài khoản?';

  @override
  String get noAccount => 'Chưa có tài khoản?';

  @override
  String get registerNow => 'Đăng ký bằng Email';

  @override
  String get loginNow => 'Đăng nhập ngay';

  @override
  String get verifyOtp => 'Xác thực OTP';

  @override
  String get otpSentTo => 'Mã xác thực gồm 6 chữ số đã được gửi tới';

  @override
  String get resendOtp => 'Gửi lại mã';

  @override
  String get verifyButton => 'Xác nhận';

  @override
  String get navHome => 'Trang chủ';

  @override
  String get navServices => 'Dịch vụ';

  @override
  String get navBooking => 'Đặt lịch';

  @override
  String get navAcademy => 'Học viện';

  @override
  String get navProfile => 'Cá nhân';

  @override
  String get homeGreeting => 'Xin chào';

  @override
  String get homeSearchHint => 'Tìm dịch vụ, khóa học, chuyên viên...';

  @override
  String get bookNow => 'Đặt lịch ngay';

  @override
  String get upcomingAppointments => 'Lịch hẹn sắp tới';

  @override
  String get noUpcomingAppointments => 'Bạn chưa có lịch hẹn nào sắp tới';

  @override
  String get noUpcomingDesc =>
      'Đặt lịch ngay để được đón tiếp và trải nghiệm các dịch vụ chăm sóc sức khỏe & sắc đẹp chu đáo tại MLD.';

  @override
  String get viewDetails => 'Xem chi tiết';

  @override
  String get featuredServices => 'Dịch vụ nổi bật';

  @override
  String get promotions => 'Ưu đãi';

  @override
  String get packages => 'Liệu trình';

  @override
  String get courses => 'Khóa học';

  @override
  String get selectService => 'Chọn dịch vụ';

  @override
  String get selectBranch => 'Chọn chi nhánh';

  @override
  String get selectSpecialist => 'Chọn chuyên viên';

  @override
  String get selectDateTime => 'Chọn ngày & giờ';

  @override
  String get bookingSummary => 'Xác nhận đặt lịch';

  @override
  String get paymentMethod => 'Phương thức thanh toán';

  @override
  String get bankTransferQr => 'Chuyển khoản ngân hàng / QR';

  @override
  String get payAtBranch => 'Thanh toán tại cơ sở';

  @override
  String get depositRequiredNotice => 'Yêu cầu cọc tiền trước';

  @override
  String get totalPrice => 'Tổng chi phí';

  @override
  String get depositAmount => 'Tiền đặt cọc';

  @override
  String get remainingAmount => 'Còn lại tại cơ sở';

  @override
  String get completeBooking => 'Hoàn tất đặt lịch';

  @override
  String get bookingSuccess => 'Đặt lịch thành công!';

  @override
  String get myAppointments => 'Lịch hẹn của tôi';

  @override
  String get upcoming => 'Sắp tới';

  @override
  String get completed => 'Đã hoàn thành';

  @override
  String get cancelled => 'Đã hủy';

  @override
  String get noAppointments => 'Không có lịch hẹn nào';

  @override
  String get bookServiceNow => 'Đặt lịch dịch vụ ngay';

  @override
  String get myPackages => 'Gói liệu trình của tôi';

  @override
  String get managePackagesSubtitle =>
      'Quản lý các gói chăm sóc sức khỏe và liệu trình đã đăng ký.';

  @override
  String get activePackages => 'Đang sử dụng';

  @override
  String get completedPackages => 'Đã hoàn thành';

  @override
  String get expiredPackages => 'Hết hạn';

  @override
  String get remainingSessions => 'buổi còn lại';

  @override
  String get noActivePackages =>
      'Bạn chưa có gói liệu trình nào đang hoạt động';

  @override
  String get exploreServicesAndBook => 'Khám phá dịch vụ & đặt lịch';

  @override
  String get careJournal => 'Nhật ký chăm sóc';

  @override
  String get academyTitle => 'Học viện đào tạo';

  @override
  String get academySubtitle => 'Kiến tạo kỹ năng – Phát triển nghề nghiệp';

  @override
  String get exploreCourses => 'Khám phá khóa học';

  @override
  String get myCourses => 'Khóa học của tôi';

  @override
  String get attendanceSchedule => 'Lịch học & điểm danh';

  @override
  String get scanAttendanceQr => 'Quét QR Điểm Danh';

  @override
  String get noSchedule => 'Bạn chưa có lịch học & điểm danh';

  @override
  String get noScheduleDesc =>
      'Bạn hiện chưa ghi danh khóa đào tạo nào tại Học viện MLD. Sau khi đăng ký, lịch học lý thuyết, các buổi thực hành và mã QR điểm danh sẽ xuất hiện tại đây.';

  @override
  String get exploreTrainingNow => 'Khám phá khóa đào tạo ngay';

  @override
  String get viewDemoSchedule => 'Xem lịch học thực hành mẫu';

  @override
  String get learningResults => 'Kết quả học tập';

  @override
  String get noLearningResults => 'Chưa có kết quả học tập & giấy chứng nhận';

  @override
  String get noLearningResultsDesc =>
      'Bạn hiện chưa tham gia khóa đào tạo nào tại Học viện MLD. Sau khi đăng ký và hoàn thành khóa học, toàn bộ kết quả đánh giá kỹ năng và chứng nhận số sẽ xuất hiện tại đây.';

  @override
  String get enrollNow => 'Đăng ký khóa học ngay';

  @override
  String get myAccount => 'Tài khoản của tôi';

  @override
  String get memberCard => 'Thẻ hội viên';

  @override
  String get viewMemberCard => 'Xem thẻ hội viên';

  @override
  String get loyaltyPoints => 'Điểm tích lũy';

  @override
  String get accountSettings => 'Cài đặt tài khoản';

  @override
  String get manageSettingsSubtitle =>
      'Quản lý trải nghiệm, bảo mật và các tùy chọn của bạn.';

  @override
  String get personalInfo => 'Thông tin cá nhân';

  @override
  String get accountSecurity => 'Bảo mật tài khoản';

  @override
  String get linkedPhone => 'Số điện thoại liên kết';

  @override
  String get notifications => 'Thông báo';

  @override
  String get appointmentNotifications => 'Thông báo lịch hẹn';

  @override
  String get treatmentNotifications => 'Thông báo liệu trình';

  @override
  String get courseNotifications => 'Thông báo khóa học';

  @override
  String get promotionalNotifications => 'Chương trình ưu đãi';

  @override
  String get preferences => 'Tùy chọn';

  @override
  String get language => 'Ngôn ngữ';

  @override
  String get vietnamese => 'Tiếng Việt';

  @override
  String get english => 'English';

  @override
  String get selectLanguage => 'Chọn ngôn ngữ / Select Language';

  @override
  String get preferredBranch => 'Chi nhánh ưu tiên';

  @override
  String get theme => 'Giao diện';

  @override
  String get privacyAndSecurity => 'Quyền riêng tư & bảo mật';

  @override
  String get privacyPolicy => 'Chính sách bảo mật';

  @override
  String get termsOfService => 'Điều khoản dịch vụ';

  @override
  String get logout => 'Đăng xuất';

  @override
  String get logoutConfirmation =>
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?';

  @override
  String get cancel => 'Hủy';

  @override
  String get confirm => 'Đồng ý';

  @override
  String get editProfile => 'Chỉnh sửa hồ sơ';

  @override
  String get saveChanges => 'Lưu thay đổi';

  @override
  String get error => 'Lỗi';

  @override
  String get success => 'Thành công';
}
