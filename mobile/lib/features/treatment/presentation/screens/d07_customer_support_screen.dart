import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/launcher_helper.dart';
import '../../data/models/treatment_models.dart';
import '../../data/repositories/treatment_repository.dart';

class D07CustomerSupportScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const D07CustomerSupportScreen({
    super.key,
    this.onBack,
  });

  @override
  State<D07CustomerSupportScreen> createState() => _D07CustomerSupportScreenState();
}

class _D07CustomerSupportScreenState extends State<D07CustomerSupportScreen> {
  final TreatmentRepository _repo = TreatmentRepository.instance;
  final TextEditingController _msgController = TextEditingController();
  late List<ChatMessageModel> _messages;

  @override
  void initState() {
    super.initState();
    _messages = List.from(_repo.getChatMessages());
  }

  @override
  void dispose() {
    _msgController.dispose();
    super.dispose();
  }

  void _sendMessage([String? textToSend]) {
    final text = textToSend ?? _msgController.text.trim();
    if (text.isEmpty) return;

    final now = DateTime.now();
    final timeStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    setState(() {
      _messages.add(
        ChatMessageModel(
          id: 'user-${DateTime.now().millisecondsSinceEpoch}',
          text: text,
          time: timeStr,
          isFromUser: true,
        ),
      );
      if (textToSend == null) {
        _msgController.clear();
      }
    });

    // Tự động phản hồi
    Future.delayed(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      setState(() {
        _messages.add(
          ChatMessageModel(
            id: 'bot-${DateTime.now().millisecondsSinceEpoch}',
            text: 'Cảm ơn anh/chị đã liên hệ. Đội ngũ chuyên viên tư vấn sẽ phản hồi trong giây lát.',
            time: timeStr,
            isFromUser: false,
          ),
        );
      });
    });
  }

  void _showBranchContactModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
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
            const Text(
              'Liên hệ chi nhánh',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: Color(0xFF693B20),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Hotline đào tạo & hợp tác: 096.7786.399\nGiờ phục vụ: 09:00 – 20:00 hàng ngày',
              style: TextStyle(fontSize: 14, color: Color(0xFF40352F), height: 1.5),
            ),
            const SizedBox(height: 16),
            const Text(
              'Địa chỉ: Chi nhánh Quận 3, 123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
              style: TextStyle(fontSize: 14, color: Color(0xFF6B6158), height: 1.4),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  AppLauncherHelper.makePhoneCall(context, '0967786399');
                },
                icon: const Icon(Icons.phone, color: Colors.white),
                label: const Text(
                  'Gọi ngay 096.7786.399',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF985018),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 64,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE3D1BF), width: 1.0),
          ),
          child: Row(
            children: [
              Icon(icon, color: const Color(0xFF985018), size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: Color(0xFF40352F),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
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
                          'CHĂM SÓC & TRỊ LIỆU',
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
                      'Tư vấn & hỗ trợ',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF693B20),
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Chúng tôi luôn sẵn sàng đồng hành cùng bạn.',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: Color(0xFF6B6158),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // --- 2. CHÀO HỎI HỖ TRỢ ---
                    Row(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3E2CE),
                            shape: BoxShape.circle,
                            border: Border.all(color: const Color(0xFF985018), width: 1.0),
                          ),
                          child: ClipOval(
                            child: Image.asset(
                              'assets/images/gioithieu_1.png',
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(
                                Icons.headset_mic,
                                color: Color(0xFF985018),
                                size: 28,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Text(
                            'Bạn cần chúng tôi hỗ trợ điều gì?',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF40352F),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // --- 3. HỖ TRỢ NHANH (2x2 GRID) ---
                    Row(
                      children: [
                        _buildQuickActionItem(
                          icon: Icons.chat_bubble_outline,
                          label: 'Tư vấn dịch vụ.',
                          onTap: () => _sendMessage('Tôi muốn được tư vấn dịch vụ trị liệu phù hợp.'),
                        ),
                        const SizedBox(width: 8),
                        _buildQuickActionItem(
                          icon: Icons.calendar_today_outlined,
                          label: 'Hỗ trợ đặt lịch.',
                          onTap: () => _sendMessage('Tôi muốn hỗ trợ đổi lịch hẹn buổi tiếp theo.'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildQuickActionItem(
                          icon: Icons.spa_outlined,
                          label: 'Hỗ trợ liệu trình.',
                          onTap: () => _sendMessage('Tôi cần tư vấn về số buổi liệu trình còn lại.'),
                        ),
                        const SizedBox(width: 8),
                        _buildQuickActionItem(
                          icon: Icons.school_outlined,
                          label: 'Hỗ trợ học viên.',
                          onTap: () => _sendMessage('Tôi muốn hỏi thông tin các khóa đào tạo spa.'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // --- 4. TRÒ CHUYỆN HỖ TRỢ ---
                    Container(
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
                          const Center(
                            child: Text(
                              'Kênh hỗ trợ trực tuyến',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w400,
                                color: Color(0xFF6B6158),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Danh sách tin nhắn
                          ..._messages.map((msg) {
                            if (msg.isFromUser) {
                              return Align(
                                alignment: Alignment.centerRight,
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 12, left: 40),
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF985018),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        msg.text,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w400,
                                          color: Colors.white,
                                          height: 1.4,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        msg.time,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w400,
                                          color: Colors.white70,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            } else {
                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 28,
                                    height: 28,
                                    margin: const EdgeInsets.only(right: 8, top: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: const Color(0xFFE3D1BF)),
                                    ),
                                    child: const Icon(
                                      Icons.headset_mic,
                                      color: Color(0xFF985018),
                                      size: 16,
                                    ),
                                  ),
                                  Expanded(
                                    child: Container(
                                      margin: const EdgeInsets.only(bottom: 12, right: 30),
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF3E2CE),
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            msg.text,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w400,
                                              color: Color(0xFF40352F),
                                              height: 1.4,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            msg.time,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w400,
                                              color: Color(0xFF40352F),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            }
                          }),

                          const SizedBox(height: 8),

                          // Thanh soạn tin nhắn
                          Row(
                            children: [
                              InkWell(
                                onTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Tính năng đính kèm tệp đang chuẩn bị.')),
                                  );
                                },
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  width: 44,
                                  height: 52,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFFE3D1BF), width: 1.0),
                                  ),
                                  child: const Icon(
                                    Icons.attach_file,
                                    color: Color(0xFF985018),
                                    size: 20,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Container(
                                  height: 52,
                                  padding: const EdgeInsets.symmetric(horizontal: 14),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFFE3D1BF), width: 1.0),
                                  ),
                                  child: TextField(
                                    controller: _msgController,
                                    onSubmitted: (_) => _sendMessage(),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      color: Color(0xFF40352F),
                                    ),
                                    decoration: const InputDecoration(
                                      hintText: 'Tin nhắn...',
                                      hintStyle: TextStyle(
                                        fontSize: 14,
                                        color: Color(0xFF6B6158),
                                      ),
                                      border: InputBorder.none,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              InkWell(
                                onTap: () => _sendMessage(),
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  width: 44,
                                  height: 52,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF3E2CE),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(
                                    Icons.send,
                                    color: Color(0xFF985018),
                                    size: 20,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // --- 5. THẺ THÔNG TIN LIÊN HỆ ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE3D1BF), width: 1.0),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Thông tin liên hệ',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF693B20),
                            ),
                          ),
                          SizedBox(height: 12),
                          Text(
                            'Đào tạo & hợp tác: 096.7786.399',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF40352F),
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Giờ hỗ trợ: 09:00–20:00 · Ví dụ',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              color: Color(0xFF40352F),
                            ),
                          ),
                          SizedBox(height: 12),
                          Divider(height: 1, color: Color(0xFFE3D1BF)),
                          SizedBox(height: 12),
                          Text(
                            'Chi nhánh Quận 3',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF40352F),
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            '123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              color: Color(0xFF40352F),
                            ),
                          ),
                          SizedBox(height: 12),
                          Text(
                            'Bộ phận CSKH MLD luôn sẵn sàng hỗ trợ quý khách từ 08:30 đến 20:30 hàng ngày.',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: Color(0xFF6B6158),
                              height: 1.4,
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
                  onPressed: _showBranchContactModal,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF985018),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Liên hệ chi nhánh',
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
