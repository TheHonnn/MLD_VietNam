import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/launcher_helper.dart';
import '../../data/models/booking_models.dart';
import '../../data/repositories/booking_repository.dart';
import '../widgets/booking_status_badge.dart';
import '../widgets/cancel_booking_dialog.dart';

/// Screen C10: Chi tiết lịch hẹn - Tinh giản chuẩn Design System (#2860EB)
class C10AppointmentDetailScreen extends StatefulWidget {
  final String appointmentId;

  const C10AppointmentDetailScreen({
    super.key,
    required this.appointmentId,
  });

  @override
  State<C10AppointmentDetailScreen> createState() => _C10AppointmentDetailScreenState();
}

class _C10AppointmentDetailScreenState extends State<C10AppointmentDetailScreen> {
  final BookingRepository _repo = BookingRepository.instance;
  late AppointmentItemModel? _appointment;

  @override
  void initState() {
    super.initState();
    _loadAppointment();
  }

  void _loadAppointment() {
    _appointment = _repo.getAppointmentById(widget.appointmentId);
  }

  void _onCancel() {
    if (_appointment == null) return;
    showDialog(
      context: context,
      builder: (_) => CancelBookingDialog(
        appointment: _appointment!,
        onConfirmCancel: (reason) async {
          final success = await _repo.cancelAppointment(_appointment!.id, reason);
          if (mounted) {
            setState(() {
              _loadAppointment();
            });
            if (success) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Đã hủy lịch hẹn theo yêu cầu'),
                  backgroundColor: AppColors.primary,
                ),
              );
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Không thể hủy lịch hẹn. Vui lòng thử lại!'),
                  backgroundColor: AppColors.error,
                ),
              );
            }
          }
        },
      ),
    );
  }

  String _formatPrice(double price) {
    return '${price.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')}đ';
  }

  String _formatDate(DateTime d) {
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  int _getProgressStep(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.pending:
        return 1;
      case AppointmentStatus.confirmed:
        return 2;
      case AppointmentStatus.inService:
        return 3;
      case AppointmentStatus.completed:
        return 4;
      case AppointmentStatus.cancelled:
        return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_appointment == null) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.textPrimary),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text('Chi tiết lịch hẹn'),
        ),
        body: const Center(child: Text('Không tìm thấy thông tin lịch hẹn.')),
      );
    }

    final app = _appointment!;
    final step = _getProgressStep(app.status);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Chi tiết lịch hẹn',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Card: Mã & Trạng thái
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Mã lịch hẹn', style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary)),
                        const SizedBox(height: 2),
                        Text(
                          app.bookingCode,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    BookingStatusBadge(status: app.status),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // ==========================================
              // TIẾN TRÌNH TRỊ LIỆU TỐI GIẢN (Mục 5.4)
              // ==========================================
              if (app.status != AppointmentStatus.cancelled) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Tiến trình',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          _buildTimelineStep(1, 'Đã đặt', step >= 1),
                          _buildTimelineConnector(step >= 2),
                          _buildTimelineStep(2, 'Xác nhận', step >= 2),
                          _buildTimelineConnector(step >= 3),
                          _buildTimelineStep(3, 'Thực hiện', step >= 3),
                          _buildTimelineConnector(step >= 4),
                          _buildTimelineStep(4, 'Hoàn thành', step >= 4),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // ==========================================
              // NHÓM 1: THÔNG TIN DỊCH VỤ (Mục 5.3)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Thông tin dịch vụ',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 12),
                    _buildDetailRow('Dịch vụ:', app.serviceName),
                    _buildDetailRow('Chi nhánh:', app.branchName),
                    _buildDetailRow('Địa chỉ:', app.branchAddress),
                    _buildDetailRow('Thời gian:', '${app.timeSlot} · ${_formatDate(app.appointmentDate)}'),
                    if (app.specialistName.isNotEmpty && !app.specialistName.contains('ngẫu nhiên'))
                      _buildDetailRow('Chuyên viên:', app.specialistName),
                    if (app.specialNotes.isNotEmpty)
                      _buildDetailRow('Ghi chú:', app.specialNotes),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // ==========================================
              // NHÓM 2: THÔNG TIN CHI PHÍ (Mục 5.3)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Thông tin chi phí',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 12),
                    _buildDetailRow('Dịch vụ:', app.serviceName),
                    _buildDetailRow('Đơn giá:', _formatPrice(app.totalAmount / 1.08)),
                    _buildDetailRow('Thuế VAT (8%):', _formatPrice(app.totalAmount - (app.totalAmount / 1.08))),
                    const Divider(color: AppColors.border, height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Tổng chi phí:',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                        ),
                        Text(
                          _formatPrice(app.totalAmount),
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF00693F),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.payment_rounded, size: 15, color: AppColors.textSecondary),
                        const SizedBox(width: 6),
                        Text(
                          'Thanh toán: ${app.paymentMethod.isNotEmpty ? app.paymentMethod : "Tại cơ sở / QR"}',
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // NÚT HÀNH ĐỘNG
              // Nút Hotline
              SizedBox(
                height: 48,
                child: OutlinedButton.icon(
                  onPressed: () => AppLauncherHelper.makePhoneCall(context, '0967786399'),
                  icon: const Icon(Icons.phone_in_talk_rounded, size: 18, color: AppColors.primary),
                  label: const Text('Hotline hỗ trợ: 096.7786.399', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.primary)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),

              // Nút Hủy lịch nếu có thể hủy
              if (app.status == AppointmentStatus.confirmed || app.status == AppointmentStatus.pending) ...[
                const SizedBox(height: 10),
                SizedBox(
                  height: 46,
                  child: TextButton(
                    onPressed: _onCancel,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.error,
                    ),
                    child: const Text('Hủy lịch hẹn này', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(label, style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineStep(int stepNum, String title, bool isCompleted) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: isCompleted ? AppColors.primary : const Color(0xFFF3F4F6),
            shape: BoxShape.circle,
            border: Border.all(
              color: isCompleted ? AppColors.primary : AppColors.border,
            ),
          ),
          child: Center(
            child: isCompleted
                ? const Icon(Icons.check, size: 14, color: Colors.white)
                : Text('$stepNum', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          title,
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: isCompleted ? FontWeight.w700 : FontWeight.w500,
            color: isCompleted ? AppColors.primary : AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineConnector(bool isCompleted) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 16),
        color: isCompleted ? AppColors.primary : AppColors.border,
      ),
    );
  }
}
