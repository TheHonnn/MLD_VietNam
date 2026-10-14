import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e01_academy_home_screen.dart';
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
    expect(find.text('Học viện đào tạo'), findsWidgets);
  });

  testWidgets('Test MainLayoutScreen tab 3 rendering', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: MainLayoutScreen(initialIndex: 3),
      ),
    );
    await tester.pump();
    expect(find.byType(E01AcademyHomeScreen), findsOneWidget);
    expect(find.text('Học viện đào tạo'), findsWidgets);
  });
}

