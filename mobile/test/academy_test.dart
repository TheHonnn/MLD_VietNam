import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e01_academy_home_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d09_documents_screen.dart';
import 'package:medical_healthcare_app/features/home/presentation/screens/main_layout_screen.dart';
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
  testWidgets('Test E01AcademyHomeScreen rendering in Vietnamese (Locale vi)', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(home: const E01AcademyHomeScreen(), locale: const Locale('vi')));
    await tester.pump();
    expect(find.byType(E01AcademyHomeScreen), findsOneWidget);
    expect(find.text('Đào tạo & Khóa học'), findsOneWidget);
    expect(find.text('Xin chào'), findsNothing);

    // Kiểm tra các thành phần của thẻ khóa học
    expect(find.text('DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI MỚI BẮT ĐẦU - Level 0'), findsOneWidget);
    expect(find.text('6 buổi học'), findsOneWidget);
    expect(find.text('ĐÃ ĐĂNG KÝ'), findsWidgets);
    expect(find.text('Đã đăng ký · Vào học'), findsWidgets);
    expect(find.text('Đăng ký học'), findsWidgets);
  });

  testWidgets('Test E01AcademyHomeScreen rendering in English (Locale en) - 100% Translation', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(home: const E01AcademyHomeScreen(), locale: const Locale('en')));
    await tester.pump();
    expect(find.byType(E01AcademyHomeScreen), findsOneWidget);
    expect(find.text('Academy & Courses'), findsOneWidget);
    expect(find.text('BASIC MANUAL LYMPHATIC DRAINAGE FOR BEGINNERS - Level 0'), findsOneWidget);
    expect(find.text('6 sessions'), findsOneWidget);
    expect(find.text('ENROLLED'), findsWidgets);
    expect(find.text('Enrolled · Study'), findsWidgets);
    expect(find.text('Enroll Now'), findsWidgets);
  });

  testWidgets('Test MainLayoutScreen tab 2 rendering for Academy directly without modal popup (Vietnamese)', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(home: const MainLayoutScreen(initialIndex: 2), locale: const Locale('vi')));
    await tester.pump();
    expect(find.byType(E01AcademyHomeScreen), findsOneWidget);
    expect(find.text('Đào tạo & Khóa học'), findsOneWidget);
    expect(find.text('Chọn đối tượng để xem chương trình đào tạo phù hợp nhất với bạn:'), findsNothing);
  });

  testWidgets('Test MainLayoutScreen tab 3 rendering for Documents (Vietnamese)', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(home: const MainLayoutScreen(initialIndex: 3), locale: const Locale('vi')));
    await tester.pump();
    expect(find.byType(D09DocumentsScreen), findsOneWidget);
    expect(find.text('Tài liệu & Y khoa MLD'), findsWidgets);
  });

  testWidgets('Test MainLayoutScreen tab 3 rendering for Documents (English)', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(home: const MainLayoutScreen(initialIndex: 3), locale: const Locale('en')));
    await tester.pump();
    expect(find.byType(D09DocumentsScreen), findsOneWidget);
    expect(find.text('Documents & Medical MLD'), findsWidgets);
  });
}
