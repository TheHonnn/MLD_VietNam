import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
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

  const D05ServiceReviewScreen({
    super.key,
    this.onBack,
    this.serviceName = 'Massage thư giãn toàn thân',
    this.specialistName = 'Trần Minh Phương',
    this.branchName = 'Chi nhánh Quận 3',
    this.sessionInfo = 'Buổi 04 · Hoàn thành 08/10/2026',
    this.bookingId,
    this.serviceId,
    this.technicianId,
  });

  @override
  State<D05ServiceReviewScreen> createState() => _D05ServiceReviewScreenState();
}

class _D05ServiceReviewScreenState extends State<D05ServiceReviewScreen> {
  final TreatmentRepository _repo = TreatmentRepository.instance;

  int _overallRating = 5;
  int _serviceQualityRating = 5;
  int _staffAttitudeRating = 5;
  int _spaceAmbianceRating = 4;
  int _procedureRating = 5;
  bool _isSubmitting = false;

  late final TextEditingController _commentCtrl;
  String _willingnessToRefer = 'Có';

  @override
  void initState() {
    super.initState();
    _commentCtrl = TextEditingController(
      text: 'Chuyên viên chu đáo, mức lực vừa phải và không gian yên tĩnh. Tôi rất hài lòng.',
    );
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_isSubmitting) return;
    setState(() {
      _isSubmitting = true;
    });

