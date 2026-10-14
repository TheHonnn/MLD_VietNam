import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import 'package:medical_healthcare_app/features/home/data/models/home_models.dart';
import '../../../../core/widgets/smart_image.dart';

class SpecialistCardWidget extends StatelessWidget {
  final DoctorModel doctor;
  final VoidCallback onBookTap;
  final VoidCallback onProfileTap;

  const SpecialistCardWidget({
    super.key,
    required this.doctor,
    required this.onBookTap,
    required this.onProfileTap,
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
    return Container(
      margin: const EdgeInsets.only(bottom: 14.0),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar with availability
                Stack(
                  children: [
                    SmartImage(
                      imageUrl: doctor.avatarUrl,
                      width: 80,
                      height: 80,
                      borderRadius: BorderRadius.circular(16),
                      fit: BoxFit.cover,
                    ),
                    if (doctor.isAvailableToday)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.success,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.white, width: 1.5),
                          ),
                          child: const Text(
                            'Trống lịch',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 14),
                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        doctor.title,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.accent,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        doctor.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        doctor.speciality,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.business_rounded, size: 14, color: AppColors.textSecondary),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              doctor.clinicName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                          const SizedBox(width: 3),
                          Text(
                            '${doctor.rating}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            ' (${doctor.reviewCount} đánh giá)',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textPlaceholder,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            // Bio brief
            Text(
              doctor.bio,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary.withValues(alpha: 0.9),
                height: 1.3,
              ),
            ),
            const SizedBox(height: 14),
            const Divider(height: 1, color: AppColors.border),
            const SizedBox(height: 12),
            // Bottom Row: Price & Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Phí tư vấn',
                      style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                    Text(
                      _formatFee(doctor.consultationFee),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    TextButton(
                      onPressed: onProfileTap,
                      child: const Text(
                        'Xem hồ sơ',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    ElevatedButton(
                      onPressed: onBookTap,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        'Đặt lịch',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
