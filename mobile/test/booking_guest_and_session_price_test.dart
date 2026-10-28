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
  testWidgets('AllInOneBookingScreen calculates price based on guestCount and sessionCount without VAT', (tester) async {
    tester.view.physicalSize = const Size(400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildTestApp(home: const AllInOneBookingScreen()));
    await tester.pumpAndSettle();

    // 1. Initial State: 1 người, 1 buổi -> 700.000đ
    expect(find.text('700.000đ / buổi'), findsWidgets);
    expect(find.text('Số lượng người'), findsOneWidget);
    expect(find.text('Buổi điều trị'), findsOneWidget);
    expect(find.text('1 người x 1 buổi'), findsOneWidget);
    expect(find.text('700.000đ'), findsWidgets);

    // 2. Tăng số lượng người lên 2: 2 người x 1 buổi -> 1.400.000đ
    final addButtons = find.byIcon(Icons.add);
    // addButtons.at(0) is guest count +, addButtons.at(1) is session count +
    await tester.tap(addButtons.at(0));
    await tester.pumpAndSettle();

    expect(find.text('2 người x 1 buổi'), findsOneWidget);
    expect(find.text('1.400.000đ'), findsWidgets);

    // 3. Tăng tiếp số lượng người lên 3: 3 người x 1 buổi -> 2.100.000đ
    await tester.tap(addButtons.at(0));
    await tester.pumpAndSettle();

    expect(find.text('3 người x 1 buổi'), findsOneWidget);
    expect(find.text('2.100.000đ'), findsWidgets);

    // 4. Giảm số người về 1
    final removeButtons = find.byIcon(Icons.remove);
    await tester.tap(removeButtons.at(0));
    await tester.pumpAndSettle();
    await tester.tap(removeButtons.at(0));
    await tester.pumpAndSettle();

    expect(find.text('1 người x 1 buổi'), findsOneWidget);
    expect(find.text('700.000đ'), findsWidgets);

    // 5. Tăng số buổi điều trị lên 2: 1 người x 2 buổi -> 1.400.000đ
    await tester.tap(addButtons.at(1));
    await tester.pumpAndSettle();

    expect(find.text('1 người x 2 buổi'), findsOneWidget);
    expect(find.text('1.400.000đ'), findsWidgets);

    // 6. Tăng cả người lên 2: 2 người x 2 buổi -> 2.800.000đ
    await tester.tap(addButtons.at(0));
    await tester.pumpAndSettle();

    expect(find.text('2 người x 2 buổi'), findsOneWidget);
    expect(find.text('2.800.000đ'), findsWidgets);

    // 7. Chọn chip nhanh 3 buổi: 2 người x 3 buổi -> 4.200.000đ
    final chip3Finder = find.text('3 buổi');
    await tester.tap(chip3Finder);
    await tester.pumpAndSettle();

    expect(find.text('2 người x 3 buổi'), findsOneWidget);
    expect(find.text('4.200.000đ'), findsWidgets);
  });
}
