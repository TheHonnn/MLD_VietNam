import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../../../../core/services/catalog_image_picker_service.dart';

class ServiceFormSheet extends StatefulWidget {
  final AdminServiceModel? service;
  final List<Map<String, dynamic>>? categories;
  final VoidCallback onSaved;

  const ServiceFormSheet({
    super.key,
    this.service,
    this.categories,
    required this.onSaved,
  });

  @override
  State<ServiceFormSheet> createState() => _ServiceFormSheetState();
}

class _ServiceFormSheetState extends State<ServiceFormSheet> {
  final AdminRepository _repository = AdminRepository.instance;
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  late final TextEditingController _priceController;
  late final TextEditingController _discountPriceController;
  late final TextEditingController _durationController;
  late final TextEditingController _descController;
  late final TextEditingController _imageUrlController;
  late bool _isActive;
  late bool _isFeatured;
  bool _isSaving = false;

  List<Map<String, dynamic>> _categories = [];
  String? _selectedCategoryId;

  bool get isEdit => widget.service != null;

  @override
  void initState() {
    super.initState();
    final s = widget.service;
    _nameController = TextEditingController(text: s?.name ?? '');
    _priceController = TextEditingController(text: s != null ? s.price.toInt().toString() : '');
    _discountPriceController = TextEditingController(
        text: s?.discountPrice != null ? s!.discountPrice!.toInt().toString() : '');
    _durationController = TextEditingController(text: s != null ? s.durationMinutes.toString() : '60');
    _descController = TextEditingController(text: s?.shortDescription ?? '');
    _imageUrlController = TextEditingController(text: s?.imageUrl ?? '');
    _isActive = s?.isActive ?? true;
    _isFeatured = s?.isFeatured ?? false;
    _selectedCategoryId = s?.categoryId.isNotEmpty == true ? s!.categoryId : null;

    if (widget.categories != null) {
      _categories = widget.categories!;
    } else {
      _loadCategories();
    }
  }

