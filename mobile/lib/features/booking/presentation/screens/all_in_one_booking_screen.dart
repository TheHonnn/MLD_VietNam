import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/branch_repository.dart';
import '../../../home/data/repositories/service_repository.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../data/models/booking_models.dart';
import '../../data/repositories/booking_repository.dart';
import 'c09_my_appointments_screen.dart';

/// Màn hình đặt lịch trị liệu All-in-One tinh giản theo chuẩn Design System (#2860EB)
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

  // 2. Chi nhánh từ repository
  List<BranchModel> _branches = [];
  BranchModel? _selectedBranch;

  // 3. Số người & Ngày giờ
  final int _guestCount = 1; // 1 - 5 người
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

  void _showBranchSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Chọn chi nhánh',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ..._branches.map((b) {
                  final isSelected = _selectedBranch?.id == b.id;
                  return InkWell(
                    onTap: () {
                      setState(() => _selectedBranch = b);
                      Navigator.pop(ctx);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFEFF4FE) : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF2860EB) : AppColors.border,
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                            color: isSelected ? const Color(0xFF2860EB) : AppColors.textSecondary,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  b.name,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                    color: isSelected ? const Color(0xFF2860EB) : AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  b.address,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
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
      branchPhone: _selectedBranch!.phone.isNotEmpty ? _selectedBranch!.phone : '096.7786.399',
      specialistName: 'Kỹ thuật viên hệ thống MLD',
      specialistTitle: 'Chuyên viên Vodder tự động phân bổ',
      specialistAvatar: 'assets/images/logo.webp',
      appointmentDate: _selectedDate,
      timeSlot: '$_selectedTimeSlot - ${_selectedTimeSlot.split(':')[0]}:45',
      customerName: _nameController.text.trim().isNotEmpty ? _nameController.text.trim() : 'Khách hàng MLD',
      customerPhone: _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : '0900000000',
      customerEmail: '',
      specialNotes: _noteController.text.trim(),
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

    await Future.delayed(const Duration(milliseconds: 500));

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
              width: 56,
              height: 56,
              decoration: const BoxDecoration(
                color: Color(0xFFEFF4FE),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 36),
            ),
            const SizedBox(height: 16),
            const Text(
              'Đặt lịch thành công!',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Lịch hẹn ($code) tại ${_selectedBranch?.name} vào lúc $_selectedTimeSlot ngày $dateString đã được ghi nhận.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.4,
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
                  elevation: 0,
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()),
                  );
                },
                child: const Text('Xem lịch hẹn của tôi', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
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
        'Thứ ${_selectedDate.weekday + 1 == 8 ? "Chủ Nhật" : "${_selectedDate.weekday + 1}"}, ${_selectedDate.day.toString().padLeft(2, "0")}/${_selectedDate.month.toString().padLeft(2, "0")}/${_selectedDate.year}';

    return Scaffold(
      backgroundColor: Colors.white,
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
              // 1. CHỌN CHI NHÁNH (Chuẩn 4.1: Bấm để chọn, không hộp to, không km)
              // ==========================================
              InkWell(
                onTap: _showBranchSelector,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.storefront_outlined, size: 20, color: AppColors.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Chi nhánh thực hiện',
                              style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _selectedBranch?.name ?? 'Chọn chi nhánh',
                              style: const TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textSecondary),
                    ],
                  ),
                ),
              ),

              if (_selectedBranch != null) ...[
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          _selectedBranch!.address,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 16),

              // ==========================================
              // 2. CHỌN NGÀY & KHUNG GIỜ (Chuẩn 4.2: Gọn gàng)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Thời gian hẹn',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 12),

                    // Ngày hẹn (Bấm chọn ngày)
                    InkWell(
                      onTap: _pickDate,
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.primary),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                dateDisplay,
                                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                              ),
                            ),
                            const Text(
                              'Đổi ngày',
                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Giờ hẹn
                    const Text(
                      'Giờ hẹn (60 phút/ca):',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: AppColors.textSecondary),
                    ),
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
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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

              const SizedBox(height: 16),

              // ==========================================
              // 3. THÔNG TIN KHÁCH HÀNG & GHI CHÚ (Chuẩn 4.3: Đổi nhãn Ghi chú)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Khách hàng',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 10),

                    // Radio chọn Bản thân vs Đặt hộ
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => _onToggleBookingMode(true),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: _isBookingForSelf ? const Color(0xFFEFF4FE) : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: _isBookingForSelf ? AppColors.primary : AppColors.border,
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
                                  Text(
                                    'Bản thân',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: _isBookingForSelf ? FontWeight.w700 : FontWeight.w500,
                                      color: _isBookingForSelf ? AppColors.primary : AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            onTap: () => _onToggleBookingMode(false),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: !_isBookingForSelf ? const Color(0xFFEFF4FE) : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: !_isBookingForSelf ? AppColors.primary : AppColors.border,
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
                                  Text(
                                    'Đặt hộ',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: !_isBookingForSelf ? FontWeight.w700 : FontWeight.w500,
                                      color: !_isBookingForSelf ? AppColors.primary : AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        labelText: 'Họ và tên',
                        prefixIcon: Icon(Icons.person_outline, size: 20),
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      validator: (val) => (val == null || val.trim().isEmpty) ? 'Vui lòng nhập họ tên' : null,
                    ),

                    const SizedBox(height: 10),

                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Số điện thoại',
                        prefixIcon: Icon(Icons.phone_outlined, size: 20),
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Vui lòng nhập số điện thoại';
                        if (val.trim().length < 9) return 'Số điện thoại không hợp lệ';
                        return null;
                      },
                    ),

                    const SizedBox(height: 10),

                    // Nhãn Ghi chú đơn giản theo mục 4.3
                    TextFormField(
                      controller: _noteController,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Ghi chú',
                        hintText: 'Nhập ghi chú cho chuyên viên nếu cần (không bắt buộc)',
                        prefixIcon: Icon(Icons.note_alt_outlined, size: 20),
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // ==========================================
              // 4. THÔNG TIN ĐẶT LỊCH (Chuẩn 4.4: Đổi tên Bảng tóm tắt thành Thông tin đặt lịch)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Thông tin đặt lịch',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildInfoRow('Dịch vụ:', _serviceTitle),
                    _buildInfoRow('Chi nhánh:', _selectedBranch?.name ?? '---'),
                    _buildInfoRow('Ngày & Giờ:', '$dateDisplay lúc $_selectedTimeSlot'),
                    _buildInfoRow('Khách hàng:', '${_nameController.text} (${_phoneController.text})'),
                    if (_noteController.text.trim().isNotEmpty)
                      _buildInfoRow('Ghi chú:', _noteController.text.trim()),
                    const Divider(color: AppColors.border, height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Text(
                            'Chi phí dự kiến:',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                          ),
                        ),
                        Text(
                          '${_formatCurrency(_totalPrice)}đ',
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF00693F),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Đã bao gồm 8% thuế VAT theo quy định',
                      style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // ==========================================
              // 5. NÚT XÁC NHẬN (Chuẩn 4.5: "Xác nhận đặt lịch", 48-52px)
              // ==========================================
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  onPressed: _isSubmitting ? null : _handleSubmitBooking,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text(
                          'Xác nhận đặt lịch',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(label, style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
