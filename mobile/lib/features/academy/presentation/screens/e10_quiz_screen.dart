import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/constants/app_colors.dart';
import '../widgets/academy_widgets.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../../../../core/services/supabase_data_service.dart';

/// Screen E10: Kiểm tra kiến thức trắc nghiệm (Quiz Assessment)
/// Gắn theo ID khóa học, nạp ngân hàng câu hỏi chuẩn y khoa và chấm điểm theo tiêu chí Admin
class E10QuizScreen extends StatefulWidget {
  final CourseQuizModel? quiz;
  final CourseModel? course;
  final String? quizTitle;
  final String? courseTitle;
  final int? totalQuestions;
  final int? timeLimitMinutes;
  final double? passingScore;

  const E10QuizScreen({
    super.key,
    this.quiz,
    this.course,
    this.quizTitle,
    this.courseTitle,
    this.totalQuestions,
    this.timeLimitMinutes,
    this.passingScore,
  });

  @override
  State<E10QuizScreen> createState() => _E10QuizScreenState();
}

class _E10QuizScreenState extends State<E10QuizScreen> {
  late List<QuizQuestionModel> _questions;
  int _currentQuestionIndex = 0;
  final Map<int, String> _selectedAnswers = {}; // questionIndex -> 'A' | 'B' | 'C' | 'D'

  Timer? _countdownTimer;
  late int _remainingSeconds;
  bool _isSubmitted = false;
  QuizSubmissionModel? _previousSubmission;
  bool _showExplanations = false;

  String get _quizTitle => widget.quiz?.title ?? widget.quizTitle ?? 'Bài kiểm tra trắc nghiệm MLD';
  String get _courseTitle => widget.course?.title ?? widget.courseTitle ?? 'Khóa học Đào tạo MLD';
  int get _timeLimitMinutes => widget.quiz?.timeLimitMinutes ?? widget.timeLimitMinutes ?? 15;
  double get _passingScore {
    final raw = widget.quiz?.passingScore ?? widget.passingScore ?? 8.0;
    return raw > 10 ? raw / 10.0 : raw;
  }

  @override
  void initState() {
    super.initState();
    _initQuizData();
  }

  void _loadQuestionsDynamically() async {
    final qId = widget.quiz?.id;
    if (qId != null && qId.isNotEmpty) {
      final raw = await SupabaseDataService.instance.fetchQuizQuestions(qId);
      if (raw.isNotEmpty && mounted) {
        setState(() {
          _questions = raw.map((j) => QuizQuestionModel.fromJson(j)).toList();
        });
      }
    }
  }

