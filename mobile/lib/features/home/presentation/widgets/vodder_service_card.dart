import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/models/home_models.dart';

/// Thẻ Dịch vụ Chuẩn Y khoa MLD Việt Nam:
/// - Thiết kế mới chuẩn Figma: Ảnh chụp thực tế Lưu phù bạch huyết
/// - Tiêu đề: Lưu phù bạch huyết
/// - Giá tiền: 700.000đ (màu đỏ đậm), 60 phút / ca
/// - Nút Đặt lịch: Màu Dark Teal #0F766E kèm icon lịch
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

  @override
  Widget build(BuildContext context) {
    final service = widget.service;
    final price = service?.displayPrice ?? 700000.0;
    final rawTitle = service?.name ?? 'Lưu phù bạch huyết';
    final title = (rawTitle.toLowerCase().contains('bạch huyết') || rawTitle.toLowerCase().contains('vodder'))
        ? (rawTitle.contains(' - ') ? 'Lưu phù bạch huyết - ${rawTitle.split(' - ').last}' : 'Lưu phù bạch huyết')
        : context.tr(rawTitle);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Ảnh minh họa dịch vụ Lưu phù bạch huyết (Không dùng icon)
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: widget.onBooking,
              child: SizedBox(
                width: double.infinity,
                height: 195,
                child: Image.asset(
                  'assets/images/service_luu_phu_bach_huyet.png',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: AppColors.primaryLight,
                    child: const Center(
                      child: Icon(Icons.spa_rounded, size: 48, color: AppColors.primary),
                    ),
                  ),
                ),
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
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F2942),
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
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFFDC2626), // red
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              '60 phút / ca',
                              style: TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: widget.onBooking,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0F766E), // Dark Teal #0F766E
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Đặt lịch',
                              style: TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            SizedBox(width: 6),
                            Icon(Icons.calendar_month_outlined, size: 18),
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
