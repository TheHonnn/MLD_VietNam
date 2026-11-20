import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:medical_healthcare_app/features/payments/data/models/payment_gateway_models.dart';
import 'package:medical_healthcare_app/features/payments/presentation/widgets/auto_payment_checkout_sheet.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

Widget _buildViTestApp(Widget home) {
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
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 4: Plug-and-Play Auto-Payment Gateway', () {
    test('PaymentGatewayConfigModel parses unconfigured and configured states safely', () {
      final unconfigured = PaymentGatewayConfigModel.fromJson({});
      expect(unconfigured.provider, 'UNCONFIGURED');
      expect(unconfigured.configured, isFalse);

      final configured = PaymentGatewayConfigModel.fromJson({
        'provider': 'SEPAY',
        'configured': true,
        'supportedModes': ['VIETQR', 'BANK_TRANSFER'],
        'bankBin': '970422',
        'bankAccountNo': '0123456789',
        'bankAccountName': 'MLD VIETNAM',
      });
      expect(configured.provider, 'SEPAY');
      expect(configured.configured, isTrue);
      expect(configured.bankAccountNo, '0123456789');
      expect(configured.supportedModes, contains('VIETQR'));
    });

    test('PaymentGatewayIntentModel and StatusModel parse fields safely', () {
      final intent = PaymentGatewayIntentModel.fromJson({
        'orderCode': 778899,
        'provider': 'CUSTOM',
        'gatewayConfigured': true,
        'targetType': 'BOOKING',
        'referenceCode': 'BK-778899',
        'amount': 850000,
        'description': 'MLD BK778899',
        'qrCode': '000201010212',
        'checkoutUrl': 'https://gateway.example/pay/778899',
        'status': 'PENDING',
        'isPaid': false,
      });

      expect(intent.orderCode, 778899);
      expect(intent.gatewayConfigured, isTrue);
      expect(intent.amount, 850000);
      expect(intent.qrCode, '000201010212');
      expect(intent.checkoutUrl, 'https://gateway.example/pay/778899');

      final status = PaymentGatewayStatusModel.fromJson({
        'orderCode': 778899,
        'provider': 'CUSTOM',
        'configured': true,
        'status': 'PAID',
        'amountPaid': 850000,
      });
      expect(status.isPaid, isTrue);
      expect(status.amountPaid, 850000);
    });

    testWidgets('AutoPaymentCheckoutSheet renders awaiting-config banner cleanly when credentials are blank', (tester) async {
      const pendingConfigIntent = PaymentGatewayIntentModel(
        orderCode: 112233,
        provider: 'UNCONFIGURED',
        gatewayConfigured: false,
        referenceCode: 'BK-112233',
        amount: 650000,
        description: 'MLD BK112233',
        status: 'PENDING',
        isPaid: false,
        message: 'Cổng thanh toán trung gian đang chờ cấu hình.',
      );

      await tester.pumpWidget(
        _buildViTestApp(
          const Scaffold(
            body: AutoPaymentCheckoutSheet(
              amount: 650000,
              description: 'MLD BK112233',
              referenceCode: 'BK-112233',
              initialIntent: pendingConfigIntent,
            ),
          ),
        ),
      );

      expect(find.text('BK-112233'), findsOneWidget);
      expect(find.text('Chờ cấu hình cổng'), findsOneWidget);
      expect(find.text('Cổng thanh toán trung gian đang chờ cấu hình'), findsOneWidget);
      expect(find.text('Kiểm tra trạng thái thanh toán'), findsOneWidget);
    });

    testWidgets('AutoPaymentCheckoutSheet renders QR & checkout link when gateway is configured', (tester) async {
      const activeIntent = PaymentGatewayIntentModel(
        orderCode: 445566,
        provider: 'PAYOS',
        gatewayConfigured: true,
        referenceCode: 'BK-445566',
        amount: 950000,
        description: 'MLD BK445566',
        accountNumber: '0394316963',
        accountName: 'MLD VIETNAM',
        qrCode: '00020101021238570010A0000007270127000697042201130394316963',
        checkoutUrl: 'https://pay.payos.vn/web/445566',
        status: 'PENDING',
        isPaid: false,
      );

      await tester.pumpWidget(
        _buildViTestApp(
          const Scaffold(
            body: AutoPaymentCheckoutSheet(
              amount: 950000,
              description: 'MLD BK445566',
              referenceCode: 'BK-445566',
              initialIntent: activeIntent,
            ),
          ),
        ),
      );

      expect(find.text('PAYOS'), findsOneWidget);
      expect(find.text('Mở cổng thanh toán'), findsOneWidget);
      expect(find.text('Kiểm tra trạng thái thanh toán'), findsOneWidget);
    });

    testWidgets('AllInOneBookingScreen allows switching to online automatic payment method', (tester) async {
      tester.view.physicalSize = const Size(400, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        _buildViTestApp(const AllInOneBookingScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Thanh toán tại cơ sở'), findsOneWidget);
      expect(find.text('Thanh toán online tự động'), findsOneWidget);

      await tester.ensureVisible(find.text('Thanh toán online tự động'));
      await tester.tap(find.text('Thanh toán online tự động'));
      await tester.pump();
      expect(find.byIcon(Icons.radio_button_checked_rounded), findsOneWidget);
    });
  });
}
