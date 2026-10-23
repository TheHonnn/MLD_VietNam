import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/launcher_helper.dart';
import '../../../booking/data/models/booking_models.dart';
import '../../../booking/presentation/screens/c01_service_selection_screen.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/branch_repository.dart';
import '../../../services/presentation/screens/b03_service_detail_screen.dart';
import 'b08_specialist_profile_screen.dart';

class B06BranchDetailScreen extends StatefulWidget {
  final String branchName;
  final String branchAddress;
  final String branchImage;
  final BranchModel? branch;

  const B06BranchDetailScreen({
    super.key,
    this.branchName = 'Chi nhánh Quận 3',
    this.branchAddress = '123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
    this.branchImage = 'assets/images/branch_hero_1.png',
    this.branch,
  });

  @override
  State<B06BranchDetailScreen> createState() => _B06BranchDetailScreenState();
}

class _B06BranchDetailScreenState extends State<B06BranchDetailScreen> {
  bool _isFavorite = true;

  BranchModel _resolveBranch() {
    if (widget.branch != null) return widget.branch!;
    final cached = BranchRepository.instance.cachedBranches;
    try {
      return cached.firstWhere((b) => b.name == widget.branchName || b.address == widget.branchAddress);
    } catch (_) {}
    return BranchRepository.instance.activeBranch ??
        BranchModel(
          id: 'aaaaaaaa-0001-0001-0001-000000000001',
          name: widget.branchName,
          phone: '02839301234',
          address: widget.branchAddress,
          city: 'TP. Hồ Chí Minh',
          distanceKm: 1.2,
          openingHours: '08:30 - 20:30 (Cả tuần)',
          rating: 4.9,
          imageUrl: widget.branchImage,
          services: const ['Massage Thư Giãn', 'Chăm Sóc Da', 'Gội Đầu Dưỡng Sinh', 'Đào Tạo'],
        );
  }

