import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/localization/locale_cubit.dart';
import 'core/services/auth_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/screens/a01_splash_screen.dart';
import 'features/home/data/repositories/branch_repository.dart';
import 'core/services/portal_settings_service.dart';
import 'l10n/app_localizations.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Session & Authentication Service
  await AuthService.instance.init();

  // Initialize Global Branch Repository
  await BranchRepository.instance.init();
  
  // Initialize Portal Settings & Dynamic Taxonomies
  await PortalSettingsService.instance.init();
  
  // Guard against Android/Samsung Accessibility semantics desynchronization
  FlutterError.onError = (FlutterErrorDetails details) {
    final msg = details.exceptionAsString();
    if (msg.contains('semantics.parentDataDirty') ||
        msg.contains('Looking up a deactivated widget') ||
        msg.contains('didChangeAccessibilityFeatures')) {
      // Suppress semantics race conditions caused by Samsung accessibility services
      return;
    }
    FlutterError.presentError(details);
  };

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const MedicalHealthcareApp());
}

class MedicalHealthcareApp extends StatelessWidget {
  const MedicalHealthcareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<LocaleCubit>(
      create: (_) => LocaleCubit(),
      child: BlocBuilder<LocaleCubit, Locale>(
        builder: (context, locale) {
          return MaterialApp(
            title: 'MLD Việt Nam',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            locale: locale,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: const A01SplashScreen(),
            builder: (context, child) {
              final mediaQuery = MediaQuery.of(context);
              // Tối ưu tỷ lệ hiển thị toàn bộ app gọn gàng, tinh tế:
              // Giảm nhẹ ~10% font scaling trên các màn hình Android/Samsung DPI cao
              // để vừa vặn, hiển thị nhiều thông tin hơn mà không bị phóng to.
              return MediaQuery(
                data: mediaQuery.copyWith(
                  textScaler: TextScaler.linear(
                    (mediaQuery.textScaler.scale(1.0) * 0.90).clamp(0.82, 0.92),
                  ),
                ),
                child: child!,
              );
            },
          );
        },
      ),
    );
  }
}
