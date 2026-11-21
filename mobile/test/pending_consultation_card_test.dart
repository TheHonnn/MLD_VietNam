import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/pending_consultation_card.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const sampleCandidate = AdminCandidateModel(
    id: 'enr-consult-1',
    orderCode: 'KH-20261119-01',
    candidateName: 'Lê Thảo Vy',
    candidatePhone: '0912345678',
    candidateEmail: 'vy@example.com',
    courseId: 'crs-1',
    courseTitle: 'KTV Dẫn lưu bạch huyết Chuyên sâu',
    tuitionTotal: 15000000,
    amountPaid: 0,
    status: 'PENDING_CONSULTATION',
    createdAt: '2026-11-19',
    targetAudience: 'Chủ Spa / KTV',
    consultationHistory: [
      AdminConsultationNoteModel(
        timestamp: '2026-11-17T09:00:00Z',
        author: 'Lan',
        note: 'Khách hỏi lịch khai giảng tháng 12',
      ),
      AdminConsultationNoteModel(
        timestamp: '2026-11-18T14:30:00Z',
        author: 'Lan',
        note: 'Đã gửi học phí ưu đãi',
      ),
    ],
  );

  group('PendingConsultationCard two-column collapsible & unlimited consultation tests', () {
    testWidgets('collapsed state shows left student/course and right history with + and expand button', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: PendingConsultationCard(candidate: sampleCandidate),
            ),
          ),
        ),
      );

      expect(find.text('Lê Thảo Vy'), findsOneWidget);
      expect(find.text('KTV Dẫn lưu bạch huyết Chuyên sâu'), findsOneWidget);
      expect(find.text('Tư vấn 2/3'), findsOneWidget);
      expect(find.text('Đã gửi học phí ưu đãi'), findsOneWidget);
      expect(find.byIcon(Icons.add_rounded), findsOneWidget);
      expect(find.byIcon(Icons.keyboard_arrow_down_rounded), findsOneWidget);
      expect(find.text('Cho vào lưu trữ'), findsNothing);
    });

    testWidgets('expand button drops down details, auto-numbered history, and archive button inline', (tester) async {
      bool archived = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: PendingConsultationCard(
                candidate: sampleCandidate,
                onArchiveCandidate: () => archived = true,
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.byIcon(Icons.keyboard_arrow_down_rounded));
      await tester.pumpAndSettle();

      expect(find.text('THÔNG TIN HỌC VIÊN'), findsOneWidget);
      expect(find.text('LỊCH SỬ TƯ VẤN'), findsOneWidget);
      expect(find.text('Tư vấn lần 1'), findsOneWidget);
      expect(find.text('Tư vấn lần 2'), findsOneWidget);
      expect(find.text('Lần 3'), findsOneWidget);
      expect(find.text('Cho vào lưu trữ'), findsOneWidget);

      await tester.tap(find.text('Cho vào lưu trữ'));
      await tester.pump();
      expect(archived, isTrue);
    });

    testWidgets('plus button opens auto-numbered next consultation input even past 3 consultations', (tester) async {
      String? submittedNote;

      final overThreeCandidate = sampleCandidate.copyWith(
        consultationHistory: [
          ...sampleCandidate.consultationHistory,
          const AdminConsultationNoteModel(
            timestamp: '2026-11-18T16:00:00Z',
            author: 'Lan',
            note: 'Khách bận chưa nghe máy',
          ),
          const AdminConsultationNoteModel(
            timestamp: '2026-11-19T08:00:00Z',
            author: 'Lan',
            note: 'Hẹn tư vấn tiếp',
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: PendingConsultationCard(
                candidate: overThreeCandidate,
                onAddConsultationNote: (note) async {
                  submittedNote = note;
                },
              ),
            ),
          ),
        ),
      );

      expect(find.text('Tư vấn lần 4'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.add_rounded));
      await tester.pumpAndSettle();

      expect(find.text('Tư vấn lần 5'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Khách chốt đóng cọc cuối tuần');
      await tester.tap(find.text('Lưu'));
      await tester.pumpAndSettle();

      expect(submittedNote, 'Khách chốt đóng cọc cuối tuần');
    });

    test('AdminCandidateModel preserves ADMIN_PINNED lead past 3 consultations in PENDING_CONSULTATION', () {
      final pinned = AdminCandidateModel.fromJson({
        'id': 'enr-pinned',
        'student_name': 'Phạm Minh Tuấn',
        'student_phone': '0933221100',
        'status': 'CONSULTING',
        'consultation_status': 'ADMIN_PINNED',
        'amount_paid': 0,
        'tuition_total': 10000000,
        'consultation_history': [
          {'timestamp': '2026-11-01', 'author': 'A', 'note': '1'},
          {'timestamp': '2026-11-02', 'author': 'A', 'note': '2'},
          {'timestamp': '2026-11-03', 'author': 'A', 'note': '3'},
          {'timestamp': '2026-11-04', 'author': 'A', 'note': '4'},
        ],
      });

      expect(pinned.status, 'PENDING_CONSULTATION');
      expect(pinned.consultationCount, 4);
    });
  });
}
