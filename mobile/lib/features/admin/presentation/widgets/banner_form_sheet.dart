import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/smart_image.dart';
import '../../../../core/services/top_notification_service.dart';
import '../../../../core/services/catalog_image_picker_service.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';

class BannerFormSheet extends StatefulWidget {
  final AdminBannerModel? banner;
  final VoidCallback onSaved;

  const BannerFormSheet({
    super.key,
    this.banner,
    required this.onSaved,
  });

  @override
  State<BannerFormSheet> createState() => _BannerFormSheetState();
}

class _BannerFormSheetState extends State<BannerFormSheet> {
  final AdminRepository _repository = AdminRepository.instance;
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _titleController;
  late final TextEditingController _summaryController;
  late final TextEditingController _imageUrlController;
  late final TextEditingController _targetLinkController;
  late final TextEditingController _sortOrderController;

  late String _category;
  late bool _isPublished;
  bool _isSaving = false;

  bool get isEdit => widget.banner != null;

  final List<Map<String, String>> _categories = [
    {'code': 'DAO_TAO', 'label': 'Đào tạo Y khoa'},
    {'code': 'DICH_VU', 'label': 'Dịch vụ Trị liệu'},
    {'code': 'KHUYEN_MAI', 'label': 'Ưu đãi Đặc quyền'},
    {'code': 'SU_KIEN', 'label': 'Sự kiện Chuyên ngành'},
  ];

  final List<Map<String, String>> _quickLinks = [
    {'label': 'Học viện Academy', 'path': '/academy'},
    {'label': 'Dịch vụ Trị liệu', 'path': '/services'},
    {'label': 'Gói bổ trợ', 'path': '/treatment/packages'},
    {'label': 'Đặt lịch hẹn', 'path': '/booking'},
    {'label': 'Tài liệu & Cẩm nang', 'path': '/documents'},
    {'label': 'Cộng đồng MLD', 'path': '/community'},
  ];

  @override
  void initState() {
    super.initState();
    final b = widget.banner;
    _titleController = TextEditingController(text: b?.title ?? '');
    _summaryController = TextEditingController(text: b?.summary ?? '');
    _imageUrlController = TextEditingController(text: b?.imageUrl ?? '');
    _targetLinkController = TextEditingController(text: b?.targetLink ?? '/academy');
    _sortOrderController = TextEditingController(text: b != null ? b.sortOrder.toString() : '1');
    _category = b?.category ?? 'DAO_TAO';
    _isPublished = b?.isPublished ?? true;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _summaryController.dispose();
    _imageUrlController.dispose();
    _targetLinkController.dispose();
    _sortOrderController.dispose();
    super.dispose();
  }

