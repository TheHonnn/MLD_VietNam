import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/admin_appointment_card.dart';
import '../widgets/admin_qr_scanner_modal.dart';

class AdminFrontdeskScreen extends StatefulWidget {
  final VoidCallback? onBackToDashboard;

  const AdminFrontdeskScreen({
    super.key,
    this.onBackToDashboard,
  });

  @override
  State<AdminFrontdeskScreen> createState() => _AdminFrontdeskScreenState();
}

class _AdminFrontdeskScreenState extends State<AdminFrontdeskScreen> {
  final AdminRepository _repository = AdminRepository.instance;

  DateTime _selectedDate = DateTime.now();
  String _selectedStatus = 'ALL';
  String _selectedBranchId = 'ALL';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  List<AdminBookingModel> _bookings = [];
  List<AdminBranchModel> _branches = [];
  String? _processingBookingId;

  final List<Map<String, String>> _statusFilters = [
    {'key': 'ALL', 'label': 'Tất cả'},
    {'key': 'PENDING', 'label': 'Chờ duyệt'},
    {'key': 'CONFIRMED', 'label': 'Đã xác nhận'},
    {'key': 'CHECKED_IN', 'label': 'Đã tiếp đón'},
    {'key': 'IN_SERVICE', 'label': 'Đang phục vụ'},
    {'key': 'COMPLETED', 'label': 'Hoàn thành'},
  ];

  @override
  void initState() {
    super.initState();
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

  void _showToast(String message, Color bgColor) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: GoogleFonts.montserrat(fontSize: 12.5, fontWeight: FontWeight.w500)),
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
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
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
                        style: GoogleFonts.montserrat(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textHeading,
                        ),
                      ),
                      Text(
                        'Mã đặt lịch: ${b.bookingCode}',
                        style: GoogleFonts.montserrat(
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
                      style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.w600),
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
                      style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ],
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
            style: GoogleFonts.montserrat(fontSize: 12.5, color: AppColors.textSecondary),
          ),
          Text(
            value,
            style: GoogleFonts.montserrat(
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
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Chi tiết ca hẹn ${b.bookingCode}',
                  style: GoogleFonts.montserrat(
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
                style: GoogleFonts.montserrat(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
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
                  style: GoogleFonts.montserrat(fontSize: 12, color: AppColors.textHeading),
                ),
              ),
            ],
            const SizedBox(height: 20),
          ],
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
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tiếp đón & Lịch hẹn Spa',
              style: GoogleFonts.montserrat(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
              ),
            ),
            Text(
              '${_bookings.length} ca hẹn trong ngày',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          // Nút chọn chi nhánh
          PopupMenuButton<String>(
            tooltip: 'Chọn cơ sở',
            icon: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.location_on_outlined, color: Color(0xFF6B7280), size: 19),
            ),
            onSelected: (val) {
              setState(() => _selectedBranchId = val);
              _fetchBookings();
            },
            itemBuilder: (ctx) => [
              PopupMenuItem(
                value: 'ALL',
                child: Text('Tất cả cơ sở', style: GoogleFonts.montserrat(fontSize: 12.5)),
              ),
              ..._branches.map((b) => PopupMenuItem(
                    value: b.id,
                    child: Text(b.name, style: GoogleFonts.montserrat(fontSize: 12.5)),
                  )),
            ],
          ),
          // Nút quét mã QR tiếp đón
          IconButton(
            tooltip: 'Quét mã QR Tiếp đón',
            onPressed: _openQrScanner,
            icon: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.qr_code_scanner_rounded, color: AppColors.primary, size: 19),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // 1. Dải thanh chọn Ngày (Horizontal Date Strip)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
            child: Row(
              children: [
                // 3 nút ngày nhanh: Hôm qua, Hôm nay, Ngày mai
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [-1, 0, 1, 2, 3].map((offset) {
                        final date = now.add(Duration(days: offset));
                        final isSelected = DateUtils.isSameDay(date, _selectedDate);
                        String label = DateFormat('dd/MM').format(date);
                        if (offset == 0) label = 'Hôm nay';
                        if (offset == 1) label = 'Ngày mai';

                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(label),
                            selected: isSelected,
                            selectedColor: AppColors.primary,
                            backgroundColor: const Color(0xFFF3F4F6),
                            labelStyle: GoogleFonts.montserrat(
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected ? Colors.white : AppColors.textHeading,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                              side: BorderSide.none,
                            ),
                            showCheckmark: false,
                            onSelected: (selected) {
                              if (selected) {
                                setState(() => _selectedDate = date);
                                _fetchBookings();
                              }
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),
                // Nút chọn ngày từ Calendar Picker
                IconButton(
                  tooltip: 'Chọn ngày trên lịch',
                  icon: const Icon(Icons.calendar_month_rounded, color: AppColors.primary, size: 22),
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime(2025),
                      lastDate: DateTime(2030),
                    );
                    if (picked != null) {
                      setState(() => _selectedDate = picked);
                      _fetchBookings();
                    }
                  },
                ),
              ],
            ),
          ),

          // 2. Ô tìm kiếm & Chọn chi nhánh
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Tìm khách hàng, SĐT, mã BK...',
                      hintStyle: GoogleFonts.montserrat(fontSize: 12, color: const Color(0xFF9CA3AF)),
                      prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF9CA3AF)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                    ),
                    onChanged: (val) {
                      setState(() => _searchQuery = val.trim());
                    },
                  ),
                ),
              ],
            ),
          ),

          // 3. Thanh cuộn bộ lọc Trạng thái (Chips)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _statusFilters.map((filter) {
                  final key = filter['key']!;
                  final isSelected = _selectedStatus == key;

                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(filter['label']!),
                      selected: isSelected,
                      selectedColor: const Color(0xFFEFF4FE),
                      backgroundColor: Colors.white,
                      labelStyle: GoogleFonts.montserrat(
                        fontSize: 11.5,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? AppColors.primary : const Color(0xFF6B7280),
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                        side: BorderSide(
                          color: isSelected ? AppColors.primary : const Color(0xFFE5E7EB),
                        ),
                      ),
                      showCheckmark: false,
                      onSelected: (selected) {
                        setState(() => _selectedStatus = key);
                        _fetchBookings();
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE5E7EB)),

          // 4. Danh sách ca hẹn
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
                                    style: GoogleFonts.montserrat(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textHeading,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Hãy chọn ngày khác hoặc thử tìm kiếm với từ khóa khác.',
                                    style: GoogleFonts.montserrat(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          itemCount: _filteredBookings.length,
                          itemBuilder: (context, index) {
                            final b = _filteredBookings[index];
                            return AdminAppointmentCard(
                              booking: b,
                              isProcessing: _processingBookingId == b.id,
                              onApprove: () => _handleApprove(b),
                              onCheckIn: () => _handleCheckIn(b),
                              onStartService: () => _handleStartService(b),
                              onCheckOut: () => _handleCheckOut(b),
                              onViewDetail: () => _showAppointmentDetailSheet(b),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}
