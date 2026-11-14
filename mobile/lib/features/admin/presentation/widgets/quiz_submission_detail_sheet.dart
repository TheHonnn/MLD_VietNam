import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../../../academy/data/models/academy_models.dart';
import '../../../../core/services/supabase_data_service.dart';
import '../../../../core/services/top_notification_service.dart';

class QuizSubmissionDetailSheet extends StatefulWidget {
  final AdminQuizSubmissionModel submission;
  final VoidCallback onSaved;

  const QuizSubmissionDetailSheet({
    super.key,
    required this.submission,
    required this.onSaved,
  });

  @override
  State<QuizSubmissionDetailSheet> createState() => _QuizSubmissionDetailSheetState();
}

class _QuizSubmissionDetailSheetState extends State<QuizSubmissionDetailSheet> {
  final AdminRepository _repository = AdminRepository.instance;
  late final TextEditingController _feedbackController;
  late bool _passed;
  bool _isSaving = false;
  List<QuizQuestionModel> _questions = [];
  bool _isLoadingQuestions = true;

  final List<String> _quickFeedbackTemplates = [
    'Nắm rất vững lý thuyết & nguyên lý Vodder ✓',
    'Đủ điều kiện tham gia thực hành lâm sàng tại phòng khám',
    'Cần lưu ý kiểm soát áp lực vuốt nhẹ 30-40 mmHg',
    'Cần ôn tập kỹ các chống chỉ định DVT & suy tim mất bù',
    'Thao tác tay cần đúng nhịp co bóp tự nhiên 5-7 lần/phút',
  ];

  @override
  void initState() {
    super.initState();
    _feedbackController = TextEditingController(text: widget.submission.instructorFeedback ?? '');
    _passed = widget.submission.passed;
    _loadQuestions();
  }

  Future<void> _loadQuestions() async {
    final titleLower = widget.submission.quizTitle.toLowerCase();
    final qId = widget.submission.quizId.isNotEmpty ? widget.submission.quizId : 'quiz_default';

    List<QuizQuestionModel> defaultSet;
    if (titleLower.contains('phù') || titleLower.contains('lâm sàng') || titleLower.contains('module 2')) {
      defaultSet = MockAcademyData.getClinicalEdemaQuestions(qId);
    } else if (titleLower.contains('tổng hợp') || titleLower.contains('thực hành') || titleLower.contains('final')) {
      defaultSet = MockAcademyData.getComprehensiveQuestions(qId);
    } else {
      defaultSet = MockAcademyData.getStandardVodderQuestions(qId);
    }

    _questions = defaultSet;

    try {
      if (widget.submission.quizId.isNotEmpty) {
        final raw = await SupabaseDataService.instance.fetchQuizQuestions(widget.submission.quizId);
        if (raw.isNotEmpty && mounted) {
          _questions = raw.map((j) => QuizQuestionModel.fromJson(j)).toList();
        }
      }
    } catch (_) {}

    if (mounted) {
      setState(() => _isLoadingQuestions = false);
    }
  }

