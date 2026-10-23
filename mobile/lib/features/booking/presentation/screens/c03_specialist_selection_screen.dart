import 'package:flutter/material.dart';
import '../../../directory/presentation/screens/b08_specialist_profile_screen.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/technician_repository.dart';
import '../../data/models/booking_models.dart';
import '../widgets/group_c_widgets.dart';
import 'c04_datetime_selection_screen.dart';

/// Screen C03: Chọn chuyên viên [8111:26759]
/// Tải dữ liệu kỹ thuật viên thực tế từ Supabase PostgreSQL Database
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
  List<TechnicianModel> _allSpecialists = [];
  bool _isLoading = true;
  String _selectedExpertise = 'Tất cả chuyên môn';
  final List<String> _expertiseOptions = ['Tất cả chuyên môn'];

  @override
  void initState() {
    super.initState();

    // Khởi tạo tức thì từ cache nếu có sẵn để tránh giật lag UI
    if (TechnicianRepository.instance.cachedTechnicians.isNotEmpty) {
      _allSpecialists = List.from(TechnicianRepository.instance.cachedTechnicians);
      _isLoading = false;
      _updateExpertiseOptions();
    }

    // Mặc định chọn chuyên viên đầu tiên nếu chưa có
    if (!widget.flowState.autoAssignSpecialist &&
        widget.flowState.selectedSpecialist == null &&
        _allSpecialists.isNotEmpty) {
      widget.flowState.selectedSpecialist = _allSpecialists.first;
    }

    _loadSpecialists();
  }

  void _updateExpertiseOptions() {
    final Set<String> options = {'Tất cả chuyên môn'};

    for (final spec in _allSpecialists) {
      for (final s in spec.specialties) {
        final trimmed = s.trim();
        if (trimmed.isNotEmpty && trimmed.length <= 35) {
          options.add(trimmed);
        }
      }
      final specField = spec.speciality.trim();
      if (specField.isNotEmpty && specField.length <= 35) {
        options.add(specField);
      }
    }

    _expertiseOptions.clear();
    _expertiseOptions.addAll(options);

    if (!_expertiseOptions.contains(_selectedExpertise)) {
      _selectedExpertise = 'Tất cả chuyên môn';
    }
  }

  Future<void> _loadSpecialists() async {
    setState(() => _isLoading = true);
    final branchId = widget.flowState.selectedBranch?.id;
    final liveSpecialists = await TechnicianRepository.instance.getTechnicians(branchId: branchId);
    if (mounted) {
      setState(() {
        _allSpecialists = liveSpecialists;
        _isLoading = false;
        _updateExpertiseOptions();

        // Đồng bộ lại selectedSpecialist nếu đang trỏ tới mock specialist (4444...)
        // hoặc specialist không tồn tại trong danh sách Supabase mới tải
        if (!widget.flowState.autoAssignSpecialist && _allSpecialists.isNotEmpty) {
          final currentId = widget.flowState.selectedSpecialist?.id;
          final isMock = currentId == null || currentId.startsWith('4444');
          final match = _allSpecialists.where((s) => s.id == currentId).firstOrNull;
          if (match != null) {
            widget.flowState.selectedSpecialist = match;
          } else if (isMock) {
            widget.flowState.selectedSpecialist = _allSpecialists.first;
          }
        }
      });
    }
  }

  List<TechnicianModel> get _filteredSpecialists {
    if (_selectedExpertise == 'Tất cả chuyên môn') {
      return _allSpecialists;
    }
    final filter = _selectedExpertise.toLowerCase().trim();
    return _allSpecialists.where((spec) {
      final specMatches = spec.specialties.any(
        (s) => s.toLowerCase().contains(filter) || filter.contains(s.toLowerCase()),
      );
      final titleMatches = spec.title.toLowerCase().contains(filter);
      final fieldMatches = spec.speciality.toLowerCase().contains(filter) ||
          filter.contains(spec.speciality.toLowerCase());
      return specMatches || titleMatches || fieldMatches;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isAuto = widget.flowState.autoAssignSpecialist;
    final selectedSpecialist = widget.flowState.selectedSpecialist;
    final branchName = widget.flowState.selectedBranch?.name;

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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Lọc theo chuyên môn',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: BookingColors.textPrimary,
                        ),
                      ),
                      if (branchName != null)
                        Flexible(
                          child: Text(
                            branchName,
                            style: const TextStyle(
                              fontSize: 12,
                              color: BookingColors.primary,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
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
                              overflow: TextOverflow.ellipsis,
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
                  const SizedBox(height: 16),

                  if (_isLoading && _allSpecialists.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 36),
                      child: Center(
                        child: CircularProgressIndicator(color: BookingColors.primary),
                      ),
                    )
                  else if (_allSpecialists.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text(
                          'Chưa có dữ liệu chuyên viên từ cơ sở dữ liệu.',
                          style: TextStyle(color: BookingColors.textSecondary, fontSize: 14),
                        ),
                      ),
                    )
                  else if (_filteredSpecialists.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Column(
                          children: [
                            const Text(
                              'Không có chuyên viên phù hợp với chuyên môn đã chọn.',
                              style: TextStyle(color: BookingColors.textSecondary, fontSize: 14),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () => setState(() => _selectedExpertise = 'Tất cả chuyên môn'),
                              child: const Text('Xem tất cả chuyên môn'),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ..._filteredSpecialists.map((spec) {
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
              summaryText: isAuto
                  ? 'Đang chọn: Để trung tâm sắp xếp'
                  : 'Đang chọn: ${selectedSpecialist?.name ?? "Chưa chọn chuyên viên"}',
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
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => B08SpecialistProfileScreen(
                              name: specialist.name,
                              role: specialist.title,
                              avatar: specialist.avatarUrl,
                            ),
                          ),
                        );
                      },
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
