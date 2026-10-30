import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/admin_appointment_card.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Admin Frontdesk Appointment Card Tests', () {
    const baseBooking = AdminBookingModel(
      id: 'bk_001',
      bookingCode: 'BK-20261028-001',
      bookingDate: '2026-10-28',
      startTime: '09:00',
      endTime: '10:00',
      customerName: 'Trần Thị Mai',
      customerPhone: '0912345678',
      serviceName: 'Dẫn lưu bạch huyết Vodder Cổ Vai Gáy',
      finalPrice: 850000,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      technicianName: 'Nguyễn Văn Minh',
      roomName: 'Phòng VIP 1',
    );

    testWidgets('renders PENDING status and fires onApprove', (tester) async {
      bool approveFired = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminAppointmentCard(
              booking: baseBooking,
              onApprove: () => approveFired = true,
            ),
          ),
        ),
      );

      expect(find.text('BK-20261028-001'), findsOneWidget);
      expect(find.text('Trần Thị Mai'), findsOneWidget);
      expect(find.text('Chờ duyệt'), findsOneWidget);
      expect(find.text('Duyệt lịch'), findsOneWidget);

      await tester.tap(find.text('Duyệt lịch'));
      await tester.pump();
      expect(approveFired, isTrue);
    });

    testWidgets('renders CONFIRMED status and fires onCheckIn', (tester) async {
      bool checkInFired = false;
      final confirmedBooking = baseBooking.copyWith(status: 'CONFIRMED');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminAppointmentCard(
              booking: confirmedBooking,
              onCheckIn: () => checkInFired = true,
            ),
          ),
        ),
      );

      expect(find.text('Đã xác nhận'), findsOneWidget);
      expect(find.text('Tiếp đón Check-in'), findsOneWidget);

      await tester.tap(find.text('Tiếp đón Check-in'));
      await tester.pump();
      expect(checkInFired, isTrue);
    });

    testWidgets('renders CHECKED_IN status and fires onStartService', (tester) async {
      bool startFired = false;
      final checkedInBooking = baseBooking.copyWith(
        status: 'CHECKED_IN',
        checkedInAt: '2026-10-28T09:05:00Z',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminAppointmentCard(
              booking: checkedInBooking,
              onStartService: () => startFired = true,
            ),
          ),
        ),
      );

      expect(find.text('Đã tiếp đón'), findsOneWidget);
      expect(find.text('Bắt đầu dịch vụ'), findsOneWidget);

      await tester.tap(find.text('Bắt đầu dịch vụ'));
      await tester.pump();
      expect(startFired, isTrue);
    });

    testWidgets('renders IN_SERVICE status and fires onCheckOut', (tester) async {
      bool checkOutFired = false;
      final inServiceBooking = baseBooking.copyWith(
        status: 'IN_SERVICE',
        checkedInAt: '2026-10-28T09:05:00Z',
        serviceStartedAt: '2026-10-28T09:10:00Z',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminAppointmentCard(
              booking: inServiceBooking,
              onCheckOut: () => checkOutFired = true,
            ),
          ),
        ),
      );

      expect(find.text('Đang phục vụ'), findsOneWidget);
      expect(find.text('Hoàn thành Check-out'), findsOneWidget);

      await tester.tap(find.text('Hoàn thành Check-out'));
      await tester.pump();
      expect(checkOutFired, isTrue);
    });
  });
}