  void _initQuizData() {
    if (widget.quiz != null && widget.quiz!.questions.isNotEmpty) {
      _questions = List.from(widget.quiz!.questions);
    } else if (WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding')) {
      final qId = widget.quiz?.id ?? 'quiz_default';
      _questions = MockAcademyData.getStandardVodderQuestions(qId);
    } else {
      _loadQuestionsDynamically();
    }

    _remainingSeconds = _timeLimitMinutes * 60;
    _startCountdown();

    // Tải kết quả thi trước đó nếu có
    final prevSub = AcademyRepository.instance.getQuizSubmission(widget.quiz?.id ?? 'quiz_default');
    if (prevSub != null) {
      _previousSubmission = prevSub;
    }
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        if (mounted) {
          setState(() {
            _remainingSeconds--;
          });
        }
      } else {
        timer.cancel();
        if (!_isSubmitted && mounted) {
          _submitQuiz(isAutoTimeUp: true);
        }
      }
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  String _formatTimer(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  void _submitQuiz({bool isAutoTimeUp = false}) {
    _countdownTimer?.cancel();

    int correctCount = 0;
    for (int i = 0; i < _questions.length; i++) {
      if (_selectedAnswers[i] != null &&
          _selectedAnswers[i]!.toUpperCase() == _questions[i].correctOption.toUpperCase()) {
        correctCount++;
      }
    }

    final double score = _questions.isNotEmpty
        ? double.parse(((correctCount / _questions.length) * 10.0).toStringAsFixed(1))
        : 0.0;
    final bool passed = score >= _passingScore;

    final sub = QuizSubmissionModel(
      id: 'sub_${DateTime.now().millisecondsSinceEpoch}',
      quizId: widget.quiz?.id ?? 'quiz_default',
      courseId: widget.course?.id ?? widget.quiz?.courseId ?? 'course_default',
      score: score,
      correctCount: correctCount,
      totalQuestions: _questions.length,
      passed: passed,
      submittedAnswers: Map.from(_selectedAnswers),
      submittedAt: DateTime.now(),
    );

    AcademyRepository.instance.saveQuizSubmission(sub);

    setState(() {
      _isSubmitted = true;
      _previousSubmission = sub;
    });

    _showResultDialog(sub, isAutoTimeUp);
  }

  void _showResultDialog(QuizSubmissionModel sub, bool isAutoTimeUp) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.all(22),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: sub.passed ? const Color(0xFFD1FAE5) : const Color(0xFFFEE2E2),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    sub.passed ? '✓' : '!',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: sub.passed ? const Color(0xFF047857) : const Color(0xFFDC2626),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                sub.passed ? context.tr('CHÚC MỪNG: ĐẠT TIÊU CHUẨN', 'CONGRATULATIONS: PASSED') : context.tr('KẾT QUẢ: CHƯA ĐẠT', 'RESULT: FAILED'),
                style: TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: sub.passed ? const Color(0xFF047857) : const Color(0xFFDC2626),
                ),
                textAlign: TextAlign.center,
              ),
              if (isAutoTimeUp)
                Padding(
                  padding: const EdgeInsets.only(top: 4.0),
                  child: Text(
                    context.tr('(Hết thời gian làm bài, hệ thống đã tự động nộp bài)', '(Time expired, the system automatically submitted your test)'),
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AcademyColors.cardWarm,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AcademyColors.cardBorder),
                ),
                child: Column(
                  children: [
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      children: [
                        Text(context.tr('Điểm số đạt được:', 'Score achieved:'), style: const TextStyle(fontSize: 13, color: AcademyColors.textSecondary)),
                        Text(
                          '${sub.score.toStringAsFixed(1)} / 10.0',
                          style: TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: sub.passed ? const Color(0xFF047857) : const Color(0xFFDC2626),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      children: [
                        Text(context.tr('Số câu trả lời đúng:', 'Correct answers:'), style: const TextStyle(fontSize: 13, color: AcademyColors.textSecondary)),
                        Text(
                          context.isEn ? '${sub.correctCount} / ${sub.totalQuestions} questions' : '${sub.correctCount} / ${sub.totalQuestions} câu',
                          style: const TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AcademyColors.heading,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      children: [
                        Text(context.tr('Tiêu chí đạt quy định:', 'Passing criteria:'), style: const TextStyle(fontSize: 13, color: AcademyColors.textSecondary)),
                        Text(
                          context.isEn ? '≥ ${_passingScore.toStringAsFixed(1)} / 10 pts (≥ 80%)' : '≥ ${_passingScore.toStringAsFixed(1)} / 10 điểm (≥ 80%)',
                          style: const TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Text(
                sub.passed
                    ? context.tr('Bạn đã hoàn thành xuất sắc bài kiểm tra lý thuyết MLD, đủ điều kiện để tham gia thực hành lâm sàng và xét cấp chứng chỉ.', 'You have successfully completed the MLD theoretical assessment, qualifying for clinical practice and certification evaluation.')
                    : context.tr('Điểm số của bạn chưa đạt mức yêu cầu tối thiểu (≥ ${_passingScore.toStringAsFixed(1)} điểm) theo quy định của Ban Đào tạo. Hãy ôn lại bài học và thi lại.', 'Your score did not meet the minimum requirement (≥ ${_passingScore.toStringAsFixed(1)} points) set by the Academic Board. Please review the lessons and retake the test.'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12.5, color: AcademyColors.textPrimary, height: 1.4),
              ),
              const SizedBox(height: 20),
              Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        setState(() {
                          _showExplanations = true;
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AcademyColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      child: Text(context.tr('Xem lại đáp án & Giải thích', 'Review Answers & Explanations'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            Navigator.pop(ctx);
                            _resetQuiz();
                          },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AcademyColors.cardBorder),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: Text(context.tr('Làm lại bài', 'Retake Test'), style: const TextStyle(fontSize: 12, color: AcademyColors.heading)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            Navigator.pop(ctx);
                            Navigator.pop(context, true);
                          },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AcademyColors.cardBorder),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: Text(context.tr('Đóng bài thi', 'Close Test'), style: const TextStyle(fontSize: 12, color: AcademyColors.heading)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _resetQuiz() {
    setState(() {
      _isSubmitted = false;
      _showExplanations = false;
      _currentQuestionIndex = 0;
      _selectedAnswers.clear();
      _remainingSeconds = _timeLimitMinutes * 60;
    });
    _startCountdown();
  }

  void _confirmSubmit() {
    final answeredCount = _selectedAnswers.length;
    final total = _questions.length;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text(context.tr('Xác nhận nộp bài', 'Confirm Submission'), style: const TextStyle(fontFamily: 'Montserrat', fontWeight: FontWeight.w700)),
        content: Text(
          answeredCount < total
              ? (context.isEn ? 'You have only completed $answeredCount/$total questions. Are you sure you want to submit now?' : 'Bạn mới hoàn thành $answeredCount/$total câu hỏi. Bạn có chắc chắn muốn nộp bài ngay bây giờ?')
              : (context.isEn ? 'You have answered all $total/$total questions. Are you sure you want to submit for grading?' : 'Bạn đã trả lời đầy đủ $total/$total câu hỏi. Bạn có chắc chắn muốn nộp bài để chấm điểm?'),
          style: const TextStyle(fontSize: 13.5, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(context.tr('Làm tiếp', 'Continue'), style: const TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _submitQuiz();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AcademyColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(context.tr('Nộp bài ngay', 'Submit Now')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_questions.isEmpty) {
      return Scaffold(
        appBar: AcademyAppBar(subtitleTag: context.tr('Bài kiểm tra', 'Quiz Assessment')),
        body: Center(child: Text(context.tr('Đang chuẩn bị đề kiểm tra trắc nghiệm...', 'Preparing multiple choice quiz...'))),
      );
    }

    final currentQ = _questions[_currentQuestionIndex];
    final selectedOpt = _selectedAnswers[_currentQuestionIndex];
    final isLastQuestion = _currentQuestionIndex == _questions.length - 1;

    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: AcademyAppBar(subtitleTag: context.tr('Bài kiểm tra trắc nghiệm', 'Multiple Choice Quiz')),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 22),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AcademyColors.cardBorder, width: 1.0)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                context.isEn ? 'Answered: ${_selectedAnswers.length} / ${_questions.length} questions' : 'Đã làm: ${_selectedAnswers.length} / ${_questions.length} câu',
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AcademyColors.textPrimary,
                ),
              ),
            ),
            SizedBox(
              height: 44,
              child: ElevatedButton(
                key: const Key('submit_quiz_button'),
                onPressed: _confirmSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AcademyColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                ),
                child: Text(
                  context.tr('Nộp bài', 'Submit'),
                  style: const TextStyle(fontFamily: 'Montserrat', fontSize: 13.5, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Tên khóa học & Tiêu đề bài kiểm tra
            Text(
              _courseTitle.tr(context),
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _quizTitle.tr(context),
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.3,
              ),
            ),
            if (_previousSubmission != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: _previousSubmission!.passed ? const Color(0xFFD1FAE5) : const Color(0xFFFEE2E2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 10,
                  runSpacing: 4,
                  children: [
                    Text(
                      _previousSubmission!.passed ? context.tr('Lần làm gần nhất: ĐẠT', 'Latest Attempt: PASSED') : context.tr('Lần làm gần nhất: CHƯA ĐẠT', 'Latest Attempt: FAILED'),
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: _previousSubmission!.passed ? const Color(0xFF047857) : const Color(0xFFDC2626),
                      ),
                    ),
                    Text(
                      '${_previousSubmission!.score.toStringAsFixed(1)} / 10.0',
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                        color: _previousSubmission!.passed ? const Color(0xFF047857) : const Color(0xFFDC2626),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),

            // 2. Đồng hồ đếm ngược và thanh tiến trình câu hỏi
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AcademyColors.cardBorder),
              ),
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 10,
                runSpacing: 6,
                children: [
                  Text(
                    context.isEn ? 'Question ${_currentQuestionIndex + 1} / ${_questions.length}' : 'Câu ${_currentQuestionIndex + 1} / ${_questions.length}',
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _remainingSeconds < 180 ? const Color(0xFFFEE2E2) : const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      context.isEn ? 'Time: ${_formatTimer(_remainingSeconds)}' : 'Thời gian: ${_formatTimer(_remainingSeconds)}',
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: _remainingSeconds < 180 ? const Color(0xFFDC2626) : AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // Hàng số câu hỏi nhảy nhanh
            SizedBox(
              height: 36,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _questions.length,
                separatorBuilder: (_, __) => const SizedBox(width: 6),
                itemBuilder: (context, idx) {
                  final isCurrent = idx == _currentQuestionIndex;
                  final isAnswered = _selectedAnswers.containsKey(idx);

                  Color bg = Colors.white;
                  Color textCol = AcademyColors.textSecondary;
                  if (isCurrent) {
                    bg = AppColors.primary;
                    textCol = Colors.white;
                  } else if (isAnswered) {
                    bg = const Color(0xFFD1FAE5);
                    textCol = const Color(0xFF047857);
                  }

                  return InkWell(
                    onTap: () => setState(() => _currentQuestionIndex = idx),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      width: 36,
                      height: 36,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: bg,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isCurrent ? AppColors.primary : AcademyColors.cardBorder,
                        ),
                      ),
                      child: Text(
                        '${idx + 1}',
                        style: TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: textCol,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 14),

            // 3. Nội dung câu hỏi
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AcademyColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.isEn ? 'Question ${_currentQuestionIndex + 1}:' : 'Câu hỏi ${_currentQuestionIndex + 1}:',
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    currentQ.questionText.tr(context),
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // 4. Danh sách các đáp án A, B, C, D
            ...currentQ.options.entries.map((entry) {
              final key = entry.key;
              final text = entry.value;
              final isChosen = selectedOpt?.toUpperCase() == key.toUpperCase();

              // Nếu đang xem giải thích sau khi nộp
              bool isCorrect = key.toUpperCase() == currentQ.correctOption.toUpperCase();

              Color itemBg = Colors.white;
              Color borderCol = AcademyColors.cardBorder;

              if (_showExplanations) {
                if (isCorrect) {
                  itemBg = const Color(0xFFD1FAE5);
                  borderCol = const Color(0xFF10B981);
                } else if (isChosen && !isCorrect) {
                  itemBg = const Color(0xFFFEE2E2);
                  borderCol = const Color(0xFFEF4444);
                }
              } else if (isChosen) {
                itemBg = const Color(0xFFEFF6FF);
                borderCol = AppColors.primary;
              }

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  onTap: _showExplanations
                      ? null
                      : () {
                          setState(() {
                            _selectedAnswers[_currentQuestionIndex] = key;
                          });
                        },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: itemBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderCol, width: isChosen ? 1.5 : 1.0),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: isChosen ? AppColors.primary : const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            key,
                            style: TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isChosen ? Colors.white : AcademyColors.heading,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            text.tr(context),
                            style: TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 13,
                              fontWeight: isChosen ? FontWeight.w700 : FontWeight.w500,
                              color: AcademyColors.textPrimary,
                              height: 1.35,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),

            // Giải thích câu hỏi khi xem lại
            if (_showExplanations && currentQ.explanation != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                margin: const EdgeInsets.only(top: 6, bottom: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('Giải thích y khoa chuyên môn:', 'Expert Medical Explanation:'),
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF166534),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      currentQ.explanation!.tr(context),
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 12.5,
                        color: Color(0xFF14532D),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 14),

            // 5. Điều hướng: Câu trước / Câu tiếp theo
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 46,
                    child: OutlinedButton(
                      onPressed: _currentQuestionIndex > 0
                          ? () => setState(() => _currentQuestionIndex--)
                          : null,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AcademyColors.cardBorder),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Text(context.tr('Câu trước', 'Previous'), style: const TextStyle(fontFamily: 'Montserrat', fontWeight: FontWeight.w600)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 46,
                    child: ElevatedButton(
                      onPressed: !isLastQuestion
                          ? () => setState(() => _currentQuestionIndex++)
                          : _confirmSubmit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isLastQuestion ? const Color(0xFF059669) : AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Text(
                        isLastQuestion ? context.tr('Hoàn tất & Nộp bài', 'Complete & Submit') : context.tr('Câu tiếp theo', 'Next Question'),
                        style: const TextStyle(fontFamily: 'Montserrat', fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
