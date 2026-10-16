/// Base URLs and Endpoints for MLD Vietnam Mobile connected to Supabase
class ApiEndpoints {
  ApiEndpoints._();

  /// Supabase Live Project Configuration
  static const String supabaseUrl = 'https://wstvwushpwcdsmhpunvh.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';

  /// Base URL defaults to Supabase Cloud
  static const String defaultBaseUrl = supabaseUrl;

  // Configurable base URL
  static String baseUrl = defaultBaseUrl;

  // --- Supabase REST Data Endpoints ---
  static const String branches = '/rest/v1/branches';
  static String branchDetail(String id) => '/rest/v1/branches?id=eq.$id&select=*';

  static const String services = '/rest/v1/services';
  static String serviceDetail(String id) => '/rest/v1/services?id=eq.$id&select=*';
  static const String serviceCategories = '/rest/v1/service_categories';

  static const String treatmentPackages = '/rest/v1/treatment_packages';
  static const String userPackages = '/rest/v1/user_packages';
  static const String treatmentJournal = '/rest/v1/treatment_journal';

  static const String bookings = '/rest/v1/bookings';
  static String bookingDetail(String id) => '/rest/v1/bookings?id=eq.$id&select=*,branches(name,address,phone)';
  static const String availableSlots = '/rest/v1/technician_slots';

  static const String invoices = '/rest/v1/invoices';
  static const String userVouchers = '/rest/v1/user_vouchers';
  static const String pointTransactions = '/rest/v1/point_transactions';
  static const String notifications = '/rest/v1/notifications';

  static const String courses = '/rest/v1/courses';
  static String courseDetail(String id) => '/rest/v1/courses?id=eq.$id&select=*,course_chapters(*,course_lessons(*))';
  static const String courseEnrollments = '/rest/v1/course_enrollments';

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
}
