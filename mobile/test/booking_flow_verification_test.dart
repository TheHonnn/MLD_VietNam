import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:medical_healthcare_app/features/booking/data/models/booking_models.dart';
import 'package:medical_healthcare_app/features/booking/data/repositories/booking_repository.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/c09_my_appointments_screen.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';

Widget _buildWrapper(Widget child) {
  return MaterialApp(
    locale: const Locale('vi'),
    supportedLocales: const [Locale('vi'), Locale('en')],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: child,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Booking Requirements Verification', () {
    testWidgets('1. AllInOneBookingScreen has slots 08:00-22:00, no 60p/ca or break, no session UI', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildWrapper(const AllInOneBookingScreen()));
      await tester.pumpAndSettle();

      // Check time slot header: No "60 phút/ca" or "15 phút nghỉ"
      expect(find.textContaining('60 phút/ca'), findsNothing);
      expect(find.textContaining('15 phút nghỉ'), findsNothing);

      // Scroll down to time slots section
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -350));
      await tester.pumpAndSettle();

      expect(find.textContaining('Khung giờ trị liệu:'), findsOneWidget);

      // Check that time slots include 08:00 - 09:00 and 21:00 - 22:00
      expect(find.text('08:00 - 09:00'), findsWidgets);
      expect(find.text('21:00 - 22:00'), findsOneWidget);

      // Check that "Buổi điều trị" counter and chips are NOT present
      expect(find.text('Buổi điều trị'), findsNothing);
      expect(find.text('Số buổi theo liệu trình'), findsNothing);
      expect(find.text('1 buổi'), findsNothing);
      expect(find.text('2 buổi'), findsNothing);
      expect(find.text('5 buổi'), findsNothing);
    });

    test('2. Booking creation records in BookingRepository and appears in Upcoming Appointments', () async {
      final repo = BookingRepository.instance;
      final testCode = 'MLD-TEST-${DateTime.now().millisecondsSinceEpoch}';

      final testAppointment = AppointmentItemModel(
        id: testCode,
        bookingCode: testCode,
        serviceName: 'Lưu phù bạch huyết Vodder',
        serviceImage: 'assets/images/logo.webp',
        durationMinutes: 60,
        branchName: 'Cơ sở Hà Nội',
        branchAddress: '52 Nguyễn Chí Thanh, Đống Đa, Hà Nội',
        branchPhone: '0987186399',
        specialistName: 'Chuyên viên Vodder',
        specialistTitle: 'Kỹ thuật viên hệ thống',
        specialistAvatar: 'assets/images/logo.webp',
        appointmentDate: DateTime.now().add(const Duration(days: 1)),
        timeSlot: '08:00 - 09:00',
        customerName: 'Nguyễn Văn Test',
        customerPhone: '0987123456',
        customerEmail: 'test@mldvietnam.vn',
        customerAddress: '52 Nguyễn Chí Thanh, Hà Nội',
        specialNotes: 'Đặt lịch test cho bản thân',
        totalAmount: 700000,
        depositAmount: 0,
        remainingAmount: 700000,
        paymentMethod: 'CASH_AT_SPA',
        status: AppointmentStatus.pending,
        createdAt: DateTime.now(),
        timeline: [
          BookingTimelineEvent(
            title: 'Đăng ký đặt lịch thành công',
            description: 'Hệ thống đã tiếp nhận yêu cầu đặt lịch (1 người). Chờ chuyên gia liên hệ xác nhận trong ít phút.',
            timestamp: DateTime.now(),
            isCompleted: true,
            isCurrent: true,
          ),
        ],
      );

      // Create appointment
      await repo.createAppointment(testAppointment);

      // Verify it is in upcoming appointments
      final upcoming = repo.getUpcomingAppointments();
      final found = upcoming.any((a) => a.bookingCode == testCode);
      expect(found, isTrue);

      final retrieved = repo.getAppointmentById(testCode);
      expect(retrieved, isNotNull);
      expect(retrieved!.customerName, equals('Nguyễn Văn Test'));
      expect(retrieved.customerPhone, equals('0987123456'));
      expect(retrieved.status, equals(AppointmentStatus.pending));
    });

    testWidgets('3. C09MyAppointmentsScreen renders newly created booking in Lịch hẹn sắp tới', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildWrapper(const C09MyAppointmentsScreen()));
      await tester.pumpAndSettle();

      // Should display Upcoming appointments tab and the booking
      expect(find.byType(C09MyAppointmentsScreen), findsOneWidget);
      expect(find.textContaining('Lưu phù bạch huyết Vodder'), findsWidgets);
    });

    test('4. Admin model parses booking correctly for Admin Reception/Frontdesk', () {
      final json = {
        'id': 'bk_admin_001',
        'booking_code': 'MLD-BK-ADMIN-01',
        'booking_date': '2026-10-31',
        'start_time': '08:00',
        'end_time': '09:00',
        'booked_for_name': 'Nguyễn Văn Test',
        'booked_for_phone': '0987123456',
        'special_notes': 'Email: test@mldvietnam.vn | Địa chỉ: Hà Nội',
        'base_total': 700000,
        'final_price': 700000,
        'status': 'PENDING',
        'payment_status': 'UNPAID',
        'branches': {'name': 'Cơ sở Hà Nội'},
        'technicians': {'full_name': 'Kỹ thuật viên MLD'},
        'branch_rooms': {'name': 'Phòng 101'},
      };

      final adminBooking = AdminBookingModel.fromJson(json);
      expect(adminBooking.bookingCode, equals('MLD-BK-ADMIN-01'));
      expect(adminBooking.customerName, equals('Nguyễn Văn Test'));
      expect(adminBooking.customerPhone, equals('0987123456'));
      expect(adminBooking.status, equals('PENDING'));
      expect(adminBooking.finalPrice, equals(700000.0));
      expect(adminBooking.branchName, equals('Cơ sở Hà Nội'));
    });
  });
}
