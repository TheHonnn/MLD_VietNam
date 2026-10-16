import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/treatment_models.dart';
import '../../data/repositories/mock_treatment_repository.dart';

class D04PreServiceConsultationScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const D04PreServiceConsultationScreen({
    super.key,
    this.onBack,
  });

  @override
  State<D04PreServiceConsultationScreen> createState() => _D04PreServiceConsultationScreenState();
}

class _D04PreServiceConsultationScreenState extends State<D04PreServiceConsultationScreen> {
  final MockTreatmentRepository _repo = MockTreatmentRepository();

  final Set<String> _selectedGoals = {'Thư giãn cơ thể.', 'Giảm cảm giác căng thẳng.'};
  final TextEditingController _attentionAreaCtrl = TextEditingController();
  final TextEditingController _allergiesCtrl = TextEditingController();
  final TextEditingController _discomfortCtrl = TextEditingController();
  final TextEditingController _specialRequestCtrl = TextEditingController();

  String _massagePressure = 'Nhẹ';
  String _roomTemp = 'Ấm vừa';
  String _fragrance = 'Không hương';
  String _communication = 'Khi cần thiết';
  bool _consent = true;

  @override
  void dispose() {
    _attentionAreaCtrl.dispose();
    _allergiesCtrl.dispose();
    _discomfortCtrl.dispose();
    _specialRequestCtrl.dispose();
    super.dispose();
  }

