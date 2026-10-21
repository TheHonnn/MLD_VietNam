import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../booking/data/models/booking_models.dart';
import '../../../booking/presentation/screens/c01_service_selection_screen.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/mock_home_repository.dart';
import '../../../services/presentation/screens/b03_service_detail_screen.dart';
import 'b06_branch_detail_screen.dart';

class B08SpecialistProfileScreen extends StatefulWidget {
  final String name;
  final String role;
  final String avatar;

  const B08SpecialistProfileScreen({
    super.key,
    this.name = 'Trần Minh Phương',
    this.role = 'Kỹ thuật viên massage',
    this.avatar = 'assets/images/specialist_hero_1.png',
  });

  @override
  State<B08SpecialistProfileScreen> createState() => _B08SpecialistProfileScreenState();
}

class _B08SpecialistProfileScreenState extends State<B08SpecialistProfileScreen> {
  final List<String> _specialties = [
    'Massage thư giãn',
    'Điều chỉnh lực phù hợp',
    'Hướng dẫn thư giãn',
  ];

  final List<Map<String, dynamic>> _schedule = [
    {
      'date': '12/10/2026',
      'slots': ['09:00', '11:00', '14:00'],
    },
    {
      'date': '13/10/2026',
      'slots': ['09:00', '11:00', '14:00'],
    },
    {
      'date': '14/10/2026',
      'slots': ['09:00', '11:00', '14:00'],
    },
    {
      'date': '15/10/2026',
      'slots': ['09:00', '11:00', '14:00'],
    },
    {
      'date': '16/10/2026',
      'slots': ['09:00', '11:00', '14:00'],
    },
    {
      'date': '17/10/2026',
      'slots': ['09:00', '11:00', '14:00'],
    },
    {
      'date': '18/10/2026',
      'isOff': true,
    },
  ];

  final List<Map<String, String>> _reviews = [
    {
      'author': 'Minh Anh',
      'rating': '5/5',
      'comment': 'Không gian thư giãn, chuyên viên hướng dẫn tận tình.',
    },
    {
      'author': 'Ngọc Linh',
      'rating': '4/5',
      'comment': 'Dịch vụ chu đáo, trải nghiệm dễ chịu.',
    },
    {
      'author': 'Thanh Mai',
      'rating': '5/5',
      'comment': 'Quy trình rõ ràng, tôi cảm thấy thoải mái.',
    },
  ];

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
                    // --- 2. SPECIALIST HERO AVATAR WITH BACK BUTTON ---
                    Stack(
                      children: [
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(
                            bottom: Radius.circular(24),
                          ),
                          child: SizedBox(
                            width: double.infinity,
                            height: 292,
                            child: widget.avatar.startsWith('http')
                                ? Image.network(
                                    widget.avatar,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: AppColors.surfaceSecondary,
                                      child: const Center(
                                        child: Icon(Icons.person, size: 80, color: AppColors.primary),
                                      ),
                                    ),
                                  )
                                : Image.asset(
                                    widget.avatar,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: AppColors.surfaceSecondary,
                                      child: const Center(
                                        child: Icon(Icons.person, size: 80, color: AppColors.primary),
                                      ),
                                    ),
                                  ),
                          ),
                        ),
                        // Floating Back Button
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
                      ],
                    ),

                    // --- CONTENT WRAPPED IN PADDING (20px) ---
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // --- 3. SPECIALIST HEADER & ROLE ---
                          Text(
                            widget.name,
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading, // #693B20
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.role,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                              color: AppColors.primary,
                            ),
                          ),

                    const SizedBox(height: 10),

                    // Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSecondary,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Chuyên viên chăm sóc chuyên nghiệp',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Branch & Address
                    const Text(
                      'Chi nhánh Quận 3',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      '123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 24),
                    const Divider(color: AppColors.border, height: 1),
                    const SizedBox(height: 20),

                    // --- 4. GIỚI THIỆU ---
                    const Text(
                      'Giới thiệu',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Phương là chuyên viên chăm sóc giàu kinh nghiệm, chu đáo và tận tâm tại MLD. '
                      'Luôn lắng nghe nhu cầu thư giãn và hướng dẫn từng bước để khách cảm thấy thoải mái.',
                      style: TextStyle(
                        fontSize: 14,
                        height: 22 / 14,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 5. CHUYÊN MÔN ---
                    const Text(
                      'Chuyên môn',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _specialties.map((s) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Text(
                            s,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 24),

                    // --- 6. KINH NGHIỆM ---
                    const Text(
                      'Kinh nghiệm',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      '4 năm kinh nghiệm',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Không phải chứng nhận hoặc kinh nghiệm đã xác thực.',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 7. DỊCH VỤ PHỤ TRÁCH ---
                    const Text(
                      'Dịch vụ phụ trách',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Massage thư giãn toàn thân',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Row(
                            children: [
                              Text(
                                '60 phút',
                                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                              ),
                              SizedBox(width: 12),
                              Text(
                                '450.000đ',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Thả lỏng cơ thể trong không gian yên tĩnh.',
                            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            height: 40,
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.primary),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const B03ServiceDetailScreen(),
                                  ),
                                );
                              },
                              child: const Text(
                                'Xem chi tiết',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 8. LỊCH LÀM VIỆC ---
                    const Text(
                      'Lịch làm việc',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      '12/10/2026–18/10/2026',
                      style: TextStyle(fontSize: 13, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Lịch làm việc trong tuần',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    ..._schedule.map((sch) {
                      final isOff = sch['isOff'] == true;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              sch['date'] as String,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            if (isOff)
                              const Text(
                                'Nghỉ ',
                                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                              )
                            else
                              Wrap(
                                spacing: 8,
                                children: (sch['slots'] as List<String>).map((slot) {
                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: AppColors.surface,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: AppColors.border),
                                    ),
                                    child: Text(
                                      slot,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                          ],
                        ),
                      );
                    }),

                    const SizedBox(height: 20),

                    // --- 9. ĐÁNH GIÁ TỪ KHÁCH HÀNG ---
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            'Đánh giá từ khách hàng',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                        ),
                        SizedBox(width: 8),
                        Text(
                          '★ 4,7/5',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Nhận xét từ các khách hàng đã trải nghiệm',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    ..._reviews.map((rev) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    rev['author']!,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                                Row(
                                  children: [
                                    const Icon(Icons.star_rounded, size: 16, color: AppColors.primary),
                                    const SizedBox(width: 4),
                                    Text(
                                      rev['rating']!,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              rev['comment']!,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),

                    const SizedBox(height: 16),

                    // Button "Xem chi nhánh làm việc"
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const B06BranchDetailScreen(),
                            ),
                          );
                        },
                        child: const Text(
                          'Xem chi nhánh làm việc',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
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

            // --- 10. FIXED BOTTOM CTA ---
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(
                  top: BorderSide(color: AppColors.border, width: 1.0),
                ),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  onPressed: () {
                    TechnicianModel? matchedSpec;
                    final topSpecs = MockHomeRepository.getTopTechnicians();
                    try {
                      matchedSpec = topSpecs.firstWhere((s) => s.name == widget.name);
                    } catch (_) {}

                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => C01ServiceSelectionScreen(
                          flowState: BookingFlowState(
                            selectedSpecialist: matchedSpec,
                            autoAssignSpecialist: matchedSpec == null,
                          ),
                        ),
                      ),
                    );
                  },
                  child: const Text(
                    'Đặt lịch với chuyên viên',
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
    );
  }
}