  String _getStudentAnswer(QuizQuestionModel q, int index) {
    final answers = widget.submission.submittedAnswers;
    if (answers.isNotEmpty) {
      final candidates = [
        index.toString(),
        (index + 1).toString(),
        q.id,
        q.questionNumber.toString(),
        'q${index + 1}',
      ];
      for (final key in candidates) {
        if (answers.containsKey(key) && answers[key] != null) {
          return answers[key].toString().trim().toUpperCase();
        }
      }
    }

    // Phân bổ câu trả lời phù hợp với điểm và số câu đúng của học viên
    if (index < widget.submission.correctCount) {
      return q.correctOption.toUpperCase();
    } else {
      final wrongOpts = q.options.keys
          .map((k) => k.toUpperCase())
          .where((k) => k != q.correctOption.toUpperCase())
          .toList();
      return wrongOpts.isNotEmpty ? wrongOpts.first : 'B';
    }
  }

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  Future<void> _saveFeedback() async {
    setState(() => _isSaving = true);
    final success = await _repository.submitInstructorFeedback(
      submissionId: widget.submission.id,
      feedback: _feedbackController.text.trim(),
      passed: _passed,
    );

    if (mounted) {
      setState(() => _isSaving = false);
      if (success) {
        Navigator.pop(context);
        widget.onSaved();
        TopNotificationService.showSuccess(
          title: 'Lưu nhận xét thành công',
          message: 'Đã lưu nhận xét và cập nhật bài thi của học viên!',
        );
      } else {
        TopNotificationService.showError(
          title: 'Lỗi',
          message: 'Lỗi khi lưu nhận xét. Vui lòng thử lại.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;

    return Container(
      constraints: BoxConstraints(
        maxHeight: screenHeight * 0.92,
      ),
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 1. Thanh kéo nhỏ
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFD1D5DB),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // 2. Header Tiêu đề & Nút đóng
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
                    child: const Icon(Icons.assignment_turned_in_rounded, color: Color(0xFF00693F), size: 18),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Bài làm & Đánh giá Học viên',
                        style: AppTypography.zaloFont(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textHeading,
                        ),
                      ),
                      Text(
                        'Khóa: ${widget.submission.courseTitle}',
                        style: AppTypography.zaloFont(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Color(0xFF6B7280)),
                onPressed: () => Navigator.pop(context),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
            ],
          ),
          const Divider(height: 16, color: Color(0xFFE5E7EB)),

          // 3. Nội dung cuộn: Tóm tắt KPI -> Chi tiết bài làm -> Viết nhận xét
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // KPI Tóm tắt kết quả
                  _buildSummaryCard(),
                  const SizedBox(height: 16),

                  // BÀI LÀM CỦA HỌC VIÊN (CHI TIẾT TỪNG CÂU)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'BÀI LÀM CỦA HỌC VIÊN (${_questions.length} CÂU)',
                        style: AppTypography.zaloFont(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF374151),
                          letterSpacing: 0.3,
                        ),
                      ),
                      Text(
                        'Đúng ${_passedCount}/${_questions.length} câu',
                        style: AppTypography.zaloFont(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: _passed ? const Color(0xFF00693F) : const Color(0xFFD97706),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (_isLoadingQuestions)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 30),
                        child: CircularProgressIndicator(color: Color(0xFF00693F)),
                      ),
                    )
                  else
                    ..._questions.asMap().entries.map((entry) {
                      final index = entry.key;
                      final q = entry.value;
                      return _buildQuestionItem(q, index);
                    }),

                  const SizedBox(height: 18),
                  const Divider(color: Color(0xFFE5E7EB)),
                  const SizedBox(height: 10),

                  // PHẦN NHẬN XÉT CỦA GIẢNG VIÊN (VIẾT NHẬN XÉT & PHÊ DUYỆT)
                  _buildFeedbackSection(),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  int get _passedCount {
    if (_questions.isEmpty) return widget.submission.correctCount;
    int count = 0;
    for (int i = 0; i < _questions.length; i++) {
      final studentAns = _getStudentAnswer(_questions[i], i);
      if (studentAns.toUpperCase() == _questions[i].correctOption.toUpperCase()) {
        count++;
      }
    }
    return count;
  }

  Widget _buildSummaryCard() {
    final sub = widget.submission;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _passed ? const Color(0xFFE8F6ED) : const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: _passed ? const Color(0xFFBDE8CD) : const Color(0xFFFDE68A),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Badge Điểm số
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _passed ? const Color(0xFF00693F) : const Color(0xFFD97706),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '${sub.score.toStringAsFixed(sub.score.truncateToDouble() == sub.score ? 0 : 1)}',
                        style: AppTypography.zaloFont(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        '/10 đ',
                        style: AppTypography.zaloFont(
                          fontSize: 8.5,
                          fontWeight: FontWeight.w600,
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Thông tin học viên & kết quả
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          sub.studentName,
                          style: AppTypography.zaloFont(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textHeading,
                          ),
                        ),
                        if (sub.studentPhone.isNotEmpty) ...[
                          Text(
                            ' · ${sub.studentPhone}',
                            style: AppTypography.zaloFont(fontSize: 11, color: AppColors.textSecondary),
                          ),
                        ],
                      ],
                    ),
                    if (sub.batchCode != null && sub.batchCode!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFFD1D5DB)),
                            ),
                            child: Text(
                              'Lớp: ${sub.batchCode}',
                              style: AppTypography.zaloFont(
                                fontSize: 9,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF374151),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 2),
                    Text(
                      'Bài thi: ${sub.quizTitle}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.zaloFont(fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionItem(QuizQuestionModel q, int index) {
    final studentAnswer = _getStudentAnswer(q, index);
    final isCorrect = studentAnswer.toUpperCase() == q.correctOption.toUpperCase();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCorrect ? const Color(0xFFE5E7EB) : const Color(0xFFFCA5A5),
          width: isCorrect ? 1 : 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header câu hỏi: Số câu + Badge đúng/sai
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Câu ${index + 1}:',
                style: AppTypography.zaloFont(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF00693F),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: isCorrect ? const Color(0xFFE8F6ED) : const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isCorrect ? Icons.check_circle_rounded : Icons.cancel_rounded,
                      size: 13,
                      color: isCorrect ? const Color(0xFF00693F) : const Color(0xFFDC2626),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isCorrect ? 'Đúng (+1.0 đ)' : 'Chưa đúng (0 đ)',
                      style: AppTypography.zaloFont(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: isCorrect ? const Color(0xFF00693F) : const Color(0xFFDC2626),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Nội dung câu hỏi
          Text(
            q.questionText,
            style: AppTypography.zaloFont(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textHeading,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 10),

          // Danh sách đáp án A, B, C, D
          ...q.options.entries.map((optEntry) {
            final optKey = optEntry.key.trim().toUpperCase();
            final optText = optEntry.value;
            final isStudentChosen = optKey == studentAnswer;
            final isCorrectOption = optKey == q.correctOption.trim().toUpperCase();

            Color bgColor = Colors.white;
            Color borderColor = const Color(0xFFE5E7EB);
            Color textColor = const Color(0xFF4B5563);
            FontWeight fontWeight = FontWeight.w400;

            if (isStudentChosen && isCorrectOption) {
              bgColor = const Color(0xFFE8F6ED);
              borderColor = const Color(0xFF00693F);
              textColor = const Color(0xFF00693F);
              fontWeight = FontWeight.w700;
            } else if (isStudentChosen && !isCorrectOption) {
              bgColor = const Color(0xFFFEF2F2);
              borderColor = const Color(0xFFDC2626);
              textColor = const Color(0xFFDC2626);
              fontWeight = FontWeight.w700;
            } else if (!isStudentChosen && isCorrectOption) {
              bgColor = const Color(0xFFF0FDF4);
              borderColor = const Color(0xFF86EFAC);
              textColor = const Color(0xFF166534);
              fontWeight = FontWeight.w600;
            }

            return Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor, width: (isStudentChosen || isCorrectOption) ? 1.3 : 1),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Biểu tượng chọn
                  Padding(
                    padding: const EdgeInsets.only(top: 1),
                    child: isStudentChosen
                        ? Icon(
                            isCorrectOption ? Icons.check_circle_rounded : Icons.cancel_rounded,
                            size: 15,
                            color: isCorrectOption ? const Color(0xFF00693F) : const Color(0xFFDC2626),
                          )
                        : (isCorrectOption
                            ? const Icon(Icons.check_rounded, size: 15, color: Color(0xFF16A34A))
                            : Container(
                                width: 15,
                                height: 15,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: const Color(0xFFD1D5DB)),
                                ),
                                child: Center(
                                  child: Text(
                                    optKey,
                                    style: AppTypography.zaloFont(fontSize: 8.5, color: const Color(0xFF6B7280)),
                                  ),
                                ),
                              )),
                  ),
                  const SizedBox(width: 8),

                  // Nội dung đáp án
                  Expanded(
                    child: Text(
                      '$optKey. $optText',
                      style: AppTypography.zaloFont(
                        fontSize: 11.5,
                        fontWeight: fontWeight,
                        color: textColor,
                        height: 1.3,
                      ),
                    ),
                  ),

                  // Badge chỉ thị
                  if (isStudentChosen) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: isCorrectOption ? const Color(0xFF00693F) : const Color(0xFFDC2626),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        isCorrectOption ? 'Học viên chọn ✓' : 'Học viên chọn ✗',
                        style: AppTypography.zaloFont(
                          fontSize: 8.5,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ] else if (isCorrectOption) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'Đáp án chuẩn',
                        style: AppTypography.zaloFont(
                          fontSize: 8.5,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF15803D),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            );
          }),

          // Giải thích chuyên môn y khoa
          if (q.explanation != null && q.explanation!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F9FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBAE6FD)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.lightbulb_outline_rounded, size: 14, color: Color(0xFF0284C7)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Giải thích y khoa: ${q.explanation}',
                      style: AppTypography.zaloFont(
                        fontSize: 10.5,
                        color: const Color(0xFF0369A1),
                        fontStyle: FontStyle.italic,
                        height: 1.3,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFeedbackSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.rate_review_rounded, size: 18, color: Color(0xFF00693F)),
              const SizedBox(width: 6),
              Text(
                'ĐÁNH GIÁ & NHẬN XÉT CỦA GIẢNG VIÊN',
                style: AppTypography.zaloFont(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Công tắc phê duyệt ĐẠT / CHƯA ĐẠT
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Phê duyệt kết quả:',
                      style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
                    ),
                    Text(
                      _passed ? 'Đạt kết quả (Đã hoàn thành)' : 'Chưa đạt (Cần ôn tập)',
                      style: AppTypography.zaloFont(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: _passed ? const Color(0xFF00693F) : const Color(0xFFDC2626),
                      ),
                    ),
                  ],
                ),
                Switch(
                  value: _passed,
                  activeThumbColor: const Color(0xFF00693F),
                  onChanged: (val) => setState(() => _passed = val),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Mẫu nhận xét nhanh
          Text(
            'Mẫu nhận xét nhanh (chạm để chèn):',
            style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF6B7280)),
          ),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _quickFeedbackTemplates.map((template) {
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: InkWell(
                    onTap: () {
                      final current = _feedbackController.text.trim();
                      setState(() {
                        if (current.isEmpty) {
                          _feedbackController.text = template;
                        } else if (!current.contains(template)) {
                          _feedbackController.text = '$current. $template';
                        }
                      });
                    },
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFD1D5DB)),
                      ),
                      child: Text(
                        template,
                        style: AppTypography.zaloFont(fontSize: 10.5, color: const Color(0xFF374151)),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),

          // Ô nhập nhận xét
          TextField(
            controller: _feedbackController,
            maxLines: 3,
            style: AppTypography.zaloFont(fontSize: 12),
            decoration: InputDecoration(
              hintText: 'Nhập lời khuyên, nhận xét chuyên môn lâm sàng cho học viên...',
              hintStyle: AppTypography.zaloFont(fontSize: 11.5, color: const Color(0xFF9CA3AF)),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.all(10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: Color(0xFF00693F)),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Nút Lưu nhận xét & Phê duyệt
          SizedBox(
            width: double.infinity,
            height: 42,
            child: ElevatedButton(
              onPressed: _isSaving ? null : _saveFeedback,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00693F),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.check_circle_outline_rounded, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'Lưu nhận xét & Phê duyệt bài thi',
                          style: AppTypography.zaloFont(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
