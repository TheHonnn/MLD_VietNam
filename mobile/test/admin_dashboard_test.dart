import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/presentation/screens/admin_dashboard_screen.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/admin_kpi_card.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/admin_action_card.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Admin Dashboard & Models Tests', () {
    test('AdminKpiMetrics creates correctly', () {
      const metrics = AdminKpiMetrics(
        todayRevenue: 15000000,
        todayBookingsCount: 8,
        checkedInBookingsCount: 4,
        waitingBatchStudentsCount: 3,
        pendingActionsCount: 5,
      );

      expect(metrics.todayRevenue, 15000000);
      expect(metrics.todayBookingsCount, 8);
      expect(metrics.checkedInBookingsCount, 4);
      expect(metrics.waitingBatchStudentsCount, 3);
      expect(metrics.pendingActionsCount, 5);
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
  });
}

