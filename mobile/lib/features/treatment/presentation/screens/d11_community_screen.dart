import 'package:flutter/material.dart';
import '../../../../core/localization/app_translation.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/supabase_data_service.dart';
import '../../../../features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'd10_lymph_examination_screen.dart';

/// Screen D11: Trang Cộng đồng & Tài liệu Y khoa MLD Việt Nam
/// - Tải 100% dữ liệu động từ Supabase (bảng miniapp_shared_content với kind = 'COMMUNITY')
/// - Hỗ trợ xem tài liệu PDF trực tiếp CHỈ ĐỌC (Read-only, không có nút tải về)
/// - Hiển thị ảnh nền, tiêu đề, tác giả và nội dung trích yếu chuyên khoa
class D11CommunityScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const D11CommunityScreen({super.key, this.onBack});

  @override
  State<D11CommunityScreen> createState() => _D11CommunityScreenState();
}

class _D11CommunityScreenState extends State<D11CommunityScreen> {
  final TextEditingController _searchController = TextEditingController();
  final SupabaseDataService _dataService = SupabaseDataService.instance;

  int _selectedCategoryIndex = 0;
  List<String> _categories = ['Tất cả'];
  List<Map<String, dynamic>> _articles = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadArticles();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /// Tải dữ liệu bài viết động từ Supabase
  Future<void> _loadArticles() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final data = await _dataService.fetchCommunityPosts();
      if (!mounted) return;

      final catSet = <String>{'Tất cả'};
      for (final item in data) {
        final cat = item['category']?.toString().trim();
        if (cat != null && cat.isNotEmpty) {
          catSet.add(cat);
        }
      }

      setState(() {
        _articles = data;
        _categories = catSet.toList();
        _isLoading = false;
        if (_selectedCategoryIndex >= _categories.length) {
          _selectedCategoryIndex = 0;
        }
      });
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  List<Map<String, dynamic>> get _filteredArticles {
    final query = _searchController.text.trim().toLowerCase();
    final selectedCat = _categories.isNotEmpty ? _categories[_selectedCategoryIndex] : 'Tất cả';

    return _articles.where((art) {
      final cat = (art['category']?.toString() ?? '').trim();
      final matchesCat = selectedCat == 'Tất cả' || cat == selectedCat;
      if (!matchesCat) return false;

      if (query.isEmpty) return true;
      final title = (art['title']?.toString() ?? '').toLowerCase();
      final summary = (art['summary']?.toString() ?? '').toLowerCase();
      final author = (art['author_name']?.toString() ?? '').toLowerCase();
      return title.contains(query) || summary.contains(query) || author.contains(query);
    }).toList();
  }

  String _formatDate(dynamic dateVal) {
    if (dateVal == null) return '';
    try {
      final dt = DateTime.parse(dateVal.toString()).toLocal();
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return dateVal.toString();
    }
  }

