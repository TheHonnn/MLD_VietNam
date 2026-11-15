import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/widgets/smart_image.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

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

    testWidgets('Banner PageView supports smooth horizontal swipe without white wash', (tester) async {
      final controller = PageController();
      int pageIndex = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              height: 380,
              child: PageView.builder(
                controller: controller,
                itemCount: 2,
                onPageChanged: (index) => pageIndex = index,
                itemBuilder: (context, index) {
                  return Stack(
                    children: [
                      SmartImage(
                        imageUrl: 'assets/images/therapy_hero_banner.jpg',
                        fit: BoxFit.cover,
                      ),
                      Positioned(
                        bottom: 20,
                        left: 20,
                        child: Text('Banner Slide $index'),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Banner Slide 0'), findsOneWidget);
      expect(find.text('Banner Slide 1'), findsNothing);

      // Simulate smooth horizontal drag to next slide
      await tester.drag(find.byType(PageView), const Offset(-400, 0));
      await tester.pumpAndSettle();

      expect(pageIndex, equals(1));
      expect(find.text('Banner Slide 1'), findsOneWidget);

      controller.dispose();
    });
  });
}
