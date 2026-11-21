import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/academy/data/repositories/academy_repository.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e05_enrollment_form_screen.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/payments/data/models/payment_gateway_models.dart';
import 'package:medical_healthcare_app/features/payments/data/repositories/payment_gateway_repository.dart';
import 'package:medical_healthcare_app/features/payments/presentation/widgets/auto_payment_checkout_sheet.dart';

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
  TestWidgetsFlutterBinding.ensureInitialized();

  final sampleCourse = MockAcademyData.courses.first;

  group('Course Enrollment Requirements Verification', () {
    testWidgets('1. E05 displays real database branch and address, NOT hardcoded fake branches', (tester) async {
      tester.view.physicalSize = const Size(420, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(home: E05EnrollmentFormScreen(course: sampleCourse)));
      await tester.pumpAndSettle();

      // Verify REAL database branch & address are rendered
      expect(find.text('Trụ sở MLD Việt Nam (5 Master LV3)'), findsOneWidget);
      expect(find.textContaining('Số 260, Ngõ 271 Bùi Xương Trạch'), findsOneWidget);

      // Verify fake hardcoded addresses are completely gone
      expect(find.textContaining('Chi nhánh Quận 3, TP.HCM (Trụ sở chính)'), findsNothing);
      expect(find.textContaining('Chi nhánh Cầu Giấy, Hà Nội'), findsNothing);
    });

    testWidgets('2. Customer form fields are present with correct validation and placeholders', (tester) async {
      tester.view.physicalSize = const Size(420, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(home: E05EnrollmentFormScreen(course: sampleCourse)));
      await tester.pumpAndSettle();

      expect(find.text('Họ và tên *'), findsOneWidget);
      expect(find.text('Số điện thoại *'), findsOneWidget);
      expect(find.text('Địa chỉ Email *'), findsOneWidget);
      expect(find.text('Địa chỉ liên hệ'), findsOneWidget);
    });

    test('3. AcademyRepository records course enrollment with real branch and pending status', () async {
      final repo = AcademyRepository.instance;
      final result = await repo.enrollCourse(
        course: sampleCourse,
        studentName: 'Trần Văn Học Viên',
        studentPhone: '0912345678',
        studentEmail: 'hocvien@mld.vn',
        studentAddress: 'Số 260 Bùi Xương Trạch, Hà Nội',
        selectedBranch: 'Trụ sở MLD Việt Nam (5 Master LV3) - Số 260 Bùi Xương Trạch, Hà Nội',
        studentType: 'BEGINNER',
      );

      expect(result['status'], equals('PENDING_APPROVAL'));
      expect(result['studentName'], equals('Trần Văn Học Viên'));
      expect(repo.isCourseEnrolled(sampleCourse.id, sampleCourse.title), isTrue);
    });

    test('4. AdminCandidateModel correctly parses student_name, student_phone, student_email from Supabase', () {
      final supabaseRow = {
        'id': 'enr_001',
        'order_code': 'ENR-20261030-001',
        'student_name': 'Trần Văn Học Viên',
        'student_phone': '0912345678',
        'student_email': 'hocvien@mld.vn',
        'course_id': sampleCourse.id,
        'course_title': sampleCourse.title,
        'tuition_total': 35000000.0,
        'amount_paid': 0.0,
        'status': 'CONSULTING',
        'created_at': '2026-10-30T21:00:00Z',
      };

      final candidate = AdminCandidateModel.fromJson(supabaseRow);
      expect(candidate.candidateName, equals('Trần Văn Học Viên'));
      expect(candidate.candidatePhone, equals('0912345678'));
      expect(candidate.candidateEmail, equals('hocvien@mld.vn'));
      expect(candidate.status, equals('PENDING_CONSULTATION'));
    });

    testWidgets('5. Submitting E05 displays compact PayOS payment sheet with exact course amount and zero overflow', (tester) async {
      AuthService.instance.isLoggedInNotifier.value = true;
      AcademyRepository.instance.clearEnrolledCourses();
      PaymentGatewayRepository.instance.debugCreateIntentOverride = ({
        required double amount,
        required String description,
        required String targetType,
        String? targetId,
        String? referenceCode,
        String? customerId,
        String? customerName,
        String? customerPhone,
      }) async =>
          PaymentGatewayIntentModel(
            orderCode: 998877,
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
            checkoutUrl: 'https://pay.payos.vn/web/998877',
            status: 'PENDING',
            isPaid: false,
          );
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        AuthService.instance.isLoggedInNotifier.value = false;
        PaymentGatewayRepository.instance.debugCreateIntentOverride = null;
      });

      final unEnrolledCourse = MockAcademyData.courses[1].copyWith(
        tuitionFee: 350000,
        depositFee: 100000,
      );
      await tester.pumpWidget(_buildTestApp(home: E05EnrollmentFormScreen(course: unEnrolledCourse)));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).at(0), 'Nguyễn Văn Test');
      await tester.enterText(find.byType(TextFormField).at(1), '0988777666');
      await tester.enterText(find.byType(TextFormField).at(2), 'test@mld.vn');
      await tester.pumpAndSettle();

      final submitBtn = find.byKey(const Key('submit_enrollment_button'));
      await tester.ensureVisible(submitBtn);
      await tester.tap(submitBtn);
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.byType(AutoPaymentCheckoutSheet), findsOneWidget);
      expect(find.text('Đã đăng ký'), findsOneWidget);
      expect(find.text('350.000đ'), findsWidgets);
      expect(find.text('100.000đ'), findsNothing);
      expect(find.text('Xác nhận đã chuyển khoản'), findsOneWidget);
      expect(find.text('Để sau · Xem khóa học của tôi'), findsOneWidget);

      expect(find.textContaining('Bước 1:'), findsNothing);
      expect(find.textContaining('Hồ sơ của học viên'), findsNothing);
    });
  });
}

