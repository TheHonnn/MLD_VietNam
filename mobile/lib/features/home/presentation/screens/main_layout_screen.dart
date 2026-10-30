import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/services/auth_service.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../services/presentation/screens/b02_service_listing_screen.dart';
import '../../../academy/presentation/screens/e01_academy_home_screen.dart';
import '../../../membership/presentation/screens/f01_profile_dashboard_screen.dart';
import '../../../treatment/presentation/screens/d09_documents_screen.dart';
import '../../../directory/presentation/screens/b05_branch_listing_screen.dart';
import 'b01_home_screen.dart';

class MainLayoutScreen extends StatefulWidget {
  final int initialIndex;

  const MainLayoutScreen({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<MainLayoutScreen> createState() => _MainLayoutScreenState();
}

class _MainLayoutScreenState extends State<MainLayoutScreen> {
  late int _currentIndex;
  final GlobalKey<E01AcademyHomeScreenState> _academyKey = GlobalKey<E01AcademyHomeScreenState>();

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    AuthService.instance.isLoggedInNotifier.addListener(_onAuthChanged);
  }

  void _onAuthChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    AuthService.instance.isLoggedInNotifier.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  Future<void> _makeDirectPhoneCall() async {
    final uri = Uri.parse('tel:0987186399');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    } catch (_) {}
  }

  void _openConsultationModal() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (bottomSheetContext, setModalState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(bottomSheetContext).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE6F4F1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF0F766E), size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ĐĂNG KÝ TRONG 30 GIÂY',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0D9488), letterSpacing: 0.5),
                        ),
                        Text(
                          'Bác sĩ gọi lại tư vấn miễn phí',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: nameCtrl,
                decoration: InputDecoration(
                  hintText: 'Họ và tên của bạn',
                  hintStyle: const TextStyle(fontSize: 13.5, color: Color(0xFF94A3B8)),
                  prefixIcon: const Icon(Icons.person_outline_rounded, color: Color(0xFF94A3B8), size: 20),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0F766E), width: 1.5)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  hintText: 'Số điện thoại',
                  hintStyle: const TextStyle(fontSize: 13.5, color: Color(0xFF94A3B8)),
                  prefixIcon: const Icon(Icons.phone_outlined, color: Color(0xFF94A3B8), size: 20),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0F766E), width: 1.5)),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F766E),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    elevation: 0,
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final phone = phoneCtrl.text.trim();
                          if (phone.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Vui lòng nhập số điện thoại để Bác sĩ gọi lại tư vấn!'),
                                backgroundColor: Color(0xFFE5533D),
                              ),
                            );
                            return;
                          }
                          setModalState(() => isSubmitting = true);
                          await Future.delayed(const Duration(milliseconds: 600));
                          if (mounted) {
                            Navigator.pop(ctx);
                            showDialog(
                              context: context,
                              builder: (dCtx) => AlertDialog(
                                backgroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                title: const Row(
                                  children: [
                                    Icon(Icons.check_circle_rounded, color: Color(0xFF0D766E), size: 28),
                                    SizedBox(width: 10),
                                    Text('Đăng ký thành công', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                                  ],
                                ),
                                content: const Text(
                                  'Nhân viên sẽ liên hệ đến bạn trong thời gian sớm nhất.',
                                  style: TextStyle(fontSize: 14, color: Color(0xFF334155), height: 1.45),
                                ),
                                actions: [
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF0D766E),
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    onPressed: () => Navigator.pop(dCtx),
                                    child: const Text('Đóng'),
                                  ),
                                ],
                              ),
                            );
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('Nhận tư vấn từ chuyên gia', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                            SizedBox(width: 6),
                            Icon(Icons.arrow_forward_rounded, size: 18),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 12),
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shield_outlined, size: 14, color: Color(0xFF94A3B8)),
                  SizedBox(width: 6),
                  Text(
                    'Thông tin của bạn được bảo mật tuyệt đối',
                    style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      // Tab 0: Trang chủ (B01_Home)
      B01HomeScreen(
        onNavigateToServices: () => _onTabTapped(1),
        onNavigateToBooking: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => AllInOneBookingScreen(
                onBack: () => Navigator.pop(context),
              ),
            ),
          );
        },
        onNavigateToAcademy: () => _onTabTapped(2),
        onNavigateToProfile: () => _onTabTapped(4),
      ),
      // Tab 1: Dịch vụ (B02 Service Listing)
      B02ServiceListingScreen(
        onBack: () => _onTabTapped(0),
      ),
      // Tab 2: Đào tạo (Group E)
      E01AcademyHomeScreen(
        key: _academyKey,
        onBackToHome: () => _onTabTapped(0),
      ),
      // Tab 3: Tài liệu & Y khoa (D09 Documents Screen)
      D09DocumentsScreen(
        onBackToHome: () => _onTabTapped(0),
      ),
      // Tab 4: Cá nhân (Group F — Membership & Profile chuẩn 100% Figma)
      F01ProfileDashboardScreen(
        onBackToHome: () => _onTabTapped(0),
      ),
      // Tab 5: Cơ sở (B05 Branch Listing)
      B05BranchListingScreen(
        onBack: () => _onTabTapped(0),
      ),
    ];

    final int safeIndex = (_currentIndex >= 0 && _currentIndex < screens.length) ? _currentIndex : 0;

    return Scaffold(
      body: screens[safeIndex],
      // Bottom Navigation Bar chuẩn Thiết kế (Trang chủ | [ Gọi ngay ] | [ Tư vấn ] | Cơ sở)
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(
            top: BorderSide(
              color: Color(0xFFE2E8F0),
              width: 1.0,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Row(
              children: [
                // 1. Nút Trang chủ
                InkWell(
                  onTap: () => _onTabTapped(0),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          safeIndex == 0 ? Icons.home_rounded : Icons.home_outlined,
                          size: 22,
                          color: safeIndex == 0 ? const Color(0xFF0F766E) : const Color(0xFF64748B),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Trang chủ',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: safeIndex == 0 ? FontWeight.w700 : FontWeight.w500,
                            color: safeIndex == 0 ? const Color(0xFF0F766E) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(width: 6),

                // 2. Nút Gọi ngay (Red-orange capsule pill)
                Expanded(
                  child: Material(
                    color: const Color(0xFFEA5434),
                    borderRadius: BorderRadius.circular(24),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(24),
                      onTap: _makeDirectPhoneCall,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 4),
                        alignment: Alignment.center,
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.phone_outlined, color: Colors.white, size: 16),
                            SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                'Gọi ngay',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 6),

                // 3. Nút Tư vấn (Dark teal capsule pill)
                Expanded(
                  child: Material(
                    color: const Color(0xFF0F766E),
                    borderRadius: BorderRadius.circular(24),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(24),
                      onTap: _openConsultationModal,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 4),
                        alignment: Alignment.center,
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.chat_bubble_outline_rounded, color: Colors.white, size: 16),
                            SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                'Tư vấn',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 6),

                // 4. Nút Cơ sở
                InkWell(
                  onTap: () => _onTabTapped(5),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          safeIndex == 5 ? Icons.location_on : Icons.location_on_outlined,
                          size: 22,
                          color: safeIndex == 5 ? const Color(0xFF0F766E) : const Color(0xFF64748B),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Cơ sở',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: safeIndex == 5 ? FontWeight.w700 : FontWeight.w500,
                            color: safeIndex == 5 ? const Color(0xFF0F766E) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
