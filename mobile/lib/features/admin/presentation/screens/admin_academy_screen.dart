import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/admin_candidate_card.dart';
import '../widgets/assign_batch_bottom_sheet.dart';
import '../widgets/quiz_submission_detail_sheet.dart';
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
  List<AdminQuizSubmissionModel> _submissions = [];
  final Set<String> _expandedBatchIds = {};

  // Bộ lọc cho Tab Bài thi (Lọc theo Lớp & Kết quả)
  String _selectedSubmissionBatchId = 'ALL';
  String _selectedSubmissionResult = 'ALL'; // ALL, PASSED, FAILED

  // Bộ lọc cho Tab Lớp học (Đúng 2 nút: Chọn ngày & Tất cả theo yêu cầu)
  DateTime? _selectedBatchDate;
  bool _isAllBatchDates = true;

  // Các cột trạng thái Kanban chuẩn quy trình Tuyển sinh & Đào tạo kiểu Trello
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
      'key': 'COMPLETED',
      'title': 'Tốt nghiệp',
      'icon': Icons.verified_rounded,
      'color': const Color(0xFF4B5563),
      'bgColor': const Color(0xFFF3F4F6),
      'statuses': ['COMPLETED', 'GRADUATED'],
    },
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialWorkflowTab != null && widget.initialWorkflowTab!.isNotEmpty) {
      if (widget.initialWorkflowTab == 'QUIZZES') {
        _selectedSegment = 2;
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
      final submissionsFuture = _repository.fetchQuizSubmissions();

      final results = await Future.wait([
        candidatesFuture,
        batchesFuture,
        coursesFuture,
        submissionsFuture,
      ]);

      if (mounted) {
        setState(() {
          _candidates = results[0] as List<AdminCandidateModel>;
          _batches = results[1] as List<AdminCourseBatchModel>;
          _courses = results[2] as List<AdminCourseModel>;
          _submissions = results[3] as List<AdminQuizSubmissionModel>;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<AdminCandidateModel> get _filteredCandidates {
    List<AdminCandidateModel> list = _candidates;
    if (_selectedWorkflowStatus != 'ALL') {
      list = list.where((c) => c.status == _selectedWorkflowStatus).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((c) {
        return c.candidateName.toLowerCase().contains(q) ||
            c.candidatePhone.toLowerCase().contains(q) ||
            c.orderCode.toLowerCase().contains(q) ||
            c.courseTitle.toLowerCase().contains(q);
      }).toList();
    }
    return list;
  }

  String _getSubmissionBatchCode(AdminQuizSubmissionModel sub) {
    if (sub.batchCode != null && sub.batchCode!.isNotEmpty) {
      return sub.batchCode!;
    }
    for (final c in _candidates) {
      if (c.id == sub.enrollmentId && c.batchCode != null && c.batchCode!.isNotEmpty) {
        return c.batchCode!;
      }
    }
    return '';
  }

  String _getSubmissionBatchId(AdminQuizSubmissionModel sub) {
    if (sub.batchId != null && sub.batchId!.isNotEmpty) {
      return sub.batchId!;
    }
    for (final c in _candidates) {
      if (c.id == sub.enrollmentId && c.batchId != null && c.batchId!.isNotEmpty) {
        return c.batchId!;
      }
    }
    return '';
  }

  List<AdminQuizSubmissionModel> get _filteredSubmissions {
    var list = _submissions;

    // Lọc theo Lớp học (Batch)
    if (_selectedSubmissionBatchId != 'ALL') {
      if (_selectedSubmissionBatchId == 'NO_BATCH') {
        list = list.where((s) => _getSubmissionBatchId(s).isEmpty).toList();
      } else {
        list = list.where((s) {
          final bId = _getSubmissionBatchId(s);
          final bCode = _getSubmissionBatchCode(s);
          return bId == _selectedSubmissionBatchId || bCode == _selectedSubmissionBatchId;
        }).toList();
      }
    }

    // Lọc theo kết quả Đạt / Chưa đạt
    if (_selectedSubmissionResult == 'PASSED') {
      list = list.where((s) => s.passed).toList();
    } else if (_selectedSubmissionResult == 'FAILED') {
      list = list.where((s) => !s.passed).toList();
    }

    // Tìm kiếm bài thi
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((s) {
        final bCode = _getSubmissionBatchCode(s).toLowerCase();
        return s.studentName.toLowerCase().contains(q) ||
            s.studentPhone.toLowerCase().contains(q) ||
            s.quizTitle.toLowerCase().contains(q) ||
            s.courseTitle.toLowerCase().contains(q) ||
            bCode.contains(q);
      }).toList();
    }

    return list;
  }

  Widget _buildMicroPill({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    Color activeColor = const Color(0xFF00693F),
    Color? activeBgColor,
    Color inactiveBgColor = const Color(0xFFF3F4F6),
    Color inactiveTextColor = const Color(0xFF4B5563),
    IconData? icon,
    String? badgeText,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: AnimatedContainer(
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
            ],
          ),
        ),
      ),
    );
  }

  List<AdminCandidateModel> _getCandidatesForColumn(List<dynamic> columnStatuses) {
    return _candidates.where((c) {
      final statusUpper = c.status.toUpperCase();
      final matchStatus = columnStatuses.any((s) => statusUpper == s.toString().toUpperCase());
      if (!matchStatus) return false;
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return c.candidateName.toLowerCase().contains(q) ||
          c.candidatePhone.toLowerCase().contains(q) ||
          c.orderCode.toLowerCase().contains(q) ||
          c.courseTitle.toLowerCase().contains(q);
    }).toList();
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

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
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
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F6ED),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.person_add_rounded, color: Color(0xFF0D6832), size: 20),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Thêm thẻ học viên mới',
                          style: AppTypography.zaloFont(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textHeading,
                          ),
                        ),
                      ],
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
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Vui lòng nhập họ tên và số điện thoại!'),
                                  backgroundColor: AppColors.error,
                                ),
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

                            if (mounted) {
                              Navigator.pop(ctx);
                              if (success) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Đã thêm thẻ học viên $name vào bảng Kanban!'),
                                    backgroundColor: const Color(0xFF00693F),
                                  ),
                                );
                                _fetchData();
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Lỗi khi thêm học viên. Vui lòng thử lại.'),
                                    backgroundColor: AppColors.error,
                                  ),
                                );
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00693F),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: isSubmitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text('Tạo thẻ học viên', style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
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

  // --- CRUD KIỂU TRELLO: READ, UPDATE (COLUMN MOVE), DELETE ---
  void _showCandidateDetailSheet(AdminCandidateModel c) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.88,
        ),
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          c.candidateName,
                          style: AppTypography.zaloFont(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textHeading,
                          ),
                        ),
                        Text(
                          'Mã hồ sơ: ${c.orderCode}',
                          style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
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

              // Bấm chuyển cột nhanh trên bảng Kanban Trello
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
                    _buildMoveChip(ctx, c, 'PENDING', 'Chờ tư vấn', const Color(0xFFD97706)),
                    _buildMoveChip(ctx, c, 'CONFIRMED', 'Chờ nộp phí', const Color(0xFF0284C7)),
                    _buildMoveChip(ctx, c, 'PAID', 'Chờ xếp lớp', const Color(0xFF7C3AED)),
                    _buildMoveChip(ctx, c, 'ENROLLED', 'Đang học', const Color(0xFF00693F)),
                    _buildMoveChip(ctx, c, 'COMPLETED', 'Tốt nghiệp', const Color(0xFF4B5563)),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Divider(color: Color(0xFFF1F5F9)),
              const SizedBox(height: 6),

              _buildDetailRow('Số điện thoại:', c.candidatePhone),
              if (c.candidateEmail != null && c.candidateEmail!.isNotEmpty)
                _buildDetailRow('Email:', c.candidateEmail!),
              _buildDetailRow('Khóa học:', c.courseTitle),
              _buildDetailRow('Trạng thái hiện tại:', c.status),
              _buildDetailRow('Học phí niêm yết:', _formatPrice(c.tuitionTotal)),
              _buildDetailRow('Đã thanh toán:', _formatPrice(c.amountPaid)),
              if (c.tuitionTotal > c.amountPaid)
                _buildDetailRow(
                  'Còn lại cần thu:',
                  _formatPrice(c.tuitionTotal - c.amountPaid),
                  valueColor: const Color(0xFFDC2626),
                ),
              if (c.batchCode != null && c.batchCode!.isNotEmpty)
                _buildDetailRow('Lớp phân bổ:', c.batchCode!),
              if (c.createdAt.isNotEmpty)
                _buildDetailRow('Ngày đăng ký:', c.createdAt),
              if (c.notes != null && c.notes!.isNotEmpty) ...[
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
                    c.notes!,
                    style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textHeading),
                  ),
                ),
              ],
              const SizedBox(height: 20),

              // Hành động chính
              Row(
                children: [
                  if (c.candidatePhone.isNotEmpty)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final uri = Uri.parse('tel:${c.candidatePhone}');
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri);
                          }
                        },
                        icon: const Icon(Icons.phone_rounded, size: 16),
                        label: Text('Gọi điện', style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF0D6832),
                          side: const BorderSide(color: Color(0xFF0D6832)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  if (c.candidatePhone.isNotEmpty) const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _openAssignBatch(c);
                      },
                      icon: const Icon(Icons.group_add_rounded, size: 16),
                      label: Text(
                        c.batchId != null ? 'Đổi lớp' : 'Xếp lớp',
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
                ],
              ),
              const SizedBox(height: 10),

              // Nút xóa / Hủy thẻ học viên (Delete)
              Center(
                child: TextButton.icon(
                  onPressed: () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (dCtx) => AlertDialog(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        title: Text('Xác nhận xóa học viên', style: AppTypography.zaloFont(fontWeight: FontWeight.w700, fontSize: 16)),
                        content: Text('Bạn có chắc chắn muốn xóa học viên "${c.candidateName}" khỏi hệ thống không?'),
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
                      Navigator.pop(ctx);
                      final success = await _repository.deleteCandidate(c.id);
                      if (mounted) {
                        if (success) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Đã xóa học viên ${c.candidateName}!'), backgroundColor: const Color(0xFFE11D48)),
                          );
                          _fetchData();
                        }
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
      ),
    );
  }

  Widget _buildMoveChip(BuildContext ctx, AdminCandidateModel c, String targetStatus, String label, Color color) {
    final isCurrent = c.status.toUpperCase() == targetStatus.toUpperCase();
    final isInitial = targetStatus == 'PENDING' || targetStatus == 'CONFIRMED' || targetStatus == 'CONSULTING' || targetStatus == 'DEPOSITED';
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
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Đã chuyển ${c.candidateName} sang cột "$label"!'),
                      backgroundColor: color,
                    ),
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
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Đã xếp học viên ${candidate.candidateName} vào lớp $batchCode thành công!',
                style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w500),
              ),
              backgroundColor: const Color(0xFF00693F),
              behavior: SnackBarBehavior.floating,
            ),
          );
          _fetchData();
        },
      ),
    );
  }

  void _openSubmissionDetail(AdminQuizSubmissionModel sub) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => QuizSubmissionDetailSheet(
        submission: sub,
        onSaved: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Đã lưu nhận xét và cập nhật kết quả bài thi!',
                style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w500),
              ),
              backgroundColor: AppColors.primary,
              behavior: SnackBarBehavior.floating,
            ),
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
                      : '${_filteredSubmissions.length} bài thi học viên nộp',
              style: AppTypography.zaloFont(
                fontSize: 10.5,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          // Nút + Thêm học viên (CRUD Create Compact)
          InkWell(
            onTap: () => _showCreateCandidateSheet(context),
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
                    'Thêm HV',
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
            color: Colors.white,
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
                _buildSegmentButton(2, 'Bài thi (${_submissions.length})', Icons.assignment_rounded),
              ],
            ),
          ),

          // 2. Nội dung Toolbar theo từng Segment
          if (_selectedSegment == 0) ...[
            // Ô tìm kiếm học viên & Switch kiểu xem (Trello / Danh sách)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 34,
                      child: TextField(
                        controller: _searchController,
                        style: AppTypography.zaloFont(fontSize: 12),
                        decoration: InputDecoration(
                          hintText: 'Tìm học viên, SĐT, mã đơn, khóa...',
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
                  // Nút chuyển giữa dạng Bảng Trello và Danh sách
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
                  // Dòng 2: ĐÚNG 2 NÚT LỌC (Chọn ngày & Tất cả)
                  Row(
                    children: [
                      // Nút 1: Chọn ngày khai giảng
                      _buildMicroPill(
                        label: _isAllBatchDates || _selectedBatchDate == null
                            ? 'Chọn ngày'
                            : DateFormat('dd/MM').format(_selectedBatchDate!),
                        icon: Icons.calendar_month_rounded,
                        isSelected: !_isAllBatchDates && _selectedBatchDate != null,
                        onTap: () async {
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
                        },
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
                    ],
                  ),
                ],
              ),
            ),
          ],

          if (_selectedSegment == 2) ...[
            // TOOLBAR BÀI THI: TÌM KIẾM + LỌC THEO LỚP HỌC & KẾT QUẢ ĐẠT/CHƯA ĐẠT
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: Column(
                children: [
                  // Dòng 1: Tìm kiếm bài thi
                  SizedBox(
                    height: 34,
                    child: TextField(
                      controller: _searchController,
                      style: AppTypography.zaloFont(fontSize: 12),
                      decoration: InputDecoration(
                        hintText: 'Tìm bài thi theo học viên, SĐT, lớp...',
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

                  // Dòng 2: Dải Micro-pills LỌC THEO LỚP HỌC (BATCH) & KẾT QUẢ
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        // Tất cả lớp
                        _buildMicroPill(
                          label: 'Tất cả lớp',
                          badgeText: '${_submissions.length}',
                          isSelected: _selectedSubmissionBatchId == 'ALL',
                          onTap: () => setState(() => _selectedSubmissionBatchId = 'ALL'),
                        ),
                        const SizedBox(width: 6),

                        // Từng lớp học cụ thể từ _batches
                        ..._batches.map((batch) {
                          final count = _submissions.where((s) {
                            final bId = _getSubmissionBatchId(s);
                            final bCode = _getSubmissionBatchCode(s);
                            return bId == batch.id || bCode == batch.batchCode;
                          }).length;

                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: _buildMicroPill(
                              label: batch.batchCode,
                              badgeText: '$count',
                              isSelected: _selectedSubmissionBatchId == batch.id || _selectedSubmissionBatchId == batch.batchCode,
                              onTap: () => setState(() => _selectedSubmissionBatchId = batch.id),
                            ),
                          );
                        }),

                        // Chưa có lớp (nếu có bài nộp của học viên chưa xếp lớp)
                        if (_submissions.any((s) => _getSubmissionBatchId(s).isEmpty && _getSubmissionBatchCode(s).isEmpty))
                          Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: _buildMicroPill(
                              label: 'Chưa có lớp',
                              isSelected: _selectedSubmissionBatchId == 'NO_BATCH',
                              onTap: () => setState(() => _selectedSubmissionBatchId = 'NO_BATCH'),
                            ),
                          ),

                        Container(
                          height: 16,
                          width: 1,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          color: const Color(0xFFE5E7EB),
                        ),

                        // Lọc theo kết quả Đạt / Chưa đạt
                        _buildMicroPill(
                          label: 'Đạt chuẩn',
                          badgeText: '${_submissions.where((s) => s.passed).length}',
                          isSelected: _selectedSubmissionResult == 'PASSED',
                          activeColor: const Color(0xFF00693F),
                          onTap: () {
                            setState(() {
                              _selectedSubmissionResult = _selectedSubmissionResult == 'PASSED' ? 'ALL' : 'PASSED';
                            });
                          },
                        ),
                        const SizedBox(width: 6),
                        _buildMicroPill(
                          label: 'Chưa đạt',
                          badgeText: '${_submissions.where((s) => !s.passed).length}',
                          isSelected: _selectedSubmissionResult == 'FAILED',
                          activeColor: const Color(0xFFD97706),
                          onTap: () {
                            setState(() {
                              _selectedSubmissionResult = _selectedSubmissionResult == 'FAILED' ? 'ALL' : 'FAILED';
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          const Divider(height: 1, color: Color(0xFFE5E7EB)),

          // 3. Danh sách dữ liệu chính
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
                          : _buildSubmissionsList(),
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
    );
  }

  // ==============================================================
  // 1. GIAO DIỆN BẢNG TRELLO (KANBAN BOARD KÉO THẢ & COMPACT TỐI ƯU KHÔNG GIAN)
  // ==============================================================
  Widget _buildKanbanTrelloView() {
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
              width: 255,
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
                    Text(
                      c.candidateName,
                      style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                    ),
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

  // Thẻ học viên kiểu Card Trello Compact (Chiều cao ~58px, hiển thị được 8-10 thẻ)
  Widget _buildTrelloCard(AdminCandidateModel c, Color tagColor) {
    final isPaid = c.amountPaid > 0;

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
              // Dòng 1: Mã đơn + Lớp + Tên học viên + Tiền
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: tagColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      c.orderCode,
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
              // Dòng 2: Khóa học + SĐT + Icon kéo thả
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
      ScaffoldMessenger.of(context).removeCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Học viên ${candidate.candidateName} đã đóng ${_formatPrice(candidate.amountPaid)} học phí. Không thể chuyển về trạng thái ban đầu!',
                  style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFFDC2626),
          duration: const Duration(seconds: 3),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
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
    ScaffoldMessenger.of(context).removeCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Đã chuyển ${candidate.candidateName} sang "$targetColumnTitle"',
          style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
        ),
        backgroundColor: const Color(0xFF00693F),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );

    // 4. Ghi nhận vào Database ngầm
    bool success = false;
    if (targetColumnKey == 'PAID_WAITING_CLASS') {
      success = await _repository.unassignBatchFromCandidate(candidate.id);
    } else {
      success = await _repository.updateCandidateStatus(candidate.id, newDbStatus);
    }

    if (!success && mounted) {
      // Rollback nếu có lỗi mạng/máy chủ
      setState(() {
        _candidates = oldList;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không thể cập nhật trạng thái học viên. Đã hoàn tác.'),
          backgroundColor: Color(0xFFDC2626),
        ),
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
        if (b.startDate == null || b.startDate!.isEmpty) return false;
        try {
          final parsed = DateTime.parse(b.startDate!);
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

  // ==============================================================
  // 4. GIAO DIỆN BÀI THI & TRẮC NGHIỆM (HỖ TRỢ LỌC THEO LỚP & GIAO DIỆN COMPACT)
  // ==============================================================
  Widget _buildSubmissionsList() {
    final list = _filteredSubmissions;

    if (list.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 50),
          Center(
            child: Column(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: const BoxDecoration(color: Color(0xFFF3F4F6), shape: BoxShape.circle),
                  child: const Icon(Icons.assignment_turned_in_rounded, size: 26, color: Color(0xFF9CA3AF)),
                ),
                const SizedBox(height: 12),
                Text(
                  _submissions.isEmpty ? 'Chưa có bài thi nào được nộp' : 'Không tìm thấy bài thi phù hợp bộ lọc',
                  style: AppTypography.zaloFont(fontSize: 13.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 4),
                Text(
                  _submissions.isEmpty
                      ? 'Khi học viên hoàn thành bài kiểm tra, kết quả sẽ hiện tại đây.'
                      : 'Hãy chọn lớp khác hoặc xóa từ khóa tìm kiếm.',
                  style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: list.length,
      itemBuilder: (ctx, index) {
        final sub = list[index];
        final bCode = _getSubmissionBatchCode(sub);

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: sub.passed ? const Color(0xFFE5E7EB) : const Color(0xFFFDE68A),
              width: sub.passed ? 1 : 1.2,
            ),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4, offset: const Offset(0, 1)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Dòng 1: Badge Lớp học + Badge Kết quả + Điểm số
              Row(
                children: [
                  // Badge Lớp học (BÀI THI LỌC THEO LỚP)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: bCode.isNotEmpty ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: bCode.isNotEmpty ? const Color(0xFF00693F).withValues(alpha: 0.3) : const Color(0xFFE5E7EB),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.school_rounded,
                          size: 12,
                          color: bCode.isNotEmpty ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                        ),
                        const SizedBox(width: 3),
                        Text(
                          bCode.isNotEmpty ? 'Lớp: $bCode' : 'Chưa có lớp',
                          style: AppTypography.zaloFont(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: bCode.isNotEmpty ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),

                  // Badge Đạt / Chưa đạt
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: sub.passed ? const Color(0xFFE8F6ED) : const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      sub.passed ? 'ĐẠT CHUẨN MLD' : 'CHƯA ĐẠT',
                      style: AppTypography.zaloFont(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                        color: sub.passed ? const Color(0xFF0D6832) : const Color(0xFF92400E),
                      ),
                    ),
                  ),
                  const Spacer(),

                  // Điểm số nổi bật
                  Text(
                    '${sub.score.toStringAsFixed(sub.score.truncateToDouble() == sub.score ? 0 : 1)} đ',
                    style: AppTypography.zaloFont(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      color: sub.passed ? const Color(0xFF00693F) : const Color(0xFFD97706),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),

              // Dòng 2: Tên học viên + SĐT
              Row(
                children: [
                  Text(
                    sub.studentName,
                    style: AppTypography.zaloFont(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHeading,
                    ),
                  ),
                  if (sub.studentPhone.isNotEmpty) ...[
                    Text(
                      ' · ${sub.studentPhone}',
                      style: AppTypography.zaloFont(
                        fontSize: 11,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 2),

              // Dòng 3: Bài thi & Khóa học
              Text(
                '${sub.quizTitle} · ${sub.courseTitle}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.zaloFont(fontSize: 11, color: AppColors.textSecondary),
              ),

              if (sub.instructorFeedback != null && sub.instructorFeedback!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: Text(
                    'GV nhận xét: "${sub.instructorFeedback}"',
                    style: AppTypography.zaloFont(fontSize: 10.5, fontStyle: FontStyle.italic, color: const Color(0xFF4B5563)),
                  ),
                ),
              ],
              const SizedBox(height: 8),

              // Dòng 4: Số câu đúng + Nút Xem & Nhận xét
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Đúng: ${sub.correctCount} câu',
                    style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w500, color: const Color(0xFF6B7280)),
                  ),
                  InkWell(
                    onTap: () => _openSubmissionDetail(sub),
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00693F),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Xem & Nhận xét',
                        style: AppTypography.zaloFont(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
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
  }
}
