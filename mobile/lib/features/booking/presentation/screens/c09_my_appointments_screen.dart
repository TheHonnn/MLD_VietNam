import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/booking_models.dart';
import '../../data/repositories/booking_repository.dart';
import '../widgets/booking_status_badge.dart';
import 'all_in_one_booking_screen.dart';
import 'c10_appointment_detail_screen.dart';

/// Screen C09: Lịch hẹn của tôi - Tinh giản chuẩn Design System (#2860EB)
class C09MyAppointmentsScreen extends StatefulWidget {
  final int initialTabIndex; // 0: Sắp tới, 1: Đã hoàn thành

  const C09MyAppointmentsScreen({
    super.key,
    this.initialTabIndex = 0,
  });

  @override
  State<C09MyAppointmentsScreen> createState() => _C09MyAppointmentsScreenState();
}

class _C09MyAppointmentsScreenState extends State<C09MyAppointmentsScreen> {
  late int _selectedTab;
  final BookingRepository _repo = BookingRepository.instance;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _selectedTab = widget.initialTabIndex;
    _loadAppointments();
  }

  Future<void> _loadAppointments() async {
    setState(() => _isLoading = true);
    await _repo.fetchMyAppointments();
    if (mounted) setState(() => _isLoading = false);
  }

  List<AppointmentItemModel> _getCurrentAppointments() {
    if (_selectedTab == 0) {
      return _repo.getUpcomingAppointments();
    } else {
      return _repo.getCompletedAppointments();
    }
  }

  String _formatCurrency(double val) {
    return '${val.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')}đ';
  }

  String _formatDate(DateTime d) {
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  @override
  Widget build(BuildContext context) {
    final upcomingList = _repo.getUpcomingAppointments();
    final completedList = _repo.getCompletedAppointments();
    final appointments = _getCurrentAppointments();

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
          'Lịch hẹn của tôi',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // ==========================================
            // BỘ LỌC TRẠNG THÁI: 2 TAB CHÍNH (Sắp tới & Đã hoàn thành)
            // ==========================================
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppColors.border, width: 1)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _buildTabButton(
                      0,
                      upcomingList.isNotEmpty ? 'Sắp tới (${upcomingList.length})' : 'Sắp tới',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildTabButton(
                      1,
                      completedList.isNotEmpty ? 'Đã hoàn thành (${completedList.length})' : 'Đã hoàn thành',
                    ),
                  ),
                ],
              ),
            ),

            // ==========================================
            // DANH SÁCH LỊCH HẸN
            // ==========================================
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2.5),
                    )
                  : appointments.isEmpty
                      ? _buildEmptyState()
                      : RefreshIndicator(
                          onRefresh: _loadAppointments,
                          color: AppColors.primary,
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            itemCount: appointments.length,
                            itemBuilder: (context, index) {
                              final app = appointments[index];
                              return _buildAppointmentCard(app);
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabButton(int index, String label) {
    final isSelected = _selectedTab == index;
    return InkWell(
      onTap: () => setState(() => _selectedTab = index),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        height: 42,
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildAppointmentCard(AppointmentItemModel app) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hàng Header thẻ: Trạng thái & Mã đặt lịch
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              BookingStatusBadge(status: app.status),
              Text(
                app.bookingCode,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Tên dịch vụ
          Text(
            app.serviceName,
            style: const TextStyle(
              fontSize: 15.5,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 8),

          // Thời gian hẹn
          Row(
            children: [
              const Icon(Icons.access_time_rounded, size: 15, color: AppColors.textSecondary),
              const SizedBox(width: 6),
              Text(
                '${app.timeSlot} · ${_formatDate(app.appointmentDate)}',
                style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Chi nhánh / Vị trí ngắn gọn
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 15, color: AppColors.textSecondary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  app.branchName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),

          const Divider(height: 20, color: AppColors.border),

          // Chi phí & Nút Xem chi tiết
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Chi phí dịch vụ', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                  const SizedBox(height: 2),
                  Text(
                    _formatCurrency(app.totalAmount),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF00693F),
                    ),
                  ),
                ],
              ),
              SizedBox(
                height: 38,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => C10AppointmentDetailScreen(appointmentId: app.id),
                      ),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                  ),
                  child: const Text(
                    'Xem chi tiết',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    if (_selectedTab == 0) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0xFFEFF4FE),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.calendar_month_outlined, size: 32, color: AppColors.primary),
              ),
              const SizedBox(height: 16),
              const Text(
                'Chưa có lịch hẹn nào sắp tới',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Đặt lịch để được chăm sóc và phục hồi chức năng hệ bạch huyết chuyên sâu.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 46,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const AllInOneBookingScreen()),
                    ).then((_) => _loadAppointments());
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    elevation: 0,
                  ),
                  child: const Text('Đặt lịch ngay', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      );
    } else {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.history_rounded, size: 48, color: Color(0xFFCBD5E1)),
              SizedBox(height: 12),
              Text(
                'Chưa có lịch hẹn hoàn thành',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(height: 6),
              Text(
                'Các buổi trị liệu sau khi hoàn thành sẽ được lưu trữ tại đây.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      );
    }
  }
}
