import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../../../../core/services/auth_service.dart';
import '../widgets/admin_candidate_card.dart';
import '../widgets/assign_batch_bottom_sheet.dart';
import '../widgets/edit_student_code_dialog.dart';
import '../widgets/pending_consultation_card.dart';
import '../widgets/quick_contact_actions.dart';
import '../../../../core/services/top_notification_service.dart';
import 'admin_batch_detail_screen.dart';

class AdminAcademyScreen extends StatefulWidget {
  final String? initialWorkflowTab;

  const AdminAcademyScreen({
    super.key,
    this.initialWorkflowTab,
  });

  @override
  State<AdminAcademyScreen> createState() => _AdminAcademyScreenState();
}

class _AdminAcademyScreenState extends State<AdminAcademyScreen> {
  final AdminRepository _repository = AdminRepository.instance;

  // 0: Bảng Trello Tuyển sinh (Kanban), 1: Theo Lớp học, 2: Đề thi & Bài nộp
  int _selectedSegment = 0;
  bool _isKanbanViewMode = true; // Cho phép chuyển qua lại giữa Kanban và List ở Tab 0
  String _selectedWorkflowStatus = 'ALL';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  List<AdminCandidateModel> _candidates = [];
  List<AdminCourseBatchModel> _batches = [];
  List<AdminCourseModel> _courses = [];
  List<Map<String, dynamic>> _instructors = [];

  String _selectedTrelloBatchId = 'ALL';
  DateTime _selectedStudentMonth = DateTime(DateTime.now().year, DateTime.now().month);
  String _selectedMonthlyCourseId = 'ALL';
  String _selectedMonthlyGradFilter = 'ALL';
  DateTime? _selectedBatchDate;
  bool _isAllBatchDates = true;

  final List<Map<String, dynamic>> _kanbanColumns = [
    {
      'key': 'PENDING_CONSULTATION',
      'title': 'Chờ tư vấn',
      'icon': Icons.contact_phone_rounded,
      'color': const Color(0xFFD97706),
      'bgColor': const Color(0xFFFEF3C7),
      'statuses': ['PENDING', 'PENDING_CONSULTATION', 'CONSULTING', 'PENDING_APPROVAL'],
    },
    {
      'key': 'CONFIRMED_PENDING_PAY',
      'title': 'Chờ nộp phí',
      'icon': Icons.pending_actions_rounded,
      'color': const Color(0xFF0284C7),
      'bgColor': const Color(0xFFE0F2FE),
      'statuses': ['CONFIRMED', 'CONFIRMED_PENDING_PAY', 'DEPOSITED'],
    },
    {
      'key': 'PAID_WAITING_CLASS',
      'title': 'Chờ xếp lớp',
      'icon': Icons.how_to_reg_rounded,
      'color': const Color(0xFF7C3AED),
      'bgColor': const Color(0xFFEDE9FE),
      'statuses': ['PAID', 'PAID_WAITING_CLASS', 'ENROLLED'],
    },
    {
      'key': 'ENROLLED_STUDYING',
      'title': 'Đang học',
      'icon': Icons.school_rounded,
      'color': const Color(0xFF00693F),
      'bgColor': const Color(0xFFE8F6ED),
      'statuses': ['ENROLLED_STUDYING', 'STUDYING'],
    },
    {
      'key': 'NOT_GRADUATED',
      'title': 'Chưa tốt nghiệp',
      'icon': Icons.hourglass_bottom_rounded,
      'color': const Color(0xFFC2410C),
      'bgColor': const Color(0xFFFFF7ED),
      'statuses': ['NOT_GRADUATED'],
    },
    {
      'key': 'COMPLETED',
      'title': 'Tốt nghiệp',
      'icon': Icons.verified_rounded,
      'color': const Color(0xFF4B5563),
      'bgColor': const Color(0xFFF3F4F6),
      'statuses': ['COMPLETED', 'GRADUATED'],
    },
    {
      'key': 'ARCHIVED',
      'title': 'Lưu trữ khách',
      'icon': Icons.archive_rounded,
      'color': const Color(0xFF6B7280),
      'bgColor': const Color(0xFFF1F5F9),
      'statuses': ['ARCHIVED', 'DROPPED'],
    },
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialWorkflowTab != null && widget.initialWorkflowTab!.isNotEmpty) {
      if (widget.initialWorkflowTab == 'MONTHLY_STUDENTS') {
        _selectedSegment = 2;
      } else if (widget.initialWorkflowTab == 'QUIZZES') {
        _selectedSegment = 1;
      } else {
        _selectedWorkflowStatus = widget.initialWorkflowTab!;
      }
    }
    _fetchData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final candidatesFuture = _repository.fetchCandidates();
      final batchesFuture = _repository.fetchAllCourseBatches();
      final coursesFuture = _repository.fetchCourses();
      final instructorsFuture = _repository.fetchInstructors();

      final results = await Future.wait([
        candidatesFuture,
        batchesFuture,
        coursesFuture,
        instructorsFuture,
      ]);

