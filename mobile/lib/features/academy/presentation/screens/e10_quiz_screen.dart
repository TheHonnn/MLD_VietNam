import 'package:flutter/material.dart';
import '../widgets/academy_widgets.dart';

/// Screen E10: Kiểm tra kiến thức (Quiz Assessment) [8116:26228]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
class E10QuizScreen extends StatefulWidget {
  const E10QuizScreen({super.key});

  @override
  State<E10QuizScreen> createState() => _E10QuizScreenState();
}

class _E10QuizScreenState extends State<E10QuizScreen> {
  int _currentQuestionIndex = 2; // Câu 3 / 20 chuẩn Figma
  int _selectedOption = 0; // A đang chọn chuẩn Figma

  final List<String> _options = [
    'A. Kiểm tra thông tin và nhu cầu khách hàng.',
    'B. Chuẩn bị chương trình ưu đãi.',
    'C. Giới thiệu thêm sản phẩm.',
    'D. Yêu cầu khách hàng thanh toán ngay.',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        subtitleTag: 'Bài kiểm tra minh họa',
      ),
      bottomNavigationBar: AcademyFixedBottomBar(
        summaryText: 'Bài làm hiện tại · Chưa nộp, chưa chấm điểm',
        buttonText: 'Nộp bài',
        onPressed: () {
          _showSubmitDialog(context);
        },
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Tiêu đề trang [8116:26233]
            const Text(
              'Kiểm tra kiến thức',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 16),

            // 2. Thông tin kiểm tra [8116:26236]
            const Text(
              'Kỹ thuật Massage Chuyên Nghiệp',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AcademyColors.primary,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Bài kiểm tra: Kiến thức Spa cơ bản',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 12),

            // Hàng tiến trình câu hỏi + Thời gian
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Câu ${_currentQuestionIndex + 1} / 20',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AcademyColors.primary,
                  ),
                ),
                Row(
                  children: const [
                    Icon(Icons.access_time, color: AcademyColors.primary, size: 18),
                    SizedBox(width: 6),
                    Text(
                      '18:45',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 4),
            const Text(
              'Thời gian tĩnh · Không đếm ngược',
              style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
            ),
            const SizedBox(height: 8),

            // Thanh tiến trình
            ClipRRect(
              borderRadius: BorderRadius.circular(2),
              child: LinearProgressIndicator(
                value: (_currentQuestionIndex + 1) / 20,
                minHeight: 4,
                backgroundColor: AcademyColors.cardBorder,
                valueColor: const AlwaysStoppedAnimation<Color>(AcademyColors.primary),
              ),
            ),
            const SizedBox(height: 20),

            // 3. QuizQuestionCard / 01 [8116:26245]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'Chọn một đáp án phù hợp nhất',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AcademyColors.primary,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Yếu tố nào cần được ưu tiên trước khi thực hiện dịch vụ chăm sóc khách hàng?',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 4. Các đáp án [8116:26248]
            ...List.generate(_options.length, (index) {
              final isSelected = _selectedOption == index;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  onTap: () => setState(() => _selectedOption = index),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isSelected ? AcademyColors.cardWarm : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? AcademyColors.primary : AcademyColors.cardBorder,
                        width: isSelected ? 1.5 : 1.0,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isSelected ? AcademyColors.primary : AcademyColors.cardBorder,
                              width: 2,
                            ),
                          ),
                          child: isSelected
                              ? Center(
                                  child: Container(
                                    width: 12,
                                    height: 12,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: AcademyColors.primary,
                                    ),
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Text(
                            _options[index],
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
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
            const SizedBox(height: 4),
            const Text(
              'Đáp án A đang được chọn, chưa xác định đúng hoặc sai.',
              style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
            ),
            const SizedBox(height: 20),

            // 5. Điều hướng câu hỏi: Câu trước / Câu tiếp theo [8116:26262]
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 56,
                    child: OutlinedButton(
                      onPressed: _currentQuestionIndex > 0
                          ? () => setState(() => _currentQuestionIndex--)
                          : null,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AcademyColors.primary, width: 1.2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Câu trước',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AcademyColors.primary,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 56,
                    child: OutlinedButton(
                      onPressed: _currentQuestionIndex < 19
                          ? () => setState(() => _currentQuestionIndex++)
                          : null,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AcademyColors.primary, width: 1.2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Câu tiếp theo',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AcademyColors.primary,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // 6. AssessmentScoreCard / 01 (Kết quả lần làm trước) [8116:26267]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Kết quả lần làm trước — minh họa',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const Text(
                        '8.5/10',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          color: AcademyColors.primary,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            '17 / 20 câu đúng',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AcademyColors.textPrimary,
                            ),
                          ),
                          Text(
                            'Thời gian làm: 14 phút',
                            style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Bạn nắm tốt quy trình; hãy ôn lại nội dung an toàn và vệ sinh.',
                    style: TextStyle(fontSize: 13, color: AcademyColors.textPrimary, height: 1.4),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Nhận xét của giảng viên · Không phải kết quả bài đang làm.',
                    style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSubmitDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: const BoxDecoration(
                color: AcademyColors.cardWarm,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_outline, color: AcademyColors.primary, size: 36),
            ),
            const SizedBox(height: 16),
            const Text(
              'Xác nhận nộp bài',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AcademyColors.heading),
            ),
            const SizedBox(height: 8),
            const Text(
              'Bạn đã trả lời 20/20 câu hỏi. Bạn có chắc chắn muốn nộp bài để xem kết quả đánh giá?',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Xem lại', style: TextStyle(color: AcademyColors.textSecondary)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Đã nộp bài kiểm tra thành công! Điểm số: 9.0/10')),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AcademyColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Nộp bài'),
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
