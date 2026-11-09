import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';

class CourseFormSheet extends StatefulWidget {
  final AdminCourseModel? course;
  final VoidCallback onSaved;

  const CourseFormSheet({
    super.key,
    this.course,
    required this.onSaved,
  });

  @override
  State<CourseFormSheet> createState() => _CourseFormSheetState();
}

class _CourseFormSheetState extends State<CourseFormSheet> {
  final AdminRepository _repository = AdminRepository.instance;
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _titleController;
  late final TextEditingController _codeController;
  late final TextEditingController _feeController;
  late final TextEditingController _depositController;
  late final TextEditingController _hoursController;
  late final TextEditingController _lessonsController;
  late final TextEditingController _descController;
  late final TextEditingController _imageUrlController;
  late final TextEditingController _audienceController;
  late final TextEditingController _needController;
  late final TextEditingController _groupController;
  late String _level;
  late bool _isActive;
  bool _isSaving = false;

  bool get isEdit => widget.course != null;

  final List<String> _audienceSuggestions = [
    'Kỹ thuật viên, Y bác sĩ & Người quan tâm đến sức khỏe',
    'Chủ Spa, Quản lý thẩm mỹ viện & KTV ngành làm đẹp',
    'Người mới bắt đầu tìm hiểu dẫn lưu bạch huyết Vodder',
    'Bệnh nhân và người nhà có nhu cầu tự chăm sóc tại nhà',
  ];

  final List<String> _needSuggestions = [
    'Nâng cao tay nghề và chăm sóc hệ bạch huyết chuyên sâu',
    'Chuẩn hóa phương pháp dẫn lưu bạch huyết Vodder Châu Âu',
    'Ứng dụng giảm phù nề sau phẫu thuật và làm đẹp y khoa',
    'Xây dựng lộ trình phát triển giảng viên chuyển giao công nghệ',
  ];

  final List<String> _groupSuggestions = [
    'Chuyên sâu',
    'Cơ bản nghề',
    'Nâng cao',
    'Nền tảng',
    'Chuyên đề Mẹ & Bé',
    'Phục hồi chức năng',
    'Chuyên gia & Giảng viên',
  ];

  final List<Map<String, String>> _levels = [
    {'value': 'BEGINNER', 'label': 'Cơ bản'},
    {'value': 'INTERMEDIATE', 'label': 'Trung cấp'},
    {'value': 'ADVANCED', 'label': 'Nâng cao'},
    {'value': 'MASTER', 'label': 'Chuyên gia Master'},
  ];

  @override
  void initState() {
    super.initState();
    final c = widget.course;
    _titleController = TextEditingController(text: c?.title ?? '');
    _codeController = TextEditingController(text: c?.code ?? '');
    _feeController = TextEditingController(text: c != null ? c.tuitionFee.toInt().toString() : '');
    _depositController = TextEditingController(text: c != null ? c.depositAmount.toInt().toString() : '');
    _hoursController = TextEditingController(text: c != null ? c.totalHours.toString() : '144');
    _lessonsController = TextEditingController(text: c != null ? c.totalLessons.toString() : '20');
    _descController = TextEditingController(text: c?.shortDescription ?? '');
    _imageUrlController = TextEditingController(text: c?.imageUrl ?? '');
    _audienceController = TextEditingController(text: c?.targetAudience ?? '');
    _needController = TextEditingController(text: c?.targetNeed ?? '');
    _groupController = TextEditingController(text: c?.courseGroup ?? '');
    final rawLevel = (c?.level ?? 'BEGINNER').toUpperCase();
    _level = _levels.any((l) => l['value'] == rawLevel) ? rawLevel : 'BEGINNER';
    _isActive = c?.isActive ?? true;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _codeController.dispose();
    _feeController.dispose();
    _depositController.dispose();
    _hoursController.dispose();
    _lessonsController.dispose();
    _descController.dispose();
    _imageUrlController.dispose();
    _audienceController.dispose();
    _needController.dispose();
    _groupController.dispose();
    super.dispose();
  }