      if (mounted) {
        setState(() {
          _candidates = results[0] as List<AdminCandidateModel>;
          _batches = results[1] as List<AdminCourseBatchModel>;
          _courses = results[2] as List<AdminCourseModel>;
          _instructors = results[3] as List<Map<String, dynamic>>;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  bool _matchesTrelloBatch(AdminCandidateModel c) {
    if (_selectedTrelloBatchId == 'ALL') return true;
    if (_selectedTrelloBatchId == 'NO_BATCH') {
      return c.batchId == null || c.batchId!.isEmpty;
    }
    return c.batchId == _selectedTrelloBatchId || c.batchCode == _selectedTrelloBatchId;
  }

  List<AdminCandidateModel> get _filteredCandidates {
    List<AdminCandidateModel> list = _candidates.where(_matchesTrelloBatch).toList();
    if (_selectedWorkflowStatus != 'ALL') {
      list = list.where((c) => c.status == _selectedWorkflowStatus).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((c) {
        return c.candidateName.toLowerCase().contains(q) ||
            c.candidatePhone.toLowerCase().contains(q) ||
            c.orderCode.toLowerCase().contains(q) ||
            (c.studentCode?.toLowerCase().contains(q) ?? false) ||
            c.courseTitle.toLowerCase().contains(q);
      }).toList();
    }
    return list;
  }

  bool _candidateBelongsToMonth(AdminCandidateModel c, DateTime month) {
    final monthStart = DateTime(month.year, month.month, 1);
    final monthEnd = DateTime(month.year, month.month + 1, 0, 23, 59, 59);

    String? startRaw = c.batchStartDate;
    String? endRaw = c.batchEndDate;
    if ((startRaw == null || startRaw.isEmpty) && c.batchId != null) {
      for (final b in _batches) {
        if (b.id == c.batchId) {
          startRaw = b.startDate;
          endRaw = b.endDate;
          break;
        }
      }
    }

    final startDate = startRaw != null ? DateTime.tryParse(startRaw) : null;
    final endDate = endRaw != null ? DateTime.tryParse(endRaw) : null;

    if (startDate != null) {
      if (endDate != null) {
        return !startDate.isAfter(monthEnd) && !endDate.isBefore(monthStart);
      }
      return startDate.year == month.year && startDate.month == month.month;
    }

    final created = DateTime.tryParse(c.createdAt);
    if (created != null) {
      return created.year == month.year && created.month == month.month;
    }
    return false;
  }

  List<AdminCandidateModel> get _monthlyEnrolledStudents {
    return _candidates.where((c) {
      final isEnrolled = (c.batchId != null && c.batchId!.isNotEmpty) ||
          c.status == 'ENROLLED_STUDYING' ||
          c.status == 'NOT_GRADUATED' ||
          c.status == 'COMPLETED';
      if (!isEnrolled) return false;
      return _candidateBelongsToMonth(c, _selectedStudentMonth);
    }).toList();
  }

  List<AdminCandidateModel> get _filteredMonthlyStudents {
    var list = _monthlyEnrolledStudents;
    if (_selectedMonthlyCourseId != 'ALL') {
      list = list.where((c) => c.courseId == _selectedMonthlyCourseId).toList();
    }
    if (_selectedMonthlyGradFilter != 'ALL') {
      list = list.where((c) => c.status == _selectedMonthlyGradFilter).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((c) {
        return c.candidateName.toLowerCase().contains(q) ||
            c.candidatePhone.toLowerCase().contains(q) ||
            c.orderCode.toLowerCase().contains(q) ||
            (c.studentCode?.toLowerCase().contains(q) ?? false) ||
            (c.batchCode?.toLowerCase().contains(q) ?? false) ||
            c.courseTitle.toLowerCase().contains(q);
      }).toList();
    }
    return list;
  }

  String _getBatchCodeFromId(String batchId) {
    for (final b in _batches) {
      if (b.id == batchId || b.batchCode == batchId) {
        return b.batchCode;
      }
    }
    return batchId;
  }

  Widget _buildMicroPill({
    required String label,
    required bool isSelected,
    VoidCallback? onTap,
    Color activeColor = const Color(0xFF00693F),
    Color? activeBgColor,
    Color inactiveBgColor = const Color(0xFFF3F4F6),
    Color inactiveTextColor = const Color(0xFF4B5563),
    IconData? icon,
    String? badgeText,
    bool showDropdownArrow = false,
  }) {
    final pillWidget = AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      height: 27,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: isSelected ? (activeBgColor ?? activeColor) : inactiveBgColor,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: isSelected ? activeColor : const Color(0xFFE5E7EB),
          width: isSelected ? 1.2 : 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: 13,
              color: isSelected ? Colors.white : inactiveTextColor,
            ),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: AppTypography.zaloFont(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? Colors.white : inactiveTextColor,
            ),
          ),
          if (badgeText != null && badgeText.isNotEmpty) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white.withValues(alpha: 0.25) : const Color(0xFFE5E7EB),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                badgeText,
                style: AppTypography.zaloFont(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : const Color(0xFF374151),
                ),
              ),
            ),
          ],
          if (showDropdownArrow) ...[
            const SizedBox(width: 3),
            Icon(
              Icons.arrow_drop_down_rounded,
              size: 14,
              color: isSelected ? Colors.white : inactiveTextColor,
            ),
          ],
        ],
      ),
    );

    if (onTap == null) {
      return pillWidget;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: pillWidget,
      ),
    );
  }

  List<AdminCandidateModel> _getCandidatesForColumn(List<dynamic> columnStatuses) {
    return _candidates.where((c) {
      if (!_matchesTrelloBatch(c)) return false;
      final statusUpper = c.status.toUpperCase();
      final matchStatus = columnStatuses.any((s) => statusUpper == s.toString().toUpperCase());
      if (!matchStatus) return false;
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return c.candidateName.toLowerCase().contains(q) ||
          c.candidatePhone.toLowerCase().contains(q) ||
          c.orderCode.toLowerCase().contains(q) ||
          (c.studentCode?.toLowerCase().contains(q) ?? false) ||
          c.courseTitle.toLowerCase().contains(q);
    }).toList();
  }

  void _showCreateBatchSheet(BuildContext context) {
    final activeCourses = _courses.where((c) => c.isActive).toList();
    final availableCourses = activeCourses.isNotEmpty ? activeCourses : _courses;
    String selectedCourseId = availableCourses.isNotEmpty ? availableCourses.first.id : '';

    String suggestCode(String courseId) {
      final c = availableCourses.firstWhere((x) => x.id == courseId, orElse: () => availableCourses.first);
      final num = (_batches.where((b) => b.courseId == courseId).length + 1).toString().padLeft(2, '0');
      final cCode = c.code.replaceAll('DAO_TAO_', 'K26-');
      return '$cCode-$num';
    }

    final batchCodeCtrl = TextEditingController(text: availableCourses.isNotEmpty ? suggestCode(selectedCourseId) : 'K26-MLD-01');
    final scheduleCtrl = TextEditingController(text: 'T2-T4-T6 (09:00 - 12:00)');
    final maxStudentsCtrl = TextEditingController(text: '15');

    DateTime startDate = DateTime.now().add(const Duration(days: 3));
    DateTime endDate = startDate.add(const Duration(days: 30));

    String? selectedInstructorId = _instructors.isNotEmpty ? _instructors.first['id']?.toString() : null;
    bool isSubmitting = false;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.white,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
            child: StatefulBuilder(
              builder: (context, setModalState) {
                final sDateStr = DateFormat('dd/MM/yyyy').format(startDate);
                final eDateStr = DateFormat('dd/MM/yyyy').format(endDate);

                return Padding(
                  padding: const EdgeInsets.all(20),
                  child: SingleChildScrollView(
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
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE8F6ED),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.add_home_work_rounded, color: Color(0xFF00693F), size: 20),
                                ),
                                const SizedBox(width: 10),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Mở lớp học đào tạo mới',
                                      style: AppTypography.zaloFont(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                                    ),
                                    Text(
                                      'Tạo lớp học từ các khóa học đang mở bán',
                                      style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            IconButton(
                              icon: const Icon(Icons.close_rounded, size: 20),
                              onPressed: () => Navigator.pop(ctx),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        Text('Khóa học đào tạo đang bán (*):', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFFE5E7EB)),
                            borderRadius: BorderRadius.circular(8),
                            color: const Color(0xFFF9FAFB),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: selectedCourseId.isNotEmpty ? selectedCourseId : null,
                              isExpanded: true,
                              icon: const Icon(Icons.keyboard_arrow_down_rounded),
                              items: availableCourses.map((c) {
                                return DropdownMenuItem<String>(
                                  value: c.id,
                                  child: Text(
                                    '${c.title} (${NumberFormat.currency(locale: 'vi_VN', symbol: 'đ', decimalDigits: 0).format(c.tuitionFee)})',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w500),
                                  ),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setModalState(() {
                                    selectedCourseId = val;
                                    batchCodeCtrl.text = suggestCode(val);
                                  });
                                }
                              },
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Mã lớp học (*):', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 6),
                                  TextField(
                                    controller: batchCodeCtrl,
                                    decoration: InputDecoration(
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                      filled: true,
                                      fillColor: const Color(0xFFF9FAFB),
                                    ),
                                    style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w700),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              flex: 2,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Sĩ số tối đa:', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 6),
                                  TextField(
                                    controller: maxStudentsCtrl,
                                    keyboardType: TextInputType.number,
                                    decoration: InputDecoration(
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                      filled: true,
                                      fillColor: const Color(0xFFF9FAFB),
                                      suffixText: 'hv',
                                    ),
                                    style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        Text('Giảng viên phụ trách (*):', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFFE5E7EB)),
                            borderRadius: BorderRadius.circular(8),
                            color: const Color(0xFFF9FAFB),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: selectedInstructorId,
                              isExpanded: true,
                              hint: Text('Chọn giảng viên', style: AppTypography.zaloFont(fontSize: 12.5, color: const Color(0xFF9CA3AF))),
                              icon: const Icon(Icons.keyboard_arrow_down_rounded),
                              items: _instructors.map((inst) {
                                return DropdownMenuItem<String>(
                                  value: inst['id']?.toString(),
                                  child: Text(
                                    '${inst['full_name']} · ${inst['title'] ?? 'Chuyên gia'}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: const Color(0xFF00693F)),
                                  ),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setModalState(() => selectedInstructorId = val);
                                }
                              },
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Khai giảng:', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 4),
                                  InkWell(
                                    onTap: () async {
                                      final picked = await showDatePicker(
                                        context: context,
                                        initialDate: startDate,
                                        firstDate: DateTime.now().subtract(const Duration(days: 30)),
                                        lastDate: DateTime.now().add(const Duration(days: 365)),
                                      );
                                      if (picked != null) {
                                        setModalState(() {
                                          startDate = picked;
                                          if (endDate.isBefore(startDate)) {
                                            endDate = startDate.add(const Duration(days: 30));
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
                                          const Icon(Icons.event_available_rounded, size: 14, color: Color(0xFF00693F)),
                                          const SizedBox(width: 6),
                                          Text(sDateStr, style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
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
                                  Text('Bế giảng:', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 4),
                                  InkWell(
                                    onTap: () async {
                                      final picked = await showDatePicker(
                                        context: context,
                                        initialDate: endDate,
                                        firstDate: startDate,
                                        lastDate: DateTime.now().add(const Duration(days: 730)),
                                      );
                                      if (picked != null) {
                                        setModalState(() => endDate = picked);
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
                                          const Icon(Icons.event_note_rounded, size: 14, color: Color(0xFF0284C7)),
                                          const SizedBox(width: 6),
                                          Text(eDateStr, style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        Text('Lịch học trong tuần (*):', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: scheduleCtrl,
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            filled: true,
                            fillColor: const Color(0xFFF9FAFB),
                            hintText: 'VD: T2-T4-T6 (09:00 - 12:00)',
                          ),
                          style: AppTypography.zaloFont(fontSize: 12.5),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            'T2-T4-T6 (09:00 - 12:00)',
                            'T2-T4-T6 (13:30 - 17:00)',
                            'T3-T5-T7 (09:00 - 12:00)',
                            'T7-CN (08:30 - 16:30)',
                          ].map((t) {
                            return InkWell(
                              onTap: () => setModalState(() => scheduleCtrl.text = t),
                              borderRadius: BorderRadius.circular(6),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                decoration: BoxDecoration(
                                  color: scheduleCtrl.text == t ? const Color(0xFFE0F2FE) : const Color(0xFFF3F4F6),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: scheduleCtrl.text == t ? const Color(0xFF0284C7) : const Color(0xFFE5E7EB),
                                  ),
                                ),
                                child: Text(
                                  t,
                                  style: AppTypography.zaloFont(
                                    fontSize: 10,
                                    fontWeight: scheduleCtrl.text == t ? FontWeight.w700 : FontWeight.w500,
                                    color: scheduleCtrl.text == t ? const Color(0xFF0284C7) : const Color(0xFF4B5563),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 18),

                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: ElevatedButton(
                            onPressed: isSubmitting
                                ? null
                                : () async {
                                    final bCode = batchCodeCtrl.text.trim();
                                    final sched = scheduleCtrl.text.trim();
                                    final maxSt = int.tryParse(maxStudentsCtrl.text.trim()) ?? 15;

                                    if (selectedCourseId.isEmpty) {
                                      TopNotificationService.showError(title: 'Chưa chọn khóa học', message: 'Vui lòng chọn khóa học để mở lớp.');
                                      return;
                                    }
                                    if (bCode.isEmpty) {
                                      TopNotificationService.showError(title: 'Mã lớp trống', message: 'Vui lòng nhập mã lớp học.');
                                      return;
                                    }
                                    if (sched.isEmpty) {
                                      TopNotificationService.showError(title: 'Lịch học trống', message: 'Vui lòng nhập lịch học.');
                                      return;
                                    }

                                    setModalState(() => isSubmitting = true);

                                    final sDateParam = DateFormat('yyyy-MM-dd').format(startDate);
                                    final eDateParam = DateFormat('yyyy-MM-dd').format(endDate);

                                    final ok = await _repository.createCourseBatch(
                                      courseId: selectedCourseId,
                                      batchCode: bCode,
                                      startDate: sDateParam,
                                      endDate: eDateParam,
                                      scheduleText: sched,
                                      instructorId: selectedInstructorId,
                                      maxStudents: maxSt,
                                    );

                                    if (!ctx.mounted) return;
                                    if (ok) {
                                      Navigator.pop(ctx);
                                      _fetchData();
                                      TopNotificationService.showSuccess(
                                        title: 'Mở lớp thành công',
                                        message: 'Đã mở lớp $bCode cho khóa học thành công!',
                                      );
                                    } else {
                                      setModalState(() => isSubmitting = false);
                                      final errMsg = _repository.lastScheduleError ?? 'Không thể tạo lớp học mới. Vui lòng kiểm tra lại!';
                                      TopNotificationService.showError(
                                        title: 'Mở lớp thất bại',
                                        message: errMsg,
                                      );
                                    }
                                  },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF00693F),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: isSubmitting
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : Text(
                                    'Xác nhận mở lớp học',
                                    style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w700),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  // --- CRUD KIỂU TRELLO: CREATE HỌC VIÊN ---
  void _showCreateCandidateSheet(BuildContext context, {String initialStatus = 'PENDING'}) {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final paidCtrl = TextEditingController(text: '0');
    final notesCtrl = TextEditingController();
    String selectedCourseId = _courses.isNotEmpty ? _courses.first.id : '';
    String selectedStatus = initialStatus;
    bool isSubmitting = false;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.white,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.82),
            child: StatefulBuilder(
              builder: (context, setModalState) => Padding(
                padding: const EdgeInsets.all(20),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8F6ED),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.person_add_rounded, color: Color(0xFF0D6832), size: 20),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Thêm thẻ học viên mới',
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.zaloFont(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textHeading,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const Divider(color: Color(0xFFE5E7EB)),
                const SizedBox(height: 12),

                // Họ và tên
                _buildFormFieldLabel('Họ và tên học viên *'),
                TextField(
                  controller: nameCtrl,
                  decoration: _buildInputDecoration('Nhập họ tên đầy đủ...'),
                  style: AppTypography.zaloFont(fontSize: 13),
                ),
                const SizedBox(height: 12),

                // Số điện thoại
                _buildFormFieldLabel('Số điện thoại *'),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: _buildInputDecoration('Nhập số điện thoại liên hệ...'),
                  style: AppTypography.zaloFont(fontSize: 13),
                ),
                const SizedBox(height: 12),

                // Email
                _buildFormFieldLabel('Email (nếu có)'),
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: _buildInputDecoration('hocvien@gmail.com'),
                  style: AppTypography.zaloFont(fontSize: 13),
                ),
                const SizedBox(height: 12),

                // Khóa học
                _buildFormFieldLabel('Khóa học ghi danh *'),
                if (_courses.isEmpty)
                  Text('Đang tải danh sách khóa học...', style: AppTypography.zaloFont(fontSize: 12))
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selectedCourseId.isNotEmpty ? selectedCourseId : _courses.first.id,
                        isExpanded: true,
                        style: AppTypography.zaloFont(fontSize: 13, color: AppColors.textHeading),
                        items: _courses.map((course) {
                          return DropdownMenuItem<String>(
                            value: course.id,
                            child: Text(course.title, overflow: TextOverflow.ellipsis),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => selectedCourseId = val);
                        },
                      ),
                    ),
                  ),
                const SizedBox(height: 12),

                // Trạng thái ban đầu (Cột Trello)
                _buildFormFieldLabel('Cột phân loại ban đầu'),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: selectedStatus,
                      isExpanded: true,
                      style: AppTypography.zaloFont(fontSize: 13, color: AppColors.textHeading),
                      items: const [
                        DropdownMenuItem(value: 'PENDING', child: Text('1. Chờ tư vấn (Lead)')),
                        DropdownMenuItem(value: 'CONFIRMED', child: Text('2. Chờ nộp phí (Đã chốt)')),
                        DropdownMenuItem(value: 'PAID', child: Text('3. Chờ xếp lớp (Đã đóng phí)')),
                        DropdownMenuItem(value: 'ENROLLED', child: Text('4. Đang học (Đã vào lớp)')),
                        DropdownMenuItem(value: 'COMPLETED', child: Text('5. Tốt nghiệp / Hoàn thành')),
                      ],
                      onChanged: (val) {
                        if (val != null) setModalState(() => selectedStatus = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Tiền đã đóng
                _buildFormFieldLabel('Số tiền đã đóng / đặt cọc (VNĐ)'),
                TextField(
                  controller: paidCtrl,
                  keyboardType: TextInputType.number,
                  decoration: _buildInputDecoration('0'),
                  style: AppTypography.zaloFont(fontSize: 13),
                ),
                const SizedBox(height: 12),

                // Ghi chú
                _buildFormFieldLabel('Ghi chú tư vấn'),
                TextField(
                  controller: notesCtrl,
                  maxLines: 2,
                  decoration: _buildInputDecoration('Ghi chú lịch học, nhu cầu...'),
                  style: AppTypography.zaloFont(fontSize: 13),
                ),
                const SizedBox(height: 20),

                // Nút tạo
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            final name = nameCtrl.text.trim();
                            final phone = phoneCtrl.text.trim();
                            if (name.isEmpty || phone.isEmpty) {
                              TopNotificationService.showWarning(
                                message: 'Vui lòng nhập họ tên và số điện thoại!',
                              );
                              return;
                            }
                            setModalState(() => isSubmitting = true);
                            final amount = double.tryParse(paidCtrl.text.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0.0;
                            final courseId = selectedCourseId.isNotEmpty ? selectedCourseId : (_courses.isNotEmpty ? _courses.first.id : '');

                            final success = await _repository.createCandidate(
                              candidateName: name,
                              candidatePhone: phone,
                              candidateEmail: emailCtrl.text.trim(),
                              courseId: courseId,
                              status: selectedStatus,
                              amountPaid: amount,
                              notes: notesCtrl.text.trim(),
                            );

                            if (ctx.mounted) {
                              Navigator.pop(ctx);
                              if (success) {
                                TopNotificationService.showSuccess(
                                  title: 'Thêm học viên thành công',
                                  message: 'Đã thêm thẻ học viên $name vào bảng Kanban!',
                                );
                                _fetchData();
                              } else {
                                TopNotificationService.showError(
                                  message: 'Lỗi khi thêm học viên. Vui lòng thử lại.',
                                );
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE8F6ED),
                      foregroundColor: const Color(0xFF00693F),
                      side: const BorderSide(color: Color(0xFF00693F), width: 1.2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    child: isSubmitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Color(0xFF00693F), strokeWidth: 2))
                        : Text(
                            'Xác nhận tạo thẻ HV',
                            style: AppTypography.zaloFont(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF00693F),
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  ),
),
    );
  }

  Widget _buildFormFieldLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Text(
        text,
        style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
      ),
    );
  }

  InputDecoration _buildInputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
      filled: true,
      fillColor: const Color(0xFFF9FAFB),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
    );
  }

  void _showCandidateDetailSheet(AdminCandidateModel c) {
    AdminCandidateModel current = c;
    final noteController = TextEditingController();
    bool isSavingNote = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) {
          final isEnrolledOrPaid = current.amountPaid > 0 ||
              (current.batchId != null && current.batchId!.isNotEmpty);
          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.9,
            ),
            padding: EdgeInsets.fromLTRB(
              20,
              20,
              20,
              20 + MediaQuery.of(modalCtx).viewInsets.bottom,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              current.candidateName,
                              style: AppTypography.zaloFont(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textHeading,
                              ),
                            ),
                            Text(
                              'Mã hồ sơ: ${current.orderCode}',
                              style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Text(
                                  'Mã học viên: ${current.studentCode ?? "Chưa cấp mã"}',
                                  style: AppTypography.zaloFont(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: current.studentCode != null
                                        ? const Color(0xFF00693F)
                                        : const Color(0xFFD97706),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                InkWell(
                                  onTap: () async {
                                    Navigator.pop(ctx);
                                    final saved = await showEditStudentCodeDialog(
                                      context: context,
                                      candidate: current,
                                      repository: _repository,
                                    );
                                    if (saved && mounted) _fetchData();
                                  },
                                  borderRadius: BorderRadius.circular(6),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE8F6ED),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      current.studentCode != null ? 'Sửa mã' : 'Cấp mã HV',
                                      style: AppTypography.zaloFont(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF00693F),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Divider(color: Color(0xFFE5E7EB)),
                  const SizedBox(height: 8),

                  Text(
                    'DI CHUYỂN CỘT KANBAN (TRELLO)',
                    style: AppTypography.zaloFont(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildMoveChip(ctx, current, 'PENDING_CONSULTATION', 'Chờ tư vấn', const Color(0xFFD97706)),
                        _buildMoveChip(ctx, current, 'CONFIRMED_PENDING_PAY', 'Chờ nộp phí', const Color(0xFF0284C7)),
                        _buildMoveChip(ctx, current, 'PAID_WAITING_CLASS', 'Chờ xếp lớp', const Color(0xFF7C3AED)),
                        _buildMoveChip(ctx, current, 'ENROLLED_STUDYING', 'Đang học', const Color(0xFF00693F)),
                        _buildMoveChip(ctx, current, 'NOT_GRADUATED', 'Chưa tốt nghiệp', const Color(0xFFC2410C)),
                        _buildMoveChip(ctx, current, 'COMPLETED', 'Tốt nghiệp', const Color(0xFF4B5563)),
                        _buildMoveChip(ctx, current, 'ARCHIVED', 'Lưu trữ khách', const Color(0xFF6B7280)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Divider(color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 6),

                  _buildDetailRow('Số điện thoại:', current.candidatePhone),
                  if (current.candidateEmail != null && current.candidateEmail!.isNotEmpty)
                    _buildDetailRow('Email:', current.candidateEmail!),
                  _buildDetailRow('Khóa học:', current.courseTitle),
                  _buildDetailRow('Dành cho đối tượng:', current.targetAudience, valueColor: AppColors.primary),
                  _buildDetailRow('Trạng thái hiện tại:', current.status),
                  _buildDetailRow('Học phí niêm yết:', _formatPrice(current.tuitionTotal)),
                  _buildDetailRow('Đã thanh toán:', _formatPrice(current.amountPaid)),
                  if (current.tuitionTotal > current.amountPaid)
                    _buildDetailRow(
                      'Còn lại cần thu:',
                      _formatPrice(current.tuitionTotal - current.amountPaid),
                      valueColor: const Color(0xFFDC2626),
                    ),
                  if (current.batchCode != null && current.batchCode!.isNotEmpty)
                    _buildDetailRow('Lớp phân bổ:', current.batchCode!),
                  if (current.createdAt.isNotEmpty)
                    _buildDetailRow('Ngày đăng ký:', current.createdAt),
                  if (current.notes != null && current.notes!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Ghi chú hồ sơ:',
                      style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                      ),
                      child: Text(
                        current.notes!,
                        style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textHeading),
                      ),
                    ),
                  ],

                  const SizedBox(height: 14),
                  const Divider(color: Color(0xFFE5E7EB)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'LỊCH SỬ TƯ VẤN (${current.consultationCount}/3)',
                        style: AppTypography.zaloFont(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: current.consultationCount >= 3
                              ? const Color(0xFFDC2626)
                              : const Color(0xFFD97706),
                          letterSpacing: 0.5,
                        ),
                      ),
                      if (current.status == 'ARCHIVED')
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Đã lưu trữ',
                            style: AppTypography.zaloFont(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF6B7280),
                            ),
                          ),
                        ),
                    ],
                  ),
                  if (current.consultationCount >= 3 && !isEnrolledOrPaid) ...[
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Text(
                        current.consultationCount > 3
                            ? 'Khách đã tư vấn quá 3 lần không học — đã chuyển vào mục Lưu trữ khách.'
                            : 'Đã đủ 3 lần tư vấn. Thêm lần tư vấn tiếp theo mà chưa học sẽ tự động đưa vào Lưu trữ khách.',
                        style: AppTypography.zaloFont(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFFB91C1C),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  if (current.consultationHistory.isEmpty)
                    Text(
                      'Chưa có lịch sử tư vấn.',
                      style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
                    )
                  else
                    ...current.consultationHistory.asMap().entries.map((entry) {
                      final idx = entry.key + 1;
                      final item = entry.value;
                      final dt = DateTime.tryParse(item.timestamp)?.toLocal();
                      final timeStr = dt != null ? DateFormat('dd/MM/yyyy HH:mm').format(dt) : item.timestamp;
                      return Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Tư vấn lần $idx · ${item.author}',
                                  style: AppTypography.zaloFont(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF92400E),
                                  ),
                                ),
                                Text(
                                  timeStr,
                                  style: AppTypography.zaloFont(fontSize: 10, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              item.note,
                              style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textHeading),
                            ),
                          ],
                        ),
                      );
                    }),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: noteController,
                          enabled: !isSavingNote,
                          style: AppTypography.zaloFont(fontSize: 12),
                          decoration: InputDecoration(
                            hintText: 'Nhập nội dung lần tư vấn mới...',
                            hintStyle: AppTypography.zaloFont(fontSize: 11.5, color: const Color(0xFF9CA3AF)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
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
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: isSavingNote
                            ? null
                            : () async {
                                final text = noteController.text.trim();
                                if (text.isEmpty) return;
                                setModalState(() => isSavingNote = true);
                                final res = await _repository.addConsultationNote(
                                  enrollmentId: current.id,
                                  note: text,
                                  authorName: AuthService.instance.currentDisplayName ?? 'Tư vấn viên',
                                  currentHistory: current.consultationHistory,
                                  isEnrolledOrPaid: isEnrolledOrPaid,
                                );
                                if (!modalCtx.mounted) return;
                                if (res['success'] == true) {
                                  final updatedHistory = res['history'] as List<AdminConsultationNoteModel>;
                                  final autoArchived = res['autoArchived'] == true;
                                  noteController.clear();
                                  setModalState(() {
                                    isSavingNote = false;
                                    current = current.copyWith(
                                      consultationHistory: updatedHistory,
                                      status: autoArchived ? 'ARCHIVED' : current.status,
                                    );
                                  });
                                  _fetchData();
                                  if (autoArchived) {
                                    TopNotificationService.showInfo(
                                      title: 'Chuyển vào Lưu trữ khách',
                                      message: '${current.candidateName} đã tư vấn quá 3 lần chưa học.',
                                    );
                                  } else {
                                    TopNotificationService.showSuccess(
                                      title: 'Đã lưu tư vấn',
                                      message: 'Đã ghi nhận lần tư vấn thứ ${updatedHistory.length}.',
                                    );
                                  }
                                } else {
                                  setModalState(() => isSavingNote = false);
                                  TopNotificationService.showError(
                                    message: 'Không thể lưu lịch sử tư vấn. Vui lòng thử lại.',
                                  );
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD97706),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: isSavingNote
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text('Lưu tư vấn', style: AppTypography.zaloFont(fontSize: 11.5, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  if (current.candidatePhone.isNotEmpty) ...[
                    QuickContactActions(phone: current.candidatePhone, compact: false),
                    const SizedBox(height: 10),
                  ],

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _openAssignBatch(current);
                      },
                      icon: const Icon(Icons.group_add_rounded, size: 16),
                      label: Text(
                        current.batchId != null ? 'Đổi lớp học' : 'Xếp lớp học',
                        style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00693F),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  Center(
                    child: TextButton.icon(
                      onPressed: () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (dCtx) => AlertDialog(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            title: Text('Xác nhận xóa học viên', style: AppTypography.zaloFont(fontWeight: FontWeight.w700, fontSize: 16)),
                            content: Text('Bạn có chắc chắn muốn xóa học viên "${current.candidateName}" khỏi hệ thống không?'),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(dCtx, false), child: const Text('Hủy')),
                              ElevatedButton(
                                onPressed: () => Navigator.pop(dCtx, true),
                                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE11D48)),
                                child: const Text('Xóa', style: TextStyle(color: Colors.white)),
                              ),
                            ],
                          ),
                        );
                        if (confirm == true) {
                          if (ctx.mounted) Navigator.pop(ctx);
                          final success = await _repository.deleteCandidate(current.id);
                          if (mounted && success) {
                            TopNotificationService.showInfo(
                              title: 'Đã xóa',
                              message: 'Đã xóa học viên ${current.candidateName}!',
                            );
                            _fetchData();
                          }
                        }
                      },
                      icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFE11D48), size: 16),
                      label: Text('Xóa thẻ học viên này', style: AppTypography.zaloFont(color: const Color(0xFFE11D48), fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    ).whenComplete(noteController.dispose);
  }

  Widget _buildMoveChip(BuildContext ctx, AdminCandidateModel c, String targetStatus, String label, Color color) {
    final isCurrent = c.status.toUpperCase() == targetStatus.toUpperCase();
    final isInitial = targetStatus == 'PENDING_CONSULTATION' ||
        targetStatus == 'CONFIRMED_PENDING_PAY' ||
        targetStatus == 'PENDING' ||
        targetStatus == 'CONFIRMED' ||
        targetStatus == 'CONSULTING' ||
        targetStatus == 'DEPOSITED';
    final isLocked = c.amountPaid > 0 && isInitial;

    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ActionChip(
        avatar: isCurrent
            ? const Icon(Icons.check, size: 14, color: Colors.white)
            : (isLocked ? const Icon(Icons.lock_rounded, size: 12, color: Color(0xFFDC2626)) : null),
        label: Text(label),
        labelStyle: AppTypography.zaloFont(
          fontSize: 11,
          fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
          color: isLocked ? const Color(0xFF9CA3AF) : (isCurrent ? Colors.white : color),
        ),
        backgroundColor: isCurrent ? color : (isLocked ? const Color(0xFFF3F4F6) : color.withValues(alpha: 0.1)),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: BorderSide(color: isCurrent ? color : (isLocked ? const Color(0xFFE5E7EB) : color.withValues(alpha: 0.3))),
        ),
        onPressed: (isCurrent || isLocked)
            ? null
            : () async {
                Navigator.pop(ctx);
                final success = await _repository.updateCandidateStatus(c.id, targetStatus);
                if (mounted && success) {
                  TopNotificationService.showSuccess(
                    title: 'Cập nhật trạng thái',
                    message: 'Đã chuyển ${c.candidateName} sang cột "$label"!',
                  );
                  _fetchData();
                }
              },
      ),
    );
  }

  void _openAssignBatch(AdminCandidateModel candidate) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AssignBatchBottomSheet(
        candidate: candidate,
        onBatchAssigned: (batchId, batchCode) {
          TopNotificationService.showSuccess(
            title: 'Xếp lớp thành công',
            message: 'Đã xếp học viên ${candidate.candidateName} vào lớp $batchCode thành công!',
          );
          _fetchData();
        },
      ),
    );
  }

  String _formatPrice(double amount) {
    final formatter = NumberFormat('#,###', 'vi_VN');
    return '${formatter.format(amount)} ₫';
  }

  Widget _buildDetailRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: AppTypography.zaloFont(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTypography.zaloFont(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: valueColor ?? AppColors.textHeading,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 14,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tuyển sinh & Đào tạo',
              style: AppTypography.zaloFont(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
              ),
            ),
            Text(
              _selectedSegment == 0
                  ? '${_filteredCandidates.length} học viên phễu Tuyển sinh'
                  : _selectedSegment == 1
                      ? '${_batches.length} lớp học đang mở'
                      : '${_filteredMonthlyStudents.length} học viên tháng ${DateFormat('MM/yyyy').format(_selectedStudentMonth)}',
              style: AppTypography.zaloFont(
                fontSize: 10.5,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          InkWell(
            onTap: () {
              if (_selectedSegment == 1) {
                _showCreateBatchSheet(context);
              } else {
                _showCreateCandidateSheet(context);
              }
            },
            borderRadius: BorderRadius.circular(8),
            child: Container(
              height: 30,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              margin: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F6ED),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF00693F).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.add_rounded, color: Color(0xFF00693F), size: 16),
                  const SizedBox(width: 3),
                  Text(
                    _selectedSegment == 1 ? 'Mở lớp' : 'Thêm HV',
                    style: AppTypography.zaloFont(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF00693F),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
        ],
      ),
      body: Column(
        children: [
          // 1. Thanh Tab Bar Tuyển sinh chuẩn MLD (Indicator gạch chân, không dùng nút trắng bo viền trên nền xám)
          Container(
            height: 42,
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(
                bottom: BorderSide(color: Color(0xFFE5E7EB), width: 1),
              ),
            ),
            child: Row(
              children: [
                _buildSegmentButton(0, 'Trello (${_candidates.length})', Icons.view_kanban_rounded),
                _buildSegmentButton(1, 'Lớp học (${_batches.length})', Icons.meeting_room_rounded),
                _buildSegmentButton(2, 'HV Tháng (${_monthlyEnrolledStudents.length})', Icons.calendar_month_rounded),
              ],
            ),
          ),

          // 2. Nội dung Toolbar theo từng Segment
          if (_selectedSegment == 0) ...[
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 34,
                          child: TextField(
                            controller: _searchController,
                            style: AppTypography.zaloFont(fontSize: 12),
                            decoration: InputDecoration(
                              hintText: 'Tìm học viên, mã HV, SĐT, khóa...',
                              hintStyle: AppTypography.zaloFont(fontSize: 11.5, color: const Color(0xFF9CA3AF)),
                              prefixIcon: const Icon(Icons.search_rounded, size: 16, color: Color(0xFF9CA3AF)),
                              prefixIconConstraints: const BoxConstraints(minWidth: 32),
                              suffixIcon: _searchQuery.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.clear_rounded, size: 14),
                                      onPressed: () {
                                        _searchController.clear();
                                        setState(() => _searchQuery = '');
                                      },
                                    )
                                  : null,
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
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(color: Color(0xFF00693F)),
                              ),
                            ),
                            onChanged: (val) => setState(() => _searchQuery = val.trim()),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: () => setState(() => _isKanbanViewMode = !_isKanbanViewMode),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          height: 34,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE5E7EB)),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                _isKanbanViewMode ? Icons.view_agenda_rounded : Icons.view_kanban_rounded,
                                size: 16,
                                color: const Color(0xFF00693F),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                _isKanbanViewMode ? 'Danh sách' : 'Trello',
                                style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF00693F)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      PopupMenuButton<String>(
                        offset: const Offset(0, 32),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: const BorderSide(color: Color(0xFFE5E7EB)),
                        ),
                        elevation: 6,
                        color: Colors.white,
                        tooltip: 'Lọc Trello theo lớp hoặc tất cả',
                        onSelected: (batchId) => setState(() => _selectedTrelloBatchId = batchId),
                        itemBuilder: (ctx) => [
                          PopupMenuItem<String>(
                            value: 'ALL',
                            height: 38,
                            child: Row(
                              children: [
                                const Icon(Icons.layers_rounded, size: 16, color: Color(0xFF00693F)),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Tất cả các lớp (${_candidates.length})',
                                    style: AppTypography.zaloFont(
                                      fontSize: 12,
                                      fontWeight: _selectedTrelloBatchId == 'ALL' ? FontWeight.w700 : FontWeight.w500,
                                      color: _selectedTrelloBatchId == 'ALL' ? const Color(0xFF00693F) : AppColors.textHeading,
                                    ),
                                  ),
                                ),
                                if (_selectedTrelloBatchId == 'ALL')
                                  const Icon(Icons.check_rounded, size: 16, color: Color(0xFF00693F)),
                              ],
                            ),
                          ),
                          PopupMenuItem<String>(
                            value: 'NO_BATCH',
                            height: 38,
                            child: Row(
                              children: [
                                const Icon(Icons.hourglass_empty_rounded, size: 16, color: Color(0xFFD97706)),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Chưa xếp lớp',
                                    style: AppTypography.zaloFont(
                                      fontSize: 12,
                                      fontWeight: _selectedTrelloBatchId == 'NO_BATCH' ? FontWeight.w700 : FontWeight.w500,
                                      color: _selectedTrelloBatchId == 'NO_BATCH' ? const Color(0xFF00693F) : AppColors.textHeading,
                                    ),
                                  ),
                                ),
                                if (_selectedTrelloBatchId == 'NO_BATCH')
                                  const Icon(Icons.check_rounded, size: 16, color: Color(0xFF00693F)),
                              ],
                            ),
                          ),
                          if (_batches.isNotEmpty) const PopupMenuDivider(height: 1),
                          ..._batches.map((b) {
                            final isSel = _selectedTrelloBatchId == b.id || _selectedTrelloBatchId == b.batchCode;
                            final count = _candidates.where((c) => c.batchId == b.id || c.batchCode == b.batchCode).length;
                            return PopupMenuItem<String>(
                              value: b.id,
                              height: 38,
                              child: Row(
                                children: [
                                  const Icon(Icons.school_rounded, size: 15, color: Color(0xFF00693F)),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      '${b.batchCode} · ${b.courseTitle ?? ''}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.zaloFont(
                                        fontSize: 11.5,
                                        fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                                        color: isSel ? const Color(0xFF00693F) : AppColors.textHeading,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text('$count', style: AppTypography.zaloFont(fontSize: 10.5, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                                  if (isSel) ...[
                                    const SizedBox(width: 4),
                                    const Icon(Icons.check_rounded, size: 15, color: Color(0xFF00693F)),
                                  ],
                                ],
                              ),
                            );
                          }),
                        ],
                        child: _buildMicroPill(
                          label: _selectedTrelloBatchId == 'ALL'
                              ? 'Trello: Tất cả lớp'
                              : (_selectedTrelloBatchId == 'NO_BATCH'
                                  ? 'Trello: Chưa xếp lớp'
                                  : 'Lớp: ${_getBatchCodeFromId(_selectedTrelloBatchId)}'),
                          icon: Icons.filter_list_rounded,
                          isSelected: _selectedTrelloBatchId != 'ALL',
                          showDropdownArrow: true,
                        ),
                      ),
                      if (_selectedTrelloBatchId != 'ALL') ...[
                        const SizedBox(width: 6),
                        _buildMicroPill(
                          label: 'Xem tất cả',
                          isSelected: false,
                          onTap: () => setState(() => _selectedTrelloBatchId = 'ALL'),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],

          if (_selectedSegment == 1) ...[
            // Ô tìm kiếm lớp học + ĐÚNG 2 NÚT LỌC: CHỌN NGÀY VÀ TẤT CẢ
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: Column(
                children: [
                  SizedBox(
                    height: 34,
                    child: TextField(
                      controller: _searchController,
                      style: AppTypography.zaloFont(fontSize: 12),
                      decoration: InputDecoration(
                        hintText: 'Tìm theo mã lớp, khóa học, giảng viên...',
                        hintStyle: AppTypography.zaloFont(fontSize: 11.5, color: const Color(0xFF9CA3AF)),
                        prefixIcon: const Icon(Icons.search_rounded, size: 16, color: Color(0xFF9CA3AF)),
                        prefixIconConstraints: const BoxConstraints(minWidth: 32),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded, size: 14),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                              )
                            : null,
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
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: Color(0xFF00693F)),
                        ),
                      ),
                      onChanged: (val) => setState(() => _searchQuery = val.trim()),
                    ),
                  ),
                  const SizedBox(height: 6),
                  // Dòng 2: ĐÚNG 2 NÚT LỌC (Chọn ngày & Tất cả). Xổ menu từ chính nút ra (PopupMenuButton)
                  Row(
                    children: [
                      // Nút 1: Chọn ngày khai giảng (PopupMenuButton từ nút)
                      PopupMenuButton<String>(
                        offset: const Offset(0, 32),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: const BorderSide(color: Color(0xFFE5E7EB)),
                        ),
                        elevation: 6,
                        color: Colors.white,
                        tooltip: 'Lọc ngày khai giảng',
                        onSelected: (val) async {
                          if (val == 'ALL_DATES') {
                            setState(() => _isAllBatchDates = true);
                          } else if (val == 'TODAY') {
                            setState(() {
                              _selectedBatchDate = DateTime.now();
                              _isAllBatchDates = false;
                            });
                          } else if (val == 'PICK_CALENDAR') {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _selectedBatchDate ?? DateTime.now(),
                              firstDate: DateTime(2025),
                              lastDate: DateTime(2030),
                            );
                            if (picked != null) {
                              setState(() {
                                _selectedBatchDate = picked;
                                _isAllBatchDates = false;
                              });
                            }
                          }
                        },
                        itemBuilder: (ctx) => [
                          PopupMenuItem<String>(
                            value: 'ALL_DATES',
                            height: 38,
                            child: Row(
                              children: [
                                Icon(
                                  Icons.date_range_rounded,
                                  size: 16,
                                  color: _isAllBatchDates ? const Color(0xFF00693F) : const Color(0xFF4B5563),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Tất cả các ngày',
                                    style: AppTypography.zaloFont(
                                      fontSize: 12,
                                      fontWeight: _isAllBatchDates ? FontWeight.w700 : FontWeight.w500,
                                      color: _isAllBatchDates ? const Color(0xFF00693F) : AppColors.textHeading,
                                    ),
                                  ),
                                ),
                                if (_isAllBatchDates)
                                  const Icon(Icons.check_rounded, size: 16, color: Color(0xFF00693F)),
                              ],
                            ),
                          ),
                          PopupMenuItem<String>(
                            value: 'TODAY',
                            height: 38,
                            child: Row(
                              children: [
                                Icon(
                                  Icons.today_rounded,
                                  size: 16,
                                  color: (!_isAllBatchDates && _selectedBatchDate != null && DateUtils.isSameDay(_selectedBatchDate!, DateTime.now()))
                                      ? const Color(0xFF00693F)
                                      : const Color(0xFF4B5563),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Hôm nay (${DateFormat('dd/MM').format(DateTime.now())})',
                                    style: AppTypography.zaloFont(
                                      fontSize: 12,
                                      fontWeight: (!_isAllBatchDates && _selectedBatchDate != null && DateUtils.isSameDay(_selectedBatchDate!, DateTime.now()))
                                          ? FontWeight.w700
                                          : FontWeight.w500,
                                      color: (!_isAllBatchDates && _selectedBatchDate != null && DateUtils.isSameDay(_selectedBatchDate!, DateTime.now()))
                                          ? const Color(0xFF00693F)
                                          : AppColors.textHeading,
                                    ),
                                  ),
                                ),
                                if (!_isAllBatchDates && _selectedBatchDate != null && DateUtils.isSameDay(_selectedBatchDate!, DateTime.now()))
                                  const Icon(Icons.check_rounded, size: 16, color: Color(0xFF00693F)),
                              ],
                            ),
                          ),
                          const PopupMenuDivider(height: 1),
                          PopupMenuItem<String>(
                            value: 'PICK_CALENDAR',
                            height: 38,
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_month_rounded, size: 16, color: Color(0xFF00693F)),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Chọn ngày trên lịch...',
                                    style: AppTypography.zaloFont(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: const Color(0xFF00693F),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        child: _buildMicroPill(
                          label: _isAllBatchDates || _selectedBatchDate == null
                              ? 'Chọn ngày'
                              : DateFormat('dd/MM').format(_selectedBatchDate!),
                          icon: Icons.calendar_month_rounded,
                          isSelected: !_isAllBatchDates && _selectedBatchDate != null,
                          showDropdownArrow: true,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Nút 2: Tất cả lớp
                      _buildMicroPill(
                        label: 'Tất cả (${_batches.length})',
                        isSelected: _isAllBatchDates,
                        onTap: () {
                          setState(() {
                            _isAllBatchDates = true;
                          });
                        },
                      ),
                      const Spacer(),
                      InkWell(
                        onTap: () => _showCreateBatchSheet(context),
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                          decoration: BoxDecoration(
                            color: const Color(0xFF00693F),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.add_rounded, color: Colors.white, size: 14),
                              const SizedBox(width: 3),
                              Text(
                                'Mở lớp mới',
                                style: AppTypography.zaloFont(
                                  fontSize: 10.5,
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
                ],
              ),
            ),
          ],

          if (_selectedSegment == 2) ...[
            Builder(
              builder: (_) {
                final now = DateTime.now();
                final thisMonth = DateTime(now.year, now.month);
                final nextMonth = DateTime(now.year, now.month + 1);
                final isThisMonth = _selectedStudentMonth.year == thisMonth.year &&
                    _selectedStudentMonth.month == thisMonth.month;
                final isNextMonth = _selectedStudentMonth.year == nextMonth.year &&
                    _selectedStudentMonth.month == nextMonth.month;

                final enrolledCourseMap = <String, String>{};
                for (final c in _monthlyEnrolledStudents) {
                  if (c.courseId.isNotEmpty) {
                    enrolledCourseMap[c.courseId] = c.courseTitle;
                  }
                }

                return Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
                  child: Column(
                    children: [
                      SizedBox(
                        height: 34,
                        child: TextField(
                          controller: _searchController,
                          style: AppTypography.zaloFont(fontSize: 12),
                          decoration: InputDecoration(
                            hintText: 'Tìm học viên, mã HV, SĐT, lớp, khóa...',
                            hintStyle: AppTypography.zaloFont(fontSize: 11.5, color: const Color(0xFF9CA3AF)),
                            prefixIcon: const Icon(Icons.search_rounded, size: 16, color: Color(0xFF9CA3AF)),
                            prefixIconConstraints: const BoxConstraints(minWidth: 32),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear_rounded, size: 14),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                  )
                                : null,
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
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Color(0xFF00693F)),
                            ),
                          ),
                          onChanged: (val) => setState(() => _searchQuery = val.trim()),
                        ),
                      ),
                      const SizedBox(height: 6),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildMicroPill(
                              label: 'Tháng này (${DateFormat('MM/yyyy').format(thisMonth)})',
                              icon: Icons.today_rounded,
                              isSelected: isThisMonth,
                              onTap: () => setState(() {
                                _selectedStudentMonth = thisMonth;
                                _selectedMonthlyCourseId = 'ALL';
                              }),
                            ),
                            const SizedBox(width: 6),
                            _buildMicroPill(
                              label: 'Tháng tới (${DateFormat('MM/yyyy').format(nextMonth)})',
                              icon: Icons.next_plan_rounded,
                              isSelected: isNextMonth,
                              onTap: () => setState(() {
                                _selectedStudentMonth = nextMonth;
                                _selectedMonthlyCourseId = 'ALL';
                              }),
                            ),
                            const SizedBox(width: 6),
                            _buildMicroPill(
                              label: (!isThisMonth && !isNextMonth)
                                  ? 'Tháng ${DateFormat('MM/yyyy').format(_selectedStudentMonth)}'
                                  : 'Chọn tháng',
                              icon: Icons.calendar_month_rounded,
                              isSelected: !isThisMonth && !isNextMonth,
                              onTap: () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: _selectedStudentMonth,
                                  firstDate: DateTime(2024),
                                  lastDate: DateTime(2030),
                                );
                                if (picked != null && mounted) {
                                  setState(() {
                                    _selectedStudentMonth = DateTime(picked.year, picked.month);
                                    _selectedMonthlyCourseId = 'ALL';
                                  });
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 6),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            PopupMenuButton<String>(
                              offset: const Offset(0, 32),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: const BorderSide(color: Color(0xFFE5E7EB)),
                              ),
                              elevation: 6,
                              color: Colors.white,
                              onSelected: (courseId) => setState(() => _selectedMonthlyCourseId = courseId),
                              itemBuilder: (_) => [
                                PopupMenuItem<String>(
                                  value: 'ALL',
                                  height: 36,
                                  child: Text(
                                    'Tất cả khóa đã xếp lớp (${_monthlyEnrolledStudents.length})',
                                    style: AppTypography.zaloFont(
                                      fontSize: 12,
                                      fontWeight: _selectedMonthlyCourseId == 'ALL' ? FontWeight.w700 : FontWeight.w500,
                                      color: _selectedMonthlyCourseId == 'ALL' ? const Color(0xFF00693F) : AppColors.textHeading,
                                    ),
                                  ),
                                ),
                                ...enrolledCourseMap.entries.map((entry) {
                                  final isSel = _selectedMonthlyCourseId == entry.key;
                                  final count = _monthlyEnrolledStudents.where((c) => c.courseId == entry.key).length;
                                  return PopupMenuItem<String>(
                                    value: entry.key,
                                    height: 36,
                                    child: Text(
                                      '${entry.value} ($count)',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.zaloFont(
                                        fontSize: 12,
                                        fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                                        color: isSel ? const Color(0xFF00693F) : AppColors.textHeading,
                                      ),
                                    ),
                                  );
                                }),
                              ],
                              child: _buildMicroPill(
                                label: _selectedMonthlyCourseId == 'ALL'
                                    ? 'Khóa: Tất cả'
                                    : 'Khóa: ${enrolledCourseMap[_selectedMonthlyCourseId] ?? "Đã chọn"}',
                                icon: Icons.menu_book_rounded,
                                isSelected: _selectedMonthlyCourseId != 'ALL',
                                showDropdownArrow: true,
                              ),
                            ),
                            const SizedBox(width: 6),
                            _buildMicroPill(
                              label: 'Đang học',
                              isSelected: _selectedMonthlyGradFilter == 'ENROLLED_STUDYING',
                              activeColor: const Color(0xFF00693F),
                              onTap: () => setState(() {
                                _selectedMonthlyGradFilter =
                                    _selectedMonthlyGradFilter == 'ENROLLED_STUDYING' ? 'ALL' : 'ENROLLED_STUDYING';
                              }),
                            ),
                            const SizedBox(width: 6),
                            _buildMicroPill(
                              label: 'Chưa tốt nghiệp',
                              isSelected: _selectedMonthlyGradFilter == 'NOT_GRADUATED',
                              activeColor: const Color(0xFFC2410C),
                              onTap: () => setState(() {
                                _selectedMonthlyGradFilter =
                                    _selectedMonthlyGradFilter == 'NOT_GRADUATED' ? 'ALL' : 'NOT_GRADUATED';
                              }),
                            ),
                            const SizedBox(width: 6),
                            _buildMicroPill(
                              label: 'Tốt nghiệp',
                              isSelected: _selectedMonthlyGradFilter == 'COMPLETED',
                              activeColor: const Color(0xFF4B5563),
                              onTap: () => setState(() {
                                _selectedMonthlyGradFilter =
                                    _selectedMonthlyGradFilter == 'COMPLETED' ? 'ALL' : 'COMPLETED';
                              }),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],

          const Divider(height: 1, color: Color(0xFFE5E7EB)),

          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchData,
              color: const Color(0xFF00693F),
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF00693F)))
                  : _selectedSegment == 0
                      ? (_isKanbanViewMode ? _buildKanbanTrelloView() : _buildCandidatesList())
                      : _selectedSegment == 1
                          ? _buildClassBasedView()
                          : _buildMonthlyStudentsView(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentButton(int index, String label, IconData icon) {
    final isSelected = _selectedSegment == index;
    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            setState(() => _selectedSegment = index);
            _fetchData();
          },
          child: Container(
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.transparent,
              border: Border(
                bottom: BorderSide(
                  color: isSelected ? const Color(0xFF00693F) : Colors.transparent,
                  width: 2.5,
                ),
              ),
            ),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    icon,
                    size: 16,
                    color: isSelected ? const Color(0xFF00693F) : const Color(0xFF9CA3AF),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    label,
                    style: AppTypography.zaloFont(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ==============================================================
  // 1. GIAO DIỆN BẢNG TRELLO (KANBAN BOARD KÉO THẢ & COMPACT TỐI ƯU KHÔNG GIAN)
  // ==============================================================
  Widget _buildKanbanTrelloView() {
    final screenWidth = MediaQuery.of(context).size.width;
    // Bề ngang cột Trello chiếm ~86% màn hình, để cột bên phải chỉ lộ khoảng 10% theo yêu cầu
    final columnWidth = (screenWidth * 0.86).clamp(320.0, 520.0);

    return ListView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      children: _kanbanColumns.map((col) {
        final key = col['key'] as String;
        final title = col['title'] as String;
        final icon = col['icon'] as IconData;
        final color = col['color'] as Color;
        final bgColor = col['bgColor'] as Color;
        final statuses = col['statuses'] as List<dynamic>;
        final candidatesInCol = _getCandidatesForColumn(statuses);

        // Mỗi cột là một DragTarget tiếp nhận học viên kéo thả
        return DragTarget<AdminCandidateModel>(
          onWillAcceptWithDetails: (details) => true,
          onAcceptWithDetails: (details) {
            _handleCandidateDrop(details.data, key, title, statuses);
          },
          builder: (context, candidateData, rejectedData) {
            final isHovered = candidateData.isNotEmpty;

            return AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: columnWidth,
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: isHovered ? bgColor.withValues(alpha: 0.35) : const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isHovered ? color : const Color(0xFFE5E7EB),
                  width: isHovered ? 2 : 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Cột Trello (Compact)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(10, 8, 6, 8),
                    child: Row(
                      children: [
                        Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            color: bgColor,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Icon(icon, color: color, size: 15),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            title,
                            style: AppTypography.zaloFont(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textHeading,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${candidatesInCol.length}',
                            style: AppTypography.zaloFont(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: color,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_rounded, size: 18),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                          tooltip: 'Thêm vào cột này',
                          onPressed: () => _showCreateCandidateSheet(context, initialStatus: statuses.first.toString()),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1, color: Color(0xFFE5E7EB)),

                  // Thân Cột Trello (Danh sách thẻ Card có thể kéo thả)
                  Expanded(
                    child: candidatesInCol.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text(
                                isHovered ? 'Thả vào đây' : 'Cột trống\nKéo học viên vào đây',
                                textAlign: TextAlign.center,
                                style: AppTypography.zaloFont(
                                  fontSize: 11,
                                  color: isHovered ? color : const Color(0xFF9CA3AF),
                                  fontWeight: isHovered ? FontWeight.w700 : FontWeight.w400,
                                ),
                              ),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(6),
                            itemCount: candidatesInCol.length,
                            itemBuilder: (ctx, idx) {
                              final c = candidatesInCol[idx];
                              return _buildDraggableTrelloCard(c, color);
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      }).toList(),
    );
  }

  // Thẻ học viên Draggable (Giữ yên để kéo sang cột khác)
  Widget _buildDraggableTrelloCard(AdminCandidateModel c, Color tagColor) {
    return LongPressDraggable<AdminCandidateModel>(
      data: c,
      delay: const Duration(milliseconds: 180),
      hapticFeedbackOnStart: true,
      feedback: Material(
        color: Colors.transparent,
        child: Transform.rotate(
          angle: 0.03,
          child: Container(
            width: 245,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF00693F), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.16),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        c.candidateName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatPrice(c.amountPaid),
                      style: AppTypography.zaloFont(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: c.amountPaid > 0 ? const Color(0xFF00693F) : const Color(0xFFDC2626),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  c.courseTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.zaloFont(fontSize: 10.5, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ),
      ),
      childWhenDragging: Opacity(
        opacity: 0.2,
        child: _buildTrelloCard(c, tagColor),
      ),
      child: _buildTrelloCard(c, tagColor),
    );
  }

  Future<void> _handleInlineAddConsultation(AdminCandidateModel c, String note) async {
    final isEnrolledOrPaid = c.amountPaid > 0 ||
        c.status == 'PAID_WAITING_CLASS' ||
        c.status == 'ENROLLED_STUDYING' ||
        c.status == 'COMPLETED';
    final res = await _repository.addConsultationNote(
      enrollmentId: c.id,
      note: note,
      authorName: AuthService.instance.currentDisplayName ?? 'Tư vấn viên',
      currentHistory: c.consultationHistory,
      isEnrolledOrPaid: isEnrolledOrPaid,
      autoArchiveOnLimit: false,
    );
    if (!mounted) return;
    if (res['success'] == true) {
      final updatedHistory = res['history'] as List<AdminConsultationNoteModel>;
      setState(() {
        final idx = _candidates.indexWhere((item) => item.id == c.id);
        if (idx != -1) {
          _candidates[idx] = _candidates[idx].copyWith(
            consultationHistory: updatedHistory,
          );
        }
      });
      _fetchData();
      TopNotificationService.showSuccess(
        title: 'Đã lưu tư vấn',
        message: 'Đã ghi nhận Tư vấn lần ${updatedHistory.length}.',
      );
    } else {
      TopNotificationService.showError(
        message: 'Không thể lưu lịch sử tư vấn. Vui lòng thử lại.',
      );
    }
  }

  Future<void> _handleArchiveCandidate(AdminCandidateModel c) async {
    final ok = await _repository.updateCandidateStatus(c.id, 'ARCHIVED');
    if (!mounted) return;
    if (ok) {
      setState(() {
        final idx = _candidates.indexWhere((item) => item.id == c.id);
        if (idx != -1) {
          _candidates[idx] = _candidates[idx].copyWith(status: 'ARCHIVED');
        }
      });
      _fetchData();
      TopNotificationService.showInfo(
        title: 'Đã cho vào lưu trữ',
        message: '${c.candidateName} đã được chuyển vào mục Lưu trữ khách.',
      );
    } else {
      TopNotificationService.showError(
        message: 'Không thể chuyển vào lưu trữ. Vui lòng thử lại.',
      );
    }
  }

  Widget _buildTrelloCard(AdminCandidateModel c, Color tagColor) {
    final normalized = c.status.toUpperCase();
    if (normalized == 'PENDING_CONSULTATION' ||
        normalized == 'PENDING' ||
        normalized == 'CONSULTING' ||
        normalized == 'PENDING_APPROVAL') {
      return PendingConsultationCard(
        candidate: c,
        onViewDetail: () => _showCandidateDetailSheet(c),
        onAddConsultationNote: (note) => _handleInlineAddConsultation(c, note),
        onArchiveCandidate: () => _handleArchiveCandidate(c),
      );
    }

    final isPaid = c.amountPaid > 0;
    final isPendingConsult = c.status == 'PENDING_CONSULTATION' || c.status == 'ARCHIVED';
    final isGradGroup = c.status == 'NOT_GRADUATED' || c.status == 'COMPLETED';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _showCandidateDetailSheet(c),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          margin: const EdgeInsets.only(bottom: 6),
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: c.status == 'PAID_WAITING_CLASS' ? const Color(0xFFFDA4AF) : const Color(0xFFE5E7EB),
              width: c.status == 'PAID_WAITING_CLASS' ? 1.2 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 3,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: tagColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      (c.studentCode != null && c.studentCode!.isNotEmpty) ? c.studentCode! : c.orderCode,
                      style: AppTypography.zaloFont(fontSize: 9, fontWeight: FontWeight.w700, color: tagColor),
                    ),
                  ),
                  if (c.batchCode != null && c.batchCode!.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F6ED),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        c.batchCode!,
                        style: AppTypography.zaloFont(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF00693F)),
                      ),
                    ),
                  ],
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      c.candidateName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.zaloFont(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHeading,
                      ),
                    ),
                  ),
                  Text(
                    _formatPrice(c.amountPaid),
                    style: AppTypography.zaloFont(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: isPaid ? const Color(0xFF00693F) : const Color(0xFFDC2626),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 3),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${c.candidatePhone.isNotEmpty ? "${c.candidatePhone} · " : ""}${c.courseTitle}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.zaloFont(fontSize: 10.5, color: AppColors.textSecondary),
                    ),
                  ),
                  const Icon(Icons.drag_indicator_rounded, size: 14, color: Color(0xFF9CA3AF)),
                ],
              ),
              if (isPendingConsult) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        c.targetAudience,
                        style: AppTypography.zaloFont(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: c.consultationCount >= 3 ? const Color(0xFFFEE2E2) : const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'TV ${c.consultationCount}/3',
                        style: AppTypography.zaloFont(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          color: c.consultationCount >= 3 ? const Color(0xFFDC2626) : const Color(0xFFB45309),
                        ),
                      ),
                    ),
                  ],
                ),
                if (c.latestConsultationSummary != null) ...[
                  const SizedBox(height: 3),
                  Text(
                    'Lịch sử: ${c.latestConsultationSummary}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.zaloFont(
                      fontSize: 10,
                      fontStyle: FontStyle.italic,
                      color: const Color(0xFF92400E),
                    ),
                  ),
                ],
              ],
              if (isGradGroup) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        c.candidateEmail != null && c.candidateEmail!.isNotEmpty
                            ? c.candidateEmail!
                            : (c.candidatePhone.isNotEmpty ? 'SĐT: ${c.candidatePhone}' : 'Chưa có thông tin LH'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.zaloFont(fontSize: 10, color: AppColors.textSecondary),
                      ),
                    ),
                    if (c.candidatePhone.isNotEmpty)
                      QuickContactActions(phone: c.candidatePhone, compact: true),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // Xử lý sự kiện kéo thả học viên giữa các cột Kanban
  Future<void> _handleCandidateDrop(
    AdminCandidateModel candidate,
    String targetColumnKey,
    String targetColumnTitle,
    List<dynamic> targetStatuses,
  ) async {
    // 1. KIỂM TRA LUẬT THANH TOÁN THEO YÊU CẦU:
    // "HỌC SINH NÀO THANH TOÁN HỌC PHÍ RỒI THÌ KO THỂ DI CHUYỂN VỀ BAN ĐẦU"
    final isInitialColumn = targetColumnKey == 'PENDING_CONSULTATION' ||
        targetColumnKey == 'CONFIRMED_PENDING_PAY';

    if (candidate.amountPaid > 0 && isInitialColumn) {
      HapticFeedback.heavyImpact();
      TopNotificationService.showError(
        title: 'Không thể chuyển',
        message: 'Học viên ${candidate.candidateName} đã đóng ${_formatPrice(candidate.amountPaid)} học phí. Không thể chuyển về trạng thái ban đầu!',
      );
      return;
    }

    // 2. Nếu chuyển sang Đang học mà chưa có lớp -> Mở sheet xếp lớp
    if (targetColumnKey == 'ENROLLED_STUDYING' && (candidate.batchId == null || candidate.batchId!.isEmpty)) {
      _openAssignBatch(candidate);
      return;
    }

    final String newDbStatus = targetStatuses.first.toString();
    final String newWorkflowStatus = targetColumnKey;

    // 3. Optimistic Update (Cập nhật giao diện ngay lập tức)
    final oldList = List<AdminCandidateModel>.from(_candidates);
    setState(() {
      final idx = _candidates.indexWhere((c) => c.id == candidate.id);
      if (idx != -1) {
        _candidates[idx] = candidate.copyWith(
          status: newWorkflowStatus,
          batchId: targetColumnKey == 'PAID_WAITING_CLASS' ? null : candidate.batchId,
          batchCode: targetColumnKey == 'PAID_WAITING_CLASS' ? null : candidate.batchCode,
        );
      }
    });

    HapticFeedback.mediumImpact();
    TopNotificationService.showSuccess(
      title: 'Chuyển cột thành công',
      message: 'Đã chuyển ${candidate.candidateName} sang "$targetColumnTitle"',
    );

    bool success = false;
    if (targetColumnKey == 'PAID_WAITING_CLASS') {
      success = await _repository.updateCandidateStatus(candidate.id, 'PAID_WAITING_CLASS');
    } else {
      success = await _repository.updateCandidateStatus(candidate.id, newDbStatus);
    }

    if (!success && mounted) {
      // Rollback nếu có lỗi mạng/máy chủ
      setState(() {
        _candidates = oldList;
      });
      TopNotificationService.showError(
        message: 'Không thể cập nhật trạng thái học viên. Đã hoàn tác.',
      );
    }
  }

  void _handleBatchTap(AdminCourseBatchModel batch, List<AdminCandidateModel> studentsInBatch) {
    if (studentsInBatch.isEmpty) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.info_outline_rounded, color: Color(0xFF0284C7), size: 22),
              const SizedBox(width: 8),
              Text(
                'Lớp chưa có học viên',
                style: AppTypography.zaloFont(fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          content: Text(
            'Lớp "${batch.batchCode}" (${batch.courseTitle ?? ""}) hiện chưa có học sinh nào được xếp vào lớp.\n\nBạn có muốn mở trang chi tiết lớp để xem thông tin và thêm học viên từ danh sách chờ không?',
            style: AppTypography.zaloFont(fontSize: 13, color: AppColors.textSecondary),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Đóng', style: AppTypography.zaloFont(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _openBatchDetail(batch);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00693F),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: Text('Mở chi tiết lớp', style: AppTypography.zaloFont(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
    } else {
      _openBatchDetail(batch);
    }
  }

  void _openBatchDetail(AdminCourseBatchModel batch) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AdminBatchDetailScreen(
          batch: batch,
          allCandidates: _candidates,
          onDataChanged: _fetchData,
        ),
      ),
    );
  }

  // ==============================================================
  // 2. GIAO DIỆN HIỂN THỊ THEO LỚP HỌC (CLICK MỞ TRANG CHI TIẾT LỚP HỌC)
  // ==============================================================
  Widget _buildClassBasedView() {
    final query = _searchQuery.toLowerCase();
    final filteredBatches = _batches.where((b) {
      if (query.isNotEmpty) {
        final matches = b.batchCode.toLowerCase().contains(query) ||
            (b.courseTitle ?? '').toLowerCase().contains(query) ||
            (b.instructorName ?? '').toLowerCase().contains(query);
        if (!matches) return false;
      }
      if (!_isAllBatchDates && _selectedBatchDate != null) {
        if (b.startDate.isEmpty) return false;
        try {
          final parsed = DateTime.parse(b.startDate);
          if (!DateUtils.isSameDay(parsed, _selectedBatchDate!)) return false;
        } catch (_) {
          return false;
        }
      }
      return true;
    }).toList();

    if (filteredBatches.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 60),
          Center(
            child: Column(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: const BoxDecoration(color: Color(0xFFF3F4F6), shape: BoxShape.circle),
                  child: const Icon(Icons.school_outlined, size: 26, color: Color(0xFF9CA3AF)),
                ),
                const SizedBox(height: 12),
                Text(
                  'Không có lớp học nào phù hợp',
                  style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 4),
                Text(
                  'Các lớp đào tạo MLD sẽ hiển thị tại đây.',
                  style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      itemCount: filteredBatches.length,
      itemBuilder: (ctx, idx) {
        final batch = filteredBatches[idx];
        final studentsInBatch = _candidates.where((c) => c.batchId == batch.id).toList();
        final hasStudents = studentsInBatch.isNotEmpty;

        // Compact Class Card (Chiều cao ~64px, hiển thị được 8-10 lớp)
        return Container(
          margin: const EdgeInsets.only(bottom: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: hasStudents ? const Color(0xFFE5E7EB) : const Color(0xFFF3F4F6),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.015), blurRadius: 3, offset: const Offset(0, 1)),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () => _handleBatchTap(batch, studentsInBatch),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                child: Row(
                  children: [
                    // Icon Lớp học
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: hasStudents ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.groups_rounded,
                        color: hasStudents ? const Color(0xFF00693F) : const Color(0xFF9CA3AF),
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Thông tin chính: Mã lớp + Sĩ số + Khóa học + Lịch
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              Text(
                                batch.batchCode,
                                style: AppTypography.zaloFont(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textHeading,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: hasStudents ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Text(
                                  hasStudents
                                      ? '${studentsInBatch.length}/${batch.maxStudents} hv'
                                      : 'Chưa có hv',
                                  style: AppTypography.zaloFont(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                    color: hasStudents ? const Color(0xFF00693F) : const Color(0xFF9CA3AF),
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
                                  '${batch.courseTitle ?? "Khóa học MLD"} · ${batch.scheduleDays}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.zaloFont(fontSize: 10.5, color: AppColors.textSecondary),
                                ),
                              ),
                              if (batch.instructorName != null && batch.instructorName!.isNotEmpty)
                                Text(
                                  'GV: ${batch.instructorName}',
                                  style: AppTypography.zaloFont(fontSize: 10.5, color: const Color(0xFF6B7280)),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 6),

                    // Nút Mở Chi tiết lớp
                    InkWell(
                      onTap: () => _openBatchDetail(batch),
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                        decoration: BoxDecoration(
                          color: hasStudents ? const Color(0xFFEFF6FF) : const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Chi tiết',
                              style: AppTypography.zaloFont(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: hasStudents ? AppColors.primary : const Color(0xFF6B7280),
                              ),
                            ),
                            const SizedBox(width: 2),
                            Icon(
                              Icons.arrow_forward_ios_rounded,
                              size: 10,
                              color: hasStudents ? AppColors.primary : const Color(0xFF6B7280),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  // ==============================================================
  // 3. GIAO DIỆN DANH SÁCH HỌC VIÊN PHẲNG (KHI TẮT KANBAN)
  // ==============================================================
  Widget _buildCandidatesList() {
    if (_filteredCandidates.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 60),
          Center(
            child: Column(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: const BoxDecoration(color: Color(0xFFF3F4F6), shape: BoxShape.circle),
                  child: const Icon(Icons.person_search_rounded, size: 30, color: Color(0xFF9CA3AF)),
                ),
                const SizedBox(height: 14),
                Text(
                  'Không có hồ sơ học viên nào',
                  style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 4),
                Text(
                  'Hồ sơ ghi danh mới từ học viên sẽ xuất hiện tại đây.',
                  style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      itemCount: _filteredCandidates.length,
      itemBuilder: (ctx, index) {
        final c = _filteredCandidates[index];
        return AdminCandidateCard(
          candidate: c,
          isCompact: true,
          onViewDetail: () => _showCandidateDetailSheet(c),
          onAssignBatch: () => _openAssignBatch(c),
          onAddConsultationNote: (note) => _handleInlineAddConsultation(c, note),
          onArchiveCandidate: () => _handleArchiveCandidate(c),
          onConfirmConsultation: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Đã cập nhật trạng thái tư vấn cho học viên ${c.candidateName}!'),
                backgroundColor: AppColors.primary,
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildMonthlyStudentsView() {
    final list = _filteredMonthlyStudents;
    final monthLabel = DateFormat('MM/yyyy').format(_selectedStudentMonth);

    if (list.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 60),
          Center(
            child: Column(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(color: Color(0xFFF3F4F6), shape: BoxShape.circle),
                  child: const Icon(Icons.groups_outlined, size: 28, color: Color(0xFF9CA3AF)),
                ),
                const SizedBox(height: 12),
                Text(
                  'Chưa có học viên xếp lớp trong tháng $monthLabel',
                  style: AppTypography.zaloFont(fontSize: 13.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 4),
                Text(
                  'Hãy chọn tháng khác hoặc chuyển đổi giữa Tháng này / Tháng tới.',
                  style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      );
    }

    final grouped = <String, List<AdminCandidateModel>>{};
    for (final student in list) {
      final key = student.courseTitle;
      grouped.putIfAbsent(key, () => []).add(student);
    }
    final courseEntries = grouped.entries.toList();

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 24),
      itemCount: courseEntries.length,
      itemBuilder: (ctx, index) {
        final courseTitle = courseEntries[index].key;
        final students = courseEntries[index].value;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE5E7EB)),
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
              Container(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                decoration: const BoxDecoration(
                  color: Color(0xFFEFF6EE),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(14)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.menu_book_rounded, size: 16, color: Color(0xFF00693F)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        courseTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.zaloFont(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF00693F),
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${students.length} học viên',
                        style: AppTypography.zaloFont(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF00693F),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              ...students.map((c) {
                Color statusBg;
                Color statusFg;
                String statusText;
                if (c.status == 'COMPLETED') {
                  statusBg = const Color(0xFFF3F4F6);
                  statusFg = const Color(0xFF4B5563);
                  statusText = 'Tốt nghiệp';
                } else if (c.status == 'NOT_GRADUATED') {
                  statusBg = const Color(0xFFFFF7ED);
                  statusFg = const Color(0xFFC2410C);
                  statusText = 'Chưa tốt nghiệp';
                } else {
                  statusBg = const Color(0xFFE8F6ED);
                  statusFg = const Color(0xFF00693F);
                  statusText = 'Đang học';
                }

                return InkWell(
                  onTap: () => _showCandidateDetailSheet(c),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
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
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: statusBg,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      statusText,
                                      style: AppTypography.zaloFont(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w700,
                                        color: statusFg,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              Text(
                                '${(c.studentCode != null && c.studentCode!.isNotEmpty) ? "Mã HV: ${c.studentCode}" : c.orderCode}'
                                '${(c.batchCode != null && c.batchCode!.isNotEmpty) ? " · Lớp: ${c.batchCode}" : ""}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${c.candidatePhone}${c.candidateEmail != null && c.candidateEmail!.isNotEmpty ? " · ${c.candidateEmail}" : ""}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.zaloFont(fontSize: 11, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (c.candidatePhone.isNotEmpty)
                          QuickContactActions(phone: c.candidatePhone, compact: true),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }
}
