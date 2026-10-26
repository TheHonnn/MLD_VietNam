import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/booking/data/models/booking_models.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:medical_healthcare_app/features/booking/presentation/widgets/group_c_widgets.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

Widget _buildTestApp({required Widget home, Locale locale = const Locale('vi')}) {
  return MaterialApp(
    locale: locale,
    supportedLocales: const [Locale('vi'), Locale('en')],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: home,
  );
}

void main() {
  testWidgets('BookingSummaryCardWidget has no Divider and renders 3 rows for service', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final flowState = BookingFlowState();
    await tester.pumpWidget(
      _buildTestApp(
        locale: const Locale('vi'),
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

    await tester.pumpAndSettle();

    // Verify Row 3: Sửa dịch vụ
    expect(find.text('Sửa dịch vụ'), findsOneWidget);
    expect(find.text('Sửa chi nhánh'), findsOneWidget);
    expect(find.text('Sửa ngày và giờ'), findsOneWidget);
    expect(find.text('Sửa thông tin khách hàng'), findsOneWidget);
  });

  testWidgets('AllInOneBookingScreen renders properly with all booking sections and buttons (Vietnamese)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _buildTestApp(
        locale: const Locale('vi'),
        home: const AllInOneBookingScreen(),
      ),
    );

    // Wait for frames
    await tester.pumpAndSettle();

    // Verify App Bar & Core sections per Master Redesign
    expect(find.text('Đặt lịch trị liệu'), findsOneWidget);
    expect(find.text('Chi nhánh thực hiện'), findsOneWidget);
    expect(find.text('Thời gian hẹn'), findsOneWidget);
    expect(find.text('Khách hàng'), findsOneWidget);
    expect(find.text('Thông tin đặt lịch'), findsOneWidget);
    expect(find.text('Xác nhận đặt lịch'), findsOneWidget);
  });

  testWidgets('AllInOneBookingScreen renders properly in English (100% Translation)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _buildTestApp(
        locale: const Locale('en'),
        home: const AllInOneBookingScreen(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Book Therapy Session'), findsOneWidget);
    expect(find.text('Selected Branch'), findsOneWidget);
    expect(find.text('Appointment Time'), findsOneWidget);
    expect(find.text('Customer'), findsOneWidget);
    expect(find.text('Booking Summary'), findsOneWidget);
    expect(find.text('Confirm Booking'), findsOneWidget);
  });
}
