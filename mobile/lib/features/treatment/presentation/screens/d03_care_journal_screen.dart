import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/models/treatment_models.dart';
import '../../data/repositories/treatment_repository.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';

/// Screen D03: Nhật ký trị liệu chuẩn Y khoa MLD Việt Nam
/// - Đổi tên thành "Nhật ký trị liệu"
/// - Giữ lại duy nhất trang này, loại bỏ các trang con rườm rà (phiếu trước khám, hướng dẫn chăm sóc)
/// - Đồng bộ theo Design System #2860EB, dữ liệu lấy từ backend/database thực tế
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
    TreatmentRepository.instance.fetchCareJournal().then((_) {
      if (mounted) setState(() {});
    });
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
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. THẺ HỒ SƠ KHÁCH HÀNG & GÓI TRỊ LIỆU
              Builder(
                builder: (context) {
                  final profile = MembershipRepository.instance.profile;
                  final displayName = profile.fullName.trim().isNotEmpty ? profile.fullName : context.tr('Khách hàng MLD', 'MLD Customer');
                  final packageName = _repo.packages.isNotEmpty ? _repo.packages.first.packageName.tr(context) : context.tr('Chưa có gói liệu trình', 'No treatment package');
                  final completedCount = _repo.journalEntries.length;

                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
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
                                displayName,
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                packageName,
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '$completedCount ${context.tr("buổi hoàn thành", "sessions completed")}',
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),

              const SizedBox(height: 20),

              // 2. TIÊU ĐỀ LỊCH SỬ TRỊ LIỆU
              Text(
                context.tr('LỊCH SỬ TRỊ LIỆU', 'TREATMENT HISTORY'),
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 10),

              // 3. DANH SÁCH NHẬT KÝ THEO DÕI
              if (_repo.journalEntries.isEmpty)
                Container(
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
                        child: const Icon(Icons.menu_book_outlined, size: 28, color: AppColors.primary),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        context.tr('Chưa có nhật ký trị liệu', 'No care journal entries yet'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontFamily: 'Montserrat', fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        context.tr(
                          'Sau mỗi buổi trị liệu tại trung tâm, chuyên viên MLD sẽ ghi chép chi tiết kết quả phục hồi tại đây.',
                          'After each session at the center, MLD specialists will record your recovery results here.',
                        ),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontFamily: 'Montserrat', fontSize: 13, color: AppColors.textSecondary, height: 1.45),
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        height: 44,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const AllInOneBookingScreen()),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            elevation: 0,
                          ),
                          child: Text(
                            context.tr('Đặt lịch trị liệu ngay', 'Book Therapy Now'),
                            style: const TextStyle(fontFamily: 'Montserrat', color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              else
                ..._repo.journalEntries.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final item = entry.value;
                  final isLast = idx == _repo.journalEntries.length - 1;
                  return _buildTimelineItem(item, isLast);
                }),

              const SizedBox(height: 20),

              // 4. GHI CHÚ CÁ NHÂN
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
                    Text(
                      context.tr('Ghi chú cá nhân', 'Personal Notes'),
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _noteController,
                      maxLines: 3,
                      style: const TextStyle(fontFamily: 'Montserrat', fontSize: 13),
                      decoration: InputDecoration(
                        hintText: context.tr(
                          'Ghi lại cảm nhận cơ thể hoặc điều cần trao đổi ở buổi tiếp theo...',
                          'Record your body feeling or notes for the next session...',
                        ),
                        hintStyle: const TextStyle(fontFamily: 'Montserrat', fontSize: 13, color: AppColors.textPlaceholder),
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
    );
  }

  Widget _buildTimelineItem(CareJournalEntryModel item, bool isLast) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 32,
            child: Column(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: const BoxDecoration(
                    color: Color(0xFFEFF4FE),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(Icons.check_circle_rounded, size: 18, color: AppColors.primary),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: const Color(0xFFEFF4FE),
                      margin: const EdgeInsets.symmetric(vertical: 4),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        item.date,
                        style: const TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                      Text(
                        '${context.tr("Buổi", "Session")} ${item.sessionNumber}',
                        style: const TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.serviceTitle.tr(context),
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${context.tr("Chuyên viên:", "Specialist:")} ${item.specialistName.tr(context)}',
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 12.5,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item.sessionNote.tr(context),
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 13.5,
                      color: AppColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
