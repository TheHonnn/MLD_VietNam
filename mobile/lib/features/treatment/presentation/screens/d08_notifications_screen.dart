import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/treatment_models.dart';
import '../../data/repositories/treatment_repository.dart';
import 'd01_my_packages_screen.dart';

class D08NotificationsScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const D08NotificationsScreen({
    super.key,
    this.onBack,
  });

  @override
  State<D08NotificationsScreen> createState() => _D08NotificationsScreenState();
}

class _D08NotificationsScreenState extends State<D08NotificationsScreen> {
  final TreatmentRepository _repo = TreatmentRepository.instance;

  int _selectedTabIndex = 0; // 0: Tất cả, 1: Lịch hẹn, 2: Liệu trình, 3: Đào tạo
  final List<String> _tabs = ['Tất cả', 'Lịch hẹn', 'Liệu trình', 'Đào tạo'];
  late List<TreatmentNotificationModel> _notifications;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  void _loadNotifications() {
    _notifications = List.from(_repo.getTreatmentNotifications());
  }

  void _markAllAsRead() {
    setState(() {
      for (final n in _notifications) {
        n.isRead = true;
      }
    });
    _repo.markAllNotificationsAsRead();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đã đánh dấu tất cả thông báo là đã đọc'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  void _markOneAsRead(TreatmentNotificationModel item) {
    setState(() {
      item.isRead = true;
    });
    _repo.markNotificationAsRead(item.id);

    if (item.category == NotificationCategory.treatments ||
        item.category == NotificationCategory.appointments) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            item.category == NotificationCategory.appointments ? 'Lịch hẹn chăm sóc' : 'Thông tin liệu trình',
            style: const TextStyle(color: Color(0xFF1F2937), fontWeight: FontWeight.w700),
          ),
          content: Text(
            item.title,
            style: const TextStyle(color: Color(0xFF1E293B), fontSize: 14),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Đóng', style: TextStyle(color: Color(0xFF6B6158))),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const D01MyPackagesScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF168477),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Xem gói liệu trình', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    }
  }

  IconData _getIconData(String iconType) {
    switch (iconType) {
      case 'calendar':
        return Icons.calendar_today_outlined;
      case 'leaf':
        return Icons.spa_outlined;
      case 'gift':
        return Icons.card_giftcard;
      case 'graduation':
        return Icons.school_outlined;
      default:
        return Icons.notifications_none;
    }
  }

  @override
  Widget build(BuildContext context) {
    // Lọc theo danh mục
    final filtered = _notifications.where((n) {
      if (_selectedTabIndex == 1) return n.category == NotificationCategory.appointments;
      if (_selectedTabIndex == 2) return n.category == NotificationCategory.treatments;
      if (_selectedTabIndex == 3) return n.category == NotificationCategory.academy;
      return true;
    }).toList();

    // Nhóm theo dateGroup
    final groups = <String, List<TreatmentNotificationModel>>{};
    for (final item in filtered) {
      groups.putIfAbsent(item.dateGroup, () => []).add(item);
    }

    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- 1. ĐIỀU HƯỚNG ---
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  InkWell(
                    onTap: () {
                      if (widget.onBack != null) {
                        widget.onBack!();
                      } else {
                        Navigator.of(context).pop();
                      }
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
                      ),
                      child: const Icon(
                        Icons.arrow_back,
                        color: Color(0xFF1E293B),
                        size: 20,
                      ),
                    ),
                  ),
                  const Text(
                    'CHĂM SÓC & TRỊ LIỆU',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: Color(0xFF168477),
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Tiêu đề H1
              const Text(
                'Thông báo',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1F2937),
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Cập nhật lịch hẹn và các hoạt động chăm sóc của bạn.',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: Color(0xFF6B6158),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),

              // --- 2. QUẢN LÝ THÔNG BÁO ---
              Row(
                children: [
                  InkWell(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Cài đặt thông báo ứng dụng')),
                      );
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
                      ),
                      child: const Icon(
                        Icons.tune,
                        color: Color(0xFF168477),
                        size: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: _markAllAsRead,
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        height: 44,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
                        ),
                        child: const Text(
                          'Đánh dấu đã đọc',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF168477),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // --- 3. KHUNG BỘ LỌC (4 TABS) ---
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: List.generate(_tabs.length, (index) {
                    final isSelected = _selectedTabIndex == index;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: InkWell(
                        onTap: () {
                          setState(() {
                            _selectedTabIndex = index;
                          });
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          height: 44,
                          padding: const EdgeInsets.symmetric(horizontal: 18),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF168477) : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected ? const Color(0xFF168477) : const Color(0xFFE2E8F0),
                              width: 1.0,
                            ),
                          ),
                          child: Text(
                            _tabs[index],
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              color: isSelected ? Colors.white : const Color(0xFF1E293B),
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 14),

              const Text(
                'Thông báo hoạt động & ưu đãi từ hệ thống MLD',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: Color(0xFF6B6158),
                ),
              ),
              const SizedBox(height: 20),

              // --- 4. DANH SÁCH THÔNG BÁO NHÓM THEO NGÀY ---
              if (groups.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(32),
                  alignment: Alignment.center,
                  child: const Text(
                    'Không có thông báo nào trong mục này',
                    style: TextStyle(color: Color(0xFF6B6158), fontSize: 14),
                  ),
                )
              else
                ...groups.entries.map((entry) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.key,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      const SizedBox(height: 12),
                      ...entry.value.map((notif) {
                        final isUnread = !notif.isRead;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12.0),
                          child: InkWell(
                            onTap: () => _markOneAsRead(notif),
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: isUnread ? const Color(0xFFE8F5F1) : Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: isUnread
                                    ? null
                                    : Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
                                    ),
                                    child: Icon(
                                      _getIconData(notif.iconType),
                                      color: const Color(0xFF168477),
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          notif.title,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w500,
                                            color: Color(0xFF1E293B),
                                            height: 1.4,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          notif.timestamp,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w400,
                                            color: Color(0xFF1E293B),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 16),
                    ],
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }
}
