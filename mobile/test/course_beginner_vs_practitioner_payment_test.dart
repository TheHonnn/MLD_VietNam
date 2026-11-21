import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/academy/data/repositories/academy_repository.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e05_enrollment_form_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e07_my_courses_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e08_class_detail_screen.dart';
import 'package:medical_healthcare_app/features/payments/data/models/payment_gateway_models.dart';
import 'package:medical_healthcare_app/features/payments/data/repositories/payment_gateway_repository.dart';
import 'package:medical_healthcare_app/features/payments/presentation/widgets/auto_payment_checkout_sheet.dart';
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
    PaymentGatewayRepository.instance.debugCreateIntentOverride = null;
    PaymentGatewayRepository.instance.debugCheckStatusOverride = null;
  });

  tearDown(() {
    PaymentGatewayRepository.instance.debugCreateIntentOverride = null;
    PaymentGatewayRepository.instance.debugCheckStatusOverride = null;
  });

  const beginnerCourse = CourseModel(
    id: 'test-course-beginner',
    title: 'Workshop: Chế độ ăn phòng ngừa bệnh lý tuyến vú',
    category: 'Người mới bắt đầu',
    level: 'Cơ bản',
    durationWeeks: 4,
    totalHours: 32,
    theoryHours: 12,
    practiceHours: 20,
    tuitionFee: 350000,
    depositFee: 100000,
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

  testWidgets('Beginner course shows PayOS QR with exact course price, blocks unpaid confirm, unlocks only when paid', (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    double? requestedAmount;
    bool serverPaid = false;

    PaymentGatewayRepository.instance.debugCreateIntentOverride = ({
      required double amount,
      required String description,
      required String targetType,
      String? targetId,
      String? referenceCode,
      String? customerId,
      String? customerName,
      String? customerPhone,
    }) async {
      requestedAmount = amount;
      return PaymentGatewayIntentModel(
        orderCode: 778899,
        provider: 'PAYOS',
        gatewayConfigured: true,
        targetType: targetType,
        targetId: targetId,
        referenceCode: referenceCode,
        amount: amount,
        description: description,
        bankBin: '970422',
        accountNumber: '0394316963',
        accountName: 'BUI THE HOANG',
        qrCode: '00020101021238570010A0000007270127000697042201130394316963',
        checkoutUrl: 'https://pay.payos.vn/web/778899',
        status: 'PENDING',
        isPaid: false,
      );
    };

    PaymentGatewayRepository.instance.debugCheckStatusOverride = (orderCode) async {
      if (!serverPaid) {
        return const PaymentGatewayStatusModel(
          orderCode: 778899,
          provider: 'PAYOS',
          configured: true,
          isPaid: false,
          status: 'PENDING',
          message: 'Vui lòng thanh toán. Hệ thống chưa nhận được tiền về tài khoản trung tâm.',
        );
      }
      return const PaymentGatewayStatusModel(
        orderCode: 778899,
        provider: 'PAYOS',
        configured: true,
        isPaid: true,
        status: 'PAID',
        amountPaid: 350000,
        message: 'Thanh toán thành công!',
      );
    };

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

    expect(tester.takeException(), isNull);
    expect(requestedAmount, 350000);
    expect(find.byType(AutoPaymentCheckoutSheet), findsOneWidget);
    expect(find.text('Đã đăng ký'), findsOneWidget);
    expect(find.text('350.000đ'), findsWidgets);
    expect(find.text('100.000đ'), findsNothing);
    expect(find.text('Xác nhận đã chuyển khoản'), findsOneWidget);

    final confirmBtn = find.text('Xác nhận đã chuyển khoản');
    await tester.ensureVisible(confirmBtn);
    await tester.tap(confirmBtn);
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.textContaining('Vui lòng thanh toán'), findsOneWidget);
    expect(AcademyRepository.instance.isCourseApproved(beginnerCourse.id), isFalse);
    expect(find.byType(E08ClassDetailScreen), findsNothing);

    serverPaid = true;
    await tester.ensureVisible(find.text('Xác nhận đã chuyển khoản'));
    await tester.tap(find.text('Xác nhận đã chuyển khoản'));
    await tester.pumpAndSettle();

    expect(AcademyRepository.instance.isCourseApproved(beginnerCourse.id), isTrue);
    expect(find.byType(E08ClassDetailScreen), findsOneWidget);
  });

  testWidgets('Practitioner course blocks online QR payment and renders cleanly without overflow', (tester) async {
    tester.view.physicalSize = const Size(360, 640);
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

    expect(tester.takeException(), isNull);
    expect(find.byType(AutoPaymentCheckoutSheet), findsNothing);
    expect(find.text('Đăng ký thành công!'), findsOneWidget);
    expect(find.text('Chờ nhân viên duyệt'), findsOneWidget);
    expect(find.text('Xác nhận đã chuyển khoản'), findsNothing);
    expect(find.text('Xem khóa học của tôi'), findsOneWidget);
  });

  testWidgets('E07MyCoursesScreen displays Chờ duyệt, Thanh toán luôn, Hủy khóa học and allows cancelling', (tester) async {
    tester.view.physicalSize = const Size(420, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final pendingCourse = beginnerCourse.copyWith(
      status: 'PENDING_APPROVAL',
      approvalStatus: 'PENDING_APPROVAL',
      customerCode: 'HV-TEST-001',
      enrollmentId: 'enr-test-1',
    );
    AcademyRepository.instance.enrollCourseLocal(pendingCourse);

    await tester.pumpWidget(
      _buildTestApp(
        home: const E07MyCoursesScreen(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Chờ duyệt'), findsWidgets);
    expect(find.text('Thanh toán luôn'), findsOneWidget);
    expect(find.text('Hủy khóa học'), findsOneWidget);

    await tester.tap(find.text('Hủy khóa học'));
    await tester.pumpAndSettle();

    expect(find.text('Xác nhận hủy khóa học'), findsOneWidget);
    await tester.tap(find.widgetWithText(ElevatedButton, 'Hủy khóa học'));
    await tester.pumpAndSettle();

    expect(AcademyRepository.instance.isCourseEnrolled(pendingCourse.id), isFalse);
  });

  testWidgets('Course approval state recognizes STUDYING and excludes CANCELLED/DROPPED', (tester) async {
    final activeCourse = beginnerCourse.copyWith(
      status: 'STUDYING',
      approvalStatus: 'APPROVED',
    );
    AcademyRepository.instance.enrollCourseLocal(activeCourse);

    expect(AcademyRepository.instance.isCourseEnrolled(beginnerCourse.id), isTrue);
    expect(AcademyRepository.instance.isCourseApproved(beginnerCourse.id), isTrue);

    final droppedCourse = beginnerCourse.copyWith(
      status: 'DROPPED',
      approvalStatus: 'CANCELLED',
    );
    AcademyRepository.instance.enrollCourseLocal(droppedCourse);
    expect(AcademyRepository.instance.isCourseEnrolled(beginnerCourse.id), isFalse);
    expect(AcademyRepository.instance.isCourseApproved(beginnerCourse.id), isFalse);
  });
}
