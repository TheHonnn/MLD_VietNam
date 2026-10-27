import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/models/home_models.dart';

/// Thẻ Dịch vụ Chuẩn Y khoa MLD Việt Nam:
/// - Thiết kế tối giản: Ảnh, Tên dịch vụ, Giá tiền và Nút Đặt lịch
/// - Tương tác chạm vào nút Đặt lịch: chuyển mượt mà sang gradient xanh rgb(0, 105, 63) -> rgb(0, 140, 80)
/// - Giữ yên nút không bị mở dịch vụ sớm, chỉ chuyển trang khi nhả ngón tay
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
  bool _isButtonPressed = false;

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
    final rawTitle = service?.name ?? 'Điều trị dẫn lưu phù bạch huyết chuyên sâu (Vodder MLD)';
    final title = context.tr(rawTitle);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Ảnh minh họa dịch vụ
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: widget.onBooking,
              child: SizedBox(
                width: double.infinity,
                height: 185,
                child: Image.asset(
                  'assets/images/course_banner_clean.png',
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
              padding: const EdgeInsets.all(14.0),
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
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                        height: 1.35,
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),
                  const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 12),

                  // Hàng Giá tiền và Nút Đặt lịch
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Giá tiền dịch vụ: Màu rgb(225, 29, 72) (#E11D48), chữ đ gạch chân
                      Expanded(
                        child: Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: '${_formatCurrency(price)} ',
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.servicePrice,
                                ),
                              ),
                              const TextSpan(
                                text: 'đ',
                                style: TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.servicePrice,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Nút Đặt lịch (chạm vào đổi sang gradient xanh mượt mà, giữ yên không mở trang)
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTapDown: (_) => setState(() => _isButtonPressed = true),
                        onTapUp: (_) {
                          setState(() => _isButtonPressed = false);
                          widget.onBooking();
                        },
                        onTapCancel: () => setState(() => _isButtonPressed = false),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          curve: Curves.easeInOut,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8.5),
                          decoration: BoxDecoration(
                            gradient: _isButtonPressed ? AppColors.greenActionGradient : null,
                            color: _isButtonPressed ? null : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: _isButtonPressed ? const Color(0xFF00693F) : const Color(0xFFE2E8F0),
                              width: 1.0,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                context.tr('Đặt lịch', 'Book Now'),
                                style: TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700,
                                  color: _isButtonPressed ? Colors.white : const Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.calendar_month_outlined,
                                size: 14,
                                color: _isButtonPressed ? Colors.white : const Color(0xFF0F172A),
                              ),
                            ],
                          ),
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
