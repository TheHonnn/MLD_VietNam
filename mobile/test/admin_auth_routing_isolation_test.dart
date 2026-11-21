import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await AuthService.instance.init();
    await AuthService.instance.logout();
  });

  group('Admin & Staff Auth & Isolation Architecture Verification', () {
    test('1. Default guest / regular customer role is not admin or staff', () {
      expect(AuthService.instance.isAdmin, isFalse);
      expect(AuthService.instance.isReceptionist, isFalse);
      expect(AuthService.instance.isStaff, isFalse);
      expect(AuthService.instance.currentRole, isNull);
    });

    test('2. Customer login correctly sets user role and staff remains false', () async {
      await AuthService.instance.saveSession(
        accessToken: 'fake_customer_token',
        userId: 'cust_123',
        phone: '0987654321',
        role: 'CUSTOMER',
      );

      expect(AuthService.instance.isLoggedIn, isTrue);
      expect(AuthService.instance.currentRole, equals('CUSTOMER'));
      expect(AuthService.instance.isAdmin, isFalse);
      expect(AuthService.instance.isReceptionist, isFalse);
      expect(AuthService.instance.isStaff, isFalse);
    });

    test('3. Receptionist login sets role and activates isStaff while isAdmin remains false', () async {
      await AuthService.instance.saveSession(
        accessToken: 'fake_receptionist_token',
        userId: 'rec_123',
        phone: '0901000002',
        role: 'RECEPTIONIST',
      );

      expect(AuthService.instance.isLoggedIn, isTrue);
      expect(AuthService.instance.currentRole, equals('RECEPTIONIST'));
      expect(AuthService.instance.isAdmin, isFalse);
      expect(AuthService.instance.isReceptionist, isTrue);
      expect(AuthService.instance.isStaff, isTrue);
    });

    test('4. Admin login sets role and activates isAdmin and isStaff', () async {
      await AuthService.instance.saveSession(
        accessToken: 'fake_admin_token',
        userId: 'admin_123',
        phone: '0901000001',
        role: 'ADMIN',
      );

      expect(AuthService.instance.isLoggedIn, isTrue);
      expect(AuthService.instance.currentRole, equals('ADMIN'));
      expect(AuthService.instance.isAdmin, isTrue);
      expect(AuthService.instance.isStaff, isTrue);
    });

    test('5. Super Admin login activates isAdmin and isStaff', () async {
      await AuthService.instance.saveSession(
        accessToken: 'fake_super_admin_token',
        userId: 'f0dc713a-56fc-4347-9fb3-240528726ba3',
        phone: '0901000001',
        role: 'SUPER_ADMIN',
      );

      expect(AuthService.instance.isLoggedIn, isTrue);
      expect(AuthService.instance.currentRole, equals('SUPER_ADMIN'));
      expect(AuthService.instance.isAdmin, isTrue);
      expect(AuthService.instance.isStaff, isTrue);
    });

    test('6. Logout completely purges role and revokes isAdmin and isStaff', () async {
      await AuthService.instance.saveSession(
        accessToken: 'fake_admin_token',
        userId: 'admin_123',
        role: 'SUPER_ADMIN',
      );
      expect(AuthService.instance.isAdmin, isTrue);
      expect(AuthService.instance.isStaff, isTrue);

      await AuthService.instance.logout();

      expect(AuthService.instance.isLoggedIn, isFalse);
      expect(AuthService.instance.currentRole, isNull);
      expect(AuthService.instance.isAdmin, isFalse);
      expect(AuthService.instance.isStaff, isFalse);
    });

    test('7. Switching user without role clears stale RECEPTIONIST role and extracts role from JWT', () async {
      await AuthService.instance.saveSession(
        accessToken: 'fake_receptionist_token',
        userId: 'rec_123',
        role: 'RECEPTIONIST',
      );
      expect(AuthService.instance.isAdmin, isFalse);
      expect(AuthService.instance.isReceptionist, isTrue);

      final header = base64Url.encode(utf8.encode(jsonEncode({'alg': 'HS256', 'typ': 'JWT'}))).replaceAll('=', '');
      final payload = base64Url.encode(utf8.encode(jsonEncode({'sub': 'adm_999', 'role': 'SUPER_ADMIN'}))).replaceAll('=', '');
      final adminJwt = '$header.$payload.sig';

      await AuthService.instance.saveSession(
        accessToken: adminJwt,
        userId: 'adm_999',
      );

      expect(AuthService.instance.currentRole, equals('SUPER_ADMIN'));
      expect(AuthService.instance.isAdmin, isTrue);
      expect(AuthService.instance.isReceptionist, isFalse);
      expect(AuthService.instance.isStaff, isTrue);
    });

    test('8. Permissions granted via updateProfile unlock hasPermission and isStaff cleanly', () async {
      await AuthService.instance.saveSession(
        accessToken: 'fake_token',
        userId: 'staff_01',
        role: 'STAFF',
      );
      expect(AuthService.instance.isAdmin, isFalse);
      expect(AuthService.instance.hasPermission('course_enrollments.update'), isFalse);

      await AuthService.instance.updateProfile(
        role: 'BRANCH_MANAGER',
        permissions: ['course_enrollments.update', 'services.read'],
      );
      expect(AuthService.instance.hasPermission('course_enrollments.update'), isTrue);
      expect(AuthService.instance.isStaff, isTrue);
    });
  });
}