  Future<void> _loadCategories() async {
    final list = await _repository.fetchServiceCategories();
    if (mounted) {
      setState(() {
        _categories = list;
        if ((_selectedCategoryId == null || _selectedCategoryId!.isEmpty) && list.isNotEmpty) {
          _selectedCategoryId = list.first['id']?.toString();
        }
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _discountPriceController.dispose();
    _durationController.dispose();
    _descController.dispose();
    _imageUrlController.dispose();
    super.dispose();
  }

  Future<void> _pickFromDevice() async {
    final uploadedUrl = await CatalogImagePickerService.pickAndUploadImage(
      context: context,
      folderPrefix: 'service',
    );
    if (uploadedUrl != null && mounted) {
      setState(() {
        _imageUrlController.text = uploadedUrl;
      });
    }
  }

  String _toSlug(String text) {
    return text
        .toLowerCase()
        .replaceAll(RegExp(r'[àáạảãâầấậẩẫăằắặẳẵ]'), 'a')
        .replaceAll(RegExp(r'[èéẹẻẽêềếệểễ]'), 'e')
        .replaceAll(RegExp(r'[ìíịỉĩ]'), 'i')
        .replaceAll(RegExp(r'[òóọỏõôồốộổỗơờớợởỡ]'), 'o')
        .replaceAll(RegExp(r'[ùúụủũưừứựửữ]'), 'u')
        .replaceAll(RegExp(r'[ỳýỵỷỹ]'), 'y')
        .replaceAll(RegExp(r'[đ]'), 'd')
        .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
        .trim()
        .replaceAll(RegExp(r'\s+'), '-');
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final name = _nameController.text.trim();
    final price = double.tryParse(_priceController.text.replaceAll(',', '').replaceAll('.', '')) ?? 0.0;
    final discountText = _discountPriceController.text.replaceAll(',', '').replaceAll('.', '').trim();
    final discount = discountText.isNotEmpty ? double.tryParse(discountText) : null;
    final duration = int.tryParse(_durationController.text.trim()) ?? 60;
    final slug = widget.service?.slug.isNotEmpty == true ? widget.service!.slug : _toSlug(name);
    final imageUrl = _imageUrlController.text.trim().isNotEmpty
        ? _imageUrlController.text.trim()
        : 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80';

    final data = <String, dynamic>{
      'name': name,
      'slug': slug,
      'duration_minutes': duration,
      'price': price,
      'is_active': _isActive,
      'is_featured': _isFeatured,
      'short_description': _descController.text.trim(),
      'full_description': _descController.text.trim(),
      'image_url': imageUrl,
      if (_selectedCategoryId != null && _selectedCategoryId!.isNotEmpty)
        'category_id': _selectedCategoryId,
    };

    if (discount != null && discount > 0) {
      data['discount_price'] = discount;
    } else {
      data['discount_price'] = null;
    }

    final success = await _repository.saveService(
      id: widget.service?.id,
      data: data,
    );

    if (mounted) {
      setState(() => _isSaving = false);
      if (success) {
        Navigator.pop(context);
        widget.onSaved();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể lưu dịch vụ. Vui lòng kiểm tra lại.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
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

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5E7EB),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isEdit ? 'Chỉnh sửa Dịch vụ' : 'Thêm mới Dịch vụ Spa',
                    style: AppTypography.zaloFont(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHeading,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Color(0xFF6B7280)),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Divider(color: Color(0xFFE5E7EB)),
              const SizedBox(height: 12),

              // Danh mục dịch vụ
              if (_categories.isNotEmpty) ...[
                Text(
                  'Danh mục dịch vụ',
                  style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: _categories.any((c) => c['id']?.toString() == _selectedCategoryId)
                      ? _selectedCategoryId
                      : _categories.first['id']?.toString(),
                  decoration: _inputDecoration('Chọn danh mục dịch vụ'),
                  items: _categories.map((cat) {
                    return DropdownMenuItem<String>(
                      value: cat['id']?.toString(),
                      child: Text(cat['name']?.toString() ?? '', style: AppTypography.zaloFont(fontSize: 12.5)),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedCategoryId = val);
                  },
                ),
                const SizedBox(height: 14),
              ],

              // Tên dịch vụ
              Text(
                'Tên dịch vụ trị liệu *',
                style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _nameController,
                decoration: _inputDecoration('VD: Trị liệu cổ vai gáy chuyên sâu'),
                validator: (val) => val == null || val.trim().isEmpty ? 'Vui lòng nhập tên dịch vụ' : null,
              ),
              const SizedBox(height: 14),

              // Ảnh đại diện dịch vụ (Link hoặc từ máy)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Ảnh đại diện dịch vụ (Link hoặc từ máy)',
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
                          decoration: _inputDecoration('Nhập link ảnh hoặc bấm "Tải từ thiết bị"...'),
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 10,
                          runSpacing: 4,
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
                                      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80';
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
                                onTap: () {
                                  setState(() {
                                    _imageUrlController.clear();
                                  });
                                },
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

              // Thời lượng & Phím tắt chọn nhanh
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Thời lượng (Phút) *',
                    style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                  ),
                  Row(
                    children: [45, 60, 75, 90, 120].map((mins) {
                      return Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: InkWell(
                          onTap: () => setState(() => _durationController.text = mins.toString()),
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF4FE),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${mins}p',
                              style: AppTypography.zaloFont(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _durationController,
                keyboardType: TextInputType.number,
                decoration: _inputDecoration('60'),
                validator: (val) => val == null || val.trim().isEmpty ? 'Nhập số phút thực hiện' : null,
              ),
              const SizedBox(height: 14),

              // Giá niêm yết & Giá khuyến mãi
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Giá gốc (VNĐ) *',
                          style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _priceController,
                          keyboardType: TextInputType.number,
                          decoration: _inputDecoration('VD: 850000'),
                          validator: (val) => val == null || val.trim().isEmpty ? 'Nhập giá dịch vụ' : null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Giá ưu đãi (VNĐ)',
                          style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _discountPriceController,
                          keyboardType: TextInputType.number,
                          decoration: _inputDecoration('VD: 680000'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Mô tả ngắn
              Text(
                'Mô tả ngắn gọn',
                style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _descController,
                maxLines: 2,
                decoration: _inputDecoration('Lợi ích và công dụng chính của liệu trình...'),
              ),
              const SizedBox(height: 16),

              // Công tắc Duyệt kinh doanh
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Trạng thái kinh doanh:',
                          style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        Text(
                          _isActive ? 'Đang mở bán tiếp nhận khách' : 'Tạm dừng phục vụ',
                          style: AppTypography.zaloFont(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: _isActive ? const Color(0xFF00693F) : const Color(0xFFDC2626),
                          ),
                        ),
                      ],
                    ),
                    Switch(
                      value: _isActive,
                      activeThumbColor: const Color(0xFF00693F),
                      onChanged: (val) => setState(() => _isActive = val),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Nút bấm Lưu
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE11D48),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          isEdit ? 'Lưu thay đổi' : 'Tạo mới Dịch vụ',
                          style: AppTypography.zaloFont(fontSize: 13.5, fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: AppTypography.zaloFont(fontSize: 12.5, color: const Color(0xFF9CA3AF)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      filled: true,
      fillColor: const Color(0xFFF9FAFB),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
    );
  }
}

