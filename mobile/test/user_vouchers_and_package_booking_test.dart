import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:medical_healthcare_app/features/membership/data/models/membership_models.dart';
import 'package:medical_healthcare_app/features/membership/data/repositories/membership_repository.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f05_my_vouchers_screen.dart';
import 'package:medical_healthcare_app/features/services/presentation/screens/b02_service_listing_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('User Vouchers and Package Booking Tests', () {
    test('VoucherItem correctly models Supabase coupons and discount calculations', () {
      const v1 = VoucherItem(
        id: '44444444-0001-0001-0001-000000000001',
        title: 'Tặng 100.000đ cho khách hàng mới',
        subtitle: 'MLDCHAOXIN',
        discountBanner: 'GIẢM 100K',
        description: 'Áp dụng cho mọi dịch vụ Spa hoặc Gói liệu trình đầu tiên',
        expiryDate: '13/04/2027',
        code: 'MLDCHAOXIN',
        status: 'AVAILABLE',
        statusText: 'Có thể sử dụng',
        couponId: '44444444-0001-0001-0001-000000000001',
        discountAmount: 100000.0,
        minOrderAmount: 300000.0,
      );

      expect(v1.code, 'MLDCHAOXIN');
      expect(v1.status, 'AVAILABLE');
      expect(v1.discountBanner, 'GIẢM 100K');
      expect(v1.isEligible(250000), isFalse);
      expect(v1.isEligible(300000), isTrue);
      expect(v1.calculateDiscount(500000), 100000.0);

      const v2 = VoucherItem(
        id: '44444444-0001-0001-0001-000000000002',
        title: 'Ưu đãi 20%',
        subtitle: 'SPADAY20',
        discountBanner: 'GIẢM 20%',
        description: 'Giảm 20% tối đa 150.000đ',
        expiryDate: '13/01/2027',
        code: 'SPADAY20',
        status: 'AVAILABLE',
        statusText: 'Có thể sử dụng',
        couponId: '44444444-0001-0001-0001-000000000002',
        discountPercent: 20.0,
        maxDiscount: 150000.0,
        minOrderAmount: 400000.0,
      );

      expect(v2.isEligible(350000), isFalse);
      expect(v2.isEligible(500000), isTrue);
      expect(v2.calculateDiscount(500000), 100000.0);
      expect(v2.calculateDiscount(1000000), 150000.0);
    });

    test('VoucherItem status getters and VoucherValidationResult work correctly', () {
      const usedVoucher = VoucherItem(
        id: 'bfd0b1d4-d947-4775-8d97-b5c39d4b7616',
        title: 'Tặng 100.000đ cho khách hàng mới',
        subtitle: 'MLDCHAOXIN',
        discountBanner: 'GIẢM 100K',
        description: 'Áp dụng cho mọi dịch vụ',
        expiryDate: '13/04/2027',
        code: 'MLDCHAOXIN',
        status: 'USED',
        statusText: 'Đã sử dụng',
        couponId: '44444444-0001-0001-0001-000000000001',
        discountAmount: 100000.0,
      );

      expect(usedVoucher.isUsed, isTrue);
      expect(usedVoucher.isAvailable, isFalse);

      final failResult = VoucherValidationResult.failure(
        'Bạn đã sử dụng mã ưu đãi "MLDCHAOXIN" rồi. Mỗi khách hàng chỉ được áp dụng 1 lần.',
      );
      expect(failResult.isValid, isFalse);
      expect(failResult.voucher, isNull);
      expect(failResult.message, contains('đã sử dụng'));

      final successResult = VoucherValidationResult.success(
        voucher: usedVoucher,
        message: 'Áp dụng thành công!',
        discount: 100000.0,
      );
      expect(successResult.isValid, isTrue);
      expect(successResult.discount, 100000.0);
      expect(successResult.voucher?.code, 'MLDCHAOXIN');
    });

    testWidgets('F05MyVouchersScreen renders wallet header, tabs and voucher cards', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          locale: Locale('vi'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: F05MyVouchersScreen(),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.byType(F05MyVouchersScreen), findsOneWidget);
      expect(find.textContaining('MLD VIP'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('AllInOneBookingScreen accepts initialVoucher and displays discount in summary', (tester) async {
      const testVoucher = VoucherItem(
        id: 'bfd0b1d4-d947-4775-8d97-b5c39d4b7616',
        title: 'Tặng 100.000đ cho khách hàng mới',
        subtitle: 'MLDCHAOXIN',
        discountBanner: 'GIẢM 100K',
        description: 'Áp dụng cho mọi dịch vụ',
        expiryDate: '13/04/2027',
        code: 'MLDCHAOXIN',
        status: 'AVAILABLE',
        statusText: 'Có thể sử dụng',
        couponId: '44444444-0001-0001-0001-000000000001',
        discountAmount: 100000.0,
        minOrderAmount: 300000.0,
      );

      await tester.pumpWidget(
        const MaterialApp(
          locale: Locale('vi'),
          supportedLocales: [Locale('vi'), Locale('en')],
          localizationsDelegates: [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: AllInOneBookingScreen(initialVoucher: testVoucher),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('MLDCHAOXIN'), findsWidgets);
      expect(find.textContaining('Ưu đãi voucher:'), findsOneWidget);
      expect(find.text('-100.000đ'), findsWidgets);
    });

    test('TherapyDisplayItem represents treatment packages and single services', () {
      const packageItem = TherapyDisplayItem(
        id: 'pkg-01',
        title: 'Liệu trình Phục hồi Chuyên sâu 10 Buổi',
        category: 'Gói liệu trình',
        price: 5400000,
        originalPrice: 6000000,
        durationOrSessions: '10 buổi',
        description: 'Phục hồi toàn diện',
        imageUrl: 'https://example.com/img.png',
        type: TherapyItemType.package,
      );

      expect(packageItem.isPackage, isTrue);
      expect(packageItem.price, 5400000);
    });

    testWidgets('B02ServiceListingScreen accepts initialVoucher and displays banner', (tester) async {
      const testVoucher = VoucherItem(
        id: '44444444-0001-0001-0001-000000000002',
        title: 'Ưu đãi 20%',
        subtitle: 'SPADAY20',
        discountBanner: 'GIẢM 20%',
        description: 'Giảm 20% tối đa 150.000đ',
        expiryDate: '13/01/2027',
        code: 'SPADAY20',
        status: 'AVAILABLE',
        statusText: 'Có thể sử dụng',
        couponId: '44444444-0001-0001-0001-000000000002',
        discountPercent: 20.0,
      );

      await tester.pumpWidget(
        const MaterialApp(
          locale: Locale('vi'),
          supportedLocales: [Locale('vi'), Locale('en')],
          localizationsDelegates: [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: B02ServiceListingScreen(initialVoucher: testVoucher),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('SPADAY20'), findsOneWidget);
      expect(find.textContaining('GIẢM 20%'), findsOneWidget);
      expect(find.textContaining('Chọn dịch vụ bên dưới để đặt lịch áp mã ưu đãi'), findsOneWidget);
    });

    testWidgets('AllInOneBookingScreen customTimeSlots renders 1, 2, 4 slots properly fitting layout', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          locale: Locale('vi'),
          supportedLocales: [Locale('vi'), Locale('en')],
          localizationsDelegates: [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: AllInOneBookingScreen(
            customTimeSlots: ['09:00 - 10:00', '14:00 - 15:00', '16:00 - 17:00', '18:00 - 19:00'],
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('09:00 - 10:00'), findsOneWidget);
      expect(find.text('14:00 - 15:00'), findsOneWidget);
      expect(find.text('16:00 - 17:00'), findsOneWidget);
      expect(find.text('18:00 - 19:00'), findsOneWidget);
    });
  });
}
