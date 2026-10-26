import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e01_academy_home_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d09_documents_screen.dart';
import 'package:medical_healthcare_app/features/home/presentation/screens/main_layout_screen.dart';

void main() {
  testWidgets('Test E01AcademyHomeScreen rendering and course cards', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: E01AcademyHomeScreen(),
      ),
    );
    await tester.pump();
    expect(find.byType(E01AcademyHomeScreen), findsOneWidget);
    // Bỏ chữ "Xin chào", thay bằng "Đào tạo & Khóa học"
    expect(find.text('Đào tạo & Khóa học'), findsOneWidget);
    expect(find.text('Xin chào'), findsNothing);

    // Kiểm tra các thành phần của thẻ khóa học theo yêu cầu
    expect(find.text('DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI MỚI BẮT ĐẦU - Level 0'), findsOneWidget);
    expect(find.text('6 buổi học'), findsOneWidget);
    expect(find.text('-90%'), findsOneWidget);
    expect(find.text('Chi tiết'), findsWidgets);
  });

  testWidgets('Test MainLayoutScreen tab 2 rendering for Academy directly without modal popup', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: MainLayoutScreen(initialIndex: 2),
      ),
    );
    await tester.pump();
    expect(find.byType(E01AcademyHomeScreen), findsOneWidget);
    expect(find.text('Đào tạo & Khóa học'), findsOneWidget);
    // Không có modal popup 2 lựa chọn
    expect(find.text('Chọn đối tượng để xem chương trình đào tạo phù hợp nhất với bạn:'), findsNothing);
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
