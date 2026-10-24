import 'package:flutter/material.dart';

/// Screen D11: Trang Cộng đồng MLD Việt Nam (Điểm 118, 154 trong Website Trang chủ, dịch vụ, đặt lịch.txt)
/// Nơi chia sẻ case phục hồi thực tế, trao đổi kinh nghiệm nghề và hỏi đáp chuyên gia Y khoa Vodder
class D11CommunityScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const D11CommunityScreen({super.key, this.onBack});

  @override
  State<D11CommunityScreen> createState() => _D11CommunityScreenState();
}

class _D11CommunityScreenState extends State<D11CommunityScreen> {
  int _selectedCategoryIndex = 0;
  final List<String> _categories = [
    'Tất cả',
    'Phù nề hậu phẫu',
    'Trị liệu lâm sàng',
    'Hỏi đáp chuyên gia',
    'Góc học viên nghề',
  ];

  final List<Map<String, dynamic>> _posts = [
    {
      'id': 'post-01',
      'category': 'Phù nề hậu phẫu',
      'authorName': 'Chị Minh Thư (Hà Nội)',
      'authorRole': 'Khách hàng hậu phẫu tạo hình',
      'authorAvatar': 'assets/images/specialist_hero_1.png',
      'time': 'Hôm nay · 08:30',
      'title': 'Kinh nghiệm giảm 85% phù nề và bầm tím vùng đùi sau hút mỡ nhờ dẫn lưu bạch huyết Vodder',
      'content':
          'Sau phẫu thuật ngày thứ 3 mình bị căng tức dịch và bầm tím rất nhiều. May mắn được bác sĩ phẫu thuật hướng dẫn đi dẫn lưu MLD chuẩn Vodder tại cơ sở MLD Việt Nam. Sau liệu trình 5 buổi nhẹ nhàng, chân mình nhẹ nhõm hẳn, chu vi vòng đùi giảm rõ rệt và bầm tan 90%.',
      'likes': 128,
      'comments': 24,
      'tags': ['#HậuPhẫu', '#GiảmPhùNề', '#VodderMLD'],
      'isLiked': true,
    },
    {
      'id': 'post-02',
      'category': 'Trị liệu lâm sàng',
      'authorName': 'ThS. Bác sĩ Trịnh Lan Anh',
      'authorRole': 'Cố vấn Y khoa MLD Academy',
      'authorAvatar': 'assets/images/specialist_hero_2.png',
      'time': 'Hôm qua · 15:45',
      'title': 'Nguyên tắc "Áp lực lông vũ" trong kỹ thuật MLD – Đừng làm khách hàng đau!',
      'content':
          'Rất nhiều bạn KTV mới nhầm lẫn MLD với massage bấm huyệt hay massage mô sâu. Mao mạch bạch huyết nằm ngay dưới biểu bì, chỉ cần áp lực 30–40 mmHg (nhẹ như vuốt ve lông vũ). Dùng lực quá mạnh sẽ làm dập tắc mao mạch và khiến tình trạng ứ dịch trầm trọng hơn.',
      'likes': 312,
      'comments': 45,
      'tags': ['#YKhoaVodder', '#ÁpLựcLôngVũ', '#ChuyênMôn'],
      'isLiked': false,
    },
    {
      'id': 'post-03',
      'category': 'Góc học viên nghề',
      'authorName': 'Đặng Hải Yến',
      'authorRole': 'Học viên Khóa MLD K08',
      'authorAvatar': 'assets/images/academy_hero_classroom.png',
      'time': '3 ngày trước',
      'title': 'Góc tâm sự: Từ KTV Spa thông thường đến Chuyên viên Trị liệu MLD Y khoa',
      'content':
          'Trước đây mình chỉ làm gội đầu dưỡng sinh và massage body thư giãn, thu nhập bấp bênh. Sau khóa học bài bản tại MLD Academy và nhận Giấy chứng nhận, mình được phân công phụ trách phòng trị liệu phục hồi hậu phẫu, thu nhập và tay nghề tăng gấp đôi.',
      'likes': 95,
      'comments': 18,
      'tags': ['#HọcViênMLD', '#ĐàoTạoNghề', '#GiấyChứngNhận'],
      'isLiked': true,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filteredPosts = _selectedCategoryIndex == 0
        ? _posts
        : _posts.where((p) => p['category'] == _categories[_selectedCategoryIndex]).toList();

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
        title: const Text(
          'Cộng đồng MLD Việt Nam',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0F172A),
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: Color(0xFF0066B2)),
            onPressed: () {},
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1.0)),
        ),
        child: SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.edit_note, color: Colors.white),
            label: const Text(
              'Đặt câu hỏi hoặc chia sẻ câu chuyện',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0066B2),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Tính năng đăng bài cộng đồng đang được đồng bộ hóa với hệ thống Admin MLD'),
                  backgroundColor: Color(0xFF0066B2),
                ),
              );
            },
          ),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Banner giới thiệu Cộng đồng MLD
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0066B2), Color(0xFF0284C7)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.forum_outlined, color: Colors.white, size: 22),
                      SizedBox(width: 8),
                      Text(
                        'Diễn đàn Y khoa & Khách hàng MLD',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                    ],
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Chia sẻ kinh nghiệm phục hồi phù nề hậu phẫu thực tế, hỏi đáp cùng các Bác sĩ & Giảng viên dẫn lưu bạch huyết Vodder chuẩn quốc tế.',
                    style: TextStyle(fontSize: 13, color: Colors.white70, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

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

            // Danh sách bài viết
            ...filteredPosts.map((post) => _buildPostCard(post)),
          ],
        ),
      ),
    );
  }

  Widget _buildPostCard(Map<String, dynamic> post) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Author Header
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: const Color(0xFFEFF6FF),
                backgroundImage: AssetImage(post['authorAvatar'] as String),
                onBackgroundImageError: (_, __) {},
                child: const Icon(Icons.person, size: 20, color: Color(0xFF0066B2)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post['authorName'] as String,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      '${post['authorRole']} · ${post['time']}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  post['category'] as String,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF0066B2),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Title & Content
          Text(
            post['title'] as String,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            post['content'] as String,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF334155),
              height: 1.45,
            ),
          ),
          const SizedBox(height: 10),

          // Tags
          Wrap(
            spacing: 8,
            children: (post['tags'] as List<String>)
                .map((tag) => Text(
                      tag,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF0284C7),
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 8),

          // Footer Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    post['isLiked'] == true ? Icons.thumb_up : Icons.thumb_up_alt_outlined,
                    size: 16,
                    color: post['isLiked'] == true ? const Color(0xFF0066B2) : const Color(0xFF64748B),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${post['likes']}',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(width: 16),
                  const Icon(Icons.chat_bubble_outline, size: 16, color: Color(0xFF64748B)),
                  const SizedBox(width: 4),
                  Text(
                    '${post['comments']} bình luận',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                ],
              ),
              const Icon(Icons.share_outlined, size: 18, color: Color(0xFF64748B)),
            ],
          ),
        ],
      ),
    );
  }
}
