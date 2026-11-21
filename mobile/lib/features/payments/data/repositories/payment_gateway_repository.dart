import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/payment_gateway_models.dart';

class PaymentGatewayRepository {
  PaymentGatewayRepository._internal();
  static final PaymentGatewayRepository instance = PaymentGatewayRepository._internal();
  factory PaymentGatewayRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;

  @visibleForTesting
  Future<PaymentGatewayIntentModel> Function({
    required double amount,
    required String description,
    required String targetType,
    String? targetId,
    String? referenceCode,
    String? customerId,
    String? customerName,
    String? customerPhone,
  })? debugCreateIntentOverride;

  @visibleForTesting
  Future<PaymentGatewayStatusModel> Function(int orderCode)? debugCheckStatusOverride;

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
    return PaymentGatewayConfigModel.unconfigured();
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
    final override = debugCreateIntentOverride;
    if (override != null) {
      return override(
        amount: amount,
        description: description,
        targetType: targetType,
        targetId: targetId,
        referenceCode: referenceCode,
        customerId: customerId,
        customerName: customerName,
        customerPhone: customerPhone,
      );
    }

    final cleanDesc = description
        .trim()
        .replaceAll(RegExp(r'[^a-zA-Z0-9\s_-]'), '')
        .trim();
    final effectiveDesc = cleanDesc.isNotEmpty
        ? (cleanDesc.length > 25 ? cleanDesc.substring(0, 25) : cleanDesc)
        : 'MLD ${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';

    try {
      final res = await _apiClient.dio.post(
        ApiEndpoints.paymentGatewayIntent,
        data: {
          'amount': amount.round(),
          'description': effectiveDesc,
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
          if (intent.orderCode > 0 && intent.qrCode.isNotEmpty && intent.accountNumber.isNotEmpty) {
            return intent;
          }
          return intent.copyWith(
            gatewayConfigured: false,
            message: intent.message.isNotEmpty
                ? intent.message
                : 'Cổng thanh toán PayOS trên máy chủ chưa được cấu hình đầy đủ.',
          );
        }
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        try {
          final legacyRes = await _apiClient.dio.post(
            ApiEndpoints.paymentCreatePayosLink,
            data: {
              'amount': amount.round(),
              'description': effectiveDesc,
              if (targetType == 'BOOKING' && targetId != null) 'bookingId': targetId,
              if (targetType == 'BOOKING' && referenceCode != null) 'bookingCode': referenceCode,
              if (targetType == 'ENROLLMENT' && targetId != null) 'enrollmentId': targetId,
              if (targetType == 'INVOICE' && targetId != null) 'invoiceId': targetId,
              if (customerName != null && customerName.isNotEmpty) 'customerName': customerName,
              if (customerPhone != null && customerPhone.isNotEmpty) 'customerPhone': customerPhone,
            },
          );
          if ((legacyRes.statusCode == 200 || legacyRes.statusCode == 201) && legacyRes.data is Map) {
            final raw = legacyRes.data['data'] ?? legacyRes.data;
            if (raw is Map) {
              final map = Map<String, dynamic>.from(raw);
              final qr = map['qrCode']?.toString() ?? '';
              final accNo = map['accountNumber']?.toString() ?? '';
              final oCode = int.tryParse(map['orderCode']?.toString() ?? '0') ?? 0;
              final configured = map['gatewayConfigured'] == true ||
                  (qr.isNotEmpty && !qr.startsWith('http') && accNo.isNotEmpty);
              return PaymentGatewayIntentModel(
                orderCode: oCode,
                provider: 'PAYOS',
                gatewayConfigured: configured,
                targetType: targetType,
                targetId: targetId,
                referenceCode: referenceCode,
                amount: (map['amount'] as num?)?.toDouble() ?? amount,
                description: map['description']?.toString() ?? effectiveDesc,
                bankBin: map['bin']?.toString() ?? defaultBankBin,
                accountNumber: accNo,
                accountName: map['accountName']?.toString() ?? defaultBankAccountName,
                qrCode: configured ? qr : '',
                checkoutUrl: map['checkoutUrl']?.toString() ?? '',
                status: 'PENDING',
                isPaid: false,
                message: configured
                    ? 'Quét mã VietQR bằng ứng dụng ngân hàng để thanh toán.'
                    : 'Máy chủ cổng thanh toán PayOS chưa được kích hoạt.',
              );
            }
          }
        } catch (legacyErr) {
          debugPrint('[PaymentGatewayRepository] legacy createPaymentIntent error: $legacyErr');
        }
      } else {
        debugPrint('[PaymentGatewayRepository] createPaymentIntent error: $e');
      }
    } catch (e) {
      debugPrint('[PaymentGatewayRepository] createPaymentIntent error: $e');
    }

