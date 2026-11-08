import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/services/auth_service.dart';
import '../../../admin/presentation/screens/admin_main_layout_screen.dart';
import '../../../home/presentation/screens/main_layout_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../widgets/primary_button.dart';

class A04OtpScreen extends StatefulWidget {
  final String? phoneNumber;
  final String? email;
  final String purpose; // 'LOGIN_PHONE' | 'REGISTER_EMAIL' | 'RESET_PASSWORD' | 'ACCOUNT_LINK'

  final String? initialOtp;

  const A04OtpScreen({
    super.key,
    this.phoneNumber,
    this.email,
    this.purpose = 'LOGIN_PHONE',
    this.initialOtp,
  });

  @override
  State<A04OtpScreen> createState() => _A04OtpScreenState();
}

class _A04OtpScreenState extends State<A04OtpScreen> {
  final List<TextEditingController> _controllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  int _countdown = 45;
  Timer? _timer;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (var c in _controllers) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  void _startCountdown() {
    _timer?.cancel();
    setState(() {
      _countdown = 45;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        if (_countdown > 0) {
          setState(() {
            _countdown--;
          });
        } else {
          timer.cancel();
        }
      }
    });
  }

  String get _otpCode => _controllers.map((c) => c.text).join();

  String get _targetIdentifier =>
      widget.email?.trim() ?? widget.phoneNumber?.trim() ?? '';

  bool get _isEmail => widget.email != null && widget.email!.isNotEmpty;

  String _formatMaskedIdentifier(String id) {
    if (id.isEmpty) return '***';
    if (_isEmail) {
      final parts = id.split('@');
      if (parts.length == 2 && parts[0].length > 2) {
        return '${parts[0][0]}***${parts[0][parts[0].length - 1]}@${parts[1]}';
      }
      return id;
    }

    String digits = id.replaceAll(RegExp(r'\D'), '');
    if (digits.startsWith('84')) digits = '0${digits.substring(2)}';
    if (digits.length >= 9) {
      return '+84 ${digits.substring(1, 4)} *** ${digits.substring(digits.length - 3)}';
    }
    return id;
  }

  Future<void> _handleVerify() async {
    final code = _otpCode;
    if (code.length < 6) {
      setState(() {
        _errorMessage = 'Vui lòng nhập đủ 6 chữ số mã OTP';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (widget.purpose == 'REGISTER_EMAIL') {
        // Gọi API xác thực OTP kích hoạt tài khoản Email
        final res = await ApiClient.instance.post(
          ApiEndpoints.authVerifyEmailOtp,
          data: {
            'email': widget.email!.trim(),
            'otp': code,
          },
        );

        final body = res.data;
        final data = (body is Map && body.containsKey('data')) ? body['data'] : body;
        final accessToken = data['accessToken'] as String?;
        final refreshToken = data['refreshToken'] as String?;
        final user = data['user'] as Map<String, dynamic>?;

        if (accessToken != null && accessToken.isNotEmpty) {
          final registeredName = (user?['full_name'] ?? user?['fullName']) as String?;
          final userAvatar = (user?['avatar_url'] ?? user?['avatarUrl']) as String?;
          final userPhone = user?['phone'] as String?;
          final userRole = user?['role']?.toString().toUpperCase();
          await AuthService.instance.saveSession(
            accessToken: accessToken,
            refreshToken: refreshToken,
            userId: user?['id'] as String?,
            phone: userPhone,
            displayName: registeredName,
            avatarUrl: userAvatar,
            role: userRole,
          );

          await AuthService.instance.saveLastLogin(
            email: widget.email?.trim(),
            method: 'email',
          );

          MembershipRepository.instance.syncUserSession(
            fullName: registeredName,
            phone: userPhone,
            email: widget.email?.trim(),
            avatarUrl: userAvatar,
            memberCode: user?['referral_code']?.toString() ?? user?['referralCode']?.toString(),
          );
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Xác thực tài khoản thành công! Đang vào ứng dụng...'),
              backgroundColor: AppColors.primary,
            ),
          );
          final targetScreen = AuthService.instance.isAdmin
              ? const AdminMainLayoutScreen()
              : const MainLayoutScreen();
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(
              builder: (_) => targetScreen,
            ),
            (route) => false,
          );
        }
      } else if (widget.purpose == 'RESET_PASSWORD') {
        // Trả mã OTP về cho luồng Reset Password
        if (mounted) {
          Navigator.pop(context, code);
        }
      } else if (widget.purpose == 'LOGIN_EMAIL') {
        // Gọi API xác thực mã OTP ngẫu nhiên đăng nhập qua Email
        final res = await ApiClient.instance.post(
          ApiEndpoints.authVerifyLoginOtp,
          data: {
            'email': widget.email!.trim(),
            'otp': code,
          },
        );

        final body = res.data;
        final data = (body is Map && body.containsKey('data')) ? body['data'] : body;
        final accessToken = data['accessToken'] as String?;
        final refreshToken = data['refreshToken'] as String?;
        final user = data['user'] as Map<String, dynamic>?;

        if (accessToken != null && accessToken.isNotEmpty) {
          final loggedInName = (user?['full_name'] ?? user?['fullName']) as String?;
          final userAvatar = (user?['avatar_url'] ?? user?['avatarUrl']) as String?;
          final userPhone = user?['phone'] as String?;
          final userRole = user?['role']?.toString().toUpperCase();
          await AuthService.instance.saveSession(
            accessToken: accessToken,
            refreshToken: refreshToken,
            userId: user?['id'] as String?,
            phone: userPhone,
            displayName: loggedInName,
            avatarUrl: userAvatar,
            role: userRole,
          );

          await AuthService.instance.saveLastLogin(
            email: widget.email?.trim(),
            method: 'email',
          );

          MembershipRepository.instance.syncUserSession(
            fullName: loggedInName,
            phone: userPhone,
            email: widget.email?.trim(),
            avatarUrl: userAvatar,
            memberCode: user?['referral_code']?.toString() ?? user?['referralCode']?.toString(),
          );
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đăng nhập thành công! Đang vào ứng dụng...'),
              backgroundColor: AppColors.primary,
            ),
          );
          final targetScreen = AuthService.instance.isAdmin
              ? const AdminMainLayoutScreen()
              : const MainLayoutScreen();
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(
              builder: (_) => targetScreen,
            ),
            (route) => false,
          );
        }
      } else {
        // Luồng đăng nhập bằng Số điện thoại (Phone OTP qua Gateway)
        try {
          final res = await ApiClient.instance.post(
            ApiEndpoints.authVerifyPhoneOtp,
            data: {
              'phone': widget.phoneNumber,
              'otp': code,
            },
          );
          final body = res.data;
          final data = (body is Map && body.containsKey('data')) ? body['data'] : body;
          final accessToken = data['accessToken'] as String?;
          final refreshToken = data['refreshToken'] as String?;
          final user = data['user'] as Map<String, dynamic>?;

          if (accessToken != null && accessToken.isNotEmpty) {
            final userName = (user?['full_name'] ?? user?['fullName']) as String?;
            final userAvatar = (user?['avatar_url'] ?? user?['avatarUrl']) as String?;
            final userPhone = user?['phone'] as String? ?? widget.phoneNumber;
            final userRole = user?['role']?.toString().toUpperCase();
            await AuthService.instance.saveSession(
              accessToken: accessToken,
              refreshToken: refreshToken,
              userId: user?['id'] as String?,
              phone: userPhone,
              displayName: userName,
              avatarUrl: userAvatar,
              role: userRole,
            );
            await AuthService.instance.saveLastLogin(
              phone: userPhone,
              method: 'phone',
            );
            MembershipRepository.instance.syncUserSession(
              fullName: userName,
              phone: userPhone,
              avatarUrl: userAvatar,
              memberCode: user?['referral_code']?.toString() ?? user?['referralCode']?.toString(),
            );
          }
        } catch (_) {
          // Fallback sang Supabase Verify Otp nếu gateway gặp sự cố
          try {
            final res = await ApiClient.instance.post(
              ApiEndpoints.verifyOtp,
              data: {
                'phone': widget.phoneNumber,
                'token': code,
                'type': 'sms',
              },
            );
            final session = res.data['session'];
            final accessToken = session?['access_token'] ?? 'mld_token_${DateTime.now().millisecondsSinceEpoch}';
            final refreshToken = session?['refresh_token'];
            final user = res.data['user'];

            await AuthService.instance.saveSession(
              accessToken: accessToken,
              refreshToken: refreshToken,
              phone: widget.phoneNumber,
              userId: user?['id'],
            );
            await AuthService.instance.saveLastLogin(
              phone: widget.phoneNumber,
              method: 'phone',
            );
            MembershipRepository.instance.syncUserSession(
              fullName: (user?['full_name'] ?? user?['fullName']) as String? ?? '',
              phone: widget.phoneNumber,
            );
          } catch (fbErr) {
            // Re-throw để hiển thị thông báo lỗi chính xác
            rethrow;
          }
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đăng nhập thành công!'),
              backgroundColor: AppColors.primary,
            ),
          );
          final targetScreen = AuthService.instance.isAdmin
              ? const AdminMainLayoutScreen()
              : const MainLayoutScreen();
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(
              builder: (_) => targetScreen,
            ),
            (route) => false,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        String msg = 'Mã xác thực không hợp lệ hoặc đã hết hạn.';
        if (e is ApiException) {
          msg = e.message;
        } else {
          msg = e.toString().replaceFirst('Exception: ', '').replaceAll('ApiException: ', '');
        }
        setState(() {
          _errorMessage = msg;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleResend() async {
    if (_countdown > 0) return;
    _startCountdown();

    try {
      if (_isEmail) {
        String purpose = 'REGISTER';
        if (widget.purpose == 'RESET_PASSWORD') purpose = 'RESET_PASSWORD';
        if (widget.purpose == 'LOGIN_EMAIL') purpose = 'LOGIN';

        await ApiClient.instance.post(
          ApiEndpoints.authResendOtp,
          data: {
            'email': widget.email,
            'purpose': purpose,
          },
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đã gửi lại mã xác thực OTP mới. Vui lòng kiểm tra hộp thư (kể cả thư mục Thư rác/Spam).'),
              backgroundColor: AppColors.primary,
              duration: Duration(seconds: 5),
            ),
          );
        }
      } else {
        try {
          await ApiClient.instance.post(
            ApiEndpoints.authRequestPhoneOtp,
            data: {'phone': widget.phoneNumber},
          );
        } catch (_) {
          await ApiClient.instance.post(
            ApiEndpoints.sendOtp,
            data: {'phone': widget.phoneNumber},
          );
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đã gửi lại mã xác thực OTP qua SMS'),
              backgroundColor: AppColors.primary,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi gửi lại mã: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final titleText = _isEmail ? 'Xác thực địa chỉ Email' : 'Xác thực số điện thoại';
    final descText = _isEmail
        ? 'Nhập mã OTP gồm 6 chữ số đã được gửi đến email của bạn.'
        : 'Nhập mã OTP đã được gửi đến số điện thoại của bạn.';
    final iconData = _isEmail ? Icons.mail_outline_rounded : Icons.smartphone_rounded;

    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Padding(
                  padding: const EdgeInsets.only(
                    top: 12.0,
                    bottom: 16.0,
                    left: 20.0,
                    right: 20.0,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // --- PHẦN TRÊN: BackButton, Biểu tượng, Tiêu đề, 6 ô OTP, Nút gửi lại ---
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 1. BackButton (44x44, r=12, border #E3D1BF, background white)
                          InkWell(
                            onTap: () => Navigator.pop(context),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: AppColors.surface, // white
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: AppColors.border, // #E3D1BF
                                  width: 1.0,
                                ),
                              ),
                              child: const Icon(
                                Icons.arrow_back_rounded,
                                size: 20,
                                color: AppColors.textPrimary, // #40352F
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),

                          // 2. Biểu tượng xác thực
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceSecondary, // #F3E2CE
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Center(
                              child: Icon(
                                iconData,
                                size: 28,
                                color: AppColors.primary, // #985018
                              ),
                            ),
                          ),

                          const SizedBox(height: 16),

                          // 3. Tiêu đề và Mô tả
                          Text(
                            titleText,
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w600,
                              height: 36.40 / 28,
                              color: AppColors.textHeading, // #693B20
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            descText,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w400,
                              height: 23.25 / 15,
                              color: AppColors.textSecondary, // #6B6158
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _formatMaskedIdentifier(_targetIdentifier),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              height: 24.80 / 16,
                              color: AppColors.textPrimary, // #40352F
                            ),
                          ),

                          if (_isEmail) ...[
                            const SizedBox(height: 8),
                            const Text(
                              '💡 Lưu ý: Vui lòng kiểm tra cả mục Thư rác (Spam) hoặc Quảng cáo nếu không thấy thư trong Hộp thư đến.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ],
const SizedBox(height: 28),

                          // 4. Hàng 6 ô nhập mã OTP
                          Row(
                            children: [
                              for (int index = 0; index < 6; index++) ...[
                                if (index > 0) const SizedBox(width: 8),
                                Expanded(
                                  child: Container(
                                    height: 56,
                                    decoration: BoxDecoration(
                                      color: AppColors.surface, // white
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: (_focusNodes[index].hasFocus || _controllers[index].text.isNotEmpty)
                                            ? AppColors.primary // #985018
                                            : AppColors.border, // #E3D1BF
                                        width: (_focusNodes[index].hasFocus || _controllers[index].text.isNotEmpty) ? 1.5 : 1.0,
                                      ),
                                    ),
                                    child: Center(
                                      child: TextField(
                                        controller: _controllers[index],
                                        focusNode: _focusNodes[index],
                                        keyboardType: TextInputType.number,
                                        textAlign: TextAlign.center,
                                        maxLength: 1,
                                        style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textHeading, // #693B20
                                        ),
                                        decoration: const InputDecoration(
                                          counterText: '',
                                          border: InputBorder.none,
                                          enabledBorder: InputBorder.none,
                                          focusedBorder: InputBorder.none,
                                          errorBorder: InputBorder.none,
                                          disabledBorder: InputBorder.none,
                                          contentPadding: EdgeInsets.zero,
                                          isDense: true,
                                        ),
                                        onChanged: (val) {
                                          if (val.isNotEmpty && index < 5) {
                                            _focusNodes[index + 1].requestFocus();
                                          } else if (val.isEmpty && index > 0) {
                                            _focusNodes[index - 1].requestFocus();
                                          }
                                          setState(() {});
                                        },
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),

                          if (_errorMessage != null) ...[
                            const SizedBox(height: 12),
                            Text(
                              _errorMessage!,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Colors.redAccent,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],

                          const SizedBox(height: 24),

                          // 5. Nút gửi lại mã OTP
                          Center(
                            child: InkWell(
                              onTap: _countdown == 0 ? _handleResend : null,
                              borderRadius: BorderRadius.circular(8),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                child: Text(
                                  _countdown > 0
                                      ? 'Gửi lại mã sau ${_countdown}s'
                                      : 'Gửi lại mã xác thực',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: _countdown > 0 ? AppColors.textSecondary : AppColors.primary,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),

                      // --- PHẦN DƯỚI: Nút Xác nhận ---
                      Padding(
                        padding: const EdgeInsets.only(top: 24.0),
                        child: PrimaryButton(
                          text: 'Xác nhận',
                          isLoading: _isLoading,
                          onPressed: _handleVerify,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
