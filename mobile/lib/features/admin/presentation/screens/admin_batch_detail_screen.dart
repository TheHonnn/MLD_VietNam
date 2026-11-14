import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/assign_batch_bottom_sheet.dart';

/// Màn hình Chi tiết Lớp học Đào tạo (Admin Batch Detail Screen)
/// Bố trí sắp xếp tinh tế, hiển thị đầy đủ thông tin giảng viên, phòng học,
/// tiến độ sĩ số, tổng thu học phí và danh sách học viên dạng compact tối ưu không gian.
class AdminBatchDetailScreen extends StatefulWidget {
  final AdminCourseBatchModel batch;
  final List<AdminCandidateModel> allCandidates;
  final VoidCallback? onDataChanged;

  const AdminBatchDetailScreen({
    super.key,
    required this.batch,
    required this.allCandidates,
    this.onDataChanged,
  });

  @override
  State<AdminBatchDetailScreen> createState() => _AdminBatchDetailScreenState();
}

class _AdminBatchDetailScreenState extends State<AdminBatchDetailScreen> {
  final AdminRepository _repository = AdminRepository.instance;
  late AdminCourseBatchModel _batch;
  late List<AdminCandidateModel> _allCandidates;
  String _searchStudentQuery = '';
  final Set<String> _presentStudentIds = {};
  bool _isAttendanceMode = false;

  @override
  void initState() {
    super.initState();
    _batch = widget.batch;
    _allCandidates = List.from(widget.allCandidates);
  }

  List<AdminCandidateModel> get _studentsInBatch {
    final list = _allCandidates.where((c) => c.batchId == _batch.id).toList();
    if (_searchStudentQuery.isEmpty) return list;
    final q = _searchStudentQuery.toLowerCase();
    return list.where((c) {
      return c.candidateName.toLowerCase().contains(q) ||
          c.candidatePhone.toLowerCase().contains(q) ||
          c.orderCode.toLowerCase().contains(q);
    }).toList();
  }

  List<AdminCandidateModel> get _waitingCandidates {
    return _allCandidates
        .where((c) => c.batchId == null || c.batchId!.isEmpty)
        .toList();
  }

  String _formatPrice(double amount) {
    final formatter = NumberFormat('#,###', 'vi_VN');
    return '${formatter.format(amount)} ₫';
  }

  double get _totalCollected {
    return _studentsInBatch.fold(0.0, (sum, c) => sum + c.amountPaid);
  }

  int get _fullyPaidCount {
    return _studentsInBatch.where((c) => c.tuitionTotal > 0 && c.amountPaid >= c.tuitionTotal).length;
  }

