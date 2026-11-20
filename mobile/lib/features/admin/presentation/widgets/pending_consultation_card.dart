import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import 'quick_contact_actions.dart';

class PendingConsultationCard extends StatefulWidget {
  final AdminCandidateModel candidate;
  final VoidCallback? onViewDetail;
  final Future<void> Function(String note)? onAddConsultationNote;
  final VoidCallback? onArchiveCandidate;

  const PendingConsultationCard({
    super.key,
    required this.candidate,
    this.onViewDetail,
    this.onAddConsultationNote,
    this.onArchiveCandidate,
  });

  @override
  State<PendingConsultationCard> createState() => _PendingConsultationCardState();
}

class _PendingConsultationCardState extends State<PendingConsultationCard> {
  bool _isExpanded = false;
  bool _showAddInput = false;
  bool _isSaving = false;
  final TextEditingController _noteController = TextEditingController();

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  String _formatPrice(double amount) {
    final formatter = NumberFormat('#,###', 'vi_VN');
    return '${formatter.format(amount)} ₫';
  }

  String _formatTimestamp(String raw) {
    final dt = DateTime.tryParse(raw)?.toLocal();
    if (dt == null) return raw;
    return DateFormat('dd/MM HH:mm').format(dt);
  }

  Future<void> _submitConsultationNote() async {
    final text = _noteController.text.trim();
    if (text.isEmpty || _isSaving) return;
    setState(() => _isSaving = true);
    try {
      await widget.onAddConsultationNote?.call(text);
      if (mounted) {
        _noteController.clear();
        setState(() {
          _isSaving = false;
          _showAddInput = false;
          _isExpanded = true;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.candidate;
    final history = c.consultationHistory;
    final nextConsultNumber = history.length + 1;
    final countBadgeText = history.length <= 3
        ? 'Tư vấn ${history.length}/3'
        : 'Tư vấn lần ${history.length}';

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _isExpanded ? const Color(0xFFF59E0B) : const Color(0xFFE5E7EB),
          width: _isExpanded ? 1.4 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: _isExpanded ? 0.05 : 0.02),
            blurRadius: _isExpanded ? 8 : 3,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 9, 8, 9),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    flex: 11,
                    child: InkWell(
                      onTap: () => setState(() => _isExpanded = !_isExpanded),
                      borderRadius: BorderRadius.circular(8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            c.candidateName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.zaloFont(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Row(
                            children: [
                              const Icon(Icons.menu_book_outlined, size: 12, color: AppColors.primary),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  c.courseTitle,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.zaloFont(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              c.targetAudience,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.zaloFont(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Container(
                    width: 1,
                    margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    color: const Color(0xFFF1F5F9),
                  ),
                  Expanded(
                    flex: 10,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                decoration: BoxDecoration(
                                  color: history.length >= 3
                                      ? const Color(0xFFFEE2E2)
                                      : const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  countBadgeText,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.zaloFont(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                    color: history.length >= 3
                                        ? const Color(0xFFDC2626)
                                        : const Color(0xFFB45309),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 4),
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _isExpanded = true;
                                  _showAddInput = true;
                                });
                              },
                              borderRadius: BorderRadius.circular(6),
                              child: Container(
                                width: 22,
                                height: 22,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFF59E0B)),
                                ),
                                child: const Icon(Icons.add_rounded, size: 15, color: Color(0xFFB45309)),
                              ),
                            ),
                            const SizedBox(width: 4),
                            InkWell(
                              onTap: () => setState(() => _isExpanded = !_isExpanded),
                              borderRadius: BorderRadius.circular(6),
                              child: Container(
                                width: 22,
                                height: 22,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF3F4F6),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Icon(
                                  _isExpanded
                                      ? Icons.keyboard_arrow_up_rounded
                                      : Icons.keyboard_arrow_down_rounded,
                                  size: 16,
                                  color: AppColors.textHeading,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        InkWell(
                          onTap: () => setState(() => _isExpanded = !_isExpanded),
                          child: Text(
                            history.isNotEmpty
                                ? history.last.note
                                : 'Chưa có lịch sử tư vấn',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.zaloFont(
                              fontSize: 10.5,
                              fontStyle: history.isEmpty ? FontStyle.italic : FontStyle.normal,
                              color: history.isEmpty ? const Color(0xFF9CA3AF) : const Color(0xFF78350F),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeInOut,
            child: _isExpanded
                ? _buildExpandedDetails(c, history, nextConsultNumber)
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildExpandedDetails(
    AdminCandidateModel c,
    List<AdminConsultationNoteModel> history,
    int nextConsultNumber,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Divider(height: 1, color: Color(0xFFF1F5F9)),
        Padding(
          padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 10,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'THÔNG TIN HỌC VIÊN',
                        style: AppTypography.zaloFont(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                          letterSpacing: 0.4,
                        ),
                      ),
                      const SizedBox(height: 6),
                      _buildMiniInfoLine(
                        'Mã hồ sơ:',
                        (c.studentCode != null && c.studentCode!.isNotEmpty) ? c.studentCode! : c.orderCode,
                      ),
                      if (c.candidatePhone.isNotEmpty) _buildMiniInfoLine('SĐT:', c.candidatePhone),
                      if (c.candidateEmail != null && c.candidateEmail!.isNotEmpty)
                        _buildMiniInfoLine('Email:', c.candidateEmail!),
                      _buildMiniInfoLine('Khóa học:', c.courseTitle),
                      _buildMiniInfoLine('Đối tượng:', c.targetAudience),
                      _buildMiniInfoLine('Học phí:', _formatPrice(c.tuitionTotal)),
                      if (c.notes != null && c.notes!.isNotEmpty) _buildMiniInfoLine('Ghi chú:', c.notes!),
                      if (c.candidatePhone.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        QuickContactActions(phone: c.candidatePhone, compact: true),
                      ],
                    ],
                  ),
                ),
                Container(
                  width: 1,
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                  color: const Color(0xFFF1F5F9),
                ),
                Expanded(
                  flex: 11,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'LỊCH SỬ TƯ VẤN',
                              style: AppTypography.zaloFont(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFB45309),
                                letterSpacing: 0.4,
                              ),
                            ),
                          ),
                          InkWell(
                            onTap: () => setState(() => _showAddInput = !_showAddInput),
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFF59E0B)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.add_rounded, size: 13, color: Color(0xFFB45309)),
                                  const SizedBox(width: 2),
                                  Text(
                                    'Lần $nextConsultNumber',
                                    style: AppTypography.zaloFont(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFFB45309),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      if (_showAddInput) _buildAddConsultationForm(nextConsultNumber),
                      if (history.isEmpty && !_showAddInput)
                        Text(
                          'Chưa có ghi chú tư vấn. Bấm + để thêm.',
                          style: AppTypography.zaloFont(fontSize: 10.5, color: AppColors.textSecondary),
                        )
                      else
                        ...history.asMap().entries.map((entry) {
                          final idx = entry.key + 1;
                          final item = entry.value;
                          return Container(
                            width: double.infinity,
                            margin: const EdgeInsets.only(bottom: 5),
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFFBEB),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFFDE68A)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Tư vấn lần $idx',
                                      style: AppTypography.zaloFont(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF92400E),
                                      ),
                                    ),
                                    Text(
                                      _formatTimestamp(item.timestamp),
                                      style: AppTypography.zaloFont(fontSize: 9.5, color: AppColors.textSecondary),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  item.note,
                                  style: AppTypography.zaloFont(fontSize: 11, color: AppColors.textHeading),
                                ),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const Divider(height: 1, color: Color(0xFFF1F5F9)),
        Padding(
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 9),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: widget.onArchiveCandidate,
                  icon: const Icon(Icons.archive_outlined, size: 15),
                  label: Text(
                    'Cho vào lưu trữ',
                    style: AppTypography.zaloFont(fontSize: 11.5, fontWeight: FontWeight.w700),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF4B5563),
                    backgroundColor: const Color(0xFFF9FAFB),
                    side: const BorderSide(color: Color(0xFFD1D5DB)),
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                    minimumSize: const Size(0, 34),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              if (widget.onViewDetail != null) ...[
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: widget.onViewDetail,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: Color(0xFFBFDBFE)),
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                    minimumSize: const Size(0, 34),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text(
                    'Hồ sơ',
                    style: AppTypography.zaloFont(fontSize: 11.5, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAddConsultationForm(int nextConsultNumber) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: const Color(0xFFFEFCE8),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFF59E0B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tư vấn lần $nextConsultNumber',
            style: AppTypography.zaloFont(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF92400E),
            ),
          ),
          const SizedBox(height: 5),
          TextField(
            controller: _noteController,
            enabled: !_isSaving,
            maxLines: 2,
            style: AppTypography.zaloFont(fontSize: 11.5),
            decoration: InputDecoration(
              hintText: 'Nhập nội dung tư vấn lần $nextConsultNumber...',
              hintStyle: AppTypography.zaloFont(fontSize: 10.5, color: const Color(0xFF9CA3AF)),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: _isSaving
                    ? null
                    : () => setState(() {
                          _showAddInput = false;
                          _noteController.clear();
                        }),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  'Hủy',
                  style: AppTypography.zaloFont(fontSize: 10.5, color: AppColors.textSecondary),
                ),
              ),
              const SizedBox(width: 6),
              ElevatedButton(
                onPressed: _isSaving ? null : _submitConsultationNote,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD97706),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                ),
                child: _isSaving
                    ? const SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        'Lưu',
                        style: AppTypography.zaloFont(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniInfoLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: RichText(
        text: TextSpan(
          style: AppTypography.zaloFont(fontSize: 10.5, color: AppColors.textHeading),
          children: [
            TextSpan(
              text: '$label ',
              style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600),
            ),
            TextSpan(text: value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
