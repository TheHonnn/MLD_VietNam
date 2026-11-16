import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:medical_healthcare_app/features/auth/presentation/screens/a03_login_screen.dart';
import 'package:medical_healthcare_app/features/auth/presentation/screens/a04_otp_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await AuthService.instance.init();
    await AuthService.instance.logout();
  });

  testWidgets('A03LoginScreen initialTabIndex 1 renders Zalo OTP login option', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: A03LoginScreen(initialTabIndex: 1),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Gửi mã xác nhận qua Zalo'), findsOneWidget);
    expect(find.textContaining('Zalo OA MLD Việt Nam'), findsOneWidget);
    expect(find.text('hoặc đăng nhập bằng mật khẩu'), findsOneWidget);
  });

  testWidgets('A04OtpScreen with LOGIN_PHONE_ZALO purpose displays Zalo branding and actions', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: A04OtpScreen(
            phoneNumber: '0987654321',
            purpose: 'LOGIN_PHONE_ZALO',
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Xác thực qua Zalo'), findsOneWidget);
    expect(find.textContaining('Zalo OA MLD Việt Nam'), findsOneWidget);
    expect(find.text('Mở ứng dụng Zalo để xem mã'), findsOneWidget);
    expect(find.text('Xác nhận'), findsOneWidget);
  });
}
