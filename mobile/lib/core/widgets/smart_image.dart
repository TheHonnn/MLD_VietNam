import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class SmartImage extends StatelessWidget {
  final String imageUrl;
  final BoxFit fit;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;
  final Widget? placeholder;

  const SmartImage({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.borderRadius,
    this.placeholder,
  });

  @override
  Widget build(BuildContext context) {
    Widget imageWidget;
    final trimmed = imageUrl.trim();

    if (trimmed.isEmpty) {
      imageWidget = _buildFallback();
    } else if (trimmed.startsWith('data:image') || trimmed.contains(';base64,')) {
      try {
        final commaIndex = trimmed.indexOf(',');
        final base64Str = commaIndex != -1 ? trimmed.substring(commaIndex + 1).trim() : trimmed;
        final bytes = base64Decode(base64Str);
        imageWidget = Image.memory(
          bytes,
          fit: fit,
          width: width,
          height: height,
          errorBuilder: (_, __, ___) => _buildFallback(),
        );
      } catch (_) {
        imageWidget = _buildFallback();
      }
    } else if (trimmed.startsWith('assets/')) {
      imageWidget = Image.asset(
        trimmed,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (_, __, ___) => _buildFallback(),
      );
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      imageWidget = Image.network(
        trimmed,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (_, __, ___) => _buildFallback(),
      );
    } else {
      try {
        final file = File(trimmed);
        if (file.existsSync()) {
          imageWidget = Image.file(
            file,
            fit: fit,
            width: width,
            height: height,
            errorBuilder: (_, __, ___) => _buildFallback(),
          );
        } else {
          // Thử decode nếu là chuỗi base64 trần (không có data: prefix)
          if (trimmed.length > 100 && !trimmed.contains('/') && !trimmed.contains('\\')) {
            final bytes = base64Decode(trimmed);
            imageWidget = Image.memory(
              bytes,
              fit: fit,
              width: width,
              height: height,
              errorBuilder: (_, __, ___) => _buildFallback(),
            );
          } else {
            imageWidget = _buildFallback();
          }
        }
      } catch (_) {
        imageWidget = _buildFallback();
      }
    }

    if (borderRadius != null) {
      return ClipRRect(
        borderRadius: borderRadius!,
        child: imageWidget,
      );
    }

    return imageWidget;
  }

  Widget _buildFallback() {
    return placeholder ??
        Container(
          width: width,
          height: height,
          color: AppColors.backgroundCard,
          child: const Center(
            child: Icon(
              Icons.spa_rounded,
              color: AppColors.primary,
              size: 32,
            ),
          ),
        );
  }
}

