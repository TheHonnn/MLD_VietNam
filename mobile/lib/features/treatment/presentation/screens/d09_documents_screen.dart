import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/services/supabase_data_service.dart';
import 'd11_community_screen.dart';

/// Screen D09: Trang Tài liệu & Cẩm nang Y khoa MLD
/// Tối giản giao diện - Tải 100% dữ liệu thực từ Database (home_care_guidelines)
/// Thiết kế thẻ: Chỉ có ảnh và tên tài liệu, không có văn bản thừa bên dưới.
/// Bo viền vuông tròn nhẹ 8px, đồng bộ phông chữ 100% Montserrat
class D09DocumentsScreen extends StatefulWidget {
  final VoidCallback? onBackToHome;

  const D09DocumentsScreen({
    super.key,
    this.onBackToHome,
  });

  @override
  State<D09DocumentsScreen> createState() => _D09DocumentsScreenState();
}

class _D09DocumentsScreenState extends State<D09DocumentsScreen> {
  final TextEditingController _searchController = TextEditingController();
  final SupabaseDataService _dataService = SupabaseDataService.instance;

  String _selectedCategory = 'Tất cả';
  List<String> _categories = ['Tất cả'];
  List<Map<String, dynamic>> _allDocuments = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /// Tải danh sách tài liệu thực tế từ Database Supabase
  Future<void> _loadDocuments() async {
    setState(() => _isLoading = true);
    try {
      final docs = await _dataService.fetchDocuments();
      if (!mounted) return;

      final categoriesSet = <String>{'Tất cả'};
      for (final doc in docs) {
        final cat = doc['category'] as String?;
        if (cat != null && cat.trim().isNotEmpty) {
          categoriesSet.add(cat.trim());
        }
      }

      setState(() {
        _allDocuments = docs;
        _categories = categoriesSet.toList();
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _allDocuments = [];
          _isLoading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> get _filteredDocuments {
    final query = _searchController.text.trim().toLowerCase();
    return _allDocuments.where((doc) {
      final category = (doc['category'] as String? ?? '').trim();
      final matchesCategory = _selectedCategory == 'Tất cả' || category == _selectedCategory;
      if (!matchesCategory) return false;

      if (query.isEmpty) return true;
      final title = (doc['title'] as String? ?? '').toLowerCase();
      final summary = (doc['summary'] as String? ?? '').toLowerCase();
      final author = (doc['author_name'] as String? ?? '').toLowerCase();
      return title.contains(query) || summary.contains(query) || author.contains(query);
    }).toList();
  }

  String _formatDate(dynamic dateVal) {
    if (dateVal == null) return '';
    if (dateVal is DateTime) {
      return '${dateVal.day.toString().padLeft(2, '0')}/${dateVal.month.toString().padLeft(2, '0')}/${dateVal.year}';
    }
    final dt = DateTime.tryParse(dateVal.toString());
    if (dt != null) {
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    }
    return dateVal.toString();
  }

  Widget _buildDocImage(String? imagePath, {double height = 185}) {
    if (imagePath == null || imagePath.isEmpty) {
      return Container(
        height: height,
        width: double.infinity,
        color: AppColors.primaryLight,
        child: const Center(
          child: Icon(Icons.menu_book_rounded, size: 48, color: AppColors.primary),
        ),
      );
    }
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return Image.network(
        imagePath,
        height: height,
        width: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          height: height,
          width: double.infinity,
          color: AppColors.primaryLight,
          child: const Center(
            child: Icon(Icons.menu_book_rounded, size: 48, color: AppColors.primary),
          ),
        ),
      );
    }
    return Image.asset(
      imagePath,
      height: height,
      width: double.infinity,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(
        height: height,
        width: double.infinity,
        color: AppColors.primaryLight,
        child: const Center(
          child: Icon(Icons.menu_book_rounded, size: 48, color: AppColors.primary),
        ),
      ),
    );
  }

  Widget _buildArticleBody(String fullText) {
    if (fullText.trim().isEmpty) return const SizedBox.shrink();
    final paragraphs = fullText.split('\n\n');
    final widgets = <Widget>[];

    for (final p in paragraphs) {
      final trimmed = p.trim();
      if (trimmed.isEmpty) continue;

      // Kiểm tra cú pháp ảnh Markdown: ![caption](url)
      final imgMatch = RegExp(r'^!\[(.*?)\]\((.*?)\)').firstMatch(trimmed);
      if (imgMatch != null) {
        final caption = imgMatch.group(1) ?? '';
        final url = imgMatch.group(2) ?? '';
        widgets.add(
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    url,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                  ),
                ),
                if (caption.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    caption,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 12,
                      fontStyle: FontStyle.italic,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
        continue;
      }

      // Kiểm tra tiêu đề đề mục y khoa
      final isHeading = RegExp(r'^(\d+\.\s+|KHI NÀO|KẾT LUẬN|TÀI LIỆU)').hasMatch(trimmed);
      if (isHeading) {
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 16, bottom: 8),
            child: Text(
              trimmed,
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
                height: 1.4,
              ),
            ),
          ),
        );
      } else {
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              trimmed,
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 14.5,
                fontWeight: FontWeight.w400,
                color: AppColors.textPrimary,
                height: 1.65,
              ),
            ),
          ),
        );
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: widgets,
    );
  }

  void _showDocumentDetail(Map<String, dynamic> doc) {
    final rawTitle = doc['title'] as String? ?? '';
    final title = context.tr(rawTitle);
    final rawCategory = doc['category'] as String? ?? 'Tài liệu Y khoa';
    final category = context.tr(rawCategory);
    final date = _formatDate(doc['created_at']);
    final readTime = '${doc['read_time_minutes'] ?? 5} ${context.tr('phút đọc', 'mins read')}';
    final rawAuthor = doc['author_name'] as String? ?? 'Hội đồng Y khoa MLD';
    final author = context.tr(rawAuthor);
    final summary = context.tr(doc['summary'] as String? ?? '');
    final content = context.tr(doc['content'] as String? ?? '');
    final imageUrl = doc['image_url'] as String?;
    final steps = doc['steps'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        builder: (_, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: ListView(
            controller: scrollController,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Banner ảnh trong chi tiết
              if (imageUrl != null && imageUrl.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: _buildDocImage(imageUrl, height: 200),
                ),
                const SizedBox(height: 16),
              ],

              // Danh mục & Ngày
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      category.toUpperCase(),
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (date.isNotEmpty)
                    Text(
                      date,
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // Tiêu đề
              Text(
                title,
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 8),

              // Tác giả & Thời gian đọc
              Text(
                '$readTime · $author',
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 16),
              const Divider(color: AppColors.border),
              const SizedBox(height: 16),

              // Tóm tắt y khoa
              if (summary.isNotEmpty) ...[
                Text(
                  summary,
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 15.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Nội dung chi tiết
              if (content.isNotEmpty && content != summary) ...[
                _buildArticleBody(content),
                const SizedBox(height: 20),
              ],

              // Các bước hướng dẫn nếu có (JSONB)
              if (steps is List && steps.isNotEmpty) ...[
                const Text(
                  'Các bước thực hiện chuẩn hóa:',
                  style: TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 12),
                ...steps.asMap().entries.map((entry) {
                  final idx = entry.key + 1;
                  final stepItem = entry.value;
                  String stepTitle = '';
                  String stepDesc = '';
                  if (stepItem is Map) {
                    stepTitle = stepItem['title']?.toString() ?? '';
                    stepDesc = stepItem['desc']?.toString() ?? stepItem['description']?.toString() ?? '';
                  } else {
                    stepDesc = stepItem.toString();
                  }
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceSecondary,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CircleAvatar(
                          radius: 12,
                          backgroundColor: AppColors.primary,
                          child: Text(
                            '$idx',
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 11,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (stepTitle.isNotEmpty)
                                Text(
                                  stepTitle,
                                  style: const TextStyle(
                                    fontFamily: 'Montserrat',
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textHeading,
                                  ),
                                ),
                              if (stepDesc.isNotEmpty)
                                Text(
                                  stepDesc,
                                  style: const TextStyle(
                                    fontFamily: 'Montserrat',
                                    fontSize: 13,
                                    color: AppColors.textPrimary,
                                    height: 1.4,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 16),
              ],


            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredDocuments;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          context.tr('Tài liệu & Y khoa MLD', 'Documents & Medical MLD'),
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textHeading,
          ),
        ),
        centerTitle: false,
        leading: widget.onBackToHome != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
                onPressed: widget.onBackToHome,
              )
            : null,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Ô tìm kiếm tài liệu
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                  decoration: InputDecoration(
                    hintText: context.tr('Tìm tài liệu, nghiên cứu lâm sàng, bài viết...', 'Search documents, clinical studies, articles...'),
                    hintStyle: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 14,
                      color: AppColors.textPlaceholder,
                    ),
                    prefixIcon: const Icon(Icons.search, color: AppColors.primary, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18, color: AppColors.textSecondary),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
            ),

            // Thanh lọc danh mục ngang
            if (_categories.length > 1) ...[
              Container(
                color: Colors.white,
                height: 48,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  scrollDirection: Axis.horizontal,
                  itemCount: _categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    final isSelected = cat == _selectedCategory;
                    return InkWell(
                      onTap: () => setState(() => _selectedCategory = cat),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary : AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : AppColors.border,
                          ),
                        ),
                        child: Text(
                          cat.tr(context),
                          style: TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 13.5,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected ? Colors.white : AppColors.textSecondary,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const Divider(height: 1, color: AppColors.border),
            ],

            // Danh sách tài liệu (RefreshIndicator hỗ trợ kéo để làm mới)
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.primary),
                    )
                  : RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: _loadDocuments,
                      child: filtered.isEmpty
                          ? ListView(
                              children: [
                                const SizedBox(height: 100),
                                Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.find_in_page_outlined, size: 64, color: AppColors.border),
                                      const SizedBox(height: 12),
                                      Text(
                                        context.tr('Không tìm thấy tài liệu phù hợp', 'No matching documents found'),
                                        style: const TextStyle(
                                          fontFamily: 'Montserrat',
                                          fontSize: 15,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        context.tr('Vui lòng thử từ khóa khác hoặc chọn danh mục khác', 'Please try another keyword or category'),
                                        style: const TextStyle(
                                          fontFamily: 'Montserrat',
                                          fontSize: 13,
                                          color: AppColors.textPlaceholder,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                              itemCount: filtered.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 14),
                              itemBuilder: (context, index) {
                                final doc = filtered[index];
                                final imageUrl = doc['image_url'] as String?;
                                final title = doc['title'] as String? ?? '';

                                return InkWell(
                                  onTap: () => _showDocumentDetail(doc),
                                  borderRadius: BorderRadius.circular(8),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: AppColors.border),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.04),
                                          blurRadius: 8,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // 1. Ảnh tài liệu
                                        ClipRRect(
                                          borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                                          child: _buildDocImage(imageUrl, height: 185),
                                        ),

                                        // 2. Tên tài liệu (chỉ có tên tài liệu, không nội dung bên dưới)
                                        Padding(
                                          padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                                          child: Text(
                                            title.tr(context),
                                            style: const TextStyle(
                                              fontFamily: 'Montserrat',
                                              fontSize: 17,
                                              fontWeight: FontWeight.w700,
                                              color: Color(0xFF0F172A),
                                              height: 1.35,
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
          ],
        ),
      ),
    );
  }
}
