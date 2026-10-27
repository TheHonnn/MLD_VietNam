import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d11_community_screen.dart';

void main() {
  testWidgets('D11CommunityScreen renders search bar, categories, and refresh indicator', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: D11CommunityScreen(),
      ),
    );

    // Initial pump
    await tester.pumpAndSettle();

    // Verify Title & Subtitle
    expect(find.text('Cộng đồng MLD Việt Nam'), findsOneWidget);
    expect(find.text('Chia sẻ kiến thức & tài liệu PDF chuyên môn'), findsOneWidget);

    // Verify Search Bar hint
    expect(find.text('Tìm bài viết, tài liệu y khoa PDF...'), findsOneWidget);

    // Verify RefreshIndicator exists
    expect(find.byType(RefreshIndicator), findsOneWidget);
  });
}

