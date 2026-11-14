import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/presentation/screens/admin_batch_detail_screen.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/admin_candidate_card.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Admin Academy Compact, Kanban & Batch Detail Tests', () {
    const paidCandidate = AdminCandidateModel(
      id: 'cand_01',
      orderCode: 'ENR-K26-001',
      candidateName: 'Nguyễn Thu Trang',
      candidatePhone: '0988112233',
      courseId: 'course_01',
      courseTitle: 'MLD Chuyên Sâu K26',
      batchId: 'batch_01',
      batchCode: 'K26-GV-Q3',
      tuitionTotal: 15000000,
      amountPaid: 15000000,
      status: 'ENROLLED_STUDYING',
      createdAt: '2026-11-14T08:00:00Z',
    );

    const unpaidCandidate = AdminCandidateModel(
      id: 'cand_02',
      orderCode: 'ENR-K26-002',
      candidateName: 'Lê Hoàng Nam',
      candidatePhone: '0977223344',
      courseId: 'course_01',
      courseTitle: 'MLD Chuyên Sâu K26',
      batchId: null,
      batchCode: null,
      tuitionTotal: 15000000,
      amountPaid: 0,
      status: 'PENDING_CONSULTATION',
      createdAt: '2026-11-14T09:00:00Z',
    );

    const testBatch = AdminCourseBatchModel(
      id: 'batch_01',
      courseId: 'course_01',
      batchCode: 'K26-GV-Q3',
      startDate: '2026-11-20',
      endDate: '2026-12-20',
      scheduleDays: 'T2-T4-T6',
      timeSlot: '08:30 - 11:30',
      enrolledCount: 1,
      maxStudents: 15,
      status: 'OPEN_FOR_ENROLLMENT',
      instructorName: 'TS. Bác sĩ Trịnh Văn Hùng',
      roomName: 'Phòng Đào Tạo A1 - Cơ sở Quận 3',
      courseTitle: 'MLD Chuyên Sâu K26',
    );

    testWidgets('AdminCandidateCard compact mode renders all dense info', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AdminCandidateCard(
              candidate: paidCandidate,
              isCompact: true,
            ),
          ),
        ),
      );

      expect(find.text('Nguyễn Thu Trang'), findsOneWidget);
      expect(find.text('Đang theo học'), findsOneWidget);
      expect(find.textContaining('0988112233'), findsOneWidget);
      expect(find.textContaining('MLD Chuyên Sâu K26'), findsOneWidget);
      expect(find.text('15.000.000 ₫'), findsOneWidget);
    });

    testWidgets('AdminBatchDetailScreen displays full class details, KPIs and student roster', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AdminBatchDetailScreen(
            batch: testBatch,
            allCandidates: const [paidCandidate, unpaidCandidate],
          ),
        ),
      );

      // Verify Header & Batch Info
      expect(find.text('K26-GV-Q3'), findsWidgets);
      expect(find.text('MLD Chuyên Sâu K26'), findsWidgets);
      expect(find.textContaining('TS. Bác sĩ Trịnh Văn Hùng'), findsOneWidget);
      expect(find.textContaining('Phòng Đào Tạo A1'), findsOneWidget);
      expect(find.textContaining('T2-T4-T6 (08:30 - 11:30)'), findsOneWidget);

      // Verify KPIs
      expect(find.text('1 hv'), findsOneWidget); // Sĩ số hiện tại
      expect(find.text('1/1'), findsOneWidget); // Đã nộp đủ
      expect(find.text('15.000.000 ₫'), findsWidgets); // Tổng thu

      // Verify Student Roster
      expect(find.text('Nguyễn Thu Trang'), findsOneWidget);
      expect(find.text('Đã thu đủ'), findsOneWidget);
      expect(find.textContaining('ENR-K26-001'), findsOneWidget);
    });
  });
}
