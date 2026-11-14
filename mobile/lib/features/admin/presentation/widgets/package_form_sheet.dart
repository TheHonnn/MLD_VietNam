import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';

class PackageFormSheet extends StatefulWidget {
  final AdminTreatmentPackageModel? package;
  final VoidCallback onSaved;

  const PackageFormSheet({
    super.key,
    this.package,
    required this.onSaved,
  });

  @override
  State<PackageFormSheet> createState() => _PackageFormSheetState();
}

class _PackageFormSheetState extends State<PackageFormSheet> {
  final AdminRepository _repository = AdminRepository.instance;
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  late final TextEditingController _sessionsController;
  late final TextEditingController _validityMonthsController;
  late final TextEditingController _priceController;
  late final TextEditingController _discountPriceController;
  late final TextEditingController _descController;
  late final TextEditingController _imageUrlController;

  late bool _isActive;
  bool _isSaving = false;

  List<AdminServiceModel> _services = [];
  String? _selectedServiceId;

  bool get isEdit => widget.package != null;

  @override
  void initState() {
    super.initState();
    final p = widget.package;
    _nameController = TextEditingController(text: p?.name ?? '');
    _sessionsController = TextEditingController(text: p != null ? p.totalSessions.toString() : '10');
    _validityMonthsController = TextEditingController(text: p != null ? p.validityMonths.toString() : '6');
    _priceController = TextEditingController(text: p != null ? p.price.toInt().toString() : '');
    _discountPriceController = TextEditingController(
      text: (p?.discountPrice != null && p!.discountPrice! > 0) ? p.discountPrice!.toInt().toString() : '',
    );
    _descController = TextEditingController(text: p?.description ?? '');
    _imageUrlController = TextEditingController(text: p?.imageUrl ?? '');
    _isActive = p?.isActive ?? true;
    _selectedServiceId = p?.serviceId;

    _loadServices();
  }

