import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e01_academy_home_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d09_documents_screen.dart';
import 'package:medical_healthcare_app/features/home/presentation/screens/main_layout_screen.dart';

void main() {
  testWidgets('Test E01AcademyHomeScreen rendering', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: E01AcademyHomeScreen(),
      ),
    );
    await tester.pump();
    expect(find.byType(E01AcademyHomeScreen), findsOneWidget);
    // Bỏ chữ "Xin chào", "Học viện đào tạo" nhỏ, thay bằng "Đào tạo & Khóa học"
    expect(find.text('Đào tạo & Khóa học'), findsOneWidget);
    expect(find.text('Xin chào'), findsNothing);
  });

  testWidgets('Test MainLayoutScreen tab 2 rendering for Academy', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: MainLayoutScreen(initialIndex: 2),
      ),
    );
    await tester.pump();
    expect(find.byType(E01AcademyHomeScreen), findsOneWidget);
    expect(find.text('Đào tạo & Khóa học'), findsOneWidget);
  });

  testWidgets('Test MainLayoutScreen tab 3 rendering for Documents', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: MainLayoutScreen(initialIndex: 3),
      ),
    );
    await tester.pump();
    expect(find.byType(D09DocumentsScreen), findsOneWidget);
    expect(find.text('Tài liệu & Y khoa MLD'), findsWidgets);
  });
}
