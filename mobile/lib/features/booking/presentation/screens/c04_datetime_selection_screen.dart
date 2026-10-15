import 'package:flutter/material.dart';
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
  late String _selectedTimeSlot;

  // 7 ngày từ 12/10/2026 đến 18/10/2026 theo đúng mẫu Figma
  final List<DateTime> _weekDays = List.generate(
    7,
    (index) => DateTime(2026, 10, 12 + index),
  );

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime(2026, 10, 12);
    _selectedTimeSlot = '14:00–15:00';
    widget.flowState.selectedDate = _selectedDate;
    widget.flowState.selectedSlot = TimeSlotModel(
      id: 'slot-1400',
      time: _selectedTimeSlot,
      periodName: 'Chiều',
      period: SlotPeriod.afternoon,
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

  @override
  Widget build(BuildContext context) {
    final serviceName = widget.flowState.allSelectedServices.isNotEmpty
        ? widget.flowState.allSelectedServices.first.name
        : 'Massage thư giãn toàn thân';
    final branchName = widget.flowState.selectedBranch?.name ?? 'Chi nhánh Quận 3';
    final specialistName = widget.flowState.autoAssignSpecialist
        ? 'Để trung tâm sắp xếp'
        : (widget.flowState.selectedSpecialist?.name ?? 'Trần Minh Phương');
    final durationMinutes = widget.flowState.totalDurationMinutes;

    final dateStr =
        '${_selectedDate.day.toString().padLeft(2, '0')}/${_selectedDate.month.toString().padLeft(2, '0')}/${_selectedDate.year}';

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

                  // Thẻ thông tin dịch vụ tóm tắt trên cùng (350x132, fill=#F3E2CE)
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
                              _selectedTimeSlot,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: BookingColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Khung Tháng và lịch: Chuyển tháng + DateStrip 7 ngày
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        onPressed: () {},
                        icon: const Icon(Icons.chevron_left, color: BookingColors.textPrimary),
                      ),
                      const Text(
                        'Tháng 10, 2026',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.textPrimary,
                        ),
                      ),
                      IconButton(
                        onPressed: () {},
                        icon: const Icon(Icons.chevron_right, color: BookingColors.textPrimary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // DateStrip 7 ngày (mỗi ngày 44x72, r=12)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: _weekDays.map((day) {
                      final isSelected = day.day == _selectedDate.day &&
                          day.month == _selectedDate.month &&
                          day.year == _selectedDate.year;
                      return InkWell(
                        onTap: () {
                          setState(() {
                            _selectedDate = day;
                            widget.flowState.selectedDate = day;
                          });
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: 44,
                          height: 72,
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
                                _getDayOfWeekShort(day.weekday),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isSelected ? Colors.white : BookingColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${day.day}',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: isSelected ? Colors.white : BookingColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),

                  // Link Mở lịch tháng
                  Center(
                    child: TextButton(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _selectedDate,
                          firstDate: DateTime(2026, 1, 1),
                          lastDate: DateTime(2027, 12, 31),
                        );
                        if (picked != null) {
                          setState(() {
                            _selectedDate = picked;
                            widget.flowState.selectedDate = picked;
                          });
                        }
                      },
                      style: TextButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Mở lịch tháng',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const Center(
                    child: Text(
                      '12/10/2026–18/10/2026 · Lịch trống trong tuần',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        color: BookingColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Ca 1: Buổi sáng
                  _buildPeriodHeader('Buổi sáng'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildSlotButton(
                        time: '09:00',
                        subtext: 'Không khả dụng',
                        isAvailable: false,
                        isSelected: false,
                      ),
                      _buildSlotButton(
                        time: '09:30',
                        subtext: 'Đã đặt',
                        isAvailable: false,
                        isSelected: false,
                      ),
                      _buildSlotButton(
                        time: '10:00',
                        subtext: 'Không khả dụng',
                        isAvailable: false,
                        isSelected: false,
                      ),
                      _buildSlotButton(
                        time: '10:30',
                        isAvailable: true,
                        isSelected: _selectedTimeSlot == '10:30–11:30',
                        onTap: () => _selectSlot('10:30–11:30', SlotPeriod.morning),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Ca 2: Buổi chiều
                  _buildPeriodHeader('Buổi chiều'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildSlotButton(
                        time: '13:30',
                        isAvailable: true,
                        isSelected: _selectedTimeSlot == '13:30–14:30',
                        onTap: () => _selectSlot('13:30–14:30', SlotPeriod.afternoon),
                      ),
                      _buildSlotButton(
                        time: '14:00',
                        isAvailable: true,
                        isSelected: _selectedTimeSlot == '14:00–15:00',
                        onTap: () => _selectSlot('14:00–15:00', SlotPeriod.afternoon),
                      ),
                      _buildSlotButton(
                        time: '14:30',
                        isAvailable: true,
                        isSelected: _selectedTimeSlot == '14:30–15:30',
                        onTap: () => _selectSlot('14:30–15:30', SlotPeriod.afternoon),
                      ),
                      _buildSlotButton(
                        time: '15:00',
                        isAvailable: true,
                        isSelected: _selectedTimeSlot == '15:00–16:00',
                        onTap: () => _selectSlot('15:00–16:00', SlotPeriod.afternoon),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Ca 3: Buổi tối
                  _buildPeriodHeader('Buổi tối'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildSlotButton(
                        time: '18:30',
                        isAvailable: true,
                        isSelected: _selectedTimeSlot == '18:30–19:30',
                        onTap: () => _selectSlot('18:30–19:30', SlotPeriod.evening),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Hướng dẫn khung giờ
                  const Text(
                    'Trống: có thể chọn · Viền chủ đạo: đang chọn · Nhãn “Đã đặt” và “Không khả dụng”: không thể chọn. Ví dụ nguồn lực đã bận 09:30–10:30 gồm khoảng vệ sinh, nên 09:00 và 10:00 không phù hợp.',
                    style: TextStyle(
                      fontSize: 12,
                      color: BookingColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Thẻ thông tin chuẩn bị & vệ sinh (350x180, fill=#F3E2CE, r=20)
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
                              _selectedTimeSlot,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: BookingColors.primary,
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
                        const Text(
                          'Chuẩn bị / vệ sinh riêng: 15 phút sau buổi. Chiếm dụng phòng và chuyên viên: 14:00–15:15.',
                          style: TextStyle(
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

            // Fixed Bottom Bar
            BookingFixedBottomBar(
              summaryText: '$dateStr · $_selectedTimeSlot · $durationMinutes phút',
              buttonText: 'Tiếp tục',
              onPressed: () {
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

  void _selectSlot(String slot, SlotPeriod period) {
    setState(() {
      _selectedTimeSlot = slot;
      widget.flowState.selectedSlot = TimeSlotModel(
        id: 'slot-${slot.split("–")[0]}',
        time: slot,
        periodName: period == SlotPeriod.morning
            ? 'Sáng'
            : (period == SlotPeriod.afternoon ? 'Chiều' : 'Tối'),
        period: period,
      );
    });
  }

  Widget _buildPeriodHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: BookingColors.textPrimary,
      ),
    );
  }

  Widget _buildSlotButton({
    required String time,
    String? subtext,
    required bool isAvailable,
    required bool isSelected,
    VoidCallback? onTap,
  }) {
    Color bg;
    Color border;
    Color textColor;

    if (!isAvailable) {
      bg = BookingColors.slotDisabledBg;
      border = BookingColors.cardBorder;
      textColor = BookingColors.textSecondary;
    } else if (isSelected) {
      bg = BookingColors.primary;
      border = BookingColors.primary;
      textColor = Colors.white;
    } else {
      bg = Colors.white;
      border = BookingColors.cardBorder;
      textColor = BookingColors.textPrimary;
    }

    return InkWell(
      onTap: isAvailable ? onTap : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 104,
        height: subtext != null ? 62 : 52,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border),
        ),
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              time,
              style: TextStyle(
                fontSize: 15,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: textColor,
              ),
            ),
            if (subtext != null) ...[
              const SizedBox(height: 2),
              Text(
                subtext,
                style: TextStyle(
                  fontSize: 11,
                  color: textColor,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
