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

  testWidgets('E12LearningResultsScreen loads and renders empty state cleanly when no certificate', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: E12LearningResultsScreen(),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pumpAndSettle();

    expect(find.text('Kết quả học tập'), findsOneWidget);
    expect(find.text('Chưa có kết quả học tập & giấy chứng nhận'), findsOneWidget);
    expect(find.text('Khám phá khóa học ngay'), findsOneWidget);
  });
}
