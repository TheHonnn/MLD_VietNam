import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_vi.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('vi')
  ];

  /// No description provided for @appTitle.
  ///
  /// In vi, this message translates to:
  /// **'MLD Việt Nam'**
  String get appTitle;

  /// No description provided for @welcomeTitle.
  ///
  /// In vi, this message translates to:
  /// **'Chào mừng bạn!'**
  String get welcomeTitle;

  /// No description provided for @welcomeSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Trải nghiệm chăm sóc sức khỏe, sắc đẹp & đào tạo chuẩn y khoa.'**
  String get welcomeSubtitle;

  /// No description provided for @login.
  ///
  /// In vi, this message translates to:
  /// **'Đăng nhập'**
  String get login;

  /// No description provided for @register.
  ///
  /// In vi, this message translates to:
  /// **'Đăng ký'**
  String get register;

  /// No description provided for @loginWithPhone.
  ///
  /// In vi, this message translates to:
  /// **'Số điện thoại'**
  String get loginWithPhone;

  /// No description provided for @loginWithEmail.
  ///
  /// In vi, this message translates to:
  /// **'Email & Mật khẩu'**
  String get loginWithEmail;

  /// No description provided for @phoneNumber.
  ///
  /// In vi, this message translates to:
  /// **'Số điện thoại'**
  String get phoneNumber;

  /// No description provided for @phoneNumberHint.
  ///
  /// In vi, this message translates to:
  /// **'Nhập số điện thoại của bạn'**
  String get phoneNumberHint;

  /// No description provided for @email.
  ///
  /// In vi, this message translates to:
  /// **'Địa chỉ Email'**
  String get email;

  /// No description provided for @emailHint.
  ///
  /// In vi, this message translates to:
  /// **'example@email.com'**
  String get emailHint;

  /// No description provided for @password.
  ///
  /// In vi, this message translates to:
  /// **'Mật khẩu'**
  String get password;

  /// No description provided for @passwordHint.
  ///
  /// In vi, this message translates to:
  /// **'Nhập mật khẩu (tối thiểu 6 ký tự)'**
  String get passwordHint;

  /// No description provided for @confirmPassword.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận mật khẩu'**
  String get confirmPassword;

  /// No description provided for @confirmPasswordHint.
  ///
  /// In vi, this message translates to:
  /// **'Nhập lại mật khẩu'**
  String get confirmPasswordHint;

  /// No description provided for @fullName.
  ///
  /// In vi, this message translates to:
  /// **'Họ và tên'**
  String get fullName;

  /// No description provided for @fullNameHint.
  ///
  /// In vi, this message translates to:
  /// **'Nguyễn Văn A'**
  String get fullNameHint;

  /// No description provided for @forgotPassword.
  ///
  /// In vi, this message translates to:
  /// **'Quên mật khẩu?'**
  String get forgotPassword;

  /// No description provided for @forgotPasswordTitle.
  ///
  /// In vi, this message translates to:
  /// **'Khôi phục mật khẩu'**
  String get forgotPasswordTitle;

  /// No description provided for @forgotPasswordSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Nhập địa chỉ email của bạn để nhận mã OTP đặt lại mật khẩu.'**
  String get forgotPasswordSubtitle;

  /// No description provided for @sendOtp.
  ///
  /// In vi, this message translates to:
  /// **'Gửi mã xác thực'**
  String get sendOtp;

  /// No description provided for @resetPassword.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lại mật khẩu'**
  String get resetPassword;

  /// No description provided for @resetPasswordTitle.
  ///
  /// In vi, this message translates to:
  /// **'Thiết lập mật khẩu mới'**
  String get resetPasswordTitle;

  /// No description provided for @newPassword.
  ///
  /// In vi, this message translates to:
  /// **'Mật khẩu mới'**
  String get newPassword;

  /// No description provided for @continueButton.
  ///
  /// In vi, this message translates to:
  /// **'Tiếp tục'**
  String get continueButton;

  /// No description provided for @haveAccount.
  ///
  /// In vi, this message translates to:
  /// **'Đã có tài khoản?'**
  String get haveAccount;

  /// No description provided for @noAccount.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có tài khoản?'**
  String get noAccount;

  /// No description provided for @registerNow.
  ///
  /// In vi, this message translates to:
  /// **'Đăng ký bằng Email'**
  String get registerNow;

  /// No description provided for @loginNow.
  ///
  /// In vi, this message translates to:
  /// **'Đăng nhập ngay'**
  String get loginNow;

  /// No description provided for @verifyOtp.
  ///
  /// In vi, this message translates to:
  /// **'Xác thực OTP'**
  String get verifyOtp;

  /// No description provided for @otpSentTo.
  ///
  /// In vi, this message translates to:
  /// **'Mã xác thực gồm 6 chữ số đã được gửi tới'**
  String get otpSentTo;

  /// No description provided for @resendOtp.
  ///
  /// In vi, this message translates to:
  /// **'Gửi lại mã'**
  String get resendOtp;

  /// No description provided for @verifyButton.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận'**
  String get verifyButton;

  /// No description provided for @navHome.
  ///
  /// In vi, this message translates to:
  /// **'Trang chủ'**
  String get navHome;

  /// No description provided for @navServices.
  ///
  /// In vi, this message translates to:
  /// **'Dịch vụ'**
  String get navServices;

  /// No description provided for @navBooking.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lịch'**
  String get navBooking;

  /// No description provided for @navAcademy.
  ///
  /// In vi, this message translates to:
  /// **'Học viện'**
  String get navAcademy;

  /// No description provided for @navProfile.
  ///
  /// In vi, this message translates to:
  /// **'Cá nhân'**
  String get navProfile;

  /// No description provided for @homeGreeting.
  ///
  /// In vi, this message translates to:
  /// **'Xin chào'**
  String get homeGreeting;

  /// No description provided for @homeSearchHint.
  ///
  /// In vi, this message translates to:
  /// **'Tìm dịch vụ, khóa học, chuyên viên...'**
  String get homeSearchHint;

  /// No description provided for @bookNow.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lịch ngay'**
  String get bookNow;

  /// No description provided for @upcomingAppointments.
  ///
  /// In vi, this message translates to:
  /// **'Lịch hẹn sắp tới'**
  String get upcomingAppointments;

  /// No description provided for @noUpcomingAppointments.
  ///
  /// In vi, this message translates to:
  /// **'Bạn chưa có lịch hẹn nào sắp tới'**
  String get noUpcomingAppointments;

  /// No description provided for @noUpcomingDesc.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lịch ngay để được đón tiếp và trải nghiệm các dịch vụ chăm sóc sức khỏe & sắc đẹp chu đáo tại MLD.'**
  String get noUpcomingDesc;

  /// No description provided for @viewDetails.
  ///
  /// In vi, this message translates to:
  /// **'Xem chi tiết'**
  String get viewDetails;

  /// No description provided for @featuredServices.
  ///
  /// In vi, this message translates to:
  /// **'Dịch vụ nổi bật'**
  String get featuredServices;

  /// No description provided for @promotions.
  ///
  /// In vi, this message translates to:
  /// **'Ưu đãi'**
  String get promotions;

  /// No description provided for @packages.
  ///
  /// In vi, this message translates to:
  /// **'Liệu trình'**
  String get packages;

  /// No description provided for @courses.
  ///
  /// In vi, this message translates to:
  /// **'Khóa học'**
  String get courses;

  /// No description provided for @selectService.
  ///
  /// In vi, this message translates to:
  /// **'Chọn dịch vụ'**
  String get selectService;

  /// No description provided for @selectBranch.
  ///
  /// In vi, this message translates to:
  /// **'Chọn chi nhánh'**
  String get selectBranch;

  /// No description provided for @selectSpecialist.
  ///
  /// In vi, this message translates to:
  /// **'Chọn chuyên viên'**
  String get selectSpecialist;

  /// No description provided for @selectDateTime.
  ///
  /// In vi, this message translates to:
  /// **'Chọn ngày & giờ'**
  String get selectDateTime;

  /// No description provided for @bookingSummary.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận đặt lịch'**
  String get bookingSummary;

  /// No description provided for @paymentMethod.
  ///
  /// In vi, this message translates to:
  /// **'Phương thức thanh toán'**
  String get paymentMethod;

  /// No description provided for @bankTransferQr.
  ///
  /// In vi, this message translates to:
  /// **'Chuyển khoản ngân hàng / QR'**
  String get bankTransferQr;

  /// No description provided for @payAtBranch.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán tại cơ sở'**
  String get payAtBranch;

  /// No description provided for @depositRequiredNotice.
  ///
  /// In vi, this message translates to:
  /// **'Yêu cầu cọc tiền trước'**
  String get depositRequiredNotice;

  /// No description provided for @totalPrice.
  ///
  /// In vi, this message translates to:
  /// **'Tổng chi phí'**
  String get totalPrice;

  /// No description provided for @depositAmount.
  ///
  /// In vi, this message translates to:
  /// **'Tiền đặt cọc'**
  String get depositAmount;

  /// No description provided for @remainingAmount.
  ///
  /// In vi, this message translates to:
  /// **'Còn lại tại cơ sở'**
  String get remainingAmount;

  /// No description provided for @completeBooking.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn tất đặt lịch'**
  String get completeBooking;

  /// No description provided for @bookingSuccess.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lịch thành công!'**
  String get bookingSuccess;

  /// No description provided for @myAppointments.
  ///
  /// In vi, this message translates to:
  /// **'Lịch hẹn của tôi'**
  String get myAppointments;

  /// No description provided for @upcoming.
  ///
  /// In vi, this message translates to:
  /// **'Sắp tới'**
  String get upcoming;

  /// No description provided for @completed.
  ///
  /// In vi, this message translates to:
  /// **'Đã hoàn thành'**
  String get completed;

  /// No description provided for @cancelled.
  ///
  /// In vi, this message translates to:
  /// **'Đã hủy'**
  String get cancelled;

  /// No description provided for @noAppointments.
  ///
  /// In vi, this message translates to:
  /// **'Không có lịch hẹn nào'**
  String get noAppointments;

  /// No description provided for @bookServiceNow.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lịch dịch vụ ngay'**
  String get bookServiceNow;

  /// No description provided for @myPackages.
  ///
  /// In vi, this message translates to:
  /// **'Gói liệu trình của tôi'**
  String get myPackages;

  /// No description provided for @managePackagesSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Quản lý các gói chăm sóc sức khỏe và liệu trình đã đăng ký.'**
  String get managePackagesSubtitle;

  /// No description provided for @activePackages.
  ///
  /// In vi, this message translates to:
  /// **'Đang sử dụng'**
  String get activePackages;

  /// No description provided for @completedPackages.
  ///
  /// In vi, this message translates to:
  /// **'Đã hoàn thành'**
  String get completedPackages;

  /// No description provided for @expiredPackages.
  ///
  /// In vi, this message translates to:
  /// **'Hết hạn'**
  String get expiredPackages;

  /// No description provided for @remainingSessions.
  ///
  /// In vi, this message translates to:
  /// **'buổi còn lại'**
  String get remainingSessions;

  /// No description provided for @noActivePackages.
  ///
  /// In vi, this message translates to:
  /// **'Bạn chưa có gói liệu trình nào đang hoạt động'**
  String get noActivePackages;

  /// No description provided for @exploreServicesAndBook.
  ///
  /// In vi, this message translates to:
  /// **'Khám phá dịch vụ & đặt lịch'**
  String get exploreServicesAndBook;

  /// No description provided for @careJournal.
  ///
  /// In vi, this message translates to:
  /// **'Nhật ký chăm sóc'**
  String get careJournal;

  /// No description provided for @academyTitle.
  ///
  /// In vi, this message translates to:
  /// **'Học viện đào tạo'**
  String get academyTitle;

  /// No description provided for @academySubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Kiến tạo kỹ năng – Phát triển nghề nghiệp'**
  String get academySubtitle;

  /// No description provided for @exploreCourses.
  ///
  /// In vi, this message translates to:
  /// **'Khám phá khóa học'**
  String get exploreCourses;

  /// No description provided for @myCourses.
  ///
  /// In vi, this message translates to:
  /// **'Khóa học của tôi'**
  String get myCourses;

  /// No description provided for @attendanceSchedule.
  ///
  /// In vi, this message translates to:
  /// **'Lịch học & điểm danh'**
  String get attendanceSchedule;

  /// No description provided for @scanAttendanceQr.
  ///
  /// In vi, this message translates to:
  /// **'Quét QR Điểm Danh'**
  String get scanAttendanceQr;

  /// No description provided for @noSchedule.
  ///
  /// In vi, this message translates to:
  /// **'Bạn chưa có lịch học & điểm danh'**
  String get noSchedule;

  /// No description provided for @noScheduleDesc.
  ///
  /// In vi, this message translates to:
  /// **'Bạn hiện chưa ghi danh khóa đào tạo nào tại Học viện MLD. Sau khi đăng ký, lịch học lý thuyết, các buổi thực hành và mã QR điểm danh sẽ xuất hiện tại đây.'**
  String get noScheduleDesc;

  /// No description provided for @exploreTrainingNow.
  ///
  /// In vi, this message translates to:
  /// **'Khám phá khóa đào tạo ngay'**
  String get exploreTrainingNow;

  /// No description provided for @viewDemoSchedule.
  ///
  /// In vi, this message translates to:
  /// **'Xem lịch học thực hành mẫu'**
  String get viewDemoSchedule;

  /// No description provided for @learningResults.
  ///
  /// In vi, this message translates to:
  /// **'Kết quả học tập'**
  String get learningResults;

  /// No description provided for @noLearningResults.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có kết quả học tập & chứng chỉ'**
  String get noLearningResults;

  /// No description provided for @noLearningResultsDesc.
  ///
  /// In vi, this message translates to:
  /// **'Bạn hiện chưa tham gia khóa đào tạo nào tại Học viện MLD. Sau khi đăng ký và hoàn thành khóa học, toàn bộ kết quả đánh giá kỹ năng và chứng nhận số sẽ xuất hiện tại đây.'**
  String get noLearningResultsDesc;

  /// No description provided for @enrollNow.
  ///
  /// In vi, this message translates to:
  /// **'Đăng ký khóa học ngay'**
  String get enrollNow;

  /// No description provided for @myAccount.
  ///
  /// In vi, this message translates to:
  /// **'Tài khoản của tôi'**
  String get myAccount;

  /// No description provided for @memberCard.
  ///
  /// In vi, this message translates to:
  /// **'Thẻ hội viên'**
  String get memberCard;

  /// No description provided for @viewMemberCard.
  ///
  /// In vi, this message translates to:
  /// **'Xem thẻ hội viên'**
  String get viewMemberCard;

  /// No description provided for @loyaltyPoints.
  ///
  /// In vi, this message translates to:
  /// **'Điểm tích lũy'**
  String get loyaltyPoints;

  /// No description provided for @accountSettings.
  ///
  /// In vi, this message translates to:
  /// **'Cài đặt tài khoản'**
  String get accountSettings;

  /// No description provided for @manageSettingsSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Quản lý trải nghiệm, bảo mật và các tùy chọn của bạn.'**
  String get manageSettingsSubtitle;

  /// No description provided for @personalInfo.
  ///
  /// In vi, this message translates to:
  /// **'Thông tin cá nhân'**
  String get personalInfo;

  /// No description provided for @accountSecurity.
  ///
  /// In vi, this message translates to:
  /// **'Bảo mật tài khoản'**
  String get accountSecurity;

  /// No description provided for @linkedPhone.
  ///
  /// In vi, this message translates to:
  /// **'Số điện thoại liên kết'**
  String get linkedPhone;

  /// No description provided for @notifications.
  ///
  /// In vi, this message translates to:
  /// **'Thông báo'**
  String get notifications;

  /// No description provided for @appointmentNotifications.
  ///
  /// In vi, this message translates to:
  /// **'Thông báo lịch hẹn'**
  String get appointmentNotifications;

  /// No description provided for @treatmentNotifications.
  ///
  /// In vi, this message translates to:
  /// **'Thông báo liệu trình'**
  String get treatmentNotifications;

  /// No description provided for @courseNotifications.
  ///
  /// In vi, this message translates to:
  /// **'Thông báo khóa học'**
  String get courseNotifications;

  /// No description provided for @promotionalNotifications.
  ///
  /// In vi, this message translates to:
  /// **'Chương trình ưu đãi'**
  String get promotionalNotifications;

  /// No description provided for @preferences.
  ///
  /// In vi, this message translates to:
  /// **'Tùy chọn'**
  String get preferences;

  /// No description provided for @language.
  ///
  /// In vi, this message translates to:
  /// **'Ngôn ngữ'**
  String get language;

  /// No description provided for @vietnamese.
  ///
  /// In vi, this message translates to:
  /// **'Tiếng Việt'**
  String get vietnamese;

  /// No description provided for @english.
  ///
  /// In vi, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @selectLanguage.
  ///
  /// In vi, this message translates to:
  /// **'Chọn ngôn ngữ / Select Language'**
  String get selectLanguage;

  /// No description provided for @preferredBranch.
  ///
  /// In vi, this message translates to:
  /// **'Chi nhánh ưu tiên'**
  String get preferredBranch;

  /// No description provided for @theme.
  ///
  /// In vi, this message translates to:
  /// **'Giao diện'**
  String get theme;

  /// No description provided for @privacyAndSecurity.
  ///
  /// In vi, this message translates to:
  /// **'Quyền riêng tư & bảo mật'**
  String get privacyAndSecurity;

  /// No description provided for @privacyPolicy.
  ///
  /// In vi, this message translates to:
  /// **'Chính sách bảo mật'**
  String get privacyPolicy;

  /// No description provided for @termsOfService.
  ///
  /// In vi, this message translates to:
  /// **'Điều khoản dịch vụ'**
  String get termsOfService;

  /// No description provided for @logout.
  ///
  /// In vi, this message translates to:
  /// **'Đăng xuất'**
  String get logout;

  /// No description provided for @logoutConfirmation.
  ///
  /// In vi, this message translates to:
  /// **'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?'**
  String get logoutConfirmation;

  /// No description provided for @cancel.
  ///
  /// In vi, this message translates to:
  /// **'Hủy'**
  String get cancel;

  /// No description provided for @confirm.
  ///
  /// In vi, this message translates to:
  /// **'Đồng ý'**
  String get confirm;

  /// No description provided for @editProfile.
  ///
  /// In vi, this message translates to:
  /// **'Chỉnh sửa hồ sơ'**
  String get editProfile;

  /// No description provided for @saveChanges.
  ///
  /// In vi, this message translates to:
  /// **'Lưu thay đổi'**
  String get saveChanges;

  /// No description provided for @error.
  ///
  /// In vi, this message translates to:
  /// **'Lỗi'**
  String get error;

  /// No description provided for @success.
  ///
  /// In vi, this message translates to:
  /// **'Thành công'**
  String get success;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'vi'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'vi':
      return AppLocalizationsVi();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
