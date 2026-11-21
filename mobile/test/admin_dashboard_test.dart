import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/data/repositories/admin_repository.dart';
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

    test('AdminRepository.isTestCode detects test invoice codes', () {
      expect(AdminRepository.isTestCode('HD-TEST-001'), isTrue);
      expect(AdminRepository.isTestCode('INV-UAT-99'), isTrue);
      expect(AdminRepository.isTestCode('SEC-CHECK-1'), isTrue);
      expect(AdminRepository.isTestCode('EXPIRY-DUE'), isTrue);
      expect(AdminRepository.isTestCode('E2E-RUN-5'), isTrue);
      expect(AdminRepository.isTestCode('HD-SPA-20261120-001'), isFalse);
      expect(AdminRepository.isTestCode('HD-HP-20261120-002'), isFalse);
      expect(AdminRepository.isTestCode(null), isFalse);
    });

    test('AdminRepository.isDateInRange checks date ranges correctly', () {
      expect(AdminRepository.isDateInRange('2026-11-20T10:00:00Z', '2026-11-20', '2026-11-20'), isTrue);
      expect(AdminRepository.isDateInRange('2026-11-20', '2026-11-01', '2026-11-30'), isTrue);
      expect(AdminRepository.isDateInRange('2026-10-31', '2026-11-01', '2026-11-30'), isFalse);
      expect(AdminRepository.isDateInRange('', '2026-11-01', '2026-11-30'), isFalse);
      expect(AdminRepository.isDateInRange(null, '2026-11-01', '2026-11-30'), isFalse);
    });

    test('AdminRepository.computeRevenueEngine calculates Web Admin parity revenue', () {
      final invoices = [
        {
          'id': 'inv_1',
          'invoice_code': 'HD-SPA-001',
          'branch_id': 'branch_q3',
          'booking_id': 'bk_1',
          'total_amount': '1000000',
          'refund_amount': '200000',
          'payment_status': 'PAID',
          'paid_at': '2026-11-20T08:00:00',
        },
        {
          'id': 'inv_test',
          'invoice_code': 'HD-TEST-999',
          'branch_id': 'branch_q3',
          'total_amount': '5000000',
          'refund_amount': '0',
          'payment_status': 'PAID',
          'paid_at': '2026-11-20T08:30:00',
        },
        {
          'id': 'inv_academy',
          'invoice_code': 'HD-HP-001',
          'branch_id': 'branch_q3',
          'enrollment_id': 'enr_1',
          'total_amount': '35000000',
          'refund_amount': '0',
          'payment_status': 'PAID',
          'paid_at': '2026-11-20T09:00:00',
        },
        {
          'id': 'inv_prod',
          'invoice_code': 'HD-PR-001',
          'branch_id': 'branch_q3',
          'total_amount': '500000',
          'refund_amount': '0',
          'payment_status': 'PAID',
          'paid_at': '2026-11-20T09:30:00',
          'invoice_items': [
            {'item_type': 'PRODUCT', 'amount': '500000'}
          ],
        },
      ];

      final tuitions = [
        {
          'id': 'tt_1',
          'transaction_code': 'TT-001',
          'enrollment_id': 'enr_1',
          'branch_id': 'branch_q3',
          'transaction_type': 'DEPOSIT',
          'amount': '35000000',
          'payment_status': 'PAID',
          'paid_at': '2026-11-20T09:00:00',
        },
        {
          'id': 'tt_2',
          'transaction_code': 'TT-002',
          'enrollment_id': 'enr_2',
          'branch_id': 'branch_q3',
          'transaction_type': 'FULL_PAYMENT',
          'amount': '20000000',
          'payment_status': 'PAID',
          'paid_at': '2026-11-20T10:00:00',
        },
        {
          'id': 'tt_refund',
          'transaction_code': 'TT-003',
          'enrollment_id': 'enr_refund',
          'branch_id': 'branch_q3',
          'transaction_type': 'REFUND',
          'amount': '5000000',
          'payment_status': 'PAID',
          'paid_at': '2026-11-20T11:00:00',
        },
      ];

      final enrollments = [
        {
          'id': 'enr_1',
          'order_code': 'ENR-001',
          'student_name': 'Học viên 1',
          'amount_paid': '35000000',
          'approved_at': '2026-11-20T09:00:00',
          'selected_branch': 'branch_q3',
        },
        {
          'id': 'enr_2',
          'order_code': 'ENR-002',
          'student_name': 'Học viên 2',
          'amount_paid': '20000000',
          'approved_at': '2026-11-20T10:00:00',
          'selected_branch': 'branch_q3',
        },
        {
          'id': 'enr_3',
          'order_code': 'ENR-003',
          'student_name': 'Học viên 3',
          'amount_paid': '10000000',
          'approved_at': '2026-11-20T14:00:00',
          'selected_branch': 'branch_q3',
        },
      ];

      final bookings = [
        {
          'id': 'bk_unpaid_1',
          'booking_code': 'MLD-DL-001',
          'payment_status': 'UNPAID',
          'status': 'CONFIRMED',
          'final_price': '1700000',
        },
        {
          'id': 'bk_unpaid_2',
          'booking_code': 'MLD-DL-002',
          'payment_status': 'UNPAID',
          'status': 'PENDING',
          'base_total': '900000',
        },
      ];

      final report = AdminRepository.computeRevenueEngine(
        invoices: invoices,
        tuitions: tuitions,
        enrollments: enrollments,
        bookings: bookings,
        branchId: 'branch_q3',
        startIso: '2026-11-20',
        endIso: '2026-11-20',
        period: 'TODAY',
        referenceNow: DateTime.parse('2026-11-20T15:00:00'),
      );

      expect(report.serviceRevenue, 800000);
      expect(report.productRevenue, 500000);
      expect(report.academyRevenue, 50000000);
      expect(report.totalRevenue, 51300000);
      expect(report.grossCollected, 56500000);
      expect(report.refundAmount, 5200000);
      expect(report.refundCount, 2);
      expect(report.receivableAmount, 2600000);
      expect(report.receivableCount, 2);
      expect(report.totalTransactions, 5);
    });
  });
}

