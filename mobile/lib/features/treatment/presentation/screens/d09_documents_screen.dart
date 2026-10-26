import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import 'd11_community_screen.dart';

/// Screen D09: Trang Tài liệu & Cẩm nang Y khoa MLD
/// Đáp ứng các yêu cầu:
/// 112. Giao diện chính gồm: Trang chủ, Dịch vụ, Đào tạo, Tài liệu, Cá nhân
/// 118. Thêm trang / mục Cộng đồng riêng
/// 119. Thêm trang Tài liệu
/// 120. Cho phép người dùng xem các tài liệu được chia sẻ
/// 128. Bảng màu chuẩn Trắng và Xanh Y tế (#0066B2)
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
  String _selectedCategory = 'Tất cả';

  final List<String> _categories = [
    'Tất cả',
    'Phù bạch huyết & MLD',
    'Cẩm nang trị liệu',
    'Tài liệu đào tạo',
    'Cộng đồng chia sẻ',
  ];

  late List<Map<String, dynamic>> _allDocuments;

  @override
  void initState() {
    super.initState();
    _initDocuments();
  }

  void _initDocuments() {
    _allDocuments = [
      {
        'id': 'doc-01',
        'image': 'assets/images/document_joint_pain_banner.png',
        'title': 'Nghiên cứu lâm sàng: Hiệu quả của Dẫn lưu bạch huyết bằng tay (MLD) trong hỗ trợ điều trị phù nề sau phẫu thuật',
        'category': 'Phù bạch huyết & MLD',
        'readTime': '8 phút đọc',
        'author': 'Hội đồng Y khoa đồng hành MLD Vietnam',
        'summary': 'Tổng quan cơ chế sinh lý của hệ bạch huyết, bằng chứng y học về giảm sưng phù và tăng tốc độ lành thương sau phẫu thuật can thiệp mô mềm.',
        'isPdf': true,
        'pdfSize': '2.4 MB',
        'icon': Icons.picture_as_pdf_outlined,
        'date': '15/10/2026',
      },
      {
        'id': 'doc-02',
        'image': 'assets/images/course_banner_clean.png',
        'title': 'Cẩm nang hướng dẫn tự chăm sóc và bảo dưỡng hệ bạch huyết tại nhà',
        'category': 'Cẩm nang trị liệu',
        'readTime': '5 phút đọc',
        'author': 'Chuyên gia Trị liệu MLD Vietnam',
        'summary': 'Nguyên tắc uống nước ấm, bài tập thở cơ hoành kích thích bể dưỡng chấp (Cisterna Chyli) và tư thế nằm gác chân hỗ trợ lưu thông bạch huyết.',
        'isPdf': false,
        'pdfSize': '',
        'icon': Icons.menu_book_outlined,
        'date': '10/10/2026',
      },
      {
        'id': 'doc-03',
        'image': 'assets/images/banner.webp',
        'title': 'Phác đồ kỹ thuật dẫn lưu bạch huyết chuyên sâu theo phương pháp Vodder chuẩn hóa',
        'category': 'Tài liệu đào tạo',
        'readTime': '12 phút đọc',
        'author': 'Học viện Đào tạo MLD Academy',
        'summary': 'Tài liệu hướng dẫn thực hành nguyên lý áp lực nhẹ (<30 mmHg), nhịp điệu chuyển động xoay tròn và định hướng dòng chảy hạch bạch huyết.',
        'isPdf': true,
        'pdfSize': '4.1 MB',
        'icon': Icons.picture_as_pdf_outlined,
        'date': '05/10/2026',
      },
      {
        'id': 'doc-04',
        'image': 'assets/images/course_banner_clean.png',
        'title': 'Nhận diện sớm các dấu hiệu phù bạch huyết (Lymphedema) và thời điểm vàng can thiệp',
        'category': 'Phù bạch huyết & MLD',
        'readTime': '6 phút đọc',
        'author': 'Bác sĩ Cố vấn Chuyên môn MLD',
        'summary': 'Phân độ phù bạch huyết từ giai đoạn tiềm ẩn đến giai đoạn xơ hóa; cách đo chu vi chi và kiểm tra dấu hiệu Stemmer sign.',
        'isPdf': false,
        'pdfSize': '',
        'icon': Icons.medical_information_outlined,
        'date': '28/09/2026',
      },
      {
        'id': 'doc-05',
        'image': 'assets/images/document_joint_pain_banner.png',
        'title': 'Chia sẻ trải nghiệm hồi phục thần tốc sau phẫu thuật nâng ngực & hút mỡ bụng',
        'category': 'Cộng đồng chia sẻ',
        'readTime': '4 phút đọc',
        'author': 'Thành viên Cộng đồng Khách hàng MLD',
        'summary': 'Nhật ký 7 ngày giảm bầm tím và tiêu dịch ứ đọng rõ rệt ngay sau ca trị liệu MLD thứ hai tại cơ sở Quận 3.',
        'isPdf': false,
        'pdfSize': '',
        'icon': Icons.forum_outlined,
        'date': '20/09/2026',
      },
      {
        'id': 'doc-06',
        'image': 'assets/images/course_banner_clean.png',
        'title': 'Quy trình đối soát và kiểm tra phù bạch huyết định kỳ tại trung tâm',
        'category': 'Tài liệu đào tạo',
        'readTime': '7 phút đọc',
        'author': 'Hệ thống Quản lý Chất lượng MLD',
        'summary': 'Bảng kiểm 10 bước chuẩn y khoa tiếp nhận khách hàng, đánh giá chỉ số dịch mô và lưu trữ hồ sơ theo dõi liệu trình.',
        'isPdf': true,
        'pdfSize': '1.8 MB',
        'icon': Icons.picture_as_pdf_outlined,
        'date': '12/09/2026',
      },
    ];
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredDocuments {
    final query = _searchController.text.trim().toLowerCase();
    return _allDocuments.where((doc) {
      final matchesCategory = _selectedCategory == 'Tất cả' || doc['category'] == _selectedCategory;
      final matchesQuery = query.isEmpty ||
          (doc['title'] as String).toLowerCase().contains(query) ||
          (doc['summary'] as String).toLowerCase().contains(query) ||
          (doc['author'] as String).toLowerCase().contains(query);
      return matchesCategory && matchesQuery;
    }).toList();
  }

  void _showDocumentDetail(Map<String, dynamic> doc) {
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
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      (doc['category'] as String).toUpperCase(),
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    doc['date'] as String,
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                doc['title'] as String,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${doc['readTime']} · ${doc['author']}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 16),
              const Divider(color: AppColors.border),
              const SizedBox(height: 16),
              Text(
                doc['summary'] as String,
                style: const TextStyle(
                  fontSize: 15.5,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                  height: 1.6,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSecondary,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.verified_user_outlined, color: AppColors.primary, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Tài liệu chuẩn Y khoa MLD Vietnam',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primaryDark,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Tài liệu này được biên soạn và kiểm chứng theo tiêu chuẩn Dẫn lưu bạch huyết y khoa quốc tế (MLD Vodder Method). Mục đích cung cấp kiến thức chuẩn xác, hỗ trợ học viên và khách hàng trong quá trình phục hồi sức khỏe an toàn.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textPrimary,
                        height: 1.5,
                      ),
                    ),
                    if (doc['isPdf'] == true) ...[
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          ElevatedButton.icon(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Đang tải xuống tệp PDF: ${doc['title']} (${doc['pdfSize']})...'),
                                  backgroundColor: AppColors.primary,
                                ),
                              );
                            },
                            icon: const Icon(Icons.download_rounded, size: 18),
                            label: Text('Tải bản PDF (${doc['pdfSize']})'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              elevation: 0,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 32),
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
        title: const Text(
          'Tài liệu & Y khoa MLD',
          style: TextStyle(
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
        actions: [
          IconButton(
            icon: const Icon(Icons.forum_outlined, color: AppColors.primary),
            tooltip: 'Cộng đồng MLD',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const D11CommunityScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Ô tìm kiếm tài liệu & cẩm nang
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Tìm tài liệu, nghiên cứu lâm sàng, bài viết...',
                    hintStyle: const TextStyle(fontSize: 14, color: AppColors.textPlaceholder),
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
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? AppColors.primary : AppColors.border,
                        ),
                      ),
                      child: Text(
                        cat,
                        style: TextStyle(
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

            // Danh sách tài liệu
            Expanded(
              child: filtered.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.find_in_page_outlined, size: 64, color: AppColors.border),
                          SizedBox(height: 12),
                          Text(
                            'Không tìm thấy tài liệu phù hợp',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Vui lòng thử từ khóa khác hoặc chọn danh mục khác',
                            style: TextStyle(fontSize: 13, color: AppColors.textPlaceholder),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final doc = filtered[index];
                        return InkWell(
                          onTap: () => _showDocumentDetail(doc),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.border),
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
                                // 1. Ảnh tài liệu
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.asset(
                                    doc['image'] as String? ?? 'assets/images/course_banner_clean.png',
                                    height: 185,
                                    width: double.infinity,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      height: 185,
                                      width: double.infinity,
                                      color: const Color(0xFFE8F5F1),
                                      child: const Center(
                                        child: Icon(Icons.menu_book_rounded, size: 48, color: Color(0xFF168477)),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 12),

                                // 2. Tên tài liệu (chỉ có tên tài liệu, không nội dung bên dưới)
                                Text(
                                  doc['title'] as String,
                                  style: const TextStyle(
                                    fontFamily: 'Montserrat',
                                    fontSize: 17,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0F172A),
                                    height: 1.35,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
