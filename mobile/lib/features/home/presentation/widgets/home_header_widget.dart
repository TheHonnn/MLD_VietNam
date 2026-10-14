import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';

class HomeHeaderWidget extends StatelessWidget {
  final String userName;
  final String membershipTier;
  final int unreadNotifications;
  final VoidCallback onNotificationTap;
  final VoidCallback onProfileTap;

  const HomeHeaderWidget({
    super.key,
    required this.userName,
    this.membershipTier = 'Gold Member',
    this.unreadNotifications = 3,
    required this.onNotificationTap,
    required this.onProfileTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // User info row with avatar
          GestureDetector(
            onTap: onProfileTap,
            child: Row(
              children: [
                Stack(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.primary, width: 2),
                        image: const DecorationImage(
                          image: AssetImage('assets/images/doctor_2.png'),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(
                          color: Color(0xFFD97706), // Gold color
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.star_rounded,
                          size: 12,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Xin chào,',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary.withValues(alpha: 0.9),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      userName,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.workspace_premium_rounded,
                            size: 12,
                            color: Color(0xFFD97706),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            membershipTier,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFB45309),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Action buttons: search / notifications
          Row(
            children: [
              GestureDetector(
                onTap: onNotificationTap,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      const Icon(
                        Icons.notifications_none_rounded,
                        color: AppColors.textPrimary,
                        size: 24,
                      ),
                      if (unreadNotifications > 0)
                        Positioned(
                          top: 9,
                          right: 10,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.error,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

