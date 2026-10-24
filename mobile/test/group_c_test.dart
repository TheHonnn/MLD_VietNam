import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/booking/data/models/booking_models.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/c06_booking_confirmation_screen.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/c07_payment_qr_screen.dart';
import 'package:medical_healthcare_app/features/booking/presentation/widgets/group_c_widgets.dart';

void main() {
  testWidgets('BookingSummaryCardWidget has no Divider and renders 3 rows for service', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final flowState = BookingFlowState();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: BookingSummaryCardWidget(
              flowState: flowState,
              isEditable: true,
              onEditService: () {},
              onEditBranch: () {},
              onEditDateTime: () {},
              onEditSpecialist: () {},
              onEditCustomer: () {},
            ),
          ),
        ),
      ),
    );

    // Verify no Divider inside BookingSummaryCardWidget
    expect(find.descendant(of: find.byType(BookingSummaryCardWidget), matching: find.byType(Divider)), findsNothing);

    // Verify Row 1: Tên dịch vụ
    expect(find.text('Massage thư giãn toàn thân'), findsOneWidget);

    // Verify Row 2: Thời lượng chăm sóc
    expect(find.text('Thời lượng chăm sóc'), findsOneWidget);

    // Verify Row 3: Sửa dịch vụ
    expect(find.text('Sửa dịch vụ'), findsOneWidget);
    expect(find.text('Sửa chi nhánh'), findsOneWidget);
    expect(find.text('Sửa ngày và giờ'), findsOneWidget);
    expect(find.text('Sửa thông tin khách hàng'), findsOneWidget);
  });

  testWidgets('C06BookingConfirmationScreen renders properly without crashing', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final flowState = BookingFlowState();
    await tester.pumpWidget(
      MaterialApp(
        home: C06BookingConfirmationScreen(flowState: flowState),
      ),
    );

    expect(find.text('Xác nhận đặt lịch'), findsWidgets);
  });

  testWidgets('C07PaymentQrScreen renders properly with cardBorder and without crashing', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final flowState = BookingFlowState();
    await tester.pumpWidget(
      MaterialApp(
        home: C07PaymentQrScreen(flowState: flowState),
      ),
    );

    expect(find.text('Thanh toán'), findsOneWidget);
    expect(find.text('Chờ thanh toán'), findsOneWidget);
    expect(find.text('Chuyển khoản ngân hàng / QR'), findsOneWidget);
    expect(find.text('Thanh toán và hoàn tất'), findsOneWidget);
  });
}

