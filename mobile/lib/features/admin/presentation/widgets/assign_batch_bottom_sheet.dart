import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';

class AssignBatchBottomSheet extends StatefulWidget {
  final AdminCandidateModel candidate;
  final Function(String batchId, String batchCode) onBatchAssigned;

  const AssignBatchBottomSheet({
    super.key,
    required this.candidate,
    required this.onBatchAssigned,
  });

  @override
  State<AssignBatchBottomSheet> createState() => _AssignBatchBottomSheetState();
}

class _AssignBatchBottomSheetState extends State<AssignBatchBottomSheet> {
  final AdminRepository _repository = AdminRepository.instance;

  bool _isLoading = true;
  List<AdminCourseBatchModel> _batches = [];
  String? _selectedBatchId;
  String? _selectedBatchCode;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _fetchBatches();
  }

  Future<void> _fetchBatches() async {
    setState(() => _isLoading = true);
    final list = await _repository.fetchCourseBatches(widget.candidate.courseId);
    if (mounted) {
      setState(() {
        _batches = list;
        _isLoading = false;
        // Tự động chọn lớp hiện tại hoặc lớp đầu tiên còn chỗ
        if (widget.candidate.batchId != null) {
          _selectedBatchId = widget.candidate.batchId;
          _selectedBatchCode = widget.candidate.batchCode;
        } else if (_batches.isNotEmpty) {
          final available = _batches.firstWhere((b) => !b.isFull, orElse: () => _batches.first);
          _selectedBatchId = available.id;
          _selectedBatchCode = available.batchCode;
        }
      });
    }
  }

  Future<void> _submitAssignment() async {
    if (_selectedBatchId == null) return;
    setState(() => _isSubmitting = true);

    final success = await _repository.assignBatchToCandidate(
      widget.candidate.id,
      _selectedBatchId!,
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.pop(context);
        widget.onBatchAssigned(_selectedBatchId!, _selectedBatchCode ?? '');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể xếp lớp. Vui lòng thử lại sau.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE5E7EB),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Xếp lớp đào tạo học viên',
                    style: GoogleFonts.montserrat(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHeading,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Học viên: ${widget.candidate.candidateName} (${widget.candidate.orderCode})',
                    style: GoogleFonts.montserrat(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF00693F),
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Color(0xFF6B7280)),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Khóa học
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Row(
              children: [
                const Icon(Icons.menu_book_rounded, size: 16, color: Color(0xFF00693F)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    widget.candidate.courseTitle,
                    style: GoogleFonts.montserrat(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textHeading,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          Text(
            'CHỌN LỚP HỌC MỞ TUYỂN SINH:',
            style: GoogleFonts.montserrat(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF6B7280),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 8),

          // Danh sách lớp
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 36),
              child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
            )
          else if (_batches.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                children: [
                  const Icon(Icons.event_busy_rounded, size: 28, color: Color(0xFF9CA3AF)),
                  const SizedBox(height: 8),
                  Text(
                    'Hiện chưa có lớp đào tạo nào được mở cho khóa học này.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.montserrat(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            )
          else
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 260),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _batches.length,
                itemBuilder: (ctx, index) {
                  final b = _batches[index];
                  final isSelected = _selectedBatchId == b.id;
                  final isFull = b.isFull;

                  return GestureDetector(
                    onTap: isFull
                        ? null
                        : () {
                            setState(() {
                              _selectedBatchId = b.id;
                              _selectedBatchCode = b.batchCode;
                            });
                          },
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFE8F6ED) : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected
                              ? const Color(0xFF00693F)
                              : isFull
                                  ? const Color(0xFFF3F4F6)
                                  : const Color(0xFFE5E7EB),
                          width: isSelected ? 1.5 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 20,
                            height: 20,
                            margin: const EdgeInsets.only(right: 12),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF00693F)
                                    : const Color(0xFFD1D5DB),
                                width: isSelected ? 6 : 1.5,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Lớp: ${b.batchCode}',
                                      style: GoogleFonts.montserrat(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w700,
                                        color: isFull
                                            ? const Color(0xFF9CA3AF)
                                            : AppColors.textHeading,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isFull
                                            ? const Color(0xFFFEE2E2)
                                            : const Color(0xFFE8F6ED),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        isFull ? 'Đã đủ sĩ số' : 'Còn ${b.availableSlots} chỗ',
                                        style: GoogleFonts.montserrat(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w700,
                                          color: isFull
                                              ? const Color(0xFFDC2626)
                                              : const Color(0xFF0D6832),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${b.scheduleDays} · ${b.timeSlot} · Khai giảng: ${b.startDate}',
                                  style: GoogleFonts.montserrat(
                                    fontSize: 11.5,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                                if (b.instructorName != null || b.roomName != null) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    '${b.instructorName != null ? "GV: ${b.instructorName}" : ""}${b.roomName != null ? " · Phòng: ${b.roomName}" : ""}',
                                    style: GoogleFonts.montserrat(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                      color: const Color(0xFF6B7280),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          const SizedBox(height: 16),

          // Nút bấm
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    'Đóng',
                    style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: (_selectedBatchId == null || _isSubmitting) ? null : _submitAssignment,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00693F),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          'Xác nhận Xếp lớp',
                          style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
