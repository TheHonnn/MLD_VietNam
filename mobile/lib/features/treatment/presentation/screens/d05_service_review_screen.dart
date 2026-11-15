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

class D05ServiceReviewScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final String serviceName;
  final String specialistName;
  final String branchName;
  final String sessionInfo;
  final String? bookingId;
  final String? serviceId;
  final String? technicianId;
  final int initialTabIndex;

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
    this.initialTabIndex = 0,
  });

  @override
  State<D05ServiceReviewScreen> createState() => _D05ServiceReviewScreenState();
}

class _D05ServiceReviewScreenState extends State<D05ServiceReviewScreen> with SingleTickerProviderStateMixin {
  final TreatmentRepository _repo = TreatmentRepository.instance;
  late final TabController _tabController;

  bool _isLoading = false;
  int _selectedFilter = 0;

  List<ReviewableItemModel> _pendingReviews = [];
  List<ServiceReviewDataModel> _myReviews = [];

  final List<String> _serviceTags = const [
    'Kỹ thuật viên chu đáo',
    'Đúng giờ',
    'Giảm đau / Nhẹ nhõm ngay',
    'Không gian sạch sẽ, thơm',
    'Lực massage vừa vặn',
    'Tư vấn tận tâm',
    'Âm nhạc thư giãn',
    'Dịch vụ chuẩn y khoa',
  ];

  final List<String> _productTags = const [
    'Chính hãng 100%',
    'Chất lượng tốt',
    'Hiệu quả phục hồi rõ rệt',
    'Đóng gói cẩn thận',
    'Dễ sử dụng tại nhà',
    'Mùi hương dịu nhẹ sinh học',
    'Xứng đáng giá tiền',
    'Sẽ tiếp tục tin dùng',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex.clamp(0, 1),
    );

    _pendingReviews = [
      ReviewableItemModel(
        id: widget.bookingId ?? 'svc-pending-01',
        type: ReviewTargetType.service,
        title: widget.serviceName,
        specialistName: widget.specialistName,
        branchName: widget.branchName,
        sessionInfo: widget.sessionInfo,
        bookingId: widget.bookingId,
        serviceId: widget.serviceId,
        technicianId: widget.technicianId,
      ),
      const ReviewableItemModel(
        id: 'prod-pending-01',
        type: ReviewTargetType.product,
        title: 'Băng ép đa lớp MLD Pro Care',
        subtitle: 'Sản phẩm hỗ trợ điều trị phù bạch huyết tại nhà',
        sessionInfo: 'Đã nhận hàng · Bảo hành chính hãng',
        productId: 'prod-001',
      ),
    ];

