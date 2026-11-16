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

  testWidgets('A03LoginScreen tab 0 renders Email OTP login option', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: A03LoginScreen(initialTabIndex: 0),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Gửi mã xác nhận qua Email'), findsOneWidget);
    expect(find.textContaining('hòm thư Gmail của bạn'), findsOneWidget);
    expect(find.text('hoặc đăng nhập bằng mật khẩu'), findsOneWidget);
  });

  testWidgets('A04OtpScreen with LOGIN_EMAIL purpose displays Gmail action and notes', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: A04OtpScreen(
            email: 'xuantruong.dev26@gmail.com',
            purpose: 'LOGIN_EMAIL',
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Xác thực địa chỉ Email'), findsOneWidget);
    expect(find.text('Mở Gmail để xem mã'), findsOneWidget);
    expect(find.text('Xác nhận'), findsOneWidget);
  });
}