  void _callPhone(String phone) async {
    if (phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  // Thêm học viên từ danh sách chờ vào lớp này
  void _openAddStudentSheet() {
    final waiting = _waitingCandidates;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        String searchQuery = '';
        return StatefulBuilder(
          builder: (context, setModalState) {
            final filtered = waiting.where((c) {
              if (searchQuery.isEmpty) return true;
              final q = searchQuery.toLowerCase();
              return c.candidateName.toLowerCase().contains(q) ||
                  c.candidatePhone.toLowerCase().contains(q) ||
                  c.courseTitle.toLowerCase().contains(q);
            }).toList();

            return Container(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.75,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8F6ED),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.person_add_rounded, color: Color(0xFF00693F), size: 18),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Thêm học viên vào lớp ${_batch.batchCode}',
                            style: AppTypography.zaloFont(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textHeading,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Search
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Tìm học viên chờ xếp lớp...',
                      hintStyle: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
                      prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF9CA3AF)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                    ),
                    onChanged: (val) => setModalState(() => searchQuery = val.trim()),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Danh sách chờ xếp lớp (${filtered.length} học viên):',
                    style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: filtered.isEmpty
                        ? Center(
                            child: Text(
                              'Không có học viên nào đang chờ xếp lớp.',
                              style: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
                            ),
                          )
                        : ListView.builder(
                            itemCount: filtered.length,
                            itemBuilder: (ctx2, idx) {
                              final c = filtered[idx];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFFE5E7EB)),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 32,
                                      height: 32,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFE8F6ED),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        c.candidateName.isNotEmpty ? c.candidateName[0] : 'H',
                                        style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF00693F)),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            c.candidateName,
                                            style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                                          ),
                                          Text(
                                            '${c.candidatePhone} · Đã nộp ${_formatPrice(c.amountPaid)}',
                                            style: AppTypography.zaloFont(fontSize: 11, color: AppColors.textSecondary),
                                          ),
                                        ],
                                      ),
                                    ),
                                    ElevatedButton(
                                      onPressed: () async {
                                        Navigator.pop(ctx);
                                        await _assignStudentToThisBatch(c);
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF00693F),
                                        foregroundColor: Colors.white,
                                        elevation: 0,
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      child: Text('Gán vào lớp', style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w700)),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _assignStudentToThisBatch(AdminCandidateModel c) async {
    final success = await _repository.assignBatchToCandidate(c.id, _batch.id);
    if (success && mounted) {
      setState(() {
        final idx = _allCandidates.indexWhere((item) => item.id == c.id);
        if (idx != -1) {
          _allCandidates[idx] = c.copyWith(
            batchId: _batch.id,
            batchCode: _batch.batchCode,
            status: 'ENROLLED_STUDYING',
          );
        }
      });
      widget.onDataChanged?.call();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã thêm ${c.candidateName} vào lớp ${_batch.batchCode}!'),
          backgroundColor: const Color(0xFF00693F),
        ),
      );
    }
  }

  // Gỡ học viên khỏi lớp này (trả về danh sách chờ)
  Future<void> _unassignStudent(AdminCandidateModel c) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Xác nhận gỡ học viên', style: AppTypography.zaloFont(fontSize: 15, fontWeight: FontWeight.w700)),
        content: Text(
          'Bạn có chắc chắn muốn gỡ học viên "${c.candidateName}" khỏi lớp ${_batch.batchCode}?\nHọc viên sẽ quay lại danh sách chờ xếp lớp.',
          style: AppTypography.zaloFont(fontSize: 13, color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Hủy', style: AppTypography.zaloFont(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE11D48),
              foregroundColor: Colors.white,
            ),
            child: Text('Gỡ khỏi lớp', style: AppTypography.zaloFont(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await _repository.unassignBatchFromCandidate(c.id);
      if (success && mounted) {
        setState(() {
          final idx = _allCandidates.indexWhere((item) => item.id == c.id);
          if (idx != -1) {
            _allCandidates[idx] = c.copyWith(
              batchId: null,
              batchCode: null,
              status: 'PAID_WAITING_CLASS',
            );
          }
        });
        widget.onDataChanged?.call();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã đưa ${c.candidateName} về danh sách chờ xếp lớp.'),
            backgroundColor: const Color(0xFF00693F),
          ),
        );
      }
    }
  }

  // Đổi lớp cho học viên
  void _openChangeBatch(AdminCandidateModel c) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => AssignBatchBottomSheet(
        candidate: c,
        onBatchAssigned: (batchId, batchCode) {
          setState(() {
            final idx = _allCandidates.indexWhere((item) => item.id == c.id);
            if (idx != -1) {
              _allCandidates[idx] = c.copyWith(
                batchId: batchId,
                batchCode: batchCode,
                status: 'ENROLLED_STUDYING',
              );
            }
          });
          widget.onDataChanged?.call();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Đã chuyển ${c.candidateName} sang lớp $batchCode!'),
              backgroundColor: const Color(0xFF00693F),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final students = _studentsInBatch;
    final fillRatio = _batch.maxStudents > 0
        ? (students.length / _batch.maxStudents).clamp(0.0, 1.0)
        : 0.0;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textHeading, size: 19),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  _batch.batchCode,
                  style: AppTypography.zaloFont(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F6ED),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _batch.status == 'OPEN_FOR_ENROLLMENT' ? 'Tuyển sinh' : 'Đang học',
                    style: AppTypography.zaloFont(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF00693F),
                    ),
                  ),
                ),
              ],
            ),
            Text(
              _batch.courseTitle ?? 'Khóa học MLD chuyên ngành',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: _isAttendanceMode ? 'Tắt điểm danh' : 'Bật điểm danh',
            icon: Icon(
              _isAttendanceMode ? Icons.check_box_rounded : Icons.checklist_rounded,
              color: _isAttendanceMode ? const Color(0xFF00693F) : const Color(0xFF6B7280),
              size: 22,
            ),
            onPressed: () {
              setState(() => _isAttendanceMode = !_isAttendanceMode);
              if (_isAttendanceMode) {
                _presentStudentIds.addAll(students.map((s) => s.id));
              }
            },
          ),
          IconButton(
            tooltip: 'Thêm học viên vào lớp',
            icon: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFFE8F6ED),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.person_add_rounded, color: Color(0xFF00693F), size: 17),
            ),
            onPressed: _openAddStudentSheet,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // 1. Thẻ Thông tin Lớp học (Tối ưu độ cao gọn gàng)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hàng Giảng viên & Phòng học
                Row(
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          const Icon(Icons.person_outline_rounded, size: 14, color: Color(0xFF00693F)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'GV: ${_batch.instructorName ?? "Chưa phân công"}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF0284C7)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _batch.roomName ?? 'Cơ sở đào tạo MLD',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                // Lịch học & Khai giảng
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 13, color: Color(0xFFD97706)),
                    const SizedBox(width: 4),
                    Text(
                      'Lịch: ${_batch.scheduleDays} (${_batch.timeSlot}) · Khai giảng: ${_batch.startDate}',
                      style: AppTypography.zaloFont(fontSize: 11, color: const Color(0xFF6B7280)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Thanh tiến độ Sĩ số
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Sĩ số: ${students.length}/${_batch.maxStudents} học viên',
                      style: AppTypography.zaloFont(fontSize: 11.5, fontWeight: FontWeight.w700, color: const Color(0xFF00693F)),
                    ),
                    Text(
                      '${(fillRatio * 100).toInt()}% chỉ tiêu',
                      style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: fillRatio,
                    minHeight: 5,
                    backgroundColor: const Color(0xFFE5E7EB),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      fillRatio >= 1.0 ? const Color(0xFFDC2626) : const Color(0xFF00693F),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 2. 3 Ô Thống kê KPI Lớp học (Compact)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
            child: Row(
              children: [
                _buildMiniKpi('Sĩ số hiện tại', '${students.length} hv', const Color(0xFF00693F), const Color(0xFFE8F6ED)),
                const SizedBox(width: 8),
                _buildMiniKpi('Đã nộp đủ', '$_fullyPaidCount/${students.length}', const Color(0xFF0284C7), const Color(0xFFE0F2FE)),
                const SizedBox(width: 8),
                _buildMiniKpi('Tổng thu', _formatPrice(_totalCollected), const Color(0xFF7C3AED), const Color(0xFFEDE9FE)),
              ],
            ),
          ),

          // 3. Thanh tìm kiếm học viên trong lớp
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
            child: Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 36,
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Tìm học viên trong lớp...',
                        hintStyle: AppTypography.zaloFont(fontSize: 11.5, color: const Color(0xFF9CA3AF)),
                        prefixIcon: const Icon(Icons.search_rounded, size: 16, color: Color(0xFF9CA3AF)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
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
                      ),
                      onChanged: (val) => setState(() => _searchStudentQuery = val.trim()),
                    ),
                  ),
                ),
                if (_isAttendanceMode) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F6ED),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Có mặt: ${_presentStudentIds.length}/${students.length}',
                      style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF00693F)),
                    ),
                  ),
                ],
              ],
            ),
          ),

          const Divider(height: 1, color: Color(0xFFE5E7EB)),

          // 4. Danh sách Học viên Dạng Compact (Tối ưu không gian: 8 - 10 học viên)
          Expanded(
            child: students.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: const BoxDecoration(color: Color(0xFFF3F4F6), shape: BoxShape.circle),
                          child: const Icon(Icons.group_off_rounded, size: 26, color: Color(0xFF9CA3AF)),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Lớp chưa có học viên nào',
                          style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Bấm nút bên dưới để chọn học viên từ danh sách chờ',
                          style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 14),
                        ElevatedButton.icon(
                          onPressed: _openAddStudentSheet,
                          icon: const Icon(Icons.person_add_rounded, size: 16),
                          label: Text('Thêm học viên vào lớp', style: AppTypography.zaloFont(fontWeight: FontWeight.w700)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00693F),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    itemCount: students.length,
                    itemBuilder: (ctx, idx) {
                      final c = students[idx];
                      final isFullyPaid = c.tuitionTotal > 0 && c.amountPaid >= c.tuitionTotal;
                      final isPresent = _presentStudentIds.contains(c.id);

                      // Compact Student Row (Height ~56px)
                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE5E7EB)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.015),
                              blurRadius: 3,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            // Điểm danh checkbox hoặc STT tròn
                            if (_isAttendanceMode)
                              InkWell(
                                onTap: () {
                                  setState(() {
                                    if (isPresent) {
                                      _presentStudentIds.remove(c.id);
                                    } else {
                                      _presentStudentIds.add(c.id);
                                    }
                                  });
                                },
                                child: Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: Icon(
                                    isPresent ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                                    color: isPresent ? const Color(0xFF00693F) : const Color(0xFF9CA3AF),
                                    size: 20,
                                  ),
                                ),
                              )
                            else
                              Container(
                                width: 26,
                                height: 26,
                                margin: const EdgeInsets.only(right: 8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF3F4F6),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  '${idx + 1}',
                                  style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF4B5563)),
                                ),
                              ),

                            // Thông tin học viên
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          c.candidateName,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: AppTypography.zaloFont(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.textHeading,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: isFullyPaid ? const Color(0xFFE8F6ED) : const Color(0xFFFEF3C7),
                                          borderRadius: BorderRadius.circular(5),
                                        ),
                                        child: Text(
                                          isFullyPaid ? 'Đã thu đủ' : 'Còn thiếu',
                                          style: AppTypography.zaloFont(
                                            fontSize: 9.5,
                                            fontWeight: FontWeight.w700,
                                            color: isFullyPaid ? const Color(0xFF00693F) : const Color(0xFFD97706),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '${c.candidatePhone} · ${c.orderCode}',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: AppTypography.zaloFont(fontSize: 10.5, color: AppColors.textSecondary),
                                        ),
                                      ),
                                      Text(
                                        _formatPrice(c.amountPaid),
                                        style: AppTypography.zaloFont(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: isFullyPaid ? const Color(0xFF00693F) : const Color(0xFFD97706),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(width: 6),

                            // Nút Gọi điện thoại
                            if (c.candidatePhone.isNotEmpty)
                              InkWell(
                                onTap: () => _callPhone(c.candidatePhone),
                                borderRadius: BorderRadius.circular(6),
                                child: Container(
                                  padding: const EdgeInsets.all(5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE8F6ED),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Icon(Icons.phone_rounded, color: Color(0xFF0D6832), size: 15),
                                ),
                              ),

                            // Nút Thao tác Menu
                            PopupMenuButton<String>(
                              padding: EdgeInsets.zero,
                              iconSize: 18,
                              icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF9CA3AF)),
                              onSelected: (action) {
                                if (action == 'change_batch') {
                                  _openChangeBatch(c);
                                } else if (action == 'remove') {
                                  _unassignStudent(c);
                                }
                              },
                              itemBuilder: (ctx) => [
                                PopupMenuItem(
                                  value: 'change_batch',
                                  child: Row(
                                    children: [
                                      const Icon(Icons.swap_horiz_rounded, size: 16, color: Color(0xFF00693F)),
                                      const SizedBox(width: 8),
                                      Text('Chuyển lớp khác', style: AppTypography.zaloFont(fontSize: 12)),
                                    ],
                                  ),
                                ),
                                PopupMenuItem(
                                  value: 'remove',
                                  child: Row(
                                    children: [
                                      const Icon(Icons.person_remove_rounded, size: 16, color: Color(0xFFDC2626)),
                                      const SizedBox(width: 8),
                                      Text('Gỡ khỏi lớp', style: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFFDC2626))),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniKpi(String label, String value, Color color, Color bg) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.zaloFont(fontSize: 10, color: color.withValues(alpha: 0.8)),
            ),
            const SizedBox(height: 1),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w700, color: color),
            ),
          ],
        ),
      ),
    );
  }
}
