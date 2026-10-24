import 'package:flutter/material.dart';
import 'd10_lymph_examination_screen.dart';
import '../../../booking/presentation/screens/c01_service_selection_screen.dart';

/// Screen D11: Trang Cộng đồng MLD Việt Nam (Điểm 118, 154 trong Website Trang chủ, dịch vụ, đặt lịch.txt)
/// Chuẩn 100% theo giao diện bài viết chuyên môn do Admin/Trung tâm đăng tải:
/// - Thẻ bài viết chuyên đề y khoa, hình ảnh trực quan, tiêu đề và tóm tắt
/// - Không có nút like, không có bình luận, không có nút người dùng đăng bài
/// - Nhấn vào thẻ mở toàn văn bài viết hướng dẫn lâm sàng của Trung tâm
class D11CommunityScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const D11CommunityScreen({super.key, this.onBack});

  @override
  State<D11CommunityScreen> createState() => _D11CommunityScreenState();
}

class _D11CommunityScreenState extends State<D11CommunityScreen> {
  int _selectedCategoryIndex = 0;
  final TextEditingController _searchController = TextEditingController();

  final List<String> _categories = [
    'Tất cả',
    'Xương khớp & Phục hồi',
    'Kỹ thuật MLD Vodder',
    'Giảm phù nề hậu phẫu',
    'Chăm sóc tại nhà',
  ];

