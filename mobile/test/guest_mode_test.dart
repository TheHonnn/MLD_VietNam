import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:medical_healthcare_app/features/auth/presentation/screens/a03_login_screen.dart';
import 'package:medical_healthcare_app/features/home/presentation/screens/main_layout_screen.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f01_profile_dashboard_screen.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  setUp(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues({});
    AuthService.instance.isLoggedInNotifier.value = false;
  });

  group('Guest Mode & Apple Compliance Tests', () {
    testWidgets('A03LoginScreen displays Explore Now buttons for guest access', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildWrapper(const A03LoginScreen()));
      await tester.pumpAndSettle();

      // Kiểm tra có nút Khám phá ngay trên header và outline button bên dưới
      expect(find.text('Khám phá ngay'), findsOneWidget);
      expect(find.text('Khám phá ứng dụng (Không cần đăng nhập)'), findsOneWidget);
    });

    testWidgets('F01ProfileDashboardScreen renders Guest card when user is not logged in', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      AuthService.instance.isLoggedInNotifier.value = false;

      await tester.pumpWidget(_buildWrapper(const F01ProfileDashboardScreen()));
      await tester.pumpAndSettle();

      // Kiểm tra thẻ Khách trải nghiệm
      expect(find.text('Khách trải nghiệm'), findsOneWidget);
      expect(find.text('Đăng nhập'), findsWidgets);
    });
  });
}

