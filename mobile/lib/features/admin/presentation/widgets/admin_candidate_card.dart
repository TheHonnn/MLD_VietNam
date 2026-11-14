import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';

class AdminCandidateCard extends StatelessWidget {
  final AdminCandidateModel candidate;
  final VoidCallback? onAssignBatch;
  final VoidCallback? onConfirmConsultation;
  final VoidCallback? onViewDetail;
  final bool isCompact;

  const AdminCandidateCard({
    super.key,
    required this.candidate,
    this.onAssignBatch,
    this.onConfirmConsultation,
    this.onViewDetail,
    this.isCompact = true,
  });

  String _formatPrice(double amount) {
    final formatter = NumberFormat('#,###', 'vi_VN');
    return '${formatter.format(amount)} ₫';
  }

  void _callCandidate(String phone) async {
    if (phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    Color badgeBg;
    Color badgeText;
    String badgeLabel;

    switch (candidate.status.toUpperCase()) {
      case 'CONSULTING':
      case 'PENDING':
      case 'PENDING_CONSULTATION':
      case 'PENDING_APPROVAL':
        badgeBg = const Color(0xFFFEF3C7);
        badgeText = const Color(0xFFD97706);
        badgeLabel = 'Chờ tư vấn';
        break;
      case 'DEPOSITED':
      case 'CONFIRMED':
      case 'CONFIRMED_PENDING_PAY':
        badgeBg = const Color(0xFFEFF4FE);
        badgeText = AppColors.primary;
        badgeLabel = 'Chờ nộp phí';
        break;
      case 'ENROLLED':
      case 'PAID':
      case 'PAID_WAITING_CLASS':
        badgeBg = const Color(0xFFFFE4E6);
        badgeText = const Color(0xFFE11D48);
        badgeLabel = 'CHỜ XẾP LỚP';
        break;
      case 'STUDYING':
      case 'ENROLLED_STUDYING':
        badgeBg = const Color(0xFFE8F6ED);
        badgeText = const Color(0xFF0D6832);
        badgeLabel = 'Đang theo học';
        break;
      case 'GRADUATED':
      case 'COMPLETED':
        badgeBg = const Color(0xFFF3F4F6);
        badgeText = const Color(0xFF4B5563);
        badgeLabel = 'Tốt nghiệp';
        break;
      case 'DROPPED':
        badgeBg = const Color(0xFFFEE2E2);
        badgeText = const Color(0xFFDC2626);
        badgeLabel = 'Bảo lưu';
        break;
      default:
        badgeBg = const Color(0xFFF3F4F6);
        badgeText = AppColors.textSecondary;
        badgeLabel = candidate.status;
    }

    final isPaidFull = candidate.tuitionTotal > 0 && candidate.amountPaid >= candidate.tuitionTotal;

    if (isCompact) {
      return Container(
        margin: const EdgeInsets.only(bottom: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: candidate.status == 'PAID_WAITING_CLASS'
                ? const Color(0xFFFDA4AF)
                : const Color(0xFFE5E7EB),
            width: candidate.status == 'PAID_WAITING_CLASS' ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 3,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: onViewDetail,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: badgeBg.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      candidate.candidateName.trim().isNotEmpty
                          ? candidate.candidateName.trim().split(' ').last[0].toUpperCase()
                          : 'H',
                      style: AppTypography.zaloFont(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: badgeText,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                candidate.candidateName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.zaloFont(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textHeading,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: badgeBg,
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text(
                                badgeLabel,
                                style: AppTypography.zaloFont(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                  color: badgeText,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${candidate.candidatePhone.isNotEmpty ? "${candidate.candidatePhone} · " : ""}${candidate.courseTitle}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.zaloFont(
                                  fontSize: 10.5,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                            Text(
                              _formatPrice(candidate.amountPaid),
                              style: AppTypography.zaloFont(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: isPaidFull ? const Color(0xFF00693F) : const Color(0xFFD97706),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  if (candidate.status == 'PAID_WAITING_CLASS' && onAssignBatch != null)
                    InkWell(
                      onTap: onAssignBatch,
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00693F),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Xếp lớp',
                          style: AppTypography.zaloFont(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    )
                  else if (candidate.candidatePhone.isNotEmpty)
                    InkWell(
                      onTap: () => _callCandidate(candidate.candidatePhone),
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F6ED),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(Icons.phone_rounded, color: Color(0xFF0D6832), size: 14),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: candidate.status == 'PAID_WAITING_CLASS'
              ? const Color(0xFFFDA4AF)
              : const Color(0xFFE5E7EB),
          width: candidate.status == 'PAID_WAITING_CLASS' ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onViewDetail,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
          // 1. Header Card: Mã đơn + Trạng thái
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        candidate.orderCode,
                        style: AppTypography.zaloFont(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF4B5563),
                        ),
                      ),
                    ),
                    if (candidate.batchCode != null && candidate.batchCode!.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F6ED),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Lớp: ${candidate.batchCode}',
                          style: AppTypography.zaloFont(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0D6832),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: badgeBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    badgeLabel,
                    style: AppTypography.zaloFont(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: badgeText,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFF3F4F6)),

          // 2. Thông tin học viên & Khóa học
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: const Color(0xFFEBF5FB),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.school_rounded, size: 20, color: Color(0xFF1B4F72)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  candidate.candidateName,
                                  style: AppTypography.zaloFont(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textHeading,
                                  ),
                                ),
                                if (candidate.candidatePhone.isNotEmpty)
                                  Text(
                                    candidate.candidatePhone,
                                    style: AppTypography.zaloFont(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (candidate.candidatePhone.isNotEmpty)
                      IconButton(
                        tooltip: 'Gọi tư vấn học viên',
                        onPressed: () => _callCandidate(candidate.candidatePhone),
                        icon: Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F6ED),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.phone_rounded, color: Color(0xFF0D6832), size: 17),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),

                // Tên khóa học
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF3F4F6)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.menu_book_rounded, size: 16, color: Color(0xFF00693F)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          candidate.courseTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.zaloFont(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textHeading,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // Học phí & Tiền đã nộp
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Học phí: ${_formatPrice(candidate.tuitionTotal)}',
                      style: AppTypography.zaloFont(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    Row(
                      children: [
                        Text(
                          'Đã nộp: ',
                          style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textSecondary),
                        ),
                        Text(
                          _formatPrice(candidate.amountPaid),
                          style: AppTypography.zaloFont(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isPaidFull ? const Color(0xFF00693F) : const Color(0xFFD97706),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 3. Nút Thao tác theo luồng
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFFFAFAFA),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (onViewDetail != null)
                  TextButton(
                    onPressed: onViewDetail,
                    child: Text(
                      'Xem hồ sơ',
                      style: AppTypography.zaloFont(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  )
                else
                  const SizedBox(),

                // Nút hành động chính
                if (candidate.status == 'PAID_WAITING_CLASS')
                  ElevatedButton.icon(
                    onPressed: onAssignBatch,
                    icon: const Icon(Icons.group_add_rounded, size: 16),
                    label: Text(
                      'Xếp lớp ngay',
                      style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00693F),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  )
                else if (candidate.status == 'PENDING_CONSULTATION')
                  ElevatedButton.icon(
                    onPressed: onConfirmConsultation,
                    icon: const Icon(Icons.check_rounded, size: 16),
                    label: Text(
                      'Đã tư vấn',
                      style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  )
                else if (candidate.status == 'ENROLLED_STUDYING')
                  OutlinedButton.icon(
                    onPressed: onAssignBatch,
                    icon: const Icon(Icons.swap_horiz_rounded, size: 15),
                    label: Text(
                      'Đổi lớp',
                      style: AppTypography.zaloFont(fontSize: 11.5, fontWeight: FontWeight.w600),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF00693F),
                      side: const BorderSide(color: Color(0xFF00693F)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  )
                else
                  const SizedBox(),
              ],
            ),
          ),
            ],
          ),
        ),
      ),
    );
  }
}