  Future<void> _pickFromDevice() async {
    final uploadedUrl = await CatalogImagePickerService.pickAndUploadImage(
      context: context,
      folderPrefix: 'banner',
    );
    if (uploadedUrl != null && mounted) {
      setState(() {
        _imageUrlController.text = uploadedUrl;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    final data = <String, dynamic>{
      'title': _titleController.text.trim(),
      'summary': _summaryController.text.trim(),
      'image_url': _imageUrlController.text.trim(),
      'target_link': _targetLinkController.text.trim(),
      'category': _category,
      'sort_order': int.tryParse(_sortOrderController.text.trim()) ?? 1,
      'status': _isPublished ? 'PUBLISHED' : 'DRAFT',
      'is_featured': true,
      'author_name': 'Ban Quản Trị MLD',
    };

    final success = await _repository.saveBanner(
      id: widget.banner?.id,
      data: data,
    );

    if (mounted) {
      setState(() => _isSaving = false);
      if (success) {
        Navigator.pop(context);
        widget.onSaved();
      } else {
        TopNotificationService.showError(
          message: 'Lỗi lưu thông tin Banner. Vui lòng kiểm tra lại kết nối.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isEdit ? 'Chỉnh sửa Banner Trang chủ' : 'Thêm Banner Trang chủ Mới',
                      style: AppTypography.zaloFont(
                        fontSize: 16.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHeading,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 22),
                      onPressed: () => Navigator.pop(context),
                      color: AppColors.textSecondary,
                    ),
                  ],
                ),
                const Divider(height: 1, color: Color(0xFFE5E7EB)),
                const SizedBox(height: 16),

                // 1. Tiêu đề Banner
                Text(
                  'Tiêu đề chiến dịch Banner *',
                  style: AppTypography.zaloFont(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _titleController,
                  decoration: InputDecoration(
                    hintText: 'VD: Đừng để cơn đau làm gián đoạn cuộc sống...',
                    hintStyle: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Vui lòng nhập tiêu đề Banner';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // 2. Mô tả tóm tắt
                Text(
                  'Mô tả phụ đề tóm tắt',
                  style: AppTypography.zaloFont(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _summaryController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    hintText: 'VD: Nhận tư vấn 1:1 và phác đồ trị liệu từ chuyên gia...',
                    hintStyle: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 14),

                // 3. Danh mục & Thứ tự hiển thị
                Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Danh mục Banner',
                            style: AppTypography.zaloFont(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<String>(
                            value: _category,
                            decoration: InputDecoration(
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                            items: _categories.map((c) {
                              return DropdownMenuItem<String>(
                                value: c['code'],
                                child: Text(
                                  c['label']!,
                                  style: AppTypography.zaloFont(fontSize: 12.5),
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _category = val);
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Thứ tự (Order)',
                            style: AppTypography.zaloFont(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _sortOrderController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              hintText: '1, 2, 3...',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // 4. Liên kết điều hướng (Target Link)
                Text(
                  'Liên kết điều hướng (Target Link)',
                  style: AppTypography.zaloFont(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _targetLinkController,
                  decoration: InputDecoration(
                    hintText: '/academy, /services, /booking hoặc https://...',
                    hintStyle: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 8),
                // Quick link chips
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: _quickLinks.map((ql) {
                    final isSelected = _targetLinkController.text == ql['path'];
                    return ActionChip(
                      label: Text(
                        ql['label']!,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? Colors.white : const Color(0xFF00693F),
                        ),
                      ),
                      backgroundColor: isSelected ? const Color(0xFF00693F) : const Color(0xFFE8F6ED),
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      onPressed: () {
                        setState(() {
                          _targetLinkController.text = ql['path']!;
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                // 5. Hình ảnh Banner
                Text(
                  'Ảnh nền Banner (Tải từ máy hoặc dán link/base64)',
                  style: AppTypography.zaloFont(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _imageUrlController,
                        onChanged: (_) => setState(() {}),
                        decoration: InputDecoration(
                          hintText: 'data:image/..., assets/..., hoặc https://...',
                          hintStyle: AppTypography.zaloFont(fontSize: 11, color: const Color(0xFF9CA3AF)),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: _pickFromDevice,
                      icon: const Icon(Icons.photo_library_rounded, size: 16),
                      label: const Text('Chọn ảnh', style: TextStyle(fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE8F6ED),
                        foregroundColor: const Color(0xFF00693F),
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Xem trước ảnh (Live Image Preview)
                if (_imageUrlController.text.trim().isNotEmpty) ...[
                  Container(
                    height: 130,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        SmartImage(
                          imageUrl: _imageUrlController.text.trim(),
                          fit: BoxFit.cover,
                        ),
                        Container(
                          padding: const EdgeInsets.all(8),
                          alignment: Alignment.bottomLeft,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Colors.transparent, Colors.black.withValues(alpha: 0.7)],
                            ),
                          ),
                          child: Text(
                            'Xem trước: ${_titleController.text.isNotEmpty ? _titleController.text : "Tiêu đề banner"}',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // 6. Switch Bật / Tắt trạng thái
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
                            'Hiển thị trên Trang chủ',
                            style: AppTypography.zaloFont(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            _isPublished
                                ? 'Banner đang hoạt động (PUBLISHED)'
                                : 'Banner tạm ẩn trong bản nháp (DRAFT)',
                            style: AppTypography.zaloFont(
                              fontSize: 11,
                              color: _isPublished ? const Color(0xFF10B981) : const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                      Switch(
                        value: _isPublished,
                        activeColor: const Color(0xFF00693F),
                        onChanged: (val) => setState(() => _isPublished = val),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Nút Lưu / Cập nhật
                ElevatedButton(
                  onPressed: _isSaving ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00693F),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(
                          isEdit ? 'Lưu Thay Đổi Banner' : 'Tạo Banner Mới',
                          style: AppTypography.zaloFont(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
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
