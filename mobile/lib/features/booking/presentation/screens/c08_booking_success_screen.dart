import 'package:flutter/material.dart';
import '../../data/models/booking_models.dart';
import '../../data/repositories/booking_repository.dart';
import '../widgets/booking_status_badge.dart';
import '../widgets/group_c_widgets.dart';
import 'c09_my_appointments_screen.dart';

/// Screen C08: Đặt lịch thành công [8111:27380]
class C08BookingSuccessScreen extends StatefulWidget {
  final BookingFlowState flowState;

  const C08BookingSuccessScreen({
    super.key,
    required this.flowState,
  });

  @override
  State<C08BookingSuccessScreen> createState() => _C08BookingSuccessScreenState();
}

class _C08BookingSuccessScreenState extends State<C08BookingSuccessScreen> {
  late String _bookingCode;

  @override
  void initState() {
    super.initState();
    _bookingCode = 'MLD-${DateTime.now().millisecondsSinceEpoch.toString().substring(6)}';

    // Lưu vào mock repository để đồng bộ với C09 và C10
    final newAppointment = AppointmentItemModel(
      id: 'apt-${DateTime.now().millisecondsSinceEpoch}',
      bookingCode: _bookingCode,
      serviceName: widget.flowState.allSelectedServices.isNotEmpty
          ? widget.flowState.allSelectedServices.first.name
          : 'Massage thư giãn toàn thân',
      serviceImage: 'assets/images/specialist_hero_1.png',
      durationMinutes: widget.flowState.totalDurationMinutes,
      branchName: widget.flowState.selectedBranch?.name ?? 'Chi nhánh Quận 3',
      branchAddress: widget.flowState.selectedBranch?.address ??
          '123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
      branchPhone: widget.flowState.selectedBranch?.phone ?? '0901 234 567',
      specialistName: widget.flowState.autoAssignSpecialist
          ? 'Hệ thống tự động sắp xếp'
          : (widget.flowState.selectedSpecialist?.name ?? 'Kỹ thuật viên chỉ định'),
      specialistTitle: widget.flowState.selectedSpecialist?.title ?? 'Kỹ thuật viên',
      specialistAvatar: widget.flowState.selectedSpecialist?.avatarUrl ??
          'assets/images/specialist_avatar_1.png',
      appointmentDate: widget.flowState.selectedDate,
      timeSlot: widget.flowState.selectedSlot?.time ?? '14:00–15:00',
      customerName: widget.flowState.customerName.isNotEmpty
          ? widget.flowState.customerName
          : 'Quý khách',
      customerPhone: widget.flowState.customerPhone.isNotEmpty
          ? widget.flowState.customerPhone
          : 'Chưa cập nhật',
      customerEmail: widget.flowState.customerEmail,
      specialNotes: widget.flowState.specialNotes,
      totalAmount: widget.flowState.servicePrice,
      depositAmount: widget.flowState.depositAmount,
      remainingAmount: widget.flowState.remainingAmount,
      paymentMethod: widget.flowState.paymentMethod == 'BANK_TRANSFER_QR'
          ? 'Chuyển khoản ngân hàng / QR'
          : widget.flowState.paymentMethod,
      status: AppointmentStatus.confirmed,
      createdAt: DateTime.now(),
      timeline: [
        BookingTimelineEvent(
          title: 'Đã tạo yêu cầu',
          timestamp: DateTime.now(),
          isCompleted: true,
        ),
        BookingTimelineEvent(
          title: 'Chờ xác nhận / thanh toán',
          timestamp: DateTime.now(),
          isCompleted: true,
        ),
        BookingTimelineEvent(
          title: 'Đã xác nhận',
          timestamp: DateTime.now(),
          isCompleted: true,
          isCurrent: true,
        ),
        const BookingTimelineEvent(
          title: 'Hoàn thành',
          isCompleted: false,
        ),
      ],
    );

    BookingRepository.instance.createAppointment(newAppointment);
  }

