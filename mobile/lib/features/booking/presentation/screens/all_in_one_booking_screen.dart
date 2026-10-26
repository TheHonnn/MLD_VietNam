import '../../../home/data/repositories/service_repository.dart';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/branch_repository.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../data/models/booking_models.dart';
import '../../data/repositories/booking_repository.dart';
import 'c09_my_appointments_screen.dart';

/// Màn hình đặt lịch trị liệu All-in-One tích hợp trọn vẹn trên 1 trang duy nhất
/// Chuẩn đặc tả: Giao diện trang chủ.docx & Website Trang chủ, dịch vụ, đặt lịch.txt
class AllInOneBookingScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const AllInOneBookingScreen({super.key, this.onBack});

  @override
  State<AllInOneBookingScreen> createState() => _AllInOneBookingScreenState();
}

class _AllInOneBookingScreenState extends State<AllInOneBookingScreen> {
  // 1. Dịch vụ duy nhất & Thuế giá lấy động từ Admin backend
  String _serviceTitle = 'Điều trị dẫn lưu phù bạch huyết chuyên sâu (Vodder MLD)';
  int _serviceDuration = 60;
  double _pricePerPerson = 650000;
  double _vatRate = 0.08;

  // 2. Chi nhánh
  List<BranchModel> _branches = [];
  BranchModel? _selectedBranch;

  // 3. Số người & Ngày giờ
  int _guestCount = 1; // 1 - 5 người
  late DateTime _selectedDate;
  String _selectedTimeSlot = '09:45';

  final List<String> _timeSlots = [
    '08:30',
    '09:45',
    '11:00',
    '14:00',
    '15:30',
    '17:00',
    '18:30',
    '20:00',
  ];

