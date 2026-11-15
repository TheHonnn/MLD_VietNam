import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:medical_healthcare_app/features/home/data/models/home_models.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

Widget _buildWrapper(Widget child) {
  return MaterialApp(
    locale: const Locale('vi'),
    supportedLocales: const [Locale('vi'), Locale('en')],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: child,
  );
}

void main() {
  group('Package Booking Price Verification Tests', () {
    testWidgets('Catalog package passed to AllInOneBookingScreen retains non-zero price and title', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const catalogPackage = TreatmentPackageModel(
        id: 'pkg-addon-001',
        title: 'Gói bổ trợ phục hồi sau phẫu thuật 10 buổi',
        category: 'Gói bổ trợ',
        price: 3500000,
        originalPrice: 4000000,
        duration: '10 buổi (6 tháng)',
        sessionsCount: 10,
        rating: 5.0,
        imageUrl: 'assets/images/service_luu_phu_bach_huyet.png',
        badgeText: 'Gói 10 buổi',
        description: 'Liệu trình bổ trợ chuyên sâu',
        features: ['Cam kết hiệu quả'],
        validityMonths: 6,
      );

      final service = SpaServiceModel(
        id: catalogPackage.id,
        name: catalogPackage.title,
        categoryName: catalogPackage.category,
        shortDescription: catalogPackage.description,
        fullDescription: catalogPackage.description,
        durationMinutes: 60,
        price: catalogPackage.price,
        imageUrl: catalogPackage.imageUrl,
      );

      await tester.pumpWidget(
        _buildWrapper(
          AllInOneBookingScreen(
            initialService: service,
            userPackageId: null,
            userPackageName: null,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Gói bổ trợ phục hồi sau phẫu thuật 10 buổi'), findsAtLeastNWidgets(1));
      expect(find.textContaining('3.500.000'), findsAtLeastNWidgets(1));
      expect(find.text('0 ₫'), findsNothing);
      expect(find.text('0đ'), findsNothing);
    });

    testWidgets('Active user package passed to AllInOneBookingScreen correctly shows 0đ covered by wallet', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const baseService = SpaServiceModel(
        id: 'srv-standard',
        name: 'Trị liệu chuẩn Vodder',
        categoryName: 'Dịch vụ lẻ',
        shortDescription: 'Mô tả',
        durationMinutes: 60,
        price: 900000,
        imageUrl: 'assets/images/service_luu_phu_bach_huyet.png',
      );

      await tester.pumpWidget(
        _buildWrapper(
          const AllInOneBookingScreen(
            initialService: baseService,
            userPackageId: 'user-pkg-active-123',
            userPackageName: 'Gói 10 buổi cá nhân',
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Gói 10 buổi cá nhân'), findsAtLeastNWidgets(1));
      expect(find.textContaining('0đ'), findsAtLeastNWidgets(1));
    });
  });
}
