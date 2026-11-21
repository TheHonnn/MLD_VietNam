import 'dart:convert';
import 'package:intl/intl.dart';

/// Model Sản phẩm bổ trợ tại nhà chuẩn Y khoa MLD
/// Ánh xạ trực tiếp từ bảng `public.home_products` trên Database Supabase
class HomeProductModel {
  static const List<String> treatmentPackageGroups = [
    'Chăm sóc khu trú',
    'Chăm sóc mở rộng',
    'Chăm sóc toàn diện',
  ];

  static String resolvePackageGroup(String? rawGroup, String category) {
    final trimmed = rawGroup?.trim() ?? '';
    if (trimmed.isNotEmpty) {
      final lower = trimmed.toLowerCase();
      if (lower.contains('mở rộng')) return 'Chăm sóc mở rộng';
      if (lower.contains('toàn diện')) return 'Chăm sóc toàn diện';
      if (lower.contains('khu trú')) return 'Chăm sóc khu trú';
      return trimmed;
    }
    final catLower = category.toLowerCase();
    if (catLower.contains('băng ép') || catLower.contains('tất vớ') || catLower.contains('áp lực')) {
      return 'Chăm sóc mở rộng';
    }
    if (catLower.contains('dụng cụ') || catLower.contains('tài liệu')) {
      return 'Chăm sóc toàn diện';
    }
    return 'Chăm sóc khu trú';
  }

  final String id;
  final String name;
  final String category;
  final String treatmentPackageGroup;
  final double priceMin;
  final double priceMax;
  final String unit;
  final List<String> details;
  final int sortOrder;
  final String? imageUrl;
  final DateTime? createdAt;
  final bool isActive;

  const HomeProductModel({
    required this.id,
    required this.name,
    required this.category,
    this.treatmentPackageGroup = 'Chăm sóc khu trú',
    required this.priceMin,
    required this.priceMax,
    required this.unit,
    this.details = const [],
    this.sortOrder = 0,
    this.imageUrl,
    this.createdAt,
    this.isActive = true,
  });

  HomeProductModel copyWith({
    String? id,
    String? name,
    String? category,
    String? treatmentPackageGroup,
    double? priceMin,
    double? priceMax,
    String? unit,
    List<String>? details,
    int? sortOrder,
    String? imageUrl,
    DateTime? createdAt,
    bool? isActive,
  }) {
    return HomeProductModel(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      treatmentPackageGroup: treatmentPackageGroup ?? this.treatmentPackageGroup,
      priceMin: priceMin ?? this.priceMin,
      priceMax: priceMax ?? this.priceMax,
      unit: unit ?? this.unit,
      details: details ?? this.details,
      sortOrder: sortOrder ?? this.sortOrder,
      imageUrl: imageUrl ?? this.imageUrl,
      createdAt: createdAt ?? this.createdAt,
      isActive: isActive ?? this.isActive,
    );
  }

  /// Định dạng khoảng giá chuẩn VNĐ
  String get formattedPrice {
    final formatter = NumberFormat('#,###', 'vi_VN');
    if (priceMin <= 0 && priceMax <= 0) {
      return 'Liên hệ tư vấn';
    }
    if (priceMin == priceMax) {
      return '${formatter.format(priceMin)} ₫';
    }
    return '${formatter.format(priceMin)} - ${formatter.format(priceMax)} ₫';
  }

  factory HomeProductModel.fromJson(Map<String, dynamic> json) {
    List<String> detailsList = [];
    final rawDetails = json['details'];
    if (rawDetails is List) {
      detailsList = rawDetails.map((e) => e.toString()).toList();
    } else if (rawDetails is String && rawDetails.isNotEmpty) {
      if (rawDetails.trim().startsWith('[') && rawDetails.trim().endsWith(']')) {
        try {
          final decoded = jsonDecode(rawDetails);
          if (decoded is List) {
            detailsList = decoded.map((e) => e.toString()).toList();
          }
        } catch (_) {
          detailsList = [rawDetails];
        }
      } else {
        detailsList = [rawDetails];
      }
    }

    final rawActive = json['is_active'];
    final bool isActive = rawActive != null
        ? (rawActive == true || rawActive == 1 || rawActive.toString().toLowerCase() == 'true')
        : !detailsList.contains('STATUS:INACTIVE');

    final parsedCategory = json['category']?.toString() ?? 'Dụng cụ tập luyện';
    final packageGroup = resolvePackageGroup(
      json['treatment_package_group']?.toString() ?? json['treatmentPackageGroup']?.toString(),
      parsedCategory,
    );

    return HomeProductModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Sản phẩm MLD',
      category: parsedCategory,
      treatmentPackageGroup: packageGroup,
      priceMin: double.tryParse(json['price_min']?.toString() ?? '0') ?? 0.0,
      priceMax: double.tryParse(json['price_max']?.toString() ?? '0') ?? 0.0,
      unit: json['unit']?.toString() ?? 'chiếc',
      details: detailsList,
      sortOrder: int.tryParse(json['sort_order']?.toString() ?? '0') ?? 0,
      imageUrl: json['image_url']?.toString(),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
      isActive: isActive,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'treatment_package_group': treatmentPackageGroup,
      'price_min': priceMin,
      'price_max': priceMax,
      'unit': unit,
      'details': details,
      'sort_order': sortOrder,
      'image_url': imageUrl,
      'is_active': isActive,
    };
  }
}

