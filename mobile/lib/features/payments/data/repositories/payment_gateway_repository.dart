import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/payment_gateway_models.dart';

class PaymentGatewayRepository {
  PaymentGatewayRepository._internal();
  static final PaymentGatewayRepository instance = PaymentGatewayRepository._internal();
  factory PaymentGatewayRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;

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
          return PaymentGatewayIntentModel.fromJson(Map<String, dynamic>.from(raw));
        }
      }
    } catch (e) {
      debugPrint('[PaymentGatewayRepository] createPaymentIntent error: $e');
    }

    return PaymentGatewayIntentModel(
      orderCode: int.tryParse(DateTime.now().millisecondsSinceEpoch.toString().substring(7)) ?? 100001,
      provider: 'UNCONFIGURED',
      gatewayConfigured: false,
      targetType: targetType,
      targetId: targetId,
      referenceCode: referenceCode,
      amount: amount,
      description: description,
      status: 'PENDING',
      isPaid: false,
      message: 'Cổng thanh toán trung gian đang chờ cấu hình khóa kết nối.',
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

    return PaymentGatewayStatusModel(
      orderCode: orderCode,
      provider: 'UNCONFIGURED',
      configured: false,
      isPaid: false,
      status: 'PENDING',
      message: 'Chưa ghi nhận giao dịch thành công.',
    );
  }
}
