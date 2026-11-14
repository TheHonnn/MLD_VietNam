import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/admin_appointment_card.dart';
import '../widgets/admin_qr_scanner_modal.dart';

class AdminFrontdeskScreen extends StatefulWidget {
  final VoidCallback? onBackToDashboard;
  final String? initialStatus;

  const AdminFrontdeskScreen({
    super.key,
    this.onBackToDashboard,
    this.initialStatus,
  });

  @override
  State<AdminFrontdeskScreen> createState() => _AdminFrontdeskScreenState();
}

class _AdminFrontdeskScreenState extends State<AdminFrontdeskScreen> {
  final AdminRepository _repository = AdminRepository.instance;

  DateTime _selectedDate = DateTime.now();
  bool _isAllDates = false;
  String _selectedStatus = 'ALL';
  String _selectedBranchId = 'ALL';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  List<AdminBookingModel> _bookings = [];
  List<AdminBranchModel> _branches = [];
  String? _processingBookingId;

  // Trạng thái mở rộng các Ca tiếp đón (Mặc định mở ca hiện tại hoặc toàn bộ)
  final Set<String> _expandedShifts = {'morning', 'afternoon', 'evening'};
  bool _isCompactView = true;

  int _parseHour(String timeStr) {
    try {
      final parts = timeStr.trim().split(':');
      if (parts.isNotEmpty) {
        return int.tryParse(parts[0]) ?? 9;
      }
    } catch (_) {}
    return 9;
  }

  void _toggleShift(String shiftKey) {
    setState(() {
      if (_expandedShifts.contains(shiftKey)) {
        _expandedShifts.remove(shiftKey);
      } else {
        _expandedShifts.add(shiftKey);
      }
    });
  }

  void _toggleAllShifts() {
    setState(() {
      if (_expandedShifts.isEmpty) {
        _expandedShifts.addAll(['morning', 'afternoon', 'evening']);
      } else {
        _expandedShifts.clear();
      }
    });
  }

  List<Map<String, dynamic>> get _shiftGroups {
    final list = _filteredBookings;
    final morning = <AdminBookingModel>[];
    final afternoon = <AdminBookingModel>[];
    final evening = <AdminBookingModel>[];

    for (final b in list) {
      final h = _parseHour(b.startTime);
      if (h < 12) {
        morning.add(b);
      } else if (h < 17 || (h == 17 && (int.tryParse(b.startTime.split(':').length > 1 ? b.startTime.split(':')[1] : '0') ?? 0) <= 30)) {
        afternoon.add(b);
      } else {
        evening.add(b);
      }
    }

    return [
      {
        'key': 'morning',
        'title': 'Ca Sáng',
        'timeRange': '08:00 - 12:00',
        'icon': Icons.wb_sunny_rounded,
        'color': const Color(0xFFD97706),
        'bgColor': const Color(0xFFFEF3C7),
        'bookings': morning,
      },
      {
        'key': 'afternoon',
        'title': 'Ca Chiều',
        'timeRange': '12:00 - 17:30',
        'icon': Icons.wb_twilight_rounded,
        'color': AppColors.primary,
        'bgColor': const Color(0xFFEFF6FF),
        'bookings': afternoon,
      },
      {
        'key': 'evening',
        'title': 'Ca Tối',
        'timeRange': '17:30 - 21:00',
        'icon': Icons.nights_stay_rounded,
        'color': const Color(0xFF7C3AED),
        'bgColor': const Color(0xFFEDE9FE),
        'bookings': evening,
      },
    ];
  }

  final List<Map<String, String>> _statusFilters = [
    {'key': 'ALL', 'label': 'Tất cả'},
    {'key': 'PENDING', 'label': 'Chờ duyệt'},
    {'key': 'CONFIRMED', 'label': 'Đã xác nhận'},
    {'key': 'CHECKED_IN', 'label': 'Đã tiếp đón'},
    {'key': 'IN_SERVICE', 'label': 'Đang phục vụ'},
    {'key': 'COMPLETED', 'label': 'Hoàn thành'},
    {'key': 'CANCELLED', 'label': 'Đã hủy'},
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialStatus != null && widget.initialStatus!.isNotEmpty) {
      _selectedStatus = widget.initialStatus!;
      if (_selectedStatus == 'PENDING') {
        _isAllDates = true;
      }
    }
    _loadBranches();
    _fetchBookings();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadBranches() async {
    final branches = await _repository.fetchBranches();
    if (mounted) {
      setState(() => _branches = branches);
    }
  }

