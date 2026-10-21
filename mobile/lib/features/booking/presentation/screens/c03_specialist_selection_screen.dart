import 'package:flutter/material.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/mock_home_repository.dart';
import '../../../home/data/repositories/technician_repository.dart';
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
  bool _isLoading = false;
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

    // Mặc định chọn chuyên viên đầu tiên phù hợp nếu chưa có
    if (!widget.flowState.autoAssignSpecialist &&
        widget.flowState.selectedSpecialist == null &&
        _allSpecialists.isNotEmpty) {
      widget.flowState.selectedSpecialist = _allSpecialists.first;
    }

    _loadSpecialists();
  }

  Future<void> _loadSpecialists() async {
    setState(() => _isLoading = true);
    final branchId = widget.flowState.selectedBranch?.id;
    final liveSpecialists = await TechnicianRepository.instance.getTechnicians(branchId: branchId);
    if (mounted) {
      setState(() {
        _allSpecialists = liveSpecialists;
        _isLoading = false;
        if (!widget.flowState.autoAssignSpecialist &&
            widget.flowState.selectedSpecialist == null &&
            _allSpecialists.isNotEmpty) {
          widget.flowState.selectedSpecialist = _allSpecialists.first;
        }
      });
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
                  if (_isLoading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Center(
                        child: CircularProgressIndicator(color: BookingColors.primary),
                      ),
                    )
                  else if (_allSpecialists.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text(
                          'Chưa có dữ liệu chuyên viên.',
                          style: TextStyle(color: BookingColors.textSecondary, fontSize: 14),
                        ),
                      ),
                    )
                  else
                    ..._allSpecialists.map((spec) {
                      final isSelected = !isAuto && selectedSpecialist?.id == spec.id;
                      final tagline = spec.specialties.isNotEmpty
                          ? spec.specialties.join(' · ')
                          : spec.speciality;
                      final conditionNote = '${spec.clinicName} · ${spec.experienceYears} năm KN · ⭐ ${spec.rating.toStringAsFixed(1)} (${spec.reviewCount})';

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 20),
                        child: _buildSpecialistCard(
                          specialist: spec,
                          isQualified: true,
                          isSelected: isSelected,
                          radioLabel: isSelected ? 'Chuyên viên đã chọn' : 'Chọn chuyên viên này',
                          tagline: tagline,
                          conditionNote: conditionNote,
                          onSelect: () {
                            setState(() {
                              widget.flowState.autoAssignSpecialist = false;
                              widget.flowState.selectedSpecialist = spec;
                            });
                          },
                        ),
                      );
                    }),
                  const SizedBox(height: 12),

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
                        child: specialist.avatarUrl.startsWith('http')
                            ? Image.network(
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
                              )
                            : Image.asset(
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
