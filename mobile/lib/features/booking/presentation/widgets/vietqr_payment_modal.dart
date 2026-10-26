import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../data/models/booking_models.dart';
import '../screens/c09_my_appointments_screen.dart';
import 'group_c_widgets.dart';

/// Modal quét mã VietQR và kiểm tra tự động / thủ công qua Cổng PayOS - MBBank
/// Tuân thủ quy tắc nghiêm ngặt: "CHƯA NHẬN TIỀN CHƯA HOÀN TẤT"
class VietQrPaymentModal extends StatefulWidget {
  final BookingFlowState flowState;
  final double payableAmount;
  final String bookingCode;
  final bool isDeposit;

  const VietQrPaymentModal({
    super.key,
    required this.flowState,
    required this.payableAmount,
    required this.bookingCode,
    this.isDeposit = true,
  });

  static Future<void> show({
    required BuildContext context,
    required BookingFlowState flowState,
    required double payableAmount,
    required String bookingCode,
    bool isDeposit = true,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
      builder: (ctx) => VietQrPaymentModal(
        flowState: flowState,
        payableAmount: payableAmount,
        bookingCode: bookingCode,
        isDeposit: isDeposit,
      ),
    );
  }

  @override
  State<VietQrPaymentModal> createState() => _VietQrPaymentModalState();
}

class _VietQrPaymentModalState extends State<VietQrPaymentModal> {
  static const int totalSeconds = 300; // 5 phút
  static const int autoCheckSeconds = 120; // 2 phút tự động kiểm tra

  // Cấu hình tài khoản MBBank MLD Việt Nam chính thức
  static const String bankName = 'MB Bank (Ngân hàng Quân Đội)';
  static const String bankBin = '970422';
  static const String accountNo = '0394316963';
  static const String accountName = 'BUI THE HOANG';

  late int _currentOrderCode;
  String? _payosQrString;
  String? _payosAccountNumber;
  late int _remainingSeconds;
  Timer? _countdownTimer;
  Timer? _autoPollingTimer;

  bool _isAutoChecking = true;
  bool _isManualChecking = false;
  bool _isSuccess = false;
  bool _isExpired = false;

  @override
  void initState() {
    super.initState();
    _initOrderCode();
    _startSession();
  }

  void _initOrderCode() {
    // Tự sinh mã số nguyên duy nhất cho PayOS
    final digitsOnly = widget.bookingCode.replaceAll(RegExp(r'[^0-9]'), '');
    final parsed = int.tryParse(digitsOnly);
    if (parsed != null && parsed > 1000) {
      _currentOrderCode = parsed;
    } else {
      _currentOrderCode = 100000 + Random().nextInt(899999);
    }
  }

