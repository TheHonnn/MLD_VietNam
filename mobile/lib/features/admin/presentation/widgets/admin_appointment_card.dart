import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';

class AdminAppointmentCard extends StatelessWidget {
  final AdminBookingModel booking;
  final VoidCallback? onApprove;
  final VoidCallback? onCancel;
  final VoidCallback? onCheckIn;
  final VoidCallback? onStartService;
  final VoidCallback? onCheckOut;
  final VoidCallback? onViewDetail;
  final bool isProcessing;
  final bool isCompact;

  const AdminAppointmentCard({
    super.key,
    required this.booking,
    this.onApprove,
    this.onCancel,
    this.onCheckIn,
    this.onStartService,
    this.onCheckOut,
    this.onViewDetail,
    this.isProcessing = false,
    this.isCompact = false,
  });

  String _formatPrice(double amount) {
    final formatter = NumberFormat('#,###', 'vi_VN');
    return '${formatter.format(amount)} ₫';
  }

  String _formatTimeOnly(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoString);
      return DateFormat('HH:mm').format(dt);
    } catch (_) {
      return '';
    }
  }

  void _callCustomer(String phone) async {
    if (phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    Color statusBg;
    Color statusText;
    String statusLabel;
    IconData statusIcon;

    switch (booking.status) {
      case 'PENDING':
        statusBg = const Color(0xFFFEF3C7);
        statusText = const Color(0xFFD97706);
        statusLabel = 'Chờ duyệt';
        statusIcon = Icons.hourglass_top_rounded;
        break;
      case 'CONFIRMED':
        statusBg = const Color(0xFFEFF4FE);
        statusText = AppColors.primary;
        statusLabel = 'Đã xác nhận';
        statusIcon = Icons.check_circle_outline_rounded;
        break;
      case 'CHECKED_IN':
        statusBg = const Color(0xFFE8F6ED);
        statusText = const Color(0xFF0D6832);
        statusLabel = 'Đã tiếp đón';
        statusIcon = Icons.how_to_reg_rounded;
        break;
      case 'IN_SERVICE':
        statusBg = const Color(0xFFF3E8FF);
        statusText = const Color(0xFF7E22CE);
        statusLabel = 'Đang phục vụ';
        statusIcon = Icons.spa_rounded;
        break;
      case 'COMPLETED':
        statusBg = const Color(0xFFF3F4F6);
        statusText = const Color(0xFF4B5563);
        statusLabel = 'Đã hoàn thành';
        statusIcon = Icons.task_alt_rounded;
        break;
      case 'CANCELLED':
        statusBg = const Color(0xFFFEE2E2);
        statusText = const Color(0xFFDC2626);
        statusLabel = 'Đã hủy';
        statusIcon = Icons.cancel_outlined;
        break;
      default:
        statusBg = const Color(0xFFF3F4F6);
        statusText = AppColors.textSecondary;
        statusLabel = booking.status;
        statusIcon = Icons.info_outline_rounded;
    }

    if (isCompact) {
      return Container(
        margin: const EdgeInsets.only(bottom: 5),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: booking.status == 'PENDING'
                ? const Color(0xFFFCD34D)
                : const Color(0xFFE5E7EB),
            width: booking.status == 'PENDING' ? 1.5 : 1,
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
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
              child: Row(
                children: [
                  // Giờ hẹn
                  Container(
                    width: 46,
                    height: 32,
                    decoration: BoxDecoration(
                      color: statusBg.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      booking.startTime.isNotEmpty ? booking.startTime : '09:00',
                      style: AppTypography.zaloFont(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: statusText,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Thông tin khách & Dịch vụ
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: RichText(
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                text: TextSpan(
                                  children: [
                                    TextSpan(
                                      text: booking.customerName,
                                      style: AppTypography.zaloFont(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.textHeading,
                                      ),
                                    ),
                                    if (booking.customerPhone.isNotEmpty) ...[
                                      TextSpan(
                                        text: ' · ${booking.customerPhone}',
                                        style: AppTypography.zaloFont(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w400,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: statusBg,
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text(
                                statusLabel,
                                style: AppTypography.zaloFont(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                  color: statusText,
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
                                '${booking.serviceName}${booking.technicianName != null ? " · ${booking.technicianName}" : ""}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.zaloFont(
                                  fontSize: 10.5,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                            Text(
                              _formatPrice(booking.finalPrice),
                              style: AppTypography.zaloFont(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF00693F),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Nút thao tác nhanh 1 chạm
                  if (isProcessing)
                    const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                    )
                  else if (booking.status == 'PENDING' && onApprove != null)
                    InkWell(
                      onTap: onApprove,
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD97706),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Duyệt',
                          style: AppTypography.zaloFont(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    )
                  else if (booking.status == 'CONFIRMED' && onCheckIn != null)
                    InkWell(
                      onTap: onCheckIn,
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Tiếp đón',
                          style: AppTypography.zaloFont(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    )
                  else if (booking.status == 'CHECKED_IN' && onStartService != null)
                    InkWell(
                      onTap: onStartService,
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF7E22CE),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Bắt đầu',
                          style: AppTypography.zaloFont(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    )
                  else if (booking.status == 'IN_SERVICE' && onCheckOut != null)
                    InkWell(
                      onTap: onCheckOut,
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00693F),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Xong',
                          style: AppTypography.zaloFont(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    )
                  else if (booking.customerPhone.isNotEmpty)
                    InkWell(
                      onTap: () => _callCustomer(booking.customerPhone),
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
          color: booking.status == 'PENDING'
              ? const Color(0xFFFCD34D)
              : const Color(0xFFE5E7EB),
          width: booking.status == 'PENDING' ? 1.5 : 1,
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
          // 1. Header Card: Giờ hẹn + Trạng thái
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF4FE),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.access_time_rounded, size: 14, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Text(
                            booking.startTime.isNotEmpty
                                ? '${booking.startTime} - ${booking.endTime}'
                                : 'Lịch hẹn',
                            style: AppTypography.zaloFont(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      booking.bookingCode,
                      style: AppTypography.zaloFont(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF9CA3AF),
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 12, color: statusText),
                      const SizedBox(width: 4),
                      Text(
                        statusLabel,
                        style: AppTypography.zaloFont(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: statusText,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFF3F4F6)),

          // 2. Nội dung ca hẹn: Khách hàng & Dịch vụ
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Khách hàng & Nút gọi điện
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.person_rounded, size: 20, color: Color(0xFF6B7280)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  booking.customerName,
                                  style: AppTypography.zaloFont(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textHeading,
                                  ),
                                ),
                                if (booking.customerPhone.isNotEmpty)
                                  Text(
                                    booking.customerPhone,
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
                    if (booking.customerPhone.isNotEmpty)
                      IconButton(
                        tooltip: 'Gọi điện thoại',
                        onPressed: () => _callCustomer(booking.customerPhone),
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
                const SizedBox(height: 12),

                // Tên Dịch vụ & Giá tiền
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF3F4F6)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            const Icon(Icons.spa_rounded, size: 15, color: Color(0xFFE11D48)),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                booking.serviceName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.zaloFont(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textHeading,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        _formatPrice(booking.finalPrice),
                        style: AppTypography.zaloFont(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFFE11D48),
                        ),
                      ),
                    ],
                  ),
                ),

                // Thông tin KTV & Phòng trị liệu (nếu có)
                if ((booking.technicianName != null && booking.technicianName!.isNotEmpty) ||
                    (booking.roomName != null && booking.roomName!.isNotEmpty)) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      if (booking.technicianName != null && booking.technicianName!.isNotEmpty) ...[
                        const Icon(Icons.badge_rounded, size: 13, color: Color(0xFF9CA3AF)),
                        const SizedBox(width: 4),
                        Text(
                          'KTV: ${booking.technicianName}',
                          style: AppTypography.zaloFont(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(width: 12),
                      ],
                      if (booking.roomName != null && booking.roomName!.isNotEmpty) ...[
                        const Icon(Icons.meeting_room_rounded, size: 13, color: Color(0xFF9CA3AF)),
                        const SizedBox(width: 4),
                        Text(
                          'Phòng: ${booking.roomName}',
                          style: AppTypography.zaloFont(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],

                // Dòng mốc thời gian tiếp đón (nếu đã qua check-in)
                if (booking.checkedInAt != null) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.history_toggle_off_rounded, size: 13, color: Color(0xFF9CA3AF)),
                      const SizedBox(width: 4),
                      Text(
                        'Tiếp đón lúc ${_formatTimeOnly(booking.checkedInAt)}${booking.serviceStartedAt != null ? ' · Bắt đầu lúc ${_formatTimeOnly(booking.serviceStartedAt)}' : ''}${booking.checkedOutAt != null ? ' · Xong lúc ${_formatTimeOnly(booking.checkedOutAt)}' : ''}',
                        style: AppTypography.zaloFont(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF6B7280),
                        ),
                      ),
                    ],
                  ),
                ],

                // Dòng lý do hủy nếu bị hủy
                if (booking.status == 'CANCELLED' && booking.cancellationReason != null && booking.cancellationReason!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.info_outline_rounded, size: 13, color: Color(0xFFDC2626)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          'Lý do hủy: ${booking.cancellationReason}',
                          style: AppTypography.zaloFont(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: const Color(0xFFDC2626),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          // 3. Thanh Nút Thao tác Tiến trình (Action Buttons)
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
                  TextButton.icon(
                    onPressed: onViewDetail,
                    icon: const Icon(Icons.visibility_outlined, size: 15),
                    label: Text(
                      'Chi tiết',
                      style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      minimumSize: Size.zero,
                    ),
                  )
                else
                  const SizedBox(),

                // Nút hành động chính theo luồng
                _buildWorkflowButton(),
              ],
            ),
          ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWorkflowButton() {
    if (isProcessing) {
      return const SizedBox(
        width: 24,
        height: 24,
        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
      );
    }

    switch (booking.status) {
      case 'PENDING':
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (onCancel != null) ...[
              OutlinedButton.icon(
                onPressed: onCancel,
                icon: const Icon(Icons.close_rounded, size: 14),
                label: Text(
                  'Hủy',
                  style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFDC2626),
                  side: const BorderSide(color: Color(0xFFFCA5A5)),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(width: 8),
            ],
            ElevatedButton.icon(
              onPressed: onApprove,
              icon: const Icon(Icons.check_rounded, size: 16),
              label: Text(
                'Duyệt lịch',
                style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        );

      case 'CONFIRMED':
        return ElevatedButton.icon(
          onPressed: onCheckIn,
          icon: const Icon(Icons.how_to_reg_rounded, size: 16),
          label: Text(
            'Tiếp đón Check-in',
            style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF00693F),
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );

      case 'CHECKED_IN':
        return ElevatedButton.icon(
          onPressed: onStartService,
          icon: const Icon(Icons.play_arrow_rounded, size: 16),
          label: Text(
            'Bắt đầu dịch vụ',
            style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF7E22CE),
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );

      case 'IN_SERVICE':
        return ElevatedButton.icon(
          onPressed: onCheckOut,
          icon: const Icon(Icons.logout_rounded, size: 16),
          label: Text(
            'Hoàn thành Check-out',
            style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF2563EB),
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );

      case 'COMPLETED':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFFE8F6ED),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF0D6832)),
              const SizedBox(width: 4),
              Text(
                'Đã hoàn tất',
                style: AppTypography.zaloFont(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF0D6832),
                ),
              ),
            ],
          ),
        );

      case 'CANCELLED':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFFFEE2E2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cancel_outlined, size: 14, color: Color(0xFFDC2626)),
              const SizedBox(width: 4),
              Text(
                'Đã hủy lịch',
                style: AppTypography.zaloFont(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFFDC2626),
                ),
              ),
            ],
          ),
        );

      default:
        return const SizedBox();
    }
  }
}
