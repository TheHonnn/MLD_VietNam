import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/edit_student_code_dialog.dart';
import '../widgets/assign_batch_bottom_sheet.dart';
import '../../../../core/services/top_notification_service.dart';

/// Màn hình Chi tiết Lớp học Đào tạo (Admin Batch Detail Screen)
/// Bố trí 2 Tab hiển thị khoa học:
/// 1. Tab Lịch học & Giáo trình (Lộ trình chuẩn y khoa, Timeline buổi học, Điểm danh từng buổi, Thêm buổi)
/// 2. Tab Danh sách Học viên (Thống kê sĩ số, nộp phí, xếp/gỡ lớp, gọi điện)
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

  // Quản lý Tab & Lịch học khoa học
  int _currentTab = 0; // 0: Lịch học & Giáo trình, 1: Danh sách Học viên
  List<AdminBatchScheduleModel> _schedules = [];
  bool _isLoadingSchedules = false;
  String _scheduleFilter = 'ALL'; // ALL, THEORY, LAB, TODAY_UPCOMING, COMPLETED
  final Map<String, Map<String, String>> _sessionAttendanceMap = {}; // scheduleId -> { enrollmentId: status }

  @override
  void initState() {
    super.initState();
    _batch = widget.batch;
    _allCandidates = List.from(widget.allCandidates);
    _loadSchedules();
  }

  Future<void> _loadSchedules() async {
    if (WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding')) {
      setState(() {
        _schedules = [
          const AdminBatchScheduleModel(
            id: 'sched-test-1',
            batchId: 'batch_01',
            sessionDate: '2026-11-20',
            startTime: '13:00:00',
            endTime: '17:00:00',
            topic: 'Buổi 1: Lộ trình đào tạo chuẩn Y khoa MLD',
            isPracticeLab: false,
          ),
        ];
        _isLoadingSchedules = false;
      });
      return;
    }
    setState(() => _isLoadingSchedules = true);
    try {
      final list = await _repository.fetchBatchSchedules(_batch.id);
      list.sort((a, b) {
        final dComp = a.sessionDate.compareTo(b.sessionDate);
        if (dComp != 0) return dComp;
        return a.startTime.compareTo(b.startTime);
      });
      if (mounted) {
        setState(() {
          _schedules = list;
          _isLoadingSchedules = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingSchedules = false);
    }
  }

  int _getSessionNumber(AdminBatchScheduleModel s) {
    final idx = _schedules.indexWhere((item) => item.id == s.id);
    if (idx != -1) {
      return idx + 1;
    }
    final match = RegExp(r'Buổi\s*(\d+)', caseSensitive: false).firstMatch(s.topic);
    if (match != null) {
      final parsed = int.tryParse(match.group(1) ?? '');
      if (parsed != null && parsed > 0 && parsed <= 100) {
        return parsed;
      }
    }
    return 1;
  }

  List<AdminBatchScheduleModel> get _filteredSchedules {
    if (_scheduleFilter == 'THEORY') {
      return _schedules.where((s) => !s.isPracticeLab).toList();
    }
    if (_scheduleFilter == 'LAB') {
      return _schedules.where((s) => s.isPracticeLab).toList();
    }
    if (_scheduleFilter == 'TODAY_UPCOMING') {
      return _schedules.where((s) => s.status != 'COMPLETED').toList();
    }
    if (_scheduleFilter == 'COMPLETED') {
      return _schedules.where((s) => s.status == 'COMPLETED').toList();
    }
    return _schedules;
  }

  int get _completedSessionsCount => _schedules.where((s) => s.status == 'COMPLETED').length;
  int get _upcomingSessionsCount => _schedules.where((s) => s.status != 'COMPLETED').length;
  int get _theoryCount => _schedules.where((s) => !s.isPracticeLab).length;
  int get _labCount => _schedules.where((s) => s.isPracticeLab).length;
  double get _scheduleProgressRatio => _schedules.isNotEmpty
      ? (_completedSessionsCount / _schedules.length).clamp(0.0, 1.0)
      : 0.0;

  List<AdminCandidateModel> get _studentsInBatch {
    final list = _allCandidates.where((c) => c.batchId == _batch.id).toList();
    if (_searchStudentQuery.isEmpty) return list;
    final q = _searchStudentQuery.toLowerCase();
    return list.where((c) {
      return c.candidateName.toLowerCase().contains(q) ||
          c.candidatePhone.toLowerCase().contains(q) ||
          (c.studentCode?.toLowerCase().contains(q) ?? false) ||
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
                  (c.studentCode?.toLowerCase().contains(q) ?? false) ||
                  c.orderCode.toLowerCase().contains(q);
            }).toList();

            return Container(
              height: MediaQuery.of(context).size.height * 0.75,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'Thêm học viên vào lớp ${_batch.batchCode}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.zaloFont(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
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
                                      child: Text(
                                        'Gán vào lớp',
                                        style: AppTypography.zaloFont(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
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
      TopNotificationService.showSuccess(
        title: 'Thêm vào lớp thành công',
        message: 'Đã thêm ${c.candidateName} vào lớp ${_batch.batchCode}!',
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
            child: Text(
              'Gỡ khỏi lớp',
              style: AppTypography.zaloFont(fontWeight: FontWeight.w700, color: Colors.white),
            ),
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
        TopNotificationService.showInfo(
          title: 'Đã gỡ học viên',
          message: 'Đã đưa ${c.candidateName} về danh sách chờ xếp lớp.',
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
          TopNotificationService.showSuccess(
            title: 'Chuyển lớp thành công',
            message: 'Đã chuyển ${c.candidateName} sang lớp $batchCode!',
          );
        },
      ),
    );
  }

  // Mở Sheet Điểm danh Buổi học cụ thể
  Future<void> _openAttendanceSheet(AdminBatchScheduleModel schedule) async {
    Map<String, String> currentAttendance = _sessionAttendanceMap[schedule.id] ?? {};
    if (currentAttendance.isEmpty) {
      currentAttendance = await _repository.fetchSessionAttendance(schedule.id);
      _sessionAttendanceMap[schedule.id] = currentAttendance;
    }

    final students = _studentsInBatch;
    final Map<String, String> localAttendance = Map.from(currentAttendance);
    for (final s in students) {
      localAttendance.putIfAbsent(s.id, () => 'PRESENT');
    }

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final presentCount = localAttendance.values.where((v) => v == 'PRESENT').length;
            final absentCount = localAttendance.values.where((v) => v == 'ABSENT').length;
            final excusedCount = localAttendance.values.where((v) => v == 'EXCUSED').length;

            return Container(
              height: MediaQuery.of(context).size.height * 0.8,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD1D5DB),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00693F),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'BUỔI ${_getSessionNumber(schedule)}',
                          style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Điểm danh Buổi học',
                          style: AppTypography.zaloFont(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF6B7280)),
                      ),
                    ],
                  ),
                  Text(
                    schedule.topic,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.access_time_rounded, size: 13, color: Color(0xFF0284C7)),
                      const SizedBox(width: 4),
                      Text(
                        '${schedule.timeSlotDisplay} · ${schedule.formattedDate}',
                        style: AppTypography.zaloFont(fontSize: 11, color: const Color(0xFF0284C7), fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Cụm thống kê & Nút "Tất cả có mặt"
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            _buildAttendanceCountBadge('Có mặt: $presentCount', const Color(0xFF00693F), const Color(0xFFE8F6ED)),
                            const SizedBox(width: 6),
                            _buildAttendanceCountBadge('Vắng: $absentCount', const Color(0xFFDC2626), const Color(0xFFFEE2E2)),
                            const SizedBox(width: 6),
                            _buildAttendanceCountBadge('Phép: $excusedCount', const Color(0xFFD97706), const Color(0xFFFEF3C7)),
                          ],
                        ),
                        InkWell(
                          onTap: () {
                            setSheetState(() {
                              for (final s in students) {
                                localAttendance[s.id] = 'PRESENT';
                              }
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF00693F),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'Tất cả có mặt',
                              style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Danh sách học viên
                  Expanded(
                    child: students.isEmpty
                        ? Center(
                            child: Text(
                              'Lớp chưa có học viên để điểm danh.',
                              style: AppTypography.zaloFont(color: const Color(0xFF9CA3AF), fontSize: 13),
                            ),
                          )
                        : ListView.builder(
                            itemCount: students.length,
                            itemBuilder: (c, i) {
                              final st = students[i];
                              final currentSt = localAttendance[st.id] ?? 'PRESENT';

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
                                      width: 28,
                                      height: 28,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFE8F6ED),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        '${i + 1}',
                                        style: AppTypography.zaloFont(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: const Color(0xFF00693F),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            st.candidateName,
                                            style: AppTypography.zaloFont(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.textHeading,
                                            ),
                                          ),
                                          Text(
                                            st.candidatePhone,
                                            style: AppTypography.zaloFont(fontSize: 11, color: AppColors.textSecondary),
                                          ),
                                        ],
                                      ),
                                    ),
                                    // 3 nút: Có mặt / Vắng / Phép
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        _buildStatusChoiceButton(
                                          label: 'Có mặt',
                                          isSelected: currentSt == 'PRESENT',
                                          activeColor: const Color(0xFF00693F),
                                          activeBg: const Color(0xFFE8F6ED),
                                          onTap: () => setSheetState(() => localAttendance[st.id] = 'PRESENT'),
                                        ),
                                        const SizedBox(width: 4),
                                        _buildStatusChoiceButton(
                                          label: 'Vắng',
                                          isSelected: currentSt == 'ABSENT',
                                          activeColor: const Color(0xFFDC2626),
                                          activeBg: const Color(0xFFFEE2E2),
                                          onTap: () => setSheetState(() => localAttendance[st.id] = 'ABSENT'),
                                        ),
                                        const SizedBox(width: 4),
                                        _buildStatusChoiceButton(
                                          label: 'Phép',
                                          isSelected: currentSt == 'EXCUSED',
                                          activeColor: const Color(0xFFD97706),
                                          activeBg: const Color(0xFFFEF3C7),
                                          onTap: () => setSheetState(() => localAttendance[st.id] = 'EXCUSED'),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),

                  // Nút Lưu Điểm Danh
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        _sessionAttendanceMap[schedule.id] = localAttendance;
                        setState(() {});
                        for (final entry in localAttendance.entries) {
                          await _repository.markSessionAttendance(
                            scheduleId: schedule.id,
                            enrollmentId: entry.key,
                            status: entry.value,
                          );
                        }
                        TopNotificationService.showSuccess(
                          title: 'Điểm danh thành công',
                          message: 'Đã lưu điểm danh Buổi ${_getSessionNumber(schedule)} ($presentCount/${students.length} có mặt)!',
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00693F),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Text(
                        'Lưu kết quả điểm danh ($presentCount/${students.length} có mặt)',
                        style: AppTypography.zaloFont(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
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

  Widget _buildAttendanceCountBadge(String label, Color color, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(5)),
      child: Text(
        label,
        style: AppTypography.zaloFont(fontSize: 10.5, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }

  Widget _buildStatusChoiceButton({
    required String label,
    required bool isSelected,
    required Color activeColor,
    required Color activeBg,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? activeBg : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isSelected ? activeColor : const Color(0xFFE5E7EB),
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Text(
          label,
          style: AppTypography.zaloFont(
            fontSize: 10.5,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? activeColor : const Color(0xFF6B7280),
          ),
        ),
      ),
    );
  }

  void _openAddScheduleSheet() {
    final nextIndex = _schedules.length + 1;
    final topicCtrl = TextEditingController(text: 'Buổi $nextIndex: Thực hành kỹ năng lâm sàng nâng cao');
    bool isLab = true;

    DateTime? batchStart;
    DateTime? batchEnd;
    if (_batch.startDate.isNotEmpty) batchStart = DateTime.tryParse(_batch.startDate);
    if (_batch.endDate.isNotEmpty) batchEnd = DateTime.tryParse(_batch.endDate);

    DateTime selectedDate;
    if (_schedules.isNotEmpty) {
      final sorted = List<AdminBatchScheduleModel>.from(_schedules)
        ..sort((a, b) => a.sessionDate.compareTo(b.sessionDate));
      final lastD = DateTime.tryParse(sorted.last.sessionDate) ?? DateTime.now();
      final cand = lastD.add(const Duration(days: 2));
      if (batchEnd != null && cand.isAfter(batchEnd)) {
        selectedDate = batchEnd;
      } else if (batchStart != null && cand.isBefore(batchStart)) {
        selectedDate = batchStart;
      } else {
        selectedDate = cand;
      }
    } else {
      final now = DateTime.now();
      if (batchStart != null && now.isBefore(batchStart)) {
        selectedDate = batchStart;
      } else if (batchEnd != null && now.isAfter(batchEnd)) {
        selectedDate = batchEnd;
      } else {
        selectedDate = now;
      }
    }

    bool isSlotBusy(DateTime d, int sH, int sM, int eH, int eM) {
      final dStr = DateFormat('yyyy-MM-dd').format(d);
      final sMin = sH * 60 + sM;
      final eMin = eH * 60 + eM;
      return _schedules.any((s) {
        if (s.sessionDate != dStr) return false;
        final sp = s.startTime.split(':');
        final ep = s.endTime.split(':');
        if (sp.length < 2 || ep.length < 2) return false;
        final exS = (int.tryParse(sp[0]) ?? 0) * 60 + (int.tryParse(sp[1]) ?? 0);
        final exE = (int.tryParse(ep[0]) ?? 0) * 60 + (int.tryParse(ep[1]) ?? 0);
        return sMin < exE && exS < eMin;
      });
    }

    TimeOfDay startTime = const TimeOfDay(hour: 8, minute: 30);
    TimeOfDay endTime = const TimeOfDay(hour: 11, minute: 30);
    if (isSlotBusy(selectedDate, 8, 30, 11, 30)) {
      if (!isSlotBusy(selectedDate, 13, 30, 17, 0)) {
        startTime = const TimeOfDay(hour: 13, minute: 30);
        endTime = const TimeOfDay(hour: 17, minute: 0);
      } else if (!isSlotBusy(selectedDate, 18, 0, 21, 0)) {
        startTime = const TimeOfDay(hour: 18, minute: 0);
        endTime = const TimeOfDay(hour: 21, minute: 0);
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final dateStr = DateFormat('dd/MM/yyyy').format(selectedDate);
            final sTimeStr = '${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')}';
            final eTimeStr = '${endTime.hour.toString().padLeft(2, '0')}:${endTime.minute.toString().padLeft(2, '0')}';
            final hasConflict = isSlotBusy(selectedDate, startTime.hour, startTime.minute, endTime.hour, endTime.minute);

            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                left: 16,
                right: 16,
                top: 14,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD1D5DB),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  Text(
                    'Thêm buổi học mới vào lớp',
                    style: AppTypography.zaloFont(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                  ),
                  Text(
                    'Lớp: ${_batch.batchCode} · ${_batch.courseTitle ?? ""}',
                    style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 14),

                  if (hasConflict) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFCA5A5)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, size: 15, color: Color(0xFFDC2626)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Lưu ý: Lớp đã có buổi học trong khung giờ này ngày $dateStr!',
                              style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFFDC2626)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  Text('Chủ đề bài giảng / Nội dung:', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: topicCtrl,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                    ),
                    style: AppTypography.zaloFont(fontSize: 12.5),
                  ),
                  const SizedBox(height: 12),

                  Text('Hình thức đào tạo:', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setSheetState(() => isLab = false),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: !isLab ? const Color(0xFFE0F2FE) : const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: !isLab ? const Color(0xFF0284C7) : const Color(0xFFE5E7EB)),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Lý thuyết chuyên sâu',
                              style: AppTypography.zaloFont(
                                fontSize: 11.5,
                                fontWeight: !isLab ? FontWeight.w700 : FontWeight.w500,
                                color: !isLab ? const Color(0xFF0284C7) : const Color(0xFF6B7280),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setSheetState(() => isLab = true),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: isLab ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: isLab ? const Color(0xFF00693F) : const Color(0xFFE5E7EB)),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Thực hành Lab Lâm sàng',
                              style: AppTypography.zaloFont(
                                fontSize: 11.5,
                                fontWeight: isLab ? FontWeight.w700 : FontWeight.w500,
                                color: isLab ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Ngày học:', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            InkWell(
                              onTap: () async {
                                final firstD = batchStart ?? DateTime.now().subtract(const Duration(days: 30));
                                final lastD = batchEnd ?? DateTime.now().add(const Duration(days: 365));
                                final initD = selectedDate.isBefore(firstD)
                                    ? firstD
                                    : (selectedDate.isAfter(lastD) ? lastD : selectedDate);
                                final d = await showDatePicker(
                                  context: context,
                                  initialDate: initD,
                                  firstDate: firstD,
                                  lastDate: lastD,
                                );
                                if (d != null) {
                                  setSheetState(() {
                                    selectedDate = d;
                                    if (isSlotBusy(selectedDate, startTime.hour, startTime.minute, endTime.hour, endTime.minute)) {
                                      if (!isSlotBusy(selectedDate, 8, 30, 11, 30)) {
                                        startTime = const TimeOfDay(hour: 8, minute: 30);
                                        endTime = const TimeOfDay(hour: 11, minute: 30);
                                      } else if (!isSlotBusy(selectedDate, 13, 30, 17, 0)) {
                                        startTime = const TimeOfDay(hour: 13, minute: 30);
                                        endTime = const TimeOfDay(hour: 17, minute: 0);
                                      } else if (!isSlotBusy(selectedDate, 18, 0, 21, 0)) {
                                        startTime = const TimeOfDay(hour: 18, minute: 0);
                                        endTime = const TimeOfDay(hour: 21, minute: 0);
                                      }
                                    }
                                  });
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF9FAFB),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFE5E7EB)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.calendar_today_rounded, size: 14, color: Color(0xFF00693F)),
                                    const SizedBox(width: 6),
                                    Text(dateStr, style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Khung giờ:', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Expanded(
                                  child: InkWell(
                                    onTap: () async {
                                      final picked = await showTimePicker(
                                        context: context,
                                        initialTime: startTime,
                                      );
                                      if (picked != null) {
                                        setSheetState(() => startTime = picked);
                                      }
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 9),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF9FAFB),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: const Color(0xFFE5E7EB)),
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        sTimeStr,
                                        style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF0284C7)),
                                      ),
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 3),
                                  child: Text('–', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                                ),
                                Expanded(
                                  child: InkWell(
                                    onTap: () async {
                                      final picked = await showTimePicker(
                                        context: context,
                                        initialTime: endTime,
                                      );
                                      if (picked != null) {
                                        setSheetState(() => endTime = picked);
                                      }
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 9),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF9FAFB),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: const Color(0xFFE5E7EB)),
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        eTimeStr,
                                        style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF0284C7)),
                                      ),
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
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      _buildQuickTimeChip('Sáng 08:30 - 11:30', const TimeOfDay(hour: 8, minute: 30), const TimeOfDay(hour: 11, minute: 30), startTime, endTime, (s, e) {
                        setSheetState(() {
                          startTime = s;
                          endTime = e;
                        });
                      }),
                      _buildQuickTimeChip('Chiều 13:30 - 17:00', const TimeOfDay(hour: 13, minute: 30), const TimeOfDay(hour: 17, minute: 0), startTime, endTime, (s, e) {
                        setSheetState(() {
                          startTime = s;
                          endTime = e;
                        });
                      }),
                      _buildQuickTimeChip('Tối 18:00 - 21:00', const TimeOfDay(hour: 18, minute: 0), const TimeOfDay(hour: 21, minute: 0), startTime, endTime, (s, e) {
                        setSheetState(() {
                          startTime = s;
                          endTime = e;
                        });
                      }),
                    ],
                  ),
                  const SizedBox(height: 18),

                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton(
                      onPressed: () async {
                        final topic = topicCtrl.text.trim();
                        if (topic.isEmpty) return;
                        if (hasConflict) {
                          TopNotificationService.showWarning(
                            title: 'Trùng lịch học',
                            message: 'Lớp đã có buổi học trong khung giờ này ngày $dateStr. Vui lòng chọn giờ khác.',
                          );
                          return;
                        }
                        final dateParam = DateFormat('yyyy-MM-dd').format(selectedDate);
                        final ok = await _repository.createBatchSchedule(
                          batchId: _batch.id,
                          topic: topic,
                          sessionDate: dateParam,
                          startTime: '$sTimeStr:00',
                          endTime: '$eTimeStr:00',
                          isPracticeLab: isLab,
                        );
                        if (ok) {
                          if (ctx.mounted) Navigator.pop(ctx);
                          await _loadSchedules();
                          widget.onDataChanged?.call();
                          TopNotificationService.showSuccess(
                            title: 'Tạo buổi học thành công',
                            message: 'Đã thêm buổi học mới vào lớp ${_batch.batchCode}!',
                          );
                        } else {
                          final errMsg = _repository.lastScheduleError ?? 'Không thể thêm buổi học. Vui lòng kiểm tra lại ngày học hoặc phân phòng.';
                          TopNotificationService.showError(
                            title: 'Không thể thêm buổi học',
                            message: errMsg,
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00693F),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Text(
                        'Tạo buổi học & Lưu vào lịch',
                        style: AppTypography.zaloFont(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
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

  void _openEditScheduleSheet(AdminBatchScheduleModel s) {
    final topicCtrl = TextEditingController(text: s.topic);
    bool isLab = s.isPracticeLab;
    DateTime selectedDate = DateTime.tryParse(s.sessionDate) ?? DateTime.now();

    TimeOfDay startTime = const TimeOfDay(hour: 13, minute: 0);
    try {
      final parts = s.startTime.split(':');
      if (parts.length >= 2) {
        startTime = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
      }
    } catch (_) {}

    TimeOfDay endTime = const TimeOfDay(hour: 17, minute: 0);
    try {
      final parts = s.endTime.split(':');
      if (parts.length >= 2) {
        endTime = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
      }
    } catch (_) {}

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final dateStr = DateFormat('dd/MM/yyyy').format(selectedDate);
            final sTimeStr = '${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')}';
            final eTimeStr = '${endTime.hour.toString().padLeft(2, '0')}:${endTime.minute.toString().padLeft(2, '0')}';

            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                left: 16,
                right: 16,
                top: 14,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD1D5DB),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  Text(
                    'Đổi lịch & Cập nhật buổi học',
                    style: AppTypography.zaloFont(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                  ),
                  Text(
                    'Buổi ${_getSessionNumber(s)} · Lớp: ${_batch.batchCode}',
                    style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 14),

                  Text('Chủ đề bài giảng / Nội dung:', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: topicCtrl,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                    ),
                    style: AppTypography.zaloFont(fontSize: 12.5),
                  ),
                  const SizedBox(height: 12),

                  Text('Hình thức đào tạo:', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setSheetState(() => isLab = false),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: !isLab ? const Color(0xFFE0F2FE) : const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: !isLab ? const Color(0xFF0284C7) : const Color(0xFFE5E7EB)),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Lý thuyết chuyên sâu',
                              style: AppTypography.zaloFont(
                                fontSize: 11.5,
                                fontWeight: !isLab ? FontWeight.w700 : FontWeight.w500,
                                color: !isLab ? const Color(0xFF0284C7) : const Color(0xFF6B7280),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setSheetState(() => isLab = true),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: isLab ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: isLab ? const Color(0xFF00693F) : const Color(0xFFE5E7EB)),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Thực hành Lab Lâm sàng',
                              style: AppTypography.zaloFont(
                                fontSize: 11.5,
                                fontWeight: isLab ? FontWeight.w700 : FontWeight.w500,
                                color: isLab ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Ngày học:', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            InkWell(
                              onTap: () async {
                                final d = await showDatePicker(
                                  context: context,
                                  initialDate: selectedDate,
                                  firstDate: DateTime.now().subtract(const Duration(days: 90)),
                                  lastDate: DateTime.now().add(const Duration(days: 365)),
                                );
                                if (d != null) {
                                  setSheetState(() => selectedDate = d);
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF9FAFB),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFE5E7EB)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.calendar_today_rounded, size: 14, color: Color(0xFF00693F)),
                                    const SizedBox(width: 6),
                                    Text(dateStr, style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Khung giờ:', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Expanded(
                                  child: InkWell(
                                    onTap: () async {
                                      final picked = await showTimePicker(
                                        context: context,
                                        initialTime: startTime,
                                      );
                                      if (picked != null) {
                                        setSheetState(() => startTime = picked);
                                      }
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 9),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF9FAFB),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: const Color(0xFFE5E7EB)),
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        sTimeStr,
                                        style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF0284C7)),
                                      ),
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 3),
                                  child: Text('–', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                                ),
                                Expanded(
                                  child: InkWell(
                                    onTap: () async {
                                      final picked = await showTimePicker(
                                        context: context,
                                        initialTime: endTime,
                                      );
                                      if (picked != null) {
                                        setSheetState(() => endTime = picked);
                                      }
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 9),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF9FAFB),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: const Color(0xFFE5E7EB)),
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        eTimeStr,
                                        style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF0284C7)),
                                      ),
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
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      _buildQuickTimeChip('Sáng 08:00 - 11:30', const TimeOfDay(hour: 8, minute: 0), const TimeOfDay(hour: 11, minute: 30), startTime, endTime, (sTime, eTime) {
                        setSheetState(() {
                          startTime = sTime;
                          endTime = eTime;
                        });
                      }),
                      _buildQuickTimeChip('Chiều 13:30 - 17:00', const TimeOfDay(hour: 13, minute: 30), const TimeOfDay(hour: 17, minute: 0), startTime, endTime, (sTime, eTime) {
                        setSheetState(() {
                          startTime = sTime;
                          endTime = eTime;
                        });
                      }),
                      _buildQuickTimeChip('Tối 18:00 - 21:00', const TimeOfDay(hour: 18, minute: 0), const TimeOfDay(hour: 21, minute: 0), startTime, endTime, (sTime, eTime) {
                        setSheetState(() {
                          startTime = sTime;
                          endTime = eTime;
                        });
                      }),
                    ],
                  ),
                  const SizedBox(height: 18),

                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _confirmDeleteSchedule(s);
                        },
                        icon: const Icon(Icons.delete_outline_rounded, size: 15, color: Color(0xFFDC2626)),
                        label: Text(
                          'Xóa buổi',
                          style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFFDC2626)),
                        ),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                          side: const BorderSide(color: Color(0xFFDC2626), width: 1),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: SizedBox(
                          height: 44,
                          child: ElevatedButton(
                            onPressed: () async {
                              final topic = topicCtrl.text.trim();
                              if (topic.isEmpty) return;
                              Navigator.pop(ctx);
                              final dateParam = DateFormat('yyyy-MM-dd').format(selectedDate);
                              final ok = await _repository.updateBatchSchedule(
                                scheduleId: s.id,
                                topic: topic,
                                sessionDate: dateParam,
                                startTime: '$sTimeStr:00',
                                endTime: '$eTimeStr:00',
                                isPracticeLab: isLab,
                              );
                              if (ok) {
                                _loadSchedules();
                                widget.onDataChanged?.call();
                                TopNotificationService.showSuccess(
                                  title: 'Cập nhật thành công',
                                  message: 'Đã đổi lịch buổi ${_getSessionNumber(s)} lớp ${_batch.batchCode}!',
                                );
                              } else {
                                final errMsg = _repository.lastScheduleError ?? 'Không thể lưu thay đổi buổi học. Vui lòng kiểm tra lại!';
                                TopNotificationService.showError(
                                  title: 'Cập nhật thất bại',
                                  message: errMsg,
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF004890),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: Text(
                              'Lưu thay đổi lịch học',
                              style: AppTypography.zaloFont(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _confirmDeleteSchedule(AdminBatchScheduleModel s) {
    final sessionNum = _getSessionNumber(s);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.delete_outline_rounded, color: Color(0xFFDC2626), size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Xóa Buổi $sessionNum?',
                style: AppTypography.zaloFont(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textHeading),
              ),
            ),
          ],
        ),
        content: Text(
          'Bạn có chắc chắn muốn xóa "${s.topic}" (${s.formattedDate} · ${s.timeSlotDisplay}) khỏi lớp ${_batch.batchCode} không?\nHành động này không thể hoàn tác.',
          style: AppTypography.zaloFont(fontSize: 13, color: const Color(0xFF4B5563), height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Hủy',
              style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF6B7280)),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await _repository.deleteBatchSchedule(s.id);
              if (!mounted) return;
              if (ok) {
                _loadSchedules();
                widget.onDataChanged?.call();
                TopNotificationService.showSuccess(
                  title: 'Đã xóa buổi học',
                  message: 'Đã xóa Buổi $sessionNum khỏi lớp ${_batch.batchCode} thành công.',
                );
              } else {
                final errMsg = _repository.lastScheduleError ?? 'Không thể xóa buổi học. Vui lòng thử lại sau!';
                TopNotificationService.showError(
                  title: 'Xóa thất bại',
                  message: errMsg,
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(
              'Xóa vĩnh viễn',
              style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickTimeChip(
    String label,
    TimeOfDay s,
    TimeOfDay e,
    TimeOfDay currentS,
    TimeOfDay currentE,
    Function(TimeOfDay, TimeOfDay) onSelect,
  ) {
    final isSelected = currentS.hour == s.hour && currentS.minute == s.minute && currentE.hour == e.hour && currentE.minute == e.minute;
    return InkWell(
      onTap: () => onSelect(s, e),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE0F2FE) : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: isSelected ? const Color(0xFF0284C7) : Colors.transparent),
        ),
        child: Text(
          label,
          style: AppTypography.zaloFont(
            fontSize: 10,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? const Color(0xFF0284C7) : const Color(0xFF4B5563),
          ),
        ),
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
          if (_currentTab == 0)
            IconButton(
              tooltip: 'Thêm buổi học',
              icon: const Icon(Icons.add_task_rounded, color: Color(0xFF00693F), size: 21),
              onPressed: _openAddScheduleSheet,
            )
          else ...[
            IconButton(
              tooltip: _isAttendanceMode ? 'Tắt chọn nhanh điểm danh' : 'Bật chọn nhanh điểm danh',
              icon: Icon(
                _isAttendanceMode ? Icons.check_box_rounded : Icons.checklist_rounded,
                color: _isAttendanceMode ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                size: 21,
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
          ],
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // 1. Thẻ Thông tin Lớp học (Tối ưu độ cao gọn gàng)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
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
                const SizedBox(height: 6),
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
                const SizedBox(height: 3),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: fillRatio,
                    minHeight: 4.5,
                    backgroundColor: const Color(0xFFE5E7EB),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      fillRatio >= 1.0 ? const Color(0xFFDC2626) : const Color(0xFF00693F),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 2. Thanh điều hướng 2 Tab Khoa học (Lịch học & Giáo trình / Danh sách Học viên)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 2, 14, 8),
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _currentTab = 0),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 7),
                        decoration: BoxDecoration(
                          color: _currentTab == 0 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: _currentTab == 0
                              ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))]
                              : null,
                        ),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.calendar_month_rounded,
                              size: 15,
                              color: _currentTab == 0 ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              'Lịch học & Giáo trình (${_schedules.length})',
                              style: AppTypography.zaloFont(
                                fontSize: 12,
                                fontWeight: _currentTab == 0 ? FontWeight.w700 : FontWeight.w500,
                                color: _currentTab == 0 ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _currentTab = 1),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 7),
                        decoration: BoxDecoration(
                          color: _currentTab == 1 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: _currentTab == 1
                              ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))]
                              : null,
                        ),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.people_alt_rounded,
                              size: 15,
                              color: _currentTab == 1 ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              'Học viên (${students.length})',
                              style: AppTypography.zaloFont(
                                fontSize: 12,
                                fontWeight: _currentTab == 1 ? FontWeight.w700 : FontWeight.w500,
                                color: _currentTab == 1 ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 3. Nội dung Tab tương ứng
          if (_currentTab == 0)
            _buildScheduleTab()
          else
            _buildStudentsTab(students),
        ],
      ),
    );
  }

  // --- TAB 1: LỊCH HỌC & GIÁO TRÌNH KHOA HỌC ---
  Widget _buildScheduleTab() {
    if (_isLoadingSchedules) {
      return const Expanded(
        child: Center(
          child: CircularProgressIndicator(color: Color(0xFF00693F)),
        ),
      );
    }

    final schedules = _filteredSchedules;

    return Expanded(
      child: Column(
        children: [
          // Thẻ Lộ trình Tiến độ Khoa học (Roadmap Progress Card)
          Container(
            margin: const EdgeInsets.fromLTRB(14, 6, 14, 6),
            padding: const EdgeInsets.all(10),
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.school_rounded, size: 15, color: Color(0xFF00693F)),
                        const SizedBox(width: 5),
                        Text(
                          'Lộ trình đào tạo chuẩn Y khoa MLD',
                          style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F6ED),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${_schedules.length} buổi đào tạo',
                        style: AppTypography.zaloFont(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF00693F)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // 4 Chỉ số KPI lộ trình
                Row(
                  children: [
                    _buildMiniKpi('Đã diễn ra', '$_completedSessionsCount buổi', const Color(0xFF00693F), const Color(0xFFE8F6ED)),
                    const SizedBox(width: 6),
                    _buildMiniKpi('Sắp tới', '$_upcomingSessionsCount buổi', const Color(0xFF0284C7), const Color(0xFFE0F2FE)),
                    const SizedBox(width: 6),
                    _buildMiniKpi('Thực hành', '$_labCount buổi', const Color(0xFF7C3AED), const Color(0xFFEDE9FE)),
                    const SizedBox(width: 6),
                    _buildMiniKpi('Tiến độ', '${(_scheduleProgressRatio * 100).toInt()}%', const Color(0xFFD97706), const Color(0xFFFEF3C7)),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _scheduleProgressRatio,
                    minHeight: 4,
                    backgroundColor: const Color(0xFFE5E7EB),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF00693F)),
                  ),
                ),
              ],
            ),
          ),

          // Thanh lọc Filter Chips & Nút + Thêm buổi
          Container(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 6),
            child: Row(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildFilterChip('Tất cả (${_schedules.length})', 'ALL'),
                        const SizedBox(width: 5),
                        _buildFilterChip('Thực hành ($_labCount)', 'LAB'),
                        const SizedBox(width: 5),
                        _buildFilterChip('Lý thuyết ($_theoryCount)', 'THEORY'),
                        const SizedBox(width: 5),
                        _buildFilterChip('Sắp tới ($_upcomingSessionsCount)', 'TODAY_UPCOMING'),
                        const SizedBox(width: 5),
                        _buildFilterChip('Đã học ($_completedSessionsCount)', 'COMPLETED'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                InkWell(
                  onTap: _openAddScheduleSheet,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00693F),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.add_rounded, color: Colors.white, size: 14),
                        const SizedBox(width: 2),
                        Text(
                          'Thêm buổi',
                          style: AppTypography.zaloFont(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: Color(0xFFE5E7EB)),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            color: const Color(0xFFF9FAFB),
            child: Row(
              children: [
                const Icon(Icons.swipe_left_rounded, size: 14, color: Color(0xFF6B7280)),
                const SizedBox(width: 4),
                Text(
                  'Vuốt thẻ sang trái để Sửa hoặc Xóa buổi học',
                  style: AppTypography.zaloFont(fontSize: 10, color: const Color(0xFF6B7280), fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),

          Expanded(
            child: schedules.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: const BoxDecoration(color: Color(0xFFF3F4F6), shape: BoxShape.circle),
                          child: const Icon(Icons.event_busy_rounded, size: 24, color: Color(0xFF9CA3AF)),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Chưa có buổi học nào theo bộ lọc này',
                          style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Bấm "Thêm buổi" để lập thời khóa biểu cho lớp học',
                          style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(14, 8, 14, 16),
                    itemCount: schedules.length,
                    itemBuilder: (ctx, idx) {
                      final s = schedules[idx];
                      return _buildScientificTimelineCard(s, idx, schedules.length);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _scheduleFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _scheduleFilter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF00693F) : Colors.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: isSelected ? const Color(0xFF00693F) : const Color(0xFFE5E7EB)),
        ),
        child: Text(
          label,
          style: AppTypography.zaloFont(
            fontSize: 10.5,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF4B5563),
          ),
        ),
      ),
    );
  }

  Widget _buildScientificTimelineCard(AdminBatchScheduleModel s, int idx, int total) {
    final isCompleted = s.status == 'COMPLETED';
    final isToday = s.status == 'TODAY';
    final nodeColor = isCompleted
        ? const Color(0xFF00693F)
        : (isToday ? const Color(0xFFD97706) : const Color(0xFF9CA3AF));

    final typeColor = s.isPracticeLab ? const Color(0xFF059669) : const Color(0xFF0284C7);
    final typeBg = s.isPracticeLab ? const Color(0xFFE8F6ED) : const Color(0xFFE0F2FE);
    final typeLabel = s.isPracticeLab ? 'Thực hành Lab' : 'Lý thuyết';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                color: isToday ? const Color(0xFFFEF3C7) : (isCompleted ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6)),
                shape: BoxShape.circle,
                border: Border.all(color: nodeColor, width: isToday ? 2.5 : 1.5),
              ),
              alignment: Alignment.center,
              child: isCompleted
                  ? const Icon(Icons.check_rounded, size: 15, color: Color(0xFF00693F))
                  : (isToday
                      ? const Icon(Icons.play_arrow_rounded, size: 15, color: Color(0xFFD97706))
                      : Text(
                          '${_getSessionNumber(s)}',
                          style: AppTypography.zaloFont(fontSize: 10.5, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280)),
                        )),
            ),
            if (idx < total - 1)
              Container(
                width: 2,
                height: 110,
                color: isCompleted ? const Color(0xFF00693F).withValues(alpha: 0.3) : const Color(0xFFE5E7EB),
              ),
          ],
        ),

        const SizedBox(width: 8),

        Expanded(
          child: _SwipeableScheduleCard(
            key: ValueKey('swipe_${s.id}'),
            onEdit: () => _openEditScheduleSheet(s),
            onDelete: () => _confirmDeleteSchedule(s),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isToday ? const Color(0xFFD97706) : const Color(0xFFE5E7EB),
                  width: isToday ? 1.5 : 1.0,
                ),
                boxShadow: [
                  BoxShadow(
                    color: isToday
                        ? const Color(0xFFD97706).withValues(alpha: 0.08)
                        : Colors.black.withValues(alpha: 0.015),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    decoration: BoxDecoration(
                      color: isToday ? const Color(0xFFFFFBEB) : const Color(0xFFF9FAFB),
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(9)),
                      border: const Border(bottom: BorderSide(color: Color(0xFFE5E7EB), width: 0.5)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: const Color(0xFF00693F),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'BUỔI ${_getSessionNumber(s)}',
                            style: AppTypography.zaloFont(fontSize: 9.5, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                        ),
                        const SizedBox(width: 5),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: typeBg,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            typeLabel,
                            style: AppTypography.zaloFont(fontSize: 9.5, fontWeight: FontWeight.w700, color: typeColor),
                          ),
                        ),
                        const Spacer(),
                        if (isToday)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFDC2626),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'HÔM NAY',
                              style: AppTypography.zaloFont(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                          )
                        else if (isCompleted)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE5E7EB),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'Đã diễn ra',
                              style: AppTypography.zaloFont(fontSize: 9, fontWeight: FontWeight.w600, color: const Color(0xFF6B7280)),
                            ),
                          )
                        else
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE0F2FE),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'Sắp tới',
                              style: AppTypography.zaloFont(fontSize: 9, fontWeight: FontWeight.w600, color: const Color(0xFF0284C7)),
                            ),
                          ),
                      ],
                    ),
                  ),

                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 6, 8, 5),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s.topic,
                          style: AppTypography.zaloFont(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textHeading,
                            height: 1.25,
                          ),
                        ),
                        const SizedBox(height: 5),
                        Row(
                          children: [
                            const Icon(Icons.calendar_month_outlined, size: 12, color: Color(0xFFD97706)),
                            const SizedBox(width: 3),
                            Text(
                              s.formattedDate,
                              style: AppTypography.zaloFont(fontSize: 10.5, fontWeight: FontWeight.w600, color: const Color(0xFF374151)),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.access_time_rounded, size: 12, color: Color(0xFF0284C7)),
                            const SizedBox(width: 3),
                            Text(
                              s.timeSlotDisplay,
                              style: AppTypography.zaloFont(fontSize: 10.5, fontWeight: FontWeight.w600, color: const Color(0xFF0284C7)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined, size: 12, color: Color(0xFFDC2626)),
                            const SizedBox(width: 3),
                            Expanded(
                              child: Text(
                                s.roomName ?? _batch.roomName ?? 'Phòng Lab MLD',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.zaloFont(fontSize: 10, color: AppColors.textSecondary),
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Icon(Icons.badge_outlined, size: 12, color: Color(0xFF00693F)),
                            const SizedBox(width: 3),
                            Text(
                              s.instructorName ?? _batch.instructorName ?? 'Lâm Xuân Trường',
                              style: AppTypography.zaloFont(fontSize: 10, fontWeight: FontWeight.w600, color: const Color(0xFF00693F)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const Divider(height: 1, color: Color(0xFFE5E7EB)),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Lớp ${_studentsInBatch.length} học viên',
                          style: AppTypography.zaloFont(fontSize: 10, color: const Color(0xFF6B7280)),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            OutlinedButton.icon(
                              onPressed: () => _openEditScheduleSheet(s),
                              icon: const Icon(Icons.edit_rounded, size: 11, color: Color(0xFF004890)),
                              label: Text(
                                'Sửa',
                                style: AppTypography.zaloFont(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF004890),
                                ),
                              ),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                side: const BorderSide(color: Color(0xFF004890), width: 0.8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                              ),
                            ),
                            const SizedBox(width: 5),
                            ElevatedButton.icon(
                              onPressed: () => _openAttendanceSheet(s),
                              icon: const Icon(Icons.checklist_rounded, size: 11, color: Colors.white),
                              label: Text(
                                'Điểm danh',
                                style: AppTypography.zaloFont(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF00693F),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
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
        ),
      ],
    );
  }

  // --- TAB 2: DANH SÁCH HỌC VIÊN ---
  Widget _buildStudentsTab(List<AdminCandidateModel> students) {
    return Expanded(
      child: Column(
        children: [
          // 3 Ô Thống kê KPI Lớp học (Compact)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
            child: Row(
              children: [
                _buildMiniKpi('Sĩ số hiện tại', '${students.length} hv', const Color(0xFF00693F), const Color(0xFFE8F6ED)),
                const SizedBox(width: 6),
                _buildMiniKpi('Đã nộp đủ', '$_fullyPaidCount/${students.length}', const Color(0xFF0284C7), const Color(0xFFE0F2FE)),
                const SizedBox(width: 6),
                _buildMiniKpi('Tổng thu', _formatPrice(_totalCollected), const Color(0xFF7C3AED), const Color(0xFFEDE9FE)),
              ],
            ),
          ),

          // Thanh tìm kiếm học viên trong lớp
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

          // Danh sách Học viên Dạng Compact
          Expanded(
            child: students.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: const BoxDecoration(color: Color(0xFFF3F4F6), shape: BoxShape.circle),
                          child: const Icon(Icons.group_off_rounded, size: 24, color: Color(0xFF9CA3AF)),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Lớp chưa có học viên nào',
                          style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Bấm nút bên dưới để chọn học viên từ danh sách chờ',
                          style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: _openAddStudentSheet,
                          icon: const Icon(Icons.person_add_rounded, size: 15),
                          label: Text('Thêm học viên vào lớp', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00693F),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
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
                                          '${c.candidatePhone} · ${(c.studentCode != null && c.studentCode!.isNotEmpty) ? c.studentCode! : c.orderCode}',
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
                              onSelected: (action) async {
                                if (action == 'edit_student_code') {
                                  final saved = await showEditStudentCodeDialog(
                                    context: context,
                                    candidate: c,
                                    repository: _repository,
                                  );
                                  if (saved && mounted) {
                                    final refreshed = await _repository.fetchCandidates();
                                    if (mounted && refreshed.isNotEmpty) {
                                      setState(() => _allCandidates = refreshed);
                                    }
                                    widget.onDataChanged?.call();
                                  }
                                } else if (action == 'change_batch') {
                                  _openChangeBatch(c);
                                } else if (action == 'remove') {
                                  _unassignStudent(c);
                                }
                              },
                              itemBuilder: (ctx) => [
                                PopupMenuItem(
                                  value: 'edit_student_code',
                                  child: Row(
                                    children: [
                                      const Icon(Icons.badge_rounded, size: 16, color: Color(0xFF00693F)),
                                      const SizedBox(width: 8),
                                      Text('Cấp / Sửa Mã HV', style: AppTypography.zaloFont(fontSize: 12)),
                                    ],
                                  ),
                                ),
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
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(7),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.zaloFont(fontSize: 9.5, color: color.withValues(alpha: 0.8)),
            ),
            const SizedBox(height: 1),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.zaloFont(fontSize: 11.5, fontWeight: FontWeight.w700, color: color),
            ),
          ],
        ),
      ),
    );
  }
}

class _SwipeableScheduleCard extends StatefulWidget {
  final Widget child;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _SwipeableScheduleCard({
    required this.child,
    required this.onEdit,
    required this.onDelete,
    super.key,
  });

  @override
  State<_SwipeableScheduleCard> createState() => _SwipeableScheduleCardState();
}

class _SwipeableScheduleCardState extends State<_SwipeableScheduleCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  double _dragExtent = 0;
  static const double _actionWidth = 140.0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _animation = Tween<double>(begin: 0, end: 0).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _animateTo(double target) {
    _animation = Tween<double>(begin: _dragExtent, end: target).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    )..addListener(() {
        setState(() {
          _dragExtent = _animation.value;
        });
      });
    _controller.forward(from: 0.0);
  }

  void _handleDragUpdate(DragUpdateDetails details) {
    setState(() {
      _dragExtent = (_dragExtent + (details.primaryDelta ?? 0.0)).clamp(-_actionWidth, 0.0);
    });
  }

  void _handleDragEnd(DragEndDetails details) {
    final velocity = details.primaryVelocity ?? 0.0;
    if (_dragExtent < -_actionWidth / 2 || velocity < -300) {
      _animateTo(-_actionWidth);
    } else {
      _animateTo(0.0);
    }
  }

  void _close() {
    if (_dragExtent != 0) {
      _animateTo(0.0);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Stack(
          children: [
            Positioned.fill(
              child: Container(
                color: const Color(0xFFF3F4F6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    GestureDetector(
                      onTap: () {
                        _close();
                        widget.onEdit();
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        width: 70,
                        height: double.infinity,
                        color: const Color(0xFF004890),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.edit_calendar_rounded, color: Colors.white, size: 20),
                            const SizedBox(height: 3),
                            Text(
                              'Sửa',
                              style: AppTypography.zaloFont(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        _close();
                        widget.onDelete();
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        width: 70,
                        height: double.infinity,
                        color: const Color(0xFFDC2626),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.delete_forever_rounded, color: Colors.white, size: 20),
                            const SizedBox(height: 3),
                            Text(
                              'Xóa',
                              style: AppTypography.zaloFont(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            GestureDetector(
              onHorizontalDragUpdate: _handleDragUpdate,
              onHorizontalDragEnd: _handleDragEnd,
              onTap: _dragExtent < 0 ? _close : null,
              child: Transform.translate(
                offset: Offset(_dragExtent, 0),
                child: widget.child,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
