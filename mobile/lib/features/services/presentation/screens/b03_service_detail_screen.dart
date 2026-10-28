import '../../../../features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/mock_home_repository.dart';
import '../../../directory/presentation/screens/b07_specialist_listing_screen.dart';
import '../../../directory/presentation/screens/b08_specialist_profile_screen.dart';

class B03ServiceDetailScreen extends StatefulWidget {
  final int serviceId;
  final String title;
  final String duration;
  final String price;
  final String? originalPrice;
  final String category;
  final String image;
  final String description;
  final SpaServiceModel? serviceModel;
  final String? serviceCode;

  const B03ServiceDetailScreen({
    super.key,
    this.serviceId = 0,
    this.title = 'Massage thư giãn toàn thân',
    this.duration = '60 phút',
    this.price = '450.000đ',
    this.originalPrice,
    this.category = 'Massage',
    this.image = 'assets/images/gioithieu_1.png',
    this.description =
        'Dành một khoảng lặng cho chính mình với trải nghiệm massage nhẹ nhàng. Nhịp chăm sóc được điều chỉnh theo nhu cầu thư giãn, trong không gian ấm áp và yên tĩnh.',
    this.serviceModel,
    this.serviceCode,
  });

  @override
  State<B03ServiceDetailScreen> createState() => _B03ServiceDetailScreenState();
}

class _B03ServiceDetailScreenState extends State<B03ServiceDetailScreen> {
  bool _isFavorite = false;

