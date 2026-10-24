import 'package:flutter/material.dart';
import '../../data/models/booking_models.dart';
import '../../data/repositories/booking_repository.dart';
import '../widgets/booking_status_badge.dart';
import '../widgets/cancel_booking_dialog.dart';
import '../widgets/group_c_widgets.dart';
import '../widgets/reschedule_bottom_sheet.dart';
import 'c10_appointment_detail_screen.dart';

/// Screen C09: Lịch hẹn của tôi [8111:27462]
class C09MyAppointmentsScreen extends StatefulWidget {
  final int initialTabIndex; // 0: Sắp tới, 1: Đã hoàn thành, 2: Đã hủy

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

  DateTimeRange? _selectedDateRange;
  String _selectedBranch = 'Tất cả';

  String get _dateRangeText {
    if (_selectedDateRange == null) return 'Tất cả các ngày';
    final s = _selectedDateRange!.start;
    final e = _selectedDateRange!.end;
    return '${s.day}/${s.month} - ${e.day}/${e.month}/${e.year}';
  }

  String get _branchFilterText => _selectedBranch == 'Tất cả' ? 'Tất cả chi nhánh' : _selectedBranch;

  @override
  void initState() {
    super.initState();
    _selectedTab = widget.initialTabIndex;
    _loadAppointments();
  }

  Future<void> _loadAppointments() async {
    await _repo.fetchMyAppointments();
    if (mounted) setState(() {});
  }

  List<AppointmentItemModel> _getCurrentAppointments() {
    List<AppointmentItemModel> list;
    if (_selectedTab == 0) {
      list = _repo.getUpcomingAppointments();
    } else if (_selectedTab == 1) {
      list = _repo.getCompletedAppointments();
    } else {
      list = _repo.getCancelledAppointments();
    }

    if (_selectedDateRange != null) {
      list = list.where((app) {
        final d = DateTime(app.appointmentDate.year, app.appointmentDate.month, app.appointmentDate.day);
        final start = DateTime(_selectedDateRange!.start.year, _selectedDateRange!.start.month, _selectedDateRange!.start.day);
        final end = DateTime(_selectedDateRange!.end.year, _selectedDateRange!.end.month, _selectedDateRange!.end.day);
        return !d.isBefore(start) && !d.isAfter(end);
      }).toList();
    }

    if (_selectedBranch != 'Tất cả') {
      list = list.where((app) => app.branchName.toLowerCase().contains(_selectedBranch.toLowerCase())).toList();
    }

    return list;
  }

