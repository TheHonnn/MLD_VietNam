import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

// Screens Academy
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e01_academy_home_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e02_course_catalog_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e03_course_detail_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e04_instructor_profile_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e05_enrollment_form_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e07_my_courses_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e08_class_detail_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e09_lesson_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e10_quiz_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e11_attendance_schedule_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e12_learning_results_screen.dart';

// Screens Home & Navigation
import 'package:medical_healthcare_app/features/home/presentation/screens/main_layout_screen.dart';
import 'package:medical_healthcare_app/features/home/presentation/screens/b04_search_screen.dart';

// Screens Auth
import 'package:medical_healthcare_app/features/auth/presentation/screens/a01_splash_screen.dart';
import 'package:medical_healthcare_app/features/auth/presentation/screens/a03_login_screen.dart';
import 'package:medical_healthcare_app/features/auth/presentation/screens/a03_email_register_screen.dart';
import 'package:medical_healthcare_app/features/auth/presentation/screens/a03_forgot_password_screen.dart';

// Screens Directory & Services
import 'package:medical_healthcare_app/features/directory/presentation/screens/b02_branches_specialists_screen.dart';
import 'package:medical_healthcare_app/features/directory/presentation/screens/b05_branch_listing_screen.dart';
import 'package:medical_healthcare_app/features/directory/presentation/screens/b07_specialist_listing_screen.dart';
import 'package:medical_healthcare_app/features/services/presentation/screens/b02_service_listing_screen.dart';
import 'package:medical_healthcare_app/features/services/presentation/screens/b03_service_detail_screen.dart';

// Screens Booking
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/c09_my_appointments_screen.dart';

// Screens Treatment
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d01_my_packages_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d03_care_journal_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d04_pre_service_consultation_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d05_service_review_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d06_home_care_guidelines_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d07_customer_support_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d08_notifications_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d09_documents_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d10_lymph_examination_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d11_community_screen.dart';

// Screens Membership
import 'package:medical_healthcare_app/features/membership/presentation/screens/f01_profile_dashboard_screen.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f02_edit_profile_screen.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f08_settings_screen.dart';

Widget _buildWrapper(Widget child) {
  return MaterialApp(
    locale: const Locale('vi'),
    supportedLocales: const [Locale('vi'), Locale('en')],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: child,
  );
}

void main() {
  final sampleCourse = MockAcademyData.courses.first;
  const sampleInstructor = InstructorModel(
    id: 'inst-001',
    name: 'BS. Lê Hoài Thanh',
    title: 'Trưởng ban Cố vấn Chuyên môn',
    specialties: ['Bác sĩ Y học Cổ truyền', 'Chuyên gia Vodder MLD'],
    avatar: 'assets/images/specialist_hero_1.png',
    bio: 'Bác sĩ với hơn 12 năm kinh nghiệm trong lĩnh vực Y học cổ truyền và dẫn lưu hệ bạch huyết.',
  );

  const sampleLesson = LessonModel(
    id: 'lesson-001',
    title: 'Bài 1: Giới thiệu hệ bạch huyết và nguyên lý Vodder MLD',
    durationMinutes: 15,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    lessonOrder: 1,
    isFreePreview: true,
  );

  final sampleQuiz = CourseQuizModel(
    id: 'quiz-001',
    courseId: sampleCourse.id,
    title: 'Bài kiểm tra cuối khóa Vodder MLD',
    totalQuestions: 10,
    timeLimitMinutes: 15,
    passingScore: 8.0,
  );

  // ACADEMY MODULE
  testWidgets('Audit Screen Display: E01AcademyHomeScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const E01AcademyHomeScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: E02CourseCatalogScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const E02CourseCatalogScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: E03CourseDetailScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(E03CourseDetailScreen(course: sampleCourse)));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: E04InstructorProfileScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const E04InstructorProfileScreen(instructor: sampleInstructor)));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: E05EnrollmentFormScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(E05EnrollmentFormScreen(course: sampleCourse)));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: E07MyCoursesScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const E07MyCoursesScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: E08ClassDetailScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(E08ClassDetailScreen(course: sampleCourse)));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: E09LessonScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(E09LessonScreen(
      lesson: sampleLesson,
      courseTitle: sampleCourse.title,
      courseId: sampleCourse.id,
    )));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: E10QuizScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(E10QuizScreen(
      quiz: sampleQuiz,
      course: sampleCourse,
      quizTitle: sampleQuiz.title,
      courseTitle: sampleCourse.title,
      totalQuestions: 10,
      timeLimitMinutes: 15,
      passingScore: 8.0,
    )));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: E11AttendanceScheduleScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const E11AttendanceScheduleScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: E12LearningResultsScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const E12LearningResultsScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  // HOME & GENERAL
  testWidgets('Audit Screen Display: MainLayoutScreen & B01HomeScreen render cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const MainLayoutScreen(initialIndex: 0)));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: B04SearchScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const B04SearchScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  // AUTH MODULE
  testWidgets('Audit Screen Display: A01SplashScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const A01SplashScreen()));
    await tester.pump(const Duration(milliseconds: 500));
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: A03LoginScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const A03LoginScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: A03EmailRegisterScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const A03EmailRegisterScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: A03ForgotPasswordScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const A03ForgotPasswordScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  // DIRECTORY & SERVICES MODULE
  testWidgets('Audit Screen Display: B02BranchesSpecialistsScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const B02BranchesSpecialistsScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: B05BranchListingScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const B05BranchListingScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: B07SpecialistListingScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const B07SpecialistListingScreen()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: B02ServiceListingScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const B02ServiceListingScreen()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: B03ServiceDetailScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const B03ServiceDetailScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  // BOOKING MODULE
  testWidgets('Audit Screen Display: AllInOneBookingScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const AllInOneBookingScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: C09MyAppointmentsScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const C09MyAppointmentsScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  // TREATMENT MODULE
  testWidgets('Audit Screen Display: D01MyPackagesScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const D01MyPackagesScreen()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: D03CareJournalScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const D03CareJournalScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: D04PreServiceConsultationScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const D04PreServiceConsultationScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: D05ServiceReviewScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const D05ServiceReviewScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: D06HomeCareGuidelinesScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const D06HomeCareGuidelinesScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: D07CustomerSupportScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const D07CustomerSupportScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: D08NotificationsScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const D08NotificationsScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: D09DocumentsScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const D09DocumentsScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: D10LymphExaminationScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const D10LymphExaminationScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: D11CommunityScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const D11CommunityScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  // MEMBERSHIP MODULE
  testWidgets('Audit Screen Display: F01ProfileDashboardScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const F01ProfileDashboardScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: F02EditProfileScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const F02EditProfileScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Audit Screen Display: F08SettingsScreen renders cleanly', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const F08SettingsScreen()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
