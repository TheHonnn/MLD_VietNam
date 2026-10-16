import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/services/auth_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/screens/a01_splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Session & Authentication Service
  await AuthService.instance.init();
  
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
    return MaterialApp(
      title: 'MLD Việt Nam',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const A01SplashScreen(),
    );
  }
}