  String _generateCode(String title) {
    if (title.isEmpty) return 'MLD-K01';
    final initials = title
        .split(' ')
        .where((word) => word.isNotEmpty)
        .map((w) => w[0].toUpperCase())
        .take(4)
        .join('');
    return 'MLD-$initials';
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final title = _titleController.text.trim();
    String code = _codeController.text.trim();
    if (code.isEmpty) code = _generateCode(title);
    final fee = double.tryParse(_feeController.text.replaceAll(',', '').replaceAll('.', '')) ?? 0.0;
    final deposit = double.tryParse(_depositController.text.replaceAll(',', '').replaceAll('.', '')) ?? 0.0;
    final hours = int.tryParse(_hoursController.text.trim()) ?? 144;
    final lessons = int.tryParse(_lessonsController.text.trim()) ?? 20;
    final imageUrl = _imageUrlController.text.trim().isNotEmpty
        ? _imageUrlController.text.trim()
        : 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80';

    final data = <String, dynamic>{
      'title': title,
      'code': code,
      'level': _level,
      'tuition_fee': fee,
      'deposit_amount': deposit,
      'total_hours': hours,
      'total_lessons': lessons,
      'is_active': _isActive,
      'short_description': _descController.text.trim(),
      'image_url': imageUrl,
      if (widget.course?.categoryId.isNotEmpty == true)
        'category_id': widget.course!.categoryId
      else
        'category_id': '20202020-0001-0001-0001-000000000001',
      'learning_outcomes': {
        ...?widget.course?.learningOutcomes,
        'target_audience': _audienceController.text.trim(),
        'target_need': _needController.text.trim(),
        'course_group': _groupController.text.trim(),
      },
    };

    final success = await _repository.saveCourse(
      id: widget.course?.id,
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
            content: Text('Không thể lưu khóa học. Vui lòng thử lại.'),
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
        Icons.school_rounded,
        size: 26,
        color: Color(0xFF00693F),
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
                    isEdit ? 'Chỉnh sửa Khóa học' : 'Thêm mới Khóa đào tạo',
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

              // Tên khóa học
              Text(
                'Tên khóa đào tạo *',
                style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _titleController,
                decoration: _inputDecoration('VD: Chuyên gia Dẫn lưu bạch huyết Vodder Quốc tế'),
                validator: (val) => val == null || val.trim().isEmpty ? 'Nhập tên khóa học' : null,
                onChanged: (val) {
                  if (!isEdit && _codeController.text.isEmpty) {
                    _codeController.text = _generateCode(val);
                  }
                },
              ),
              const SizedBox(height: 14),

              // Ảnh đại diện khóa học (URL + Live Preview)
              Text(
                'Ảnh bìa khóa học (URL hoặc Assets)',
                style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
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
                        color: const Color(0xFFE8F6ED),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFC6F6D5)),
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
                          decoration: _inputDecoration('https://images.unsplash.com/...'),
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _imageUrlController.text =
                                      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80';
                                });
                              },
                              child: Text(
                                'Dùng ảnh mẫu',
                                style: AppTypography.zaloFont(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF00693F),
                                ),
                              ),
                            ),
                            if (_imageUrlController.text.isNotEmpty) ...[
                              const SizedBox(width: 12),
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
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Mã khóa & Cấp độ
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Mã khóa *',
                          style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _codeController,
                          textCapitalization: TextCapitalization.characters,
                          decoration: _inputDecoration('VD: MLD-PRO-01'),
                          validator: (val) => val == null || val.trim().isEmpty ? 'Nhập mã khóa' : null,
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
                          'Cấp độ',
                          style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          value: _levels.any((lvl) => lvl['value'] == _level) ? _level : _levels.first['value'],
                          decoration: _inputDecoration(''),
                          items: _levels.map((lvl) {
                            return DropdownMenuItem(
                              value: lvl['value'],
                              child: Text(lvl['label']!, style: AppTypography.zaloFont(fontSize: 12.5)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setState(() => _level = val);
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Học phí & Tiền cọc
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Học phí (VNĐ) *',
                          style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _feeController,
                          keyboardType: TextInputType.number,
                          decoration: _inputDecoration('VD: 15000000'),
                          validator: (val) => val == null || val.trim().isEmpty ? 'Nhập học phí' : null,
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
                          'Mức cọc (VNĐ) *',
                          style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _depositController,
                          keyboardType: TextInputType.number,
                          decoration: _inputDecoration('VD: 3000000'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Số giờ & Số bài
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Tổng giờ học',
                          style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _hoursController,
                          keyboardType: TextInputType.number,
                          decoration: _inputDecoration('144'),
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
                          'Tổng số bài học',
                          style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _lessonsController,
                          keyboardType: TextInputType.number,
                          decoration: _inputDecoration('20'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Mô tả ngắn
              Text(
                'Mô tả khóa học',
                style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _descController,
                maxLines: 2,
                decoration: _inputDecoration('Chuẩn đầu ra, kỹ năng và cơ hội nghề nghiệp...'),
              ),
              const SizedBox(height: 14),

              Text(
                'Đối tượng học viên phù hợp',
                style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _audienceController,
                decoration: _inputDecoration('Ví dụ: Kỹ thuật viên, Y bác sĩ...'),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _audienceSuggestions.map((s) {
                  final isSelected = _audienceController.text.trim() == s;
                  return InkWell(
                    onTap: () {
                      setState(() {
                        _audienceController.text = s;
                      });
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFFAF3EA) : const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isSelected ? const Color(0xFFB38A58) : const Color(0xFFE5E7EB),
                        ),
                      ),
                      child: Text(
                        s,
                        style: AppTypography.zaloFont(
                          fontSize: 10.5,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? const Color(0xFF985018) : const Color(0xFF4B5563),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),

              Text(
                'Nhu cầu mục tiêu / Chuẩn đầu ra',
                style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _needController,
                decoration: _inputDecoration('Ví dụ: Nâng cao tay nghề và chăm sóc hệ bạch huyết...'),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _needSuggestions.map((s) {
                  final isSelected = _needController.text.trim() == s;
                  return InkWell(
                    onTap: () {
                      setState(() {
                        _needController.text = s;
                      });
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFFAF3EA) : const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isSelected ? const Color(0xFFB38A58) : const Color(0xFFE5E7EB),
                        ),
                      ),
                      child: Text(
                        s,
                        style: AppTypography.zaloFont(
                          fontSize: 10.5,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? const Color(0xFF985018) : const Color(0xFF4B5563),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),

              Text(
                'Nhóm khóa học',
                style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textHeading),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _groupController,
                decoration: _inputDecoration('Ví dụ: Chuyên sâu, Cơ bản nghề, Nâng cao...'),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _groupSuggestions.map((s) {
                  final isSelected = _groupController.text.trim() == s;
                  return InkWell(
                    onTap: () {
                      setState(() {
                        _groupController.text = s;
                      });
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFFAF3EA) : const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isSelected ? const Color(0xFFB38A58) : const Color(0xFFE5E7EB),
                        ),
                      ),
                      child: Text(
                        s,
                        style: AppTypography.zaloFont(
                          fontSize: 10.5,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? const Color(0xFF985018) : const Color(0xFF4B5563),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              // Công tắc Duyệt mở tuyển sinh
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
                          'Trạng thái tuyển sinh:',
                          style: AppTypography.zaloFont(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        Text(
                          _isActive ? 'Đang mở tuyển sinh nhận học viên' : 'Tạm dừng tuyển sinh',
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
                    backgroundColor: const Color(0xFF00693F),
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
                          isEdit ? 'Lưu khóa học' : 'Tạo mới Khóa đào tạo',
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