  final List<Map<String, dynamic>> _articles = [
    {
      'id': 'art-01',
      'category': 'Xương khớp & Phục hồi',
      'title': 'Dẫn lưu bạch huyết có hỗ trợ giảm đau mỏi xương khớp không?',
      'excerpt':
          'Đau mỏi xương khớp là tình trạng thường gặp, đặc biệt ở người trung niên và lớn tuổi. Nhiều người không chỉ đau khi vận động mà còn cảm thấy nhức mỏi, căng cứng do dịch ứ đọng quanh bao khớp và các mô mềm lân cận...',
      'image': 'assets/images/clinic_1.png',
      'author': 'Trung tâm Ứng dụng Khoa học Bạch huyết Việt Nam',
      'publishDate': '24/10/2026',
      'readTime': '5 phút đọc',
      'fullContent': '''
Đau mỏi xương khớp là tình trạng thường gặp, đặc biệt ở người trung niên và lớn tuổi. Nhiều người không chỉ đau khi vận động mà còn cảm thấy nhức mỏi, nặng nề tại các khớp gối, khớp háng và vùng cột sống thắt lưng.

1. Nguyên nhân sâu xa từ hệ bạch huyết:
Ít ai biết rằng, hiện tượng viêm sưng khớp thường đi kèm với sự ứ trệ dịch bạch huyết cục bộ. Khi các mạch bạch huyết bị tắc nghẽn, các chất trung gian gây viêm và protein thừa không được thu dọn kịp thời, tạo áp lực lên các đầu mút dây thần kinh cảm giác, gây đau nhức kéo dài.

2. Cơ chế hỗ trợ của Dẫn lưu bạch huyết Vodder (MLD):
- Giảm áp lực nội khớp: Kỹ thuật miết nhẹ nhàng theo cung hạch bạch huyết giúp tiêu thoát dịch viêm ứ đọng quanh bao hoạt dịch khớp.
- Tăng cường tuần hoàn nuôi dưỡng mô sụn: Khi dịch ứ được giải phóng, tuần hoàn máu tươi giàu oxy và dưỡng chất dễ dàng tiếp cận nuôi dưỡng mô sụn khớp.
- Thư giãn cơ co thắt: Giúp các dải cơ quanh khớp được thả lỏng tự nhiên mà không gây đau đớn hay tổn thương thêm cho sụn khớp.

3. Khuyến nghị từ Chuyên gia MLD:
Người bệnh nên kết hợp liệu trình MLD định kỳ 1–2 lần/tuần cùng chế độ vận động nhẹ nhàng để duy trì sự dẻo dai của hệ cơ xương khớp.
''',
    },
    {
      'id': 'art-02',
      'category': 'Kỹ thuật MLD Vodder',
      'title': 'Tại sao dẫn lưu bạch huyết thủ công lại không gây đau?',
      'excerpt':
          '“Nhẹ như vậy thì có tác dụng không?” là thắc mắc của nhiều người khi lần đầu trải nghiệm MLD. Bởi vì kỹ thuật Vodder chuẩn chỉ tác động rất nhẹ lên lớp mao mạch bạch huyết nông ngay dưới bề mặt biểu bì...',
      'image': 'assets/images/clinic_2.png',
      'author': 'Trung tâm Ứng dụng Khoa học Bạch huyết Việt Nam',
      'publishDate': '23/10/2026',
      'readTime': '4 phút đọc',
      'fullContent': '''
"Nhẹ như vậy thì có tác dụng không?" là câu hỏi phổ biến nhất của khách hàng khi lần đầu tiên trải nghiệm liệu pháp Dẫn lưu bạch huyết thủ công (Manual Lymphatic Drainage - MLD) theo phương pháp Vodder.

1. Giải phẫu hệ bạch huyết nông:
Hơn 70% mạng lưới mao mạch bạch huyết của cơ thể nằm ngay dưới lớp biểu bì da (độ sâu chỉ từ 0.3mm đến 1.5mm). Đây là các mạch cực kỳ mỏng manh với các van vi mô một chiều.

2. Nguyên tắc "Áp lực lông vũ" (Feather-light pressure):
- Áp lực tối ưu của MLD chỉ dao động từ 30 đến 40 mmHg — nhẹ như động tác vuốt ve lông vũ trên da.
- Nếu tác động lực quá mạnh (như massage mô sâu hay bấm huyệt), các mao mạch bạch huyết sẽ lập tức co thắt và xẹp lại, làm dòng chảy dịch bị chặn đứng hoàn toàn.

3. Cảm giác êm dịu, phục hồi sâu:
MLD tác động trực tiếp lên hệ thần kinh phó giao cảm (Parasympathetic nervous system), giúp cơ thể giảm tiết cortisol, giải phóng căng thẳng và đưa khách hàng vào trạng thái thư giãn sâu, hoàn toàn không gây đau rát hay bầm tím.
''',
    },
    {
      'id': 'art-03',
      'category': 'Giảm phù nề hậu phẫu',
      'title': 'Dẫn lưu bạch huyết MLD – Giải pháp vàng tiêu dịch và giảm phù nề sau phẫu thuật',
      'excerpt':
          'Sau phẫu thuật tạo hình (hút mỡ, nâng ngực, tạo hình thành bụng, nâng mũi), tổn thương mao mạch gây ứ đọng dịch kẽ và bầm tím kéo dài. Dẫn lưu MLD kích thích mở các van bạch huyết để hút dịch thừa...',
      'image': 'assets/images/gioithieu_1.png',
      'author': 'Trung tâm Ứng dụng Khoa học Bạch huyết Việt Nam',
      'publishDate': '22/10/2026',
      'readTime': '6 phút đọc',
      'fullContent': '''
Sau các ca phẫu thuật thẩm mỹ hoặc phẫu thuật tạo hình (hút mỡ bụng/đùi, nâng ngực, tạo hình thành bụng, căng da mặt, nâng mũi), cơ thể phản ứng bằng việc tiết ra một lượng lớn dịch viêm để bảo vệ mô, gây phù nề, bầm tím và cảm giác căng tức khó chịu.

1. Nguy cơ khi để dịch ứ đọng kéo dài:
Nếu dịch kẽ không được tiêu thoát kịp thời trong 2–4 tuần đầu sau phẫu thuật, nguy cơ cao hình thành các tổ chức xơ cứng (fibrosis), da gồ ghề lồi lõm hoặc tụ dịch dưới da cần can thiệp chọc hút.

2. Vai trò của Dẫn lưu MLD Vodder trong giai đoạn vàng:
- Đẩy nhanh tốc độ tiêu sưng gấp 3–4 lần so với để cơ thể tự phục hồi.
- Làm mềm các mô sẹo, ngăn ngừa hiện tượng xơ hóa mô mỡ sau hút mỡ.
- Giảm rõ rệt các vết bầm tím nhờ hỗ trợ dọn dẹp xác hồng cầu ứ đọng.

3. Lộ trình điều trị khuyến nghị:
Nên bắt đầu buổi MLD đầu tiên từ ngày thứ 3 đến ngày thứ 5 sau phẫu thuật (theo chỉ định của bác sĩ điều trị) với liệu trình từ 5 đến 10 buổi liên tục.
''',
    },
    {
      'id': 'art-04',
      'category': 'Chăm sóc tại nhà',
      'title': 'Nguyên tắc 4 KHÔNG trong chăm sóc hệ bạch huyết tại nhà theo chuẩn Vodder',
      'excerpt':
          'Không bóp mạnh, không chườm nóng trực tiếp lên vùng phù dịch, không mặc quần áo quá bó chèn ép hạch bạch huyết và không tự ý dùng thuốc chống viêm khi chưa có chỉ định từ bác sĩ chuyên khoa...',
      'image': 'assets/images/gioithieu_2.png',
      'author': 'Trung tâm Ứng dụng Khoa học Bạch huyết Việt Nam',
      'publishDate': '20/10/2026',
      'readTime': '4 phút đọc',
      'fullContent': '''
Để duy trì hiệu quả sau các ca trị liệu tại cơ sở, khách hàng cần nắm vững các nguyên tắc chăm sóc hệ bạch huyết tại nhà:

1. KHÔNG xoa bóp thô bạo: Tuyệt đối không dùng lực bóp nắn mạnh vào vùng đang phù nề hoặc mới phẫu thuật.
2. KHÔNG chườm nóng trực tiếp: Nhiệt độ cao làm giãn mao mạch máu, khiến huyết tương thoát mạch nhiều hơn và làm sưng phù nặng hơn.
3. KHÔNG mặc đồ quá chật chèn ép hạch: Tránh các loại trang phục có đai thắt lưng hoặc chun quá siết tại các vùng trạm hạch (bẹn, nách, cổ).
4. KHÔNG nằm bất động kéo dài: Cần vận động nhẹ nhàng (đi bộ chậm, hít thở cơ hoành) để kích hoạt bơm cơ đẩy dịch bạch huyết lưu thông.
''',
    },
    {
      'id': 'art-05',
      'category': 'Kỹ thuật MLD Vodder',
      'title': 'Sự khác biệt căn bản giữa Massage thông thường và Dẫn lưu bạch huyết y khoa MLD',
      'excerpt':
          'Massage thư giãn truyền thống tập trung miết cơ và kích thích tuần hoàn máu động mạch. Trong khi đó, MLD Vodder là liệu pháp y khoa chuyên sâu định hướng dòng dịch bạch huyết về các hạch trung tâm...',
      'image': 'assets/images/gioithieu_3.png',
      'author': 'Trung tâm Ứng dụng Khoa học Bạch huyết Việt Nam',
      'publishDate': '18/10/2026',
      'readTime': '5 phút đọc',
      'fullContent': '''
Rất nhiều người thường đánh đồng Dẫn lưu bạch huyết với các hình thức Massage Body thông thường. Dưới đây là các khác biệt mang tính cốt lõi:

1. Đối tượng tác động:
- Massage thông thường: Tác động vào các bó cơ sâu, gân và khớp nhằm giải phóng co thắt cơ học.
- MLD Vodder: Tác động vi mô vào hệ mao mạch bạch huyết nằm ngay sát bề mặt biểu bì.

2. Hướng lực và nhịp điệu:
- Massage thông thường: Lực mạnh, nhịp nhanh, miết sâu.
- MLD Vodder: Chuyển động xoay vòng chậm rãi (khoảng 1 chuyển động mỗi giây) chính xác theo hướng dòng chảy về các hạch bạch huyết chính (hạch cổ, hạch nách, hạch bẹn).

3. Mục tiêu trị liệu:
MLD được coi là phương pháp y khoa phục hồi chức năng và giảm phù nề, có chỉ định lâm sàng rõ ràng và được bảo hiểm y tế tại nhiều quốc gia châu Âu chi trả.
''',
    },
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredArticles {
    final query = _searchController.text.trim().toLowerCase();
    return _articles.where((art) {
      final matchesCategory = _selectedCategoryIndex == 0 ||
          art['category'] == _categories[_selectedCategoryIndex];
      final matchesQuery = query.isEmpty ||
          (art['title'] as String).toLowerCase().contains(query) ||
          (art['excerpt'] as String).toLowerCase().contains(query);
      return matchesCategory && matchesQuery;
    }).toList();
  }

  void _showArticleDetail(Map<String, dynamic> article) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Thanh kéo trên modal
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),

