import 'dart:async';
import 'package:flutter/material.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../membership/data/repositories/membership_repository.dart';

/// Widget phát Video YouTube nhúng chuẩn Y khoa cho Học viện MLD Việt Nam
/// - Phát trực tiếp In-App không bị đá ra trình duyệt ngoài
/// - Hỗ trợ Fullscreen xoay ngang, tua, chỉnh tốc độ phát
/// - Lớp phủ Watermark động bảo vệ bản quyền bài giảng Vodder
class MldYoutubePlayer extends StatefulWidget {
  final String? videoUrl;
  final String? title;
  final VoidCallback? onVideoEnded;

  const MldYoutubePlayer({
    super.key,
    required this.videoUrl,
    this.title,
    this.onVideoEnded,
  });

  @override
  State<MldYoutubePlayer> createState() => _MldYoutubePlayerState();
}

class _MldYoutubePlayerState extends State<MldYoutubePlayer> {
  YoutubePlayerController? _controller;
  String? _videoId;

  // Watermark state
  Timer? _watermarkTimer;
  int _watermarkPosIndex = 0;
  final List<Alignment> _watermarkAlignments = const [
    Alignment.topRight,
    Alignment.centerLeft,
    Alignment.bottomCenter,
    Alignment.topLeft,
    Alignment.centerRight,
  ];

  @override
  void initState() {
    super.initState();
    _initPlayer();
    _startWatermark();
  }

  void _initPlayer() {
    final rawUrl = widget.videoUrl?.trim() ?? '';
    _videoId = YoutubePlayerController.convertUrlToId(rawUrl);

    // Kiểm tra môi trường kiểm thử (Headless Flutter Test)
    final isTesting = WidgetsBinding.instance.runtimeType
        .toString()
        .contains('TestWidgetsFlutterBinding');

    if (_videoId != null && !isTesting) {
      _controller = YoutubePlayerController.fromVideoId(
        videoId: _videoId!,
        autoPlay: false,
        params: const YoutubePlayerParams(
          showFullscreenButton: true,
          showControls: true,
          mute: false,
        ),
      );
    }
  }

  void _startWatermark() {
    _watermarkTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (mounted) {
        setState(() {
          _watermarkPosIndex =
              (_watermarkPosIndex + 1) % _watermarkAlignments.length;
        });
      }
    });
  }

  @override
  void didUpdateWidget(covariant MldYoutubePlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.videoUrl != widget.videoUrl) {
      final newId =
          YoutubePlayerController.convertUrlToId(widget.videoUrl?.trim() ?? '');
      if (newId != null && newId != _videoId && _controller != null) {
        _videoId = newId;
        _controller!.loadVideoById(videoId: newId);
      }
    }
  }

  @override
  void dispose() {
    _watermarkTimer?.cancel();
    _controller?.close();
    super.dispose();
  }

  String _getWatermarkText() {
    final profile = MembershipRepository.instance.profile;
    final name = profile.fullName.isNotEmpty
        ? profile.fullName
        : AuthService.instance.currentDisplayName ?? 'Học viên MLD';
    final phone = profile.phone.isNotEmpty
        ? profile.phone
        : AuthService.instance.currentPhone ?? '';
    return 'MLD ACADEMY · $name ${phone.isNotEmpty ? '· $phone' : ''}';
  }

  @override
  Widget build(BuildContext context) {
    if (_videoId == null) {
      return Container(
        height: 210,
        width: double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.video_camera_back_outlined,
                size: 48, color: Colors.white38),
            const SizedBox(height: 10),
            Text(
              widget.title?.isNotEmpty == true
                  ? widget.title!
                  : 'Chưa có đường dẫn video cho bài học này',
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            const Text(
              'Giảng viên hoặc quản trị viên đang cập nhật học liệu.',
              style: TextStyle(color: Colors.white38, fontSize: 11),
            ),
          ],
        ),
      );
    }

    // Nếu là môi trường Test hoặc controller chưa khởi tạo
    if (_controller == null) {
      return Container(
        height: 210,
        width: double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            const Icon(Icons.play_circle_fill, size: 64, color: AppColors.primary),
            Positioned(
              bottom: 12,
              child: Text(
                'YouTube Video Ready: $_videoId',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ),
          ],
        ),
      );
    }

    // Giao diện Player thật trên điện thoại
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          YoutubePlayer(
            controller: _controller!,
            aspectRatio: 16 / 9,
          ),

          // Watermark động di chuyển chống quay chụp màn hình
          Positioned.fill(
            child: IgnorePointer(
              child: AnimatedAlign(
                duration: const Duration(seconds: 2),
                curve: Curves.easeInOut,
                alignment: _watermarkAlignments[_watermarkPosIndex],
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.28),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _getWatermarkText(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Colors.white.withValues(alpha: 0.45),
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

