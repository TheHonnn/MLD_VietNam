import 'package:flutter/material.dart';
import '../../data/models/booking_models.dart';
import '../../data/repositories/mock_booking_repository.dart';
import 'group_c_widgets.dart';

/// ComponentFamily / RescheduleBottomSheet [8111:29082]
class RescheduleBottomSheet extends StatefulWidget {
  final AppointmentItemModel appointment;
  final void Function(DateTime newDate, String newSlot) onConfirmReschedule;

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
  late String _selectedSlot;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Figma mặc định: đổi sang 13/10/2026 và 15:00–16:00
    _selectedDate = DateTime(2026, 10, 13);
    _selectedSlot = '15:00–16:00';
  }

  @override
  Widget build(BuildContext context) {
    final availableSlots = MockBookingRepository.getSlotsForDate(_selectedDate);

    final currDate = widget.appointment.appointmentDate;
    final currDateStr =
        '${currDate.day.toString().padLeft(2, '0')}/${currDate.month.toString().padLeft(2, '0')}/${currDate.year}';
    final newDateStr =
        '${_selectedDate.day.toString().padLeft(2, '0')}/${_selectedDate.month.toString().padLeft(2, '0')}/${_selectedDate.year}';

    return Container(
      decoration: const BoxDecoration(
        color: BookingColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tay nắm (40x4, r=2, fill=#E3D1BF)
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
          const SizedBox(height: 14),

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
                      fontWeight: FontWeight.w600,
                      color: BookingColors.heading,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${widget.appointment.bookingCode} tĩnh',
                    style: const TextStyle(
                      fontSize: 12,
                      color: BookingColors.textPrimary,
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
          const SizedBox(height: 10),

          // Lịch hiện tại
          Text(
            'Lịch hiện tại: $currDateStr · ${widget.appointment.timeSlot}',
            style: const TextStyle(
              fontSize: 14,
              color: BookingColors.textPrimary,
            ),
          ),
          const SizedBox(height: 14),

          // Lựa chọn: Ngày mới (318x76)
          const Text(
            'Ngày mới',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: BookingColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          InkWell(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _selectedDate,
                firstDate: DateTime(2026, 1, 1),
                lastDate: DateTime(2027, 12, 31),
              );
              if (picked != null) {
                setState(() => _selectedDate = picked);
              }
            },
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
                    newDateStr,
                    style: const TextStyle(fontSize: 15, color: BookingColors.textPrimary),
                  ),
                  const Icon(Icons.calendar_today, size: 18, color: BookingColors.heading),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Lựa chọn: Giờ mới (318x76)
          const Text(
            'Giờ mới',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: BookingColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: BookingColors.cardBorder),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: availableSlots.any((s) => s.time == _selectedSlot)
                    ? _selectedSlot
                    : (availableSlots.isNotEmpty ? availableSlots.first.time : _selectedSlot),
                isExpanded: true,
                icon: const Icon(Icons.keyboard_arrow_down, color: BookingColors.heading),
                items: (availableSlots.isNotEmpty
                        ? availableSlots.map((s) => s.time)
                        : ['14:00–15:00', '15:00–16:00', '16:00–17:00'])
                    .map((time) {
                  return DropdownMenuItem<String>(
                    value: time,
                    child: Text(
                      time,
                      style: const TextStyle(fontSize: 15, color: BookingColors.textPrimary),
                    ),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedSlot = val);
                  }
                },
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Ghi chú chuẩn Figma
          IllustrationNoteCard(
            text:
                'Đổi sang $newDateStr · $_selectedSlot, khoảng vệ sinh đến ${_calculateCleaningEndTime(_selectedSlot)}. Kiểm tra lại nguồn lực trước giữ chỗ và cập nhật.',
          ),
          const SizedBox(height: 18),

          // Button Xác nhận đổi lịch (350x56, r=14, fill=#985018)
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _isLoading
                  ? null
                  : () {
                      final nav = Navigator.of(context);
                      setState(() => _isLoading = true);
                      widget.onConfirmReschedule(_selectedDate, _selectedSlot);
                      nav.pop();
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: BookingColors.primary,
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
                  : const Text(
                      'Xác nhận đổi lịch',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  String _calculateCleaningEndTime(String slot) {
    if (slot.contains('–') || slot.contains('-')) {
      final parts = slot.split(RegExp(r'[–\-]'));
      if (parts.length > 1) {
        final end = parts[1].trim();
        final timeParts = end.split(':');
        if (timeParts.length == 2) {
          int h = int.tryParse(timeParts[0]) ?? 16;
          int m = (int.tryParse(timeParts[1]) ?? 0) + 15;
          if (m >= 60) {
            h += 1;
            m -= 60;
          }
          return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
        }
      }
    }
    return '16:15';
  }
}
