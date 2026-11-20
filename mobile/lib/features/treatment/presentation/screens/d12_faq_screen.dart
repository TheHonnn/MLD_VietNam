import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/services/portal_settings_service.dart';
import '../../../../core/utils/launcher_helper.dart';
import 'd07_customer_support_screen.dart';

class D12FaqScreen extends StatefulWidget {
  final String? initialCategory;

  const D12FaqScreen({super.key, this.initialCategory});

  @override
  State<D12FaqScreen> createState() => _D12FaqScreenState();
}

class _D12FaqScreenState extends State<D12FaqScreen> {
  final TextEditingController _searchController = TextEditingController();
  late String _selectedCategory;
  String _searchQuery = '';
  String? _expandedId;
  bool _isRefreshing = false;

  static const List<Map<String, String>> _categories = [
    {'id': 'ALL', 'vi': 'Tất cả', 'en': 'All'},
    {'id': 'DAO_TAO', 'vi': 'Đào tạo & Học phí', 'en': 'Academy & Tuition'},
    {'id': 'DICH_VU', 'vi': 'Dịch vụ & Trị liệu', 'en': 'Services & Therapy'},
    {'id': 'DAT_LICH', 'vi': 'Đặt lịch & Cơ sở', 'en': 'Booking & Branches'},
    {'id': 'HOI_VIEN', 'vi': 'Hội viên & Ưu đãi', 'en': 'Membership & Offers'},
  ];

