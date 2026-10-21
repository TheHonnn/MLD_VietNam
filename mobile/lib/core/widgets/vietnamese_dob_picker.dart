import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

/// Helper và Modal chọn ngày tháng năm sinh Việt hóa 3 bước:
/// Bước 1: Chọn Năm -> Bước 2: Chọn Tháng -> Bước 3: Chọn Ngày.
class VietnameseDobPicker {
  static Future<DateTime?> show(
    BuildContext context, {
    DateTime? initialDate,
    int minYear = 1940,
    int? maxYear,
  }) async {
    final effectiveMaxYear = maxYear ?? DateTime.now().year;
    final effectiveInitial = initialDate ?? DateTime(2000, 1, 1);

    return showModalBottomSheet<DateTime>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _DobPickerSheet(
        initialDate: effectiveInitial,
        minYear: minYear,
        maxYear: effectiveMaxYear,
      ),
    );
  }
}

class _DobPickerSheet extends StatefulWidget {
  final DateTime initialDate;
  final int minYear;
  final int maxYear;

  const _DobPickerSheet({
    required this.initialDate,
    required this.minYear,
    required this.maxYear,
  });

  @override
  State<_DobPickerSheet> createState() => _DobPickerSheetState();
}

class _DobPickerSheetState extends State<_DobPickerSheet> {
  int _step = 1; // 1: Năm, 2: Tháng, 3: Ngày
  late int _selectedYear;
  late int _selectedMonth;
  late int _selectedDay;

  final ScrollController _yearScrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _selectedYear = widget.initialDate.year.clamp(widget.minYear, widget.maxYear);
    _selectedMonth = widget.initialDate.month;
    _selectedDay = widget.initialDate.day;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToInitialYear();
    });
  }

  void _scrollToInitialYear() {
    if (!_yearScrollController.hasClients) return;
    final totalYears = widget.maxYear - widget.minYear + 1;
    final index = widget.maxYear - _selectedYear; // xếp giảm dần
    if (index >= 0 && index < totalYears) {
      final targetOffset = (index / 4).floor() * 56.0;
      if (targetOffset < _yearScrollController.position.maxScrollExtent) {
        _yearScrollController.jumpTo(targetOffset);
      }
    }
  }

  @override
  void dispose() {
    _yearScrollController.dispose();
    super.dispose();
  }

  int _daysInMonth(int year, int month) {
    return DateTime(year, month + 1, 0).day;
  }

  void _onYearSelected(int year) {
    setState(() {
      _selectedYear = year;
      _step = 2; // Tự động sang chọn Tháng
    });
  }

  void _onMonthSelected(int month) {
    setState(() {
      _selectedMonth = month;
      final maxDays = _daysInMonth(_selectedYear, _selectedMonth);
      if (_selectedDay > maxDays) {
        _selectedDay = maxDays;
      }
      _step = 3; // Tự động sang chọn Ngày
    });
  }

  void _onDaySelected(int day) {
    setState(() {
      _selectedDay = day;
    });
  }

  void _confirmSelection() {
    final result = DateTime(_selectedYear, _selectedMonth, _selectedDay);
    Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) {
    final maxDays = _daysInMonth(_selectedYear, _selectedMonth);
    if (_selectedDay > maxDays) {
      _selectedDay = maxDays;
    }

    String title;
    String subtitle;
    if (_step == 1) {
      title = 'Chọn năm sinh';
      subtitle = 'Bước 1/3: Chọn năm sinh của bạn';
    } else if (_step == 2) {
      title = 'Chọn tháng sinh';
      subtitle = 'Bước 2/3: Năm $_selectedYear';
    } else {
      title = 'Chọn ngày sinh';
      subtitle = 'Bước 3/3: Tháng $_selectedMonth / Năm $_selectedYear';
    }

    return Container(
      height: MediaQuery.of(context).size.height * 0.72,
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 6),
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                if (_step > 1)
                  IconButton(
                    icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
                    onPressed: () {
                      setState(() {
                        _step--;
                      });
                    },
                  )
                else
                  const SizedBox(width: 48),
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textHeading,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: AppColors.textPrimary),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),

          // Step breadcrumbs indicator
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 6),
            child: Row(
              children: [
                _buildStepPill(1, 'Năm $_selectedYear'),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right, size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 8),
                _buildStepPill(2, 'Tháng $_selectedMonth'),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right, size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 8),
                _buildStepPill(3, 'Ngày $_selectedDay'),
              ],
            ),
          ),

          const Divider(height: 16, color: AppColors.border),

          // Content based on step
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: _buildStepContent(),
            ),
          ),

          // Bottom Bar
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.border, width: 1)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Ngày sinh đã chọn:',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      Text(
                        '${_selectedDay.toString().padLeft(2, '0')}/${_selectedMonth.toString().padLeft(2, '0')}/$_selectedYear',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(
                  height: 46,
                  child: ElevatedButton(
                    onPressed: _confirmSelection,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Xác nhận',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepPill(int stepNumber, String label) {
    final isActive = _step == stepNumber;
    final isDone = _step > stepNumber;

    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _step = stepNumber;
          });
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.primary
                : (isDone ? AppColors.surfaceSecondary : Colors.transparent),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isActive ? AppColors.primary : AppColors.border,
            ),
          ),
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
              color: isActive
                  ? Colors.white
                  : (isDone ? AppColors.primary : AppColors.textSecondary),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    if (_step == 1) {
      // Step 1: Chọn Năm (Lưới 4 cột)
      final years = List.generate(
        widget.maxYear - widget.minYear + 1,
        (i) => widget.maxYear - i,
      );

      return GridView.builder(
        key: const ValueKey('step_year'),
        controller: _yearScrollController,
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4,
          childAspectRatio: 1.6,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
        ),
        itemCount: years.length,
        itemBuilder: (context, index) {
          final year = years[index];
          final isSelected = year == _selectedYear;

          return InkWell(
            onTap: () => _onYearSelected(year),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.border,
                  width: 1.2,
                ),
              ),
              child: Text(
                year.toString(),
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? Colors.white : AppColors.textPrimary,
                ),
              ),
            ),
          );
        },
      );
    } else if (_step == 2) {
      // Step 2: Chọn Tháng (Lưới 3 cột, 12 tháng)
      return GridView.builder(
        key: const ValueKey('step_month'),
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          childAspectRatio: 1.8,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: 12,
        itemBuilder: (context, index) {
          final month = index + 1;
          final isSelected = month == _selectedMonth;

          return InkWell(
            onTap: () => _onMonthSelected(month),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.border,
                  width: 1.2,
                ),
              ),
              child: Text(
                'Tháng $month',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? Colors.white : AppColors.textPrimary,
                ),
              ),
            ),
          );
        },
      );
    } else {
      // Step 3: Chọn Ngày (Lưới 7 cột)
      final totalDays = _daysInMonth(_selectedYear, _selectedMonth);

      return GridView.builder(
        key: const ValueKey('step_day'),
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 7,
          childAspectRatio: 1.0,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
        ),
        itemCount: totalDays,
        itemBuilder: (context, index) {
          final day = index + 1;
          final isSelected = day == _selectedDay;

          return InkWell(
            onTap: () => _onDaySelected(day),
            borderRadius: BorderRadius.circular(10),
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.border,
                  width: 1.2,
                ),
              ),
              child: Text(
                day.toString(),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? Colors.white : AppColors.textPrimary,
                ),
              ),
            ),
          );
        },
      );
    }
  }
}

