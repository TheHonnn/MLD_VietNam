import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/services/auth_service.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../data/models/treatment_models.dart';
import '../../data/repositories/treatment_repository.dart';

/// Screen D05: Đánh giá dịch vụ & Nhận điểm thưởng (Customer Review Screen)
/// Dành riêng cho Khách hàng: Gửi đánh giá dịch vụ sau trị liệu (+50 điểm thưởng)
/// và xem lại các đánh giá đã gửi cùng phản hồi chính thức từ Ban quản lý chi nhánh MLD (branch_reply).
class D05ServiceReviewScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final String serviceName;
  final String specialistName;
  final String branchName;
  final String sessionInfo;
  final String? bookingId;
  final String? serviceId;
  final String? technicianId;

  const D05ServiceReviewScreen({
    super.key,
    this.onBack,
    this.serviceName = 'Chăm sóc toàn diện chuẩn Y khoa MLD',
    this.specialistName = 'Trần Lan Anh',
    this.branchName = 'Chi nhánh Quận 3 — TP. Hồ Chí Minh',
    this.sessionInfo = 'Buổi hoàn thành gần nhất',
    this.bookingId,
    this.serviceId,
    this.technicianId,
  });

  @override
  State<D05ServiceReviewScreen> createState() => _D05ServiceReviewScreenState();
}

class _D05ServiceReviewScreenState extends State<D05ServiceReviewScreen> with SingleTickerProviderStateMixin {
  final TreatmentRepository _repo = TreatmentRepository.instance;
  late final TabController _tabController;

  int _overallRating = 5;
  bool _isSubmitting = false;
  bool _isLoadingReviews = true;

  String? _resolvedBookingId;
  String? _resolvedServiceId;
  String? _resolvedTechnicianId;
  String? _resolvedServiceName;
  String? _resolvedSpecialistName;
  String? _resolvedBranchName;
  String? _resolvedSessionInfo;

  late final TextEditingController _commentCtrl;
  final Set<String> _selectedTags = {
    'Kỹ thuật viên chu đáo',
    'Giảm đau / Nhẹ nhõm ngay',
    'Không gian sạch sẽ, thơm',
  };

  final List<String> _availableTags = const [
    'Kỹ thuật viên chu đáo',
    'Đúng giờ',
    'Giảm đau / Nhẹ nhõm ngay',
    'Không gian sạch sẽ, thơm',
    'Lực massage vừa vặn',
    'Tư vấn tận tâm',
    'Âm nhạc thư giãn',
    'Dịch vụ chuẩn y khoa',
  ];

