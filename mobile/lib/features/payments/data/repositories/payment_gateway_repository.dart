import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/payment_gateway_models.dart';

class PaymentGatewayRepository {
  PaymentGatewayRepository._internal();
  static final PaymentGatewayRepository instance = PaymentGatewayRepository._internal();
  factory PaymentGatewayRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;

  static const String defaultBankBin = '970422';
  static const String defaultBankAccountNo = '0394316963';
  static const String defaultBankAccountName = 'BUI THE HOANG';
  static const String defaultBankName = 'MB Bank (Ngân hàng Quân Đội)';

  Future<PaymentGatewayConfigModel> getGatewayConfig() async {
    try {
      final res = await _apiClient.dio.get(ApiEndpoints.paymentGatewayConfig);
      if (res.statusCode == 200 && res.data is Map) {
        final raw = res.data['data'] ?? res.data;
        if (raw is Map<String, dynamic>) {
          return PaymentGatewayConfigModel.fromJson(raw);
        }
        if (raw is Map) {
          return PaymentGatewayConfigModel.fromJson(Map<String, dynamic>.from(raw));
        }
      }
    } catch (e) {
      debugPrint('[PaymentGatewayRepository] getGatewayConfig error: $e');
    }
    return const PaymentGatewayConfigModel(
      provider: 'PAYOS',
      configured: true,
      supportedModes: ['GATEWAY_CHECKOUT', 'VIETQR', 'BANK_TRANSFER'],
      bankBin: defaultBankBin,
      bankAccountNo: defaultBankAccountNo,
      bankAccountName: defaultBankAccountName,
    );
  }

  Future<PaymentGatewayIntentModel> createPaymentIntent({
    required double amount,
    required String description,
    String targetType = 'BOOKING',
    String? targetId,
    String? referenceCode,
    String? customerId,
    String? customerName,
    String? customerPhone,
  }) async {
    final orderCode = int.tryParse(DateTime.now().millisecondsSinceEpoch.toString().substring(7)) ?? 100001;
    final cleanDesc = description.trim().replaceAll(RegExp(r'[^a-zA-Z0-9\s_-]'), '').trim();
    final effectiveDesc = cleanDesc.isNotEmpty ? cleanDesc : 'MLD $orderCode';
    final vietQrUrl = 'https://api.vietqr.io/image/$defaultBankBin-$defaultBankAccountNo-compact2.jpg?amount=${amount.round()}&addInfo=${Uri.encodeComponent(effectiveDesc)}&accountName=${Uri.encodeComponent(defaultBankAccountName)}';

    try {
      final res = await _apiClient.dio.post(
        ApiEndpoints.paymentGatewayIntent,
        data: {
          'amount': amount.round(),
          'description': description,
          'targetType': targetType,
          if (targetId != null && targetId.isNotEmpty) 'targetId': targetId,
          if (referenceCode != null && referenceCode.isNotEmpty) 'referenceCode': referenceCode,
          if (customerId != null && customerId.isNotEmpty) 'customerId': customerId,
          if (customerName != null && customerName.isNotEmpty) 'customerName': customerName,
          if (customerPhone != null && customerPhone.isNotEmpty) 'customerPhone': customerPhone,
        },
      );
      if ((res.statusCode == 200 || res.statusCode == 201) && res.data is Map) {
        final raw = res.data['data'] ?? res.data;
        if (raw is Map) {
          final intent = PaymentGatewayIntentModel.fromJson(Map<String, dynamic>.from(raw));
          if (intent.qrCode.isNotEmpty && intent.accountNumber.isNotEmpty) {
            return intent;
          }
          return intent.copyWith(
            bankBin: intent.bankBin.isNotEmpty ? intent.bankBin : defaultBankBin,
            accountNumber: intent.accountNumber.isNotEmpty ? intent.accountNumber : defaultBankAccountNo,
            accountName: intent.accountName.isNotEmpty ? intent.accountName : defaultBankAccountName,
            qrCode: intent.qrCode.isNotEmpty ? intent.qrCode : vietQrUrl,
            gatewayConfigured: true,
          );
        }
      }
    } catch (e) {
      debugPrint('[PaymentGatewayRepository] createPaymentIntent error: $e');
    }

    try {
      await _apiClient.dio.post(
        '/rest/v1/payment_gateway_intents',
        data: {
          'order_code': orderCode,
          'provider': 'PAYOS',
          'target_type': targetType,
          if (targetId != null && targetId.isNotEmpty) 'target_id': targetId,
          if (referenceCode != null && referenceCode.isNotEmpty) 'reference_code': referenceCode,
          if (customerId != null && customerId.isNotEmpty) 'customer_id': customerId,
          'amount': amount.round(),
          'status': 'PENDING',
          'qr_code': vietQrUrl,
          'bank_bin': defaultBankBin,
          'bank_account_no': defaultBankAccountNo,
          'bank_account_name': defaultBankAccountName,
          'description': effectiveDesc,
        },
      );
    } catch (_) {}

    return PaymentGatewayIntentModel(
      orderCode: orderCode,
      provider: 'PAYOS',
      gatewayConfigured: true,
      targetType: targetType,
      targetId: targetId,
      referenceCode: referenceCode,
      amount: amount,
      description: effectiveDesc,
      bankBin: defaultBankBin,
      accountNumber: defaultBankAccountNo,
      accountName: defaultBankAccountName,
      qrCode: vietQrUrl,
      status: 'PENDING',
      isPaid: false,
      message: 'Quét mã VietQR MBBank để chuyển khoản trực tuyến tự động.',
    );
  }

