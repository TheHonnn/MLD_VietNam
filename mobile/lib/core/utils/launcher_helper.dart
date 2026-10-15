import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

/// Helper utility for native interactions: Phone calls, Maps navigation, Web links, and Sharing.
class AppLauncherHelper {
  AppLauncherHelper._();

  /// Make a phone call to [phoneNumber]
  static Future<bool> makePhoneCall(BuildContext context, String phoneNumber) async {
    final cleanPhone = phoneNumber.replaceAll(RegExp(r'[\s\.\-\(\)]'), '');
    final uri = Uri(scheme: 'tel', path: cleanPhone);

    try {
      if (await canLaunchUrl(uri)) {
        return await launchUrl(uri);
      } else {
        // Fallback for some Android/iOS versions
        return await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('[AppLauncherHelper] Error making phone call: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Không thể gọi đến $phoneNumber. Vui lòng thử lại sau!'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return false;
    }
  }

  /// Open external Web URL
  static Future<bool> openWebUrl(BuildContext context, String url) async {
    String formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://$formattedUrl';
    }

    final uri = Uri.parse(formattedUrl);
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint('[AppLauncherHelper] Error opening URL: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Không thể mở liên kết: $url'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return false;
    }
  }

  /// Open address or GPS coordinates in Google Maps / Apple Maps
  static Future<bool> openMapLocation(
    BuildContext context, {
    double? latitude,
    double? longitude,
    String? address,
    String? label,
  }) async {
    Uri? uri;

    if (latitude != null && longitude != null) {
      if (!kIsWeb && Platform.isIOS) {
        // Apple Maps
        final query = label != null ? Uri.encodeComponent(label) : '$latitude,$longitude';
        uri = Uri.parse('http://maps.apple.com/?ll=$latitude,$longitude&q=$query');
      } else {
        // Android Google Maps
        final query = label != null ? Uri.encodeComponent(label) : '$latitude,$longitude';
        uri = Uri.parse('geo:$latitude,$longitude?q=$latitude,$longitude($query)');
      }
    } else if (address != null && address.isNotEmpty) {
      final encodedAddress = Uri.encodeComponent(address);
      if (!kIsWeb && Platform.isIOS) {
        uri = Uri.parse('http://maps.apple.com/?q=$encodedAddress');
      } else {
        uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$encodedAddress');
      }
    }

    if (uri == null) return false;

    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        // Fallback to Google Maps Web
        final fallbackQuery = (latitude != null && longitude != null)
            ? '$latitude,$longitude'
            : Uri.encodeComponent(address ?? '');
        final fallbackUri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$fallbackQuery');
        return await launchUrl(fallbackUri, mode: LaunchMode.externalApplication);
      }
      return true;
    } catch (e) {
      debugPrint('[AppLauncherHelper] Error opening map: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể mở bản đồ chỉ đường trên thiết bị này.'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return false;
    }
  }

  /// Share text / referral code / link across apps
  static Future<void> shareContent(
    BuildContext context, {
    required String text,
    String? subject,
    Rect? sharePositionOrigin,
  }) async {
    try {
      final box = context.findRenderObject() as RenderBox?;
      final origin = sharePositionOrigin ??
          (box != null ? box.localToGlobal(Offset.zero) & box.size : null);

      await Share.share(
        text,
        subject: subject,
        sharePositionOrigin: origin,
      );
    } catch (e) {
      debugPrint('[AppLauncherHelper] Error sharing: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể kích hoạt chia sẻ trên thiết bị này.'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }
}

