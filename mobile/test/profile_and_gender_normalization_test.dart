import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:medical_healthcare_app/features/membership/data/models/membership_models.dart';
import 'package:medical_healthcare_app/features/membership/data/repositories/membership_repository.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f02_edit_profile_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Widget buildTestWidget() {
    return const MaterialApp(
      locale: Locale('vi'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: F02EditProfileScreen(),
    );
  }

  group('Profile and Gender Normalization Tests', () {
    testWidgets('F02EditProfileScreen opens and renders properly even if gender is FEMALE', (tester) async {
      MembershipRepository.instance.syncUserSession(
        fullName: 'Nguyễn Văn Test',
        phone: '0987654321',
        email: 'test@mldvietnam.vn',
      );
      
      final currentProfile = MembershipRepository.instance.profile;
      await MembershipRepository.instance.updateProfile(
        currentProfile.copyWith(
          gender: 'FEMALE',
          dateOfBirth: '1995-10-25',
          address: '123 Đường Mẫu, Q1, HCM',
        ),
      );

      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.byType(F02EditProfileScreen), findsOneWidget);
      expect(find.text('Nguyễn Văn Test'), findsWidgets);
      expect(find.text('25/10/1995'), findsOneWidget);
    });

    testWidgets('F02EditProfileScreen handles MALE and OTHER gender values cleanly', (tester) async {
      final currentProfile = MembershipRepository.instance.profile;
      await MembershipRepository.instance.updateProfile(
        currentProfile.copyWith(
          gender: 'MALE',
          dateOfBirth: '2000-01-15',
        ),
      );

      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.byType(F02EditProfileScreen), findsOneWidget);
      expect(find.text('15/01/2000'), findsOneWidget);
    });
  });
}