    try {
      await _repo.saveReview(
        ServiceReviewDataModel(
          bookingId: widget.bookingId,
          serviceId: widget.serviceId,
          technicianId: widget.technicianId,
          overallRating: _overallRating,
          serviceQualityRating: _serviceQualityRating,
          staffAttitudeRating: _staffAttitudeRating,
          spaceAmbianceRating: _spaceAmbianceRating,
          procedureRating: _procedureRating,
          comment: _commentCtrl.text,
          willingnessToRefer: _willingnessToRefer,
        ),
      );

      if (!mounted) return;

      showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.all(24),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F7FF),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF0066B2), width: 1.5),
              ),
              child: const Icon(Icons.check, color: Color(0xFF0066B2), size: 36),
            ),
            const SizedBox(height: 16),
            const Text(
              'Gửi đánh giá thành công',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Cảm ơn bạn đã đóng góp ý kiến để chúng tôi không ngừng hoàn thiện trải nghiệm phục vụ.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: Color(0xFF6B6158),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  if (widget.onBack != null) {
                    widget.onBack!();
                  } else {
                    Navigator.of(context).pop();
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0066B2),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Đóng',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
        ),
      ),
    );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Không thể gửi đánh giá: $e'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Widget _buildCategoryRatingRow({
    required String title,
    required int rating,
    required ValueChanged<int> onRatingChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1E293B),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: List.generate(5, (index) {
                final starIndex = index + 1;
                final isFilled = starIndex <= rating;
                return InkWell(
                  onTap: () => onRatingChanged(starIndex),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    width: 40,
                    height: 40,
                    alignment: Alignment.center,
                    child: Icon(
                      isFilled ? Icons.star : Icons.star_border,
                      size: 26,
                      color: isFilled ? const Color(0xFF0066B2) : const Color(0xFF0284C7),
                    ),
                  ),
                );
              }),
            ),
            Text(
              '$rating/5',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                color: Color(0xFF1E293B),
              ),
            ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- 1. ĐIỀU HƯỚNG ---
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        InkWell(
                          onTap: () {
                            if (widget.onBack != null) {
                              widget.onBack!();
                            } else {
                              Navigator.of(context).pop();
                            }
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
                            ),
                            child: const Icon(
                              Icons.arrow_back,
                              color: Color(0xFF1E293B),
                              size: 20,
                            ),
                          ),
                        ),
                        const Text(
                          'CHĂM SÓC & TRỊ LIỆU',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: Color(0xFF0066B2),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Tiêu đề H1
                    const Text(
                      'Đánh giá trải nghiệm',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF0F172A),
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Ý kiến của bạn giúp chúng tôi nâng cao chất lượng dịch vụ.',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: Color(0xFF6B6158),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // --- 2. THẺ DỊCH VỤ ĐÃ TRẢI NGHIỆM ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.asset(
                                  'assets/images/gioithieu_1.png',
                                  width: 80,
                                  height: 96,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 80,
                                    height: 96,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF0F7FF),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.spa, color: Color(0xFF0066B2), size: 36),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      widget.serviceName,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF1E293B),
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      widget.branchName,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w400,
                                        color: Color(0xFF1E293B),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      widget.specialistName,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w400,
                                        color: Color(0xFF6B6158),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Divider(height: 1, color: Color(0xFFE2E8F0)),
                          const SizedBox(height: 10),
                          Text(
                            widget.sessionInfo,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: Color(0xFF0066B2),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // --- 3. ĐÁNH GIÁ CHUNG ---
                    const Text(
                      'Bạn hài lòng với trải nghiệm hôm nay chứ?',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F7FF),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(5, (index) {
                              final starVal = index + 1;
                              final isSelected = starVal <= _overallRating;
                              return InkWell(
                                onTap: () {
                                  setState(() {
                                    _overallRating = starVal;
                                  });
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 4.0),
                                  child: Icon(
                                    isSelected ? Icons.star : Icons.star_border,
                                    size: 36,
                                    color: const Color(0xFF0066B2),
                                  ),
                                ),
                              );
                            }),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '$_overallRating/5 · ${_overallRating == 5 ? "Rất hài lòng" : _overallRating >= 4 ? "Hài lòng" : "Bình thường"} · Bản nháp chưa gửi',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: Color(0xFF1E293B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // --- 4. THẺ ĐÁNH GIÁ TIÊU CHÍ CHI TIẾT ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildCategoryRatingRow(
                            title: 'Chất lượng dịch vụ.',
                            rating: _serviceQualityRating,
                            onRatingChanged: (val) => setState(() => _serviceQualityRating = val),
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                          ),
                          _buildCategoryRatingRow(
                            title: 'Thái độ chuyên viên.',
                            rating: _staffAttitudeRating,
                            onRatingChanged: (val) => setState(() => _staffAttitudeRating = val),
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                          ),
                          _buildCategoryRatingRow(
                            title: 'Không gian trải nghiệm.',
                            rating: _spaceAmbianceRating,
                            onRatingChanged: (val) => setState(() => _spaceAmbianceRating = val),
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                          ),
                          _buildCategoryRatingRow(
                            title: 'Quy trình phục vụ.',
                            rating: _procedureRating,
                            onRatingChanged: (val) => setState(() => _procedureRating = val),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // --- 5. CHIA SẺ CẢM NHẬN ---
                    const Text(
                      'Chia sẻ cảm nhận của bạn...',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      height: 124,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
                      ),
                      child: TextField(
                        controller: _commentCtrl,
                        maxLines: 4,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w400,
                          color: Color(0xFF1E293B),
                          height: 1.4,
                        ),
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                          hintText: 'Nhập cảm nhận của bạn về buổi trị liệu...',
                          hintStyle: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w400,
                            color: Color(0xFF6B6158),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // --- 6. MỨC ĐỘ SẴN SÀNG GIỚI THIỆU ---
                    const Text(
                      'Bạn có sẵn sàng giới thiệu dịch vụ cho người thân, bạn bè không?',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF0F172A),
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _buildReferOption(label: 'Có', width: 72),
                        const SizedBox(width: 10),
                        _buildReferOption(label: 'Có thể', width: 102),
                        const SizedBox(width: 10),
                        _buildReferOption(label: 'Chưa', width: 90),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Đánh giá mẫu ở trạng thái bản nháp, chưa được gửi hoặc công bố.',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: Color(0xFF6B6158),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // --- 7. HÀNH ĐỘNG CỐ ĐỊNH (FIXED BOTTOM ACTION BAR) ---
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: Color(0xFFE2E8F0), width: 1.0),
                ),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0066B2),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Gửi đánh giá',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
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

  Widget _buildReferOption({required String label, required double width}) {
    final isSelected = _willingnessToRefer == label;
    return InkWell(
      onTap: () {
        setState(() {
          _willingnessToRefer = label;
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: width,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0066B2) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFF0066B2) : const Color(0xFFE2E8F0),
            width: 1.0,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w400,
            color: isSelected ? Colors.white : const Color(0xFF1E293B),
          ),
        ),
      ),
    );
  }
}
