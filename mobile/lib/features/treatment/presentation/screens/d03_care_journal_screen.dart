import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../../services/presentation/screens/b02_service_listing_screen.dart';
import '../../data/models/treatment_models.dart';
import '../../data/repositories/treatment_repository.dart';

/// Screen D03: Nhật ký trị liệu chuẩn Y khoa MLD Việt Nam
/// - Xâu chuỗi minh chứng tiến trình: Tên dịch vụ, Buổi 1 (nội dung + hình ảnh) -> Buổi 2 -> Buổi cuối
/// - Trực quan hóa sự thay đổi và phục hồi của cơ thể qua từng giai đoạn
/// - Tuyệt đối KHÔNG có dữ liệu demo giả mạo (Zero mock data); tải từ Backend/Database
class D03CareJournalScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const D03CareJournalScreen({
    super.key,
    this.onBack,
  });

  @override
  State<D03CareJournalScreen> createState() => _D03CareJournalScreenState();
}

class _D03CareJournalScreenState extends State<D03CareJournalScreen> {
  final TreatmentRepository _repo = TreatmentRepository.instance;
  final TextEditingController _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadJournal();
  }

  Future<void> _loadJournal() async {
    await _repo.fetchCareJournal();
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  void _savePersonalNote() {
    if (_noteController.text.trim().isEmpty) return;
    setState(() {
      _repo.addJournalNote(_noteController.text.trim());
      _noteController.clear();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          context.tr('Đã lưu ghi chú vào nhật ký trị liệu!', 'Note saved to care journal!'),
          style: const TextStyle(fontFamily: 'Montserrat'),
        ),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final canGoBack = widget.onBack != null || Navigator.of(context).canPop();
    final profile = MembershipRepository.instance.profile;
    final customerDisplayName = profile.fullName.trim().isNotEmpty
        ? profile.fullName
        : context.tr('Khách hàng MLD', 'MLD Customer');

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: canGoBack
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.textPrimary),
                onPressed: () {
                  if (widget.onBack != null) {
                    widget.onBack!();
                  } else {
                    Navigator.of(context).pop();
                  }
                },
              )
            : null,
        title: Text(
          context.tr('Nhật ký trị liệu', 'Care Journal'),
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadJournal,
          color: AppColors.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ==========================================
                // 1. THẺ HỒ SƠ KHÁCH HÀNG & THỐNG KÊ
                // ==========================================
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: const BoxDecoration(
                          color: Color(0xFFEFF4FE),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Icon(Icons.person_outline_rounded, color: AppColors.primary, size: 24),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              customerDisplayName,
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${_repo.journalEntries.length} ${context.tr("buổi điều trị đã ghi nhận", "recorded sessions")}',
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 12.5,
                                fontWeight: FontWeight.w500,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // ==========================================
                // 2. BANNER XÂU CHUỖI MINH CHỨNG TIẾN TRÌNH
                // ==========================================
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFEFF4FE), Color(0xFFF0FDF4)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Icon(Icons.auto_graph_rounded, color: AppColors.primary, size: 22),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr('Xâu chuỗi minh chứng tiến trình', 'Evidence Transformation Chain'),
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 14.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              context.tr(
                                'Theo dõi sự thay đổi của cơ thể, mức độ thuyên giảm phù nề và kết quả hồi phục qua từng buổi điều trị liên tiếp.',
                                'Track bodily transformation, edema reduction, and recovery outcomes across consecutive therapy sessions.',
                              ),
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 12.5,
                                color: AppColors.textSecondary,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // ==========================================
                // 3. TIÊU ĐỀ LỘ TRÌNH XÂU CHUỖI
                // ==========================================
                Text(
                  context.tr('TIẾN TRÌNH & MINH CHỨNG TỪNG BUỔI', 'SESSION EVIDENCE TIMELINE'),
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 12),

                // ==========================================
                // 4. DANH SÁCH XÂU CHUỖI MINH CHỨNG
                // ==========================================
                if (_repo.journalEntries.isEmpty)
                  _buildEmptyState()
                else
                  _buildEvidenceChain(),

                const SizedBox(height: 24),

                // ==========================================
                // 5. GHI CHÚ CÁ NHÂN CỦA KHÁCH HÀNG
                // ==========================================
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
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
                      Row(
                        children: [
                          const Icon(Icons.edit_note_rounded, size: 20, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              context.tr('Ghi chú cảm nhận cá nhân', 'Personal Feeling Notes'),
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 14.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _noteController,
                        maxLines: 3,
                        style: const TextStyle(fontFamily: 'Montserrat', fontSize: 13),
                        decoration: InputDecoration(
                          hintText: context.tr(
                            'Ghi lại cảm nhận cơ thể, mức độ nhẹ nhàng hoặc điều muốn trao đổi với chuyên viên ở buổi tiếp theo...',
                            'Record your body sensation, lightness, or notes for the specialist in the next session...',
                          ),
                          hintStyle: const TextStyle(fontFamily: 'Montserrat', fontSize: 12.5, color: AppColors.textPlaceholder),
                          filled: true,
                          fillColor: const Color(0xFFF9FAFB),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: AppColors.border),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: AppColors.border),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: AppColors.primary),
                          ),
                          contentPadding: const EdgeInsets.all(12),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerRight,
                        child: ElevatedButton(
                          onPressed: _savePersonalNote,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                            elevation: 0,
                          ),
                          child: Text(
                            context.tr('Lưu ghi chú', 'Save Note'),
                            style: const TextStyle(fontFamily: 'Montserrat', color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Empty State trang nhã chuẩn Y khoa khi chưa có dữ liệu nhật ký
  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(
              color: Color(0xFFEFF4FE),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.timeline_rounded, size: 28, color: AppColors.primary),
          ),
          const SizedBox(height: 14),
          Text(
            context.tr('Chưa có nhật ký & minh chứng trị liệu', 'No care journal entries yet'),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            context.tr(
              'Sau mỗi buổi điều trị tại trung tâm MLD Vietnam, chuyên viên sẽ cập nhật nội dung lâm sàng và hình ảnh minh chứng để xâu chuỗi sự thay đổi của bạn tại đây.',
              'After each therapy session at MLD Vietnam, specialists will record clinical notes and evidence photos to chain your transformation here.',
            ),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 44,
            child: ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const B02ServiceListingScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 24),
              ),
              child: Text(
                context.tr('Khám phá dịch vụ trị liệu', 'Explore Therapy Services'),
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  color: Colors.white,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Xây dựng chuỗi minh chứng liên hoàn qua từng buổi
  Widget _buildEvidenceChain() {
    // Sắp xếp các buổi từ buổi 1 đến buổi cuối
    final entries = List<CareJournalEntryModel>.from(_repo.journalEntries)
      ..sort((a, b) => a.sessionNumber.compareTo(b.sessionNumber));

    return Column(
      children: List.generate(entries.length, (index) {
        final item = entries[index];
        final isLast = index == entries.length - 1;
        final nextSessionNumber = isLast ? null : entries[index + 1].sessionNumber;

        return _buildChainNode(item, isLast, nextSessionNumber);
      }),
    );
  }

  /// Một mắt xích trong chuỗi minh chứng tiến trình
  Widget _buildChainNode(CareJournalEntryModel item, bool isLast, int? nextSessionNumber) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Trục xâu chuỗi thời gian bên trái
          SizedBox(
            width: 40,
            child: Column(
              children: [
                // Node đánh số buổi
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF4FE),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.primary, width: 2),
                  ),
                  child: Center(
                    child: Text(
                      'B${item.sessionNumber}',
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ),
                // Đường line dọc nối các buổi
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2.5,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),

          // Khối nội dung + hình ảnh minh chứng của buổi đó
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header buổi: Tên dịch vụ & Ngày giờ
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF4FE),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${context.tr("Buổi", "Session")} ${item.sessionNumber}',
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          Text(
                            item.treatmentTime,
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Tên dịch vụ
                      Row(
                        children: [
                          const Icon(Icons.spa_rounded, size: 16, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              item.serviceName.tr(context),
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${context.tr("Kỹ thuật viên:", "Specialist:")} ${item.specialistName.tr(context)} · ${item.branchName.tr(context)}',
                        style: const TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 10),

                      // 1. NỘI DUNG CỦA BUỔI ĐÓ
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr('Nội dung điều trị:', 'Clinical Notes:'),
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              item.content.tr(context),
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

                      // 2. HÌNH ẢNH MINH CHỨNG CỦA BUỔI ĐÓ
                      if (item.evidenceImages.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.photo_library_outlined, size: 14, color: AppColors.primary),
                            const SizedBox(width: 4),
                            Text(
                              '${context.tr("Hình ảnh minh chứng Buổi", "Evidence Images Session")} ${item.sessionNumber} (${item.evidenceImages.length})',
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 80,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: item.evidenceImages.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 8),
                            itemBuilder: (ctx, idx) {
                              final imgUrl = item.evidenceImages[idx];
                              return InkWell(
                                onTap: () => _openImageViewer(ctx, imgUrl),
                                borderRadius: BorderRadius.circular(8),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: SizedBox(
                                    width: 80,
                                    height: 80,
                                    child: _buildImageWidget(imgUrl),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],

                      // Lời khuyên chăm sóc sau buổi
                      if (item.postCareSuggestion != null && item.postCareSuggestion!.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.tips_and_updates_outlined, size: 14, color: Color(0xFFD97706)),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                '${context.tr("Chăm sóc tại nhà:", "Home Care:")} ${item.postCareSuggestion!}',
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 11.5,
                                  color: Color(0xFF92400E),
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),

                // 3. CHỈ BÁO XÂU CHUỖI SỰ THAY ĐỔI SANG BUỔI TIẾP THEO
                if (!isLast && nextSessionNumber != null) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF4FE),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.arrow_downward_rounded, size: 14, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              '${context.tr("Tiến triển phục hồi", "Recovery progress")} ➔ ${context.tr("Xâu chuỗi sang Buổi", "Chained into Session")} $nextSessionNumber',
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ] else
                  const SizedBox(height: 14),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageWidget(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return Image.network(
        path,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackImage(),
        loadingBuilder: (_, child, progress) {
          if (progress == null) return child;
          return const Center(child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary));
        },
      );
    }
    return Image.asset(
      path,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => _buildFallbackImage(),
    );
  }

  Widget _buildFallbackImage() {
    return Container(
      color: const Color(0xFFEFF4FE),
      child: const Center(
        child: Icon(Icons.image_not_supported_outlined, color: AppColors.primary, size: 24),
      ),
    );
  }

  void _openImageViewer(BuildContext context, String imageUrl) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.black.withValues(alpha: 0.9),
        insetPadding: EdgeInsets.zero,
        child: Stack(
          children: [
            Center(
              child: InteractiveViewer(
                panEnabled: true,
                minScale: 0.5,
                maxScale: 4.0,
                child: _buildImageWidget(imageUrl),
              ),
            ),
            Positioned(
              top: 40,
              right: 16,
              child: IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
