import 'package:flutter/material.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/mock_home_repository.dart';
import '../../data/models/booking_models.dart';
import '../widgets/group_c_widgets.dart';
import 'c04_datetime_selection_screen.dart';

/// Screen C03: Chọn chuyên viên [8111:26759]
class C03SpecialistSelectionScreen extends StatefulWidget {
  final BookingFlowState flowState;

  const C03SpecialistSelectionScreen({
    super.key,
    required this.flowState,
  });

  @override
  State<C03SpecialistSelectionScreen> createState() => _C03SpecialistSelectionScreenState();
}

class _C03SpecialistSelectionScreenState extends State<C03SpecialistSelectionScreen> {
  late List<TechnicianModel> _allSpecialists;
  String _selectedExpertise = 'Massage · Chi nhánh Quận 3';

  final List<String> _expertiseOptions = [
    'Massage · Chi nhánh Quận 3',
    'Tất cả chuyên môn',
    'Chăm sóc da',
    'Chăm sóc cơ thể',
  ];

  @override
  void initState() {
    super.initState();
    _allSpecialists = MockHomeRepository.getTopTechnicians();

    // Mặc định chọn chuyên viên đầu tiên phù hợp (Trần Minh Phương) nếu chưa có
    if (!widget.flowState.autoAssignSpecialist &&
        widget.flowState.selectedSpecialist == null &&
        _allSpecialists.isNotEmpty) {
      widget.flowState.selectedSpecialist = _allSpecialists.first;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuto = widget.flowState.autoAssignSpecialist;
    final selectedSpecialist = widget.flowState.selectedSpecialist;

    return Scaffold(
      backgroundColor: BookingColors.background,
      appBar: const BookingAppBar(),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                children: [
                  const SizedBox(height: 8),
                  const BookingHeaderSection(
                    title: 'Chọn chuyên viên',
                    subtitle: 'Chọn người đồng hành cùng bạn trong buổi chăm sóc.',
                    currentStep: 2,
                  ),

                  // SpecialistRadioCard / Tự động sắp xếp (350x172)
                  InkWell(
                    onTap: () {
                      setState(() {
                        widget.flowState.autoAssignSpecialist = true;
                        widget.flowState.selectedSpecialist = null;
                      });
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isAuto ? BookingColors.cardWarm : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: BookingColors.cardBorder,
                          width: 1.0,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isAuto ? BookingColors.primary : Colors.white,
                                  border: Border.all(
                                    color: BookingColors.primary,
                                    width: 1.5,
                                  ),
                                ),
                                child: isAuto
                                    ? const Icon(Icons.check, size: 14, color: Colors.white)
                                    : null,
                              ),
                              const SizedBox(width: 12),
                              const Text(
                                'Để trung tâm sắp xếp',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w400,
                                  color: BookingColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'Hệ thống sẽ lựa chọn chuyên viên phù hợp với dịch vụ và lịch hẹn.',
                            style: TextStyle(
                              fontSize: 14,
                              color: BookingColors.textPrimary,
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Đội ngũ chuyên viên được phân công phù hợp với dịch vụ của bạn.',
                            style: TextStyle(
                              fontSize: 12,
                              color: BookingColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Dropdown: Lọc theo chuyên môn
                  const Text(
                    'Lọc theo chuyên môn',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: BookingColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    height: 52,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: BookingColors.cardBorder),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedExpertise,
                        isExpanded: true,
                        icon: const Icon(Icons.keyboard_arrow_down, color: BookingColors.heading),
                        items: _expertiseOptions.map((e) {
                          return DropdownMenuItem<String>(
                            value: e,
                            child: Text(
                              e,
                              style: const TextStyle(fontSize: 14, color: BookingColors.textPrimary),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedExpertise = val);
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Thẻ 1: SpecialistRadioCard / Đang chọn (Trần Minh Phương - Đủ chuyên môn)
                  _buildSpecialistCard(
                    specialist: _allSpecialists.isNotEmpty
                        ? _allSpecialists.first
                        : MockHomeRepository.getTopTechnicians().first,
                    isQualified: true,
                    isSelected: !isAuto &&
                        selectedSpecialist?.id ==
                            (_allSpecialists.isNotEmpty ? _allSpecialists.first.id : 'spec-001'),
                    radioLabel: 'Chuyên viên ưu tiên',
                    tagline: 'Massage thư giãn · Chăm sóc tận tâm',
                    conditionNote:
                        'Chi nhánh Quận 3 · Chuyên môn massage trị liệu và phục hồi',
                    onSelect: () {
                      setState(() {
                        widget.flowState.autoAssignSpecialist = false;
                        widget.flowState.selectedSpecialist =
                            _allSpecialists.isNotEmpty ? _allSpecialists.first : null;
                      });
                    },
                  ),
                  const SizedBox(height: 24),

                  // Thẻ 2: SpecialistRadioCard / Không đủ chuyên môn (Nguyễn Thu Hà - Chăm sóc da)
                  _buildSpecialistCard(
                    specialist: _allSpecialists.length > 1
                        ? _allSpecialists[1]
                        : MockHomeRepository.getTopTechnicians()[1],
                    isQualified: false,
                    isSelected: false,
                    radioLabel: 'Chưa đủ điều kiện phân công',
                    tagline: 'Chăm sóc da · Quy trình làm sạch dịu nhẹ',
                    conditionNote:
                        'Nguyễn Thu Hà chuyên sâu về chăm sóc và phục hồi da',
                    onSelect: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Chuyên viên này phụ trách chuyên sâu dịch vụ chăm sóc da mặt.'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // Thẻ 3: SpecialistRadioCard / Không đủ chuyên môn (Lê Hoài An - Chăm sóc cơ thể)
                  _buildSpecialistCard(
                    specialist: _allSpecialists.length > 2
                        ? _allSpecialists[2]
                        : MockHomeRepository.getTopTechnicians().last,
                    isQualified: false,
                    isSelected: false,
                    radioLabel: 'Chưa đủ điều kiện phân công',
                    tagline: 'Chăm sóc cơ thể · Thư giãn toàn thân',
                    conditionNote:
                        'Lê Hoài An chuyên sâu về chăm sóc và thư giãn cơ thể',
                    onSelect: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Chuyên viên này phụ trách chuyên sâu dịch vụ chăm sóc da mặt.'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // Thẻ Ghi chú
                  const IllustrationNoteCard(
                    text:
                        'Chọn chuyên viên phù hợp với nhu cầu và khung giờ mong muốn.',
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),

            // Fixed Bottom Bar
            BookingFixedBottomBar(
              buttonText: 'Chọn ngày và giờ',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => C04DateTimeSelectionScreen(flowState: widget.flowState),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpecialistCard({
    required TechnicianModel specialist,
    required bool isQualified,
    required bool isSelected,
    required String radioLabel,
    required String tagline,
    required String conditionNote,
    required VoidCallback onSelect,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isSelected ? BookingColors.cardWarm : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: BookingColors.cardBorder,
          width: 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Radio Header cao 44px
          InkWell(
            onTap: onSelect,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            child: Container(
              height: 44,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isSelected ? BookingColors.primary : Colors.white,
                      border: Border.all(
                        color: BookingColors.primary,
                        width: 1.5,
                      ),
                    ),
                    child: isSelected
                        ? const Icon(Icons.check, size: 14, color: Colors.white)
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      radioLabel,
                      style: const TextStyle(
                        fontSize: 14,
                        color: BookingColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Khối Thông tin chuyên viên bên trong (fill=white, r=20)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.asset(
                          specialist.avatarUrl,
                          width: 88,
                          height: 104,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 88,
                            height: 104,
                            color: BookingColors.cardWarm,
                            child: const Icon(Icons.person, color: BookingColors.primary, size: 36),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              specialist.name,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: BookingColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              specialist.title,
                              style: const TextStyle(
                                fontSize: 14,
                                color: BookingColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Thông tin chuyên viên',
                              style: TextStyle(
                                fontSize: 12,
                                color: BookingColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    tagline,
                    style: const TextStyle(
                      fontSize: 14,
                      color: BookingColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: TextButton(
                      onPressed: onSelect,
                      style: TextButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Xem hồ sơ',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.primary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Điều kiện phân công
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Text(
              conditionNote,
              style: TextStyle(
                fontSize: 12,
                color: isQualified ? BookingColors.primary : BookingColors.textSecondary,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
