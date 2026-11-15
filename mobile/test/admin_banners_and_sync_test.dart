import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/widgets/smart_image.dart';

void main() {
  group('SmartImage and Banner Sync Tests', () {
    testWidgets('SmartImage decodes base64 data URI correctly without crashing', (tester) async {
      // 1x1 transparent GIF base64
      const base64Gif =
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SmartImage(
              imageUrl: base64Gif,
              width: 100,
              height: 100,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(SmartImage), findsOneWidget);
      expect(find.byType(Image), findsOneWidget);
    });

    testWidgets('SmartImage handles fallback asset path gracefully', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SmartImage(
              imageUrl: 'assets/images/therapy_hero_banner.jpg',
              width: 100,
              height: 100,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(SmartImage), findsOneWidget);
    });
  });
}
