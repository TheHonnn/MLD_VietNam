import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/models/home_models.dart';

/// Thẻ Dịch vụ Chuẩn Y khoa MLD Việt Nam:
/// - Thiết kế chuẩn 6-3-1: Nền trắng 60%, Nhận diện Navy 30%, CTA Xanh lá 10%
/// - Bỏ viền, nổi bật khối bằng bóng mờ mỏng
/// - Phông chữ Be Vietnam Pro đồng bộ toàn app
class VodderServiceCard extends StatefulWidget {
  final SpaServiceModel? service;
  final VoidCallback onBooking;

  const VodderServiceCard({
    super.key,
    required this.service,
    required this.onBooking,
  });

  @override
  State<VodderServiceCard> createState() => _VodderServiceCardState();
}

class _VodderServiceCardState extends State<VodderServiceCard> {
  String _formatCurrency(double amount) {
    final integerAmount = amount.toInt();
    final str = integerAmount.toString();
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    return str.replaceAllMapped(reg, (Match m) => '${m[1]}.');
  }

  Widget _buildImage(String? imageUrl) {
    final img = imageUrl?.trim() ?? '';
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return Image.network(
        img,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _fallbackImage(),
      );
    }
    return Image.asset(
      img.isNotEmpty ? img : 'assets/images/service_luu_phu_bach_huyet.png',
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => _fallbackImage(),
    );
  }

  Widget _fallbackImage() {
    return Image.asset(
      'assets/images/service_luu_phu_bach_huyet.png',
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(
        color: AppColors.iceBlue,
        child: const Center(
          child: Icon(Icons.spa_rounded, size: 48, color: AppColors.primary),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final service = widget.service;
    final price = service?.displayPrice ?? 700000.0;
    final rawTitle = service?.name?.trim() ?? '';
    final title = rawTitle.isNotEmpty ? rawTitle : context.tr('Lưu phù bạch huyết');
    final duration = service?.durationMinutes ?? 60;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        // BỎ VIỀN, NỔI BẬT KHỐI BẰNG BÓNG MỜ MỎNG
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Ảnh minh họa dịch vụ chuẩn Y khoa MLD
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: widget.onBooking,
              child: SizedBox(
                width: double.infinity,
                height: 195,
                child: _buildImage(service?.imageUrl),
              ),
            ),

            // 2. Nội dung: Tên dịch vụ, Giá tiền và Nút Đặt lịch
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Tên dịch vụ
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: widget.onBooking,
                    child: Text(
                      title,
                      style: GoogleFonts.beVietnamPro(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${_formatCurrency(price)}đ',
                              style: GoogleFonts.beVietnamPro(
                                fontSize: 19,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFFDC2626), // red
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$duration phút / ca',
                              style: GoogleFonts.beVietnamPro(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Nút Đặt lịch: 10% CTA Green #16A34A chuẩn 6-3-1
                      ElevatedButton(
                        onPressed: widget.onBooking,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accent,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Đặt lịch',
                              style: GoogleFonts.beVietnamPro(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Icon(Icons.calendar_month_outlined, size: 17),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
