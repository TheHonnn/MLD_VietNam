import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:medical_healthcare_app/features/directory/presentation/screens/b05_branch_listing_screen.dart';
import 'package:medical_healthcare_app/features/directory/presentation/screens/b06_branch_detail_screen.dart';

Widget _buildWrapper(Widget child) {
  return MaterialApp(
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: const [
      Locale('vi', 'VN'),
      Locale('en', 'US'),
    ],
    locale: const Locale('vi', 'VN'),
    home: child,
  );
}

void main() {
  testWidgets('B05BranchListingScreen renders with user provided branch and city filter only', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const B05BranchListingScreen()));
    await tester.pumpAndSettle();

    // Verify Title
    expect(find.text('Hệ thống chi nhánh'), findsOneWidget);

    // Verify NO note "Tìm cơ sở phù hợp với bạn."
    expect(find.text('Tìm cơ sở phù hợp với bạn.'), findsNothing);

    // Verify City filter exists
    expect(find.text('Tất cả tỉnh / thành phố'), findsOneWidget);

    // Verify Branch Name and Address
    expect(find.text('Trụ sở MLD Việt Nam (5 Master LV3)'), findsOneWidget);
    expect(find.textContaining('Số 260, Ngõ 271 Bùi Xương Trạch'), findsOneWidget);

    expect(tester.takeException(), isNull);
  });

  testWidgets('B06BranchDetailScreen renders image, name, address, phone and google maps button', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildWrapper(const B06BranchDetailScreen()));
    await tester.pumpAndSettle();

    // Verify Title
    expect(find.text('Chi tiết chi nhánh'), findsOneWidget);

    // Verify Name, Address, Phone
    expect(find.text('Trụ sở MLD Việt Nam (5 Master LV3)'), findsOneWidget);
    expect(find.textContaining('Số 260, Ngõ 271 Bùi Xương Trạch'), findsOneWidget);
    expect(find.text('Hotline: 096.7786.399'), findsOneWidget);

    // Verify Google Maps Button
    expect(find.text('Xem trên Google Maps'), findsOneWidget);

    // Verify NO extra notes or mock sections
    expect(find.text('Không gian thư giãn đạt chuẩn quốc tế'), findsNothing);
    expect(find.text('Giới thiệu cơ sở'), findsNothing);
    expect(find.text('Tiện nghi chi nhánh'), findsNothing);
    expect(find.text('Dịch vụ tại chi nhánh'), findsNothing);
    expect(find.text('Đội ngũ chuyên viên'), findsNothing);
    expect(find.text('Giờ hoạt động'), findsNothing);

    expect(tester.takeException(), isNull);
  });
}