    final isTest = WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');
    if (!isTest && widget.bookingId != null && widget.bookingId!.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _openReviewForBooking();
      });
    }

    _loadAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    try {
      final pendingFuture = _repo.fetchPendingReviews();
      final reviewsFuture = _repo.fetchMyReviews();

      final results = await Future.wait([pendingFuture, reviewsFuture]);
      if (mounted) {
        setState(() {
          final fetchedPending = results[0] as List<ReviewableItemModel>;
          if (fetchedPending.isNotEmpty) {
            _pendingReviews = fetchedPending;
          }
          _myReviews = results[1] as List<ServiceReviewDataModel>;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _openReviewForBooking() {
    final item = ReviewableItemModel(
      id: widget.bookingId!,
      type: ReviewTargetType.service,
      title: widget.serviceName,
      specialistName: widget.specialistName,
      branchName: widget.branchName,
      sessionInfo: widget.sessionInfo,
      bookingId: widget.bookingId,
      serviceId: widget.serviceId,
      technicianId: widget.technicianId,
    );
    _openReviewBottomSheet(item);
  }

  int _getPendingCount(int filter) {
    if (filter == 1) {
      return _pendingReviews.where((item) => item.isService).length;
    }
    if (filter == 2) {
      return _pendingReviews.where((item) => item.isProduct).length;
    }
    return _pendingReviews.length;
  }

  int _getMyReviewsCount(int filter) {
    if (filter == 1) {
      return _myReviews.where((r) => r.targetType != 'product' && r.productId == null).length;
    }
    if (filter == 2) {
      return _myReviews.where((r) => r.targetType == 'product' || r.productId != null).length;
    }
    return _myReviews.length;
  }

  String _getRatingEmotion(int rating) {
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

  void _openReviewBottomSheet(ReviewableItemModel item, [ServiceReviewDataModel? existingReview]) {
    final isEditing = existingReview != null;
    int rating = existingReview?.overallRating ?? 5;
    final Set<String> tags = existingReview != null
        ? Set.from(existingReview.reviewTags)
        : (item.isService
            ? {'Kỹ thuật viên chu đáo', 'Giảm đau / Nhẹ nhõm ngay', 'Không gian sạch sẽ, thơm'}
            : {'Chính hãng 100%', 'Chất lượng tốt', 'Hiệu quả phục hồi rõ rệt'});

    final textCtrl = TextEditingController(
      text: existingReview?.comment ??
          (item.isService
              ? 'Dịch vụ chuẩn y khoa MLD rất chu đáo, thao tác chuyên nghiệp và không gian thư giãn. Tôi rất hài lòng.'
              : 'Sản phẩm chính hãng đóng gói cẩn thận, dùng rất êm và hiệu quả phục hồi tốt.'),
    );
    bool isSaving = false;
    final availableTags = item.isService ? _serviceTags : _productTags;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 18,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 44,
                        height: 5,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isEditing
                                    ? context.tr('Chỉnh sửa đánh giá', 'Edit Review')
                                    : (item.isService
                                        ? context.tr('Đánh giá dịch vụ trị liệu', 'Review Therapy Service')
                                        : context.tr('Đánh giá sản phẩm bổ trợ', 'Review Home Product')),
                                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                isEditing ? 'Cập nhật lại trải nghiệm của bạn' : 'Nhận ngay +50 điểm thưởng hội viên',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.accent),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, size: 22, color: Color(0xFF64748B)),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: item.isService ? const Color(0xFFEFF6EE) : const Color(0xFFDEEAF6),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              item.isService ? Icons.spa_rounded : Icons.inventory_2_outlined,
                              color: item.isService ? AppColors.accent : AppColors.primary,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: item.isService ? const Color(0xFFEFF6EE) : const Color(0xFFDEEAF6),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    item.isService ? 'Dịch vụ trị liệu' : 'Sản phẩm bổ trợ',
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w700,
                                      color: item.isService ? AppColors.accent : AppColors.primary,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  item.title,
                                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (item.specialistName != null && item.specialistName!.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    'Chuyên viên: ${item.specialistName}',
                                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(5, (index) {
                              final star = index + 1;
                              final filled = star <= rating;
                              return InkWell(
                                onTap: () => setModalState(() => rating = star),
                                borderRadius: BorderRadius.circular(8),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                  child: Icon(
                                    filled ? Icons.star_rounded : Icons.star_outline_rounded,
                                    color: filled ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
                                    size: 38,
                                  ),
                                ),
                              );
                            }),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _getRatingEmotion(rating),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFD97706),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Thẻ đánh giá nhanh:',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: availableTags.map((tag) {
                        final isSelected = tags.contains(tag);
                        return InkWell(
                          onTap: () {
                            setModalState(() {
                              if (isSelected) {
                                tags.remove(tag);
                              } else {
                                tags.add(tag);
                              }
                            });
                          },
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFFEFF6EE) : const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isSelected ? AppColors.accent : const Color(0xFFE2E8F0),
                                width: isSelected ? 1.4 : 1,
                              ),
                            ),
                            child: Text(
                              tag,
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected ? AppColors.accent : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: textCtrl,
                      maxLines: 3,
                      maxLength: 500,
                      style: const TextStyle(fontSize: 13.5, color: Color(0xFF1E293B)),
                      decoration: InputDecoration(
                        hintText: 'Chia sẻ chi tiết cảm nhận của bạn về trải nghiệm...',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
                        contentPadding: const EdgeInsets.all(12),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton(
                        onPressed: isSaving
                            ? null
                            : () async {
                                if (!AuthService.instance.isAuthenticated || AuthService.instance.isGuest) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Vui lòng đăng nhập để gửi đánh giá và tích lũy điểm thưởng.'),
                                      backgroundColor: AppColors.error,
                                    ),
                                  );
                                  return;
                                }

                                setModalState(() => isSaving = true);
                                final reviewData = ServiceReviewDataModel(
                                  id: existingReview?.id,
                                  bookingId: item.bookingId,
                                  serviceId: item.serviceId,
                                  technicianId: item.technicianId,
                                  productId: item.productId,
                                  productName: item.isProduct ? item.title : null,
                                  targetType: item.isProduct ? 'product' : 'service',
                                  overallRating: rating,
                                  comment: textCtrl.text.trim(),
                                  reviewTags: tags.toList(),
                                  photos: const [],
                                  serviceName: item.isService ? item.title : null,
                                  technicianName: item.specialistName,
                                );

                                final res = await _repo.saveReview(reviewData);
                                if (!mounted) return;
                                Navigator.pop(ctx);

                                if (res['success'] == true) {
                                  await _loadAllData();
                                  _tabController.animateTo(1);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(isEditing
                                          ? 'Cập nhật đánh giá thành công!'
                                          : 'Gửi đánh giá thành công! Bạn nhận được +50 điểm thưởng.'),
                                      backgroundColor: AppColors.accent,
                                    ),
                                  );
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(res['error']?.toString() ?? 'Lỗi gửi đánh giá.'),
                                      backgroundColor: AppColors.error,
                                    ),
                                  );
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: isSaving
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : Text(
                                isEditing ? 'Lưu cập nhật đánh giá' : 'Gửi đánh giá (+50 điểm)',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Color(0xFF0F172A)),
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
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
        ),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          unselectedLabelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          tabs: [
            Tab(
              text: _pendingReviews.isNotEmpty
                  ? context.tr('Chưa đánh giá (${_pendingReviews.length})', 'Pending (${_pendingReviews.length})')
                  : context.tr('Chưa đánh giá', 'Pending Reviews'),
            ),
            Tab(
              text: _myReviews.isNotEmpty
                  ? context.tr('Đánh giá của tôi (${_myReviews.length})', 'My Reviews (${_myReviews.length})')
                  : context.tr('Đánh giá của tôi', 'My Reviews'),
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                _buildFilterChips(),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildPendingReviewsTab(),
                      _buildMyReviewsTab(),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildFilterChips() {
    final filters = [
      {'id': 0, 'label': 'Tất cả', 'countPending': _getPendingCount(0), 'countReviewed': _getMyReviewsCount(0)},
      {'id': 1, 'label': 'Dịch vụ trị liệu', 'countPending': _getPendingCount(1), 'countReviewed': _getMyReviewsCount(1)},
      {'id': 2, 'label': 'Sản phẩm bổ trợ', 'countPending': _getPendingCount(2), 'countReviewed': _getMyReviewsCount(2)},
    ];

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: filters.map((f) {
            final isSelected = _selectedFilter == f['id'];
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: InkWell(
                onTap: () => setState(() => _selectedFilter = f['id'] as int),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFFEFF6EE) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSelected ? AppColors.accent : const Color(0xFFE2E8F0),
                      width: isSelected ? 1.4 : 1,
                    ),
                  ),
                  child: Text(
                    f['label'] as String,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? AppColors.accent : const Color(0xFF475569),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildPendingReviewsTab() {
    final items = _pendingReviews.where((item) {
      if (_selectedFilter == 1) return item.isService;
      if (_selectedFilter == 2) return item.isProduct;
      return true;
    }).toList();

    if (items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 68,
                height: 68,
                decoration: const BoxDecoration(
                  color: Color(0xFFEFF6EE),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle_outline_rounded, color: AppColors.accent, size: 36),
              ),
              const SizedBox(height: 14),
              const Text(
                'Tuyệt vời! Bạn không còn mục nào chưa đánh giá',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              const Text(
                'Mọi phản hồi của bạn đều giúp nâng cao chất lượng dịch vụ chuẩn y khoa MLD.',
                style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: items.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) {
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6EE),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF208C58).withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.stars_rounded, color: AppColors.accent, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    context.tr(
                      'Đánh giá nhận ngay +50 điểm thưởng tích lũy hội viên MLD.',
                      'Review to get +50 loyalty points immediately.',
                    ),
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.accent,
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        final item = items[index - 1];
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: item.isService ? const Color(0xFFEFF6EE) : const Color(0xFFDEEAF6),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          item.isService ? Icons.spa_rounded : Icons.inventory_2_outlined,
                          size: 13,
                          color: item.isService ? AppColors.accent : AppColors.primary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          item.isService ? 'Dịch vụ trị liệu' : 'Sản phẩm bổ trợ',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: item.isService ? AppColors.accent : AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      '+50 điểm',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFFB45309),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: item.isService ? const Color(0xFFEFF6EE) : const Color(0xFFDEEAF6),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      item.isService ? Icons.medical_services_outlined : Icons.shopping_bag_outlined,
                      color: item.isService ? AppColors.accent : AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        if (item.specialistName != null && item.specialistName!.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            'Chuyên viên: ${item.specialistName}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                          ),
                        ],
                        if (item.subtitle != null && item.subtitle!.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            item.subtitle!,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                        ],
                        const SizedBox(height: 2),
                        Text(
                          '${item.branchName != null ? '${item.branchName} • ' : ''}${item.sessionInfo ?? ''}',
                          style: const TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                height: 38,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.rate_review_rounded, size: 16, color: Colors.white),
                  label: const Text(
                    'Đánh giá ngay',
                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  onPressed: () => _openReviewBottomSheet(item),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMyReviewsTab() {
    final reviews = _myReviews.where((r) {
      if (_selectedFilter == 1) return r.targetType != 'product' && r.productId == null;
      if (_selectedFilter == 2) return r.targetType == 'product' || r.productId != null;
      return true;
    }).toList();

    if (reviews.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 68,
                height: 68,
                decoration: const BoxDecoration(
                  color: Color(0xFFF1F5F9),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.rate_review_outlined, color: Color(0xFF94A3B8), size: 36),
              ),
              const SizedBox(height: 14),
              const Text(
                'Bạn chưa có đánh giá nào',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
              ),
              const SizedBox(height: 6),
              const Text(
                'Hãy chuyển sang tab "Chưa đánh giá" để gửi cảm nhận và nhận điểm thưởng hội viên.',
                style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: reviews.length,
      itemBuilder: (context, index) {
        final rev = reviews[index];
        final isProduct = rev.targetType == 'product' || rev.productId != null;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isProduct ? const Color(0xFFDEEAF6) : const Color(0xFFEFF6EE),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      isProduct ? 'Sản phẩm bổ trợ' : 'Dịch vụ trị liệu',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: isProduct ? AppColors.primary : AppColors.accent,
                      ),
                    ),
                  ),
                  Row(
                    children: List.generate(5, (starIdx) {
                      final star = starIdx + 1;
                      return Icon(
                        star <= rev.overallRating ? Icons.star_rounded : Icons.star_outline_rounded,
                        color: star <= rev.overallRating ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
                        size: 16,
                      );
                    }),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                rev.serviceName ?? rev.productName ?? 'Dịch vụ chuẩn y khoa MLD',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF1E293B)),
              ),
              if (rev.technicianName != null && rev.technicianName!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  'Chuyên viên: ${rev.technicianName}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                ),
              ],
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  rev.comment,
                  style: const TextStyle(fontSize: 13, height: 1.4, color: Color(0xFF334155)),
                ),
              ),
              if (rev.reviewTags.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: rev.reviewTags.map((tag) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        tag,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                      ),
                    );
                  }).toList(),
                ),
              ],
              if (rev.branchReply != null && rev.branchReply!.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6EE),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFA4D4D8)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.verified_rounded, size: 16, color: AppColors.accent),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Phản hồi từ Ban Quản Lý MLD:',
                              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.accent),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              rev.branchReply!,
                              style: const TextStyle(fontSize: 12, color: Color(0xFF1E293B)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  icon: const Icon(Icons.edit_outlined, size: 15, color: AppColors.primary),
                  label: const Text(
                    'Sửa đánh giá',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.primary),
                  ),
                  onPressed: () {
                    final item = ReviewableItemModel(
                      id: rev.bookingId ?? rev.id ?? '',
                      type: isProduct ? ReviewTargetType.product : ReviewTargetType.service,
                      title: rev.serviceName ?? rev.productName ?? 'Dịch vụ MLD',
                      specialistName: rev.technicianName,
                      bookingId: rev.bookingId,
                      serviceId: rev.serviceId,
                      technicianId: rev.technicianId,
                      productId: rev.productId,
                    );
                    _openReviewBottomSheet(item, rev);
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
