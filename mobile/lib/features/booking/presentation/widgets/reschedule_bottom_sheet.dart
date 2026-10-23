import 'package:flutter/material.dart';
import '../../data/models/booking_models.dart';
import '../../data/repositories/booking_repository.dart';
import 'group_c_widgets.dart';

/// ComponentFamily / RescheduleBottomSheet [8111:29082]
/// Quy tắc đổi lịch:
/// - Nếu Random nhân viên: Hiện những khung giờ mà nhân viên đó không có khách (gán NV sẵn sàng).
/// - Nếu Chọn/Giữ nhân viên: Hiện khung giờ còn trống để chọn; khung giờ bận hiển thị lý do.
class RescheduleBottomSheet extends StatefulWidget {
  final AppointmentItemModel appointment;
  final void Function(DateTime newDate, String newSlot, bool isAutoAssign, String? newSpecialistName) onConfirmReschedule;

  const RescheduleBottomSheet({
    super.key,
    required this.appointment,
    required this.onConfirmReschedule,
  });

  @override
  State<RescheduleBottomSheet> createState() => _RescheduleBottomSheetState();
}

class _RescheduleBottomSheetState extends State<RescheduleBottomSheet> {
  late DateTime _selectedDate;
  String _selectedSlot = '';
  String? _assignedSpecialistName;
  bool _isAutoAssign = false;
  bool _isLoading = false;

  late List<DateTime> _availableDays;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    // Ngày mặc định: bắt đầu từ ngày hẹn cũ nếu còn ở tương lai, hoặc từ hôm nay
    if (widget.appointment.appointmentDate.isAfter(today)) {
      _selectedDate = DateTime(
        widget.appointment.appointmentDate.year,
        widget.appointment.appointmentDate.month,
        widget.appointment.appointmentDate.day,
      );
    } else {
      _selectedDate = today;
    }

    _assignedSpecialistName = widget.appointment.specialistName;

    // Khởi tạo 14 ngày tới
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

  List<TimeSlotModel> _getCurrentSlots() {
    if (_isAutoAssign) {
      return BookingRepository.getSlotsForRandomAssignment(date: _selectedDate);
    } else {
      return BookingRepository.getSlotsForSpecialist(
        specialistName: widget.appointment.specialistName,
        date: _selectedDate,
      );
    }
  }

