import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/home_models.dart';
import '../../../../core/widgets/smart_image.dart';

class TopSpecialistsWidget extends StatelessWidget {
  final List<DoctorModel> doctors;
  final ValueChanged<DoctorModel>? onDoctorTap;
  final VoidCallback? onSeeAllTap;

  const TopSpecialistsWidget({
    super.key,
    required this.doctors,
    this.onDoctorTap,
    this.onSeeAllTap,
  });

  String _formatFee(double fee) {
    final intFee = fee.toInt();
    final buffer = StringBuffer();
    final str = intFee.toString();
    int count = 0;
    for (int i = str.length - 1; i >= 0; i--) {
      buffer.write(str[i]);
      count++;
      if (count % 3 == 0 && i != 0) {
        buffer.write('.');
      }
    }
    return '${buffer.toString().split('').reversed.join()} đ';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Đội ngũ chuyên gia y tế',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              GestureDetector(
                onTap: onSeeAllTap,
                child: const Text(
                  'Xem tất cả',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          itemCount: doctors.length,
          itemBuilder: (context, index) {
            final doc = doctors[index];
            return Container(
              margin: const EdgeInsets.only(bottom: 14.0),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(18),
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () => onDoctorTap?.call(doc),
                  child: Padding(
                    padding: const EdgeInsets.all(14.0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Doctor Avatar
                        Stack(
                          children: [
                            SmartImage(
                              imageUrl: doc.avatarUrl,
                              width: 72,
                              height: 72,
                              borderRadius: BorderRadius.circular(14),
                              fit: BoxFit.cover,
                            ),
                            if (doc.isAvailableToday)
                              Positioned(
                                bottom: 2,
                                right: 2,
                                child: Container(
                                  width: 12,
                                  height: 12,
                                  decoration: BoxDecoration(
                                    color: AppColors.success,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 2),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(width: 14),
                        // Information
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                doc.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.accent,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                doc.name,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                doc.speciality,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.star_rounded,
                                    size: 16,
                                    color: Colors.amber,
                                  ),
                                  const SizedBox(width: 3),
                                  Text(
                                    '${doc.rating}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    ' (${doc.reviewCount})',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textPlaceholder,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Container(
                                    width: 3,
                                    height: 3,
                                    decoration: const BoxDecoration(
                                      color: AppColors.textPlaceholder,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    '${doc.experienceYears} năm KN',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        // Action button
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              _formatFee(doc.consultationFee),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Text(
                                'Đặt lịch',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

