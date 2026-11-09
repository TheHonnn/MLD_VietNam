import 'dart:convert';
import 'package:intl/intl.dart';

/// Model Sản phẩm bổ trợ tại nhà chuẩn Y khoa MLD
/// Ánh xạ trực tiếp từ bảng `public.home_products` trên Database Supabase
class HomeProductModel {
  final String id;
  final String name;
  final String category; // 'Dụng cụ tập luyện', 'Băng ép', 'Chăm sóc da', 'Tài liệu'
  final double priceMin;
  final double priceMax;
  final String unit;
  final List<String> details;
  final int sortOrder;
  final String? imageUrl;
  final DateTime? createdAt;

  const HomeProductModel({
    required this.id,
    required this.name,
    required this.category,
    required this.priceMin,
    required this.priceMax,
    required this.unit,
    this.details = const [],
    this.sortOrder = 0,
    this.imageUrl,
    this.createdAt,
  });

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

    return HomeProductModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Sản phẩm MLD',
      category: json['category']?.toString() ?? 'Dụng cụ tập luyện',
      priceMin: double.tryParse(json['price_min']?.toString() ?? '0') ?? 0.0,
      priceMax: double.tryParse(json['price_max']?.toString() ?? '0') ?? 0.0,
      unit: json['unit']?.toString() ?? 'chiếc',
      details: detailsList,
      sortOrder: int.tryParse(json['sort_order']?.toString() ?? '0') ?? 0,
      imageUrl: json['image_url']?.toString(),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'price_min': priceMin,
      'price_max': priceMax,
      'unit': unit,
      'details': details,
      'sort_order': sortOrder,
      'image_url': imageUrl,
    };
  }
}

