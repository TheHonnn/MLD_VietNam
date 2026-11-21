import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/academy/data/repositories/academy_repository.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e05_enrollment_form_screen.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

Widget _buildTestApp({required Widget home}) {
  return MaterialApp(
    locale: const Locale('vi'),
    supportedLocales: const [Locale('vi'), Locale('en')],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: home,
  );
}

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues({});
    AuthService.instance.isLoggedInNotifier.value = true;
    AcademyRepository.instance.clearEnrolledCourses();
  });

  const beginnerCourse = CourseModel(
    id: 'test-course-beginner',
    title: 'Khóa học Nền tảng Dưỡng sinh MLD Cơ bản',
    category: 'Người mới bắt đầu',
    level: 'Cơ bản',
    durationWeeks: 4,
    totalHours: 32,
    theoryHours: 12,
    practiceHours: 20,
    tuitionFee: 9000000,
    depositFee: 2000000,
    targetAudience: 'Người mới bắt đầu',
    targetNeed: 'Cơ bản',
    courseGroup: 'Người mới bắt đầu',
    image: 'https://example.com/c1.jpg',
    instructorName: 'Master Hoàng',
    instructorTitle: 'Giảng viên cao cấp',
    instructorAvatar: 'https://example.com/ins1.jpg',
    branch: 'Trụ sở Hà Nội',
    schedule: 'Thứ 2 - Thứ 6',
    description: 'Dành cho học viên mới bắt đầu tiếp cận phương pháp MLD',
  );

  const practitionerCourse = CourseModel(
    id: 'test-course-pro',
    title: 'Khóa Chuyên sâu Trị liệu Phù bạch huyết dành cho người làm nghề',
    category: 'Người đang làm nghề',
    level: 'Chuyên nghiệp',
    durationWeeks: 8,
    totalHours: 64,
    theoryHours: 24,
    practiceHours: 40,
    tuitionFee: 25000000,
    depositFee: 5000000,
    targetAudience: 'Người đang làm nghề kỹ thuật viên, bác sĩ phục hồi',
    targetNeed: 'Nâng cao tay nghề',
    courseGroup: 'Người đang làm nghề',
    image: 'https://example.com/c2.jpg',
    instructorName: 'Master Hoàng',
    instructorTitle: 'Giảng viên cao cấp',
    instructorAvatar: 'https://example.com/ins1.jpg',
    branch: 'Trụ sở Hà Nội',
    schedule: 'Thứ 7 - Chủ nhật',
    description: 'Đào tạo nâng cao cho người làm nghề trị liệu chuyên sâu',
  );

  testWidgets('Beginner course displays online QR payment button and unlocks lessons on payment', (tester) async {
    tester.view.physicalSize = const Size(420, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      _buildTestApp(
        home: const E05EnrollmentFormScreen(course: beginnerCourse),
      ),
    );
    await tester.pumpAndSettle();

    final submitBtn = find.byKey(const Key('submit_enrollment_button'));
    expect(submitBtn, findsOneWidget);
    await tester.ensureVisible(submitBtn);
    await tester.tap(submitBtn);
    await tester.pumpAndSettle();

    expect(find.text('Đăng ký thành công!'), findsOneWidget);
    expect(find.text('Chờ nhân viên duyệt'), findsOneWidget);
    expect(find.text('Thanh toán học phí online (QR)'), findsOneWidget);
  });

  testWidgets('Practitioner course blocks online QR payment and shows consultation notice', (tester) async {
    tester.view.physicalSize = const Size(420, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      _buildTestApp(
        home: const E05EnrollmentFormScreen(course: practitionerCourse),
      ),
    );
    await tester.pumpAndSettle();

    final submitBtn = find.byKey(const Key('submit_enrollment_button'));
    expect(submitBtn, findsOneWidget);
    await tester.ensureVisible(submitBtn);
    await tester.tap(submitBtn);
    await tester.pumpAndSettle();

    expect(find.text('Đăng ký thành công!'), findsOneWidget);
    expect(find.text('Chờ nhân viên duyệt'), findsOneWidget);
    expect(find.text('Thanh toán học phí online (QR)'), findsNothing);
    expect(find.text('Xem khóa học của tôi'), findsOneWidget);
  });

  testWidgets('Course approval state recognizes ACTIVE as valid approved status', (tester) async {
    final activeCourse = beginnerCourse.copyWith(
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
    );
    AcademyRepository.instance.enrollCourseLocal(activeCourse);

    expect(AcademyRepository.instance.isCourseEnrolled(beginnerCourse.id), isTrue);
    expect(AcademyRepository.instance.isCourseApproved(beginnerCourse.id), isTrue);
  });
}
