class PaymentGatewayConfigModel {
  final String provider;
  final bool configured;
  final List<String> supportedModes;
  final String bankBin;
  final String bankAccountNo;
  final String bankAccountName;
  final String returnUrl;
  final String cancelUrl;

  const PaymentGatewayConfigModel({
    required this.provider,
    required this.configured,
    this.supportedModes = const [],
    this.bankBin = '',
    this.bankAccountNo = '',
    this.bankAccountName = '',
    this.returnUrl = '',
    this.cancelUrl = '',
  });

  factory PaymentGatewayConfigModel.unconfigured() => const PaymentGatewayConfigModel(
        provider: 'UNCONFIGURED',
        configured: false,
        supportedModes: ['UNCONFIGURED'],
      );

  factory PaymentGatewayConfigModel.fromJson(Map<String, dynamic> json) {
    final modesRaw = json['supportedModes'];
    final modes = modesRaw is List
        ? modesRaw.map((e) => e.toString()).toList()
        : const <String>[];

    return PaymentGatewayConfigModel(
      provider: json['provider']?.toString() ?? 'UNCONFIGURED',
      configured: json['configured'] == true,
      supportedModes: modes,
      bankBin: json['bankBin']?.toString() ?? '',
      bankAccountNo: json['bankAccountNo']?.toString() ?? '',
      bankAccountName: json['bankAccountName']?.toString() ?? '',
      returnUrl: json['returnUrl']?.toString() ?? '',
      cancelUrl: json['cancelUrl']?.toString() ?? '',
    );
  }
}

class PaymentGatewayIntentModel {
  final int orderCode;
  final String provider;
  final bool gatewayConfigured;
  final String targetType;
  final String? targetId;
  final String? referenceCode;
  final double amount;
  final String description;
  final String bankBin;
  final String accountNumber;
  final String accountName;
  final String qrCode;
  final String checkoutUrl;
  final String status;
  final bool isPaid;
  final String message;

  const PaymentGatewayIntentModel({
    required this.orderCode,
    required this.provider,
    required this.gatewayConfigured,
    this.targetType = 'BOOKING',
    this.targetId,
    this.referenceCode,
    required this.amount,
    required this.description,
    this.bankBin = '',
    this.accountNumber = '',
    this.accountName = '',
    this.qrCode = '',
    this.checkoutUrl = '',
    this.status = 'PENDING',
    this.isPaid = false,
    this.message = '',
  });

  factory PaymentGatewayIntentModel.fromJson(Map<String, dynamic> json) {
    return PaymentGatewayIntentModel(
      orderCode: int.tryParse(json['orderCode']?.toString() ?? '0') ?? 0,
      provider: json['provider']?.toString() ?? 'UNCONFIGURED',
      gatewayConfigured: json['gatewayConfigured'] == true,
      targetType: json['targetType']?.toString() ?? 'BOOKING',
      targetId: json['targetId']?.toString(),
      referenceCode: json['referenceCode']?.toString(),
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      description: json['description']?.toString() ?? '',
      bankBin: json['bankBin']?.toString() ?? '',
      accountNumber: json['accountNumber']?.toString() ?? '',
      accountName: json['accountName']?.toString() ?? '',
      qrCode: json['qrCode']?.toString() ?? '',
      checkoutUrl: json['checkoutUrl']?.toString() ?? '',
      status: (json['status']?.toString() ?? 'PENDING').toUpperCase(),
      isPaid: json['isPaid'] == true,
      message: json['message']?.toString() ?? '',
    );
  }

  PaymentGatewayIntentModel copyWith({
    int? orderCode,
    String? provider,
    bool? gatewayConfigured,
    String? targetType,
    String? targetId,
    String? referenceCode,
    double? amount,
    String? description,
    String? bankBin,
    String? accountNumber,
    String? accountName,
    String? qrCode,
    String? checkoutUrl,
    String? status,
    bool? isPaid,
    String? message,
  }) {
    return PaymentGatewayIntentModel(
      orderCode: orderCode ?? this.orderCode,
      provider: provider ?? this.provider,
      gatewayConfigured: gatewayConfigured ?? this.gatewayConfigured,
      targetType: targetType ?? this.targetType,
      targetId: targetId ?? this.targetId,
      referenceCode: referenceCode ?? this.referenceCode,
      amount: amount ?? this.amount,
      description: description ?? this.description,
      bankBin: bankBin ?? this.bankBin,
      accountNumber: accountNumber ?? this.accountNumber,
      accountName: accountName ?? this.accountName,
      qrCode: qrCode ?? this.qrCode,
      checkoutUrl: checkoutUrl ?? this.checkoutUrl,
      status: status ?? this.status,
      isPaid: isPaid ?? this.isPaid,
      message: message ?? this.message,
    );
  }
}

class PaymentGatewayStatusModel {
  final int orderCode;
  final String provider;
  final bool configured;
  final bool isPaid;
  final String status;
  final double amountPaid;
  final double amountRemaining;
  final String? paidAt;
  final String message;

  const PaymentGatewayStatusModel({
    required this.orderCode,
    required this.provider,
    required this.configured,
    required this.isPaid,
    required this.status,
    this.amountPaid = 0.0,
    this.amountRemaining = 0.0,
    this.paidAt,
    this.message = '',
  });

  factory PaymentGatewayStatusModel.fromJson(Map<String, dynamic> json) {
    final rawStatus = (json['status']?.toString() ?? 'PENDING').toUpperCase();
    return PaymentGatewayStatusModel(
      orderCode: int.tryParse(json['orderCode']?.toString() ?? '0') ?? 0,
      provider: json['provider']?.toString() ?? 'UNCONFIGURED',
      configured: json['configured'] == true,
      isPaid: json['isPaid'] == true || rawStatus == 'PAID',
      status: rawStatus,
      amountPaid: (json['amountPaid'] as num?)?.toDouble() ?? 0.0,
      amountRemaining: (json['amountRemaining'] as num?)?.toDouble() ?? 0.0,
      paidAt: json['paidAt']?.toString(),
      message: json['message']?.toString() ?? '',
    );
  }
}
