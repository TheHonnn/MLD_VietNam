import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/admin_appointment_card.dart';
import '../widgets/admin_qr_scanner_modal.dart';
import '../../../../core/services/top_notification_service.dart';

class AdminFrontdeskScreen extends StatefulWidget {
  final VoidCallback? onBackToDashboard;
  final String? initialStatus;
  final String? pendingQrCode;
  final int qrScanNonce;

  const AdminFrontdeskScreen({
    super.key,
    this.onBackToDashboard,
    this.initialStatus,
    this.pendingQrCode,
    this.qrScanNonce = 0,
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
  bool _isMonthlyView = false;
  DateTime _focusedMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);
  bool _isMonthlyLoading = false;
  List<AdminBookingModel> _monthlyBookings = [];
  List<AdminTechnicianShiftModel> _monthlyShifts = [];
  String? _deferredQrCode;

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
    if (widget.pendingQrCode != null && widget.pendingQrCode!.trim().isNotEmpty) {
      _deferredQrCode = widget.pendingQrCode!.trim();
    }
    _loadBranches();
    _fetchBookings();
  }

  @override
  void didUpdateWidget(covariant AdminFrontdeskScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.qrScanNonce != oldWidget.qrScanNonce &&
        widget.pendingQrCode != null &&
        widget.pendingQrCode!.trim().isNotEmpty) {
      final code = widget.pendingQrCode!.trim();
      if (_isLoading) {
        _deferredQrCode = code;
      } else {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            _handleScannedCode(code);
          }
        });
      }
    }
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
      final queuedQr = _deferredQrCode;
      if (queuedQr != null && queuedQr.isNotEmpty) {
        _deferredQrCode = null;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            _handleScannedCode(queuedQr);
          }
        });
      }
    }
  }

  Future<void> _fetchMonthlyData() async {
    setState(() => _isMonthlyLoading = true);
    final branchFilter = _selectedBranchId == 'ALL' ? null : _selectedBranchId;
    final results = await Future.wait([
      _repository.fetchMonthlyBookings(
        year: _focusedMonth.year,
        month: _focusedMonth.month,
        branchId: branchFilter,
      ),
      _repository.fetchMonthlyShifts(
        year: _focusedMonth.year,
        month: _focusedMonth.month,
        branchId: branchFilter,
      ),
    ]);

    if (mounted) {
      setState(() {
        _monthlyBookings = results[0] as List<AdminBookingModel>;
        _monthlyShifts = results[1] as List<AdminTechnicianShiftModel>;
        _isMonthlyLoading = false;
      });
    }
  }

  void _changeFocusedMonth(int deltaMonths) {
    final nextMonth = DateTime(_focusedMonth.year, _focusedMonth.month + deltaMonths, 1);
    setState(() {
      _focusedMonth = nextMonth;
      if (_selectedDate.year != nextMonth.year || _selectedDate.month != nextMonth.month) {
        _selectedDate = nextMonth;
      }
    });
    _fetchMonthlyData();
  }

  String _shiftSlotForStartTime(String startTime) {
    final h = _parseHour(startTime);
    final parts = startTime.split(':');
    final m = parts.length > 1 ? (int.tryParse(parts[1]) ?? 0) : 0;
    if (h < 12) return 'morning';
    if (h < 17 || (h == 17 && m <= 30)) return 'afternoon';
    return 'evening';
  }

  List<AdminBookingModel> get _filteredMonthlyBookings {
    return _monthlyBookings.where((b) {
      if (_selectedStatus != 'ALL' && b.status != _selectedStatus) {
        return false;
      }
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return b.customerName.toLowerCase().contains(q) ||
          b.customerPhone.toLowerCase().contains(q) ||
          b.bookingCode.toLowerCase().contains(q) ||
          b.serviceName.toLowerCase().contains(q);
    }).toList();
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

  void _refreshActiveView() {
    if (_isMonthlyView) {
      _fetchMonthlyData();
    } else {
      _fetchBookings();
    }
  }

  Future<void> _handleApprove(AdminBookingModel b) async {
    setState(() => _processingBookingId = b.id);
    final success = await _repository.approveBooking(b.id);
    if (mounted) {
      setState(() => _processingBookingId = null);
      if (success) {
        _showToast('Đã duyệt xác nhận lịch hẹn của ${b.customerName}', AppColors.success);
        _refreshActiveView();
      } else {
        _showToast(
          _repository.lastBookingActionError ?? 'Không thể duyệt lịch. Vui lòng thử lại.',
          AppColors.error,
        );
      }
    }
  }

  Future<void> _handleCheckIn(AdminBookingModel b) async {
    setState(() => _processingBookingId = b.id);
    final success = await _repository.checkInBooking(b.id, userPackageId: b.userPackageId);
    if (mounted) {
      setState(() => _processingBookingId = null);
      if (success) {
        _showToast('Đã tiếp đón khách hàng ${b.customerName} thành công!', AppColors.success);
        _refreshActiveView();
      } else {
        _showToast(
          _repository.lastBookingActionError ?? 'Lỗi tiếp đón Check-in. Vui lòng thử lại.',
          AppColors.error,
        );
      }
    }
  }

  Future<void> _handleStartService(AdminBookingModel b) async {
    setState(() => _processingBookingId = b.id);
    final success = await _repository.startServiceBooking(b.id);
    if (mounted) {
      setState(() => _processingBookingId = null);
      if (success) {
        _showToast('Đã bắt đầu trị liệu cho ${b.customerName}', const Color(0xFF7E22CE));
        _refreshActiveView();
      } else {
        _showToast(
          _repository.lastBookingActionError ?? 'Lỗi bắt đầu dịch vụ. Vui lòng thử lại.',
          AppColors.error,
        );
      }
    }
  }

  Future<void> _handleFinishService(AdminBookingModel b) async {
    if (b.userPackageId == null) {
      setState(() => _processingBookingId = b.id);
      final success = await _repository.completeClinicalSession(bookingId: b.id);
      if (mounted) {
        setState(() => _processingBookingId = null);
        if (success) {
          _showToast(
            'Đã hoàn tất chuyên môn cho ${b.customerName}. Sẵn sàng Check-out!',
            const Color(0xFF047857),
          );
          _refreshActiveView();
        } else {
          _showToast(
            _repository.lastBookingActionError ?? 'Không thể hoàn tất chuyên môn. Vui lòng thử lại.',
            AppColors.error,
          );
        }
      }
      return;
    }

    final conditionBeforeController = TextEditingController(text: 'Tình trạng ổn định trước trị liệu');
    final conditionAfterController = TextEditingController(text: 'Giảm ứ trệ, cơ thể thư giãn sau buổi trị liệu');
    final treatmentNotesController = TextEditingController(text: 'Thực hiện đúng phác đồ ${b.serviceName}');
    final homeCareController = TextEditingController(text: 'Uống đủ nước ấm, nghỉ ngơi nhẹ nhàng trong 24h');
    final adverseController = TextEditingController();
    bool hasAbnormalReaction = false;
    String? formError;

    final payload = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 16,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFD1D5DB),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Hoàn tất buổi liệu trình & Ghi nhật ký',
                    style: AppTypography.zaloFont(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${b.customerName} • ${b.serviceName}',
                    style: AppTypography.zaloFont(fontSize: 13, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: conditionBeforeController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: 'Tình trạng trước buổi *',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: conditionAfterController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: 'Tình trạng sau buổi *',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: treatmentNotesController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: 'Ghi chú chuyên môn *',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: homeCareController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: 'Hướng dẫn chăm sóc tại nhà',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 6),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      'Có phản ứng bất thường sau buổi',
                      style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    value: hasAbnormalReaction,
                    onChanged: (val) => setModalState(() => hasAbnormalReaction = val),
                  ),
                  if (hasAbnormalReaction) ...[
                    TextField(
                      controller: adverseController,
                      maxLines: 2,
                      decoration: InputDecoration(
                        labelText: 'Mô tả phản ứng bất thường',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  if (formError != null) ...[
                    Text(
                      formError!,
                      style: AppTypography.zaloFont(fontSize: 12, color: AppColors.error),
                    ),
                    const SizedBox(height: 8),
                  ],
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        final before = conditionBeforeController.text.trim();
                        final after = conditionAfterController.text.trim();
                        final notes = treatmentNotesController.text.trim();
                        if (before.isEmpty || after.isEmpty || notes.isEmpty) {
                          setModalState(() {
                            formError = 'Vui lòng nhập đầy đủ tình trạng trước/sau và ghi chú chuyên môn.';
                          });
                          return;
                        }
                        Navigator.pop(ctx, {
                          'conditionBefore': before,
                          'conditionAfter': after,
                          'treatmentNotes': notes,
                          'homeCareInstructions': homeCareController.text.trim(),
                          'hasAbnormalReaction': hasAbnormalReaction,
                          'adverseReactions': adverseController.text.trim(),
                        });
                      },
                      icon: const Icon(Icons.task_alt_rounded, size: 18),
                      label: Text(
                        'Lưu nhật ký & Trừ 1 buổi gói',
                        style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7E22CE),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    conditionBeforeController.dispose();
    conditionAfterController.dispose();
    treatmentNotesController.dispose();
    homeCareController.dispose();
    adverseController.dispose();

    if (payload != null && mounted) {
      setState(() => _processingBookingId = b.id);
      final success = await _repository.completeClinicalSession(
        bookingId: b.id,
        userPackageId: b.userPackageId,
        conditionBefore: payload['conditionBefore'] as String,
        conditionAfter: payload['conditionAfter'] as String,
        treatmentNotes: payload['treatmentNotes'] as String,
        homeCareInstructions: payload['homeCareInstructions'] as String,
        hasAbnormalReaction: payload['hasAbnormalReaction'] as bool,
        adverseReactions: payload['adverseReactions'] as String,
      );
      if (mounted) {
        setState(() => _processingBookingId = null);
        if (success) {
          _showToast(
            'Đã lưu nhật ký trị liệu và trừ 1 buổi cho ${b.customerName}!',
            const Color(0xFF047857),
          );
          _refreshActiveView();
        } else {
          _showToast(
            _repository.lastBookingActionError ?? 'Không thể hoàn tất buổi liệu trình. Vui lòng thử lại.',
            AppColors.error,
          );
        }
      }
    }
  }

  Future<void> _handleCheckOut(AdminBookingModel b) async {
    setState(() => _processingBookingId = b.id);
    final success = await _repository.checkOutBooking(b.id);
    if (mounted) {
      setState(() => _processingBookingId = null);
      if (success) {
        final msg = b.isPackageSession
            ? 'Hoàn thành trị liệu cho ${b.customerName}. Đã đóng ca buổi gói liệu trình!'
            : 'Hoàn thành trị liệu cho ${b.customerName}. Đã gửi tặng voucher tri ân vào ví khách!';
        _showToast(msg, AppColors.primary);
        _refreshActiveView();
      } else {
        _showToast(
          _repository.lastBookingActionError ?? 'Lỗi hoàn thành Check-out. Vui lòng thử lại.',
          AppColors.error,
        );
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
            child: Text(
              'Xác nhận hủy',
              style: AppTypography.zaloFont(fontWeight: FontWeight.w700, color: Colors.white),
            ),
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
          _refreshActiveView();
        } else {
          _showToast(
            _repository.lastBookingActionError ?? 'Lỗi khi hủy lịch. Vui lòng thử lại.',
            AppColors.error,
          );
        }
      }
    }
  }

  void _showToast(String message, Color bgColor) {
    if (bgColor == AppColors.error || bgColor == const Color(0xFFE11D48) || bgColor == const Color(0xFFDC2626)) {
      TopNotificationService.showError(message: message);
    } else {
      TopNotificationService.showSuccess(message: message);
    }
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

  AdminBookingModel? _findBookingByScannedCode(
    List<AdminBookingModel> source,
    String cleanCode,
  ) {
    for (final b in source) {
      if (b.bookingCode.toUpperCase() == cleanCode ||
          b.id.toUpperCase() == cleanCode ||
          (b.bookingCode.isNotEmpty &&
              cleanCode.contains(b.bookingCode.toUpperCase()))) {
        return b;
      }
    }
    for (final b in source) {
      if (b.customerPhone == cleanCode) {
        return b;
      }
    }
    return null;
  }

  Future<void> _handleScannedCode(String code) async {
    final cleanCode = code.trim().toUpperCase();
    var match = _findBookingByScannedCode(_bookings, cleanCode) ??
        _findBookingByScannedCode(_monthlyBookings, cleanCode);

    if (match == null) {
      final allDatesBookings = await _repository.fetchBookings(
        bookingDate: DateFormat('yyyy-MM-dd').format(_selectedDate),
        isAllDates: true,
      );
      if (!mounted) return;
      match = _findBookingByScannedCode(allDatesBookings, cleanCode);
    }

    if (match != null && match.id.isNotEmpty) {
      _showCheckInConfirmSheet(match);
    } else {
      _showToast('Không tìm thấy lịch hẹn với mã: $code.', AppColors.error);
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
                      style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
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
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTypography.zaloFont(fontSize: 12.5, color: AppColors.textSecondary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: AppTypography.zaloFont(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textHeading,
              ),
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
                Expanded(
                  child: Text(
                    'Chi tiết ca hẹn ${b.bookingCode}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.zaloFont(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHeading,
                    ),
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
            _buildDetailRow(
              'Chuyên môn:',
              b.isClinicalCompleted
                  ? 'Đã hoàn tất'
                  : (b.status == 'IN_SERVICE' ? 'Đang thực hiện' : 'Chưa bắt đầu'),
            ),
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
    VoidCallback? onTap,
    Color activeColor = const Color(0xFF00693F),
    Color? activeBgColor,
    Color inactiveBgColor = const Color(0xFFF3F4F6),
    Color inactiveTextColor = const Color(0xFF4B5563),
    IconData? icon,
    String? badgeText,
    bool showDropdownArrow = false,
  }) {
    final pillWidget = AnimatedContainer(
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
          if (showDropdownArrow) ...[
            const SizedBox(width: 3),
            Icon(
              Icons.arrow_drop_down_rounded,
              size: 14,
              color: isSelected ? Colors.white : inactiveTextColor,
            ),
          ],
        ],
      ),
    );

    if (onTap == null) {
      return pillWidget;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: pillWidget,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
              _isMonthlyView
                  ? 'Tháng ${DateFormat('MM/yyyy').format(_focusedMonth)} · ${_filteredMonthlyBookings.length} ca hẹn · ${_monthlyShifts.length} ca KTV'
                  : (_isAllDates
                      ? 'Toàn bộ ca hẹn · ${_filteredBookings.length} khách'
                      : '${DateFormat('dd/MM/yyyy').format(_selectedDate)} · ${_filteredBookings.length} khách'),
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
              if (_isMonthlyView) {
                _fetchMonthlyData();
              } else {
                _fetchBookings();
              }
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
                Container(
                  padding: const EdgeInsets.all(3),
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            if (!_isMonthlyView) return;
                            setState(() => _isMonthlyView = false);
                            _fetchBookings();
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 7),
                            decoration: BoxDecoration(
                              color: !_isMonthlyView ? AppColors.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.view_day_rounded,
                                  size: 14,
                                  color: !_isMonthlyView ? Colors.white : const Color(0xFF4B5563),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  'Ca theo ngày',
                                  style: AppTypography.zaloFont(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: !_isMonthlyView ? Colors.white : const Color(0xFF4B5563),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            if (_isMonthlyView) return;
                            setState(() {
                              _isMonthlyView = true;
                              _focusedMonth = DateTime(_selectedDate.year, _selectedDate.month, 1);
                            });
                            _fetchMonthlyData();
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 7),
                            decoration: BoxDecoration(
                              color: _isMonthlyView ? AppColors.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.calendar_month_rounded,
                                  size: 14,
                                  color: _isMonthlyView ? Colors.white : const Color(0xFF4B5563),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  'Ca theo tháng',
                                  style: AppTypography.zaloFont(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: _isMonthlyView ? Colors.white : const Color(0xFF4B5563),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
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

                // Dòng 2: ĐÚNG 2 NÚT LỌC (Ngày & Trạng thái). Xổ menu từ chính nút ra (PopupMenuButton)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: [
                    // NÚT 1: CHỌN NGÀY (Mặc định hôm nay thời gian thực, xổ menu từ nút)
                    PopupMenuButton<String>(
                      offset: const Offset(0, 32),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                      elevation: 6,
                      color: Colors.white,
                      tooltip: 'Lọc ngày',
                      onSelected: (val) async {
                        if (val == 'TODAY') {
                          setState(() {
                            _selectedDate = DateTime.now();
                            _isAllDates = false;
                          });
                          _fetchBookings();
                        } else if (val == 'TOMORROW') {
                          setState(() {
                            _selectedDate = DateTime.now().add(const Duration(days: 1));
                            _isAllDates = false;
                          });
                          _fetchBookings();
                        } else if (val == 'ALL_DATES') {
                          setState(() {
                            _isAllDates = true;
                          });
                          _fetchBookings();
                        } else if (val == 'PICK_CALENDAR') {
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
                        }
                      },
                      itemBuilder: (ctx) => [
                        PopupMenuItem<String>(
                          value: 'TODAY',
                          height: 38,
                          child: Row(
                            children: [
                              Icon(
                                Icons.today_rounded,
                                size: 16,
                                color: (!_isAllDates && DateUtils.isSameDay(_selectedDate, DateTime.now()))
                                    ? const Color(0xFF00693F)
                                    : const Color(0xFF4B5563),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Hôm nay (${DateFormat('dd/MM').format(DateTime.now())})',
                                  style: AppTypography.zaloFont(
                                    fontSize: 12,
                                    fontWeight: (!_isAllDates && DateUtils.isSameDay(_selectedDate, DateTime.now()))
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                    color: (!_isAllDates && DateUtils.isSameDay(_selectedDate, DateTime.now()))
                                        ? const Color(0xFF00693F)
                                        : AppColors.textHeading,
                                  ),
                                ),
                              ),
                              if (!_isAllDates && DateUtils.isSameDay(_selectedDate, DateTime.now()))
                                const Icon(Icons.check_rounded, size: 16, color: Color(0xFF00693F)),
                            ],
                          ),
                        ),
                        PopupMenuItem<String>(
                          value: 'TOMORROW',
                          height: 38,
                          child: Row(
                            children: [
                              Icon(
                                Icons.event_rounded,
                                size: 16,
                                color: (!_isAllDates && DateUtils.isSameDay(_selectedDate, DateTime.now().add(const Duration(days: 1))))
                                    ? const Color(0xFF00693F)
                                    : const Color(0xFF4B5563),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Ngày mai (${DateFormat('dd/MM').format(DateTime.now().add(const Duration(days: 1)))})',
                                  style: AppTypography.zaloFont(
                                    fontSize: 12,
                                    fontWeight: (!_isAllDates && DateUtils.isSameDay(_selectedDate, DateTime.now().add(const Duration(days: 1))))
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                    color: (!_isAllDates && DateUtils.isSameDay(_selectedDate, DateTime.now().add(const Duration(days: 1))))
                                        ? const Color(0xFF00693F)
                                        : AppColors.textHeading,
                                  ),
                                ),
                              ),
                              if (!_isAllDates && DateUtils.isSameDay(_selectedDate, DateTime.now().add(const Duration(days: 1))))
                                const Icon(Icons.check_rounded, size: 16, color: Color(0xFF00693F)),
                            ],
                          ),
                        ),
                        PopupMenuItem<String>(
                          value: 'ALL_DATES',
                          height: 38,
                          child: Row(
                            children: [
                              Icon(
                                Icons.date_range_rounded,
                                size: 16,
                                color: _isAllDates ? const Color(0xFF00693F) : const Color(0xFF4B5563),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Tất cả ngày',
                                  style: AppTypography.zaloFont(
                                    fontSize: 12,
                                    fontWeight: _isAllDates ? FontWeight.w700 : FontWeight.w500,
                                    color: _isAllDates ? const Color(0xFF00693F) : AppColors.textHeading,
                                  ),
                                ),
                              ),
                              if (_isAllDates)
                                const Icon(Icons.check_rounded, size: 16, color: Color(0xFF00693F)),
                            ],
                          ),
                        ),
                        const PopupMenuDivider(height: 1),
                        PopupMenuItem<String>(
                          value: 'PICK_CALENDAR',
                          height: 38,
                          child: Row(
                            children: [
                              const Icon(Icons.calendar_month_rounded, size: 16, color: Color(0xFF00693F)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Chọn ngày trên lịch...',
                                  style: AppTypography.zaloFont(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: const Color(0xFF00693F),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      child: _buildMicroPill(
                        label: _isAllDates
                            ? 'Tất cả ngày'
                            : (DateUtils.isSameDay(_selectedDate, DateTime.now())
                                ? 'Hôm nay: ${DateFormat('dd/MM').format(_selectedDate)}'
                                : (DateUtils.isSameDay(_selectedDate, DateTime.now().add(const Duration(days: 1)))
                                    ? 'Ngày mai: ${DateFormat('dd/MM').format(_selectedDate)}'
                                    : DateFormat('dd/MM/yyyy').format(_selectedDate))),
                        icon: Icons.calendar_month_rounded,
                        isSelected: !_isAllDates,
                        showDropdownArrow: true,
                      ),
                    ),
                    const SizedBox(width: 8),

                    // NÚT 2: TẤT CẢ TRẠNG THÁI (Xổ menu từ chính nút ra)
                    PopupMenuButton<String>(
                      offset: const Offset(0, 32),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                      elevation: 6,
                      color: Colors.white,
                      tooltip: 'Lọc trạng thái',
                      onSelected: (status) {
                        setState(() => _selectedStatus = status);
                        _fetchBookings();
                      },
                      itemBuilder: (ctx) {
                        return _statusFilters.map((s) {
                          final key = s['key']!;
                          final label = s['label']!;
                          final isCurrent = _selectedStatus == key;
                          final count = key == 'ALL'
                              ? _bookings.length
                              : _bookings.where((b) => b.status == key).length;

                          Color dotColor = const Color(0xFF6B7280);
                          if (key == 'PENDING') dotColor = const Color(0xFFD97706);
                          if (key == 'CONFIRMED') dotColor = const Color(0xFF2563EB);
                          if (key == 'CHECKED_IN') dotColor = const Color(0xFF00693F);
                          if (key == 'IN_SERVICE') dotColor = const Color(0xFF7C3AED);
                          if (key == 'COMPLETED') dotColor = const Color(0xFF059669);
                          if (key == 'CANCELLED') dotColor = const Color(0xFFDC2626);

                          return PopupMenuItem<String>(
                            value: key,
                            height: 38,
                            child: Row(
                              children: [
                                if (key != 'ALL')
                                  Container(
                                    width: 8,
                                    height: 8,
                                    margin: const EdgeInsets.only(right: 8),
                                    decoration: BoxDecoration(
                                      color: dotColor,
                                      shape: BoxShape.circle,
                                    ),
                                  )
                                else
                                  const Padding(
                                    padding: EdgeInsets.only(right: 8),
                                    child: Icon(Icons.tune_rounded, size: 14, color: Color(0xFF6B7280)),
                                  ),
                                Expanded(
                                  child: Text(
                                    key == 'ALL' ? 'Tất cả trạng thái' : label,
                                    style: AppTypography.zaloFont(
                                      fontSize: 12,
                                      fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                                      color: isCurrent ? const Color(0xFF00693F) : AppColors.textHeading,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: isCurrent ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    '$count',
                                    style: AppTypography.zaloFont(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: isCurrent ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                                    ),
                                  ),
                                ),
                                if (isCurrent) ...[
                                  const SizedBox(width: 6),
                                  const Icon(Icons.check_rounded, size: 16, color: Color(0xFF00693F)),
                                ],
                              ],
                            ),
                          );
                        }).toList();
                      },
                      child: _buildMicroPill(
                        label: _selectedStatus == 'ALL'
                            ? 'Tất cả'
                            : (_selectedStatus == 'CHECKED_IN'
                                ? 'Tiếp đón'
                                : (_statusFilters.firstWhere((s) => s['key'] == _selectedStatus, orElse: () => {'label': 'Trạng thái'})['label'] ?? 'Trạng thái')),
                        badgeText: _selectedStatus == 'ALL'
                            ? '${_bookings.length}'
                            : '${_bookings.where((b) => b.status == _selectedStatus).length}',
                        icon: Icons.tune_rounded,
                        isSelected: _selectedStatus != 'ALL',
                        activeColor: _selectedStatus == 'PENDING' ? const Color(0xFFD97706) : const Color(0xFF00693F),
                        showDropdownArrow: true,
                      ),
                    ),

                    if (_selectedStatus != 'ALL') ...[
                      const SizedBox(width: 4),
                      // Nút xóa lọc trạng thái về Tất cả
                      GestureDetector(
                        onTap: () {
                          setState(() => _selectedStatus = 'ALL');
                          _fetchBookings();
                        },
                        child: Container(
                          padding: const EdgeInsets.all(5),
                          decoration: const BoxDecoration(
                            color: Color(0xFFF3F4F6),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close_rounded, size: 13, color: Color(0xFF6B7280)),
                        ),
                      ),
                    ],

                    if (_isAllDates || !DateUtils.isSameDay(_selectedDate, DateTime.now())) ...[
                      const SizedBox(width: 4),
                      // Nút reset ngày về hôm nay
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedDate = DateTime.now();
                            _isAllDates = false;
                          });
                          _fetchBookings();
                        },
                        child: Container(
                          padding: const EdgeInsets.all(5),
                          decoration: const BoxDecoration(
                            color: Color(0xFFF3F4F6),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.today_rounded, size: 13, color: Color(0xFF6B7280)),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE5E7EB)),

          // 4. Danh sách ca hẹn phân theo Ca
          Expanded(
            child: _isMonthlyView
                ? _buildMonthlyShiftView()
                : RefreshIndicator(
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
                                  Expanded(
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.layers_rounded, size: 16, color: AppColors.primary),
                                        const SizedBox(width: 6),
                                        Flexible(
                                          child: Text(
                                            'TIẾP ĐÓN PHÂN THEO CA (${_filteredBookings.length} khách)',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: AppTypography.zaloFont(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.textHeading,
                                              letterSpacing: 0.3,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      InkWell(
                                        onTap: () => setState(() => _isCompactView = !_isCompactView),
                                        borderRadius: BorderRadius.circular(6),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: _isCompactView ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                _isCompactView ? Icons.view_compact_rounded : Icons.view_agenda_rounded,
                                                size: 13,
                                                color: _isCompactView ? const Color(0xFF00693F) : const Color(0xFF4B5563),
                                              ),
                                              const SizedBox(width: 3),
                                              Text(
                                                _isCompactView ? 'Gọn' : 'Chi tiết',
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
                                      const SizedBox(width: 6),
                                      InkWell(
                                        onTap: _toggleAllShifts,
                                        borderRadius: BorderRadius.circular(6),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                          child: Text(
                                            _expandedShifts.isEmpty ? 'Mở ca' : 'Thu gọn',
                                            style: AppTypography.zaloFont(
                                              fontSize: 10.5,
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
                                                onFinishService: () => _handleFinishService(b),
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

  Widget _buildMonthlyShiftView() {
    final bookingsByDay = <String, List<AdminBookingModel>>{};
    int morningCount = 0;
    int afternoonCount = 0;
    int eveningCount = 0;

    for (final b in _filteredMonthlyBookings) {
      bookingsByDay.putIfAbsent(b.bookingDate, () => []).add(b);
      switch (_shiftSlotForStartTime(b.startTime)) {
        case 'morning':
          morningCount++;
          break;
        case 'afternoon':
          afternoonCount++;
          break;
        default:
          eveningCount++;
          break;
      }
    }

    final shiftsByDay = <String, List<AdminTechnicianShiftModel>>{};
    for (final s in _monthlyShifts) {
      shiftsByDay.putIfAbsent(s.shiftDate, () => []).add(s);
    }

    final selectedKey = DateFormat('yyyy-MM-dd').format(_selectedDate);
    final selectedBookings = bookingsByDay[selectedKey] ?? [];
    final selectedShifts = shiftsByDay[selectedKey] ?? [];

    return RefreshIndicator(
      onRefresh: _fetchMonthlyData,
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      onPressed: () => _changeFocusedMonth(-1),
                      icon: const Icon(Icons.chevron_left_rounded, color: AppColors.primary),
                      tooltip: 'Tháng trước',
                    ),
                    Column(
                      children: [
                        Text(
                          'Tháng ${DateFormat('MM / yyyy').format(_focusedMonth)}',
                          style: AppTypography.zaloFont(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textHeading,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${_filteredMonthlyBookings.length} ca hẹn · ${_monthlyShifts.length} ca trực KTV',
                          style: AppTypography.zaloFont(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      onPressed: () => _changeFocusedMonth(1),
                      icon: const Icon(Icons.chevron_right_rounded, color: AppColors.primary),
                      tooltip: 'Tháng sau',
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _buildMonthlySummaryChip(
                        label: 'Ca Sáng',
                        count: morningCount,
                        color: const Color(0xFFD97706),
                        bgColor: const Color(0xFFFEF3C7),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: _buildMonthlySummaryChip(
                        label: 'Ca Chiều',
                        count: afternoonCount,
                        color: AppColors.primary,
                        bgColor: const Color(0xFFEFF6FF),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: _buildMonthlySummaryChip(
                        label: 'Ca Tối',
                        count: eveningCount,
                        color: const Color(0xFF7C3AED),
                        bgColor: const Color(0xFFEDE9FE),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_isMonthlyLoading)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 8),
                    child: LinearProgressIndicator(minHeight: 2, color: AppColors.primary),
                  ),
                _buildMonthlyCalendarGrid(
                  bookingsByDay: bookingsByDay,
                  shiftsByDay: shiftsByDay,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _buildSelectedDaySchedulePanel(
            selectedBookings: selectedBookings,
            selectedShifts: selectedShifts,
          ),
        ],
      ),
    );
  }

  Widget _buildMonthlySummaryChip({
    required String label,
    required int count,
    required Color color,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text(
            '$count ca',
            style: AppTypography.zaloFont(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          Text(
            label,
            style: AppTypography.zaloFont(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthlyCalendarGrid({
    required Map<String, List<AdminBookingModel>> bookingsByDay,
    required Map<String, List<AdminTechnicianShiftModel>> shiftsByDay,
  }) {
    const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    final firstDay = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final daysInMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0).day;
    final leadingBlanks = firstDay.weekday - 1;
    final totalCells = leadingBlanks + daysInMonth;
    final rowCount = (totalCells / 7).ceil();

    return Column(
      children: [
        Row(
          children: weekdays
              .map(
                (day) => Expanded(
                  child: Center(
                    child: Text(
                      day,
                      style: AppTypography.zaloFont(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: day == 'CN' ? const Color(0xFFDC2626) : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 6),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: rowCount * 7,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            mainAxisSpacing: 5,
            crossAxisSpacing: 5,
            childAspectRatio: 0.88,
          ),
          itemBuilder: (ctx, index) {
            final dayNum = index - leadingBlanks + 1;
            if (dayNum < 1 || dayNum > daysInMonth) {
              return const SizedBox.shrink();
            }

            final date = DateTime(_focusedMonth.year, _focusedMonth.month, dayNum);
            final dateKey = DateFormat('yyyy-MM-dd').format(date);
            final dayBookings = bookingsByDay[dateKey] ?? const [];
            final dayShifts = shiftsByDay[dateKey] ?? const [];
            final totalCa = dayBookings.length + dayShifts.length;
            final isSelected = DateUtils.isSameDay(date, _selectedDate);
            final isToday = DateUtils.isSameDay(date, DateTime.now());

            final hasMorning = dayBookings.any((b) => _shiftSlotForStartTime(b.startTime) == 'morning') ||
                dayShifts.any((s) => s.shiftSlot == 'morning');
            final hasAfternoon = dayBookings.any((b) => _shiftSlotForStartTime(b.startTime) == 'afternoon') ||
                dayShifts.any((s) => s.shiftSlot == 'afternoon');
            final hasEvening = dayBookings.any((b) => _shiftSlotForStartTime(b.startTime) == 'evening') ||
                dayShifts.any((s) => s.shiftSlot == 'evening');

            return InkWell(
              onTap: () {
                setState(() {
                  _selectedDate = date;
                  _isAllDates = false;
                });
              },
              borderRadius: BorderRadius.circular(10),
              child: Container(
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.primary
                      : (totalCa > 0 ? const Color(0xFFF0FDF4) : const Color(0xFFF9FAFB)),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : (isToday ? AppColors.accent : const Color(0xFFE5E7EB)),
                    width: isToday && !isSelected ? 1.5 : 1,
                  ),
                ),
                padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '$dayNum',
                      style: AppTypography.zaloFont(
                        fontSize: 12,
                        fontWeight: isSelected || isToday ? FontWeight.w700 : FontWeight.w600,
                        color: isSelected ? Colors.white : AppColors.textHeading,
                      ),
                    ),
                    if (totalCa > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: isSelected ? Colors.white.withValues(alpha: 0.22) : AppColors.mintBackground,
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          '${dayBookings.isNotEmpty ? dayBookings.length : dayShifts.length}ca',
                          style: AppTypography.zaloFont(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w700,
                            color: isSelected ? Colors.white : AppColors.accent,
                          ),
                        ),
                      )
                    else
                      const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (hasMorning)
                          _buildShiftDot(isSelected ? Colors.white : const Color(0xFFD97706)),
                        if (hasAfternoon)
                          _buildShiftDot(isSelected ? Colors.white : AppColors.secondary),
                        if (hasEvening)
                          _buildShiftDot(isSelected ? Colors.white : const Color(0xFF7C3AED)),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildShiftDot(Color color) {
    return Container(
      width: 5,
      height: 5,
      margin: const EdgeInsets.symmetric(horizontal: 1),
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }

  Widget _buildSelectedDaySchedulePanel({
    required List<AdminBookingModel> selectedBookings,
    required List<AdminTechnicianShiftModel> selectedShifts,
  }) {
    final dateLabel = DateFormat('dd/MM/yyyy').format(_selectedDate);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                'Lịch ca ngày $dateLabel (${selectedBookings.length} ca hẹn)',
                style: AppTypography.zaloFont(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
            ),
            TextButton.icon(
              onPressed: () {
                setState(() {
                  _isMonthlyView = false;
                  _isAllDates = false;
                });
                _fetchBookings();
              },
              icon: const Icon(Icons.open_in_new_rounded, size: 14),
              label: Text(
                'Mở theo ngày',
                style: AppTypography.zaloFont(fontSize: 11.5, fontWeight: FontWeight.w600),
              ),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              ),
            ),
          ],
        ),
        if (selectedShifts.isNotEmpty) ...[
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6EE),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'KTV trực ca (${selectedShifts.length})',
                  style: AppTypography.zaloFont(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.accent,
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: selectedShifts.map((s) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFD1FAE5)),
                      ),
                      child: Text(
                        '${s.technicianName} · ${s.shiftLabel} (${s.startTime}-${s.endTime})',
                        style: AppTypography.zaloFont(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textHeading,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 8),
        if (selectedBookings.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Center(
              child: Text(
                'Không có ca hẹn nào trong ngày $dateLabel',
                style: AppTypography.zaloFont(
                  fontSize: 12.5,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          )
        else
          ...selectedBookings.map((b) {
            return AdminAppointmentCard(
              booking: b,
              isProcessing: _processingBookingId == b.id,
              isCompact: _isCompactView,
              onApprove: () => _handleApprove(b),
              onCancel: () => _handleCancel(b),
              onCheckIn: () => _handleCheckIn(b),
              onStartService: () => _handleStartService(b),
              onFinishService: () => _handleFinishService(b),
              onCheckOut: () => _handleCheckOut(b),
              onViewDetail: () => _showAppointmentDetailSheet(b),
            );
          }),
      ],
    );
  }
}
