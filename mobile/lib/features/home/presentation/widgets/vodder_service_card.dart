import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/home_models.dart';

/// Thẻ Dịch vụ Chuẩn Y khoa MLD Việt Nam - Đồng bộ 100% phong cách Trang Đào tạo:
/// - Ít chữ, không giải thích, không note chi tiết
/// - Chỉ gồm: Ảnh, Tên dịch vụ, Giá tiền và Nút Đặt lịch
/// - Tương tác chạm: Tiêu đề và Nút đổi sang màu xanh lá thương hiệu (#168477)
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
    final title = service?.name ?? 'Điều trị dẫn lưu phù bạch huyết chuyên sâu (Vodder MLD)';

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
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
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Ảnh minh họa dịch vụ (chuẩn tỷ lệ như trang Đào tạo)
              SizedBox(
                width: double.infinity,
                height: 185,
                child: Image.asset(
                  'assets/images/course_banner_clean.png',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: const Color(0xFFE8F5F1),
                    child: const Center(
                      child: Icon(Icons.spa_rounded, size: 48, color: Color(0xFF168477)),
                    ),
                  ),
                ),
              ),

              // 2. Nội dung: Chỉ Tên dịch vụ, Giá tiền và Chữ Đặt lịch
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Tên dịch vụ (Đen in đậm, khi bấm đổi sang xanh lá)
                    AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 150),
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: _isPressed ? const Color(0xFF168477) : const Color(0xFF0F172A),
                        height: 1.35,
                      ),
                      child: Text(title),
                    ),

                    const SizedBox(height: 14),
                    const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),
                    const SizedBox(height: 14),

                    // Hàng Giá tiền và Nút Đặt lịch
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Giá tiền (Xanh lá đậm, chữ đ gạch chân)
                        Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: '${_formatCurrency(priceWithVat)} ',
                                style: const TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF00693F),
                                ),
                              ),
                              const TextSpan(
                                text: 'đ',
                                style: TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF00693F),
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Nút Đặt lịch (Màu xám nhạt, bấm vào chuyển sang xanh lá)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8.5),
                          decoration: BoxDecoration(
                            color: _isPressed ? const Color(0xFF168477) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: _isPressed ? const Color(0xFF168477) : const Color(0xFFE2E8F0),
                              width: 1.0,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Đặt lịch',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _isPressed ? Colors.white : const Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.arrow_forward_rounded,
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

