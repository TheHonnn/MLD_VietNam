import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/service_form_sheet.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/course_form_sheet.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/product_form_sheet.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Admin Catalog & Layout Tests', () {
    const sampleService = AdminServiceModel(
      id: 'srv_01',
      name: 'Trị liệu Cổ Vai Gáy Chuyên Sâu',
      slug: 'tri-lieu-co-vai-gay-chuyen-sau',
      categoryId: 'cat_01',
      categoryName: 'Trị liệu MLD',
      durationMinutes: 75,
      price: 850000,
      discountPrice: 680000,
      imageUrl: '',
      shortDescription: 'Giảm đau nhức và lưu thông dịch bạch huyết.',
      fullDescription: '',
      steps: ['Khai thông huyệt đạo', 'Dẫn lưu Vodder'],
      benefits: ['Giảm đau cơ', 'Ngủ ngon'],
      isActive: true,
      isFeatured: true,
    );

    const sampleCourse = AdminCourseModel(
      id: 'crs_01',
      title: 'Kỹ thuật viên Trị liệu MLD Chuyên nghiệp',
      code: 'MLD-PRO-01',
      categoryId: 'cat_02',
      categoryName: 'Khóa học nghề',
      level: 'INTERMEDIATE',
      tuitionFee: 15000000,
      depositAmount: 3000000,
      totalHours: 144,
      theoryHours: 48,
      practiceHours: 96,
      totalLessons: 20,
      imageUrl: '',
      shortDescription: 'Đào tạo chuẩn kỹ thuật dẫn lưu Vodder Châu Âu.',
      fullDescription: '',
      isActive: true,
      isFeatured: false,
    );

    testWidgets('ServiceFormSheet renders with initial values', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ServiceFormSheet(
              service: sampleService,
              categories: const [],
              onSaved: () {},
            ),
          ),
        ),
      );

      expect(find.text('Chỉnh sửa Dịch vụ'), findsOneWidget);
      expect(find.text('Trị liệu Cổ Vai Gáy Chuyên Sâu'), findsOneWidget);
      expect(find.text('850000'), findsOneWidget);
    });

    testWidgets('CourseFormSheet renders with initial values', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CourseFormSheet(
              course: sampleCourse,
              onSaved: () {},
            ),
          ),
        ),
      );

      expect(find.text('Chỉnh sửa Khóa học'), findsOneWidget);
      expect(find.text('Kỹ thuật viên Trị liệu MLD Chuyên nghiệp'), findsOneWidget);
      expect(find.text('MLD-PRO-01'), findsOneWidget);
    });

    testWidgets('AdminServiceModel and AdminCourseModel properties', (tester) async {
      expect(sampleService.name, 'Trị liệu Cổ Vai Gáy Chuyên Sâu');
      expect(sampleService.durationMinutes, 75);
      expect(sampleService.price, 850000);
      expect(sampleService.isActive, isTrue);

      expect(sampleCourse.title, 'Kỹ thuật viên Trị liệu MLD Chuyên nghiệp');
      expect(sampleCourse.code, 'MLD-PRO-01');
      expect(sampleCourse.level, 'INTERMEDIATE');
      expect(sampleCourse.tuitionFee, 15000000);
    });

    testWidgets('CourseFormSheet renders create mode with empty course', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CourseFormSheet(
              course: null,
              onSaved: () {},
            ),
          ),
        ),
      );

      expect(find.text('Thêm mới Khóa đào tạo'), findsOneWidget);
    });

    testWidgets('ProductFormSheet renders create mode with empty product', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProductFormSheet(
              product: null,
              onSaved: () {},
            ),
          ),
        ),
      );

      expect(find.text('Thêm Sản phẩm mới'), findsOneWidget);
    });

    testWidgets('CourseFormSheet level dropdown has isExpanded set to prevent overflow', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CourseFormSheet(
              course: null,
              onSaved: () {},
            ),
          ),
        ),
      );

      final dropdownFinder = find.byWidgetPredicate((w) => w is DropdownButton && w.isExpanded);
      expect(dropdownFinder, findsOneWidget);
    });
  });
}