  final List<Map<String, String>> _weeklyHours = [
    {'day': 'Thứ hai', 'hours': '09:00–20:00'},
    {'day': 'Thứ ba', 'hours': '09:00–20:00'},
    {'day': 'Thứ tư', 'hours': '09:00–20:00'},
    {'day': 'Thứ năm', 'hours': '09:00–20:00'},
    {'day': 'Thứ sáu', 'hours': '09:00–20:00'},
    {'day': 'Thứ bảy', 'hours': '09:00–20:00'},
    {'day': 'Chủ nhật', 'hours': '09:00–20:00'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: Column(
          children: [
            // SCROLLABLE AREA
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- 1. TOP BAR ---
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        InkWell(
                          onTap: () => Navigator.pop(context),
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.border),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(
                              Icons.arrow_back,
                              color: AppColors.textPrimary,
                              size: 22,
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: () => setState(() => _isFavorite = !_isFavorite),
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.border),
                            ),
                            alignment: Alignment.center,
                            child: Icon(
                              _isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                              color: _isFavorite ? AppColors.primary : AppColors.textSecondary,
                              size: 22,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // --- 2. BRANCH NAME ---
                    Text(
                      widget.branchName,
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w600,
                        height: 34 / 26,
                        color: AppColors.textHeading, // #693B20
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Notice box
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSecondary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'Không gian thư giãn đạt chuẩn quốc tế',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // --- 3. PHOTO GALLERY ---
                    // Main Photo
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: SizedBox(
                        width: double.infinity,
                        height: 200,
                        child: Image.asset(
                          widget.branchImage,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppColors.surfaceSecondary,
                            child: const Center(
                              child: Icon(Icons.store, size: 56, color: AppColors.primary),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // 2 Sub Photos
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(14),
                                child: SizedBox(
                                  height: 110,
                                  width: double.infinity,
                                  child: Image.asset(
                                    'assets/images/branch_room_1.png',
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: AppColors.surfaceSecondary,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Phòng chăm sóc',
                                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(14),
                                child: SizedBox(
                                  height: 110,
                                  width: double.infinity,
                                  child: Image.asset(
                                    'assets/images/branch_reception_1.png',
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: AppColors.surfaceSecondary,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Khu vực đón tiếp',
                                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // Address & Short Hours
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.location_on_outlined, size: 20, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            widget.branchAddress,
                            style: const TextStyle(
                              fontSize: 14,
                              color: AppColors.textPrimary,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Row(
                      children: [
                        Icon(Icons.access_time_rounded, size: 20, color: AppColors.textSecondary),
                        SizedBox(width: 8),
                        Text(
                          '09:00–20:00 · Cả tuần ',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.phone_in_talk_rounded, size: 20, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            onTap: () => AppLauncherHelper.makePhoneCall(context, '0393856549'),
                            child: const Text(
                              'Đặt lịch MLD: 039.3856.549',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Button Chỉ đường
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _showDirectionsModal,
                        icon: const Icon(Icons.navigation_outlined, color: AppColors.primary, size: 20),
                        label: const Text(
                          'Chỉ đường',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),
                    const Divider(color: AppColors.border, height: 1),
                    const SizedBox(height: 20),

                    // --- 4. GIỚI THIỆU CƠ SỞ ---
                    const Text(
                      'Giới thiệu cơ sở',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Không gian chăm sóc sang trọng với sắc ngà ấm, ánh sáng dịu và khu vực đón tiếp riêng biệt. '
                      'Mẫu cơ sở thể hiện trải nghiệm thư giãn và tư vấn nhu cầu chu đáo.',
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.5,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 20),

                    // --- 5. TIỆN NGHI  ---
                    const Text(
                      'Tiện nghi chi nhánh',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Tiện nghi mẫu: khu vực đón tiếp, phòng chăm sóc, tủ đồ cá nhân. Không xác nhận tiện nghi thực tế hoặc chỗ đỗ xe.',
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.4,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 24),
                    const Divider(color: AppColors.border, height: 1),
                    const SizedBox(height: 20),

                    // --- 6. DỊCH VỤ TẠI CHI NHÁNH ---
                    const Text(
                      'Dịch vụ tại chi nhánh',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildBranchServiceCard(
                      title: 'Massage thư giãn toàn thân',
                      duration: '60 phút',
                      price: '450.000đ',
                      desc: 'Thả lỏng cơ thể trong không gian yên tĩnh.',
                      isFavorite: true,
                    ),
                    const SizedBox(height: 12),
                    _buildBranchServiceCard(
                      title: 'Chăm sóc da chuyên sâu',
                      duration: '90 phút',
                      price: '650.000đ',
                      desc: 'Chăm sóc làn da với quy trình nhẹ nhàng, chu đáo.',
                      isFavorite: false,
                    ),

                    const SizedBox(height: 24),
                    const Divider(color: AppColors.border, height: 1),
                    const SizedBox(height: 20),

                    // --- 7. ĐỘI NGŨ CHUYÊN VIÊN ---
                    const Text(
                      'Đội ngũ chuyên viên',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildSpecialistTile(
                      name: 'Trần Minh Phương',
                      role: 'Kỹ thuật viên massage',
                      desc: 'Massage thư giãn · Chăm sóc tận tâm',
                      avatar: 'assets/images/specialist_avatar_2.png',
                    ),
                    const SizedBox(height: 12),
                    _buildSpecialistTile(
                      name: 'Nguyễn Thu Hà',
                      role: 'Chuyên viên chăm sóc da',
                      desc: 'Chăm sóc da · Quy trình làm sạch dịu nhẹ',
                      avatar: 'assets/images/specialist_avatar_1.png',
                    ),

                    const SizedBox(height: 24),
                    const Divider(color: AppColors.border, height: 1),
                    const SizedBox(height: 20),

                    // --- 8. GIỜ HOẠT ĐỘNG ---
                    const Text(
                      'Giờ hoạt động',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Lịch hoạt động',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: _weeklyHours.map((wh) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  wh['day']!,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                Text(
                                  wh['hours']!,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                    const SizedBox(height: 24),
                    const Divider(color: AppColors.border, height: 1),
                    const SizedBox(height: 20),

                    // --- 9. HÌNH ẢNH KHÔNG GIAN ---
                    const Text(
                      'Hình ảnh không gian',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(14),
                                child: SizedBox(
                                  height: 120,
                                  width: double.infinity,
                                  child: Image.asset(
                                    'assets/images/branch_room_1.png',
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: AppColors.surfaceSecondary,
                                      child: const Icon(Icons.image, color: AppColors.primary),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Phòng chăm sóc',
                                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(14),
                                child: SizedBox(
                                  height: 120,
                                  width: double.infinity,
                                  child: Image.asset(
                                    'assets/images/branch_reception_1.png',
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: AppColors.surfaceSecondary,
                                      child: const Icon(Icons.image, color: AppColors.primary),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Khu vực đón tiếp',
                                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // --- 10. BOTTOM CTA BUTTON ---
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(
                  top: BorderSide(color: AppColors.border, width: 1.0),
                ),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const C01ServiceSelectionScreen(),
                      ),
                    );
                  },
                  child: const Text(
                    'Đặt lịch tại chi nhánh',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textInverse,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBranchServiceCard({
    required String title,
    required String duration,
    required String price,
    required String desc,
    required bool isFavorite,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                  ),
                ),
              ),
              Icon(
                isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                color: isFavorite ? AppColors.primary : AppColors.textSecondary,
                size: 20,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                duration,
                style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
              const SizedBox(width: 12),
              Text(
                price,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            desc,
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 40,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.primary),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => B03ServiceDetailScreen(
                      title: title,
                      duration: duration,
                      price: price,
                      description: desc,
                    ),
                  ),
                );
              },
              child: const Text(
                'Xem chi tiết',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecialistTile({
    required String name,
    required String role,
    required String desc,
    required String avatar,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.asset(
              avatar,
              width: 56,
              height: 66,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 56,
                height: 66,
                color: AppColors.surfaceSecondary,
                child: const Icon(Icons.person, color: AppColors.primary),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                  ),
                ),
                Text(
                  role,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          InkWell(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => B08SpecialistProfileScreen(
                    name: name,
                    role: role,
                  ),
                ),
              );
            },
            child: const Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                'Xem hồ sơ',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showDirectionsModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
              child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Chỉ đường tới cơ sở',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHeading,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceSecondary,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.branchName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textHeading,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.location_on_outlined, size: 18, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              widget.branchAddress,
                              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Phương tiện di chuyển ước tính',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildTransportChip(
                      icon: Icons.two_wheeler_rounded,
                      label: 'Xe máy',
                      time: '~12 phút',
                      distance: '3.8 km',
                      isSelected: true,
                    ),
                    const SizedBox(width: 12),
                    _buildTransportChip(
                      icon: Icons.directions_car_rounded,
                      label: 'Ô tô',
                      time: '~18 phút',
                      distance: '4.2 km',
                      isSelected: false,
                    ),
                    const SizedBox(width: 12),
                    _buildTransportChip(
                      icon: Icons.directions_walk_rounded,
                      label: 'Đi bộ',
                      time: '~45 phút',
                      distance: '3.4 km',
                      isSelected: false,
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Text(
                  'Lộ trình gợi ý',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 10),
                _buildRouteStep('1', 'Khởi hành từ vị trí của bạn hướng về trung tâm quận'),
                _buildRouteStep('2', 'Di chuyển dọc theo trục đường chính khoảng 2.5 km'),
                _buildRouteStep('3', 'Điểm đến ${widget.branchName} nằm ở bên tay phải'),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: () {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Đã sao chép địa chỉ: ${widget.branchAddress}')),
                          );
                        },
                        icon: const Icon(Icons.copy_rounded, size: 18, color: AppColors.primary),
                        label: const Text(
                          'Sao chép địa chỉ',
                          style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          elevation: 0,
                        ),
                        onPressed: () {
                          Navigator.pop(context);
                          AppLauncherHelper.openMapLocation(
                            context,
                            address: widget.branchAddress,
                            label: widget.branchName,
                          );
                        },
                        icon: const Icon(Icons.navigation_rounded, size: 18, color: AppColors.textInverse),
                        label: const Text(
                          'Bắt đầu đi',
                          style: TextStyle(color: AppColors.textInverse, fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    },
    );
  }

  Widget _buildTransportChip({
    required IconData icon,
    required String label,
    required String time,
    required String distance,
    required bool isSelected,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.surfaceSecondary : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, size: 22, color: isSelected ? AppColors.primary : AppColors.textSecondary),
            const SizedBox(height: 4),
            Text(
              time,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isSelected ? AppColors.primary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              distance,
              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRouteStep(String stepNumber, String instruction) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              color: AppColors.surfaceSecondary,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.border),
            ),
            alignment: Alignment.center,
            child: Text(
              stepNumber,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              instruction,
              style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
