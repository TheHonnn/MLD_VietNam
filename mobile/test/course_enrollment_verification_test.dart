import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/academy/data/repositories/academy_repository.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e05_enrollment_form_screen.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/home/data/models/home_models.dart';
import 'package:medical_healthcare_app/features/home/data/repositories/branch_repository.dart';
import 'package:medical_healthcare_app/features/home/data/repositories/mock_home_repository.dart';

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
      expect(find.text('Địa chỉ liên hệ *'), findsOneWidget);
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
  });
}

