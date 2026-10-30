import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/admin_candidate_card.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Admin Academy Candidate Card Tests', () {
    const baseCandidate = AdminCandidateModel(
      id: 'enr_001',
      orderCode: 'ENR-20261028-001',
      candidateName: 'Lê Hoàng Yến',
      candidatePhone: '0987654321',
      candidateEmail: 'yen.le@gmail.com',
      courseId: 'crs_001',
      courseTitle: 'Chuyên gia Dẫn lưu bạch huyết Vodder Quốc tế',
      tuitionTotal: 18000000,
      amountPaid: 5000000,
      status: 'PAID_WAITING_CLASS',
      createdAt: '2026-10-28T08:00:00Z',
    );

    testWidgets('renders PAID_WAITING_CLASS and fires onAssignBatch', (tester) async {
      bool assignFired = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminCandidateCard(
              candidate: baseCandidate,
              onAssignBatch: () => assignFired = true,
            ),
          ),
        ),
      );

      expect(find.text('ENR-20261028-001'), findsOneWidget);
      expect(find.text('Lê Hoàng Yến'), findsOneWidget);
      expect(find.text('CHỜ XẾP LỚP'), findsOneWidget);
      expect(find.text('Xếp lớp ngay'), findsOneWidget);

      await tester.tap(find.text('Xếp lớp ngay'));
      await tester.pump();
      expect(assignFired, isTrue);
    });

    testWidgets('renders PENDING_CONSULTATION and fires onConfirmConsultation', (tester) async {
      bool consultFired = false;
      final consultingCandidate = baseCandidate.copyWith(status: 'PENDING_CONSULTATION');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminCandidateCard(
              candidate: consultingCandidate,
              onConfirmConsultation: () => consultFired = true,
            ),
          ),
        ),
      );

      expect(find.text('Chờ tư vấn'), findsOneWidget);
      expect(find.text('Đã tư vấn'), findsOneWidget);

      await tester.tap(find.text('Đã tư vấn'));
      await tester.pump();
      expect(consultFired, isTrue);
    });
  });
}

