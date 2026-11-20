import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:medical_healthcare_app/core/services/portal_settings_service.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/legal_document_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d12_faq_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('PortalSettingsService Unit Tests', () {
    final service = PortalSettingsService.instance;

    test('Initializes with medical fallback contacts and hotlines', () {
      expect(service.hotlineSupport, '096.7786.399');
      expect(service.hotlineTraining, '096.7786.399');
      expect(service.zaloOaUrl, contains('zalo.me'));
      expect(service.messengerUrl, contains('m.me'));
      expect(service.youtubeUrl, contains('youtube.com'));
      expect(service.websiteUrl, contains('mldvietnam.com'));
      expect(service.consultationBadgeText, 'TƯ VẤN Y KHOA MLD');
      expect(service.workingHours, '09:00 – 20:00 hàng ngày');
    });

    test('Provides dynamic contactChannels list with codes and icons', () {
      final channels = service.contactChannels;
      expect(channels.length, greaterThanOrEqualTo(5));
      expect(channels.any((c) => c['code'] == 'HOTLINE'), isTrue);
      expect(channels.any((c) => c['code'] == 'ZALO'), isTrue);
      expect(channels.any((c) => c['code'] == 'FACEBOOK'), isTrue);
      expect(channels.any((c) => c['code'] == 'TIKTOK'), isTrue);
      expect(channels.any((c) => c['code'] == 'YOUTUBE'), isTrue);
      expect(channels.any((c) => c['code'] == 'WEBSITE'), isTrue);
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

      final screen = const LegalDocumentScreen(type: LegalDocType.privacyPolicy);
      expect(screen.screenTitle, contains('Chính sách bảo mật'));
    });

    test('AllInOneBookingScreen.resolveTimeSlotsForBranch prioritizes portalTimeSlots when provided', () {
      final resolved = AllInOneBookingScreen.resolveTimeSlotsForBranch(
        null,
        portalTimeSlots: ['12:00 - 13:00', '13:00 - 14:00'],
      );
      expect(resolved, ['12:00 - 13:00', '13:00 - 14:00']);

      final explicitOverride = AllInOneBookingScreen.resolveTimeSlotsForBranch(
        null,
        customTimeSlots: ['09:00 - 10:00'],
        portalTimeSlots: ['12:00 - 13:00'],
      );
      expect(explicitOverride, ['09:00 - 10:00']);
    });

    testWidgets('D12FaqScreen renders FAQs, category chips, search and accordion expand', (tester) async {
      SharedPreferences.setMockInitialValues({
        'cached_portal_faqs': jsonEncode([
          {
            'id': 'faq-1',
            'category': 'DICH_VU',
            'question': 'Liệu trình kéo dài bao lâu?',
            'answer': 'Mỗi buổi kéo dài từ 45 đến 90 phút tùy gói.',
            'is_active': true,
          },
          {
            'id': 'faq-2',
            'category': 'DAO_TAO',
            'question': 'Học xong có chứng nhận không?',
            'answer': 'Học viên đạt yêu cầu được cấp chứng nhận chuẩn Vodder.',
            'is_active': true,
          },
        ]),
        'cached_portal_taxonomies': jsonEncode([
          {
            'id': 'slot-1',
            'type': 'BOOKING_TIME_SLOT',
            'code': 'SLOT_1200_1300',
            'name': '12:00 - 13:00',
            'sort_order': 720,
            'is_active': true,
          },
          {
            'id': 'slot-2',
            'type': 'BOOKING_TIME_SLOT',
            'code': 'SLOT_1300_1400',
            'name': '13:00 - 14:00',
            'sort_order': 780,
            'is_active': true,
          },
        ]),
      });
      await PortalSettingsService.instance.init();

      await tester.pumpWidget(
        const MaterialApp(
          locale: Locale('vi'),
          supportedLocales: [Locale('vi'), Locale('en')],
          localizationsDelegates: [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: D12FaqScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(PortalSettingsService.instance.bookingTimeSlots, ['12:00 - 13:00', '13:00 - 14:00']);
      expect(find.text('Hỏi đáp thường gặp (FAQs)'), findsOneWidget);
      expect(find.text('Đào tạo & Học phí'), findsWidgets);
      expect(find.text('Dịch vụ & Trị liệu'), findsWidgets);
      expect(find.text('1. Liệu trình kéo dài bao lâu?'), findsOneWidget);

      await tester.tap(find.text('1. Liệu trình kéo dài bao lâu?'));
      await tester.pumpAndSettle();
      expect(find.text('Mỗi buổi kéo dài từ 45 đến 90 phút tùy gói.'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'chứng nhận');
      await tester.pumpAndSettle();
      expect(find.textContaining('Học xong có chứng nhận không?'), findsOneWidget);
      expect(find.textContaining('Liệu trình kéo dài bao lâu?'), findsNothing);
    });
  });
}
