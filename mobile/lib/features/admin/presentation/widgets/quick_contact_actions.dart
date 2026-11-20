import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_typography.dart';

class QuickContactActions extends StatelessWidget {
  final String phone;
  final bool compact;

  const QuickContactActions({
    super.key,
    required this.phone,
    this.compact = true,
  });

  Future<void> _launch(Uri uri) async {
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  String _cleanDigits(String raw) => raw.replaceAll(RegExp(r'[^0-9+]'), '');

  @override
  Widget build(BuildContext context) {
    final clean = _cleanDigits(phone);
    if (clean.isEmpty) return const SizedBox.shrink();

    if (compact) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildIconPill(
            tooltip: 'Gọi điện',
            icon: Icons.phone_rounded,
            color: const Color(0xFF0D6832),
            bgColor: const Color(0xFFE8F6ED),
            onTap: () => _launch(Uri.parse('tel:$clean')),
          ),
          const SizedBox(width: 4),
          _buildIconPill(
            tooltip: 'Nhắn SMS',
            icon: Icons.sms_rounded,
            color: const Color(0xFF0284C7),
            bgColor: const Color(0xFFE0F2FE),
            onTap: () => _launch(Uri.parse('sms:$clean')),
          ),
          const SizedBox(width: 4),
          _buildTextPill(
            label: 'Zalo',
            color: const Color(0xFF0068FF),
            bgColor: const Color(0xFFEFF6FF),
            onTap: () => _launch(Uri.parse('https://zalo.me/$clean')),
          ),
        ],
      );
    }

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _launch(Uri.parse('tel:$clean')),
            icon: const Icon(Icons.phone_rounded, size: 15),
            label: Text('Gọi điện', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF0D6832),
              side: const BorderSide(color: Color(0xFF0D6832)),
              padding: const EdgeInsets.symmetric(vertical: 9),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _launch(Uri.parse('sms:$clean')),
            icon: const Icon(Icons.sms_rounded, size: 15),
            label: Text('SMS', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF0284C7),
              side: const BorderSide(color: Color(0xFF0284C7)),
              padding: const EdgeInsets.symmetric(vertical: 9),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _launch(Uri.parse('https://zalo.me/$clean')),
            icon: const Icon(Icons.chat_bubble_rounded, size: 15),
            label: Text('Zalo', style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF0068FF),
              side: const BorderSide(color: Color(0xFF0068FF)),
              padding: const EdgeInsets.symmetric(vertical: 9),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildIconPill({
    required String tooltip,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: Container(
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Icon(icon, color: color, size: 14),
        ),
      ),
    );
  }

  Widget _buildTextPill({
    required String label,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: AppTypography.zaloFont(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ),
    );
  }
}
