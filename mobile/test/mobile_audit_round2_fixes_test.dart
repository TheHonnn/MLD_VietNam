import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/network/api_endpoints.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e10_quiz_screen.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/product_form_sheet.dart';
import 'package:medical_healthcare_app/features/membership/data/models/membership_models.dart';
import 'package:medical_healthcare_app/features/membership/data/repositories/membership_repository.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f04_loyalty_points_screen.dart';
import 'package:medical_healthcare_app/features/treatment/data/models/treatment_models.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d06_home_care_guidelines_screen.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

Widget _buildViApp(Widget home) {
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
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Mobile Audit Round 2 Fixes', () {
    test('ApiEndpoints has no hardcoded service role JWT in default binary', () {
      expect(ApiEndpoints.supabaseServiceRoleKey, isEmpty);
      expect(ApiEndpoints.effectiveSupabaseAuthKey, ApiEndpoints.supabaseAnonKey);
    });

    test('HomeCareArticleModel.fromJson handles partial/null payloads safely', () {
      final article = HomeCareArticleModel.fromJson({
        'id': 'art-1',
        'title': 'Dẫn lưu tại nhà',
        'category': 'Chăm sóc da',
        'read_time_minutes': 5,
        'summary': 'Hướng dẫn nhẹ nhàng hằng ngày',
        'image_url': 'https://example.com/care.png',
      });

      expect(article.id, 'art-1');
      expect(article.readTimeText, '5 phút đọc');
      expect(article.imageUrl, 'https://example.com/care.png');
    });

    testWidgets('E10QuizScreen initializes _questions safely without LateInitializationError', (tester) async {
      const emptyQuiz = CourseQuizModel(
        id: 'quiz-empty-1',
        courseId: 'course-1',
        title: 'Kiểm tra an toàn',
        timeLimitMinutes: 10,
        passingScore: 8.0,
        totalQuestions: 5,
        questions: [],
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: E10QuizScreen(quiz: emptyQuiz),
        ),
      );
      await tester.pump();

      expect(tester.takeException(), isNull);
    });

    testWidgets('ProductFormSheet defaults to DB CHECK-valid category Băng ép', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProductFormSheet(onSaved: () {}),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Băng ép'), findsAtLeastNWidgets(1));
      expect(find.text('Chăm sóc da'), findsOneWidget);
      expect(find.text('Dụng cụ tập luyện'), findsOneWidget);
      expect(find.text('Tài liệu'), findsOneWidget);
    });

    testWidgets('F04LoyaltyPointsScreen displays điểm unit instead of đ', (tester) async {
      MembershipRepository.instance.profile = const UserProfile(
        id: '00000000-0000-0000-0000-000000000001',
        fullName: 'Học viên Test',
        phone: '0901234567',
        isPhoneVerified: true,
        email: 'test@mld.vn',
        dateOfBirth: '01/01/1995',
        gender: 'Nữ',
        address: 'TP.HCM',
        occupation: 'KTV',
        emergencyContactName: 'Người thân',
        emergencyContactPhone: '0907654321',
        avatarUrl: '',
        memberTier: 'Thành viên',
        memberCode: 'MLD-001',
        points: 350,
        validUntil: '31/12/2026',
      );

      expect(
        F04LoyaltyPointsScreen.formatTransactionPoints('+45', isEn: false),
        '+45 điểm',
      );
      expect(
        F04LoyaltyPointsScreen.isTierRuleActive('Hội viên Tiêu chuẩn', 'STANDARD'),
        isTrue,
      );
      expect(
        F04LoyaltyPointsScreen.isTierRuleActive('Hội viên Tiêu chuẩn', 'Thành viên'),
        isTrue,
      );

      await tester.pumpWidget(
        _buildViApp(const F04LoyaltyPointsScreen()),
      );
      await tester.pump();
      await tester.pump(const Duration(seconds: 2));

      expect(find.byType(F04LoyaltyPointsScreen), findsOneWidget);
      expect(find.text('Điểm thưởng & Hạng hội viên'), findsOneWidget);
      expect(find.text('+45 đ'), findsNothing);
    });

    testWidgets('D06HomeCareGuidelinesScreen renders Tất cả filter chip cleanly', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: D06HomeCareGuidelinesScreen(),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Tất cả'), findsOneWidget);
    });
  });
}
