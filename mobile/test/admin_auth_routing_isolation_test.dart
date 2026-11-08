import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:medical_healthcare_app/features/admin/presentation/screens/admin_main_layout_screen.dart';
import 'package:medical_healthcare_app/features/home/presentation/screens/main_layout_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await AuthService.instance.init();
    await AuthService.instance.logout();
  });

  group('Admin Auth & Isolation Architecture Verification', () {
    test('1. Default guest / regular customer role is not admin', () {
      expect(AuthService.instance.isAdmin, isFalse);
      expect(AuthService.instance.currentRole, isNull);
    });

    test('2. Customer login correctly sets user role and isAdmin remains false', () async {
      await AuthService.instance.saveSession(
        accessToken: 'fake_customer_token',
        userId: 'cust_123',
        phone: '0987654321',
        role: 'CUSTOMER',
      );

      expect(AuthService.instance.isLoggedIn, isTrue);
      expect(AuthService.instance.currentRole, equals('CUSTOMER'));
      expect(AuthService.instance.isAdmin, isFalse);
    });

    test('3. Admin login sets role and activates isAdmin', () async {
      await AuthService.instance.saveSession(
        accessToken: 'fake_admin_token',
        userId: 'admin_123',
        phone: '0901000001',
        role: 'ADMIN',
      );

      expect(AuthService.instance.isLoggedIn, isTrue);
      expect(AuthService.instance.currentRole, equals('ADMIN'));
      expect(AuthService.instance.isAdmin, isTrue);
    });

    test('4. Super Admin login activates isAdmin', () async {
      await AuthService.instance.saveSession(
        accessToken: 'fake_super_admin_token',
        userId: 'f0dc713a-56fc-4347-9fb3-240528726ba3',
        phone: '0901000001',
        role: 'SUPER_ADMIN',
      );

      expect(AuthService.instance.isLoggedIn, isTrue);
      expect(AuthService.instance.currentRole, equals('SUPER_ADMIN'));
      expect(AuthService.instance.isAdmin, isTrue);
    });

    test('5. Logout completely purges admin role and revokes isAdmin state', () async {
      await AuthService.instance.saveSession(
        accessToken: 'fake_admin_token',
        userId: 'admin_123',
        role: 'SUPER_ADMIN',
      );
      expect(AuthService.instance.isAdmin, isTrue);

      await AuthService.instance.logout();

      expect(AuthService.instance.isLoggedIn, isFalse);
      expect(AuthService.instance.currentRole, isNull);
      expect(AuthService.instance.isAdmin, isFalse);
    });

    testWidgets('6. AdminMainLayoutScreen renders isolated tabs and Logout button (NO switch to customer)', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: AdminMainLayoutScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Renders all 4 isolated admin modules
      expect(find.text('Tổng quan'), findsWidgets);
      expect(find.text('Tiếp đón Spa'), findsOneWidget);
      expect(find.text('Đào tạo'), findsOneWidget);
      expect(find.text('Dịch vụ & Khóa'), findsOneWidget);

      // Verifies Logout button is present and customer switch button is absent
      expect(find.text('Đăng xuất'), findsOneWidget);
      expect(find.text('App Khách'), findsNothing);
      expect(find.text('Chế độ Khách hàng'), findsNothing);
    });
  });
}

