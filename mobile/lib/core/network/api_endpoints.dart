/// Base URLs and Endpoints for MLD Vietnam Mobile connected to Supabase
class ApiEndpoints {
  ApiEndpoints._();

  /// Supabase Live Project Configuration
  static const String supabaseUrl = 'https://wstvwushpwcdsmhpunvh.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';
  static const String supabaseServiceRoleKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE';

  /// Base URL defaults to Supabase Cloud
  static const String defaultBaseUrl = supabaseUrl;

  // Configurable base URL
  static String baseUrl = defaultBaseUrl;

  /// Backend Central Gateway (NestJS) Configuration
  static const String backendBaseUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'https://mld-vietnam.onrender.com/api/v1',
  );

  // --- Supabase REST Data Endpoints ---
  static const String branches = '/rest/v1/branches';
  static String branchDetail(String id) => '/rest/v1/branches?id=eq.$id&select=*';

  static const String services = '/rest/v1/services';
  static String serviceDetail(String id) => '/rest/v1/services?id=eq.$id&select=*,service_categories(name)';
  static const String serviceCategories = '/rest/v1/service_categories';

  static const String technicians = '/rest/v1/technicians';
  static String technicianDetail(String id) => '/rest/v1/technicians?id=eq.$id&select=*,branches(name,address)';

  static const String treatmentPackages = '/rest/v1/treatment_packages';
  static const String userPackages = '/rest/v1/user_packages';
  static const String treatmentJournal = '/rest/v1/treatment_journal';
  static const String homeCareGuidelines = '/rest/v1/home_care_guidelines';
  static const String miniappSharedContent = '/rest/v1/miniapp_shared_content';
  static const String portalContent = '/rest/v1/miniapp_shared_content';

  static const String bookings = '/rest/v1/bookings';
  static String bookingDetail(String id) => '/rest/v1/bookings?id=eq.$id&select=*,branches(name,address,phone)';
  static const String availableSlots = '/rest/v1/technician_slots';

  // --- Booking Central Gateway (NestJS) Endpoints ---
  static const String bookingHoldSlot = '/bookings/hold-slot';
  static const String bookingCreate = '/bookings';
  static const String bookingMy = '/bookings/my';
  static String bookingDetailGateway(String id) => '/bookings/$id';
  static String bookingReschedule(String id) => '/bookings/$id/reschedule';
  static String bookingCancel(String id) => '/bookings/$id/cancel';
  static const String bookingSlots = '/bookings/slots';

  static const String invoices = '/rest/v1/invoices';
  static const String userVouchers = '/rest/v1/user_vouchers';
  static const String pointTransactions = '/rest/v1/point_transactions';
  static const String notifications = '/rest/v1/notifications';

  static const String courses = '/rest/v1/courses';
  static String courseDetail(String id) => '/rest/v1/courses?id=eq.$id&select=*,course_chapters(*,course_lessons(*))';
  static const String courseEnrollments = '/rest/v1/course_enrollments';
  static const String courseQuizzes = '/rest/v1/course_quizzes';

  // --- Supabase Edge Functions ---
  static const String vietQrPayment = '/functions/v1/vietqr-payment';
  static const String appointmentReminder = '/functions/v1/appointment-reminder';

  // --- Auth & User Profile ---
  static const String users = '/rest/v1/users';
  static const String userSettings = '/rest/v1/user_settings';
  static const String sendOtp = '/auth/v1/otp';
  static const String verifyOtp = '/auth/v1/verify';
  static const String authOtp = sendOtp;
  static const String authVerify = verifyOtp;

  // --- Backend Central Auth Endpoints ---
  static const String authRegister = '/auth/register';
  static const String authRegisterEmail = '/auth/register/email';
  static const String authVerifyEmailOtp = '/auth/verify-email-otp';
  static const String authResendOtp = '/auth/resend-otp';
  static const String authLogin = '/auth/login';
  static const String authLoginEmail = '/auth/login/email';
  static const String authRefresh = '/auth/refresh';
  static const String authLogout = '/auth/logout';
  static const String authForgotPassword = '/auth/forgot-password';
  static const String authResetPassword = '/auth/reset-password';
  static const String authLinkEmail = '/auth/link-email';
  static const String authPhone = '/auth/phone';

  // --- Academy (Group E) Endpoints ---
  static const String academyCourses = '/academy/courses';
  static String academyCourseDetail(String id) => '/academy/courses/$id';
  static const String academyEnroll = '/academy/enroll';
  static const String academyMyCourses = '/academy/my-courses';
  static const String academySchedule = '/academy/schedule';
  static const String academyResults = '/academy/results';

  // --- Treatment (Group D) Endpoints ---
  static const String treatmentMyPackages = '/treatment/packages/my';
  static String treatmentPackageDetail(String id) => '/treatment/packages/$id';
  static const String treatmentCareJournal = '/treatment/journal';
  static const String treatmentConsultation = '/treatment/consultation';
  static const String treatmentReviews = '/treatment/reviews';
  static const String treatmentGuidelines = '/treatment/guidelines';
  static const String treatmentFaqs = '/treatment/faqs';
  static const String treatmentSupportTickets = '/treatment/support/tickets';
  static const String treatmentNotifications = '/treatment/notifications';
  static String treatmentMarkNotificationRead(String id) => '/treatment/notifications/$id/read';

  // --- Membership (Group F) Endpoints ---
  static const String membershipProfile = '/membership/profile';
  static const String membershipCard = '/membership/card';
  static const String membershipPoints = '/membership/points';
  static const String membershipPointsRedeem = '/membership/points/redeem';
  static const String membershipVouchers = '/membership/vouchers';
  static const String membershipPayments = '/membership/payments';
  static const String membershipReferral = '/membership/referral';
  static const String membershipSettings = '/membership/settings';

  // --- Payments & VietQR PayOS Endpoints ---
  static const String paymentCreatePayosLink = '/payments/create-payos-link';
  static String paymentPayosStatus(int orderCode) => '/payments/payos/status/$orderCode';
}