  /// Mở giao diện đọc tài liệu PDF y khoa chuyên sâu (Chỉ đọc, không tải về)
  void _showArticleDetail(Map<String, dynamic> article) {
    final title = (article['title']?.toString() ?? 'Tài liệu Y khoa MLD').tr(context);
    final category = (article['category']?.toString() ?? 'Chuyên môn').tr(context);
    final author = (article['author_name']?.toString() ?? 'Trung tâm MLD Việt Nam').tr(context);
    final date = _formatDate(article['published_at'] ?? article['created_at']);
    final imageUrl = article['image_url']?.toString();
    final fileUrl = article['file_url']?.toString();
    final contentText = article['content_text']?.toString() ?? article['summary']?.toString() ?? '';
    final hasPdf = fileUrl != null && fileUrl.trim().isNotEmpty && fileUrl.contains('.pdf');

    int currentTab = hasPdf ? 0 : 1; // 0: PDF Viewer, 1: Văn bản trích yếu

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return DraggableScrollableSheet(
            initialChildSize: 0.92,
            minChildSize: 0.5,
            maxChildSize: 0.96,
            builder: (_, scrollController) => Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  // Thanh kéo modal
                  Container(
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    width: 44,
                    height: 5,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),

                  // Header: Chuyên mục, Nhãn Chỉ đọc & Nút đóng
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Row(
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
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Nhãn bảo vệ bản quyền: Chỉ đọc
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.lock_outline, size: 12, color: Color(0xFF64748B)),
                              const SizedBox(width: 4),
                              Text(
                                context.tr('Chỉ đọc y khoa', 'Medical Read-Only'),
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close, color: Color(0xFF475569)),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                  ),

                  // Thanh chuyển chế độ đọc nếu bài viết có file PDF
                  if (hasPdf)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () => setModalState(() => currentTab = 0),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  decoration: BoxDecoration(
                                    color: currentTab == 0 ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                    boxShadow: currentTab == 0
                                        ? [
                                            BoxShadow(
                                              color: Colors.black.withValues(alpha: 0.05),
                                              blurRadius: 4,
                                              offset: const Offset(0, 1),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.picture_as_pdf_outlined,
                                        size: 16,
                                        color: currentTab == 0 ? AppColors.primary : const Color(0xFF64748B),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Toàn văn PDF',
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: currentTab == 0 ? FontWeight.w700 : FontWeight.w500,
                                          color: currentTab == 0 ? AppColors.primary : const Color(0xFF64748B),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: GestureDetector(
                                onTap: () => setModalState(() => currentTab = 1),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  decoration: BoxDecoration(
                                    color: currentTab == 1 ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                    boxShadow: currentTab == 1
                                        ? [
                                            BoxShadow(
                                              color: Colors.black.withValues(alpha: 0.05),
                                              blurRadius: 4,
                                              offset: const Offset(0, 1),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.article_outlined,
                                        size: 16,
                                        color: currentTab == 1 ? AppColors.primary : const Color(0xFF64748B),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Trích yếu lâm sàng',
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: currentTab == 1 ? FontWeight.w700 : FontWeight.w500,
                                          color: currentTab == 1 ? AppColors.primary : const Color(0xFF64748B),
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

                  const Divider(height: 1, color: Color(0xFFF1F5F9)),

                  // Nội dung hiển thị bên dưới
                  Expanded(
                    child: currentTab == 0 && hasPdf
                        // TAB 1: TRÌNH XEM NATIVE PDF CHỈ ĐỌC (KHÔNG TẢI VỀ)
                        ? Container(
                            color: const Color(0xFFF8FAFC),
                            child: SfPdfViewer.network(
                              fileUrl,
                              canShowScrollHead: true,
                              canShowScrollStatus: true,
                              canShowPaginationDialog: false,
                              enableDoubleTapZooming: true,
                              onDocumentLoadFailed: (details) {
                                setModalState(() => currentTab = 1);
                              },
                            ),
                          )
                        // TAB 2: VĂN BẢN TRÍCH YẾU LÂM SÀNG & ẢNH NỀN
                        : SingleChildScrollView(
                            controller: scrollController,
                            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Tiêu đề bài viết
                                Text(
                                  title,
                                  style: const TextStyle(
                                    fontFamily: 'Montserrat',
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF1F2937),
                                    height: 1.3,
                                  ),
                                ),
                                const SizedBox(height: 12),

                                // Thông tin tác giả & ngày đăng
                                Row(
                                  children: [
                                    const Icon(Icons.verified, size: 16, color: AppColors.primary),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        '$author${date.isNotEmpty ? ' · $date' : ''}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          color: Color(0xFF475569),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),

                                // Ảnh nền tài liệu
                                if (imageUrl != null && imageUrl.isNotEmpty) ...[
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(16),
                                    child: _buildCoverImage(imageUrl, height: 210),
                                  ),
                                  const SizedBox(height: 20),
                                ],

                                // Toàn văn nội dung bài viết / trích yếu lâm sàng
                                _buildArticleBody(contentText.tr(context)),
                                const SizedBox(height: 28),

                                // Khối đăng ký khám & đặt trị liệu
                                _buildActionBox(ctx),
                              ],
                            ),
                          ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildActionBox(BuildContext modalContext) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F7F7),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.tr('Bạn đang cần tư vấn hoặc gặp tình trạng phù nề?', 'Need consultation or experiencing lymphedema?'),
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1F2937),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            context.tr('Liên hệ chuyên gia hoặc đăng ký kiểm tra phù nề y khoa trực tiếp tại cơ sở MLD Việt Nam.', 'Contact an expert or register for direct medical edema examination at MLD Vietnam.'),
            style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.4),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () {
                    Navigator.pop(modalContext);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D10LymphExaminationScreen()),
                    );
                  },
                  child: Text(context.tr('Khám phù MLD', 'MLD Edema Exam'), style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () {
                    Navigator.pop(modalContext);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const AllInOneBookingScreen()),
                    );
                  },
                  child: Text(context.tr('Đặt trị liệu', 'Book Treatment'), style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCoverImage(String? url, {double height = 185}) {
    if (url != null && url.startsWith('http')) {
      return Image.network(
        url,
        height: height,
        width: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackCover(height),
      );
    }
    if (url != null && url.isNotEmpty) {
      return Image.asset(
        url,
        height: height,
        width: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackCover(height),
      );
    }
    return _buildFallbackCover(height);
  }

  Widget _buildFallbackCover(double height) {
    return Container(
      height: height,
      width: double.infinity,
      color: AppColors.primaryLight,
      child: const Center(
        child: Icon(Icons.menu_book_rounded, size: 48, color: AppColors.primary),
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
                      color: Color(0xFF64748B),
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
                color: Color(0xFF1E293B),
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
                color: Color(0xFF334155),
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

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredArticles;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20, color: Color(0xFF1F2937)),
          onPressed: () {
            if (widget.onBack != null) {
              widget.onBack!();
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: Column(
          children: [
            Text(
              context.tr('Cộng đồng MLD Việt Nam', 'MLD Vietnam Community'),
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1F2937),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              context.tr('Chia sẻ kiến thức & tài liệu PDF chuyên môn', 'Knowledge Sharing & Professional PDF Materials'),
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF475569),
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: _loadArticles,
        color: AppColors.primary,
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Ô tìm kiếm bài viết y khoa
                    Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.search, size: 20, color: Color(0xFF475569)),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              onChanged: (_) => setState(() {}),
                              decoration: InputDecoration(
                                hintText: context.tr('Tìm bài viết, tài liệu y khoa PDF...', 'Search articles, medical PDF materials...'),
                                hintStyle: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
                                border: InputBorder.none,
                                isDense: true,
                              ),
                            ),
                          ),
                          if (_searchController.text.isNotEmpty)
                            IconButton(
                              icon: const Icon(Icons.clear, size: 18, color: Color(0xFF475569)),
                              onPressed: () {
                                _searchController.clear();
                                setState(() {});
                              },
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 2. Thanh lọc danh mục ngang (Động từ database)
                    if (_categories.length > 1) ...[
                      SizedBox(
                        height: 38,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          itemCount: _categories.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (context, index) {
                            final isSelected = _selectedCategoryIndex == index;
                            return ChoiceChip(
                              label: Text(
                                _categories[index].tr(context),
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                                  color: isSelected ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                              selected: isSelected,
                              selectedColor: AppColors.primary,
                              backgroundColor: Colors.white,
                              side: BorderSide(
                                color: isSelected ? AppColors.primary : const Color(0xFFCBD5E1),
                              ),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                              showCheckmark: false,
                              onSelected: (val) {
                                setState(() {
                                  _selectedCategoryIndex = index;
                                });
                              },
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // 3. Danh sách các thẻ bài viết tài liệu
                    if (filtered.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 40),
                        alignment: Alignment.center,
                        child: Column(
                          children: [
                            const Icon(Icons.menu_book_outlined, size: 48, color: Color(0xFFCBD5E1)),
                            const SizedBox(height: 12),
                            Text(
                              context.tr('Không tìm thấy bài viết hoặc tài liệu phù hợp', 'No matching articles or documents found'),
                              style: const TextStyle(fontSize: 14, color: Color(0xFF475569)),
                            ),
                            const SizedBox(height: 12),
                            TextButton.icon(
                              onPressed: _loadArticles,
                              icon: const Icon(Icons.refresh, size: 18, color: AppColors.primary),
                              label: Text(context.tr('Tải lại dữ liệu', 'Reload Data'), style: const TextStyle(color: AppColors.primary)),
                            ),
                          ],
                        ),
                      )
                    else
                      ...filtered.map((article) => _buildArticleCard(article)),
                  ],
                ),
              ),
      ),
    );
  }

  /// Card bài viết tài liệu trị liệu:
  /// - Thẻ trắng, góc bo tròn, viền tinh tế
  /// - Ảnh nền tài liệu bo góc ở phía trên
  /// - Tiêu đề in đậm (Bold)
  /// - Huy hiệu nhãn PDF chuyên sâu nếu có file_url
  /// - Hoàn toàn không có nút Like, không bình luận, không tải về
  Widget _buildArticleCard(Map<String, dynamic> article) {
    final title = (article['title']?.toString() ?? '').tr(context);
    final imageUrl = article['image_url']?.toString();
    final fileUrl = article['file_url']?.toString();
    final hasPdf = fileUrl != null && fileUrl.trim().isNotEmpty && fileUrl.contains('.pdf');
    final author = (article['author_name']?.toString() ?? 'MLD Việt Nam').tr(context);
    final date = _formatDate(article['published_at'] ?? article['created_at']);

    return InkWell(
      onTap: () => _showArticleDetail(article),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Ảnh nền tài liệu (Bo tròn r=12) kèm Huy hiệu PDF
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: _buildCoverImage(imageUrl, height: 185),
                ),
                if (hasPdf)
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.72),
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.2),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.picture_as_pdf, size: 14, color: Colors.white),
                          SizedBox(width: 5),
                          Text(
                            'Tài liệu PDF',
                            style: TextStyle(
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
            const SizedBox(height: 12),

            // 2. Tiêu đề bài viết
            Text(
              title,
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
                height: 1.35,
              ),
            ),

            const SizedBox(height: 8),

            // 3. Tác giả & Ngày đăng
            Row(
              children: [
                const Icon(Icons.person_outline, size: 14, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    author,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF64748B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (date.isNotEmpty)
                  Text(
                    date,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
