import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:medical_healthcare_app/features/auth/widgets/update_phone_modal.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await AuthService.instance.init();
    await AuthService.instance.logout();
  });

  test('AuthService hasPhoneNumber is false when empty and true when updated', () async {
    expect(AuthService.instance.hasPhoneNumber, isFalse);

    await AuthService.instance.updatePhone('0912345678');
    expect(AuthService.instance.hasPhoneNumber, isTrue);
    expect(AuthService.instance.currentPhone, equals('0912345678'));
    expect(AuthService.instance.phoneNotifier.value, equals('0912345678'));
  });

  testWidgets('UpdatePhoneModal renders and validates phone input', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: UpdatePhoneModal(),
        ),
      ),
    );

    // Verify Title & Button
    expect(find.text('Cập nhật số điện thoại'), findsOneWidget);
    expect(find.text('Lưu số điện thoại'), findsOneWidget);
    expect(find.byType(TextFormField), findsOneWidget);

    // Tap Save with empty field -> Expect validation error
    await tester.tap(find.text('Lưu số điện thoại'));
    await tester.pump();
    expect(find.text('Vui lòng nhập số điện thoại'), findsOneWidget);

    // Enter invalid phone
    await tester.enterText(find.byType(TextFormField), '12345');
    await tester.tap(find.text('Lưu số điện thoại'));
    await tester.pump();
    expect(find.textContaining('không hợp lệ'), findsOneWidget);
  });
}

