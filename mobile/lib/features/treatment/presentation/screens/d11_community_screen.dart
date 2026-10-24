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
      'commentItems': [
        {
          'author': 'Bác sĩ Lan Anh',
          'avatar': 'assets/images/specialist_hero_2.png',
          'content': 'Chúc mừng bạn đã phục hồi tốt! Sau hút mỡ, dẫn lưu MLD sớm giúp ngừa xơ hóa mô mỡ rất hiệu quả.',
          'time': '1 giờ trước',
        },
        {
          'author': 'Ngọc Mai',
          'avatar': 'assets/images/specialist_hero_3.png',
          'content': 'Cho mình hỏi liệu trình 5 buổi này mỗi buổi cách nhau mấy ngày vậy chị?',
          'time': '30 phút trước',
        },
      ],
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
      'commentItems': [
        {
          'author': 'Hải Yến (KTV)',
          'avatar': 'assets/images/academy_hero_classroom.png',
          'content': 'Bài học quý giá ạ. Lúc mới học em cũng bị thói quen tì lực mạnh, sau khi được chỉnh tay nghề thì khách êm ru ngủ luôn.',
          'time': 'Hôm qua',
        },
      ],
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
      'commentItems': [
        {
          'author': 'Thanh Hằng',
          'avatar': 'assets/images/specialist_hero_1.png',
          'content': 'Tự hào về em! Khóa K08 ai cũng vững tay nghề sau khi tốt nghiệp.',
          'time': '2 ngày trước',
        },
      ],
    },
  ];

  void _toggleLike(Map<String, dynamic> post) {
    setState(() {
      final currentLiked = post['isLiked'] as bool? ?? false;
      post['isLiked'] = !currentLiked;
      final currentLikes = (post['likes'] as num?)?.toInt() ?? 0;
      post['likes'] = !currentLiked ? (currentLikes + 1) : (currentLikes > 0 ? currentLikes - 1 : 0);
    });
  }

  void _showCommentsBottomSheet(BuildContext context, Map<String, dynamic> post) {
    final commentController = TextEditingController();
    final List<Map<String, String>> comments = List<Map<String, String>>.from(
      (post['commentItems'] as List?)?.map((e) => Map<String, String>.from(e as Map)) ?? [],
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.75,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      margin: const EdgeInsets.only(top: 10, bottom: 8),
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  // Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Bình luận (${comments.length})',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1, color: Color(0xFFE2E8F0)),

                  // Comments List
                  Expanded(
                    child: comments.isEmpty
                        ? const Center(
                            child: Text(
                              'Chưa có bình luận nào. Hãy là người đầu tiên!',
                              style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: comments.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 14),
                            itemBuilder: (context, index) {
                              final item = comments[index];
                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  CircleAvatar(
                                    radius: 16,
                                    backgroundColor: const Color(0xFFEFF6FF),
                                    backgroundImage: AssetImage(item['avatar'] ?? 'assets/images/specialist_hero_1.png'),
                                    onBackgroundImageError: (_, __) {},
                                    child: const Icon(Icons.person, size: 16, color: Color(0xFF0066B2)),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: const Color(0xFFE2E8F0)),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                item['author'] ?? 'Người dùng',
                                                style: const TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w700,
                                                  color: Color(0xFF0F172A),
                                                ),
                                              ),
                                              Text(
                                                item['time'] ?? 'Vừa xong',
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  color: Color(0xFF94A3B8),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            item['content'] ?? '',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: Color(0xFF334155),
                                              height: 1.35,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                  ),

                  // Input row
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: commentController,
                            decoration: InputDecoration(
                              hintText: 'Viết bình luận của bạn...',
                              hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: const BorderSide(color: Color(0xFF0066B2)),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.send_rounded, color: Color(0xFF0066B2)),
                          onPressed: () {
                            final text = commentController.text.trim();
                            if (text.isNotEmpty) {
                              final newComment = {
                                'author': 'Bạn',
                                'avatar': 'assets/images/specialist_hero_1.png',
                                'content': text,
                                'time': 'Vừa xong',
                              };
                              setModalState(() {
                                comments.add(newComment);
                              });
                              setState(() {
                                post['commentItems'] = comments;
                                post['comments'] = comments.length;
                              });
                              commentController.clear();
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showCreatePostBottomSheet(BuildContext context) {
    final titleController = TextEditingController();
    final contentController = TextEditingController();
    String selectedCategory = _categories[1]; // 'Phù nề hậu phẫu'

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                left: 20,
                right: 20,
                top: 16,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Đặt câu hỏi / Chia sẻ',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Tiêu đề
                    const Text(
                      'Tiêu đề bài viết *',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: titleController,
                      decoration: InputDecoration(
                        hintText: 'Tóm tắt câu hỏi hoặc câu chuyện của bạn...',
                        hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Chuyên mục
                    const Text(
                      'Chuyên mục *',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: _categories.skip(1).map((cat) {
                        final isSelected = selectedCategory == cat;
                        return ChoiceChip(
                          label: Text(
                            cat,
                            style: TextStyle(
                              fontSize: 12,
                              color: isSelected ? Colors.white : const Color(0xFF334155),
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: const Color(0xFF0066B2),
                          backgroundColor: const Color(0xFFF1F5F9),
                          onSelected: (val) {
                            if (val) {
                              setModalState(() {
                                selectedCategory = cat;
                              });
                            }
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 14),

                    // Nội dung
                    const Text(
                      'Nội dung chi tiết *',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: contentController,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: 'Mô tả chi tiết câu hỏi, triệu chứng hoặc quá trình phục hồi...',
                        hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                        ),
                        contentPadding: const EdgeInsets.all(12),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Nút Đăng bài
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0066B2),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                        ),
                        onPressed: () {
                          final title = titleController.text.trim();
                          final content = contentController.text.trim();
                          if (title.isEmpty || content.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Vui lòng nhập đầy đủ tiêu đề và nội dung bài viết.'),
                                backgroundColor: Color(0xFFD64545),
                              ),
                            );
                            return;
                          }

                          final newPost = {
                            'id': 'post-${DateTime.now().millisecondsSinceEpoch}',
                            'category': selectedCategory,
                            'authorName': 'Bạn (Thành viên MLD)',
                            'authorRole': 'Thành viên cộng đồng',
                            'authorAvatar': 'assets/images/specialist_hero_1.png',
                            'time': 'Vừa xong',
                            'title': title,
                            'content': content,
                            'likes': 0,
                            'comments': 0,
                            'tags': ['#MLDCommunity', '#ChiaSẻ'],
                            'isLiked': false,
                            'commentItems': <Map<String, String>>[],
                          };

                          setState(() {
                            _posts.insert(0, newPost);
                          });

                          Navigator.pop(ctx);

                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Đã đăng bài viết thành công lên Cộng đồng MLD!'),
                              backgroundColor: Color(0xFF236B42),
                            ),
                          );
                        },
                        child: const Text(
                          'Đăng bài ngay',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

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
            onPressed: () => _showCreatePostBottomSheet(context),
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
    final isLiked = post['isLiked'] == true;

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

          // Footer Actions: Like, Comment, Share
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  // Nút Thích (Like) tương tác động - BUG-037
                  InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () => _toggleLike(post),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                      child: Row(
                        children: [
                          Icon(
                            isLiked ? Icons.thumb_up : Icons.thumb_up_alt_outlined,
                            size: 16,
                            color: isLiked ? const Color(0xFF0066B2) : const Color(0xFF64748B),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${post['likes']}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isLiked ? FontWeight.w600 : FontWeight.w400,
                              color: isLiked ? const Color(0xFF0066B2) : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Nút Bình luận mở BottomSheet - BUG-037
                  InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () => _showCommentsBottomSheet(context, post),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.chat_bubble_outline, size: 16, color: Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Text(
                            '${post['comments']} bình luận',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.share_outlined, size: 18, color: Color(0xFF64748B)),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Đã sao chép liên kết chia sẻ bài viết'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
