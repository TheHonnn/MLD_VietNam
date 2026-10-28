import 'dart:async';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/app_security_service.dart';
import '../../../../core/services/auth_service.dart';
import '../../../membership/data/repositories/membership_repository.dart';

/// Widget phát Video YouTube nhúng chuẩn Y khoa cho Học viện MLD Việt Nam
/// - Phát trực tiếp In-App không bị đá ra trình duyệt ngoài
/// - Hỗ trợ Fullscreen xoay ngang, tua, chỉnh tốc độ phát
/// - Lớp phủ Watermark động bảo vệ bản quyền bài giảng Vodder
class MldYoutubePlayer extends StatefulWidget {
  final String? videoUrl;
  final String? title;
  final String? courseId;
  final String? lessonId;
  final VoidCallback? onVideoEnded;
  final void Function(double position, double duration)? onProgressUpdate;
  final double initialPosition;

  const MldYoutubePlayer({
    super.key,
    required this.videoUrl,
    this.title,
    this.courseId,
    this.lessonId,
    this.onVideoEnded,
    this.onProgressUpdate,
    this.initialPosition = 0.0,
  });

  @override
  State<MldYoutubePlayer> createState() => _MldYoutubePlayerState();
}

class _MldYoutubePlayerState extends State<MldYoutubePlayer> {
  YoutubePlayerController? _controller;
  String? _videoId;

  // Watermark & Progress state
  Timer? _watermarkTimer;
  Timer? _progressTimer;
  int _watermarkPosIndex = 0;
  double _maxWatchedPosition = 0.0;
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
    // Kích hoạt chống quay chụp màn hình trên thiết bị
    AppSecurityService.instance.enableSecureScreen();
    _initPlayer();
    _startWatermark();
  }

  static String? _extractVideoId(String? url) {
    if (url == null || url.trim().isEmpty) return null;
    final trimmed = url.trim();
    final direct = YoutubePlayerController.convertUrlToId(trimmed);
    if (direct != null && direct.length == 11) return direct;

    final regExp = RegExp(
      r'(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_\-]{11})',
      caseSensitive: false,
    );
    final match = regExp.firstMatch(trimmed);
    if (match != null && match.groupCount >= 1) {
      return match.group(1);
    }
    return direct;
  }

  void _initPlayer() {
    _videoId = _extractVideoId(widget.videoUrl);

    // Kiểm tra môi trường kiểm thử (Headless Flutter Test)
    final isTesting = WidgetsBinding.instance.runtimeType
        .toString()
        .contains('TestWidgetsFlutterBinding');

    if (_videoId != null && !isTesting) {
      _controller = YoutubePlayerController.fromVideoId(
        videoId: _videoId!,
        autoPlay: true,
        params: const YoutubePlayerParams(
          showFullscreenButton: true,
          showControls: true,
          mute: false,
        ),
      );

      if (widget.initialPosition > 0) {
        _maxWatchedPosition = widget.initialPosition;
        _controller!.seekTo(seconds: widget.initialPosition, allowSeekAhead: true);
      }

      _controller!.listen((state) async {
        if (state.playerState == PlayerState.ended) {
          try {
            final dur = await _controller!.duration;
            // Chống gian lận: Chỉ chấp nhận hoàn thành khi đã thực sự xem qua ít nhất 85% clip
            if (dur <= 0 || _maxWatchedPosition >= dur * 0.85) {
              widget.onVideoEnded?.call();
            }
          } catch (_) {
            widget.onVideoEnded?.call();
          }
        }
      });

      // Tự động kiểm tra tiến trình xem của học viên và lưu lại
      _progressTimer = Timer.periodic(const Duration(seconds: 2), (_) async {
        if (_controller != null && mounted) {
          try {
            final pos = await _controller!.currentTime;
            final dur = await _controller!.duration;
            if (pos > 0) {
              // Cập nhật vị trí xem cao nhất hợp lệ (pos không nhảy vọt quá 5s so với vị trí đã xem)
              if (pos <= _maxWatchedPosition + 5.0) {
                if (pos > _maxWatchedPosition) {
                  _maxWatchedPosition = pos;
                }
              }
              widget.onProgressUpdate?.call(pos, dur);

              // Chống gian lận: Chỉ kích hoạt hoàn thành khi đến cuối VÀ đã theo dõi tối thiểu 85% nội dung
              if (dur > 0 && pos >= dur - 1.5) {
                if (_maxWatchedPosition >= dur * 0.85) {
                  widget.onVideoEnded?.call();
                }
              }
            }
          } catch (_) {}
        }
      });
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
      final newId = _extractVideoId(widget.videoUrl);
      if (newId != null && newId != _videoId && _controller != null) {
        _videoId = newId;
        _controller!.loadVideoById(videoId: newId);
      }
    }
  }

  @override
  void dispose() {
    _progressTimer?.cancel();
    _watermarkTimer?.cancel();
    _controller?.close();
    super.dispose();
  }

  String _getWatermarkText() {
    final email = AuthService.instance.lastLoginEmail ?? 'buih73444@gmail.com';
    final userId = AuthService.instance.currentUserId ?? '4ee38f82-bb0a';
    final displayId = userId.length >= 8 ? userId.substring(0, 8).toUpperCase() : userId.toUpperCase();
    final profile = MembershipRepository.instance.profile;
    final phone = profile.phone.isNotEmpty
        ? profile.phone
        : AuthService.instance.currentPhone ?? '';
    return 'MLD BẢN QUYỀN · ID: $displayId · $email${phone.isNotEmpty ? ' · $phone' : ''}';
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
              'Hệ thống đang cập nhật video bài giảng.',
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

    // Giao diện Player thật trên điện thoại kết hợp bảo mật chống chuột phải & Watermark theo ID
    return Listener(
      onPointerDown: (PointerDownEvent event) {
        // Chống nhấp chuột phải trên chuột/bàn di chuột
        if (event.kind == PointerDeviceKind.mouse && event.buttons == kSecondaryMouseButton) {
          // Nuốt sự kiện chuột phải, ngăn menu ngữ cảnh tải video
          return;
        }
      },
      child: Container(
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

            // Watermark góc mờ cố định chống crop
            Positioned(
              bottom: 6,
              left: 10,
              child: IgnorePointer(
                child: Text(
                  _getWatermarkText(),
                  style: TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 8.5,
                    fontWeight: FontWeight.w700,
                    color: Colors.white.withValues(alpha: 0.35),
                    letterSpacing: 0.3,
                  ),
                ),
              ),
            ),

            // Watermark động di chuyển liên tục chống quay chụp màn hình
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
                        color: Colors.black.withValues(alpha: 0.35),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 0.5),
                      ),
                      child: Text(
                        _getWatermarkText(),
                        style: TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Colors.white.withValues(alpha: 0.65),
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
      ),
    );
  }
}

