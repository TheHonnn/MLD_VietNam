import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/admin_candidate_card.dart';

void main() {
  group('Phase 2: AdminCandidateModel CRM, Target Audience & Auto-Archive', () {
    test('parses targetAudience and consultation_history cleanly', () {
      final candidate = AdminCandidateModel.fromJson({
        'id': 'enr-101',
        'student_name': 'Trần Thị Mai',
        'student_phone': '0911223344',
        'student_type': 'PRO',
        'status': 'CONSULTING',
        'consultation_status': 'PENDING_CONSULTATION',
        'amount_paid': 0,
        'tuition_total': 15000000,
        'courses': {
          'title': 'Dẫn lưu bạch huyết nâng cao',
          'learning_outcomes': {
            'target_audience': 'Chủ Spa & Kỹ thuật viên',
          },
        },
        'consultation_history': [
          {
            'timestamp': '2026-11-10T09:00:00Z',
            'author': 'Lan Anh',
            'note': 'Hẹn gọi lại cuối tuần',
          },
          {
            'timestamp': '2026-11-12T14:00:00Z',
            'author': 'Lan Anh',
            'note': 'Đang cân nhắc học phí',
          },
        ],
      });

      expect(candidate.status, 'PENDING_CONSULTATION');
      expect(candidate.targetAudience, 'Chủ Spa & Kỹ thuật viên');
      expect(candidate.consultationCount, 2);
      expect(candidate.latestConsultationSummary, 'Đang cân nhắc học phí');
    });

    test('maps NOT_GRADUATED status and auto-archives after > 3 consultations', () {
      final notGraduated = AdminCandidateModel.fromJson({
        'id': 'enr-102',
        'student_name': 'Lê Văn Hùng',
        'student_phone': '0922334455',
        'status': 'NOT_GRADUATED',
        'amount_paid': 15000000,
        'tuition_total': 15000000,
        'batch_id': 'batch-1',
      });

      final archivedLead = AdminCandidateModel.fromJson({
        'id': 'enr-103',
        'student_name': 'Phạm Thu Hà',
        'student_phone': '0933445566',
        'status': 'CONSULTING',
        'amount_paid': 0,
        'tuition_total': 9000000,
        'consultation_history': [
          {'timestamp': '2026-11-01', 'author': 'A', 'note': 'Lần 1'},
          {'timestamp': '2026-11-02', 'author': 'A', 'note': 'Lần 2'},
          {'timestamp': '2026-11-03', 'author': 'A', 'note': 'Lần 3'},
          {'timestamp': '2026-11-04', 'author': 'A', 'note': 'Lần 4 vẫn không học'},
        ],
      });

      expect(notGraduated.status, 'NOT_GRADUATED');
      expect(archivedLead.status, 'ARCHIVED');
    });
  });

  group('Phase 2: AdminCandidateCard displays consulting details and quick contact', () {
    testWidgets('renders targetAudience and consultation history summary on PENDING_CONSULTATION', (tester) async {
      const candidate = AdminCandidateModel(
        id: 'c-1',
        orderCode: 'ENR-01',
        candidateName: 'Nguyễn Minh Anh',
        candidatePhone: '0988776655',
        courseId: 'course-1',
        courseTitle: 'MLD Cơ bản',
        tuitionTotal: 9000000,
        amountPaid: 0,
        status: 'PENDING_CONSULTATION',
        createdAt: '2026-11-15',
        targetAudience: 'Người mới bắt đầu',
        consultationHistory: [
          AdminConsultationNoteModel(
            timestamp: '2026-11-16T10:00:00Z',
            author: 'TV1',
            note: 'Khách xin lịch tháng tới',
          ),
        ],
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AdminCandidateCard(candidate: candidate, isCompact: true),
          ),
        ),
      );

      expect(find.text('Người mới bắt đầu'), findsOneWidget);
      expect(find.text('Tư vấn 1/3'), findsOneWidget);
      expect(find.text('Khách xin lịch tháng tới'), findsOneWidget);
    });

    testWidgets('renders quick contact actions and email on NOT_GRADUATED and COMPLETED', (tester) async {
      const notGrad = AdminCandidateModel(
        id: 'c-2',
        orderCode: 'ENR-02',
        candidateName: 'Đỗ Hải Yến',
        candidatePhone: '0909123456',
        candidateEmail: 'yen@example.com',
        courseId: 'course-1',
        courseTitle: 'MLD Chuyên sâu',
        tuitionTotal: 15000000,
        amountPaid: 15000000,
        status: 'NOT_GRADUATED',
        createdAt: '2026-11-15',
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AdminCandidateCard(candidate: notGrad, isCompact: true),
          ),
        ),
      );

      expect(find.text('Chưa tốt nghiệp'), findsOneWidget);
      expect(find.text('Email: yen@example.com'), findsOneWidget);
      expect(find.text('Zalo'), findsOneWidget);
      expect(find.byIcon(Icons.sms_rounded), findsOneWidget);
      expect(find.byIcon(Icons.phone_rounded), findsOneWidget);
    });
  });
}
