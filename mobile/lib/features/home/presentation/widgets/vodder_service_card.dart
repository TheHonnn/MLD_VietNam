import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/models/home_models.dart';

/// Thẻ Dịch vụ Chuẩn Y khoa MLD Việt Nam:
/// - Thiết kế tối giản theo chuẩn Trang Tài liệu: Ảnh, Tên dịch vụ, Giá tiền và Nút Đặt lịch
/// - Màu sắc đồng bộ thương hiệu #2860EB (Xanh dương MLD), không dùng xanh lá
/// - Bo viền vuông, bo tròn nhẹ 8px
/// - Phông chữ 100% Montserrat
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
  bool _isPressed = false;

  String _formatCurrency(double amount) {
    final integerAmount = amount.toInt();
    final str = integerAmount.toString();
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    return str.replaceAllMapped(reg, (Match m) => '${m[1]}.');
  }

  @override
  Widget build(BuildContext context) {
    final service = widget.service;
    final priceWithVat = service?.priceWithVat ?? 702000.0;
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
        child: InkWell(
          onTapDown: (_) => setState(() => _isPressed = true),
          onTapCancel: () => setState(() => _isPressed = false),
          onTap: () {
            setState(() => _isPressed = true);
            widget.onBooking();
            Future.delayed(const Duration(milliseconds: 300), () {
              if (mounted) setState(() => _isPressed = false);
            });
          },
          borderRadius: BorderRadius.circular(8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Ảnh minh họa dịch vụ
              SizedBox(
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

              // 2. Nội dung: Chỉ Tên dịch vụ, Giá tiền và Chữ Đặt lịch (Không chữ thừa)
              Padding(
                padding: const EdgeInsets.all(14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Tên dịch vụ (Bình thường: Đen in đậm | Khi chạm: Đổi sang #2860EB)
                    AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 150),
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: _isPressed ? AppColors.primary : const Color(0xFF0F172A),
                        height: 1.35,
                      ),
                      child: Text(title),
                    ),

                    const SizedBox(height: 12),
                    const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),
                    const SizedBox(height: 12),

                    // Hàng Giá tiền và Nút Đặt lịch
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Giá tiền (Màu xanh dương chủ đạo #2860EB, chữ đ gạch chân)
                        Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: '${_formatCurrency(priceWithVat)} ',
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                              const TextSpan(
                                text: 'đ',
                                style: TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Nút Đặt lịch (Màu xám nhạt, chạm vào chuyển sang xanh dương #2860EB)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8.5),
                          decoration: BoxDecoration(
                            color: _isPressed ? AppColors.primary : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: _isPressed ? AppColors.primary : const Color(0xFFE2E8F0),
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
                                  color: _isPressed ? Colors.white : const Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.calendar_month_outlined,
                                size: 14,
                                color: _isPressed ? Colors.white : const Color(0xFF0F172A),
                              ),
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
      ),
    );
  }
}
