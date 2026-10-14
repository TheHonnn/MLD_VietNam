import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';

class CategoryGridWidget extends StatelessWidget {
  final List<Map<String, dynamic>> categories;
  final ValueChanged<String>? onCategoryTap;

  const CategoryGridWidget({
    super.key,
    required this.categories,
    this.onCategoryTap,
  });

  IconData _getIconData(String iconName) {
    switch (iconName) {
      case 'medical_services_rounded':
        return Icons.medical_services_rounded;
      case 'healing_rounded':
        return Icons.healing_rounded;
      case 'spa_rounded':
        return Icons.spa_rounded;
      case 'school_rounded':
        return Icons.school_rounded;
      case 'video_call_rounded':
        return Icons.video_call_rounded;
      case 'card_membership_rounded':
        return Icons.card_membership_rounded;
      default:
        return Icons.local_hospital_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Dịch vụ chuyên khoa',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              GestureDetector(
                onTap: () => onCategoryTap?.call('all'),
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
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: categories.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 14,
              mainAxisSpacing: 16,
              childAspectRatio: 0.88,
            ),
            itemBuilder: (context, index) {
              final cat = categories[index];
              final hasBadge = cat['badge'] != null;

              return GestureDetector(
                onTap: () => onCategoryTap?.call(cat['id'] as String),
                child: Column(
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Container(
                          width: 68,
                          height: 68,
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
                          child: Icon(
                            _getIconData(cat['icon'] as String),
                            color: AppColors.primary,
                            size: 32,
                          ),
                        ),
                        if (hasBadge)
                          Positioned(
                            top: -4,
                            right: -4,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: cat['badge'] == 'Hot'
                                    ? AppColors.error
                                    : const Color(0xFFD97706),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                cat['badge'] as String,
                                style: const TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      cat['title'] as String,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

