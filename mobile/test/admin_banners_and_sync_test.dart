import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/widgets/smart_image.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/presentation/screens/admin_catalog_screen.dart';

void main() {
  group('Admin Banners & Database Sync Tests', () {
    test('AdminBannerModel parses miniapp_shared_content correctly', () {
      final json = {
        'id': 'ed646f92-cc0e-44b4-b5d5-4e093b0eb27e',
        'kind': 'BANNER',
        'title': 'Đừng để cơn đau làm gián đoạn cuộc sống.',
        'summary': 'Nhận tư vấn 1:1 và phác đồ trị liệu phù hợp từ đội ngũ chuyên gia Hệ Bách Huyệt.',
        'image_url': 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        'category': 'DAO_TAO',
        'target_link': '/academy',
        'status': 'PUBLISHED',
        'sort_order': 1,
        'is_featured': true,
      };

      final banner = AdminBannerModel.fromJson(json);

      expect(banner.id, 'ed646f92-cc0e-44b4-b5d5-4e093b0eb27e');
      expect(banner.title, 'Đừng để cơn đau làm gián đoạn cuộc sống.');
      expect(banner.summary, contains('Nhận tư vấn 1:1'));
      expect(banner.category, 'DAO_TAO');
      expect(banner.categoryDisplay, 'Đào tạo Y khoa');
      expect(banner.targetLink, '/academy');
      expect(banner.sortOrder, 1);
      expect(banner.isPublished, isTrue);

      final draftBanner = banner.copyWith(status: 'DRAFT');
      expect(draftBanner.isPublished, isFalse);
    });

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

    testWidgets('AdminCatalogScreen renders Banner tab and allows switching', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: AdminCatalogScreen(initialTab: 'BANNERS'),
        ),
      );
      await tester.pumpAndSettle();

      // Check for Segmented Control tabs
      expect(find.textContaining('Banner Trang chủ'), findsOneWidget);
      expect(find.textContaining('Dịch vụ'), findsOneWidget);
      expect(find.textContaining('Gói bổ trợ'), findsOneWidget);
      expect(find.textContaining('Khóa học'), findsOneWidget);

      // Check for AppBar Add button
      expect(find.text('Thêm Banner'), findsOneWidget);

      // Search field hint
      expect(find.text('Tìm banner trang chủ...'), findsOneWidget);

      // Verify that the test banner is displayed in the list
      expect(find.text('Khóa Đào tạo Chuyên sâu'), findsOneWidget);
      expect(find.textContaining('ĐÀO TẠO Y KHOA'), findsOneWidget);
      expect(find.text('Bật trên App'), findsOneWidget);

      // Tap "Thêm Banner" to open BannerFormSheet
      await tester.tap(find.text('Thêm Banner'));
      await tester.pumpAndSettle();

      expect(find.text('Thêm Banner Trang chủ Mới'), findsOneWidget);
      expect(find.text('Tiêu đề chiến dịch Banner *'), findsOneWidget);
      expect(find.text('Mô tả phụ đề tóm tắt'), findsOneWidget);
      expect(find.text('Danh mục Banner'), findsOneWidget);
      expect(find.text('Liên kết điều hướng (Target Link)'), findsOneWidget);
      expect(find.text('Chọn ảnh'), findsOneWidget);
      expect(find.text('Hiển thị trên Trang chủ'), findsOneWidget);
      expect(find.text('Tạo Banner Mới'), findsOneWidget);
    });

    test('All Banner Categories format correctly in Vietnamese', () {
      final b1 = AdminBannerModel.fromJson({'id': '1', 'category': 'DAO_TAO'});
      final b2 = AdminBannerModel.fromJson({'id': '2', 'category': 'DICH_VU'});
      final b3 = AdminBannerModel.fromJson({'id': '3', 'category': 'KHUYEN_MAI'});
      final b4 = AdminBannerModel.fromJson({'id': '4', 'category': 'SU_KIEN'});

      expect(b1.categoryDisplay, 'Đào tạo Y khoa');
      expect(b2.categoryDisplay, 'Dịch vụ Trị liệu');
      expect(b3.categoryDisplay, 'Ưu đãi Đặc quyền');
      expect(b4.categoryDisplay, 'Sự kiện Chuyên ngành');
    });
  });
}