  void _showCancellationPolicy() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Chính sách hủy lịch',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                '• Hủy trước 2 tiếng: Miễn phí hoàn toàn.\n'
                '• Hủy trong vòng 2 tiếng hoặc không đến: Phí dịch vụ có thể được tính theo quy định.\n'
                '• Khách hàng có thể đổi giờ hẹn tối đa 1 lần trong ngày.',
                style: TextStyle(
                  fontSize: 14,
                  height: 1.6,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: const Text(
                    'Đã hiểu',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textInverse,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: Column(
          children: [
            // SCROLLABLE CONTENT
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- 1. HERO IMAGE WITH FLOATING BUTTONS ---
                    Stack(
                      children: [
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(
                            bottom: Radius.circular(24),
                          ),
                          child: SizedBox(
                            width: double.infinity,
                            height: 280,
                            child: widget.image.startsWith('http')
                                ? Image.network(
                                    widget.image,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: AppColors.surfaceSecondary,
                                      child: const Center(
                                        child: Icon(Icons.spa, size: 64, color: AppColors.primary),
                                      ),
                                    ),
                                  )
                                : Image.asset(
                                    widget.image,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: AppColors.surfaceSecondary,
                                      child: const Center(
                                        child: Icon(Icons.spa, size: 64, color: AppColors.primary),
                                      ),
                                    ),
                                  ),
                          ),
                        ),
                        // Top back button & Action buttons
                        Positioned(
                          top: 16,
                          left: 16,
                          child: InkWell(
                            onTap: () => Navigator.pop(context),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.1),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              alignment: Alignment.center,
                              child: const Icon(
                                Icons.arrow_back,
                                color: AppColors.textPrimary,
                                size: 22,
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 16,
                          right: 16,
                          child: Row(
                            children: [
                              // Favorite
                              InkWell(
                                onTap: () {
                                  setState(() {
                                    _isFavorite = !_isFavorite;
                                  });
                                },
                                borderRadius: BorderRadius.circular(14),
                                child: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    borderRadius: BorderRadius.circular(14),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.1),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  alignment: Alignment.center,
                                  child: Icon(
                                    _isFavorite
                                        ? Icons.favorite_rounded
                                        : Icons.favorite_border_rounded,
                                    color: _isFavorite
                                        ? AppColors.primary
                                        : AppColors.textSecondary,
                                    size: 22,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              // Share
                              InkWell(
                                onTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Đã sao chép liên kết chia sẻ dịch vụ'),
                                      duration: Duration(seconds: 2),
                                    ),
                                  );
                                },
                                borderRadius: BorderRadius.circular(14),
                                child: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    borderRadius: BorderRadius.circular(14),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.1),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  alignment: Alignment.center,
                                  child: const Icon(
                                    Icons.share_outlined,
                                    color: AppColors.textPrimary,
                                    size: 22,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // --- 2. SERVICE MAIN INFO ---
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Category Chip
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              widget.category,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textInverse,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Title
                          Text(
                            widget.title,
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w600,
                              height: 34 / 26,
                              color: AppColors.textHeading, // #693B20
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Price & Duration
                          Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              if (widget.originalPrice != null && widget.originalPrice!.isNotEmpty) ...[
                                Text(
                                  widget.originalPrice!,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w400,
                                    color: AppColors.textSecondary,
                                    decoration: TextDecoration.lineThrough,
                                  ),
                                ),
                              ],
                              Text(
                                widget.price.contains('/buổi') ? widget.price : '${widget.price} / buổi',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.servicePrice,
                                ),
                              ),
                              Container(
                                width: 4,
                                height: 4,
                                decoration: const BoxDecoration(
                                  color: AppColors.border,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              Text(
                                widget.duration,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 24),
                          const Divider(color: AppColors.border, height: 1),
                          const SizedBox(height: 20),

                          // --- 3. GIỚI THIỆU DỊCH VỤ ---
                          const Text(
                            'Giới thiệu dịch vụ',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            widget.description,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              height: 22 / 14,
                              color: AppColors.textSecondary,
                            ),
                          ),

                          const SizedBox(height: 24),

                          // --- 4. TRẢI NGHIỆM NỔI BẬT ---
                          const Text(
                            'Trải nghiệm nổi bật',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildHighlightItem('Thư giãn cơ thể.'),
                          const SizedBox(height: 8),
                          _buildHighlightItem('Giảm cảm giác căng thẳng.'),
                          const SizedBox(height: 8),
                          _buildHighlightItem('Trải nghiệm không gian chăm sóc chuyên nghiệp.'),

                          const SizedBox(height: 24),

                          // --- 5. QUY TRÌNH TRẢI NGHIỆM ---
                          const Text(
                            'Quy trình trải nghiệm',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildProcessStep(1, 'Tư vấn nhu cầu.'),
                          const SizedBox(height: 10),
                          _buildProcessStep(2, 'Chuẩn bị dịch vụ.'),
                          const SizedBox(height: 10),
                          _buildProcessStep(3, 'Trải nghiệm chăm sóc.'),
                          const SizedBox(height: 10),
                          _buildProcessStep(4, 'Hướng dẫn sau dịch vụ.'),

                          const SizedBox(height: 24),

                          // --- 6. THÔNG TIN CẦN BIẾT ---
                          const Text(
                            'Thông tin cần biết',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 10),
                          _buildInfoBullet('Thời lượng: ${widget.duration}.'),
                          const SizedBox(height: 8),
                          _buildInfoBullet('Chuẩn bị: đến trước 10 phút, mặc trang phục thoải mái.'),
                          const SizedBox(height: 8),
                          _buildInfoBullet(
                            'Lưu ý: chia sẻ mức lực mong muốn và các vùng nhạy cảm với chuyên viên. '
                            'Nếu có vấn đề sức khỏe, hãy tham khảo ý kiến chuyên môn trước khi đặt lịch.',
                          ),
                          const SizedBox(height: 8),
                          _buildInfoBullet(
                            'Chi nhánh phục vụ: Chi nhánh Quận 3, Chi nhánh Cầu Giấy.',
                          ),
                          const SizedBox(height: 14),

                          // Nút "Chính sách hủy lịch"
                          InkWell(
                            onTap: _showCancellationPolicy,
                            child: const Row(
                              children: [
                                Icon(Icons.info_outline_rounded, size: 18, color: AppColors.primary),
                                SizedBox(width: 6),
                                Text(
                                  'Chính sách hủy lịch',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 28),

                          // --- 7. CHUYÊN VIÊN GỢI Ý ---
                          const Text(
                            'Chuyên viên gợi ý',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(12),
                                      child: Image.asset(
                                        'assets/images/specialist_avatar_2.png',
                                        width: 70,
                                        height: 82,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => Container(
                                          width: 70,
                                          height: 82,
                                          color: AppColors.surfaceSecondary,
                                          child: const Icon(Icons.person, color: AppColors.primary),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'Trần Minh Phương',
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.textHeading,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          const Text(
                                            'Kỹ thuật viên massage',
                                            style: TextStyle(
                                              fontSize: 13,
                                              color: AppColors.primary,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: AppColors.surfaceSecondary,
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: const Text(
                                              'Thông tin chuyên viên',
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: AppColors.textSecondary,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          const Text(
                                            'Massage thư giãn · Chăm sóc tận tâm',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton(
                                        style: OutlinedButton.styleFrom(
                                          side: const BorderSide(color: AppColors.primary),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          padding: const EdgeInsets.symmetric(vertical: 10),
                                        ),
                                        onPressed: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => const B08SpecialistProfileScreen(
                                                name: 'Trần Minh Phương',
                                                role: 'Kỹ thuật viên massage',
                                                avatar: 'assets/images/specialist_avatar_2.png',
                                              ),
                                            ),
                                          );
                                        },
                                        child: const Text(
                                          'Xem hồ sơ',
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: OutlinedButton(
                                        style: OutlinedButton.styleFrom(
                                          side: const BorderSide(color: AppColors.border),
                                          backgroundColor: AppColors.surfaceSecondary,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          padding: const EdgeInsets.symmetric(vertical: 10),
                                        ),
                                        onPressed: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => const B07SpecialistListingScreen(),
                                            ),
                                          );
                                        },
                                        child: const Text(
                                          'Xem chuyên viên',
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.textHeading,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // --- 8. FIXED BOTTOM BOOKING BAR ---
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: const Border(
                  top: BorderSide(color: AppColors.border, width: 1.0),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (widget.originalPrice != null && widget.originalPrice!.isNotEmpty) ...[
                            Text(
                              widget.originalPrice!,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textSecondary,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          Text(
                            widget.price,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AppColors.servicePrice,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        widget.duration,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        onPressed: () async {
                          // 1. Xác định hoặc tái tạo SpaServiceModel tương ứng
                          SpaServiceModel? effectiveService = widget.serviceModel;

                          if (effectiveService == null) {
                            final allServices = MockHomeRepository.getFeaturedServices();
                            try {
                              effectiveService = allServices.firstWhere(
                                (s) => (widget.serviceCode != null && s.id == widget.serviceCode) ||
                                       s.name.toLowerCase().trim() == widget.title.toLowerCase().trim() ||
                                       s.name.toLowerCase().contains(widget.title.toLowerCase()) ||
                                       widget.title.toLowerCase().contains(s.name.toLowerCase()),
                              );
                            } catch (_) {}
                          }

                          if (effectiveService == null) {
                            // Helper bóc tách số từ chuỗi tiền tệ (ví dụ "450.000đ" -> 450000.0)
                            double parseMoney(String text) {
                              final digits = text.replaceAll(RegExp(r'\D'), '');
                              return double.tryParse(digits) ?? 0.0;
                            }

                            // Helper bóc tách thời lượng phút từ chuỗi (ví dụ "60 phút" -> 60)
                            int parseDuration(String text) {
                              final digits = text.replaceAll(RegExp(r'\D'), '');
                              return int.tryParse(digits) ?? 60;
                            }

                            final hasOriginalPrice = widget.originalPrice != null && widget.originalPrice!.isNotEmpty;
                            final double regularPrice = hasOriginalPrice
                                ? parseMoney(widget.originalPrice!)
                                : parseMoney(widget.price);
                            final double? promoPrice = hasOriginalPrice
                                ? parseMoney(widget.price)
                                : null;

                            effectiveService = SpaServiceModel(
                              id: widget.serviceCode ?? (widget.serviceId > 0 ? 'srv-${widget.serviceId.toString().padLeft(3, '0')}' : 'srv-custom'),
                              name: widget.title,
                              categoryName: widget.category,
                              price: regularPrice > 0 ? regularPrice : 450000.0,
                              discountPrice: promoPrice,
                              durationMinutes: parseDuration(widget.duration),
                              imageUrl: widget.image,
                              shortDescription: widget.description,
                              fullDescription: widget.description,
                              isFeatured: true,
                            );
                          }

                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => AllInOneBookingScreen(
                                initialService: effectiveService,
                              ),
                            ),
                          );
                        },
                        child: const Text(
                          'Đặt lịch ngay',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textInverse,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHighlightItem(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 18),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textPrimary,
              height: 20 / 14,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProcessStep(int stepNumber, String text) {
    return Row(
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: AppColors.surfaceSecondary,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.border),
          ),
          alignment: Alignment.center,
          child: Text(
            '$stepNumber',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoBullet(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('• ', style: TextStyle(color: AppColors.primary, fontSize: 16)),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 19 / 13,
            ),
          ),
        ),
      ],
    );
  }
}
