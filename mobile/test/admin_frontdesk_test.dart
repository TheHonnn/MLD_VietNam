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

    testWidgets('renders Step 4 single-service button and fires onFinishService', (tester) async {
      bool finishFired = false;
      final inServiceBooking = baseBooking.copyWith(
        status: 'IN_SERVICE',
        sessionStatus: 'NOT_STARTED',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminAppointmentCard(
              booking: inServiceBooking,
              onFinishService: () => finishFired = true,
              onCheckOut: () {},
            ),
          ),
        ),
      );

      expect(find.text('Đang phục vụ'), findsOneWidget);
      expect(find.text('Hoàn tất chuyên môn'), findsOneWidget);

      await tester.tap(find.text('Hoàn tất chuyên môn'));
      await tester.pump();
      expect(finishFired, isTrue);
    });

    testWidgets('renders Step 4 package button when notes contain user_package_id', (tester) async {
      bool finishFired = false;
      final pkgBooking = AdminBookingModel.fromJson({
        'id': 'bk_pkg_01',
        'booking_code': 'BK-PKG-01',
        'booking_date': '2026-10-28',
        'start_time': '10:00',
        'end_time': '11:00',
        'customer_name': 'Lê Thị Hoa',
        'customer_phone': '0988776655',
        'service_name': 'Gói MLD Toàn Thân',
        'final_price': 0,
        'status': 'IN_SERVICE',
        'payment_status': 'PAID',
        'session_status': 'NOT_STARTED',
        'payment_method': 'MEMBERSHIP_WALLET',
        'notes': '[Gói liệu trình] user_package_id=11111111-2222-3333-4444-555555555555',
      });

      expect(pkgBooking.userPackageId, '11111111-2222-3333-4444-555555555555');
      expect(pkgBooking.isPackageSession, isTrue);
      expect(pkgBooking.isClinicalCompleted, isFalse);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminAppointmentCard(
              booking: pkgBooking,
              onFinishService: () => finishFired = true,
              onCheckOut: () {},
            ),
          ),
        ),
      );

      expect(find.text('Xác nhận Buổi 1/?'), findsOneWidget);

      await tester.tap(find.text('Xác nhận Buổi 1/?'));
      await tester.pump();
      expect(finishFired, isTrue);
    });

    testWidgets('renders Step 5 Chờ thu tiền when clinical completed but UNPAID', (tester) async {
      bool checkOutFired = false;
      final awaitingPayBooking = baseBooking.copyWith(
        status: 'IN_SERVICE',
        sessionStatus: 'COMPLETED',
        paymentStatus: 'UNPAID',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminAppointmentCard(
              booking: awaitingPayBooking,
              onFinishService: () {},
              onCheckOut: () => checkOutFired = true,
            ),
          ),
        ),
      );

      expect(find.text('Chờ thu tiền'), findsNWidgets(2));

      await tester.tap(find.text('Chờ thu tiền').last);
      await tester.pump();
      expect(checkOutFired, isTrue);
    });

    testWidgets('renders Step 5 Chờ đóng ca & Hoàn thành Check-out when clinical completed and PAID', (tester) async {
      bool checkOutFired = false;
      final readyCloseBooking = baseBooking.copyWith(
        status: 'IN_SERVICE',
        sessionStatus: 'COMPLETED',
        paymentStatus: 'PAID',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminAppointmentCard(
              booking: readyCloseBooking,
              onFinishService: () {},
              onCheckOut: () => checkOutFired = true,
            ),
          ),
        ),
      );

      expect(find.text('Chờ đóng ca'), findsOneWidget);
      expect(find.text('Hoàn thành Check-out'), findsOneWidget);

      await tester.tap(find.text('Hoàn thành Check-out'));
      await tester.pump();
      expect(checkOutFired, isTrue);
    });
  });
}

