import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/payment_gateway_models.dart';
import '../../data/repositories/payment_gateway_repository.dart';

class AutoPaymentCheckoutSheet extends StatefulWidget {
  final double amount;
  final String description;
  final String targetType;
  final String? targetId;
  final String? referenceCode;
  final String? customerName;
  final String? customerPhone;
  final PaymentGatewayIntentModel? initialIntent;
  final ValueChanged<PaymentGatewayStatusModel>? onPaymentSuccess;

  const AutoPaymentCheckoutSheet({
    super.key,
    required this.amount,
    required this.description,
    this.targetType = 'BOOKING',
    this.targetId,
    this.referenceCode,
    this.customerName,
    this.customerPhone,
    this.initialIntent,
    this.onPaymentSuccess,
  });

  static Future<void> show(
    BuildContext context, {
    required double amount,
    required String description,
    String targetType = 'BOOKING',
    String? targetId,
    String? referenceCode,
    String? customerName,
    String? customerPhone,
    PaymentGatewayIntentModel? initialIntent,
    ValueChanged<PaymentGatewayStatusModel>? onPaymentSuccess,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => AutoPaymentCheckoutSheet(
        amount: amount,
        description: description,
        targetType: targetType,
        targetId: targetId,
        referenceCode: referenceCode,
        customerName: customerName,
        customerPhone: customerPhone,
        initialIntent: initialIntent,
        onPaymentSuccess: onPaymentSuccess,
      ),
    );
  }

  @override
  State<AutoPaymentCheckoutSheet> createState() => _AutoPaymentCheckoutSheetState();
}

