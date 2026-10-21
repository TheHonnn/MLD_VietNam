import 'dart:ui';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocaleCubit extends Cubit<Locale> {
  static const String _prefLanguageCodeKey = 'app_language_code';

  LocaleCubit() : super(const Locale('vi')) {
    _loadSavedLocale();
  }

  Future<void> _loadSavedLocale() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedCode = prefs.getString(_prefLanguageCodeKey);

      if (savedCode != null && (savedCode == 'vi' || savedCode == 'en')) {
        emit(Locale(savedCode));
        return;
      }

      // Tự động nhận diện ngôn ngữ hệ điều hành máy
      final deviceLocale = PlatformDispatcher.instance.locale;
      if (deviceLocale.languageCode.toLowerCase().startsWith('en')) {
        emit(const Locale('en'));
      } else {
        emit(const Locale('vi'));
      }
    } catch (_) {
      emit(const Locale('vi'));
    }
  }

  Future<void> setLocale(Locale locale) async {
    if (state.languageCode == locale.languageCode) return;
    emit(locale);

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefLanguageCodeKey, locale.languageCode);
    } catch (_) {}
  }

  Future<void> toggleLocale() async {
    final next = state.languageCode == 'vi' ? const Locale('en') : const Locale('vi');
    await setLocale(next);
  }

  bool get isVietnamese => state.languageCode == 'vi';
  bool get isEnglish => state.languageCode == 'en';
}

