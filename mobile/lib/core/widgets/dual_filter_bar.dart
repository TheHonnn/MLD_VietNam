import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

enum DualFilterSide { left, right }

class DualFilterBar extends StatelessWidget {
  final String leftLabel;
  final String rightLabel;
  final bool isLeftSelected;
  final bool isRightSelected;
  final DualFilterSide? expandedSide;
  final String leftPanelTitle;
  final String rightPanelTitle;
  final List<String> leftOptions;
  final List<String> rightOptions;
  final String selectedLeftValue;
  final String selectedRightValue;
  final VoidCallback onToggleLeft;
  final VoidCallback onToggleRight;
  final ValueChanged<String> onSelectLeft;
  final ValueChanged<String> onSelectRight;
  final String Function(String value)? optionLabelBuilder;
  final EdgeInsetsGeometry buttonRowPadding;
  final Color buttonRowBackgroundColor;
  final BorderRadius? panelBorderRadius;

  const DualFilterBar({
    super.key,
    required this.leftLabel,
    required this.rightLabel,
    required this.isLeftSelected,
    required this.isRightSelected,
    required this.expandedSide,
    required this.leftPanelTitle,
    required this.rightPanelTitle,
    required this.leftOptions,
    required this.rightOptions,
    required this.selectedLeftValue,
    required this.selectedRightValue,
    required this.onToggleLeft,
    required this.onToggleRight,
    required this.onSelectLeft,
    required this.onSelectRight,
    this.optionLabelBuilder,
    this.buttonRowPadding = const EdgeInsets.fromLTRB(16, 0, 16, 10),
    this.buttonRowBackgroundColor = Colors.white,
    this.panelBorderRadius,
  });

  Widget _buildPillButton({
    required String label,
    required bool isExpanded,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: isExpanded ? const Color(0xFFEFF6FF) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: isExpanded || isSelected
                        ? AppColors.primary
                        : AppColors.textPrimary,
                  ),
                ),
              ),
              Icon(
                isExpanded
                    ? Icons.keyboard_arrow_up_rounded
                    : Icons.keyboard_arrow_down_rounded,
                size: 18,
                color: isExpanded || isSelected
                    ? AppColors.primary
                    : AppColors.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeOptions = expandedSide == DualFilterSide.left ? leftOptions : rightOptions;
    final activeValue = expandedSide == DualFilterSide.left ? selectedLeftValue : selectedRightValue;
    final panelTitle = expandedSide == DualFilterSide.left ? leftPanelTitle : rightPanelTitle;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          color: buttonRowBackgroundColor,
          padding: buttonRowPadding,
          child: Row(
            children: [
              _buildPillButton(
                label: leftLabel,
                isExpanded: expandedSide == DualFilterSide.left,
                isSelected: isLeftSelected,
                onTap: onToggleLeft,
              ),
              const SizedBox(width: 10),
              _buildPillButton(
                label: rightLabel,
                isExpanded: expandedSide == DualFilterSide.right,
                isSelected: isRightSelected,
                onTap: onToggleRight,
              ),
            ],
          ),
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          child: expandedSide == null
              ? const SizedBox.shrink()
              : Container(
                  width: double.infinity,
                  margin: panelBorderRadius != null
                      ? const EdgeInsets.only(top: 8)
                      : EdgeInsets.zero,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: panelBorderRadius,
                    border: panelBorderRadius != null
                        ? Border.all(color: AppColors.border)
                        : const Border(
                            bottom: BorderSide(color: AppColors.border),
                          ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        panelTitle,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: activeOptions.map((cat) {
                          final isSelected = cat == activeValue;
                          final displayText =
                              optionLabelBuilder != null ? optionLabelBuilder!(cat) : cat;
                          return InkWell(
                            onTap: () {
                              if (expandedSide == DualFilterSide.left) {
                                onSelectLeft(cat);
                              } else {
                                onSelectRight(cat);
                              }
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFF003876) : Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Text(
                                displayText,
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                  color: isSelected ? Colors.white : AppColors.textPrimary,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
        ),
      ],
    );
  }
}