  static const List<Map<String, dynamic>> _fallbackFaqs = [
    {
      'id': 'fallback-1',
      'category': 'DICH_VU',
      'question': 'Dẫn lưu bạch huyết (MLD) chuẩn Vodder phù hợp với đối tượng nào?',
      'answer':
          'Phương pháp hỗ trợ hiệu quả cho người bị phù bạch huyết tay/chân sau phẫu thuật, sưng nề sau chấn thương hoặc thẩm mỹ, người cần giảm ứ trệ dịch và tăng cường miễn dịch.',
    },
    {
      'id': 'fallback-2',
      'category': 'DAT_LICH',
      'question': 'Làm sao để đặt lịch và chọn khung giờ phù hợp?',
      'answer':
          'Quý khách chọn dịch vụ hoặc gói liệu trình, chọn chi nhánh gần nhất, chọn ngày và khung giờ hiển thị trực tiếp trên ứng dụng rồi bấm xác nhận đặt lịch.',
    },
    {
      'id': 'fallback-3',
      'category': 'DAO_TAO',
      'question': 'Người chưa có nền tảng y khoa có tham gia khóa đào tạo được không?',
      'answer':
          'Học viện MLD Việt Nam thiết kế lộ trình phân tầng từ Người mới bắt đầu đến Đang làm nghề và Y bác sĩ, giúp học viên nắm chắc giải phẫu và thực hành chuẩn quốc tế.',
    },
  ];

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory ?? 'ALL';
    PortalSettingsService.instance.settingsVersion.addListener(_onSettingsUpdated);
    if (!WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding')) {
      PortalSettingsService.instance.syncFromCloud();
    }
  }

  @override
  void dispose() {
    PortalSettingsService.instance.settingsVersion.removeListener(_onSettingsUpdated);
    _searchController.dispose();
    super.dispose();
  }

  void _onSettingsUpdated() {
    if (mounted) setState(() {});
  }

  Future<void> _handleRefresh() async {
    setState(() => _isRefreshing = true);
    await PortalSettingsService.instance.syncFromCloud();
    if (mounted) {
      setState(() => _isRefreshing = false);
    }
  }

  List<Map<String, dynamic>> get _sourceFaqs {
    final portalFaqs = PortalSettingsService.instance.faqs;
    final list = portalFaqs.isNotEmpty ? portalFaqs : _fallbackFaqs;
    return list.where((item) {
      final active = item['is_active'] ?? item['isActive'] ?? true;
      return active == true;
    }).toList();
  }

  List<Map<String, dynamic>> get _filteredFaqs {
    final q = _searchQuery.trim().toLowerCase();
    return _sourceFaqs.where((item) {
      final cat = (item['category']?.toString() ?? '').trim();
      final matchesCat = _selectedCategory == 'ALL' || cat == _selectedCategory;
      if (!matchesCat) return false;
      if (q.isEmpty) return true;
      final question = (item['question']?.toString() ?? '').toLowerCase();
      final answer = (item['answer']?.toString() ?? '').toLowerCase();
      return question.contains(q) || answer.contains(q);
    }).toList();
  }

  String _categoryLabel(BuildContext context, String catId) {
    for (final c in _categories) {
      if (c['id'] == catId) {
        return context.tr(c['vi']!, c['en']!);
      }
    }
    return catId.isNotEmpty ? catId : context.tr('Chung', 'General');
  }

  Color _categoryColor(String catId) {
    switch (catId) {
      case 'DAO_TAO':
        return AppColors.primary;
      case 'DICH_VU':
        return AppColors.accent;
      case 'DAT_LICH':
        return const Color(0xFFB45309);
      case 'HOI_VIEN':
        return const Color(0xFF7E22CE);
      default:
        return AppColors.textSecondary;
    }
  }

  Color _categoryBgColor(String catId) {
    switch (catId) {
      case 'DAO_TAO':
        return AppColors.iceBlue;
      case 'DICH_VU':
        return AppColors.mintBackground;
      case 'DAT_LICH':
        return const Color(0xFFFEF3C7);
      case 'HOI_VIEN':
        return const Color(0xFFF3E8FF);
      default:
        return const Color(0xFFF1F5F9);
    }
  }

  @override
  Widget build(BuildContext context) {
    final allFaqs = _sourceFaqs;
    final filtered = _filteredFaqs;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.textHeading),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          context.tr('Hỏi đáp thường gặp (FAQs)', 'Frequently Asked Questions'),
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: AppColors.textHeading,
          ),
        ),
        centerTitle: true,
        actions: [
          if (_isRefreshing)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
              onPressed: _handleRefresh,
              tooltip: context.tr('Đồng bộ mới nhất', 'Refresh'),
            ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _handleRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.mintBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFD1E7D5)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.accent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.quiz_rounded, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr('Giải đáp chuyên môn & dịch vụ MLD', 'MLD Medical & Service Guide'),
                          style: const TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textHeading,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          context.tr(
                            'Tổng hợp ${allFaqs.length} câu hỏi thường gặp được cập nhật đồng bộ từ chuyên gia.',
                            '${allFaqs.length} curated questions synchronized directly from MLD specialists.',
                          ),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _searchController,
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: context.tr('Tìm kiếm câu hỏi hoặc nội dung trả lời...', 'Search questions or answers...'),
                hintStyle: const TextStyle(fontSize: 13.5, color: AppColors.textPlaceholder),
                prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textSecondary, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.textSecondary),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.4),
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 38,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final id = cat['id']!;
                  final isSelected = _selectedCategory == id;
                  final count = id == 'ALL'
                      ? allFaqs.length
                      : allFaqs.where((f) => (f['category']?.toString() ?? '') == id).length;

                  return InkWell(
                    onTap: () => setState(() => _selectedCategory = id),
                    borderRadius: BorderRadius.circular(20),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 160),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            context.tr(cat['vi']!, cat['en']!),
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: isSelected ? Colors.white : AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.white.withValues(alpha: 0.22) : Colors.white,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$count',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: isSelected ? Colors.white : AppColors.textSecondary,
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
            const SizedBox(height: 16),
            if (filtered.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.help_outline_rounded, size: 42, color: AppColors.textPlaceholder),
                    const SizedBox(height: 10),
                    Text(
                      context.tr('Không tìm thấy câu hỏi phù hợp', 'No matching questions found'),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      context.tr(
                        'Hãy thử từ khóa khác hoặc liên hệ chuyên viên để được tư vấn trực tiếp.',
                        'Try another keyword or contact our support team for direct assistance.',
                      ),
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              )
            else
              ...List.generate(filtered.length, (index) {
                final item = filtered[index];
                final id = item['id']?.toString() ?? 'faq_$index';
                final catId = (item['category']?.toString() ?? '').trim();
                final question = item['question']?.toString() ?? '';
                final answer = item['answer']?.toString() ?? '';
                final isExpanded = _expandedId == id;

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isExpanded ? AppColors.primary.withValues(alpha: 0.45) : AppColors.border,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: InkWell(
                    onTap: () => setState(() => _expandedId = isExpanded ? null : id),
                    borderRadius: BorderRadius.circular(14),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: _categoryBgColor(catId),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  _categoryLabel(context, catId),
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                    color: _categoryColor(catId),
                                  ),
                                ),
                              ),
                              const Spacer(),
                              Icon(
                                isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                                color: AppColors.textSecondary,
                                size: 22,
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '${index + 1}. $question',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textHeading,
                              height: 1.35,
                            ),
                          ),
                          AnimatedSize(
                            duration: const Duration(milliseconds: 220),
                            curve: Curves.easeInOut,
                            child: isExpanded
                                ? Container(
                                    width: double.infinity,
                                    margin: const EdgeInsets.only(top: 10),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF8FAFC),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      answer,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: AppColors.textPrimary,
                                        height: 1.5,
                                      ),
                                    ),
                                  )
                                : const SizedBox.shrink(),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.iceBlue,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.tr('Chưa tìm thấy câu trả lời phù hợp?', 'Still need help?'),
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHeading,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    context.tr(
                      'Đội ngũ tư vấn MLD Việt Nam sẵn sàng giải đáp trực tiếp cho bạn.',
                      'MLD Vietnam specialists are ready to assist you directly.',
                    ),
                    style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => AppLauncherHelper.makePhoneCall(
                            context,
                            PortalSettingsService.instance.hotlineSupport,
                          ),
                          icon: const Icon(Icons.phone_in_talk_rounded, size: 17, color: AppColors.primary),
                          label: Text(
                            context.tr('Gọi Hotline', 'Call Hotline'),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: Colors.white,
                            side: const BorderSide(color: AppColors.primary),
                            padding: const EdgeInsets.symmetric(vertical: 11),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const D07CustomerSupportScreen()),
                            );
                          },
                          icon: const Icon(Icons.support_agent_rounded, size: 17, color: Colors.white),
                          label: Text(
                            context.tr('Hỗ trợ CSKH', 'Support Center'),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 11),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
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
    );
  }
}