  List<ServiceReviewDataModel> _myReviews = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _commentCtrl = TextEditingController(
      text: 'Chuyên viên chu đáo, thao tác nhẹ nhàng chuẩn y khoa MLD và không gian yên tĩnh. Tôi rất hài lòng.',
    );
    _loadLatestAppointment();
    _loadMyReviews();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadLatestAppointment() async {
    if (widget.bookingId != null && widget.bookingId!.isNotEmpty) {
      _resolvedBookingId = widget.bookingId;
      _resolvedServiceId = widget.serviceId;
      _resolvedTechnicianId = widget.technicianId;
      _resolvedServiceName = widget.serviceName;
      _resolvedSpecialistName = widget.specialistName;
      _resolvedBranchName = widget.branchName;
      _resolvedSessionInfo = widget.sessionInfo;
      return;
    }

    try {
      final userId = AuthService.instance.currentUserId ?? '50a941ef-df2f-442e-ad2d-6a60ba6d6bb1';
      final res = await ApiClient.instance.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/bookings',
        queryParameters: {
          'customer_id': 'eq.$userId',
          'select': 'id,service_id,technician_id,appointment_date,time_slot,services(name),technicians(full_name),branches(name)',
          'order': 'created_at.desc',
          'limit': '1',
        },
        options: Options(headers: {
          'apikey': ApiEndpoints.supabaseAnonKey,
          'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
        }),
      );

      if (res.statusCode == 200 && res.data is List && (res.data as List).isNotEmpty) {
        final b = (res.data as List).first as Map<String, dynamic>;
        if (mounted) {
          setState(() {
            _resolvedBookingId = b['id']?.toString();
            _resolvedServiceId = b['service_id']?.toString();
            _resolvedTechnicianId = b['technician_id']?.toString();
            if (b['services'] is Map && b['services']['name'] != null) {
              _resolvedServiceName = b['services']['name'].toString();
            }
            if (b['technicians'] is Map && b['technicians']['full_name'] != null) {
              _resolvedSpecialistName = b['technicians']['full_name'].toString();
            }
            if (b['branches'] is Map && b['branches']['name'] != null) {
              _resolvedBranchName = b['branches']['name'].toString();
            }
            final date = b['appointment_date']?.toString() ?? '';
            final slot = b['time_slot']?.toString() ?? '';
            if (date.isNotEmpty || slot.isNotEmpty) {
              _resolvedSessionInfo = '$date · $slot';
            }
          });
        }
      }
    } catch (e) {
      debugPrint('>>> [_loadLatestAppointment] Error fetching appointment: $e');
    }
  }

  Future<void> _loadMyReviews() async {
    setState(() => _isLoadingReviews = true);
    try {
      final list = await _repo.fetchMyReviews();
      if (mounted) {
        setState(() {
          _myReviews = list;
          _isLoadingReviews = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingReviews = false);
    }
  }

  Future<void> _handleSubmit() async {
    if (_isSubmitting) return;

    if (!AuthService.instance.isAuthenticated || AuthService.instance.isGuest) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng đăng nhập để gửi đánh giá và nhận +50 điểm thưởng.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final effectiveBookingId = _resolvedBookingId ?? widget.bookingId;
      final effectiveServiceId = _resolvedServiceId ?? widget.serviceId;
      final effectiveTechnicianId = _resolvedTechnicianId ?? widget.technicianId;
      final effectiveServiceName = _resolvedServiceName ?? widget.serviceName;
      final effectiveTechnicianName = _resolvedSpecialistName ?? widget.specialistName;

      final result = await _repo.saveReview(
        ServiceReviewDataModel(
          bookingId: effectiveBookingId,
          serviceId: effectiveServiceId,
          technicianId: effectiveTechnicianId,
          overallRating: _overallRating,
          comment: _commentCtrl.text.trim(),
          reviewTags: _selectedTags.toList(),
          photos: const [],
          serviceName: effectiveServiceName,
          technicianName: effectiveTechnicianName,
        ),
      );

      await _loadMyReviews();
      await MembershipRepository.instance.fetchLoyaltyPoints();

      if (!mounted) return;

      final isSuccess = result['success'] == true;
      if (isSuccess) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            contentPadding: const EdgeInsets.all(24),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5E9),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFF007A48), width: 1.5),
                  ),
                  child: const Icon(Icons.check_rounded, color: Color(0xFF007A48), size: 38),
                ),
                const SizedBox(height: 16),
                Text(
                  context.tr('Gửi đánh giá thành công!', 'Review Submitted!'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2937),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5E9),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF208C58).withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.stars_rounded, color: Color(0xFF007A48), size: 16),
                      SizedBox(width: 4),
                      Text(
                        '+50 điểm thưởng đã cộng vào tài khoản',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF007A48)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  context.tr(
                    'Cảm ơn bạn đã đóng góp ý kiến quý báu. Quản lý chi nhánh MLD sẽ xem xét và phản hồi sớm nhất.',
                    'Thank you for your valuable feedback. Our branch management will review and respond soon.',
                  ),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280), height: 1.4),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          if (widget.onBack != null) {
                            widget.onBack!();
                          } else {
                            Navigator.of(context).pop();
                          }
                        },
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFD1D5DB)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text(
                          context.tr('Đóng', 'Close'),
                          style: const TextStyle(color: Color(0xFF374151), fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          _tabController.animateTo(1);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF007A48),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text(
                          context.tr('Xem đánh giá', 'View Reviews'),
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['error']?.toString() ?? 'Không thể gửi đánh giá.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Không thể gửi đánh giá: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  String _getOverallRatingText(int rating) {
    switch (rating) {
      case 5:
        return 'Tuyệt vời vượt mong đợi';
      case 4:
        return 'Rất hài lòng';
      case 3:
        return 'Hài lòng vừa phải';
      case 2:
        return 'Tạm được, cần cải thiện';
      case 1:
        return 'Chưa đạt yêu cầu';
      default:
        return 'Rất hài lòng';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Color(0xFF1F2937)),
          onPressed: () {
            if (widget.onBack != null) {
              widget.onBack!();
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        title: Text(
          context.tr('Đánh giá dịch vụ', 'Service Reviews'),
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
        ),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF007A48),
          unselectedLabelColor: const Color(0xFF6B7280),
          indicatorColor: const Color(0xFF007A48),
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          unselectedLabelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          tabs: [
            Tab(text: context.tr('Viết đánh giá', 'Write Review')),
            Tab(
              text: _myReviews.isNotEmpty
                  ? context.tr('Đánh giá của tôi (${_myReviews.length})', 'My Reviews (${_myReviews.length})')
                  : context.tr('Đánh giá của tôi', 'My Reviews'),
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildWriteReviewTab(),
          _buildMyReviewsTab(),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 1: VIẾT ĐÁNH GIÁ DỊCH VỤ
  // ==========================================
  Widget _buildWriteReviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. THẺ THÔNG TIN DỊCH VỤ & CHUYÊN VIÊN
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5E9),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF208C58).withValues(alpha: 0.3)),
                  ),
                  child: const Center(
                    child: Icon(Icons.spa_rounded, color: Color(0xFF007A48), size: 26),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _resolvedServiceName ?? widget.serviceName,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.person_pin_rounded, size: 14, color: Color(0xFF007A48)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'Chuyên viên: ${_resolvedSpecialistName ?? widget.specialistName}',
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF4B5563)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(Icons.location_on_outlined, size: 13, color: Colors.grey.shade600),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _resolvedBranchName ?? widget.branchName,
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(Icons.access_time_rounded, size: 13, color: Colors.grey.shade600),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _resolvedSessionInfo ?? widget.sessionInfo,
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
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

          const SizedBox(height: 14),

          // 2. BANNER TẶNG ĐIỂM THƯỞNG
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF208C58).withValues(alpha: 0.35)),
            ),
            child: Row(
              children: [
                const Icon(Icons.stars_rounded, color: Color(0xFF007A48), size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.tr(
                      'Hoàn thành đánh giá để nhận ngay +50 điểm thưởng tích lũy hội viên.',
                      'Complete review to get +50 loyalty reward points immediately.',
                    ),
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF007A48),
                      height: 1.3,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 3. KHỐI ĐÁNH GIÁ TỔNG QUAN (5 SAO)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              children: [
                Text(
                  context.tr('Mức độ hài lòng chung', 'Overall Satisfaction'),
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (index) {
                    final starIndex = index + 1;
                    final isFilled = starIndex <= _overallRating;
                    return InkWell(
                      onTap: () => setState(() => _overallRating = starIndex),
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                        child: Icon(
                          isFilled ? Icons.star_rounded : Icons.star_outline_rounded,
                          color: isFilled ? const Color(0xFFF59E0B) : const Color(0xFFD1D5DB),
                          size: 38,
                        ),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 8),
                Text(
                  _getOverallRatingText(_overallRating),
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: Color(0xFFD97706)),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 4. BỘ CHỌN THẺ NHANH (QUICK TAGS)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.label_outline_rounded, color: Color(0xFF007A48), size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Bạn ấn tượng nhất điều gì?',
                        style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _availableTags.map((tag) {
                    final isSelected = _selectedTags.contains(tag);
                    return InkWell(
                      onTap: () {
                        setState(() {
                          if (isSelected) {
                            _selectedTags.remove(tag);
                          } else {
                            _selectedTags.add(tag);
                          }
                        });
                      },
                      borderRadius: BorderRadius.circular(20),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFE8F5E9) : const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF007A48) : const Color(0xFFE5E7EB),
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (isSelected) ...[
                              const Icon(Icons.check_rounded, size: 14, color: Color(0xFF007A48)),
                              const SizedBox(width: 4),
                            ],
                            Flexible(
                              child: Text(
                                tag,
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                  color: isSelected ? const Color(0xFF007A48) : const Color(0xFF4B5563),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 5. Ô NHẬP NHẬN XÉT CHI TIẾT
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Nhận xét chi tiết trải nghiệm',
                  style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _commentCtrl,
                  maxLines: 4,
                  maxLength: 500,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF1F2937)),
                  decoration: InputDecoration(
                    hintText: 'Chia sẻ cảm nhận chân thực về lực massage, tay nghề chuyên viên, không gian spa...',
                    hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                    filled: true,
                    fillColor: const Color(0xFFF9FAFB),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF007A48), width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // 6. NÚT GỬI ĐÁNH GIÁ (+50 ĐIỂM)
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF007A48),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.stars_rounded, size: 18),
                        SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            'Gửi đánh giá ngay (+50 điểm)',
                            style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
            ),
          ),

          const SizedBox(height: 28),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 2: ĐÁNH GIÁ CỦA TÔI & PHẢN HỒI TỪ CHI NHÁNH (branch_reply)
  // ==========================================
  Widget _buildMyReviewsTab() {
    if (_isLoadingReviews) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF007A48)));
    }

    if (_myReviews.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: const BoxDecoration(
                  color: Color(0xFFE8F5E9),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.rate_review_outlined, size: 30, color: Color(0xFF007A48)),
              ),
              const SizedBox(height: 14),
              Text(
                context.tr('Chưa có đánh giá nào', 'No reviews yet'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
              ),
              const SizedBox(height: 6),
              Text(
                context.tr(
                  'Bạn chưa gửi đánh giá nào. Hãy đánh giá các buổi trị liệu đã hoàn thành để nhận +50 điểm thưởng và nhận phản hồi từ MLD.',
                  'You haven\'t submitted any reviews yet. Review your completed sessions to get +50 points and branch replies.',
                ),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280), height: 1.4),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => _tabController.animateTo(0),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF007A48),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: Text(
                  context.tr('Viết đánh giá ngay', 'Write Review Now'),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadMyReviews,
      color: const Color(0xFF007A48),
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        itemCount: _myReviews.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (ctx, idx) {
          final rev = _myReviews[idx];
          final hasReply = rev.branchReply != null && rev.branchReply!.trim().isNotEmpty;

          String dateFormatted = 'Gần đây';
          if (rev.createdAt != null && rev.createdAt!.isNotEmpty) {
            try {
              final dt = DateTime.parse(rev.createdAt!).toLocal();
              dateFormatted = '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
            } catch (_) {}
          }

          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header: Tên dịch vụ & Ngày gửi
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        rev.serviceName ?? 'Dịch vụ trị liệu MLD',
                        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      dateFormatted,
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                    ),
                  ],
                ),

                const SizedBox(height: 6),

                // Sao đánh giá & Chuyên viên
                Row(
                  children: [
                    Row(
                      children: List.generate(5, (sIdx) {
                        return Icon(
                          sIdx < rev.overallRating ? Icons.star_rounded : Icons.star_outline_rounded,
                          color: sIdx < rev.overallRating ? const Color(0xFFF59E0B) : const Color(0xFFD1D5DB),
                          size: 18,
                        );
                      }),
                    ),
                    const SizedBox(width: 8),
                    if (rev.technicianName != null && rev.technicianName!.isNotEmpty)
                      Text(
                        '• KTV: ${rev.technicianName}',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey.shade700),
                      ),
                  ],
                ),

                // Thẻ đánh giá (Tags)
                if (rev.reviewTags.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: rev.reviewTags.map((t) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFE5E7EB)),
                        ),
                        child: Text(
                          t,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF4B5563)),
                        ),
                      );
                    }).toList(),
                  ),
                ],

                // Nội dung nhận xét của khách
                if (rev.comment.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    rev.comment,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF374151), height: 1.4),
                  ),
                ],

                const SizedBox(height: 12),

                // ====================================================
                // PHẢN HỒI TỪ BAN QUẢN LÝ CHI NHÁNH MLD (branch_reply)
                // Đồng bộ 100% với Web Admin: /manage/reviews
                // ====================================================
                if (hasReply)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF86EFAC)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: const [
                            Icon(Icons.verified_rounded, size: 15, color: Color(0xFF007A48)),
                            SizedBox(width: 6),
                            Text(
                              'Phản hồi từ MLD Việt Nam',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF007A48),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          rev.branchReply!,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: Color(0xFF1F2937),
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.hourglass_empty_rounded, size: 12, color: Colors.grey.shade500),
                        const SizedBox(width: 4),
                        Text(
                          context.tr('Đang chờ phản hồi từ quản lý chi nhánh', 'Waiting for branch reply'),
                          style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
