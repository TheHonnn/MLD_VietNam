import 'package:flutter/material.dart';
import '../../../home/data/repositories/mock_home_repository.dart';
import '../../../home/data/repositories/technician_repository.dart';
import '../../data/models/booking_models.dart';
import '../widgets/group_c_widgets.dart';
import 'c05_booking_info_screen.dart';

/// Screen C04: Chọn ngày và giờ [8111:26889]
class C04DateTimeSelectionScreen extends StatefulWidget {
  final BookingFlowState flowState;

  const C04DateTimeSelectionScreen({
    super.key,
    required this.flowState,
  });

  @override
  State<C04DateTimeSelectionScreen> createState() => _C04DateTimeSelectionScreenState();
}

class _C04DateTimeSelectionScreenState extends State<C04DateTimeSelectionScreen> {
  late DateTime _selectedDate;
  String _selectedTimeSlot = '';

  // Danh sách 14 ngày bắt đầu từ Hôm nay
  late List<DateTime> _availableDays;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    // Ngày chọn ban đầu từ flowState
    _selectedDate = widget.flowState.selectedDate;

    // Giờ đặt: KHÔNG ép buộc chọn giờ mặc định, người dùng chủ động chọn
    if (widget.flowState.selectedSlot != null && widget.flowState.selectedSlot!.isAvailable) {
      _selectedTimeSlot = widget.flowState.selectedSlot!.time;
    } else {
      _selectedTimeSlot = '';
      widget.flowState.selectedSlot = null;
    }