  String _formatCurrency(double amount) {
    return amount.toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]}.',
        );
  }

  @override
  Widget build(BuildContext context) {
    final serviceName = widget.flowState.allSelectedServices.isNotEmpty
        ? widget.flowState.allSelectedServices.first.name
        : 'Massage thư giãn toàn thân';
    final branchName = widget.flowState.selectedBranch?.name ?? 'Chi nhánh Quận 3';
    final specialistName = widget.flowState.autoAssignSpecialist
        ? 'Trần Minh Phương (Hệ thống sắp xếp)'
        : (widget.flowState.selectedSpecialist?.name ?? 'Trần Minh Phương');
    final customerName = widget.flowState.customerName.isNotEmpty
        ? widget.flowState.customerName
        : 'Nguyễn Minh Anh';
    final duration = widget.flowState.totalDurationMinutes;
    final total = widget.flowState.servicePrice;
    final deposit = widget.flowState.depositAmount;
    final remaining = widget.flowState.remainingAmount;

    final date = widget.flowState.selectedDate;
    final dateStr =
        '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    final timeStr = widget.flowState.selectedSlot?.time ?? '14:00–15:00';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        Navigator.of(context).popUntil((route) => route.isFirst);
      },
      child: Scaffold(
        backgroundColor: BookingColors.background,
        appBar: BookingAppBar(
          onBack: () => Navigator.of(context).popUntil((route) => route.isFirst),
        ),
        body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                children: [
                  const SizedBox(height: 8),
                  const BookingHeaderSection(
                    title: 'Đặt lịch thành công!',
                    subtitle:
                        'Cảm ơn bạn đã lựa chọn dịch vụ của chúng tôi. Hẹn gặp bạn trong buổi chăm sóc sắp tới.',
                    currentStep: 4, // Figma C08 là Bước 4: Hoàn tất
                  ),
                  const SizedBox(height: 8),

                  // Huy hiệu tròn xác nhận (80x80, r=40, fill=#F3E2CE, stroke=#C58D59)
                  Center(
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: BookingColors.cardWarm,
                        shape: BoxShape.circle,
                        border: Border.all(color: BookingColors.qrBorder, width: 2),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.check_circle_outline,
                          size: 40,
                          color: BookingColors.successText,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Ghi chú
                  const IllustrationNoteCard(
                    text: 'Lịch hẹn của bạn đã được ghi nhận. Vui lòng đến đúng giờ để được phục vụ chu đáo nhất.',
                  ),
                  const SizedBox(height: 24),

                  // Vé BookingSuccessTicket / Đã xác nhận (350x592, fill=white, r=20)
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: BookingColors.cardBorder, width: 1.0),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Badge Đã xác nhận
                        const BookingStatusBadge(
                          status: AppointmentStatus.confirmed,
                          isSimulated: true,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'MÃ LỊCH HẸN · $_bookingCode',
                          style: const TextStyle(
                            fontSize: 12,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          serviceName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 10),
                        _buildRow('Ngày hẹn', dateStr),
                        const SizedBox(height: 6),
                        _buildRow('Giờ hẹn', timeStr),
                        const SizedBox(height: 6),
                        Text(
                          branchName,
                          style: const TextStyle(
                            fontSize: 14,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Chuyên viên: $specialistName',
                          style: const TextStyle(
                            fontSize: 14,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Khách hàng: $customerName',
                          style: const TextStyle(
                            fontSize: 14,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$duration phút · Chi phí dịch vụ ${_formatCurrency(total)}đ',
                          style: const TextStyle(
                            fontSize: 12,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Đã thanh toán cọc ${_formatCurrency(deposit)}đ',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: BookingColors.successText,
                          ),
                        ),
                        const SizedBox(height: 6),
                        _buildRow('Còn thanh toán', '${_formatCurrency(remaining)}đ'),
                        const SizedBox(height: 14),

                        // CheckInQRCode (318x224, fill=#F3E2CE, r=20)
                        const CheckInQRCodeWidget(
                          note: 'Mã check-in dùng khi đến chi nhánh',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Thẻ Ghi chú
                  const IllustrationNoteCard(
                    text:
                        'Vui lòng đến trước giờ hẹn 10 phút. Đây là hướng dẫn ví dụ, có thể cấu hình theo chi nhánh.',
                  ),
                  const SizedBox(height: 24),

                  // Outline Button: Về trang chủ (h=56, r=14)
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.of(context).popUntil((route) => route.isFirst);
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: BookingColors.primary),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Về trang chủ',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Link: Thêm vào lịch (h=44, r=14)
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: TextButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Đã thêm lịch hẹn vào ứng dụng Lịch trên thiết bị .'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      style: TextButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Thêm vào lịch',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Button Về trang chủ
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: BookingColors.primary, width: 1.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Về trang chủ',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),

            // Fixed Bottom Bar chuẩn Figma
            BookingFixedBottomBar(
              buttonText: 'Xem lịch hẹn',
              onPressed: () {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()),
                );
              },
            ),
          ],
        ),
      ),
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            color: BookingColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            color: BookingColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
