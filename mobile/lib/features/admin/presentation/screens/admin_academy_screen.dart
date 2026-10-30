import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/admin_candidate_card.dart';
import '../widgets/assign_batch_bottom_sheet.dart';
import '../widgets/quiz_submission_detail_sheet.dart';

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

  int _selectedSegment = 0; // 0: Tuyển sinh & Xếp lớp, 1: Đề thi & Bài nộp
  String _selectedWorkflowStatus = 'ALL';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  List<AdminCandidateModel> _candidates = [];
  List<AdminQuizSubmissionModel> _submissions = [];

  final List<Map<String, String>> _workflowTabs = [
    {'key': 'ALL', 'label': 'Tất cả'},
    {'key': 'PENDING_CONSULTATION', 'label': 'Chờ tư vấn'},
    {'key': 'CONFIRMED_PENDING_PAY', 'label': 'Chờ nộp phí'},
    {'key': 'PAID_WAITING_CLASS', 'label': 'Chờ xếp lớp'},
    {'key': 'ENROLLED_STUDYING', 'label': 'Đang học'},
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialWorkflowTab != null && widget.initialWorkflowTab!.isNotEmpty) {
      if (widget.initialWorkflowTab == 'QUIZZES') {
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
    if (_selectedSegment == 0) {
      final list = await _repository.fetchCandidates(
        statusFilter: _selectedWorkflowStatus == 'ALL' ? null : _selectedWorkflowStatus,
      );
      if (mounted) {
        setState(() {
          _candidates = list;
          _isLoading = false;
        });
      }
    } else {
      final list = await _repository.fetchQuizSubmissions();
      if (mounted) {
        setState(() {
          _submissions = list;
          _isLoading = false;
        });
      }
    }
  }

  List<AdminCandidateModel> get _filteredCandidates {
    if (_searchQuery.isEmpty) return _candidates;
    final q = _searchQuery.toLowerCase();
    return _candidates.where((c) {
      return c.candidateName.toLowerCase().contains(q) ||
          c.candidatePhone.toLowerCase().contains(q) ||
          c.orderCode.toLowerCase().contains(q) ||
          c.courseTitle.toLowerCase().contains(q);
    }).toList();
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
                style: GoogleFonts.montserrat(fontSize: 12.5, fontWeight: FontWeight.w500),
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
                style: GoogleFonts.montserrat(fontSize: 12.5, fontWeight: FontWeight.w500),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Vận hành Tuyển sinh & Học viện',
              style: GoogleFonts.montserrat(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
              ),
            ),
            Text(
              _selectedSegment == 0
                  ? '${_candidates.length} học viên trong danh sách'
                  : '${_submissions.length} bài thi học viên nộp',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // 1. Segmented Controller chuyển 2 phân hệ lớn
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
            child: Container(
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedSegment = 0;
                        });
                        _fetchData();
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          color: _selectedSegment == 0 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: _selectedSegment == 0
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ]
                              : null,
                        ),
                        child: Center(
                          child: Text(
                            'Tuyển sinh & Xếp lớp',
                            style: GoogleFonts.montserrat(
                              fontSize: 12.5,
                              fontWeight: _selectedSegment == 0 ? FontWeight.w700 : FontWeight.w500,
                              color: _selectedSegment == 0
                                  ? const Color(0xFF00693F)
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedSegment = 1;
                        });
                        _fetchData();
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          color: _selectedSegment == 1 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: _selectedSegment == 1
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ]
                              : null,
                        ),
                        child: Center(
                          child: Text(
                            'Đề thi & Bài nộp',
                            style: GoogleFonts.montserrat(
                              fontSize: 12.5,
                              fontWeight: _selectedSegment == 1 ? FontWeight.w700 : FontWeight.w500,
                              color: _selectedSegment == 1
                                  ? const Color(0xFF00693F)
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 2. Nội dung theo Segment
          if (_selectedSegment == 0) ...[
            // Ô tìm kiếm học viên
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Tìm theo tên, SĐT, mã đơn, khóa...',
                  hintStyle: GoogleFonts.montserrat(fontSize: 12, color: const Color(0xFF9CA3AF)),
                  prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF9CA3AF)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  filled: true,
                  fillColor: const Color(0xFFF9FAFB),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                  ),
                ),
                onChanged: (val) => setState(() => _searchQuery = val.trim()),
              ),
            ),

            // Thanh cuộn bộ lọc Trạng thái Quy trình (Chips)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _workflowTabs.map((tab) {
                    final key = tab['key']!;
                    final isSelected = _selectedWorkflowStatus == key;
                    final isWaitingClass = key == 'PAID_WAITING_CLASS';

                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(tab['label']!),
                            if (isWaitingClass) ...[
                              const SizedBox(width: 4),
                              Container(
                                width: 7,
                                height: 7,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFE11D48),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ],
                        ),
                        selected: isSelected,
                        selectedColor: const Color(0xFFE8F6ED),
                        backgroundColor: Colors.white,
                        labelStyle: GoogleFonts.montserrat(
                          fontSize: 11.5,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: BorderSide(
                            color: isSelected ? const Color(0xFF00693F) : const Color(0xFFE5E7EB),
                          ),
                        ),
                        showCheckmark: false,
                        onSelected: (selected) {
                          setState(() => _selectedWorkflowStatus = key);
                          _fetchData();
                        },
                      ),
                    );
                  }).toList(),
                ),
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
                      ? _buildCandidatesList()
                      : _buildSubmissionsList(),
            ),
          ),
        ],
      ),
    );
  }

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
                  decoration: const BoxDecoration(
                    color: Color(0xFFF3F4F6),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.person_search_rounded, size: 30, color: Color(0xFF9CA3AF)),
                ),
                const SizedBox(height: 14),
                Text(
                  'Không có hồ sơ học viên nào',
                  style: GoogleFonts.montserrat(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Hồ sơ ghi danh mới từ học viên sẽ xuất hiện tại đây.',
                  style: GoogleFonts.montserrat(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      itemCount: _filteredCandidates.length,
      itemBuilder: (ctx, index) {
        final c = _filteredCandidates[index];
        return AdminCandidateCard(
          candidate: c,
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

  Widget _buildSubmissionsList() {
    if (_submissions.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 60),
          Center(
            child: Column(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF3F4F6),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.assignment_turned_in_rounded, size: 30, color: Color(0xFF9CA3AF)),
                ),
                const SizedBox(height: 14),
                Text(
                  'Chưa có bài thi nào được nộp',
                  style: GoogleFonts.montserrat(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Khi học viên hoàn thành bài kiểm tra, kết quả sẽ hiện tại đây.',
                  style: GoogleFonts.montserrat(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      itemCount: _submissions.length,
      itemBuilder: (ctx, index) {
        final sub = _submissions[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                    decoration: BoxDecoration(
                      color: sub.passed ? const Color(0xFFE8F6ED) : const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      sub.passed ? 'ĐẠT CHUẨN MLD' : 'CHƯA ĐẠT',
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: sub.passed ? const Color(0xFF0D6832) : const Color(0xFF92400E),
                      ),
                    ),
                  ),
                  Text(
                    'Điểm số: ${sub.score}',
                    style: GoogleFonts.montserrat(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: sub.passed ? const Color(0xFF00693F) : const Color(0xFFD97706),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                sub.studentName,
                style: GoogleFonts.montserrat(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Khóa: ${sub.courseTitle} · ${sub.quizTitle}',
                style: GoogleFonts.montserrat(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
              if (sub.instructorFeedback != null && sub.instructorFeedback!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'GV nhận xét: "${sub.instructorFeedback}"',
                    style: GoogleFonts.montserrat(
                      fontSize: 11.5,
                      fontStyle: FontStyle.italic,
                      color: const Color(0xFF4B5563),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Số câu đúng: ${sub.correctCount} câu',
                    style: GoogleFonts.montserrat(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF6B7280),
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () => _openSubmissionDetail(sub),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00693F),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(
                      'Xem & Nhận xét',
                      style: GoogleFonts.montserrat(fontSize: 11.5, fontWeight: FontWeight.w600),
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

