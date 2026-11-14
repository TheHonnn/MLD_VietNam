import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/admin_kpi_card.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/admin_action_card.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Admin Dashboard & Models Tests', () {
    test('AdminKpiMetrics creates correctly with monthRevenue', () {
      const metrics = AdminKpiMetrics(
        todayRevenue: 15000000,
        monthRevenue: 45000000,
        todayBookingsCount: 8,
        checkedInBookingsCount: 4,
        waitingBatchStudentsCount: 3,
        pendingActionsCount: 5,
      );

      expect(metrics.todayRevenue, 15000000);
      expect(metrics.monthRevenue, 45000000);
      expect(metrics.todayBookingsCount, 8);
      expect(metrics.checkedInBookingsCount, 4);
      expect(metrics.waitingBatchStudentsCount, 3);
      expect(metrics.pendingActionsCount, 5);
    });

    test('AdminBookingModel handles cancellationReason', () {
      final booking = AdminBookingModel.fromJson({
        'id': 'bk_cancel_01',
        'status': 'CANCELLED',
        'booking_date': '2026-11-09',
        'start_time': '14:00',
        'cancellation_reason': 'Khách bận việc đột xuất',
        'user': {'full_name': 'Lê Thị Thu', 'phone': '0912345678'},
        'service': {'name': 'Trị liệu MLD 60p', 'duration_minutes': 60, 'price': 500000},
      });

      expect(booking.status, 'CANCELLED');
      expect(booking.cancellationReason, 'Khách bận việc đột xuất');
      expect(booking.customerName, 'Lê Thị Thu');
    });

    test('AdminActionItem creates correctly', () {
      const item = AdminActionItem(
        id: 'action_1',
        type: AdminActionType.pendingBooking,
        title: 'Nguyễn Văn A đặt lịch MLD',
        subtitle: '10:00 ngày 2026-10-29',
        timeAgo: 'Cần duyệt xác nhận',
        rawId: 'bk_123',
      );

      expect(item.type, AdminActionType.pendingBooking);
      expect(item.rawId, 'bk_123');
    });

    testWidgets('AdminKpiCard renders correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminKpiCard(
              title: 'Doanh thu hôm nay',
              value: '15.000.000 ₫',
              subtitle: 'Hóa đơn đã thu',
              icon: Icons.account_balance_wallet_rounded,
              iconColor: const Color(0xFF00693F),
              iconBgColor: const Color(0xFFE8F6ED),
            ),
          ),
        ),
      );

      expect(find.text('Doanh thu hôm nay'), findsOneWidget);
      expect(find.text('15.000.000 ₫'), findsOneWidget);
      expect(find.text('Hóa đơn đã thu'), findsOneWidget);
    });

    testWidgets('AdminActionCard renders and fires callback', (tester) async {
      bool actionFired = false;
      final item = const AdminActionItem(
        id: 'action_1',
        type: AdminActionType.pendingBooking,
        title: 'Nguyễn Văn A đặt lịch MLD',
        subtitle: '10:00 ngày 2026-10-29',
        timeAgo: 'Cần duyệt xác nhận',
        rawId: 'bk_123',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminActionCard(
              item: item,
              onAction: () => actionFired = true,
            ),
          ),
        ),
      );

      expect(find.text('LỊCH HẸN MỚI'), findsOneWidget);
      expect(find.text('Nguyễn Văn A đặt lịch MLD'), findsOneWidget);
      expect(find.text('Duyệt lịch'), findsOneWidget);

      await tester.tap(find.text('Duyệt lịch'));
      await tester.pump();
      expect(actionFired, isTrue);
    });

    test('AdminCandidateModel reads enrolled_at and approval_notes cleanly', () {
      final candidate = AdminCandidateModel.fromJson({
        'id': 'enr_01',
        'student_name': 'Bùi Thế Hoàng',
        'student_phone': '0394316963',
        'course_id': 'c_01',
        'course_title': 'Khóa Master Signature',
        'batch_id': null,
        'amount_paid': 350000000,
        'tuition_total': 350000000,
        'status': 'ENROLLED',
        'enrolled_at': '2026-11-08T14:30:15.192Z',
        'approval_notes': 'Đã thu đủ 350 triệu chuyển khoản',
      });

      expect(candidate.candidateName, 'Bùi Thế Hoàng');
      expect(candidate.status, 'PAID_WAITING_CLASS');
      expect(candidate.amountPaid, 350000000);
      expect(candidate.createdAt, '2026-11-08T14:30:15.192Z');
      expect(candidate.notes, 'Đã thu đủ 350 triệu chuyển khoản');
    });

    test('AdminCourseBatchModel handles branches fallback for roomName', () {
      final batch = AdminCourseBatchModel.fromJson({
        'id': 'batch_01',
        'course_id': 'c_01',
        'batch_code': 'K26-GV-Q3',
        'start_date': '2026-11-05',
        'end_date': '2027-01-05',
        'branches': {'name': 'Chi nhánh Quận 3 - TP.HCM'},
        'instructors': {'full_name': 'Lâm Xuân Trường'},
        'max_students': 15,
        'enrolled_count': 3,
      });

      expect(batch.batchCode, 'K26-GV-Q3');
      expect(batch.instructorName, 'Lâm Xuân Trường');
      expect(batch.roomName, 'Chi nhánh Quận 3 - TP.HCM');
      expect(batch.availableSlots, 12);
      expect(batch.isFull, isFalse);
    });

    test('AdminRevenueReport and AdminRevenuePoint calculate summaries', () {
      const p1 = AdminRevenuePoint(
        label: 'T2 (10/11)',
        dateIso: '2026-11-10',
        totalAmount: 50000000,
        academyAmount: 35000000,
        serviceAmount: 15000000,
        transactionCount: 3,
      );

      final report = AdminRevenueReport(
        period: 'WEEK',
        totalRevenue: 50000000,
        serviceRevenue: 15000000,
        academyRevenue: 35000000,
        totalTransactions: 3,
        averageTicket: 16666666.67,
        chartPoints: const [p1],
        items: const [],
      );

      expect(report.totalRevenue, 50000000);
      expect(report.serviceRevenue, 15000000);
      expect(report.academyRevenue, 35000000);
      expect(report.chartPoints.length, 1);
      expect(report.chartPoints.first.totalAmount, 50000000);
    });

    testWidgets('AdminKpiCard fires onTap when clicked', (tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminKpiCard(
              title: 'Doanh thu tháng',
              value: '370.350.000 ₫',
              subtitle: 'Chạm xem lưới',
              icon: Icons.trending_up_rounded,
              iconColor: const Color(0xFF1E40AF),
              iconBgColor: const Color(0xFFEFF6FF),
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Doanh thu tháng'), findsOneWidget);
      await tester.tap(find.text('Doanh thu tháng'));
      await tester.pump();
      expect(tapped, isTrue);
    });
  });
}

