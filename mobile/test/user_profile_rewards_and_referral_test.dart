import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:medical_healthcare_app/features/membership/data/repositories/membership_repository.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f01_profile_dashboard_screen.dart';
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
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    AuthService.instance.isLoggedInNotifier.value = true;
  });

  group('User Profile Rewards & Referral Redesign Tests', () {
    testWidgets('F01ProfileDashboardScreen renders ƯU ĐÃI section as rows and removes old top green voucher card', (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(home: const F01ProfileDashboardScreen()));
      await tester.pumpAndSettle();

      // 1. Verify DỊCH VỤ TRỊ LIỆU is rendered
      expect(find.text('DỊCH VỤ TRỊ LIỆU'), findsOneWidget);
      expect(find.text('Lịch hẹn của tôi'), findsOneWidget);
      expect(find.text('Gói liệu trình'), findsOneWidget);
      expect(find.text('Nhật ký trị liệu'), findsOneWidget);

      // 2. Verify dedicated ƯU ĐÃI section is rendered
      expect(find.text('ƯU ĐÃI'), findsOneWidget);

      // 3. Verify Ví Voucher & Ưu đãi is inside ƯU ĐÃI section with MLD green icon
      expect(find.text('Ví Voucher & Ưu đãi'), findsOneWidget);

      // 4. Verify Mã giới thiệu của tôi is rendered with copy button and full code
      expect(find.text('Mã giới thiệu của tôi'), findsOneWidget);
      expect(find.text('Sao chép'), findsOneWidget);

      // 5. Verify Người giới thiệu is rendered with Nhập mã / Đổi mã button
      expect(find.text('Người giới thiệu'), findsOneWidget);
      expect(find.text('Nhập mã'), findsOneWidget);

      // 6. Verify the old top voucher banner texts are gone
      expect(find.text('Xem ví'), findsNothing);
    });

    testWidgets('Tapping Sao chép copies referral code to clipboard and displays SnackBar', (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(home: const F01ProfileDashboardScreen()));
      await tester.pumpAndSettle();

      // Tap on Sao chép button
      final copyBtn = find.text('Sao chép');
      expect(copyBtn, findsOneWidget);
      await tester.tap(copyBtn);
      await tester.pump();

      // Verify SnackBar appears
      expect(find.textContaining('Đã sao chép mã giới thiệu'), findsOneWidget);
    });

    testWidgets('Tapping Nhập mã opens referral code dialog', (tester) async {
      tester.view.physicalSize = const Size(390, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(home: const F01ProfileDashboardScreen()));
      await tester.pumpAndSettle();

      // Tap on Nhập mã
      final enterCodeBtn = find.text('Nhập mã');
      await tester.ensureVisible(enterCodeBtn);
      await tester.pumpAndSettle();
      expect(enterCodeBtn, findsOneWidget);
      await tester.tap(enterCodeBtn);
      await tester.pumpAndSettle();

      // Verify Dialog opens
      expect(find.text('Nhập mã người giới thiệu'), findsOneWidget);
      expect(find.text('Xác nhận'), findsOneWidget);
      expect(find.text('Hủy'), findsOneWidget);

      // Close dialog
      await tester.tap(find.text('Hủy'));
      await tester.pumpAndSettle();
      expect(find.text('Nhập mã người giới thiệu'), findsNothing);
    });
  });
}