  void _startSession() {
    _remainingSeconds = totalSeconds;
    _isAutoChecking = true;
    _isManualChecking = false;
    _isSuccess = false;
    _isExpired = false;

    _countdownTimer?.cancel();
    _autoPollingTimer?.cancel();

    // 1. Tạo Link thanh toán VietQR trên Backend qua PayOS
    _createPayosLink();

    // 2. Đồng hồ đếm ngược
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() {
        if (_remainingSeconds > 0) {
          _remainingSeconds--;

          if (_remainingSeconds <= totalSeconds - autoCheckSeconds) {
            _isAutoChecking = false;
            _autoPollingTimer?.cancel();
          }
        } else {
          _isExpired = true;
          _isAutoChecking = false;
          _countdownTimer?.cancel();
          _autoPollingTimer?.cancel();
        }
      });
    });

    // 3. Tự động kiểm tra với ngân hàng mỗi 3 giây trong suốt 2 phút đầu
    _autoPollingTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (!mounted || _isExpired || _isSuccess || !_isAutoChecking) return;
      _checkPaymentStatus(isAuto: true);
    });
  }

  Future<void> _createPayosLink() async {
    try {
      final res = await ApiClient.instance.dio.post(
        ApiEndpoints.paymentCreatePayosLink,
        data: {
          'amount': widget.payableAmount,
          'description': 'MLD $_currentOrderCode',
          'orderCode': _currentOrderCode,
          'bookingCode': widget.bookingCode,
          'customerName': widget.flowState.customerName.trim().isNotEmpty
              ? widget.flowState.customerName
              : accountName,
          'customerPhone': widget.flowState.customerPhone,
        },
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = res.data['data'] ?? res.data;
        if (data != null && mounted) {
          setState(() {
            _payosQrString = data['qrCode']?.toString();
            if (data['accountNumber'] != null) {
              _payosAccountNumber = data['accountNumber'].toString();
            }
            if (data['orderCode'] != null) {
              _currentOrderCode = (data['orderCode'] as num).toInt();
            }
          });
        }
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _autoPollingTimer?.cancel();
    super.dispose();
  }

  /// KIỂM TRA TRẠNG THÁI VỚI NGÂN HÀNG (LIVE BANK CHECK)
  /// NGUYÊN TẮC: "CHƯA NHẬN TIỀN CHƯA HOÀN TẤT"
  Future<void> _checkPaymentStatus({bool isAuto = false}) async {
    if (_isSuccess || _isExpired) return;

    if (!isAuto) {
      setState(() {
        _isManualChecking = true;
      });
    }

    bool isReallyPaid = false;

    try {
      final res = await ApiClient.instance.dio.get(
        ApiEndpoints.paymentPayosStatus(_currentOrderCode),
      );

      if (res.statusCode == 200 && res.data != null) {
        final data = res.data['data'] ?? res.data;
        if (data['isPaid'] == true || data['status'] == 'PAID') {
          isReallyPaid = true;
        }
      }
    } catch (_) {}

    if (!mounted) return;

    if (isReallyPaid) {
      // ĐÃ NHẬN TIỀN THỰC TẾ VÀO TÀI KHOẢN MBBANK -> HOÀN TẤT ĐƠN HÀNG
      _handlePaymentSuccess();
    } else {
      // CHƯA NHẬN ĐƯỢC TIỀN
      if (!isAuto) {
        setState(() {
          _isManualChecking = false;
        });

        // Báo rõ ràng cho khách và TUYỆT ĐỐI KHÔNG CHUYỂN TRANG
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Chưa nhận được tiền: Hệ thống đã kiểm tra với ngân hàng nhưng chưa có giao dịch khớp mã [MLD $_currentOrderCode]. Quý khách vui lòng kiểm tra lại giao dịch trên App ngân hàng hoặc chờ trong giây lát.',
            ),
            backgroundColor: const Color(0xFFC0392B),
            duration: const Duration(seconds: 4),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _handlePaymentSuccess() {
    if (_isSuccess) return;

    _countdownTimer?.cancel();
    _autoPollingTimer?.cancel();

    setState(() {
      _isSuccess = true;
      _isManualChecking = false;
      _isAutoChecking = false;
    });

    // Hiển thị hiệu ứng thành công 1.2s trước khi chuyển trang
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (!mounted) return;
      widget.flowState.bookingCode = widget.bookingCode;
      Navigator.of(context).pop();

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (_) => const C09MyAppointmentsScreen(),
        ),
        (route) => route.isFirst,
      );
    });
  }

  String _formatPrice(double price) {
    return price.toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]}.',
        );
  }

  String _formatTimer(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Đã sao chép $label: $text'),
        duration: const Duration(seconds: 2),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String get _vietQrUrl {
    final effectiveAcc = _payosAccountNumber ?? accountNo;
    return 'https://img.vietqr.io/image/$bankBin-$effectiveAcc-compact2.png?amount=${widget.payableAmount.toInt()}&addInfo=MLD%20$_currentOrderCode&accountName=${Uri.encodeComponent(accountName)}';
  }

  @override
  Widget build(BuildContext context) {
    final effectiveAcc = _payosAccountNumber ?? accountNo;
    final transferContent = 'MLD $_currentOrderCode';

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        top: 12,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).padding.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Thanh kéo drag handle
            Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            const SizedBox(height: 14),

            // Hàng Tiêu đề & Nút đóng
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Thanh toán chuyển khoản VietQR',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: BookingColors.heading,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      widget.isDeposit ? 'Yêu cầu đặt cọc giữ lịch hẹn' : 'Thanh toán trọn gói dịch vụ',
                      style: const TextStyle(
                        fontSize: 13,
                        color: BookingColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                  splashRadius: 20,
                ),
              ],
            ),
            const Divider(height: 20, color: BookingColors.cardBorder),

            // Card Số tiền cần thanh toán
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
              decoration: BoxDecoration(
                color: BookingColors.cardWarm,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: BookingColors.cardBorder, width: 1.0),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Số tiền cần chuyển:',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: BookingColors.textPrimary,
                    ),
                  ),
                  Text(
                    '${_formatPrice(widget.payableAmount)}đ',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.servicePrice,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // --- KHUNG MÃ QR CỦA SPA ---
            Stack(
              alignment: Alignment.center,
              children: [
                // Khung QR chính
                AnimatedOpacity(
                  duration: const Duration(milliseconds: 300),
                  opacity: _isExpired ? 0.2 : 1.0,
                  child: Container(
                    width: 230,
                    height: 230,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: _isExpired ? Colors.red.shade300 : BookingColors.cardBorder,
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: (_payosQrString != null && _payosQrString!.isNotEmpty)
                          ? QrImageView(
                              data: _payosQrString!,
                              version: QrVersions.auto,
                              size: 190.0,
                              eyeStyle: const QrEyeStyle(
                                eyeShape: QrEyeShape.square,
                                color: AppColors.primary,
                              ),
                              dataModuleStyle: const QrDataModuleStyle(
                                dataModuleShape: QrDataModuleShape.square,
                                color: Color(0xFF1E293B),
                              ),
                            )
                          : Image.network(
                              _vietQrUrl,
                              fit: BoxFit.contain,
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return Center(
                                  child: CircularProgressIndicator(
                                    value: loadingProgress.expectedTotalBytes != null
                                        ? loadingProgress.cumulativeBytesLoaded /
                                            loadingProgress.expectedTotalBytes!
                                        : null,
                                    color: AppColors.primary,
                                  ),
                                );
                              },
                              errorBuilder: (_, __, ___) {
                                return Center(
                                  child: QrImageView(
                                    data: (_payosQrString != null && _payosQrString!.isNotEmpty)
                                        ? _payosQrString!
                                        : '00020101021238540010A000000727012400069704220110${effectiveAcc}0208QRIBFTTA53037045406${widget.payableAmount.toInt().toString().padLeft(6, '0')}5802VN62${transferContent.length.toString().padLeft(2, '0')}$transferContent',
                                    version: QrVersions.auto,
                                    size: 190.0,
                                    eyeStyle: const QrEyeStyle(
                                      eyeShape: QrEyeShape.square,
                                      color: AppColors.primary,
                                    ),
                                    dataModuleStyle: const QrDataModuleStyle(
                                      dataModuleShape: QrDataModuleShape.square,
                                      color: Color(0xFF1E293B),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ),
                ),

                // Lớp phủ khi thành công (Tick xanh)
                if (_isSuccess)
                  Container(
                    width: 230,
                    height: 230,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: const BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.check_rounded, color: Colors.white, size: 40),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'ĐÃ NHẬN TIỀN THÀNH CÔNG!',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Colors.green,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Đang chuyển sang trang xác nhận...',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),

                // Lớp phủ khi quá giờ (Hết hạn mã)
                if (_isExpired)
                  Container(
                    width: 230,
                    height: 230,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.92),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.timer_off_outlined, color: Colors.red.shade400, size: 48),
                        const SizedBox(height: 8),
                        Text(
                          'MÃ QR ĐÃ HẾT HẠN',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Colors.red.shade600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            'Quá thời gian chưa nhận được tiền. Vui lòng bấm tạo mã mới.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            // Đồng hồ đếm ngược
            if (!_isSuccess)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.access_time_rounded,
                    size: 16,
                    color: _isExpired ? Colors.red : BookingColors.textSecondary,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _isExpired ? 'Mã đã hết hạn' : 'Hiệu lực còn lại: ${_formatTimer(_remainingSeconds)}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: _isExpired ? Colors.red : BookingColors.heading,
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 14),

            // Banner Trạng thái
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
              decoration: BoxDecoration(
                color: _isSuccess
                    ? Colors.green.shade50
                    : (_isExpired ? Colors.red.shade50 : BookingColors.cardWarm),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _isSuccess
                      ? Colors.green.shade200
                      : (_isExpired ? Colors.red.shade200 : BookingColors.cardBorder),
                ),
              ),
              child: Row(
                children: [
                  if (_isAutoChecking && !_isSuccess && !_isExpired) ...[
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Đang tự động kiểm tra giao dịch (${_remainingSeconds - (totalSeconds - autoCheckSeconds)}s)...',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: BookingColors.heading,
                        ),
                      ),
                    ),
                  ] else if (!_isAutoChecking && !_isExpired && !_isSuccess) ...[
                    Icon(Icons.info_outline_rounded, size: 18, color: Colors.amber.shade800),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'Quý khách vui lòng bấm nút "Kiểm tra giao dịch" bên dưới sau khi chuyển khoản.',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF7A4E00),
                        ),
                      ),
                    ),
                  ] else if (_isExpired) ...[
                    Icon(Icons.error_outline_rounded, size: 18, color: Colors.red.shade700),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'Hết thời gian chờ. Mã QR đã bị hủy để đảm bảo an toàn.',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Colors.red,
                        ),
                      ),
                    ),
                  ] else if (_isSuccess) ...[
                    const Icon(Icons.check_circle_outline, size: 18, color: Colors.green),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'Đã nhận đúng tiền từ ngân hàng. Đang chuyển tiếp...',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.green,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // --- THÔNG TIN TÀI KHOẢN CHUYỂN KHOẢN ---
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: BookingColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Thông tin chuyển khoản:',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: BookingColors.heading,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Ngân hàng
                  _buildCopyRow(
                    label: 'Ngân hàng',
                    value: bankName,
                    canCopy: false,
                  ),
                  const Divider(height: 14, color: BookingColors.cardBorder),

                  // Số tài khoản
                  _buildCopyRow(
                    label: 'Số tài khoản',
                    value: effectiveAcc,
                    canCopy: true,
                    onCopy: () => _copyToClipboard(effectiveAcc, 'Số tài khoản'),
                  ),
                  const Divider(height: 14, color: BookingColors.cardBorder),

                  // Chủ tài khoản
                  _buildCopyRow(
                    label: 'Chủ tài khoản',
                    value: accountName,
                    canCopy: false,
                  ),
                  const Divider(height: 14, color: BookingColors.cardBorder),

                  // Nội dung chuyển khoản
                  _buildCopyRow(
                    label: 'Nội dung CK',
                    value: transferContent,
                    canCopy: true,
                    highlight: true,
                    onCopy: () => _copyToClipboard(transferContent, 'Nội dung chuyển khoản'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // --- NÚT KIỂM TRA BÊN DƯỚI MÃ (Theo yêu cầu) ---
            if (!_isExpired)
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: (_isManualChecking || _isSuccess)
                      ? null
                      : () => _checkPaymentStatus(isAuto: false),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.6),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  child: _isManualChecking
                      ? const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.2,
                                color: Colors.white,
                              ),
                            ),
                            SizedBox(width: 12),
                            Text(
                              'Đang kiểm tra với Ngân hàng MB...',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search_rounded, color: Colors.white, size: 20),
                            SizedBox(width: 8),
                            Text(
                              'Kiểm tra giao dịch / Tôi đã chuyển khoản',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                ),
              )
            else
              // Khi quá giờ: nút tạo lại mã mới
              Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        setState(() {
                          _initOrderCode();
                          _startSession();
                        });
                      },
                      icon: const Icon(Icons.refresh_rounded, color: Colors.white),
                      label: const Text(
                        'Tạo lại mã thanh toán mới',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.border),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Đóng và quay lại',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
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

  Widget _buildCopyRow({
    required String label,
    required String value,
    required bool canCopy,
    bool highlight = false,
    VoidCallback? onCopy,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            color: BookingColors.textSecondary,
          ),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: highlight ? AppColors.primary : BookingColors.heading,
              ),
            ),
            if (canCopy) ...[
              const SizedBox(width: 8),
              InkWell(
                onTap: onCopy,
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: BookingColors.cardWarm,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: BookingColors.cardBorder),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.copy_rounded, size: 12, color: AppColors.primary),
                      SizedBox(width: 4),
                      Text(
                        'Sao chép',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}
