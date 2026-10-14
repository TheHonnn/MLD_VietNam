import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/treatment_models.dart';
import '../../data/repositories/mock_treatment_repository.dart';

class D06HomeCareGuidelinesScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const D06HomeCareGuidelinesScreen({
    super.key,
    this.onBack,
  });

  @override
  State<D06HomeCareGuidelinesScreen> createState() => _D06HomeCareGuidelinesScreenState();
}

class _D06HomeCareGuidelinesScreenState extends State<D06HomeCareGuidelinesScreen> {
  final MockTreatmentRepository _repo = MockTreatmentRepository();

  final List<String> _categories = [
    'Chăm sóc cơ thể.',
    'Chăm sóc da.',
    'Thư giãn.',
    'Dinh dưỡng & sinh hoạt.',
    'Kiến thức sức khỏe.',
  ];

  String _selectedCategory = 'Chăm sóc cơ thể.';

  void _showArticleDetail(HomeCareArticleModel article) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        builder: (_, scrollController) {
          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: ListView(
              controller: scrollController,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE3D1BF),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  article.category.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF985018),
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  article.title,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF693B20),
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${article.readTimeText} · ${article.authorText}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: Color(0xFF6B6158),
                  ),
                ),
                const SizedBox(height: 16),
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.asset(
                    article.imageUrl,
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 200,
                      color: const Color(0xFFF3E2CE),
                      child: const Icon(Icons.spa, color: Color(0xFF985018), size: 48),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  article.summary,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF40352F),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  '1. Uống nhiều nước ấm sau trị liệu để kích thích đào thải độc tố tự nhiên.\n\n'
                  '2. Tránh tắm nước quá lạnh ngay sau massage hoặc vận động mạnh trong 4-6 giờ đầu.\n\n'
                  '3. Giữ tinh thần thư giãn, ngủ đủ giấc để các nhóm cơ được hồi phục toàn diện.',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: Color(0xFF40352F),
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8F1E8),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE3D1BF)),
                  ),
                  child: const Text(
                    'Lưu ý: Hướng dẫn chăm sóc mang tính hỗ trợ phục hồi sức khỏe tổng quát, không thay thế cho chỉ định y khoa điều trị bệnh lý chuyên khoa.',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: Color(0xFF6B6158),
                      height: 1.4,
                    ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final articles = _repo.getGuidelineArticles();
    final featuredArticle = articles.isNotEmpty ? articles[0] : null;

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
                              border: Border.all(color: const Color(0xFFE3D1BF), width: 1.0),
                            ),
                            child: const Icon(
                              Icons.arrow_back,
                              color: Color(0xFF40352F),
                              size: 20,
                            ),
                          ),
                        ),
                        const Text(
                          'CHĂM SÓC · MINH HỌA',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: Color(0xFF985018),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Tiêu đề H1
                    const Text(
                      'Hướng dẫn chăm sóc tại nhà',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF693B20),
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Những hướng dẫn hữu ích giúp duy trì thói quen chăm sóc bản thân.',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: Color(0xFF6B6158),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // --- 2. THẺ BÀI VIẾT NỔI BẬT (WellnessArticleCard / 01) ---
                    InkWell(
                      onTap: () {
                        if (featuredArticle != null) {
                          _showArticleDetail(featuredArticle);
                        }
                      },
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3E2CE),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Image.asset(
                              'assets/images/gioithieu_1.png',
                              width: double.infinity,
                              height: 192,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                width: double.infinity,
                                height: 192,
                                color: const Color(0xFFE3D1BF),
                                child: const Icon(Icons.spa, color: Color(0xFF985018), size: 48),
                              ),
                            ),
                            const Padding(
                              padding: EdgeInsets.all(20.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'CHĂM SÓC CƠ THỂ · Bài viết · 4 phút',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w400,
                                      color: Color(0xFF985018),
                                    ),
                                  ),
                                  SizedBox(height: 8),
                                  Text(
                                    'Chăm sóc cơ thể sau buổi massage',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF693B20),
                                    ),
                                  ),
                                  SizedBox(height: 8),
                                  Text(
                                    'Nghỉ ngơi thoải mái, vận động nhẹ và giữ nhịp sinh hoạt phù hợp.',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w400,
                                      color: Color(0xFF40352F),
                                      height: 1.4,
                                    ),
                                  ),
                                  SizedBox(height: 12),
                                  Text(
                                    'Ban nội dung · Gợi ý minh họa',
                                    style: TextStyle(
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
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Lời nhắc miễn trừ
                    const Text(
                      'Hướng dẫn chăm sóc chung, không phải chẩn đoán hoặc lời khuyên điều trị.',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: Color(0xFF6B6158),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // --- 3. BỘ LỌC DANH MỤC NGANG ---
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _categories.map((cat) {
                          final isSelected = _selectedCategory == cat;
                          return Padding(
                            padding: const EdgeInsets.only(right: 10.0),
                            child: InkWell(
                              onTap: () {
                                setState(() {
                                  _selectedCategory = cat;
                                });
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                height: 44,
                                padding: const EdgeInsets.symmetric(horizontal: 18),
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: isSelected ? const Color(0xFF985018) : Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isSelected ? const Color(0xFF985018) : const Color(0xFFE3D1BF),
                                    width: 1.0,
                                  ),
                                ),
                                child: Text(
                                  cat,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w400,
                                    color: isSelected ? Colors.white : const Color(0xFF40352F),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // --- 4. GÓC CHĂM SÓC MỖI NGÀY ---
                    const Text(
                      'Góc chăm sóc mỗi ngày',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF693B20),
                      ),
                    ),
                    const SizedBox(height: 14),

                    ...articles.map((art) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14.0),
                        child: InkWell(
                          onTap: () => _showArticleDetail(art),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFFE3D1BF), width: 1.0),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(12),
                                      child: Stack(
                                        children: [
                                          Image.asset(
                                            art.imageUrl,
                                            width: 88,
                                            height: 104,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => Container(
                                              width: 88,
                                              height: 104,
                                              color: const Color(0xFFF3E2CE),
                                              child: const Icon(Icons.article, color: Color(0xFF985018)),
                                            ),
                                          ),
                                          if (art.isVideo)
                                            Positioned.fill(
                                              child: Container(
                                                color: Colors.black26,
                                                child: const Icon(
                                                  Icons.play_circle_fill,
                                                  color: Colors.white,
                                                  size: 32,
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            art.readTimeText,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w400,
                                              color: Color(0xFF985018),
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            art.title,
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                              color: Color(0xFF40352F),
                                              height: 1.3,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  art.summary,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w400,
                                    color: Color(0xFF40352F),
                                    height: 1.4,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  art.authorText,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w400,
                                    color: Color(0xFF6B6158),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),

                    const SizedBox(height: 14),

                    // --- 5. DÀNH RIÊNG CHO BẠN ---
                    const Text(
                      'Dành riêng cho bạn',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF693B20),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3E2CE),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Gợi ý theo nhật ký massage · Buổi 04',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: Color(0xFF985018),
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Một khoảng nghỉ trước buổi chăm sóc tiếp theo',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF40352F),
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Dành vài phút thư giãn trong không gian yên tĩnh. Chọn vận động nhẹ khi cảm thấy thoải mái.',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              color: Color(0xFF40352F),
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 16),
                          InkWell(
                            onTap: () {
                              if (articles.isNotEmpty) {
                                _showArticleDetail(articles.last);
                              }
                            },
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              width: double.infinity,
                              height: 44,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: Colors.transparent,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Text(
                                'Xem hướng dẫn',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF985018),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // --- 6. HÀNH ĐỘNG CỐ ĐỊNH (FIXED BOTTOM ACTION BAR) ---
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: Color(0xFFE3D1BF), width: 1.0),
                ),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () {
                    if (articles.isNotEmpty) {
                      _showArticleDetail(articles[0]);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF985018),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Xem hướng dẫn',
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
}
