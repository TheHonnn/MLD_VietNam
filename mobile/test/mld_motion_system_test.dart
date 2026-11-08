import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/motion/app_page_transitions.dart';

void main() {
  group('MLD Motion System Tokens & Transitions Verification', () {
    test('1. Motion Duration Tokens conform strictly to spec', () {
      // Instant & Micro-fade
      expect(MldMotionDuration.instant, Duration.zero);
      expect(MldMotionDuration.microFade.inMilliseconds, lessThanOrEqualTo(80));

      // Micro-interactions
      expect(MldMotionDuration.micro.inMilliseconds, equals(140));
      expect(MldMotionDuration.microReverse.inMilliseconds, equals(100));

      // Drill-down: Push 240ms, Pop 190ms (~21% faster)
      expect(MldMotionDuration.drillDownPush.inMilliseconds, equals(240));
      expect(MldMotionDuration.drillDownPop.inMilliseconds, equals(190));
      final drillDownDiff = (240 - 190) / 240;
      expect(drillDownDiff, closeTo(0.208, 0.01)); // ~21%

      // Modal: Push 260ms, Pop 200ms (~23% faster)
      expect(MldMotionDuration.modalPush.inMilliseconds, equals(260));
      expect(MldMotionDuration.modalPop.inMilliseconds, equals(200));
      final modalDiff = (260 - 200) / 260;
      expect(modalDiff, closeTo(0.23, 0.01)); // ~23%

      // Splash Ingress Pure Cross-fade (300ms)
      expect(MldMotionDuration.splashCrossFade.inMilliseconds, equals(300));

      // Hard Timeout 1.5s
      expect(MldMotionDuration.splashHardTimeout.inMilliseconds, equals(1500));

      // Push lock 150ms
      expect(MldMotionDuration.pushDebounceLock.inMilliseconds, equals(150));
    });

    test('2. Motion Offsets & Scale Tokens conform strictly to spec', () {
      // Horizontal slide 12%
      expect(MldMotionOffsets.drillDownSlide.dx, equals(0.12));
      expect(MldMotionOffsets.drillDownSlide.dy, equals(0.0));

      // Modal bottom slide 18%
      expect(MldMotionOffsets.modalSlide.dx, equals(0.0));
      expect(MldMotionOffsets.modalSlide.dy, equals(0.18));

      // Scale = 1.0 (No scale in Splash or Screen Transitions)
      expect(MldMotionOffsets.scaleNormal, equals(1.0));
      expect(MldMotionOffsets.splashScaleBegin, equals(1.0));
    });

    test('3. Page Route Builders durations match exact spec', () {
      final crossFadeRoute = AppPageTransitions.pureCrossFade(
        page: const Scaffold(body: Text('CrossFade')),
      ) as PageRouteBuilder;
      expect(crossFadeRoute.transitionDuration.inMilliseconds, equals(300));
      expect(crossFadeRoute.reverseTransitionDuration.inMilliseconds, equals(300));

      final drillDownRoute = AppPageTransitions.drillDownSlide(
        page: const Scaffold(body: Text('DrillDown')),
      ) as PageRouteBuilder;
      expect(drillDownRoute.transitionDuration.inMilliseconds, equals(240));
      expect(drillDownRoute.reverseTransitionDuration.inMilliseconds, equals(190));

      final modalRoute = AppPageTransitions.modalSlideUp(
        page: const Scaffold(body: Text('Modal')),
      ) as PageRouteBuilder;
      expect(modalRoute.transitionDuration.inMilliseconds, equals(260));
      expect(modalRoute.reverseTransitionDuration.inMilliseconds, equals(200));
    });

    testWidgets('4. Reduce Motion Global Override renders child directly', (tester) async {
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: MaterialApp(
            home: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      AppPageTransitions.drillDownSlide(
                        page: const Scaffold(body: Text('Target Screen')),
                      ),
                    );
                  },
                  child: const Text('Open'),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      expect(find.text('Target Screen'), findsOneWidget);
    });

    testWidgets('5. MldInteractivePress responds with micro-interaction scale', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: MldInteractivePress(
                onTap: () => tapped = true,
                child: const Text('Tap Me'),
              ),
            ),
          ),
        ),
      );

      final gesture = await tester.startGesture(tester.getCenter(find.text('Tap Me')));
      await tester.pump(); // Dispatch tap down event to recognizer
      await tester.pump(const Duration(milliseconds: 70));

      final scaleFinder = find.descendant(
        of: find.byType(MldInteractivePress),
        matching: find.byType(ScaleTransition),
      );
      final scaleWidget = tester.widget<ScaleTransition>(scaleFinder);
      expect(scaleWidget.scale.value, lessThan(1.0));

      await gesture.up();
      await tester.pumpAndSettle();
      expect(tapped, isTrue);
    });
  });
}