  Future<void> _loadServices() async {
    final list = await _repository.fetchServices();
    if (mounted) {
      setState(() {
        _services = list;
        if (_selectedServiceId != null && !_services.any((s) => s.id == _selectedServiceId)) {
          _selectedServiceId = null;
        }
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _sessionsController.dispose();
    _validityMonthsController.dispose();
    _priceController.dispose();
    _discountPriceController.dispose();
    _descController.dispose();
    _imageUrlController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final name = _nameController.text.trim();
    final sessions = int.tryParse(_sessionsController.text.trim()) ?? 10;
    final validity = int.tryParse(_validityMonthsController.text.trim()) ?? 6;
    final price = double.tryParse(_priceController.text.replaceAll(',', '').replaceAll('.', '')) ?? 0.0;
    final discountText = _discountPriceController.text.replaceAll(',', '').replaceAll('.', '').trim();
    final discount = discountText.isNotEmpty ? double.tryParse(discountText) : null;
    final imageUrl = _imageUrlController.text.trim().isNotEmpty
        ? _imageUrlController.text.trim()
        : 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80';

    final data = <String, dynamic>{
      'name': name,
      'total_sessions': sessions,
      'validity_months': validity,
      'price': price,
      'discount_price': (discount != null && discount > 0) ? discount : price,
      'description': _descController.text.trim(),
      'image_url': imageUrl,
      'is_active': _isActive,
      if (_selectedServiceId != null && _selectedServiceId!.isNotEmpty)
        'service_id': _selectedServiceId,
    };

    final success = await _repository.saveTreatmentPackage(
      id: widget.package?.id,
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
            content: Text('Lỗi lưu gói bổ trợ. Vui lòng kiểm tra lại kết nối!'),
            backgroundColor: Color(0xFFE11D48),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
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
                // Thanh kéo
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

                // Tiêu đề
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isEdit ? 'Chỉnh sửa Gói bổ trợ' : 'Thêm Gói bổ trợ mới',
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

                // 1. Tên gói
                Text(
                  'Tên gói bổ trợ / Liệu trình *',
                  style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _nameController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập tên gói' : null,
                  decoration: InputDecoration(
                    hintText: 'VD: Gói Chăm sóc phục hồi sau phẫu thuật (10 buổi)',
                    hintStyle: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                  ),
                ),
                const SizedBox(height: 14),

                // 2. Số buổi & Thời hạn sử dụng
                Row(
                  children: [
                    // Số buổi
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Số buổi điều trị *',
                            style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _sessionsController,
                            keyboardType: TextInputType.number,
                            validator: (v) => (v == null || int.tryParse(v) == null) ? 'Nhập số buổi' : null,
                            decoration: InputDecoration(
                              hintText: '10',
                              suffixText: 'buổi',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                            ),
                          ),
                          const SizedBox(height: 6),
                          // Chip chọn nhanh số buổi
                          Row(
                            children: [10, 20, 30].map((s) {
                              return Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: InkWell(
                                  onTap: () => setState(() => _sessionsController.text = s.toString()),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: _sessionsController.text == s.toString() ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(
                                        color: _sessionsController.text == s.toString() ? const Color(0xFF00693F) : Colors.transparent,
                                      ),
                                    ),
                                    child: Text(
                                      '$s buổi',
                                      style: AppTypography.zaloFont(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w600,
                                        color: _sessionsController.text == s.toString() ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),

                    // Thời hạn
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Thời hạn sử dụng *',
                            style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _validityMonthsController,
                            keyboardType: TextInputType.number,
                            validator: (v) => (v == null || int.tryParse(v) == null) ? 'Nhập số tháng' : null,
                            decoration: InputDecoration(
                              hintText: '6',
                              suffixText: 'tháng',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                            ),
                          ),
                          const SizedBox(height: 6),
                          // Chip chọn nhanh thời hạn
                          Row(
                            children: [3, 6, 12].map((m) {
                              return Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: InkWell(
                                  onTap: () => setState(() => _validityMonthsController.text = m.toString()),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: _validityMonthsController.text == m.toString() ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(
                                        color: _validityMonthsController.text == m.toString() ? const Color(0xFF00693F) : Colors.transparent,
                                      ),
                                    ),
                                    child: Text(
                                      '$m tháng',
                                      style: AppTypography.zaloFont(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w600,
                                        color: _validityMonthsController.text == m.toString() ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // 3. Giá niêm yết & Giá ưu đãi
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Giá niêm yết (VNĐ) *',
                            style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _priceController,
                            keyboardType: TextInputType.number,
                            validator: (v) => (v == null || v.isEmpty) ? 'Nhập giá' : null,
                            decoration: InputDecoration(
                              hintText: '4.800.000',
                              suffixText: '₫',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Giá ưu đãi (Tùy chọn)',
                            style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _discountPriceController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              hintText: 'Để trống nếu không',
                              suffixText: '₫',
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
                const SizedBox(height: 14),

                // 4. Dịch vụ nền tảng liên kết (Tùy chọn)
                if (_services.isNotEmpty) ...[
                  Text(
                    'Dịch vụ đơn lẻ liên kết (Tùy chọn)',
                    style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String?>(
                    initialValue: _selectedServiceId,
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('Không liên kết (Gói độc lập)'),
                      ),
                      ..._services.map(
                        (s) => DropdownMenuItem<String?>(
                          value: s.id,
                          child: Text('${s.name} (${s.durationMinutes}\')'),
                        ),
                      ),
                    ],
                    onChanged: (val) => setState(() => _selectedServiceId = val),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // 5. Mô tả chi tiết
                Text(
                  'Mô tả chi tiết gói liệu trình',
                  style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _descController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'VD: Liệu trình 10 buổi Chăm sóc mở rộng (60 phút/buổi). Tiết kiệm chi phí, đã gồm VAT 8%...',
                    hintStyle: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                  ),
                ),
                const SizedBox(height: 14),

                // 6. Switch Bật/Tắt kinh doanh
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Mở bán cho Khách hàng',
                            style: AppTypography.zaloFont(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _isActive ? 'Gói đang mở bán (User thấy và mua được)' : 'Gói tạm dừng (User không thấy trên App)',
                            style: AppTypography.zaloFont(fontSize: 11, color: _isActive ? const Color(0xFF00693F) : const Color(0xFFE11D48)),
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

                // Nút Lưu
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00693F),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: _isSaving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : Text(
                            isEdit ? 'Lưu thay đổi gói bổ trợ' : 'Tạo mới gói bổ trợ',
                            style: AppTypography.zaloFont(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
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