class _AutoPaymentCheckoutSheetState extends State<AutoPaymentCheckoutSheet> {
  final PaymentGatewayRepository _repository = PaymentGatewayRepository.instance;
  bool _isLoading = true;
  bool _isCheckingStatus = false;
  bool _isConfirmingManual = false;
  bool _isPaid = false;
  PaymentGatewayIntentModel? _intent;
  String _statusMessage = '';
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    if (widget.initialIntent != null) {
      _intent = widget.initialIntent;
      _isPaid = widget.initialIntent!.isPaid;
      _statusMessage = widget.initialIntent!.message;
      _isLoading = false;
      _startPollingIfReady();
    } else {
      _initPaymentIntent();
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _initPaymentIntent() async {
    setState(() => _isLoading = true);
    final intent = await _repository.createPaymentIntent(
      amount: widget.amount,
      description: widget.description,
      targetType: widget.targetType,
      targetId: widget.targetId,
      referenceCode: widget.referenceCode,
      customerName: widget.customerName,
      customerPhone: widget.customerPhone,
    );
    if (!mounted) return;
    setState(() {
      _intent = intent;
      _isPaid = intent.isPaid;
      _statusMessage = intent.message;
      _isLoading = false;
    });
    _startPollingIfReady();
  }

  void _startPollingIfReady() {
    _pollingTimer?.cancel();
    if (_intent == null || !_intent!.gatewayConfigured || _intent!.orderCode <= 0 || _isPaid) {
      return;
    }
    _pollingTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!_isCheckingStatus && !_isPaid && mounted) {
        _checkStatus(silent: true);
      }
    });
  }

  Future<void> _checkStatus({bool silent = false}) async {
    final intent = _intent;
    if (intent == null || intent.orderCode <= 0) return;

    if (!silent) {
      setState(() => _isCheckingStatus = true);
    }

    final result = await _repository.checkPaymentStatus(intent.orderCode);
    if (!mounted) return;

    setState(() {
      _isCheckingStatus = false;
      _statusMessage = result.message;
      if (result.isPaid) {
        _isPaid = true;
        _pollingTimer?.cancel();
      }
    });

    if (result.isPaid) {
      widget.onPaymentSuccess?.call(result);
    }
  }

  Future<void> _handleManualConfirm() async {
    final intent = _intent;
    if (intent == null || intent.orderCode <= 0) return;

    setState(() => _isConfirmingManual = true);
    final result = await _repository.confirmPaymentManually(
      intent.orderCode,
      targetType: widget.targetType,
      targetId: widget.targetId,
    );
    if (!mounted) return;

    setState(() {
      _isConfirmingManual = false;
      _statusMessage = result.message;
      if (result.isPaid) {
        _isPaid = true;
        _pollingTimer?.cancel();
      }
    });

    if (result.isPaid) {
      widget.onPaymentSuccess?.call(result);
    }
  }

  Future<void> _openCheckoutUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _copyValue(String value, String label) {
    Clipboard.setData(ClipboardData(text: value));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Đã sao chép $label'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  String _formatMoney(double value) {
    return '${NumberFormat('#,###', 'vi_VN').format(value.round())}đ';
  }

  @override
  Widget build(BuildContext context) {
    final intent = _intent;

    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          14,
          20,
          MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5E7EB),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  const Icon(Icons.qr_code_2_rounded, color: AppColors.primary, size: 22),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      context.tr('Thanh toán tự động trực tuyến', 'Automatic Online Payment'),
                      style: AppTypography.zaloFont(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHeading,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                )
              else if (_isPaid)
                _buildPaidSuccessCard(context)
              else if (intent != null) ...[
                _buildAmountHeader(context, intent),
                const SizedBox(height: 12),
                if (intent.qrCode.isNotEmpty) ...[
                  _buildQrPreview(context, intent),
                  const SizedBox(height: 12),
                ] else
                  _buildWaitingConfigBanner(context, intent),
                if (intent.accountNumber.isNotEmpty) ...[
                  _buildBankInfoBox(context, intent),
                  const SizedBox(height: 12),
                ],
                if (_statusMessage.isNotEmpty) ...[
                  Text(
                    _statusMessage,
                    textAlign: TextAlign.center,
                    style: AppTypography.zaloFont(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                if (intent.checkoutUrl.isNotEmpty) ...[
                  SizedBox(
                    height: 46,
                    child: OutlinedButton.icon(
                      onPressed: () => _openCheckoutUrl(intent.checkoutUrl),
                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                      label: Text(
                        context.tr('Mở cổng thanh toán', 'Open Payment Gateway'),
                        style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
                SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: _isCheckingStatus ? null : () => _checkStatus(silent: false),
                    icon: _isCheckingStatus
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.sync_rounded, size: 19),
                    label: Text(
                      context.tr('Kiểm tra trạng thái thanh toán', 'Check Payment Status'),
                      style: AppTypography.zaloFont(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: _isConfirmingManual ? null : _handleManualConfirm,
                    icon: _isConfirmingManual
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                          )
                        : const Icon(Icons.check_circle_outline_rounded, size: 19, color: AppColors.primary),
                    label: Text(
                      context.tr('Xác nhận đã chuyển khoản', 'Confirm Transfer Completed'),
                      style: AppTypography.zaloFont(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary, width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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

  Widget _buildAmountHeader(BuildContext context, PaymentGatewayIntentModel intent) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.iceBlue,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (widget.targetType == 'ENROLLMENT') ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFF86EFAC)),
                  ),
                  child: Text(
                    context.tr('Đã đăng ký', 'Registered'),
                    style: AppTypography.zaloFont(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF15803D),
                    ),
                  ),
                ),
              ],
              Text(
                intent.referenceCode ?? 'Đơn #${intent.orderCode}',
                style: AppTypography.zaloFont(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                _formatMoney(intent.amount),
                style: AppTypography.zaloFont(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textHeading,
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              intent.gatewayConfigured ? intent.provider : 'Chờ cấu hình cổng',
              style: AppTypography.zaloFont(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: intent.gatewayConfigured ? AppColors.accent : const Color(0xFFB45309),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQrPreview(BuildContext context, PaymentGatewayIntentModel intent) {
    final isUrl = intent.qrCode.startsWith('http://') || intent.qrCode.startsWith('https://');
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          if (isUrl)
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.network(
                intent.qrCode,
                width: 196,
                height: 196,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => QrImageView(
                  data: intent.qrCode,
                  size: 196,
                ),
              ),
            )
          else
            QrImageView(
              data: intent.qrCode,
              size: 196,
            ),
          const SizedBox(height: 8),
          Text(
            context.tr('Quét mã QR bằng ứng dụng ngân hàng để tự động xác nhận', 'Scan QR with your banking app for auto confirmation'),
            textAlign: TextAlign.center,
            style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildWaitingConfigBanner(BuildContext context, PaymentGatewayIntentModel intent) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.45)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.settings_ethernet_rounded, color: Color(0xFFB45309), size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  context.tr(
                    'Cổng thanh toán trung gian đang chờ cấu hình',
                    'Payment Gateway awaiting credentials',
                  ),
                  style: AppTypography.zaloFont(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF92400E),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Mã giao dịch: #${intent.orderCode}. Sau khi điền khóa đối tác thanh toán trung gian ở máy chủ Backend, hệ thống sẽ tự động sinh mã QR & đối soát tức thì.',
            style: AppTypography.zaloFont(
              fontSize: 12,
              color: const Color(0xFF78350F),
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBankInfoBox(BuildContext context, PaymentGatewayIntentModel intent) {
    final bankTitle = intent.bankBin == '970422' || intent.bankBin.isEmpty
        ? 'MB Bank (Ngân hàng Quân Đội)'
        : 'Ngân hàng (${intent.bankBin})';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.mintBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBBF7D0)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Ngân hàng: $bankTitle',
                  style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.primary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'STK: ${intent.accountNumber} (${intent.accountName})',
                  style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600),
                ),
              ),
              IconButton(
                onPressed: () => _copyValue(intent.accountNumber, 'Số tài khoản'),
                icon: const Icon(Icons.copy_rounded, size: 16, color: AppColors.primary),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Nội dung: ${intent.description}',
                  style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600),
                ),
              ),
              IconButton(
                onPressed: () => _copyValue(intent.description, 'Nội dung chuyển khoản'),
                icon: const Icon(Icons.copy_rounded, size: 16, color: AppColors.primary),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPaidSuccessCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.mintBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          const Icon(Icons.check_circle_rounded, color: AppColors.accent, size: 52),
          const SizedBox(height: 10),
          Text(
            context.tr('Thanh toán thành công!', 'Payment Successful!'),
            style: AppTypography.zaloFont(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AppColors.accent,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _statusMessage.isNotEmpty
                ? _statusMessage
                : 'Hệ thống đã tự động xác nhận giao dịch của bạn.',
            textAlign: TextAlign.center,
            style: AppTypography.zaloFont(fontSize: 12.5, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(context.tr('Hoàn tất', 'Done')),
            ),
          ),
        ],
      ),
    );
  }
}
