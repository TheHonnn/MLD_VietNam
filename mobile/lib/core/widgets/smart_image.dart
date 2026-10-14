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

    if (imageUrl.startsWith('assets/')) {
      imageWidget = Image.asset(
        imageUrl,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (_, __, ___) => _buildFallback(),
      );
    } else {
      imageWidget = Image.network(
        imageUrl,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (_, __, ___) => _buildFallback(),
      );
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

