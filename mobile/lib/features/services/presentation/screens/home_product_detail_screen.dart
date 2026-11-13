import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/services/portal_settings_service.dart';
import '../../../../core/utils/launcher_helper.dart';
import '../../data/models/home_product_model.dart';

class HomeProductDetailScreen extends StatelessWidget {
  final HomeProductModel product;

  const HomeProductDetailScreen({
    super.key,
    required this.product,
  });

  Future<void> _launchContactUrl(BuildContext context, String url) async {
    final uri = Uri.parse(url);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        AppLauncherHelper.openWebUrl(context, url);
      }
    } catch (_) {
      if (context.mounted) {
        AppLauncherHelper.openWebUrl(context, url);
      }
    }
  }

  Widget _buildProductImage() {
    final url = product.imageUrl ?? '';
    if (url.isEmpty) {
      return _buildPlaceholder();
    }
    if (url.startsWith('data:image/') || url.startsWith('data:')) {
      try {
        final commaIdx = url.indexOf(',');
        final base64Str = commaIdx != -1 ? url.substring(commaIdx + 1).trim() : url.trim();
        final bytes = base64Decode(base64Str);
        return Image.memory(
          bytes,
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => _buildPlaceholder(),
        );
      } catch (_) {
        return _buildPlaceholder();
      }
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return Image.network(
        url,
        width: double.infinity,
        height: double.infinity,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => _buildPlaceholder(),
      );
    }
    if (url.startsWith('assets/')) {
      return Image.asset(
        url,
        width: double.infinity,
        height: double.infinity,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => _buildPlaceholder(),
      );
    }
    try {
      if (url.length > 50) {
        final bytes = base64Decode(url.trim());
        return Image.memory(
          bytes,
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => _buildPlaceholder(),
        );
      }
    } catch (_) {}
    return _buildPlaceholder();
  }

  Widget _buildPlaceholder() {
    return Container(
      color: const Color(0xFFF8FAFC),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.inventory_2_outlined, size: 54, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 8),
            Text(
              product.category,
              style: AppTypography.zaloFont(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Chi tiết sản phẩm',
          style: AppTypography.zaloFont(
            fontSize: 16.5,
            fontWeight: FontWeight.w700,
            color: AppColors.textHeading,
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textHeading, size: 19),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              height: 280,
              color: Colors.white,
              padding: const EdgeInsets.all(16),
              child: _buildProductImage(),
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.iceBlue,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      product.category,
                      style: AppTypography.zaloFont(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryNavy,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    product.name,
                    style: AppTypography.zaloFont(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textHeading,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        product.formattedPrice,
                        style: AppTypography.zaloFont(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppColors.servicePrice,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '(${product.unit})',
                        style: AppTypography.zaloFont(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              color: Colors.white,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Thông tin sản phẩm',
                    style: AppTypography.zaloFont(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow('Nhóm sản phẩm', product.category),
                  const Divider(height: 18, color: Color(0xFFF1F5F9)),
                  _buildInfoRow('Đơn vị phân phối', product.unit),
                  if (product.details.isNotEmpty) ...[
                    const Divider(height: 18, color: Color(0xFFF1F5F9)),
                    ...product.details.map((detail) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(top: 3),
                              child: Icon(Icons.check_circle_rounded, size: 15, color: AppColors.accent),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                detail,
                                style: AppTypography.zaloFont(
                                  fontSize: 13.5,
                                  color: AppColors.textHeading,
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        color: Colors.white,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => _launchContactUrl(context, PortalSettingsService.instance.zaloOaUrl),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0068FF),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: Image.asset(
                            'assets/icons/logo-zalo-vector-03.webp',
                            width: 20,
                            height: 20,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => const Icon(Icons.chat_bubble_outline, color: Colors.white, size: 18),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Tư vấn Zalo',
                          style: AppTypography.zaloFont(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: InkWell(
                  onTap: () => _launchContactUrl(context, PortalSettingsService.instance.messengerUrl),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0084FF),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: Image.asset(
                            'assets/icons/mesenger.jpg',
                            width: 20,
                            height: 20,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(Icons.messenger_outline, color: Colors.white, size: 18),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Messenger',
                          style: AppTypography.zaloFont(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTypography.zaloFont(
            fontSize: 13,
            color: AppColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: AppTypography.zaloFont(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textHeading,
          ),
        ),
      ],
    );
  }
}