  void _showReasonDialog(TimeSlotModel slot) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return SafeArea(
          child: SingleChildScrollView(
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
              child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3E0),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.info_outline, color: Color(0xFFD97706), size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Khung giờ ${slot.time}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: BookingColors.heading,
                          ),
                        ),
                        Text(
                          slot.subtext ?? 'Không khả dụng',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFD97706),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: BookingColors.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: BookingColors.cardBorder),
                ),
                child: Text(
                  slot.unavailableReason ??
                      'Khung giờ này không khả dụng với chuyên viên hiện tại.',
                  style: const TextStyle(
                    fontSize: 13,
                    color: BookingColors.textPrimary,
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (!_isAutoAssign) ...[
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    setState(() {
                      _isAutoAssign = true;
                      _selectedSlot = '';
                    });
                  },
                  icon: const Icon(Icons.shuffle, size: 18),
                  label: const Text('Chuyển sang "Trung tâm tự xếp NV khác"'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: BookingColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 46),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
              OutlinedButton(
                onPressed: () => Navigator.pop(ctx),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 44),
                  side: const BorderSide(color: BookingColors.cardBorder),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Đã hiểu, chọn giờ khác', style: TextStyle(color: BookingColors.heading)),
              ),
            ],
          ),
        ),
      ),
    );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final slots = _getCurrentSlots();
    final morningSlots = slots.where((s) => s.period == SlotPeriod.morning).toList();
    final afternoonSlots = slots.where((s) => s.period == SlotPeriod.afternoon).toList();
    final eveningSlots = slots.where((s) => s.period == SlotPeriod.evening).toList();

    final currDate = widget.appointment.appointmentDate;
    final currDateStr =
        '${currDate.day.toString().padLeft(2, '0')}/${currDate.month.toString().padLeft(2, '0')}/${currDate.year}';
    final newDateStr =
        '${_selectedDate.day.toString().padLeft(2, '0')}/${_selectedDate.month.toString().padLeft(2, '0')}/${_selectedDate.year}';

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    return Container(
      decoration: const BoxDecoration(
        color: BookingColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tay nắm modal
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: BookingColors.cardBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Đổi lịch hẹn',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: BookingColors.heading,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Mã hẹn: ${widget.appointment.bookingCode}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: BookingColors.textSecondary,
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close, color: BookingColors.heading),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Thẻ thông tin lịch hiện tại
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: BookingColors.cardBorder),
            ),
            child: Row(
              children: [
                const Icon(Icons.history_rounded, size: 18, color: BookingColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Lịch hiện tại: $currDateStr · ${widget.appointment.timeSlot} · ${widget.appointment.specialistName}',
                    style: const TextStyle(fontSize: 13, color: BookingColors.textPrimary),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Chế độ Chọn Nhân viên: Giữ chuyên viên vs Random NV
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: BookingColors.cardBorder),
            ),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _isAutoAssign = false;
                        _selectedSlot = '';
                        _assignedSpecialistName = widget.appointment.specialistName;
                      });
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: !_isAutoAssign ? BookingColors.primary : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'Chỉ định NV (${widget.appointment.specialistName})',
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: !_isAutoAssign ? Colors.white : BookingColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _isAutoAssign = true;
                        _selectedSlot = '';
                      });
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: _isAutoAssign ? BookingColors.primary : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'Trung tâm tự xếp (Random NV)',
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _isAutoAssign ? Colors.white : BookingColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Quy tắc chú thích
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: BookingColors.cardWarm,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, size: 14, color: BookingColors.primary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    _isAutoAssign
                        ? 'Chế độ Random NV: Hiển thị các khung giờ mà nhân viên không có khách hẹn.'
                        : 'Chế độ Chỉ định: Hiển thị khung giờ còn trống của chuyên viên ${widget.appointment.specialistName}.',
                    style: const TextStyle(fontSize: 11, color: BookingColors.heading, height: 1.3),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Nội dung cuộn: Chọn Ngày & Chọn Giờ
          Expanded(
            child: ListView(
              children: [
                // 1. Dải 14 ngày
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Chọn ngày mới',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: BookingColors.heading,
                      ),
                    ),
                    InkWell(
                      onTap: () async {
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
                            _selectedSlot = '';
                          });
                        }
                      },
                      child: const Row(
                        children: [
                          Icon(Icons.calendar_month_outlined, size: 15, color: BookingColors.primary),
                          SizedBox(width: 4),
                          Text(
                            'Mở lịch',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: BookingColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                SizedBox(
                  height: 64,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _availableDays.length,
                    itemBuilder: (context, index) {
                      final day = _availableDays[index];
                      final isSelected = day.year == _selectedDate.year &&
                          day.month == _selectedDate.month &&
                          day.day == _selectedDate.day;
                      final isToday = day.year == today.year &&
                          day.month == today.month &&
                          day.day == today.day;

                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              _selectedDate = day;
                              _selectedSlot = '';
                            });
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 54,
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
                                const SizedBox(height: 2),
                                Text(
                                  '${day.day}',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: isSelected ? Colors.white : BookingColors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),

                // 2. Danh sách khung giờ
                const Text(
                  'Chọn khung giờ mới',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: BookingColors.heading,
                  ),
                ),
                const SizedBox(height: 8),

                // Sáng
                if (morningSlots.isNotEmpty) ...[
                  _buildPeriodSection('Sáng (08:30 – 11:30)', morningSlots),
                  const SizedBox(height: 12),
                ],

                // Chiều
                if (afternoonSlots.isNotEmpty) ...[
                  _buildPeriodSection('Chiều (13:30 – 17:00)', afternoonSlots),
                  const SizedBox(height: 12),
                ],

                // Tối
                if (eveningSlots.isNotEmpty) ...[
                  _buildPeriodSection('Tối (17:30 – 20:30)', eveningSlots),
                  const SizedBox(height: 12),
                ],

                // Thẻ tóm tắt đổi lịch
                if (_selectedSlot.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: BookingColors.cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Tóm tắt thay đổi:',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: BookingColors.heading),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '• Thời gian mới: $newDateStr lúc $_selectedSlot\n• Chuyên viên: ${_assignedSpecialistName ?? widget.appointment.specialistName}',
                          style: const TextStyle(fontSize: 13, color: BookingColors.textPrimary, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Nút xác nhận đổi lịch
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: (_isLoading || _selectedSlot.isEmpty)
                  ? null
                  : () {
                      final nav = Navigator.of(context);
                      setState(() => _isLoading = true);
                      widget.onConfirmReschedule(
                        _selectedDate,
                        _selectedSlot,
                        _isAutoAssign,
                        _assignedSpecialistName,
                      );
                      nav.pop();
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: BookingColors.primary,
                disabledBackgroundColor: Colors.grey.shade300,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      _selectedSlot.isEmpty ? 'Vui lòng chọn khung giờ mới' : 'Xác nhận đổi lịch',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: _selectedSlot.isEmpty ? Colors.grey.shade600 : Colors.white,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodSection(String title, List<TimeSlotModel> slots) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: BookingColors.textSecondary,
          ),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: slots.map((slot) {
            final isSelected = _selectedSlot == slot.time;
            final isAvailable = slot.isAvailable;

            Color bg;
            Color border;
            Color textCol;
            Color subtextCol;

            if (!isAvailable) {
              bg = const Color(0xFFF2ECE6);
              border = const Color(0xFFE2D6CB);
              textCol = const Color(0xFF8C7D73);
              subtextCol = const Color(0xFFA05520);
            } else if (isSelected) {
              bg = BookingColors.primary;
              border = BookingColors.primary;
              textCol = Colors.white;
              subtextCol = Colors.white70;
            } else {
              bg = Colors.white;
              border = BookingColors.cardBorder;
              textCol = BookingColors.textPrimary;
              subtextCol = const Color(0xFF2E7D32); // Xanh lá biểu thị còn trống
            }

            return InkWell(
              onTap: isAvailable
                  ? () {
                      setState(() {
                        _selectedSlot = slot.time;
                        if (_isAutoAssign && slot.subtext != null && slot.subtext!.startsWith('NV: ')) {
                          _assignedSpecialistName = slot.subtext!.replaceFirst('NV: ', '').trim();
                        } else if (!_isAutoAssign) {
                          _assignedSpecialistName = widget.appointment.specialistName;
                        }
                      });
                    }
                  : () => _showReasonDialog(slot),
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: 104,
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 7),
                decoration: BoxDecoration(
                  color: bg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: border, width: isSelected ? 1.5 : 1.0),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      slot.time,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: textCol,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      slot.subtext ?? (isAvailable ? 'Còn trống' : 'Bận'),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: subtextCol,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
