import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/admin_appointment_card.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:medical_healthcare_app/features/home/data/models/home_models.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

Widget _buildViApp(Widget home) {
  return MaterialApp(
    locale: const Locale('vi'),
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
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('AllInOneBookingScreen distinguishes Treatment Package purchase from Single Service', (tester) async {
    tester.view.physicalSize = const Size(430, 1400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _buildViApp(
        const AllInOneBookingScreen(
          initialService: SpaServiceModel(
            id: '235166f2-66c9-4231-bbe1-af91b48fc67c',
            name: 'Chăm sóc khu trú 20 buổi',
            categoryName: 'Gói liệu trình',
            shortDescription: 'Liệu trình khu trú 20 buổi',
            durationMinutes: 45,
            price: 11000000,
            imageUrl: '',
          ),
          packageId: 'pkg-20-buoi-uuid',
          packageName: 'Chăm sóc khu trú 20 buổi',
          packageSessionsCount: 20,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('GÓI LIỆU TRÌNH · 20 BUỔI'), findsOneWidget);
    expect(find.textContaining('Buổi 1/20'), findsWidgets);
    expect(find.text('DỊCH VỤ LẺ'), findsNothing);
    expect(find.byIcon(Icons.add), findsNothing);
  });

  testWidgets('AdminAppointmentCard renders separate labels and session numbers for Package vs Single Service', (tester) async {
    const pkgBooking = AdminBookingModel(
      id: 'bk-pkg-1',
      bookingCode: 'MLD-DL-101',
      bookingDate: '2026-11-21',
      startTime: '09:00',
      endTime: '10:00',
      customerName: 'Nguyễn Thị A',
      customerPhone: '0901234567',
      serviceName: 'Chăm sóc khu trú',
      finalPrice: 11000000,
      status: 'IN_SERVICE',
      paymentStatus: 'UNPAID',
      sessionStatus: 'NOT_STARTED',
      packageName: 'Chăm sóc khu trú 20 buổi',
      totalSessions: 20,
      completedSessions: 0,
      notes: '[Gói liệu trình: Chăm sóc khu trú 20 buổi | Buổi 1/20] [user_package_id=11111111-1111-4111-8111-111111111111]',
    );

    const singleBooking = AdminBookingModel(
      id: 'bk-single-1',
      bookingCode: 'MLD-DL-102',
      bookingDate: '2026-11-21',
      startTime: '10:00',
      endTime: '11:00',
      customerName: 'Trần Văn B',
      customerPhone: '0907654321',
      serviceName: 'Chăm sóc mở rộng',
      finalPrice: 900000,
      status: 'IN_SERVICE',
      paymentStatus: 'UNPAID',
      sessionStatus: 'NOT_STARTED',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ListView(
            children: [
              AdminAppointmentCard(
                booking: pkgBooking,
                onFinishService: () {},
              ),
              AdminAppointmentCard(
                booking: singleBooking,
                onFinishService: () {},
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('GÓI LIỆU TRÌNH · BUỔI 1/20'), findsOneWidget);
    expect(find.text('Xác nhận Buổi 1/20'), findsOneWidget);
    expect(find.text('Đã xong 0/20 buổi'), findsOneWidget);
    expect(find.text('DỊCH VỤ LẺ'), findsOneWidget);
    expect(find.text('Hoàn tất chuyên môn'), findsOneWidget);
  });
}
