import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:medical_healthcare_app/core/localization/locale_cubit.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:medical_healthcare_app/core/services/portal_settings_service.dart';
import 'package:medical_healthcare_app/features/academy/data/repositories/academy_repository.dart';
import 'package:medical_healthcare_app/features/admin/presentation/screens/admin_catalog_screen.dart';
import 'package:medical_healthcare_app/features/booking/data/models/booking_models.dart';
import 'package:medical_healthcare_app/features/booking/data/repositories/booking_repository.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:medical_healthcare_app/features/home/data/models/home_models.dart';
import 'package:medical_healthcare_app/features/membership/presentation/screens/f08_settings_screen.dart';
import 'package:medical_healthcare_app/features/services/presentation/screens/b03_service_detail_screen.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

Widget _wrapWithApp(Widget child) {
  return BlocProvider(
    create: (_) => LocaleCubit(),
    child: MaterialApp(
      locale: const Locale('vi'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: child,
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await AuthService.instance.init();
    await AuthService.instance.logout();
  });

  group('Pre-release QA Audit Fixes Verification', () {
    test('AuthService.saveSession notifies logout listeners when switching userId', () async {
      int resetCalls = 0;
      void listener() => resetCalls++;
      AuthService.instance.addOnLogoutListener(listener);

      await AuthService.instance.saveSession(
        accessToken: 'tok-1',
        userId: '11111111-1111-1111-1111-111111111111',
        role: 'CUSTOMER',
      );
      expect(resetCalls, 0);

      await AuthService.instance.saveSession(
        accessToken: 'tok-2',
        userId: '22222222-2222-2222-2222-222222222222',
        role: 'ADMIN',
      );
      expect(resetCalls, 1);

      AuthService.instance.removeOnLogoutListener(listener);
    });

    test('AcademyRepository does not leak demo user enrollments when unauthenticated', () async {
      final repo = AcademyRepository.instance;
      await Future<void>.delayed(const Duration(milliseconds: 50));
      repo.clearEnrolledCourses();
      await repo.syncUserEnrollmentFromSupabase();
      expect(repo.enrolledCourses, isEmpty);
    });

    test('BookingRepository.parseSupabaseBookingRow preserves user_package_id, clinical completion, and discount fields', () async {
      const pkgId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      final parsedOpen = BookingRepository.instance.parseSupabaseBookingRow({
        'id': 'bk-1',
        'booking_code': 'MLD-PKG-001',
        'branch_id': 'br-1',
        'booking_date': '2026-11-25',
        'start_time': '09:00',
        'end_time': '10:00',
        'status': 'CONFIRMED',
        'session_status': 'NOT_STARTED',
        'is_clinical_completed': false,
        'payment_method': 'MEMBERSHIP_WALLET',
        'payment_status': 'PAID',
        'user_package_id': pkgId,
        'base_total': 500000,
        'discount_amount': 100000,
        'final_price': 0,
        'coupon_id': 'cp-1',
        'special_notes': 'Đặt lịch gói',
      });

      expect(parsedOpen.userPackageId, pkgId);
      expect(parsedOpen.isPackageSession, isTrue);
      expect(parsedOpen.isClinicalCompleted, isFalse);
      expect(parsedOpen.discountAmount, 100000);
      expect(parsedOpen.couponId, 'cp-1');
      expect(parsedOpen.finalPrice, 0);

      BookingRepository.instance.clear();
      await BookingRepository.instance.createAppointment(parsedOpen);
      final openFound = BookingRepository.instance.getOpenBookingForUserPackage(pkgId);
      expect(openFound?.bookingCode, 'MLD-PKG-001');

      final parsedClosed = BookingRepository.instance.parseSupabaseBookingRow({
        'id': 'bk-2',
        'booking_code': 'MLD-PKG-002',
        'status': 'IN_SERVICE',
        'session_status': 'IN_PROGRESS',
        'is_clinical_completed': true,
        'user_package_id': pkgId,
      });
      expect(parsedClosed.isClinicalCompleted, isTrue);
      expect(parsedClosed.status, AppointmentStatus.inService);
    });

    test('AllInOneBookingScreen.resolveTimeSlotsForBranch handles en-dash and null branch fallback', () {
      const enDashBranch = BranchModel(
        id: 'br-en',
        name: 'CN Hà Nội',
        address: 'Hà Nội',
        city: 'Hà Nội',
        phone: '0967786399',
        distanceKm: 1.0,
        openingHours: '08:00 – 20:00',
        rating: 4.9,
        imageUrl: 'assets/images/logo.webp',
        services: ['MLD Vodder'],
      );
      final enDashSlots = AllInOneBookingScreen.resolveTimeSlotsForBranch(enDashBranch);
      expect(enDashSlots.length, 12);
      expect(enDashSlots.first, '08:00 - 09:00');
      expect(enDashSlots.last, '19:00 - 20:00');

      final fallbackSlots = AllInOneBookingScreen.resolveTimeSlotsForBranch(null);
      expect(fallbackSlots.length, 14);
      expect(fallbackSlots.first, '08:00 - 09:00');
      expect(fallbackSlots.last, '21:00 - 22:00');
    });

    testWidgets('F08SettingsScreen hides Delete Account for Guest and shows it for logged-in customer', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(_wrapWithApp(const F08SettingsScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Yêu cầu xuất dữ liệu'), findsOneWidget);
      expect(find.text('Xóa tài khoản'), findsNothing);

      await tester.runAsync(() async {
        await AuthService.instance.saveSession(
          accessToken: 'tok-user',
          userId: '33333333-3333-3333-3333-333333333333',
          role: 'CUSTOMER',
        );
      });
      await tester.pumpWidget(_wrapWithApp(const F08SettingsScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Xóa tài khoản'), findsOneWidget);
    });

    testWidgets('B03ServiceDetailScreen requires login before toggling favorite as Guest', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(_wrapWithApp(const B03ServiceDetailScreen()));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.favorite_border_rounded));
      await tester.pumpAndSettle();

      expect(find.text('Đăng nhập để tiếp tục'), findsOneWidget);
      expect(find.byIcon(Icons.favorite_rounded), findsNothing);
    });

    testWidgets('AdminCatalogScreen renders 5th Banner tab and loads test banners', (tester) async {
      await tester.runAsync(() async {
        await AuthService.instance.saveSession(
          accessToken: 'tok-admin',
          userId: '44444444-4444-4444-4444-444444444444',
          role: 'ADMIN',
        );
      });
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(_wrapWithApp(const AdminCatalogScreen(initialTab: 'BANNERS')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.textContaining('Banner ('), findsOneWidget);
      expect(find.text('Thêm Banner'), findsOneWidget);
      expect(find.text('Khóa Đào tạo Chuyên sâu'), findsOneWidget);
    });

    test('PortalSettingsService.defaultContactChannels keeps 4 channels including TikTok', () {
      final channels = PortalSettingsService.instance.contactChannels;
      expect(channels.length, greaterThanOrEqualTo(4));
      final names = channels.take(4).map((c) => c['name']).toList();
      expect(names, containsAll(['Hotline', 'Zalo', 'Facebook', 'TikTok']));
    });
  });
}
