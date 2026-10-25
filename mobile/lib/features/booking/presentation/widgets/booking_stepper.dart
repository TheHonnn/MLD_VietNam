import 'package:flutter/material.dart';

/// ComponentFamily / BookingProgress [8111:27690]
/// 4 giai đoạn thân thiện:
/// - Bước 1: Dịch vụ (C01)
/// - Bước 2: Lịch hẹn (C02, C03, C04, C05)
/// - Bước 3: Xác nhận (C06, C07)
/// - Bước 4: Hoàn tất (C08)
class BookingStepper extends StatelessWidget {
  final int currentStep; // 1, 2, 3, 4

  const BookingStepper({
    super.key,
    required this.currentStep,
  });

  @override
  Widget build(BuildContext context) {
    const steps = [
      'Dịch vụ',
      'Lịch hẹn',
      'Xác nhận',
      'Hoàn tất',
    ];

    const activeColor = Color(0xFF168477);
    const inactiveTextColor = Color(0xFF475569);

    return SizedBox(
      height: 36,
      child: Row(
        children: List.generate(steps.length, (index) {
          final stepNum = index + 1;
          final isPassedOrCurrent = stepNum <= currentStep;
          final isCurrent = stepNum == currentStep;

          return Expanded(
            child: Padding(
              padding: EdgeInsets.only(
                right: index == steps.length - 1 ? 0 : 7,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    steps[index],
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
                      color: isPassedOrCurrent ? activeColor : inactiveTextColor,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    height: 3.5,
                    decoration: BoxDecoration(
                      color: isPassedOrCurrent ? activeColor : const Color(0xFFEADBCE),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}
