import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f01_profile_dashboard_screen.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f08_settings_screen.dart';
import 'package:medical_healthcare_app/features/membership/presentation/widgets/change_password_modal.dart';
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
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    AuthService.instance.isLoggedInNotifier.value = true;
  });

  testWidgets('F01ProfileDashboardScreen does not have Personal Info under Account section', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildTestApp(home: const F01ProfileDashboardScreen()));
    await tester.pumpAndSettle();

    expect(find.text('TÀI KHOẢN & HỆ THỐNG'), findsOneWidget);
    expect(find.text('Cài đặt tài khoản'), findsOneWidget);
    // Personal Info is removed from this group
    expect(find.text('Personal Information'), findsNothing);
  });

  testWidgets('F08SettingsScreen renders Security & Account with Change Password', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildTestApp(home: const F08SettingsScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Bảo mật & Tài khoản'), findsOneWidget);
    expect(find.text('Thông tin cá nhân'), findsOneWidget);
    expect(find.text('Đổi mật khẩu'), findsOneWidget);
    expect(find.text('Số điện thoại liên kết'), findsOneWidget);
  });

  testWidgets('ChangePasswordModal validates inputs and checks matching passwords', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _buildTestApp(
        home: const Scaffold(
          body: ChangePasswordModal(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Đổi mật khẩu'), findsWidgets);
    expect(find.text('Mật khẩu hiện tại *'), findsOneWidget);
    expect(find.text('Mật khẩu mới *'), findsOneWidget);
    expect(find.text('Xác nhận mật khẩu mới *'), findsOneWidget);

    // Tap submit with empty fields -> should validate
    final submitFinder = find.widgetWithText(ElevatedButton, 'Đổi mật khẩu');
    await tester.tap(submitFinder);
    await tester.pumpAndSettle();

    expect(find.text('Vui lòng nhập mật khẩu hiện tại'), findsOneWidget);

    // Enter current password
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'oldpassword123');
    await tester.tap(submitFinder);
    await tester.pumpAndSettle();

    expect(find.text('Vui lòng nhập mật khẩu mới'), findsOneWidget);

    // Enter short new password (< 6 chars)
    await tester.enterText(fields.at(1), '12345');
    await tester.tap(submitFinder);
    await tester.pumpAndSettle();

    expect(find.text('Mật khẩu mới phải có ít nhất 6 ký tự'), findsOneWidget);

    // Enter identical new password
    await tester.enterText(fields.at(1), 'oldpassword123');
    await tester.tap(submitFinder);
    await tester.pumpAndSettle();

    expect(find.text('Mật khẩu mới không được trùng mật khẩu hiện tại'), findsOneWidget);

    // Enter valid new password and non-matching confirm
    await tester.enterText(fields.at(1), 'newsecret678');
    await tester.enterText(fields.at(2), 'mismatch678');
    await tester.tap(submitFinder);
    await tester.pumpAndSettle();

    expect(find.text('Mật khẩu xác nhận không khớp'), findsOneWidget);

    // Enter matching confirm
    await tester.enterText(fields.at(2), 'newsecret678');
    await tester.pumpAndSettle();
    expect(find.text('Mật khẩu xác nhận không khớp'), findsNothing);
  });
}