    return PaymentGatewayIntentModel(
      orderCode: 0,
      provider: 'PAYOS',
      gatewayConfigured: false,
      targetType: targetType,
      targetId: targetId,
      referenceCode: referenceCode,
      amount: amount,
      description: effectiveDesc,
      bankBin: defaultBankBin,
      accountNumber: '',
      accountName: '',
      qrCode: '',
      status: 'UNAVAILABLE',
      isPaid: false,
      message: 'Không thể kết nối máy chủ thanh toán PayOS. Vui lòng thử lại sau.',
    );
  }

  Future<PaymentGatewayStatusModel> checkPaymentStatus(int orderCode) async {
    final override = debugCheckStatusOverride;
    if (override != null) {
      return override(orderCode);
    }

    if (orderCode <= 0) {
      return const PaymentGatewayStatusModel(
        orderCode: 0,
        provider: 'PAYOS',
        configured: false,
        isPaid: false,
        status: 'PENDING',
        message: 'Vui lòng thanh toán. Mã giao dịch không hợp lệ.',
      );
    }

    try {
      final res = await _apiClient.dio.get(ApiEndpoints.paymentGatewayStatus(orderCode));
      if (res.statusCode == 200 && res.data is Map) {
        final raw = res.data['data'] ?? res.data;
        if (raw is Map) {
          final parsed = PaymentGatewayStatusModel.fromJson(Map<String, dynamic>.from(raw));
          if (!parsed.isPaid && parsed.message.isEmpty) {
            return PaymentGatewayStatusModel(
              orderCode: parsed.orderCode,
              provider: parsed.provider,
              configured: parsed.configured,
              isPaid: false,
              status: parsed.status,
              amountPaid: parsed.amountPaid,
              amountRemaining: parsed.amountRemaining,
              paidAt: parsed.paidAt,
              message: 'Vui lòng thanh toán. Hệ thống chưa nhận được tiền về tài khoản trung tâm.',
            );
          }
          return parsed;
        }
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        try {
          final legacyRes = await _apiClient.dio.get(ApiEndpoints.paymentPayosStatus(orderCode));
          if (legacyRes.statusCode == 200 && legacyRes.data is Map) {
            final raw = legacyRes.data['data'] ?? legacyRes.data;
            if (raw is Map) {
              final map = Map<String, dynamic>.from(raw);
              final isPaid = map['isPaid'] == true || map['status']?.toString().toUpperCase() == 'PAID';
              return PaymentGatewayStatusModel(
                orderCode: orderCode,
                provider: 'PAYOS',
                configured: true,
                isPaid: isPaid,
                status: isPaid ? 'PAID' : (map['status']?.toString() ?? 'PENDING'),
                amountPaid: (map['amountPaid'] as num?)?.toDouble() ?? 0.0,
                amountRemaining: (map['amountRemaining'] as num?)?.toDouble() ?? 0.0,
                message: isPaid
                    ? (map['message']?.toString() ?? 'Thanh toán thành công!')
                    : 'Vui lòng thanh toán. Hệ thống chưa nhận được tiền về tài khoản trung tâm.',
              );
            }
          }
        } catch (_) {}
      }
      debugPrint('[PaymentGatewayRepository] checkPaymentStatus error: $e');
    } catch (e) {
      debugPrint('[PaymentGatewayRepository] checkPaymentStatus error: $e');
    }

    return PaymentGatewayStatusModel(
      orderCode: orderCode,
      provider: 'PAYOS',
      configured: false,
      isPaid: false,
      status: 'PENDING',
      message: 'Vui lòng thanh toán. Hệ thống chưa nhận được tiền về tài khoản trung tâm.',
    );
  }
}
