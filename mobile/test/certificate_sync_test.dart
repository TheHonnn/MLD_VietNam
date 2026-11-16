import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e12_learning_results_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
  });

  test('StudentCertificateModel parses full database JSON accurately', () {
    final json = {
      'id': 'f4920470-2196-41b8-86dc-0613ce3a9508',
      'certificate_code': 'MLD-GCN-2026-8866',
      'student_name': 'Bùi Thế Hoàng',
      'course_title': 'Dẫn lưu bạch huyết chuyên sâu cho người làm nghề',
      'issue_date': '2026-11-16',
      'theory_score': 9.5,
      'practical_score': 9.0,
      'final_grade': 'XUẤT SẮC',
      'status': 'ISSUED',
      'signer_name': 'ThS.BS Lâm Xuân Trường',
      'signer_title': 'GIÁM ĐỐC HỌC VIỆN MLD VIỆT NAM',
      'qr_verification_code': 'https://mldvietnam.vn/verify/MLD-GCN-2026-8866',
    };

    final model = StudentCertificateModel.fromJson(json);

    expect(model.id, equals('f4920470-2196-41b8-86dc-0613ce3a9508'));
    expect(model.certificateCode, equals('MLD-GCN-2026-8866'));
    expect(model.studentName, equals('Bùi Thế Hoàng'));
    expect(model.courseTitle, equals('Dẫn lưu bạch huyết chuyên sâu cho người làm nghề'));
    expect(model.finalGrade, equals('XUẤT SẮC'));
    expect(model.theoryScore, equals(9.5));
    expect(model.practicalScore, equals(9.0));
    expect(model.signerName, equals('ThS.BS Lâm Xuân Trường'));
    expect(model.signerTitle, equals('GIÁM ĐỐC HỌC VIỆN MLD VIỆT NAM'));
  });

  test('StudentCertificateModel parses camelCase JSON correctly', () {
    final json = {
      'id': 'fad2fdfa-1b21-4763-80c8-d42267cd4269',
      'certificateCode': 'MLD-GCN-2026-4BD6C9F15003',
      'studentName': 'The Hoang',
      'courseTitle': 'Lymphatic Wellness Signature Program',
      'issueDate': '2026-11-16',
      'theoryScore': 10.0,
      'practicalScore': 10.0,
      'finalGrade': 'XUẤT SẮC',
      'status': 'ISSUED',
      'signerName': 'Xuan Truong',
      'signerTitle': 'Giám đốc',
      'qrVerificationCode': '09ef843f-42d5-45a0-92df-5f9949596586',
    };

    final model = StudentCertificateModel.fromJson(json);

    expect(model.id, equals('fad2fdfa-1b21-4763-80c8-d42267cd4269'));
    expect(model.certificateCode, equals('MLD-GCN-2026-4BD6C9F15003'));
    expect(model.studentName, equals('The Hoang'));
    expect(model.courseTitle, equals('Lymphatic Wellness Signature Program'));
    expect(model.theoryScore, equals(10.0));
    expect(model.practicalScore, equals(10.0));
  });

  testWidgets('E12LearningResultsScreen loads and renders empty state cleanly when no certificate', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: E12LearningResultsScreen(),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pumpAndSettle();

    expect(find.textContaining('Kết quả học tập'), findsOneWidget);
    expect(find.byIcon(Icons.school_outlined), findsOneWidget);
    expect(find.byIcon(Icons.explore_outlined), findsOneWidget);
  });
}
