import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d11_community_screen.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

Widget _buildTestApp({required Widget home, Locale locale = const Locale('vi')}) {
  return MaterialApp(
    locale: locale,
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
  testWidgets('D11CommunityScreen renders search bar, categories, and refresh indicator', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(home: const D11CommunityScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Cộng đồng MLD Việt Nam'), findsOneWidget);
    expect(find.text('Chia sẻ kiến thức & tài liệu PDF chuyên môn'), findsOneWidget);
    expect(find.text('Tìm bài viết, tài liệu y khoa PDF...'), findsOneWidget);
    expect(find.byType(RefreshIndicator), findsOneWidget);
  });
}
