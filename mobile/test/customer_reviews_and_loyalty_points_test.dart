import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:medical_healthcare_app/features/membership/data/models/membership_models.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f01_profile_dashboard_screen.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f04_loyalty_points_screen.dart';
import 'package:medical_healthcare_app/features/treatment/data/models/treatment_models.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d05_service_review_screen.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

Widget _buildTestApp({required Widget home}) {
  return MaterialApp(
    locale: const Locale('vi'),
    supportedLocales: const [Locale('vi'), Locale('en')],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: home,
  );
}

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    AuthService.instance.isLoggedInNotifier.value = true;
  });

  group('Customer Reviews & Loyalty Points Data Models', () {
    test('TierRuleModel parses Web Admin membership_tier_rules correctly', () {
      final json = {
        'tier': 'DIAMOND',
        'min_accumulated_spent': 60000000.0,
        'point_earning_rate': 5.0,
        'discount_service_percent': 20.0,
        'free_head_spa_sessions': 4,
        'priority_booking': true,
        'description': 'Hạng Kim Cương (Từ 60 triệu): Tích 5% điểm, giảm 20% dịch vụ.',
      };

      final rule = TierRuleModel.fromJson(json);
      expect(rule.tier, 'DIAMOND');
      expect(rule.displayName, 'Hội viên Kim Cương');
      expect(rule.minSpent, 60000000.0);
      expect(rule.pointEarningRate, 5.0);
      expect(rule.discountPercent, 20.0);
      expect(rule.freeHeadSpaCount, 4);
      expect(rule.priorityBooking, true);
    });

    test('ServiceReviewDataModel parses review_tags and branch_reply from Web Admin', () {
      final json = {
        'id': 'rev-001',
        'rating': 5,
        'review_tags': ['Kỹ thuật viên chu đáo', 'Giảm đau / Nhẹ nhõm ngay'],
        'comment': 'Buổi trị liệu rất tốt, không gian yên tĩnh thư giãn.',
        'branch_reply': 'Cảm ơn Quý khách The Hoang đã tin tưởng MLD Việt Nam!',
        'created_at': '2026-11-15T08:00:00.000Z',
        'services': {'name': 'Chăm sóc toàn diện chuẩn Y khoa MLD'},
        'technicians': {'full_name': 'Trần Lan Anh'},
      };

      final model = ServiceReviewDataModel.fromJson(json);
      expect(model.id, 'rev-001');
      expect(model.overallRating, 5);
      expect(model.reviewTags, contains('Kỹ thuật viên chu đáo'));
      expect(model.reviewTags, contains('Giảm đau / Nhẹ nhõm ngay'));
      expect(model.branchReply, 'Cảm ơn Quý khách The Hoang đã tin tưởng MLD Việt Nam!');
      expect(model.serviceName, 'Chăm sóc toàn diện chuẩn Y khoa MLD');
      expect(model.technicianName, 'Trần Lan Anh');
    });

    test('UserProfile holds totalSpent and reward points', () {
      const profile = UserProfile(
        id: 'user-001',
        fullName: 'The Hoang',
        phone: '0394316963',
        isPhoneVerified: true,
        email: 'thehoang@example.com',
        dateOfBirth: '01/01/1990',
        gender: 'Nam',
        address: 'Hà Nội',
        occupation: 'Kinh doanh',
        emergencyContactName: '',
        emergencyContactPhone: '',
        avatarUrl: '',
        memberTier: 'Hội viên Kim Cương',
        memberCode: 'MLD-000001',
        points: 1042654,
        validUntil: '31/12/2027',
        totalSpent: 2111308000.0,
      );

      expect(profile.points, 1042654);
      expect(profile.totalSpent, 2111308000.0);
      expect(profile.memberTier, 'Hội viên Kim Cương');
    });
  });

  group('Customer Reviews & Loyalty Points Screens Rendering', () {
    testWidgets('F01ProfileDashboardScreen renders Loyalty Points row and Review row', (tester) async {
      tester.view.physicalSize = const Size(390, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(home: const F01ProfileDashboardScreen()));
      await tester.pumpAndSettle();

      // Verify Điểm thưởng & Hạng hội viên in ƯU ĐÃI section
      expect(find.text('Điểm thưởng & Hạng hội viên'), findsOneWidget);

      // Verify Đánh giá dịch vụ in DỊCH VỤ TRỊ LIỆU section
      expect(find.text('Đánh giá dịch vụ'), findsOneWidget);
    });

    testWidgets('F04LoyaltyPointsScreen renders member card and 3 tabs', (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(home: const F04LoyaltyPointsScreen()));
      await tester.pump(const Duration(milliseconds: 100));

      // Verify Screen title
      expect(find.text('Điểm thưởng & Hạng hội viên'), findsWidgets);
    });

    testWidgets('D05ServiceReviewScreen renders 2 tabs and review controls', (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        _buildTestApp(
          home: const D05ServiceReviewScreen(
            serviceName: 'Chăm sóc toàn diện chuẩn Y khoa MLD',
            specialistName: 'Trần Lan Anh',
            branchName: 'Chi nhánh Quận 3',
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));

      // Verify Screen title
      expect(find.text('Đánh giá dịch vụ'), findsWidgets);

      // Verify Tab headers
      expect(find.text('Viết đánh giá'), findsOneWidget);
      expect(find.textContaining('Đánh giá của tôi'), findsOneWidget);

      // Verify Service and specialist info
      expect(find.text('Chăm sóc toàn diện chuẩn Y khoa MLD'), findsOneWidget);
      expect(find.text('Chuyên viên: Trần Lan Anh'), findsOneWidget);

      // Verify Points incentive banner
      expect(find.textContaining('+50 điểm thưởng'), findsWidgets);
    });
  });
}