  void _handleSave() {
    if (!_consent) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn đồng ý để tiếp tục.')),
      );
      return;
    }

    _repo.saveConsultation(
      ConsultationPreferenceModel(
        selectedGoals: _selectedGoals.toList(),
        attentionArea: _attentionAreaCtrl.text,
        allergies: _allergiesCtrl.text,
        pastDiscomfort: _discomfortCtrl.text,
        specialRequest: _specialRequestCtrl.text,
        massagePressure: _massagePressure,
        roomTemperature: _roomTemp,
        fragrance: _fragrance,
        communication: _communication,
        consentGiven: _consent,
      ),
    );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đã lưu thông tin khảo sát tiền dịch vụ!'),
        backgroundColor: AppColors.primary,
      ),
    );

    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- 1. ĐIỀU HƯỚNG ---
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        InkWell(
                          onTap: () {
                            if (widget.onBack != null) {
                              widget.onBack!();
                            } else {
                              Navigator.of(context).pop();
                            }
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border, width: 1.0),
                            ),
                            child: const Icon(Icons.arrow_back, color: AppColors.textPrimary, size: 20),
                          ),
                        ),
                        const Text(
                          'CHĂM SÓC & TRỊ LIỆU',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AppColors.primary, // #985018
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // --- 2. TIÊU ĐỀ ---
                    const Text(
                      'Phiếu thông tin trước dịch vụ',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        height: 36.4 / 28,
                        color: AppColors.textHeading, // #693B20
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Cung cấp một số thông tin để chuyên viên chuẩn bị trải nghiệm phù hợp.',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 20),

                    // --- 3. THẺ THÔNG TIN KHÁCH & DỊCH VỤ (350x174, r=20, #F3E2CE) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSecondary, // #F3E2CE
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.person_outline_rounded, color: AppColors.primary, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Nguyễn Minh Anh',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 6),
                          Text(
                            '28 tuổi · 0912 345 678',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textPrimary),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Massage thư giãn toàn thân · 60 phút',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textPrimary),
                          ),
                          SizedBox(height: 4),
                          Text(
                            '15/10/2026 · 09:00–10:00',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.primary),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Buổi 05 · Lịch hẹn sắp tới',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 4. BẠN MONG MUỐN CẢI THIỆN TRẢI NGHIỆM NÀO? ---
                    const Text(
                      'Bạn mong muốn cải thiện trải nghiệm nào?',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading, // #693B20
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Bạn có thể chọn nhiều mong muốn.',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 14),

                    _buildGoalOption('Thư giãn cơ thể.', Icons.spa_outlined),
                    _buildGoalOption('Giảm cảm giác căng thẳng.', Icons.self_improvement_outlined),
                    _buildGoalOption('Chăm sóc làn da.', Icons.face_retouching_natural_outlined),
                    _buildGoalOption('Chăm sóc cơ thể.', Icons.accessibility_new_outlined),
                    _buildGoalOption('Nâng cao trải nghiệm nghỉ ngơi.', Icons.bedtime_outlined),
                    _buildGoalOption('Khác.', Icons.more_horiz_outlined),

                    const SizedBox(height: 24),

                    // --- 5. ĐIỀU CHUYÊN VIÊN CẦN LƯU Ý ---
                    const Text(
                      'Điều chuyên viên cần lưu ý',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Các thông tin dưới đây là tùy chọn. Chỉ chia sẻ những gì bạn thấy cần thiết.',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 16),

                    _buildInputField('Vùng cần chú ý · Tùy chọn', 'Bạn muốn chuyên viên lưu ý vùng nào?', _attentionAreaCtrl),
                    const SizedBox(height: 14),
                    _buildInputField('Dị ứng hoặc nhạy cảm đã biết · Tùy chọn', 'Ví dụ: sản phẩm, hương thơm cần tránh...', _allergiesCtrl),
                    const SizedBox(height: 14),
                    _buildInputField('Khó chịu trước đây · Tùy chọn', 'Chia sẻ nếu bạn từng thấy không thoải mái...', _discomfortCtrl),
                    const SizedBox(height: 14),
                    _buildInputField('Yêu cầu đặc biệt · Tùy chọn', 'Điều gì giúp bạn cảm thấy dễ chịu hơn?', _specialRequestCtrl),

                    const SizedBox(height: 24),

                    // --- 6. SỞ THÍCH KHI TRẢI NGHIỆM ---
                    const Text(
                      'Sở thích khi trải nghiệm',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 16),

                    _buildPreferenceRow('Mức lực massage', ['Nhẹ', 'Vừa'], _massagePressure, (val) => setState(() => _massagePressure = val)),
                    const SizedBox(height: 16),
                    _buildPreferenceRow('Điều chỉnh nhiệt độ', ['Ấm vừa', 'Mát nhẹ'], _roomTemp, (val) => setState(() => _roomTemp = val)),
                    const SizedBox(height: 16),
                    _buildPreferenceRow('Hương thơm', ['Không hương', 'Hương nhẹ'], _fragrance, (val) => setState(() => _fragrance = val)),
                    const SizedBox(height: 16),
                    _buildPreferenceRow('Trao đổi trong buổi', ['Khi cần thiết', 'Trò chuyện nhẹ'], _communication, (val) => setState(() => _communication = val)),

                    const SizedBox(height: 24),

                    // --- 7. THÔNG TIN CỦA BẠN ĐƯỢC DÙNG THẾ NÀO? (#F3E2CE, r=20) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSecondary,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Thông tin của bạn được dùng thế nào?',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Thông tin nhạy cảm bạn tự nguyện chia sẻ chỉ dùng để chuẩn bị trải nghiệm chăm sóc phù hợp và an toàn nhất.',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // --- 8. ĐỒNG Ý TỰ NGUYỆN CHECKBOX ---
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Checkbox(
                          value: _consent,
                          activeColor: AppColors.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                          onChanged: (val) => setState(() => _consent = val ?? false),
                        ),
                        const Expanded(
                          child: Text(
                            'Tôi tự nguyện đồng ý cho thông tin nhạy cảm đã chia sẻ được sử dụng với mục đích chăm sóc.',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textPrimary),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),

            // --- 9. HÀNH ĐỘNG CỐ ĐỊNH (BOTTOM BAR) ---
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: AppColors.border, width: 1.0),
                ),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _handleSave,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary, // #985018
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Lưu thông tin',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGoalOption(String title, IconData icon) {
    final isSelected = _selectedGoals.contains(title);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: InkWell(
        onTap: () {
          setState(() {
            if (isSelected) {
              _selectedGoals.remove(title);
            } else {
              _selectedGoals.add(title);
            }
          });
        },
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.surfaceSecondary : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.border,
              width: 1.0,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white : AppColors.surfaceSecondary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isSelected ? AppColors.primary : Colors.white,
                  border: Border.all(
                    color: isSelected ? AppColors.primary : AppColors.border,
                    width: 1.5,
                  ),
                ),
                child: isSelected
                    ? const Icon(Icons.check, size: 14, color: Colors.white)
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInputField(String label, String hint, TextEditingController ctrl) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: ctrl,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildPreferenceRow(String label, List<String> options, String selectedVal, Function(String) onSelect) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: options.map((opt) {
            final isChosen = selectedVal == opt;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: InkWell(
                  onTap: () => onSelect(opt),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: isChosen ? AppColors.primary : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isChosen ? AppColors.primary : AppColors.border,
                        width: 1.0,
                      ),
                    ),
                    child: Text(
                      '${isChosen ? "◉ " : "○ "}$opt',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: isChosen ? FontWeight.w600 : FontWeight.w400,
                        color: isChosen ? Colors.white : AppColors.textPrimary,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