  void _onReschedule(AppointmentItemModel appointment) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RescheduleBottomSheet(
        appointment: appointment,
        onConfirmReschedule: (newDate, newSlot, isAutoAssign, newSpecialist) async {
          final success = await _repo.rescheduleAppointment(
            appointment.id,
            newDate,
            newSlot,
            isAutoAssign: isAutoAssign,
            newSpecialistName: newSpecialist,
          );
          if (mounted) {
            setState(() {});
            if (success) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Đã dời lịch sang ${newDate.day}/${newDate.month} · $newSlot'),
                  backgroundColor: BookingColors.heading,
                ),
              );
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Không thể đổi lịch hẹn. Vui lòng thử lại!'),
                  backgroundColor: Colors.red,
                ),
              );
            }
          }
        },
      ),
    );
  }

  void _onCancel(AppointmentItemModel appointment) {
    showDialog(
      context: context,
      builder: (_) => CancelBookingDialog(
        appointment: appointment,
        onConfirmCancel: (reason) async {
          final success = await _repo.cancelAppointment(appointment.id, reason);
          if (mounted) {
            setState(() {});
            if (success) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Đã hủy lịch hẹn theo yêu cầu'),
                  backgroundColor: BookingColors.primary,
                ),
              );
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Không thể hủy lịch hẹn. Vui lòng thử lại!'),
                  backgroundColor: Colors.red,
                ),
              );
            }
          }
        },
      ),
    );
  }

  String _formatCurrency(double val) {
    return '${val.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')}đ';
  }

  @override
  Widget build(BuildContext context) {
    final appointments = _getCurrentAppointments();

    return Scaffold(
      backgroundColor: BookingColors.background,
      appBar: const BookingAppBar(),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            const SizedBox(height: 8),
            const BookingHeaderSection(
              title: 'Lịch hẹn của tôi',
              subtitle: 'Quản lý các buổi chăm sóc đã đặt.',
              currentStep: 4,
              showStepper: false,
            ),

            // Tab Filters 3 mục: Sắp tới | Đã hoàn thành | Đã hủy
            SizedBox(
              height: 44,
              child: Row(
                children: [
                  _buildTabButton(0, 'Sắp tới'),
                  const SizedBox(width: 8),
                  _buildTabButton(1, 'Đã hoàn thành'),
                  const SizedBox(width: 8),
                  _buildTabButton(2, 'Đã hủy'),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Khoảng ngày Dropdown
            const Text(
              'Khoảng ngày',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: BookingColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            InkWell(
              onTap: () async {
                final picked = await showDateRangePicker(
                  context: context,
                  firstDate: DateTime(2025, 1, 1),
                  lastDate: DateTime(2028, 12, 31),
                  initialDateRange: _selectedDateRange,
                  builder: (context, child) {
                    return Theme(
                      data: ThemeData.light().copyWith(
                        colorScheme: const ColorScheme.light(
                          primary: BookingColors.primary,
                          onPrimary: Colors.white,
                          surface: Colors.white,
                        ),
                      ),
                      child: child!,
                    );
                  },
                );
                if (picked != null) {
                  setState(() => _selectedDateRange = picked);
                }
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                height: 52,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: BookingColors.cardBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _dateRangeText,
                      style: const TextStyle(fontSize: 15, color: BookingColors.textPrimary),
                    ),
                    if (_selectedDateRange != null)
                      GestureDetector(
                        onTap: () => setState(() => _selectedDateRange = null),
                        child: const Icon(Icons.close, size: 18, color: BookingColors.textSecondary),
                      )
                    else
                      const Icon(Icons.keyboard_arrow_down, color: BookingColors.heading),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Chi nhánh Dropdown
            const Text(
              'Chi nhánh',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: BookingColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            InkWell(
              onTap: () {
                showModalBottomSheet(
                  context: context,
                  backgroundColor: Colors.white,
                  shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                  ),
                  builder: (ctx) {
                    final branches = ['Tất cả', 'Chi nhánh Quận 3', 'Chi nhánh Quận 1', 'Chi nhánh Thủ Đức'];
                    return SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Chọn chi nhánh',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: BookingColors.heading),
                            ),
                            const SizedBox(height: 12),
                            ...branches.map((b) => ListTile(
                                  title: Text(b),
                                  trailing: _selectedBranch == b ? const Icon(Icons.check, color: BookingColors.primary) : null,
                                  onTap: () {
                                    setState(() => _selectedBranch = b);
                                    Navigator.pop(ctx);
                                  },
                                )),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                height: 52,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: BookingColors.cardBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _branchFilterText,
                      style: const TextStyle(fontSize: 15, color: BookingColors.textPrimary),
                    ),
                    const Icon(Icons.keyboard_arrow_down, color: BookingColors.heading),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Danh sách AppointmentCard theo Figma
            if (appointments.isEmpty)
              _buildEmptyState()
            else
              ...appointments.map((app) {
                final d = app.appointmentDate;
                final dStr =
                    '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

                return Container(
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: BookingColors.cardBorder, width: 1.0),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Ảnh 318x128
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.asset(
                          app.serviceImage,
                          height: 128,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            height: 128,
                            color: BookingColors.cardWarm,
                            child: const Center(
                              child: Icon(Icons.spa, color: BookingColors.primary, size: 40),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Trạng thái badge
                      BookingStatusBadge(status: app.status),
                      const SizedBox(height: 8),

                      // Tên dịch vụ
                      Text(
                        app.serviceName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),

                      _buildCardRow('Ngày hẹn', dStr),
                      const SizedBox(height: 4),
                      _buildCardRow('Giờ hẹn', app.timeSlot),
                      const SizedBox(height: 4),
                      _buildCardRow('Chi nhánh', app.branchName),
                      const SizedBox(height: 4),
                      _buildCardRow('Chuyên viên', app.specialistName),
                      const SizedBox(height: 4),
                      _buildCardRow('Khách hàng', app.customerName),
                      const SizedBox(height: 6),

                      Text(
                        app.bookingCode,
                        style: const TextStyle(
                          fontSize: 12,
                          color: BookingColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),

                      _buildCardRow(
                        'Thời lượng / Tổng',
                        '${app.durationMinutes} phút / ${_formatCurrency(app.totalAmount)}',
                      ),
                      const SizedBox(height: 6),

                      Text(
                        'Cọc đã trả ${_formatCurrency(app.depositAmount)} · Còn ${_formatCurrency(app.remainingAmount)}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: BookingColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Outline button: Xem chi tiết (318x56, r=14)
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: OutlinedButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) =>
                                    C10AppointmentDetailScreen(appointmentId: app.id),
                              ),
                            );
                          },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: BookingColors.primary),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Text(
                            'Xem chi tiết',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: BookingColors.primary,
                            ),
                          ),
                        ),
                      ),

                      // 2 Link Buttons: Đổi lịch & Hủy lịch (chỉ hiển thị khi lịch chưa hoàn thành/hủy)
                      if (app.status == AppointmentStatus.confirmed ||
                          app.status == AppointmentStatus.pending) ...[
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: TextButton(
                            onPressed: () => _onReschedule(app),
                            style: TextButton.styleFrom(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            child: const Text(
                              'Đổi lịch',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: BookingColors.primary,
                              ),
                            ),
                          ),
                        ),
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: TextButton(
                            onPressed: () => _onCancel(app),
                            style: TextButton.styleFrom(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            child: const Text(
                              'Hủy lịch',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: BookingColors.primary,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              }),

            const SizedBox(height: 8),
            // Thẻ Ghi chú
            const IllustrationNoteCard(
              text:
                  'Quản lý và theo dõi trạng thái các lịch hẹn chăm sóc của bạn.',
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildTabButton(int index, String label) {
    final isSelected = _selectedTab == index;
    return InkWell(
      onTap: () => setState(() => _selectedTab = index),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 44,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: isSelected ? BookingColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? BookingColors.primary : BookingColors.cardBorder,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w400,
            color: isSelected ? Colors.white : BookingColors.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildCardRow(String label, String value) {
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
            fontWeight: FontWeight.w400,
            color: BookingColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: BookingColors.cardBorder),
      ),
      child: const Center(
        child: Column(
          children: [
            Icon(Icons.calendar_today_outlined, size: 48, color: BookingColors.textSecondary),
            SizedBox(height: 12),
            Text(
              'Không có lịch hẹn nào',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: BookingColors.heading,
              ),
            ),
            SizedBox(height: 6),
            Text(
              'Các lịch hẹn tương ứng sẽ hiển thị tại đây.',
              style: TextStyle(fontSize: 13, color: BookingColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      height: 72,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: BookingColors.cardBorder, width: 1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(Icons.home_outlined, 'Trang chủ', false, () {
            Navigator.of(context).popUntil((r) => r.isFirst);
          }),
          _buildNavItem(Icons.spa_outlined, 'Dịch vụ', false, () {
            Navigator.of(context).pop();
          }),
          _buildNavItem(Icons.calendar_month, 'Đặt lịch', true, () {}),
          _buildNavItem(Icons.school_outlined, 'Học viện', false, () {}),
          _buildNavItem(Icons.person_outline, 'Cá nhân', false, () {}),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, bool isActive, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? BookingColors.cardWarm : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 22,
              color: isActive ? BookingColors.primary : const Color(0xFF80766E),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: isActive ? BookingColors.primary : BookingColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
