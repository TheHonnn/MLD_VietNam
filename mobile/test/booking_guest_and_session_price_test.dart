import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

Widget _buildTestApp({required Widget home}) {
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
  testWidgets('AllInOneBookingScreen calculates price based only on guestCount without session count or VAT', (tester) async {
    tester.view.physicalSize = const Size(400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildTestApp(home: const AllInOneBookingScreen()));
    await tester.pumpAndSettle();

    expect(find.text('900.000đ'), findsWidgets);

    final addButtons = find.byIcon(Icons.add);
    await tester.tap(addButtons.first);
    await tester.pumpAndSettle();

    expect(find.text('1.800.000đ'), findsWidgets);

    await tester.tap(addButtons.first);
    await tester.pumpAndSettle();

    expect(find.text('2.700.000đ'), findsWidgets);

    final removeButtons = find.byIcon(Icons.remove);
    await tester.tap(removeButtons.first);
    await tester.pumpAndSettle();
    await tester.tap(removeButtons.first);
    await tester.pumpAndSettle();

    expect(find.text('900.000đ'), findsWidgets);
  });
}
