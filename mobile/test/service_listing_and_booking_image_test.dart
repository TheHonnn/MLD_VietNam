import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:medical_healthcare_app/features/home/data/models/home_models.dart';
import 'package:medical_healthcare_app/features/services/presentation/screens/b02_service_listing_screen.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';

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
  group('TreatmentPackageModel & Services Tests', () {
    test('TreatmentPackageModel parses Supabase JSON correctly', () {
      final json = {
        'id': 'pkg-001',
        'name': 'Gói Chăm sóc khu trú (10 buổi)',
        'total_sessions': 10,
        'price': 4800000,
        'discount_price': 4500000,
        'validity_months': 3,
        'description': 'Liệu trình 10 buổi Chăm sóc khu trú',
        'image_url': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
        'is_active': true,
      };

      final pkg = TreatmentPackageModel.fromJson(json);

      expect(pkg.id, 'pkg-001');
      expect(pkg.title, 'Gói Chăm sóc khu trú (10 buổi)');
      expect(pkg.sessionsCount, 10);
      expect(pkg.price, 4500000);
      expect(pkg.originalPrice, 4800000);
      expect(pkg.validityMonths, 3);
      expect(pkg.category, 'Chăm sóc khu trú');
      expect(pkg.badgeText, 'Gói 10 buổi');
    });

    test('TherapyDisplayItem wrapper handles both singleService and package', () {
      const service = SpaServiceModel(
        id: 'srv-001',
        name: 'Chăm sóc khu trú (45\')',
        categoryName: 'Chăm sóc khu trú',
        shortDescription: 'Mô tả dịch vụ',
        durationMinutes: 45,
        price: 500000,
        imageUrl: 'assets/images/service_luu_phu_bach_huyet.png',
      );

      final item = TherapyDisplayItem(
        id: service.id,
        title: service.name,
        category: service.categoryName,
        price: service.price,
        durationOrSessions: '${service.durationMinutes} phút / ca',
        description: service.shortDescription,
        imageUrl: service.imageUrl,
        type: TherapyItemType.singleService,
        singleService: service,
      );

      expect(item.isPackage, isFalse);
      expect(item.title, 'Chăm sóc khu trú (45\')');
      expect(item.price, 500000);
    });
  });

  group('Widget Tests', () {
    testWidgets('B02ServiceListingScreen renders properly with segmented tabs and filters', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildWrapper(const B02ServiceListingScreen()));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(tester.takeException(), isNull);

      // Check segmented tabs
      expect(find.textContaining('TRỊ LIỆU'), findsOneWidget);
      expect(find.textContaining('SẢN PHẨM'), findsOneWidget);

      // Check search input
      expect(find.byType(TextField), findsOneWidget);

      // Check 2 filter buttons in Academy style
      expect(
        find.textContaining('Dịch vụ & Gói').evaluate().isNotEmpty ||
            find.textContaining('Services & Packages').evaluate().isNotEmpty,
        isTrue,
      );
      expect(
        find.textContaining('Cơ sở').evaluate().isNotEmpty ||
            find.textContaining('Branch').evaluate().isNotEmpty,
        isTrue,
      );
    });

    testWidgets('AllInOneBookingScreen receives initialService and custom image', (tester) async {
      const service = SpaServiceModel(
        id: 'srv-test',
        name: 'Chăm sóc mở rộng (60\')',
        categoryName: 'Chương Trình Chăm Sóc',
        shortDescription: 'Mô tả',
        durationMinutes: 60,
        price: 900000,
        imageUrl: 'assets/images/service_luu_phu_bach_huyet.png',
      );

      await tester.pumpWidget(
        _buildWrapper(
          const AllInOneBookingScreen(
            initialService: service,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Chăm sóc mở rộng (60\')'), findsAtLeastNWidgets(1));
      expect(find.textContaining('60 phút / ca'), findsOneWidget);
    });

    testWidgets('B02ServiceListingScreen shows contact button and center dialog with Zalo/Messenger on products tab', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        _buildWrapper(
          const B02ServiceListingScreen(
            initialSegment: 1,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(tester.takeException(), isNull);

      // Check "Liên hệ" button exists on product cards
      final contactBtn = find.text('Liên hệ');
      expect(contactBtn, findsWidgets);

      // Tap first "Liên hệ" button
      await tester.tap(contactBtn.first);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Verify Center Dialog pops up with Zalo and Messenger
      expect(find.text('Liên hệ tư vấn sản phẩm'), findsOneWidget);
      expect(find.text('Zalo'), findsOneWidget);
      expect(find.text('Messenger'), findsOneWidget);
      expect(find.textContaining('096.7786.399'), findsOneWidget);
    });
  });
}