              // Header đóng modal
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        article['category'] as String,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0066B2),
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),

              const Divider(height: 1, color: Color(0xFFF1F5F9)),

              // Nội dung chi tiết bài viết
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Tiêu đề bài viết
                      Text(
                        article['title'] as String,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Thông tin tác giả & ngày đăng
                      Row(
                        children: [
                          const Icon(Icons.verified, size: 16, color: Color(0xFF0066B2)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              '${article['author']} · ${article['publishDate']}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ),
                          Text(
                            article['readTime'] as String,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Ảnh minh họa lớn
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.asset(
                          article['image'] as String,
                          width: double.infinity,
                          height: 200,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            height: 200,
                            color: const Color(0xFFF1F5F9),
                            child: const Center(
                              child: Icon(Icons.image, size: 48, color: Color(0xFFCBD5E1)),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Toàn văn nội dung bài viết
                      Text(
                        article['fullContent'] as String,
                        style: const TextStyle(
                          fontSize: 15,
                          color: Color(0xFF334155),
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Khối hành động chuyên khoa
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Bạn đang cần tư vấn hoặc gặp tình trạng phù nề?',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Liên hệ chuyên gia hoặc đăng ký kiểm tra phù nề y khoa trực tiếp tại cơ sở MLD Việt Nam.',
                              style: TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.4),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                Expanded(
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF0066B2),
                                      foregroundColor: Colors.white,
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                    ),
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (_) => const D10LymphExaminationScreen()),
                                      );
                                    },
                                    child: const Text('Khám phù MLD', style: TextStyle(fontWeight: FontWeight.w600)),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: OutlinedButton(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: const Color(0xFF0066B2),
                                      side: const BorderSide(color: Color(0xFF0066B2)),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                    ),
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (_) => const C01ServiceSelectionScreen()),
                                      );
                                    },
                                    child: const Text('Đặt trị liệu', style: TextStyle(fontWeight: FontWeight.w600)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
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
          icon: const Icon(Icons.arrow_back_ios_new, size: 20, color: Color(0xFF0F172A)),
          onPressed: () {
            if (widget.onBack != null) {
              widget.onBack!();
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: const Column(
          children: [
            Text(
              'Cộng đồng MLD Việt Nam',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
            SizedBox(height: 2),
            Text(
              'Góc chia sẻ bài viết & tài liệu trị liệu MLD',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ô tìm kiếm bài viết y khoa
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
                  const Icon(Icons.search, size: 20, color: Color(0xFF64748B)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        hintText: 'Tìm bài viết trị liệu, tài liệu MLD...',
                        hintStyle: TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
                        border: InputBorder.none,
                        isDense: true,
                      ),
                    ),
                  ),
                  if (_searchController.text.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.clear, size: 18, color: Color(0xFF64748B)),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {});
                      },
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Thanh lọc danh mục ngang
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
                      _categories[index],
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                        color: isSelected ? Colors.white : const Color(0xFF475569),
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: const Color(0xFF0066B2),
                    backgroundColor: Colors.white,
                    side: BorderSide(
                      color: isSelected ? const Color(0xFF0066B2) : const Color(0xFFCBD5E1),
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

            // Danh sách các thẻ bài viết tài liệu trị liệu chuẩn theo hình ảnh ví dụ của khách hàng
            if (filtered.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 40),
                alignment: Alignment.center,
                child: const Text(
                  'Không tìm thấy bài viết phù hợp',
                  style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
                ),
              )
            else
              ...filtered.map((article) => _buildArticleCard(article)),
          ],
        ),
      ),
    );
  }

  /// Card bài viết tài liệu trị liệu chuẩn 100% theo mẫu thiết kế từ ảnh của người dùng:
  /// - Thẻ trắng, góc bo tròn, viền tinh tế
  /// - Ảnh minh họa chuyên đề bo góc ở phía trên
  /// - Tiêu đề in đậm (Bold)
  /// - Đoạn trích dẫn mô tả y khoa ngắn gọn
  /// - Không có nút Like, không có bình luận, không có nút đăng bài người dùng
  Widget _buildArticleCard(Map<String, dynamic> article) {
    return InkWell(
      onTap: () => _showArticleDetail(article),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Ảnh minh họa chuyên đề (Bo tròn r=12)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                children: [
                  Image.asset(
                    article['image'] as String,
                    height: 185,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 185,
                      width: double.infinity,
                      color: const Color(0xFFF1F5F9),
                      child: const Center(
                        child: Icon(Icons.image, size: 48, color: Color(0xFFCBD5E1)),
                      ),
                    ),
                  ),
                  // Huy hiệu MLD VIETNAM ở góc trên bên trái
                  Positioned(
                    top: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.92),
                        borderRadius: BorderRadius.circular(6),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.verified, size: 12, color: Color(0xFF0066B2)),
                          SizedBox(width: 4),
                          Text(
                            'MLD VIETNAM · TÀI LIỆU TRỊ LIỆU',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0066B2),
                              letterSpacing: 0.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 2. Tiêu đề bài viết
            Text(
              article['title'] as String,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
                height: 1.35,
              ),
            ),
            const SizedBox(height: 8),

            // 3. Tóm tắt nội dung trích đoạn
            Text(
              article['excerpt'] as String,
              style: const TextStyle(
                fontSize: 13,
                color: Color(0xFF475569),
                height: 1.45,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
