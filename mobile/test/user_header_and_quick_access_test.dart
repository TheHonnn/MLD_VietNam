import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/booking/data/models/booking_models.dart';
import 'package:medical_healthcare_app/features/booking/data/repositories/booking_repository.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/c09_my_appointments_screen.dart';
import 'package:medical_healthcare_app/features/home/presentation/screens/b01_home_screen.dart';

void main() {
  testWidgets('Verify User Requests: Header avatar, Quick Access Profile, TikTok channel, and Real-time Branch status', (tester) async {
    tester.view.physicalSize = const Size(390, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    bool profileNavigated = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: B01HomeScreen(
            onNavigateToProfile: () {
              profileNavigated = true;
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify Top Header has notification and profile avatar to the right
    expect(find.byIcon(Icons.notifications_none_rounded), findsOneWidget);
    expect(find.byIcon(Icons.person_rounded), findsWidgets);

    // Tap top header avatar -> should trigger profile navigation
    await tester.tap(find.byIcon(Icons.person_rounded).first);
    await tester.pump();
    expect(profileNavigated, isTrue);

    // 2. Verify Quick Access has 'Cá nhân'
    expect(find.text('Bạn muốn tìm gì?'), findsOneWidget);
    expect(find.text('Dịch vụ'), findsWidgets);
    expect(find.text('Tài liệu'), findsWidgets);
    expect(find.text('Đào tạo'), findsWidgets);
    expect(find.text('Cá nhân'), findsWidgets);

    profileNavigated = false;
    await tester.tap(find.text('Cá nhân').first);
    await tester.pump();
    expect(profileNavigated, isTrue);

    // 3. Verify TikTok channel in direct messaging
    expect(find.text('TikTok'), findsWidgets);
    expect(find.text('Xem video'), findsWidgets);
    expect(find.byIcon(Icons.music_note_rounded), findsWidgets);

    // 4. Verify "GẦN BẠN HƠN" was removed, while "Hệ thống cơ sở" remains
    expect(find.text('GẦN BẠN HƠN'), findsNothing);
    expect(find.text('Hệ thống cơ sở'), findsOneWidget);

    // Verify Real-time status shows either 'Đang mở cửa' or 'Đã đóng cửa'
    final hasStatusBadge = find.text('Đang mở cửa').evaluate().isNotEmpty ||
        find.text('Đã đóng cửa').evaluate().isNotEmpty;
    expect(hasStatusBadge, isTrue);
  });

  testWidgets('Verify Appointment Cancellation is enabled for Pending Confirmation status', (tester) async {
    tester.view.physicalSize = const Size(390, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    // Create a pending appointment in repository
    final testApp = AppointmentItemModel(
      id: 'test-cancel-pending',
      bookingCode: 'MLD-TEST-PENDING',
      serviceName: 'Massage Thông Khí Trị Liệu',
      serviceImage: 'assets/images/service_1.png',
      branchName: 'Cơ sở Hà Nội',
      branchAddress: '52 Nguyễn Chí Thanh, Hà Nội',
      specialistName: 'KTV Hoa',
      specialistAvatar: 'assets/images/specialist_avatar_1.png',
      customerName: 'Khách hàng Test',
      customerPhone: '0901234567',
      appointmentDate: DateTime.now().add(const Duration(days: 1)),
      createdAt: DateTime.now(),
      timeSlot: '10:00 - 11:00',
      totalAmount: 700000,
      depositAmount: 0,
      remainingAmount: 700000,
      status: AppointmentStatus.pending,
      paymentStatus: 'UNPAID',
    );

    await BookingRepository.instance.createAppointment(testApp);

    await tester.pumpWidget(
      const MaterialApp(
        locale: Locale('vi'),
        home: C09MyAppointmentsScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Cancel button exists for pending appointment (supports both vi/en test runner locales)
    final hasCancelBtn = find.text('Hủy lịch').evaluate().isNotEmpty ||
        find.text('Cancel').evaluate().isNotEmpty;
    expect(hasCancelBtn, isTrue);

    final cancelFinder = find.text('Hủy lịch').evaluate().isNotEmpty
        ? find.text('Hủy lịch')
        : find.text('Cancel');

    // Tap Cancel -> should open dialog
    await tester.tap(cancelFinder.first);
    await tester.pumpAndSettle();

    // Dialog should ask for reason, not block with "Không thể Hủy" / "Cannot Cancel"
    expect(find.text('Không thể Hủy'), findsNothing);
    expect(find.text('Cannot Cancel'), findsNothing);
  });
}