    // Khởi tạo danh sách 14 ngày tới bắt đầu từ hôm nay
    _availableDays = List.generate(
      14,
      (index) => today.add(Duration(days: index)),
    );
  }

  String _getDayOfWeekShort(int weekday) {
    switch (weekday) {
      case DateTime.monday:
        return 'T2';
      case DateTime.tuesday:
        return 'T3';
      case DateTime.wednesday:
        return 'T4';
      case DateTime.thursday:
        return 'T5';
      case DateTime.friday:
        return 'T6';
      case DateTime.saturday:
        return 'T7';
      case DateTime.sunday:
        return 'CN';
      default:
        return '';
    }
  }

  String _formatDateShort(DateTime d) {
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  // Khung giờ theo từng buổi với quy tắc:
  // - Nếu Random NV: hiện khung giờ mà nhân viên không có khách (gán NV sẵn sàng).
  // - Nếu Chọn chuyên viên: hiện khung giờ còn trống để chọn; khung giờ bận thì hiển thị lý do bận.
  List<TimeSlotModel> _getMorningSlots(String specialistName, bool isAutoAssign) {
    if (isAutoAssign) {
      return const [
        TimeSlotModel(
          id: 'slot-0900',
          time: '09:00',
          periodName: 'Sáng',
          period: SlotPeriod.morning,
          isAvailable: true,
          subtext: 'NV: Trần Minh Phương',
        ),
        TimeSlotModel(
          id: 'slot-0930',
          time: '09:30',
          periodName: 'Sáng',
          period: SlotPeriod.morning,
          isAvailable: true,
          subtext: 'NV: Nguyễn Thu Hà',
        ),
        TimeSlotModel(
          id: 'slot-1000',
          time: '10:00',
          periodName: 'Sáng',
          period: SlotPeriod.morning,
          isAvailable: false,
          subtext: 'Khử khuẩn',
          unavailableReason:
              'Khoảng nghỉ 15 phút bắt buộc để khử khuẩn drap giường và chuẩn bị dụng cụ y khoa giữa 2 ca trị liệu.',
        ),
        TimeSlotModel(
          id: 'slot-1030',
          time: '10:30',
          periodName: 'Sáng',
          period: SlotPeriod.morning,
          isAvailable: true,
          subtext: 'NV: Lê Hoài An',
        ),
        TimeSlotModel(
          id: 'slot-1100',
          time: '11:00',
          periodName: 'Sáng',
          period: SlotPeriod.morning,
          isAvailable: true,
          subtext: 'NV: Trần Minh Phương',
        ),
        TimeSlotModel(
          id: 'slot-1130',
          time: '11:30',
          periodName: 'Sáng',
          period: SlotPeriod.morning,
          isAvailable: false,
          subtext: 'Ca nghỉ trưa',
          unavailableReason:
              'Toàn bộ chuyên viên trong khung giờ nghỉ trưa & giao ca (11:30 – 13:00).',
        ),
      ];
    }

    return [
      TimeSlotModel(
        id: 'slot-0900',
        time: '09:00',
        periodName: 'Sáng',
        period: SlotPeriod.morning,
        isAvailable: false,
        subtext: 'Đã có khách',
        unavailableReason:
            'Chuyên viên $specialistName đang có lịch hẹn dịch vụ với khách hàng khác (08:30 – 10:00).',
      ),
      TimeSlotModel(
        id: 'slot-0930',
        time: '09:30',
        periodName: 'Sáng',
        period: SlotPeriod.morning,
        isAvailable: false,
        subtext: 'Đã có khách',
        unavailableReason:
            'Khung giờ này đã được một khách hàng khác đặt trước với chuyên viên $specialistName.',
      ),
      const TimeSlotModel(
        id: 'slot-1000',
        time: '10:00',
        periodName: 'Sáng',
        period: SlotPeriod.morning,
        isAvailable: false,
        subtext: 'Khử khuẩn',
        unavailableReason:
            'Khoảng nghỉ 15 phút bắt buộc để khử khuẩn drap giường và chuẩn bị dụng cụ y khoa giữa 2 ca trị liệu.',
      ),
      const TimeSlotModel(
        id: 'slot-1030',
        time: '10:30',
        periodName: 'Sáng',
        period: SlotPeriod.morning,
        isAvailable: true,
        subtext: 'Còn trống',
      ),
      const TimeSlotModel(
        id: 'slot-1100',
        time: '11:00',
        periodName: 'Sáng',
        period: SlotPeriod.morning,
        isAvailable: true,
        subtext: 'Còn trống',
      ),
      TimeSlotModel(
        id: 'slot-1130',
        time: '11:30',
        periodName: 'Sáng',
        period: SlotPeriod.morning,
        isAvailable: false,
        subtext: 'Ca nghỉ trưa',
        unavailableReason:
            'Chuyên viên $specialistName trong khung giờ nghỉ trưa & giao ca (11:30 – 13:00).',
      ),
    ];
  }

  List<TimeSlotModel> _getAfternoonSlots(String specialistName, bool isAutoAssign) {
    if (isAutoAssign) {
      return const [
        TimeSlotModel(
          id: 'slot-1330',
          time: '13:30',
          periodName: 'Chiều',
          period: SlotPeriod.afternoon,
          isAvailable: true,
          subtext: 'NV: Nguyễn Thu Hà',
        ),
        TimeSlotModel(
          id: 'slot-1400',
          time: '14:00',
          periodName: 'Chiều',
          period: SlotPeriod.afternoon,
          isAvailable: true,
          subtext: 'NV: Trần Minh Phương',
        ),
        TimeSlotModel(
          id: 'slot-1430',
          time: '14:30',
          periodName: 'Chiều',
          period: SlotPeriod.afternoon,
          isAvailable: true,
          subtext: 'NV: Lê Hoài An',
        ),
        TimeSlotModel(
          id: 'slot-1500',
          time: '15:00',
          periodName: 'Chiều',
          period: SlotPeriod.afternoon,
          isAvailable: true,
          subtext: 'NV: Trần Minh Phương',
        ),
        TimeSlotModel(
          id: 'slot-1530',
          time: '15:30',
          periodName: 'Chiều',
          period: SlotPeriod.afternoon,
          isAvailable: true,
          subtext: 'NV: Nguyễn Thu Hà',
        ),
        TimeSlotModel(
          id: 'slot-1600',
          time: '16:00',
          periodName: 'Chiều',
          period: SlotPeriod.afternoon,
          isAvailable: false,
          subtext: 'Kín phòng',
          unavailableReason:
              'Phòng dịch vụ phù hợp tại cơ sở đã được đặt kín vào khung giờ này.',
        ),
        TimeSlotModel(
          id: 'slot-1630',
          time: '16:30',
          periodName: 'Chiều',
          period: SlotPeriod.afternoon,
          isAvailable: true,
          subtext: 'NV: Lê Hoài An',
        ),
      ];
    }

    return [
      const TimeSlotModel(
        id: 'slot-1330',
        time: '13:30',
        periodName: 'Chiều',
        period: SlotPeriod.afternoon,
        isAvailable: true,
        subtext: 'Còn trống',
      ),
      const TimeSlotModel(
        id: 'slot-1400',
        time: '14:00',
        periodName: 'Chiều',
        period: SlotPeriod.afternoon,
        isAvailable: true,
        subtext: 'Còn trống',
      ),
      const TimeSlotModel(
        id: 'slot-1430',
        time: '14:30',
        periodName: 'Chiều',
        period: SlotPeriod.afternoon,
        isAvailable: true,
        subtext: 'Còn trống',
      ),
      const TimeSlotModel(
        id: 'slot-1500',
        time: '15:00',
        periodName: 'Chiều',
        period: SlotPeriod.afternoon,
        isAvailable: true,
        subtext: 'Còn trống',
      ),
      TimeSlotModel(
        id: 'slot-1530',
        time: '15:30',
        periodName: 'Chiều',
        period: SlotPeriod.afternoon,
        isAvailable: false,
        subtext: 'Đã có khách',
        unavailableReason:
            'Chuyên viên $specialistName đang thực hiện liệu trình chuyên sâu cho khách hàng khác.',
      ),
      const TimeSlotModel(
        id: 'slot-1600',
        time: '16:00',
        periodName: 'Chiều',
        period: SlotPeriod.afternoon,
        isAvailable: false,
        subtext: 'Kín phòng',
        unavailableReason:
            'Phòng dịch vụ phù hợp tại cơ sở đã được đặt kín vào khung giờ này.',
      ),
      const TimeSlotModel(
        id: 'slot-1630',
        time: '16:30',
        periodName: 'Chiều',
        period: SlotPeriod.afternoon,
        isAvailable: true,
        subtext: 'Còn trống',
      ),
    ];
  }

  List<TimeSlotModel> _getEveningSlots(String specialistName, bool isAutoAssign) {
    if (isAutoAssign) {
      return const [
        TimeSlotModel(
          id: 'slot-1800',
          time: '18:00',
          periodName: 'Tối',
          period: SlotPeriod.evening,
          isAvailable: false,
          subtext: 'Kín lịch tất cả NV',
          unavailableReason:
              'Toàn bộ chuyên viên tại cơ sở đều đang bận phục vụ khách hàng khác vào khung giờ cao điểm 18:00 – 18:30.',
        ),
        TimeSlotModel(
          id: 'slot-1830',
          time: '18:30',
          periodName: 'Tối',
          period: SlotPeriod.evening,
          isAvailable: true,
          subtext: 'NV: Trần Minh Phương',
        ),
        TimeSlotModel(
          id: 'slot-1900',
          time: '19:00',
          periodName: 'Tối',
          period: SlotPeriod.evening,
          isAvailable: true,
          subtext: 'NV: Lê Hoài An',
        ),
        TimeSlotModel(
          id: 'slot-1930',
          time: '19:30',
          periodName: 'Tối',
          period: SlotPeriod.evening,
          isAvailable: false,
          subtext: 'Hết ca trực',
          unavailableReason:
              'Cơ sở ngừng tiếp nhận khách mới buổi tối sau 19:30.',
        ),
      ];
    }

    return [
      TimeSlotModel(
        id: 'slot-1800',
        time: '18:00',
        periodName: 'Tối',
        period: SlotPeriod.evening,
        isAvailable: false,
        subtext: 'Đã có khách',
        unavailableReason:
            'Khách hàng khác đã đặt trước dịch vụ với chuyên viên $specialistName.',
      ),
      const TimeSlotModel(
        id: 'slot-1830',
        time: '18:30',
        periodName: 'Tối',
        period: SlotPeriod.evening,
        isAvailable: true,
        subtext: 'Còn trống',
      ),
      const TimeSlotModel(
        id: 'slot-1900',
        time: '19:00',
        periodName: 'Tối',
        period: SlotPeriod.evening,
        isAvailable: true,
        subtext: 'Còn trống',
      ),
      TimeSlotModel(
        id: 'slot-1930',
        time: '19:30',
        periodName: 'Tối',
        period: SlotPeriod.evening,
        isAvailable: false,
        subtext: 'Hết ca trực',
        unavailableReason:
            'Đã kết thúc ca làm việc của chuyên viên $specialistName trong ngày (cơ sở ngừng nhận lịch mới sau 19:30).',
      ),
    ];
  }

  /// Hiển thị Bottom Sheet giải thích cụ thể lý do không khả dụng
  void _showUnavailableReasonBottomSheet(TimeSlotModel slot, String specialistName) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3E0),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.event_busy_rounded, color: Color(0xFFE65100), size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Khung giờ không khả dụng',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: BookingColors.heading,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Giờ: ${slot.time} · Trạng thái: ${slot.subtext ?? "Không khả dụng"}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: BookingColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: BookingColors.cardWarm,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: BookingColors.cardBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.info_outline, size: 16, color: BookingColors.primary),
                        SizedBox(width: 6),
                        Text(
                          'Lý do chi tiết:',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: BookingColors.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      slot.unavailableReason ??
                          'Chuyên viên $specialistName hiện đang được đặt lịch với khách hàng khác trong khung giờ này.',
                      style: const TextStyle(
                        fontSize: 14,
                        color: BookingColors.textPrimary,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Giải pháp đề xuất:',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: BookingColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.check_circle_outline, size: 16, color: BookingColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Chọn một trong các khung giờ trống còn lại (ví dụ: 10:30, 13:30, 14:00, 14:30).',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.3),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.swap_horiz_rounded, size: 16, color: BookingColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Hoặc chọn "Để trung tâm sắp xếp chuyên viên" để tự động tìm kỹ thuật viên có sẵn tại khung giờ này.',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.3),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        setState(() {
                          widget.flowState.autoAssignSpecialist = true;
                        });
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Đã chọn: Để trung tâm tự động sắp xếp chuyên viên phù hợp.'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: BookingColors.primary),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text(
                        'Để trung tâm xếp NV',
                        style: TextStyle(color: BookingColors.primary, fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: BookingColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        elevation: 0,
                      ),
                      child: const Text('Chọn giờ khác', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final serviceName = widget.flowState.allSelectedServices.isNotEmpty
        ? widget.flowState.allSelectedServices.first.name
        : 'Massage thư giãn toàn thân';
    final branchName = widget.flowState.selectedBranch?.name ?? 'Chi nhánh Quận 3';
    final isAuto = widget.flowState.autoAssignSpecialist;
    final specialistName = isAuto
        ? 'Để trung tâm sắp xếp'
        : (widget.flowState.selectedSpecialist?.name ?? 'Kỹ thuật viên chỉ định');
    final durationMinutes = widget.flowState.totalDurationMinutes;

    final dateStr = _formatDateShort(_selectedDate);

    final morningSlots = _getMorningSlots(specialistName, isAuto);
    final afternoonSlots = _getAfternoonSlots(specialistName, isAuto);
    final eveningSlots = _getEveningSlots(specialistName, isAuto);

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    return Scaffold(
      backgroundColor: BookingColors.background,
      appBar: const BookingAppBar(),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                children: [
                  const SizedBox(height: 8),
                  const BookingHeaderSection(
                    title: 'Chọn ngày và giờ',
                    subtitle: 'Lựa chọn thời gian phù hợp với lịch của bạn.',
                    currentStep: 2,
                  ),
                  const SizedBox(height: 8),

                  // Thẻ thông tin dịch vụ tóm tắt trên cùng
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: BookingColors.cardWarm,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: BookingColors.cardBorder, width: 1.0),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          serviceName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$branchName · $specialistName · $durationMinutes phút',
                          style: const TextStyle(
                            fontSize: 12,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Đang chọn',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: BookingColors.textSecondary,
                              ),
                            ),
                            Text(
                              _selectedTimeSlot.isNotEmpty ? _selectedTimeSlot : 'Chưa chọn giờ',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: _selectedTimeSlot.isNotEmpty
                                    ? BookingColors.primary
                                    : BookingColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Bộ chọn số lượng khách trị liệu (1 đến 5 khách) - BUG-036
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: BookingColors.cardBorder, width: 1.0),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Số lượng khách trị liệu',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: BookingColors.textPrimary,
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Tối đa 5 khách cùng khung giờ',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: BookingColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                            // Stepper (-) [Số người] (+)
                            Container(
                              decoration: BoxDecoration(
                                color: BookingColors.cardWarm,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: BookingColors.cardBorder),
                              ),
                              child: Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.remove, size: 18),
                                    color: widget.flowState.guestCount > 1
                                        ? BookingColors.primary
                                        : Colors.grey.shade400,
                                    onPressed: widget.flowState.guestCount > 1
                                        ? () {
                                            setState(() {
                                              widget.flowState.guestCount--;
                                            });
                                          }
                                        : null,
                                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                                    padding: EdgeInsets.zero,
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 10),
                                    child: Text(
                                      '${widget.flowState.guestCount} người',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: BookingColors.primary,
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.add, size: 18),
                                    color: widget.flowState.guestCount < 5
                                        ? BookingColors.primary
                                        : Colors.grey.shade400,
                                    onPressed: widget.flowState.guestCount < 5
                                        ? () {
                                            setState(() {
                                              widget.flowState.guestCount++;
                                            });
                                          }
                                        : null,
                                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                                    padding: EdgeInsets.zero,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // Thông báo điều phối tự động kỹ thuật viên và giường
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: BookingColors.cardWarm.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: BookingColors.cardBorder.withValues(alpha: 0.6)),
                          ),
                          child: const Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.info_outline_rounded, size: 16, color: BookingColors.primary),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Hệ thống tự động sắp xếp kỹ thuật viên và bố trí giường trị liệu tương ứng cho số lượng khách đã chọn.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: BookingColors.textPrimary,
                                    height: 1.35,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Khung Tháng và điều hướng
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        onPressed: () {
                          // Lùi 7 ngày nếu không vượt quá hôm nay
                          final newDate = _selectedDate.subtract(const Duration(days: 7));
                          if (newDate.isAfter(today.subtract(const Duration(days: 1)))) {
                            setState(() {
                              _selectedDate = newDate;
                              widget.flowState.selectedDate = newDate;
                            });
                          }
                        },
                        icon: const Icon(Icons.chevron_left, color: BookingColors.textPrimary),
                      ),
                      Text(
                        'Tháng ${_selectedDate.month}, ${_selectedDate.year}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.textPrimary,
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          // Tiến 7 ngày
                          final newDate = _selectedDate.add(const Duration(days: 7));
                          setState(() {
                            _selectedDate = newDate;
                            widget.flowState.selectedDate = newDate;
                          });
                        },
                        icon: const Icon(Icons.chevron_right, color: BookingColors.textPrimary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // DateStrip động: Cuộn ngang 14 ngày tới bắt đầu từ Hôm nay
                  SizedBox(
                    height: 74,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _availableDays.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final day = _availableDays[index];
                        final isSelected = day.day == _selectedDate.day &&
                            day.month == _selectedDate.month &&
                            day.year == _selectedDate.year;
                        final isToday = day.day == today.day &&
                            day.month == today.month &&
                            day.year == today.year;

                        return InkWell(
                          onTap: () {
                            setState(() {
                              _selectedDate = day;
                              widget.flowState.selectedDate = day;
                            });
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 50,
                            height: 74,
                            decoration: BoxDecoration(
                              color: isSelected ? BookingColors.primary : Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? BookingColors.primary : BookingColors.cardBorder,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  isToday ? 'Nay' : _getDayOfWeekShort(day.weekday),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
                                    color: isSelected
                                        ? Colors.white
                                        : (isToday ? BookingColors.primary : BookingColors.textSecondary),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${day.day}',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: isSelected ? Colors.white : BookingColors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Nút Mở lịch tháng chuẩn
                  Center(
                    child: TextButton.icon(
                      icon: const Icon(Icons.calendar_month_outlined, size: 18, color: BookingColors.primary),
                      label: const Text(
                        'Mở lịch tháng',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.primary,
                        ),
                      ),
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _selectedDate,
                          firstDate: today,
                          lastDate: today.add(const Duration(days: 180)),
                          locale: const Locale('vi'),
                        );
                        if (picked != null) {
                          setState(() {
                            _selectedDate = picked;
                            widget.flowState.selectedDate = picked;
                            // Cập nhật lại dải 14 ngày nếu ngày chọn nằm ngoài
                            if (!_availableDays.any((d) =>
                                d.day == picked.day &&
                                d.month == picked.month &&
                                d.year == picked.year)) {
                              _availableDays = List.generate(
                                14,
                                (i) => picked.add(Duration(days: i)),
                              );
                            }
                          });
                        }
                      },
                      style: TextButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                  ),
                  Center(
                    child: Text(
                      '${_formatDateShort(_availableDays.first)} – ${_formatDateShort(_availableDays.last)} · Lịch trống tiếp theo',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 12,
                        color: BookingColors.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Ca 1: Buổi sáng
                  _buildPeriodHeader('Buổi sáng (09:00 – 12:00)'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: morningSlots.map((slot) {
                      final isSelected = _selectedTimeSlot == slot.time;
                      return _buildSlotButton(
                        slot: slot,
                        isSelected: isSelected,
                        onSelect: () => _selectSlot(slot),
                        onShowReason: () => _showUnavailableReasonBottomSheet(slot, specialistName),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // Ca 2: Buổi chiều
                  _buildPeriodHeader('Buổi chiều (13:30 – 17:30)'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: afternoonSlots.map((slot) {
                      final isSelected = _selectedTimeSlot == slot.time;
                      return _buildSlotButton(
                        slot: slot,
                        isSelected: isSelected,
                        onSelect: () => _selectSlot(slot),
                        onShowReason: () => _showUnavailableReasonBottomSheet(slot, specialistName),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // Ca 3: Buổi tối
                  _buildPeriodHeader('Buổi tối (18:00 – 20:00)'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: eveningSlots.map((slot) {
                      final isSelected = _selectedTimeSlot == slot.time;
                      return _buildSlotButton(
                        slot: slot,
                        isSelected: isSelected,
                        onSelect: () => _selectSlot(slot),
                        onShowReason: () => _showUnavailableReasonBottomSheet(slot, specialistName),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),

                  // Hướng dẫn ghi chú
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: BookingColors.cardBorder),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline, size: 16, color: BookingColors.primary),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Ô màu trắng: Khả dụng có thể chọn · Ô màu xám: Đã có khách hoặc chuyên viên bận (Chạm vào ô xám để xem lý do cụ thể và gợi ý giờ khác).',
                            style: TextStyle(
                              fontSize: 12,
                              color: BookingColors.textPrimary,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Thẻ thông tin chuẩn bị & vệ sinh
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: BookingColors.cardWarm,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: BookingColors.cardBorder, width: 1.0),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Giờ chăm sóc',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: BookingColors.textSecondary,
                              ),
                            ),
                            Text(
                              _selectedTimeSlot.isNotEmpty ? _selectedTimeSlot : 'Chưa chọn',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: _selectedTimeSlot.isNotEmpty
                                    ? BookingColors.primary
                                    : BookingColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Thời lượng',
                              style: TextStyle(
                                fontSize: 14,
                                color: BookingColors.textSecondary,
                              ),
                            ),
                            Text(
                              '$durationMinutes phút',
                              style: const TextStyle(
                                fontSize: 14,
                                color: BookingColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Chuẩn bị / vệ sinh riêng: 15 phút sau buổi. Chiếm dụng phòng và chuyên viên: ${_selectedTimeSlot.isNotEmpty ? _selectedTimeSlot : "Theo giờ đã chọn"}.',
                          style: const TextStyle(
                            fontSize: 12,
                            color: BookingColors.textPrimary,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: BookingColors.cardWarm,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'Thông tin giữ chỗ',
                            style: TextStyle(
                              fontSize: 12,
                              color: BookingColors.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Khung giờ chăm sóc đã bao gồm thời gian chuẩn bị và tư vấn.',
                    style: TextStyle(
                      fontSize: 12,
                      color: BookingColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),

            // Fixed Bottom Bar chuẩn
            BookingFixedBottomBar(
              summaryText: _selectedTimeSlot.isNotEmpty
                  ? '$dateStr · $_selectedTimeSlot · ${widget.flowState.guestCount} khách · $durationMinutes phút'
                  : '$dateStr · Chưa chọn giờ · ${widget.flowState.guestCount} khách · $durationMinutes phút',
              buttonText: 'Tiếp tục',
              onPressed: () {
                if (_selectedTimeSlot.isEmpty || widget.flowState.selectedSlot == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Vui lòng chọn một khung giờ hẹn khả dụng trước khi tiếp tục.'),
                      backgroundColor: BookingColors.primary,
                      duration: Duration(seconds: 2),
                    ),
                  );
                  return;
                }

                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => C05BookingInfoScreen(flowState: widget.flowState),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _selectSlot(TimeSlotModel slot) {
    setState(() {
      _selectedTimeSlot = slot.time;
      widget.flowState.selectedSlot = slot;
      if (widget.flowState.autoAssignSpecialist &&
          slot.subtext != null &&
          slot.subtext!.startsWith('NV: ')) {
        final assignedName = slot.subtext!.replaceFirst('NV: ', '').trim();
        final techs = TechnicianRepository.instance.cachedTechnicians.isNotEmpty
            ? TechnicianRepository.instance.cachedTechnicians
            : MockHomeRepository.getTopTechnicians();
        for (final t in techs) {
          if (t.name.contains(assignedName) || assignedName.contains(t.name)) {
            widget.flowState.selectedSpecialist = t;
            break;
          }
        }
      }
    });
  }

  Widget _buildPeriodHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: BookingColors.textPrimary,
      ),
    );
  }

  Widget _buildSlotButton({
    required TimeSlotModel slot,
    required bool isSelected,
    VoidCallback? onSelect,
    VoidCallback? onShowReason,
  }) {
    Color bg;
    Color border;
    Color textColor;
    Color subtextColor;

    if (!slot.isAvailable) {
      bg = const Color(0xFFF4ECE4); // Nền xám ấm nhạt
      border = const Color(0xFFE2D6CB);
      textColor = const Color(0xFF8C7D73);
      subtextColor = const Color(0xFFA05520); // Màu cam đất cảnh báo bận
    } else if (isSelected) {
      bg = BookingColors.primary;
      border = BookingColors.primary;
      textColor = Colors.white;
      subtextColor = Colors.white70;
    } else {
      bg = Colors.white;
      border = BookingColors.cardBorder;
      textColor = BookingColors.textPrimary;
      subtextColor = BookingColors.textSecondary;
    }

    return InkWell(
      onTap: slot.isAvailable ? onSelect : onShowReason,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 104,
        height: 60,
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border, width: isSelected ? 1.5 : 1.0),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  slot.time,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                    color: textColor,
                  ),
                ),
                if (!slot.isAvailable) ...[
                  const SizedBox(width: 3),
                  const Icon(Icons.info_outline, size: 12, color: Color(0xFFA05520)),
                ],
              ],
            ),
            const SizedBox(height: 2),
            Text(
              slot.isAvailable ? 'Trống' : (slot.subtext ?? 'Đã đặt'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                fontWeight: !slot.isAvailable ? FontWeight.w600 : FontWeight.w400,
                color: subtextColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
