import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:medical_healthcare_app/features/membership/data/models/membership_models.dart';
import 'package:medical_healthcare_app/features/membership/data/repositories/membership_repository.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f05_my_vouchers_screen.dart';
import 'package:medical_healthcare_app/features/services/presentation/screens/b02_service_listing_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('User Vouchers and Package Booking Tests', () {
    test('VoucherItem correctly models Supabase coupons and discount banner', () {
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
      );

      expect(v1.code, 'MLDCHAOXIN');
      expect(v1.status, 'AVAILABLE');
      expect(v1.discountBanner, 'GIẢM 100K');
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
  });
}
