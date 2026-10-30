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

    // 1. Initial State: 1 người -> 700.000đ (Không có số buổi điều trị)
    expect(find.text('700.000đ / người'), findsWidgets);
    expect(find.text('Số lượng người'), findsOneWidget);
    expect(find.text('Buổi điều trị'), findsNothing);
    expect(find.text('1 người'), findsWidgets);
    expect(find.text('700.000đ'), findsWidgets);

    // 2. Tăng số lượng người lên 2: 2 người -> 1.400.000đ
    final addButtons = find.byIcon(Icons.add);
    await tester.tap(addButtons.first);
    await tester.pumpAndSettle();

    expect(find.text('2 người'), findsWidgets);
    expect(find.text('1.400.000đ'), findsWidgets);

    // 3. Tăng tiếp số lượng người lên 3: 3 người -> 2.100.000đ
    await tester.tap(addButtons.first);
    await tester.pumpAndSettle();

    expect(find.text('3 người'), findsWidgets);
    expect(find.text('2.100.000đ'), findsWidgets);

    // 4. Giảm số người về 1
    final removeButtons = find.byIcon(Icons.remove);
    await tester.tap(removeButtons.first);
    await tester.pumpAndSettle();
    await tester.tap(removeButtons.first);
    await tester.pumpAndSettle();

    expect(find.text('1 người'), findsWidgets);
    expect(find.text('700.000đ'), findsWidgets);
  });
}
