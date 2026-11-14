import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/services/top_notification_service.dart';
import '../../../../core/services/catalog_image_picker_service.dart';
import '../../../services/data/models/home_product_model.dart';
import '../../../services/data/repositories/product_repository.dart';

class ProductFormSheet extends StatefulWidget {
  final HomeProductModel? product;
  final VoidCallback onSaved;

  const ProductFormSheet({
    super.key,
    this.product,
    required this.onSaved,
  });

  @override
  State<ProductFormSheet> createState() => _ProductFormSheetState();
}

class _ProductFormSheetState extends State<ProductFormSheet> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  late final TextEditingController _categoryController;
  late final TextEditingController _priceController;
  late final TextEditingController _unitController;
  late final TextEditingController _imageUrlController;
  late final TextEditingController _detailsController;

  bool _isSaving = false;

  bool get isEdit => widget.product != null;

  static const List<String> _suggestedCategories = [
    'Băng ép y khoa',
    'Kem dưỡng da y khoa',
    'Tất vớ áp lực',
    'Dụng cụ tập luyện',
    'Vật tư tiêu hao',
    'Sản phẩm hỗ trợ',
  ];

  static const List<String> _suggestedUnits = [
    'Cuộn',
    'Tuýp 200ml',
    'Đôi',
    'Hộp',
    'Chai',
    'Chiếc',
    'Bộ',
  ];

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _nameController = TextEditingController(text: p?.name ?? '');
    _categoryController = TextEditingController(text: p?.category ?? 'Băng ép y khoa');
    _priceController = TextEditingController(text: p != null ? p.priceMin.toInt().toString() : '');
    _unitController = TextEditingController(text: p?.unit ?? 'Cuộn');
    _imageUrlController = TextEditingController(text: p?.imageUrl ?? '');
    _detailsController = TextEditingController(text: p?.details.join('\n') ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _categoryController.dispose();
    _priceController.dispose();
    _unitController.dispose();
    _imageUrlController.dispose();
    _detailsController.dispose();
    super.dispose();
  }

  Future<void> _pickFromDevice() async {
    final uploadedUrl = await CatalogImagePickerService.pickAndUploadImage(
      context: context,
      folderPrefix: 'product',
    );
    if (uploadedUrl != null && mounted) {
      setState(() {
        _imageUrlController.text = uploadedUrl;
      });
    }
  }

  Widget _buildPreviewWidget(String url) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) {
      return const Icon(
        Icons.add_photo_alternate_outlined,
        size: 26,
        color: Color(0xFF9CA3AF),
      );
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return Image.network(
        trimmed,
        width: 64,
        height: 64,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => const Icon(
          Icons.broken_image_outlined,
          size: 26,
          color: Color(0xFF9CA3AF),
        ),
      );
    } else {
      return Image.asset(
        trimmed,
        width: 64,
        height: 64,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => const Icon(
          Icons.broken_image_outlined,
          size: 26,
          color: Color(0xFF9CA3AF),
        ),
      );
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final name = _nameController.text.trim();
    final category = _categoryController.text.trim();
    final unit = _unitController.text.trim();
    final price = double.tryParse(_priceController.text.replaceAll(',', '').replaceAll('.', '')) ?? 0.0;
    final imageUrl = _imageUrlController.text.trim().isNotEmpty ? _imageUrlController.text.trim() : null;
    final details = _detailsController.text
        .split('\n')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();

    bool success = false;
    if (isEdit) {
      success = await ProductRepository.instance.updateProduct(widget.product!.id, {
        'name': name,
        'category': category,
        'price_min': price,
        'price_max': price,
        'unit': unit,
        'details': details,
        if (imageUrl != null) 'image_url': imageUrl,
      });
    } else {
      success = await ProductRepository.instance.createProduct(
        name: name,
        category: category,
        priceMin: price,
        priceMax: price,
        unit: unit,
        details: details,
        imageUrl: imageUrl,
      );
    }

    if (mounted) {
      setState(() => _isSaving = false);
      if (success) {
        Navigator.pop(context);
        widget.onSaved();
      } else {
        TopNotificationService.showError(
          message: 'Lưu sản phẩm thất bại. Vui lòng thử lại.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE5E7EB),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isEdit ? 'Chỉnh sửa Sản phẩm bổ trợ' : 'Thêm Sản phẩm bổ trợ mới',
                      style: AppTypography.zaloFont(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHeading,
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF6B7280)),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 1. Tên sản phẩm
                Text(
                  'Tên sản phẩm bổ trợ *',
                  style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _nameController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập tên sản phẩm' : null,
                  decoration: InputDecoration(
                    hintText: 'VD: Băng ép đa lớp MLD Pro Care',
                    hintStyle: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                  ),
                ),
                const SizedBox(height: 14),

                // 2. Ảnh đại diện sản phẩm (URL hoặc tải từ thiết bị)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Ảnh sản phẩm (Link hoặc từ máy)',
                      style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                    ),
                    InkWell(
                      onTap: _pickFromDevice,
                      child: Row(
                        children: [
                          const Icon(Icons.upload_file_rounded, size: 15, color: Color(0xFF00693F)),
                          const SizedBox(width: 4),
                          Text(
                            'Tải từ thiết bị',
                            style: AppTypography.zaloFont(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF00693F),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE5E7EB)),
                        ),
                        child: _buildPreviewWidget(_imageUrlController.text),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextFormField(
                            controller: _imageUrlController,
                            decoration: InputDecoration(
                              hintText: 'Nhập link ảnh hoặc bấm "Tải từ thiết bị"...',
                              hintStyle: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: 10,
                            children: [
                              InkWell(
                                onTap: _pickFromDevice,
                                child: Text(
                                  '📷 Chọn từ máy',
                                  style: AppTypography.zaloFont(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF00693F),
                                  ),
                                ),
                              ),
                              InkWell(
                                onTap: () {
                                  setState(() {
                                    _imageUrlController.text =
                                        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80';
                                  });
                                },
                                child: Text(
                                  'Dùng ảnh mẫu',
                                  style: AppTypography.zaloFont(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                              if (_imageUrlController.text.isNotEmpty)
                                InkWell(
                                  onTap: () => setState(() => _imageUrlController.clear()),
                                  child: Text(
                                    'Xóa link',
                                    style: AppTypography.zaloFont(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                      color: const Color(0xFFDC2626),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // 3. Danh mục & Đơn vị
                Row(
                  children: [
                    Expanded(
                      flex: 6,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Danh mục sản phẩm *',
                            style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _categoryController,
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Nhập danh mục' : null,
                            decoration: InputDecoration(
                              hintText: 'VD: Băng ép y khoa',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 4,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Đơn vị tính *',
                            style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _unitController,
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Đơn vị' : null,
                            decoration: InputDecoration(
                              hintText: 'Cuộn / Hộp...',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: _suggestedCategories.map((c) {
                    return InkWell(
                      onTap: () => setState(() => _categoryController.text = c),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _categoryController.text == c ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: _categoryController.text == c ? const Color(0xFF00693F) : Colors.transparent,
                          ),
                        ),
                        child: Text(
                          c,
                          style: AppTypography.zaloFont(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                            color: _categoryController.text == c ? const Color(0xFF00693F) : const Color(0xFF4B5563),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                // 4. Giá bán
                Text(
                  'Giá bán (VNĐ) *',
                  style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _priceController,
                  keyboardType: TextInputType.number,
                  validator: (v) => (v == null || v.isEmpty) ? 'Nhập giá bán' : null,
                  decoration: InputDecoration(
                    hintText: '350.000',
                    suffixText: '₫',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                  ),
                ),
                const SizedBox(height: 14),

                // 5. Thông tin chi tiết / Hướng dẫn sử dụng
                Text(
                  'Chi tiết sản phẩm / Hướng dẫn sử dụng (mỗi dòng một ý)',
                  style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _detailsController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Sợi cotton dệt đàn hồi cao...\nĐộ co giãn ngắn tạo áp lực làm việc cao...',
                    hintStyle: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                  ),
                ),
                const SizedBox(height: 20),

                // Nút Submit
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00693F),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: _isSaving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(
                            isEdit ? 'Lưu thay đổi sản phẩm' : 'Tạo mới sản phẩm',
                            style: AppTypography.zaloFont(fontSize: 14.5, fontWeight: FontWeight.w700),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