  // 4. Thông tin người đặt: Bản thân vs Đặt hộ
  bool _isBookingForSelf = true;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now().add(const Duration(days: 1));
    _loadBranchesAndUser();
  }

  Future<void> _loadBranchesAndUser() async {
    final coreService = await ServiceRepository.instance.getCoreVodderService();
    final branches = await BranchRepository.instance.getBranches();
    final profile = await MembershipRepository.instance.fetchProfile();
    final userPhone = AuthService.instance.lastLoginPhone ?? profile.phone;
    final userName = profile.fullName.isNotEmpty ? profile.fullName : 'Khách hàng MLD';

    if (mounted) {
      setState(() {
        _serviceTitle = coreService.name;
        _serviceDuration = coreService.durationMinutes;
        _pricePerPerson = coreService.displayPrice;
        _vatRate = coreService.vatRate;
        _branches = branches;
        _selectedBranch = BranchRepository.instance.activeBranch ?? (branches.isNotEmpty ? branches.first : null);
        if (_isBookingForSelf) {
          _nameController.text = userName;
          _phoneController.text = userPhone;
        }
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _onToggleBookingMode(bool forSelf) {
    setState(() {
      _isBookingForSelf = forSelf;
      if (forSelf) {
        final profile = MembershipRepository.instance.profile;
        _nameController.text = profile.fullName.isNotEmpty ? profile.fullName : 'Khách hàng MLD';
        _phoneController.text = AuthService.instance.lastLoginPhone ?? profile.phone;
      } else {
        _nameController.clear();
        _phoneController.clear();
      }
    });
  }

  Future<void> _pickDate() async {
    final currentYear = DateTime.now().year;
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime(currentYear, 12, 31),
      locale: const Locale('vi'),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  double get _subtotal => _pricePerPerson * _guestCount;
  double get _vatAmount => _subtotal * _vatRate;
  double get _totalPrice => _subtotal + _vatAmount;

  String _formatCurrency(double amount) {
    return amount.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]}.',
        );
  }

  void _handleSubmitBooking() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedBranch == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng chọn cơ sở/chi nhánh trị liệu'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final appointmentCode = 'MLD-DL-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
    final dateString =
        '${_selectedDate.day.toString().padLeft(2, '0')}/${_selectedDate.month.toString().padLeft(2, '0')}/${_selectedDate.year}';

    final appointment = AppointmentItemModel(
      id: appointmentCode,
      bookingCode: appointmentCode,
      serviceName: _serviceTitle,
      serviceImage: 'assets/images/logo.webp',
      durationMinutes: _serviceDuration,
      branchName: _selectedBranch!.name,
      branchAddress: _selectedBranch!.address,
      branchPhone: _selectedBranch!.phone.isNotEmpty ? _selectedBranch!.phone : '1900 6868',
      specialistName: 'Kỹ thuật viên hệ thống MLD',
      specialistTitle: 'Chuyên viên Vodder tự động phân bổ',
      specialistAvatar: 'assets/images/logo.webp',
      appointmentDate: _selectedDate,
      timeSlot: '$_selectedTimeSlot - ${_selectedTimeSlot.split(':')[0]}:45',
      customerName: _nameController.text.trim().isNotEmpty ? _nameController.text.trim() : 'Khách hàng MLD',
      customerPhone: _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : '0900000000',
      customerEmail: '',
      specialNotes: _noteController.text.trim().isNotEmpty
          ? '${_isBookingForSelf ? "[Đặt cho bản thân]" : "[Đặt hộ cho: ${_nameController.text}]"} ${_noteController.text.trim()}'
          : (_isBookingForSelf ? 'Đặt cho bản thân' : 'Đặt hộ cho: ${_nameController.text}'),
      totalAmount: _totalPrice,
      depositAmount: 0,
      remainingAmount: _totalPrice,
      paymentMethod: 'Thanh toán tại cơ sở / QR',
      status: AppointmentStatus.pending, // Chờ duyệt
      createdAt: DateTime.now(),
      timeline: [
        BookingTimelineEvent(
          title: 'Đăng ký đặt lịch thành công',
          description: 'Hệ thống đã tiếp nhận yêu cầu đặt lịch ($_guestCount người). Chờ chuyên viên phòng khám xác nhận.',
          timestamp: DateTime.now(),
          isCompleted: true,
          isCurrent: true,
        ),
      ],
    );

    // Lưu vào Repository
    BookingRepository.instance.createAppointment(appointment);

    await Future.delayed(const Duration(milliseconds: 600));

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    _showBookingPendingModal(appointmentCode, dateString);
  }

  void _showBookingPendingModal(String code, String dateString) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        contentPadding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: AppColors.mintBackground,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.schedule_send_rounded, color: AppColors.primary, size: 36),
            ),
            const SizedBox(height: 16),
            const Text(
              'Đặt lịch giữ chỗ thành công!',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.mintBackground,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'TRẠNG THÁI: CHỜ DUYỆT',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Lịch hẹn của bạn ($code) tại ${_selectedBranch?.name} vào lúc $_selectedTimeSlot ngày $dateString đã được ghi nhận và đang chờ chuyên viên xác nhận.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()),
                  );
                },
                child: const Text('Xem lịch hẹn của tôi', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateDisplay =
        'Thứ ${_selectedDate.weekday + 1 == 8 ? "Chủ Nhật" : "${_selectedDate.weekday + 1}"}, ngày ${_selectedDate.day.toString().padLeft(2, "0")}/${_selectedDate.month.toString().padLeft(2, "0")}/${_selectedDate.year}';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.textPrimary),
          onPressed: () {
            if (widget.onBack != null) {
              widget.onBack!();
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: const Text(
          'Đặt lịch trị liệu',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ==========================================
              // CARD 1: DỊCH VỤ DUY NHẤT (Điều trị phù bạch huyết)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: AppColors.mintBackground,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.medical_services_rounded, color: AppColors.primary, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'DỊCH VỤ TRỊ LIỆU CỐT LÕI',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _serviceTitle,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.timer_outlined, size: 14, color: AppColors.textSecondary),
                              const SizedBox(width: 4),
                              Text('$_serviceDuration phút/ca', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              const SizedBox(width: 12),
                              Text(
                                '${_formatCurrency(_pricePerPerson)}đ',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primaryDark,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // ==========================================
              // CARD 2: CHỌN CHI NHÁNH & Ô VỊ TRÍ
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.store_mall_directory_rounded, size: 18, color: AppColors.primary),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Chọn chi nhánh thực hiện',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Thanh công cụ tích chọn chi nhánh
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _branches.map((b) {
                        final isSel = _selectedBranch?.id == b.id;
                        return ChoiceChip(
                          label: Text(b.name),
                          selected: isSel,
                          onSelected: (val) {
                            if (val) setState(() => _selectedBranch = b);
                          },
                          selectedColor: AppColors.mintBackground,
                          backgroundColor: AppColors.background,
                          labelStyle: TextStyle(
                            fontSize: 13,
                            fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                            color: isSel ? AppColors.primary : AppColors.textSecondary,
                          ),
                          side: BorderSide(
                            color: isSel ? AppColors.primary : AppColors.border,
                            width: isSel ? 1.5 : 1.0,
                          ),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        );
                      }).toList(),
                    ),

                    if (_selectedBranch != null) ...[
                      const SizedBox(height: 14),
                      // Tên & địa chỉ
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.location_on, size: 16, color: AppColors.primary),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    _selectedBranch!.name,
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Padding(
                              padding: const EdgeInsets.only(left: 22),
                              child: Text(
                                _selectedBranch!.address,
                                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ),
                            const SizedBox(height: 8),
                            // Ô VỊ TRÍ (Map location / distance)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.near_me_rounded, size: 14, color: AppColors.primary),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Vị trí: ${_selectedBranch!.district}, ${_selectedBranch!.city} · Cách ${_selectedBranch!.distanceKm.toStringAsFixed(1)} km',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // ==========================================
              // CARD 3: CHỌN SỐ NGƯỜI & NGÀY THÁNG, KHUNG GIỜ
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.calendar_month_rounded, size: 18, color: AppColors.primary),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Thời gian & Số lượng khách',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Chọn số người (1 - 5 người)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Số lượng người trị liệu:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                              Text('Tự động phân bổ 1 giường + 1 KTV/khách', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: AppColors.mintBackground,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove, size: 18, color: AppColors.primary),
                                onPressed: _guestCount > 1 ? () => setState(() => _guestCount--) : null,
                                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                                padding: EdgeInsets.zero,
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                child: Text(
                                  '$_guestCount khách',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primaryDark),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.add, size: 18, color: AppColors.primary),
                                onPressed: _guestCount < 5 ? () => setState(() => _guestCount++) : null,
                                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                                padding: EdgeInsets.zero,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const Divider(height: 24, color: AppColors.border),

                    // Ô Chọn ngày tháng (Bấm mở Lịch năm hiện tại)
                    InkWell(
                      onTap: _pickDate,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  const Icon(Icons.edit_calendar_rounded, size: 20, color: AppColors.primary),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      dateDisplay,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Đổi ngày',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Chọn khung giờ
                    const Text('Khung giờ trị liệu (60 phút/ca):', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _timeSlots.map((slot) {
                        final isSel = _selectedTimeSlot == slot;
                        return InkWell(
                          onTap: () => setState(() => _selectedTimeSlot = slot),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSel ? AppColors.primary : Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSel ? AppColors.primary : AppColors.border,
                              ),
                            ),
                            child: Text(
                              slot,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                                color: isSel ? Colors.white : AppColors.textPrimary,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // ==========================================
              // CARD 4: NHẬP THÔNG TIN CÁ NHÂN (Bản thân vs Đặt hộ)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.person_pin_rounded, size: 18, color: AppColors.primary),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Thông tin khách hàng',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // 2 Ô tích chọn: Đặt cho bản thân vs Đặt hộ
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => _onToggleBookingMode(true),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _isBookingForSelf ? AppColors.mintBackground : AppColors.background,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: _isBookingForSelf ? AppColors.primary : AppColors.border,
                                  width: _isBookingForSelf ? 1.5 : 1.0,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    _isBookingForSelf ? Icons.radio_button_checked : Icons.radio_button_off,
                                    size: 16,
                                    color: _isBookingForSelf ? AppColors.primary : AppColors.textSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Flexible(
                                    child: Text(
                                      'Đặt cho bản thân',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: _isBookingForSelf ? FontWeight.w700 : FontWeight.w500,
                                        color: _isBookingForSelf ? AppColors.primaryDark : AppColors.textSecondary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: InkWell(
                            onTap: () => _onToggleBookingMode(false),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: !_isBookingForSelf ? AppColors.mintBackground : AppColors.background,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: !_isBookingForSelf ? AppColors.primary : AppColors.border,
                                  width: !_isBookingForSelf ? 1.5 : 1.0,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    !_isBookingForSelf ? Icons.radio_button_checked : Icons.radio_button_off,
                                    size: 16,
                                    color: !_isBookingForSelf ? AppColors.primary : AppColors.textSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Flexible(
                                    child: Text(
                                      'Đặt hộ người khác',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: !_isBookingForSelf ? FontWeight.w700 : FontWeight.w500,
                                        color: !_isBookingForSelf ? AppColors.primaryDark : AppColors.textSecondary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // Họ và tên
                    TextFormField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: _isBookingForSelf ? 'Họ và tên của bạn' : 'Họ và tên người được đặt hộ',
                        prefixIcon: const Icon(Icons.person_outline, size: 20, color: AppColors.primary),
                        filled: true,
                        fillColor: AppColors.background,
                      ),
                      validator: (val) => (val == null || val.trim().isEmpty) ? 'Vui lòng nhập họ tên' : null,
                    ),

                    const SizedBox(height: 12),

                    // Số điện thoại
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: _isBookingForSelf ? 'Số điện thoại liên hệ' : 'Số điện thoại người được đặt hộ',
                        prefixIcon: const Icon(Icons.phone_outlined, size: 20, color: AppColors.primary),
                        filled: true,
                        fillColor: AppColors.background,
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Vui lòng nhập số điện thoại';
                        if (val.trim().length < 9) return 'Số điện thoại không hợp lệ';
                        return null;
                      },
                    ),

                    const SizedBox(height: 12),

                    // Ghi chú
                    TextFormField(
                      controller: _noteController,
                      decoration: const InputDecoration(
                        labelText: 'Ghi chú tình trạng phù nề (nếu có)',
                        prefixIcon: Icon(Icons.note_alt_outlined, size: 20, color: AppColors.primary),
                        filled: true,
                        fillColor: AppColors.background,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // ==========================================
              // CARD 5: BẢNG THÔNG TIN ĐẶT LỊCH (Summary Card)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.mintBackground,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.assignment_outlined, size: 18, color: AppColors.primaryDark),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Bảng tóm tắt đặt lịch',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primaryDark),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildSummaryRow('Dịch vụ:', _serviceTitle),
                    _buildSummaryRow('Cơ sở:', _selectedBranch?.name ?? 'Chưa chọn'),
                    _buildSummaryRow('Địa chỉ:', _selectedBranch?.address ?? '---'),
                    _buildSummaryRow('Ngày & Giờ:', '$dateDisplay | Lúc $_selectedTimeSlot'),
                    _buildSummaryRow('Số lượng khách:', '$_guestCount người (Tự động cấp $_guestCount giường + $_guestCount KTV)'),
                    _buildSummaryRow(
                      'Người đặt:',
                      _isBookingForSelf
                          ? '${_nameController.text.isNotEmpty ? _nameController.text : "Khách"} (Đặt cho bản thân)'
                          : '${_nameController.text.isNotEmpty ? _nameController.text : "Khách"} (Đặt hộ)',
                    ),
                    _buildSummaryRow('SĐT liên hệ:', _phoneController.text.isNotEmpty ? _phoneController.text : '---'),
                    const Divider(color: AppColors.border, height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(child: Text('Giá trước thuế:', style: TextStyle(fontSize: 13, color: AppColors.textSecondary))),
                        Text('${_formatCurrency(_subtotal)}đ', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(child: Text('Thuế VAT (${(_vatRate * 100).toInt()}%):', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary))),
                        Text('${_formatCurrency(_vatAmount)}đ', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(child: Text('Tổng thanh toán:', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primaryDark))),
                        Text(
                          '${_formatCurrency(_totalPrice)}đ',
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.primaryDark),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // ==========================================
              // NÚT XÁC NHẬN ĐẶT LỊCH GIỮ CHỖ
              // ==========================================
              SizedBox(
                height: 54,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  onPressed: _isSubmitting ? null : _handleSubmitBooking,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Text(
                          'Xác nhận đặt lịch giữ chỗ',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                ),
              ),
              const SizedBox(height: 12),
              const Center(
                child: Text(
                  'Hệ thống sẽ giữ chỗ và gửi thông báo xác nhận trong ít phút',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
