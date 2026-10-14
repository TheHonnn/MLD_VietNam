import 'package:flutter/material.dart';
import '../widgets/academy_widgets.dart';

/// Screen E11: Lịch học & điểm danh [8116:26294]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
class E11AttendanceScheduleScreen extends StatefulWidget {
  const E11AttendanceScheduleScreen({super.key});

  @override
  State<E11AttendanceScheduleScreen> createState() => _E11AttendanceScheduleScreenState();
}

class _E11AttendanceScheduleScreenState extends State<E11AttendanceScheduleScreen> {
  int _selectedDay = 16;
  bool _isCheckedIn = false;

  // Lịch mẫu tháng 10/2026
  final Map<int, String> _eventDots = {
    9: 'practice',
    10: 'class',
    11: 'practice',
    12: 'online',
    16: 'class',
    17: 'practice',
    18: 'practice',
    23: 'class',
    24: 'practice',
    25: 'practice',
    30: 'exam',
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        subtitleTag: 'Dữ liệu minh họa',
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Giới thiệu [8116:26299]
            const Text(
              'Lịch học & điểm danh',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Chủ động theo dõi lịch đào tạo và các buổi thực hành.',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: AcademyColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),

            // 2. CalendarPicker / Tháng 10 năm 2026 [8116:26305]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                children: [
                  // Header Lịch
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios, size: 16, color: AcademyColors.textPrimary),
                        onPressed: () {},
                      ),
                      const Text(
                        'Tháng 10, 2026',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AcademyColors.textPrimary,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.arrow_forward_ios, size: 16, color: AcademyColors.textPrimary),
                        onPressed: () {},
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Thứ trong tuần
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: const [
                      Text('T2', style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary, fontWeight: FontWeight.w600)),
                      Text('T3', style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary, fontWeight: FontWeight.w600)),
                      Text('T4', style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary, fontWeight: FontWeight.w600)),
                      Text('T5', style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary, fontWeight: FontWeight.w600)),
                      Text('T6', style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary, fontWeight: FontWeight.w600)),
                      Text('T7', style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary, fontWeight: FontWeight.w600)),
                      Text('CN', style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Lưới ngày trong tháng
                  _buildCalendarDaysGrid(),
                  const SizedBox(height: 16),

                  // Chú giải lịch [8116:26308]
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildLegendDot(const Color(0xFF1E88E5), 'Trực tuyến'),
                      const SizedBox(width: 14),
                      _buildLegendDot(AcademyColors.primary, 'Tại lớp'),
                      const SizedBox(width: 14),
                      _buildLegendDot(const Color(0xFFC58D59), 'Thực hành'),
                      const SizedBox(width: 14),
                      _buildLegendDot(const Color(0xFF40352F), 'Kiểm tra'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Center(
              child: Text(
                '$_selectedDay/10/2026 đang chọn · Lịch và các dấu sự kiện là minh họa.',
                style: const TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
              ),
            ),
            const SizedBox(height: 20),

            // 3. Thẻ thông tin ngày học đã chọn [8116:26313]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Thứ 6 · $_selectedDay/10/2026',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Container(
                        width: 56,
                        height: 64,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '$_selectedDay',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w700,
                                color: AcademyColors.primary,
                                height: 1.1,
                              ),
                            ),
                            const Text(
                              'Tháng 10',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                                color: AcademyColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '13:00–17:00',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AcademyColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Thực hành kỹ thuật massage cơ bản',
                              style: TextStyle(
                                fontSize: 13,
                                color: AcademyColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Kỹ thuật Massage Chuyên Nghiệp',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AcademyColors.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Phòng thực hành 02 · Chi nhánh mẫu 01 — Quận 3',
                    style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Giảng viên Nguyễn Thanh Hương',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AcademyColors.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 4. Tổng quan chuyên cần [8116:26323]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'Tổng quan chuyên cần',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  SizedBox(height: 10),
                  Text(
                    'Kỹ thuật Massage Chuyên Nghiệp',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AcademyColors.textPrimary),
                  ),
                  SizedBox(height: 4),
                  Text(
                    '88.9% · 8 / 9 buổi đã diễn ra',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.primary,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    '9 buổi đã diễn ra: có mặt 8, vắng 1.',
                    style: TextStyle(fontSize: 13, color: AcademyColors.textPrimary),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'MCN-0926 · Kế hoạch toàn khóa: 36 buổi. Tỷ lệ chuyên cần chỉ tính trên 9 buổi đã diễn ra, không phải 36 buổi dự kiến.',
                    style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 5. AttendanceCard / 01 (Điểm danh buổi học) [8116:26329]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Điểm danh buổi học',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'MCN-0926 · 16/10/2026 · 13:00–17:00',
                    style: TextStyle(fontSize: 13, color: AcademyColors.textPrimary),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: _isCheckedIn ? const Color(0xFFE8F5E9) : AcademyColors.cardWarm,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _isCheckedIn ? '✓ Đã điểm danh' : 'Chưa điểm danh',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _isCheckedIn ? const Color(0xFF2E8B57) : AcademyColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Khung QR điểm danh
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AcademyColors.cardWarm,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                    ),
                    child: Column(
                      children: const [
                        Icon(Icons.qr_code_scanner, size: 80, color: AcademyColors.primary),
                        SizedBox(height: 10),
                        Text(
                          'QR điểm danh tại phòng thực hành 02',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AcademyColors.textPrimary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Chỉ minh họa giao diện. Chưa xác minh điểm danh, vị trí hoặc danh tính được ủy quyền.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                  ),
                  const SizedBox(height: 16),

                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: () {
                        setState(() => _isCheckedIn = true);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Điểm danh thành công cho buổi học ngày 16/10/2026!'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(0, 56),
                        backgroundColor: _isCheckedIn ? const Color(0xFF2E8B57) : AcademyColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: Text(
                        _isCheckedIn ? 'Đã điểm danh' : 'Điểm danh',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCalendarDaysGrid() {
    // Tháng 10/2026 bắt đầu từ Thứ 5 (offset = 3 nếu bắt đầu T2)
    // Ngày 1 rơi vào thứ 5 (index 3)
    const offset = 3;
    final totalDays = 31;
    final totalCells = offset + totalDays;
    final rows = (totalCells / 7).ceil();

    return Column(
      children: List.generate(rows, (r) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(7, (c) {
              final cellIndex = r * 7 + c;
              final day = cellIndex - offset + 1;
              if (day < 1 || day > totalDays) {
                return const SizedBox(width: 36, height: 40);
              }

              final isSelected = day == _selectedDay;
              final dotType = _eventDots[day];

              return InkWell(
                onTap: () => setState(() => _selectedDay = day),
                borderRadius: BorderRadius.circular(18),
                child: Container(
                  width: 36,
                  height: 40,
                  decoration: BoxDecoration(
                    color: isSelected ? AcademyColors.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$day',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? Colors.white : AcademyColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      if (dotType != null)
                        Container(
                          width: 4,
                          height: 4,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isSelected
                                ? Colors.white
                                : dotType == 'online'
                                    ? const Color(0xFF1E88E5)
                                    : dotType == 'class'
                                        ? AcademyColors.primary
                                        : dotType == 'practice'
                                            ? const Color(0xFFC58D59)
                                            : const Color(0xFF40352F),
                          ),
                        )
                      else
                        const SizedBox(height: 4),
                    ],
                  ),
                ),
              );
            }),
          ),
        );
      }),
    );
  }

  Widget _buildLegendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AcademyColors.textSecondary),
        ),
      ],
    );
  }
}
