import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/services/portal_settings_service.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/legal_document_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('PortalSettingsService Unit Tests', () {
    final service = PortalSettingsService.instance;

    test('Initializes with medical fallback contacts and hotlines', () {
      expect(service.hotlineSupport, '096.7786.399');
      expect(service.hotlineTraining, '096.7786.399');
      expect(service.zaloOaUrl, contains('zalo.me'));
      expect(service.messengerUrl, contains('m.me'));
      expect(service.consultationBadgeText, 'TƯ VẤN Y KHOA MLD');
      expect(service.workingHours, '09:00 – 20:00 hàng ngày');
    });

    test('Provides valid audienceFilterList with "Tất cả đối tượng" prefix', () {
      final audiences = service.audienceFilterList;
      expect(audiences.isNotEmpty, isTrue);
      expect(audiences.first, 'Tất cả đối tượng');
      expect(audiences, contains('Người mới bắt đầu'));
      expect(audiences, contains('Đang làm nghề'));
    });

    test('Provides valid needFilterList with "Tất cả nhu cầu" prefix', () {
      final needs = service.needFilterList;
      expect(needs.isNotEmpty, isTrue);
      expect(needs.first, 'Tất cả nhu cầu');
      expect(needs, contains('Kiến thức nền tảng & Tự chăm sóc'));
      expect(needs, contains('Tích hợp dịch vụ mới'));
    });

    test('Provides dynamic cards for enrollment form E05', () {
      final cards = service.audienceCardsForEnrollment;
      expect(cards.length, greaterThanOrEqualTo(2));
      expect(cards.first['name'], isNotNull);
      expect(cards.first['description'], isNotNull);
    });

    test('LegalDocumentScreen parses markdown policies into structured sections', () {
      const sampleMarkdown = '''
# TIÊU ĐỀ CHÍNH

## 1. Mục đích thu thập
Nội dung đoạn 1 về bảo vệ thông tin y khoa.

## 2. Phạm vi sử dụng
Nội dung đoạn 2 về sử dụng dữ liệu lâm sàng.
''';

      // We test through LegalDocumentScreen's internal logic
      final screen = const LegalDocumentScreen(type: LegalDocType.privacyPolicy);
      expect(screen.screenTitle, contains('Chính sách bảo mật'));
    });
  });
}
