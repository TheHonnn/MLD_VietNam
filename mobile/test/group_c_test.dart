import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/booking/data/models/booking_models.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
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

  testWidgets('AllInOneBookingScreen renders properly with all booking sections and buttons', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const MaterialApp(
        home: AllInOneBookingScreen(),
      ),
    );

    // Wait for frames
    await tester.pumpAndSettle();

    // Verify App Bar & Core service header
    expect(find.text('Đặt lịch trị liệu'), findsOneWidget);
    expect(find.text('DỊCH VỤ TRỊ LIỆU CỐT LÕI'), findsOneWidget);
    expect(find.text('Chọn chi nhánh thực hiện'), findsOneWidget);
    expect(find.text('Thời gian & Số lượng khách'), findsOneWidget);
    expect(find.text('Thông tin khách hàng'), findsOneWidget);
    expect(find.text('Bảng tóm tắt đặt lịch'), findsOneWidget);
    expect(find.text('Xác nhận đặt lịch giữ chỗ'), findsOneWidget);
  });
}