  Future<void> _fetchBookings() async {
    setState(() => _isLoading = true);
    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);

    final list = await _repository.fetchBookings(
      bookingDate: dateStr,
      status: _selectedStatus == 'ALL' ? null : _selectedStatus,
      branchId: _selectedBranchId == 'ALL' ? null : _selectedBranchId,
      isAllDates: _isAllDates || _selectedStatus == 'PENDING',
    );

    if (mounted) {
      setState(() {
        _bookings = list;
        _isLoading = false;
      });
    }
  }

  List<AdminBookingModel> get _filteredBookings {
    if (_searchQuery.isEmpty) return _bookings;
    final query = _searchQuery.toLowerCase();
    return _bookings.where((b) {
      return b.customerName.toLowerCase().contains(query) ||
          b.customerPhone.toLowerCase().contains(query) ||
          b.bookingCode.toLowerCase().contains(query) ||
          b.serviceName.toLowerCase().contains(query);
    }).toList();
  }

  // Luồng duyệt lịch
  Future<void> _handleApprove(AdminBookingModel b) async {
    setState(() => _processingBookingId = b.id);
    final success = await _repository.approveBooking(b.id);
    if (mounted) {
      setState(() => _processingBookingId = null);
      if (success) {
        _showToast('Đã duyệt xác nhận lịch hẹn của ${b.customerName}', AppColors.success);
        _fetchBookings();
      } else {
        _showToast('Không thể duyệt lịch. Vui lòng thử lại.', AppColors.error);
      }
    }
  }

  // Luồng Check-in tiếp đón
  Future<void> _handleCheckIn(AdminBookingModel b) async {
    setState(() => _processingBookingId = b.id);
    final success = await _repository.checkInBooking(b.id);
    if (mounted) {
      setState(() => _processingBookingId = null);
      if (success) {
        _showToast('Đã tiếp đón khách hàng ${b.customerName} thành công!', AppColors.success);
        _fetchBookings();
      } else {
        _showToast('Lỗi tiếp đón Check-in. Vui lòng thử lại.', AppColors.error);
      }
    }
  }

  // Luồng bắt đầu dịch vụ
  Future<void> _handleStartService(AdminBookingModel b) async {
    setState(() => _processingBookingId = b.id);
    final success = await _repository.startServiceBooking(b.id);
    if (mounted) {
      setState(() => _processingBookingId = null);
      if (success) {
        _showToast('Đã bắt đầu trị liệu cho ${b.customerName}', const Color(0xFF7E22CE));
        _fetchBookings();
      } else {
        _showToast('Lỗi bắt đầu dịch vụ. Vui lòng thử lại.', AppColors.error);
      }
    }
  }

  // Luồng hoàn thành Check-out
  Future<void> _handleCheckOut(AdminBookingModel b) async {
    setState(() => _processingBookingId = b.id);
    final success = await _repository.checkOutBooking(b.id);
    if (mounted) {
      setState(() => _processingBookingId = null);
      if (success) {
        _showToast('Hoàn thành trị liệu cho ${b.customerName}. Sẵn sàng xuất hóa đơn.', AppColors.primary);
        _fetchBookings();
      } else {
        _showToast('Lỗi hoàn thành Check-out. Vui lòng thử lại.', AppColors.error);
      }
    }
  }

  // Luồng Từ chối / Hủy lịch hẹn
  Future<void> _handleCancel(AdminBookingModel b) async {
    final reasonController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Hủy / Từ chối lịch hẹn',
          style: AppTypography.zaloFont(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Xác nhận từ chối lịch hẹn của khách hàng ${b.customerName}?',
              style: AppTypography.zaloFont(fontSize: 13, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: reasonController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'Nhập lý do từ chối (tùy chọn)...',
                hintStyle: AppTypography.zaloFont(fontSize: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Quay lại', style: AppTypography.zaloFont(fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
            ),
            child: Text('Xác nhận hủy', style: AppTypography.zaloFont(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _processingBookingId = b.id);
      final success = await _repository.cancelBooking(
        b.id,
        reason: reasonController.text.trim(),
      );
      if (mounted) {
        setState(() => _processingBookingId = null);
        if (success) {
          _showToast('Đã hủy lịch hẹn của ${b.customerName}', const Color(0xFFDC2626));
          _fetchBookings();
        } else {
          _showToast('Lỗi khi hủy lịch. Vui lòng thử lại.', AppColors.error);
        }
      }
    }
  }

  void _showToast(String message, Color bgColor) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w500)),
        backgroundColor: bgColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // Xử lý quét mã QR tiếp đón
  void _openQrScanner() {
    showDialog(
      context: context,
      builder: (_) => AdminQrScannerModal(
        onCodeScanned: (code) {
          _handleScannedCode(code);
        },
      ),
    );
  }

  void _handleScannedCode(String code) {
    final cleanCode = code.trim().toUpperCase();
    final match = _bookings.firstWhere(
      (b) => b.bookingCode.toUpperCase() == cleanCode || b.id.toUpperCase() == cleanCode,
      orElse: () => _bookings.firstWhere(
        (b) => b.customerPhone == cleanCode,
        orElse: () => const AdminBookingModel(
          id: '',
          bookingCode: '',
          bookingDate: '',
          startTime: '',
          endTime: '',
          customerName: '',
          customerPhone: '',
          serviceName: '',
          finalPrice: 0,
          status: '',
          paymentStatus: '',
        ),
      ),
    );

    if (match.id.isNotEmpty) {
      _showCheckInConfirmSheet(match);
    } else {
      _showToast('Không tìm thấy lịch hẹn với mã: $code trong ngày hôm nay.', AppColors.error);
    }
  }

  void _showCheckInConfirmSheet(AdminBookingModel b) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F6ED),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.qr_code_scanner_rounded, color: Color(0xFF0D6832), size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Xác nhận Tiếp đón Khách hàng',
                        style: AppTypography.zaloFont(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textHeading,
                        ),
                      ),
                      Text(
                        'Mã đặt lịch: ${b.bookingCode}',
                        style: AppTypography.zaloFont(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(color: Color(0xFFE5E7EB)),
            const SizedBox(height: 12),
            _buildDetailRow('Khách hàng:', b.customerName),
            _buildDetailRow('Số điện thoại:', b.customerPhone),
            _buildDetailRow('Thời gian hẹn:', '${b.startTime} - ${b.endTime}'),
            _buildDetailRow('Dịch vụ:', b.serviceName),
            if (b.technicianName != null && b.technicianName!.isNotEmpty)
              _buildDetailRow('Kỹ thuật viên:', b.technicianName!),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'Hủy',
                      style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _handleCheckIn(b);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00693F),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'Xác nhận Check-in',
                      style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w700),
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
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTypography.zaloFont(fontSize: 12.5, color: AppColors.textSecondary),
          ),
          Text(
            value,
            style: AppTypography.zaloFont(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textHeading,
            ),
          ),
        ],
      ),
    );
  }

  void _showAppointmentDetailSheet(AdminBookingModel b) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Chi tiết ca hẹn ${b.bookingCode}',
                  style: AppTypography.zaloFont(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textHeading,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const Divider(color: Color(0xFFE5E7EB)),
            const SizedBox(height: 8),
            _buildDetailRow('Khách hàng:', b.customerName),
            _buildDetailRow('Số điện thoại:', b.customerPhone),
            _buildDetailRow('Dịch vụ:', b.serviceName),
            _buildDetailRow('Ngày hẹn:', b.bookingDate),
            _buildDetailRow('Khung giờ:', '${b.startTime} - ${b.endTime}'),
            _buildDetailRow('Trạng thái:', b.status),
            _buildDetailRow('Thanh toán:', b.paymentStatus),
            if (b.branchName != null) _buildDetailRow('Cơ sở:', b.branchName!),
            if (b.technicianName != null) _buildDetailRow('KTV thực hiện:', b.technicianName!),
            if (b.roomName != null) _buildDetailRow('Phòng trị liệu:', b.roomName!),
            if (b.notes != null && b.notes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Ghi chú của khách:',
                style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 4),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Text(
                  b.notes!,
                  style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textHeading),
                ),
              ),
            ],
            const SizedBox(height: 20),
          ],
        ),
      ),
    ),
  );
  }

  Widget _buildMicroPill({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    Color activeColor = const Color(0xFF00693F),
    Color? activeBgColor,
    Color inactiveBgColor = const Color(0xFFF3F4F6),
    Color inactiveTextColor = const Color(0xFF4B5563),
    IconData? icon,
    String? badgeText,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          height: 27,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? (activeBgColor ?? activeColor) : inactiveBgColor,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: isSelected ? activeColor : const Color(0xFFE5E7EB),
              width: isSelected ? 1.2 : 0.8,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 13,
                  color: isSelected ? Colors.white : inactiveTextColor,
                ),
                const SizedBox(width: 4),
              ],
              Text(
                label,
                style: AppTypography.zaloFont(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? Colors.white : inactiveTextColor,
                ),
              ),
              if (badgeText != null && badgeText.isNotEmpty) ...[
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.white.withValues(alpha: 0.25) : const Color(0xFFE5E7EB),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    badgeText,
                    style: AppTypography.zaloFont(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? Colors.white : const Color(0xFF374151),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 14,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tiếp đón & Lịch hẹn',
              style: AppTypography.zaloFont(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
              ),
            ),
            Text(
              _isAllDates
                  ? 'Toàn bộ ca hẹn · ${_filteredBookings.length} khách'
                  : '${DateFormat('dd/MM/yyyy').format(_selectedDate)} · ${_filteredBookings.length} khách',
              style: AppTypography.zaloFont(
                fontSize: 10.5,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          // Nút chọn chi nhánh (Compact pill)
          PopupMenuButton<String>(
            tooltip: 'Chọn cơ sở',
            onSelected: (val) {
              setState(() => _selectedBranchId = val);
              _fetchBookings();
            },
            itemBuilder: (ctx) => [
              PopupMenuItem(
                value: 'ALL',
                child: Text('Tất cả cơ sở', style: AppTypography.zaloFont(fontSize: 12)),
              ),
              ..._branches.map((b) => PopupMenuItem(
                    value: b.id,
                    child: Text(b.name, style: AppTypography.zaloFont(fontSize: 12)),
                  )),
            ],
            child: Container(
              height: 30,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              margin: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 14),
                  const SizedBox(width: 4),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 80),
                    child: Text(
                      _selectedBranchId == 'ALL'
                          ? 'Tất cả CS'
                          : (_branches.firstWhere((b) => b.id == _selectedBranchId, orElse: () => const AdminBranchModel(id: '', name: 'Cơ sở', address: '', phone: '', district: '')).name),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.zaloFont(fontSize: 10.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                    ),
                  ),
                  const Icon(Icons.arrow_drop_down_rounded, size: 16, color: Color(0xFF6B7280)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 4),
          // Nút quét mã QR tiếp đón (Compact)
          IconButton(
            tooltip: 'Quét mã QR Tiếp đón',
            onPressed: _openQrScanner,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            icon: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFFE8F6ED),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.qr_code_scanner_rounded, color: Color(0xFF00693F), size: 17),
            ),
          ),
          const SizedBox(width: 10),
        ],
      ),
      body: Column(
        children: [
          // THANH CÔNG CỤ TẬP TRUNG TỐI ƯU (SEARCH + NGÀY + TRẠNG THÁI GỌN GÀNG)
          // 2. THANH CÔNG CỤ TẬP TRUNG GỌN NHẸ (Toolbar 2 dòng)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: Column(
              children: [
                // Dòng 1: Ô tìm kiếm toàn chiều rộng
                SizedBox(
                  height: 34,
                  child: TextField(
                    controller: _searchController,
                    style: AppTypography.zaloFont(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Tìm khách hàng, SĐT, mã BK...',
                      hintStyle: AppTypography.zaloFont(fontSize: 11.5, color: const Color(0xFF9CA3AF)),
                      prefixIcon: const Icon(Icons.search_rounded, size: 16, color: Color(0xFF9CA3AF)),
                      prefixIconConstraints: const BoxConstraints(minWidth: 32),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 14),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFF00693F)),
                      ),
                    ),
                    onChanged: (val) => setState(() => _searchQuery = val.trim()),
                  ),
                ),
                const SizedBox(height: 6),

                // Dòng 2: Thanh Micro-pills cuộn ngang: ĐÚNG 2 NÚT LỌC NGÀY (Chọn ngày & Tất cả) + Phân loại Trạng thái
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      // Nút 1: Chọn ngày (bấm mở DatePicker, hiện ngày đã chọn)
                      _buildMicroPill(
                        label: _isAllDates ? 'Chọn ngày' : DateFormat('dd/MM').format(_selectedDate),
                        icon: Icons.calendar_month_rounded,
                        isSelected: !_isAllDates,
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _selectedDate,
                            firstDate: DateTime(2025),
                            lastDate: DateTime(2030),
                          );
                          if (picked != null) {
                            setState(() {
                              _selectedDate = picked;
                              _isAllDates = false;
                            });
                            _fetchBookings();
                          }
                        },
                      ),
                      const SizedBox(width: 6),
                      // Nút 2: Tất cả (tất cả các ngày)
                      _buildMicroPill(
                        label: 'Tất cả',
                        isSelected: _isAllDates,
                        onTap: () {
                          setState(() => _isAllDates = true);
                          _fetchBookings();
                        },
                      ),
                      Container(
                        height: 16,
                        width: 1,
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        color: const Color(0xFFE5E7EB),
                      ),

                      // Bộ lọc trạng thái: Tất cả ca, Chờ duyệt, Đã tiếp đón...
                      ..._statusFilters.map((sf) {
                        final key = sf['key']!;
                        final isSel = _selectedStatus == key;
                        final count = key == 'ALL'
                            ? _bookings.length
                            : _bookings.where((b) => b.status == key).length;
                        final displayLabel = key == 'ALL' ? 'Tất cả ca' : sf['label']!;

                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: _buildMicroPill(
                            label: displayLabel,
                            badgeText: count > 0 ? '$count' : null,
                            isSelected: isSel,
                            activeColor: key == 'PENDING' ? const Color(0xFFD97706) : const Color(0xFF00693F),
                            onTap: () {
                              setState(() {
                                _selectedStatus = key;
                                if (key == 'PENDING') _isAllDates = true;
                              });
                              _fetchBookings();
                            },
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE5E7EB)),

          // 4. Danh sách ca hẹn phân theo Ca
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchBookings,
              color: AppColors.primary,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _filteredBookings.isEmpty
                      ? ListView(
                          children: [
                            const SizedBox(height: 60),
                            Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 60,
                                    height: 60,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFFF3F4F6),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.event_busy_rounded,
                                      size: 32,
                                      color: Color(0xFF9CA3AF),
                                    ),
                                  ),
                                  const SizedBox(height: 14),
                                  Text(
                                    'Không có ca hẹn nào phù hợp',
                                    style: AppTypography.zaloFont(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textHeading,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Hãy chọn ngày khác hoặc thử tìm kiếm với từ khóa khác.',
                                    style: AppTypography.zaloFont(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        )
                      : ListView(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          children: [
                            // Thanh tiêu đề phân ca & Nút mở/thu gọn nhanh
                            Padding(
                              padding: const EdgeInsets.only(bottom: 12, left: 2, right: 2),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.layers_rounded, size: 16, color: AppColors.primary),
                                      const SizedBox(width: 6),
                                      Text(
                                        'TIẾP ĐÓN PHÂN THEO CA (${_filteredBookings.length} khách)',
                                        style: AppTypography.zaloFont(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.textHeading,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Row(
                                    children: [
                                      InkWell(
                                        onTap: () => setState(() => _isCompactView = !_isCompactView),
                                        borderRadius: BorderRadius.circular(6),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: _isCompactView ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Row(
                                            children: [
                                              Icon(
                                                _isCompactView ? Icons.view_compact_rounded : Icons.view_agenda_rounded,
                                                size: 13,
                                                color: _isCompactView ? const Color(0xFF00693F) : const Color(0xFF4B5563),
                                              ),
                                              const SizedBox(width: 3),
                                              Text(
                                                _isCompactView ? 'Xem gọn' : 'Xem chi tiết',
                                                style: AppTypography.zaloFont(
                                                  fontSize: 10.5,
                                                  fontWeight: FontWeight.w600,
                                                  color: _isCompactView ? const Color(0xFF00693F) : const Color(0xFF4B5563),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      InkWell(
                                        onTap: _toggleAllShifts,
                                        borderRadius: BorderRadius.circular(6),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          child: Text(
                                            _expandedShifts.isEmpty ? 'Mở tất cả' : 'Thu gọn tất cả',
                                            style: AppTypography.zaloFont(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),

                            // Duyệt qua từng Ca (Sáng, Chiều, Tối)
                            ..._shiftGroups.map((shift) {
                              final String key = shift['key'] as String;
                              final String title = shift['title'] as String;
                              final String timeRange = shift['timeRange'] as String;
                              final IconData icon = shift['icon'] as IconData;
                              final Color color = shift['color'] as Color;
                              final Color bgColor = shift['bgColor'] as Color;
                              final List<AdminBookingModel> shiftBookings =
                                  shift['bookings'] as List<AdminBookingModel>;
                              final bool isExpanded = _expandedShifts.contains(key);

                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: isExpanded ? color.withValues(alpha: 0.35) : const Color(0xFFE5E7EB),
                                    width: isExpanded ? 1.5 : 1,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.02),
                                      blurRadius: 4,
                                      offset: const Offset(0, 1),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Header của Ca - BẤM VÀO SẼ HIỆN / ẨN KHÁCH
                                    Material(
                                      color: Colors.transparent,
                                      child: InkWell(
                                        onTap: () => _toggleShift(key),
                                        borderRadius: BorderRadius.circular(13),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                          child: Row(
                                            children: [
                                              Container(
                                                width: 32,
                                                height: 32,
                                                decoration: BoxDecoration(
                                                  color: bgColor,
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: Icon(icon, color: color, size: 17),
                                              ),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Row(
                                                      children: [
                                                        Text(
                                                          title,
                                                          style: AppTypography.zaloFont(
                                                            fontSize: 13.5,
                                                            fontWeight: FontWeight.w700,
                                                            color: AppColors.textHeading,
                                                          ),
                                                        ),
                                                        const SizedBox(width: 6),
                                                        Container(
                                                          padding: const EdgeInsets.symmetric(
                                                              horizontal: 6, vertical: 1.5),
                                                          decoration: BoxDecoration(
                                                            color: shiftBookings.isNotEmpty
                                                                ? color.withValues(alpha: 0.12)
                                                                : const Color(0xFFF3F4F6),
                                                            borderRadius: BorderRadius.circular(6),
                                                          ),
                                                          child: Text(
                                                            '${shiftBookings.length} khách',
                                                            style: AppTypography.zaloFont(
                                                              fontSize: 10.5,
                                                              fontWeight: FontWeight.w700,
                                                              color: shiftBookings.isNotEmpty
                                                                  ? color
                                                                  : const Color(0xFF6B7280),
                                                            ),
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                    const SizedBox(height: 1),
                                                    Text(
                                                      'Khung giờ: $timeRange',
                                                      style: AppTypography.zaloFont(
                                                        fontSize: 10.5,
                                                        color: AppColors.textSecondary,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              Container(
                                                width: 30,
                                                height: 30,
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFFF9FAFB),
                                                  shape: BoxShape.circle,
                                                  border: Border.all(color: const Color(0xFFE5E7EB)),
                                                ),
                                                child: Icon(
                                                  isExpanded
                                                      ? Icons.keyboard_arrow_up_rounded
                                                      : Icons.keyboard_arrow_down_rounded,
                                                  color: const Color(0xFF4B5563),
                                                  size: 20,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),

                                    // Danh sách khách trong ca khi mở rộng
                                    if (isExpanded) ...[
                                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                                      if (shiftBookings.isEmpty)
                                        Padding(
                                          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                                          child: Center(
                                            child: Text(
                                              'Chưa có lịch hẹn nào trong $title ($timeRange)',
                                              style: AppTypography.zaloFont(
                                                fontSize: 12,
                                                color: const Color(0xFF9CA3AF),
                                                fontStyle: FontStyle.italic,
                                              ),
                                            ),
                                          ),
                                        )
                                      else
                                        Padding(
                                          padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
                                          child: Column(
                                            children: shiftBookings.map((b) {
                                              return AdminAppointmentCard(
                                                booking: b,
                                                isProcessing: _processingBookingId == b.id,
                                                isCompact: _isCompactView,
                                                onApprove: () => _handleApprove(b),
                                                onCancel: () => _handleCancel(b),
                                                onCheckIn: () => _handleCheckIn(b),
                                                onStartService: () => _handleStartService(b),
                                                onCheckOut: () => _handleCheckOut(b),
                                                onViewDetail: () => _showAppointmentDetailSheet(b),
                                              );
                                            }).toList(),
                                          ),
                                        ),
                                    ],
                                  ],
                                ),
                              );
                            }),
                          ],
                        ),
            ),
          ),
        ],
      ),
    );
  }
}
