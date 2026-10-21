import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/directory/presentation/screens/b08_specialist_profile_screen.dart';

void main() {
  testWidgets('B08SpecialistProfileScreen renders with back button and standard 20px padding', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const MaterialApp(
        home: B08SpecialistProfileScreen(
          name: 'Trần Minh Phương',
          role: 'Kỹ thuật viên massage',
        ),
      ),
    );

    // Verify back button is present on the hero image
    expect(find.byIcon(Icons.arrow_back), findsOneWidget);

    // Verify specialist name and role
    expect(find.text('Trần Minh Phương'), findsOneWidget);
    expect(find.text('Kỹ thuật viên massage'), findsOneWidget);

    // Verify sections
    expect(find.text('Giới thiệu'), findsOneWidget);
    expect(find.text('Chuyên môn'), findsOneWidget);
    expect(find.text('Kinh nghiệm'), findsOneWidget);
    expect(find.text('Dịch vụ phụ trách'), findsOneWidget);
    expect(find.text('Lịch làm việc'), findsOneWidget);
    expect(find.text('Đánh giá từ khách hàng'), findsOneWidget);

    // Verify bottom CTA button
    expect(find.text('Đặt lịch với chuyên viên'), findsOneWidget);

    // Verify 20px horizontal padding exists for content
    final paddingFinder = find.byWidgetPredicate(
      (widget) =>
          widget is Padding &&
          widget.padding == const EdgeInsets.symmetric(horizontal: 20.0, vertical: 20.0),
    );
    expect(paddingFinder, findsOneWidget);
  });
}