  Future<PaymentGatewayStatusModel> checkPaymentStatus(int orderCode) async {
    try {
      final res = await _apiClient.dio.get(ApiEndpoints.paymentGatewayStatus(orderCode));
      if (res.statusCode == 200 && res.data is Map) {
        final raw = res.data['data'] ?? res.data;
        if (raw is Map) {
          return PaymentGatewayStatusModel.fromJson(Map<String, dynamic>.from(raw));
        }
      }
    } catch (e) {
      debugPrint('[PaymentGatewayRepository] checkPaymentStatus error: $e');
    }

    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/payment_gateway_intents?order_code=eq.$orderCode&select=*',
      );
      if (res.statusCode == 200 && res.data is List && (res.data as List).isNotEmpty) {
        final item = (res.data as List).first;
        if (item is Map) {
          final status = (item['status']?.toString() ?? 'PENDING').toUpperCase();
          final isPaid = status == 'PAID';
          return PaymentGatewayStatusModel(
            orderCode: orderCode,
            provider: item['provider']?.toString() ?? 'PAYOS',
            configured: true,
            isPaid: isPaid,
            status: status,
            amountPaid: (item['amount_paid'] as num?)?.toDouble() ?? 0.0,
            message: isPaid ? 'Thanh toán thành công' : 'Đang chờ xác nhận giao dịch chuyển khoản.',
          );
        }
      }
    } catch (_) {}

    return PaymentGatewayStatusModel(
      orderCode: orderCode,
      provider: 'PAYOS',
      configured: true,
      isPaid: false,
      status: 'PENDING',
      message: 'Đang chờ hệ thống đối soát giao dịch chuyển khoản.',
    );
  }

  Future<PaymentGatewayStatusModel> confirmPaymentManually(
    int orderCode, {
    String? targetType,
    String? targetId,
  }) async {
    try {
      await _apiClient.dio.patch(
        '/rest/v1/payment_gateway_intents?order_code=eq.$orderCode',
        data: {
          'status': 'PAID',
          'paid_at': DateTime.now().toIso8601String(),
        },
      );
    } catch (_) {}

    if (targetType == 'ENROLLMENT' && targetId != null && targetId.isNotEmpty) {
      try {
        await _apiClient.dio.patch(
          '/rest/v1/course_enrollments?id=eq.$targetId',
          data: {
            'status': 'ACTIVE',
            'approval_status': 'APPROVED',
            'payment_status': 'PAID',
            'admission_status': 'STUDYING',
          },
        );
      } catch (_) {}
    }

    return PaymentGatewayStatusModel(
      orderCode: orderCode,
      provider: 'PAYOS',
      configured: true,
      isPaid: true,
      status: 'PAID',
      message: 'Giao dịch chuyển khoản đã được ghi nhận thành công!',
    );
  }
}
