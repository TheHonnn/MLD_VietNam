import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/utils/validators.dart';
import '../../../home/presentation/screens/main_layout_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../../membership/presentation/screens/legal_document_screen.dart';
import '../../widgets/primary_button.dart';
import 'a03_email_register_screen.dart';
import 'a03_forgot_password_screen.dart';
import 'a04_otp_screen.dart';

class A03LoginScreen extends StatefulWidget {
  const A03LoginScreen({super.key});

  @override
  State<A03LoginScreen> createState() => _A03LoginScreenState();
}

class _A03LoginScreenState extends State<A03LoginScreen> {
  // Tab index: 0 = Email, 1 = SĐT (Mặc định Email chuẩn theo yêu cầu)
  int _selectedTabIndex = 0;

  // Controllers cho Email
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final GlobalKey<FormState> _emailFormKey = GlobalKey<FormState>();
  bool _obscurePassword = true;

  // Controllers cho SĐT
  final TextEditingController _phoneController = TextEditingController();
  final GlobalKey<FormState> _phoneFormKey = GlobalKey<FormState>();

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final lastEmail = AuthService.instance.lastLoginEmail;
    if (lastEmail != null && lastEmail.isNotEmpty) {
      _emailController.text = lastEmail;
    }
    // Luôn luôn mặc định tab Email khi vào trang Đăng nhập
    _selectedTabIndex = 0;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  // Luồng đăng nhập SĐT qua mã OTP SMS
  Future<void> _handlePhoneContinue() async {
    if (!(_phoneFormKey.currentState?.validate() ?? false)) return;
    final phone = _phoneController.text.trim();
    AuthService.instance.saveLastLogin(phone: phone, method: 'phone');

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ApiClient.instance.post(
        ApiEndpoints.authRequestPhoneOtp,
        data: {'phone': phone},
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Mã OTP đã được gửi qua tin nhắn SMS tới số điện thoại của bạn!'),
            backgroundColor: AppColors.primary,
          ),
        );
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => A04OtpScreen(
              phoneNumber: phone,
              purpose: 'LOGIN_PHONE',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        // Điều hướng để người dùng có thể tiếp tục
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => A04OtpScreen(
              phoneNumber: phone,
              purpose: 'LOGIN_PHONE',
            ),
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

  // Luồng đăng nhập bằng mã OTP ngẫu nhiên gửi về Email (Passwordless Login)
  Future<void> _handleRequestLoginOtp() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
      setState(() {
        _errorMessage = 'Vui lòng nhập địa chỉ email hợp lệ để nhận mã OTP';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ApiClient.instance.post(
        ApiEndpoints.authRequestLoginOtp,
        data: {'email': email},
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Mã OTP đăng nhập đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư (kể cả mục Thư rác/Spam)!'),
            backgroundColor: AppColors.primary,
            duration: Duration(seconds: 5),
          ),
        );
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => A04OtpScreen(
              email: email,
              purpose: 'LOGIN_EMAIL',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        String msg = 'Không thể gửi mã OTP. Vui lòng kiểm tra lại địa chỉ email.';
        if (e is ApiException) {
          msg = e.message;
        } else {
          msg = e.toString().replaceFirst('Exception: ', '').replaceAll('ApiException: ', '');
        }
        setState(() {
          _errorMessage = msg;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
  // Luồng đăng nhập Email + Mật khẩu
  Future<void> _handleEmailLogin() async {
    if (!(_emailFormKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final email = _emailController.text.trim();
      final password = _passwordController.text;

      final response = await ApiClient.instance.post(
        ApiEndpoints.authLoginEmail,
        data: {
          'email': email,
          'password': password,
        },
      );

      final body = response.data;
      final data = (body is Map && body.containsKey('data')) ? body['data'] : body;

      final accessToken = data['accessToken'] as String?;
      final refreshToken = data['refreshToken'] as String?;
      final user = data['user'] as Map<String, dynamic>?;

      if (accessToken != null) {
        final loggedInName = (user?['full_name'] ?? user?['fullName']) as String?;
        final loggedInAvatar = (user?['avatar_url'] ?? user?['avatarUrl']) as String?;
        final loggedInPhone = user?['phone'] as String?;
        final loggedInEmail = user?['email'] as String? ?? _emailController.text.trim();

        await AuthService.instance.saveSession(
          accessToken: accessToken,
          refreshToken: refreshToken,
          userId: user?['id'] as String?,
          phone: loggedInPhone,
          displayName: loggedInName,
          avatarUrl: loggedInAvatar,
        );

        await AuthService.instance.saveLastLogin(
          email: loggedInEmail,
          method: 'email',
        );

        MembershipRepository.instance.syncUserSession(
          fullName: loggedInName,
          phone: loggedInPhone,
          email: loggedInEmail,
          avatarUrl: loggedInAvatar,
          memberCode: user?['referral_code']?.toString() ?? user?['referralCode']?.toString(),
        );

        if (mounted) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const MainLayoutScreen()),
            (route) => false,
          );
        }
      } else {
        setState(() {
          _errorMessage = 'Không thể xác thực thông tin đăng nhập.';
        });
      }
    } catch (e) {
      String msg = 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.';
      final errStr = e.toString();
      if (errStr.contains('ACCOUNT_LOCKED') || errStr.contains('khóa')) {
        msg = 'Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.';
      } else if (errStr.contains('INVALID_CREDENTIALS')) {
        msg = 'Email hoặc mật khẩu không chính xác.';
      }
      setState(() {
        _errorMessage = msg;
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }



  @override
  Widget build(BuildContext context) {
    const primaryNavy = Color(0xFF003876);
    const ctaGreen = Color(0xFF16A34A);
    const textDark = Color(0xFF0F172A);
    const textMuted = Color(0xFF64748B);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: IntrinsicHeight(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // --- 1. LOGO & NÚT QUAY LẠI (NẾU CÓ) ---
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            if (Navigator.canPop(context))
                              InkWell(
                                onTap: () => Navigator.pop(context),
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.05),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: primaryNavy),
                                ),
                              )
                            else
                              const SizedBox(width: 42),
                            Container(
                              height: 48,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Image.asset(
                                'assets/images/logo.webp',
                                fit: BoxFit.contain,
                                errorBuilder: (_, __, ___) => Text(
                                  'MLD VIETNAM',
                                  style: GoogleFonts.beVietnamPro(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: primaryNavy,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 42), // Cân đối layout
                          ],
                        ),

                        const SizedBox(height: 28),

                        // --- 2. TIÊU ĐỀ & LỜI CHÀO ---
                        Text(
                          'Chào mừng bạn!',
                          style: GoogleFonts.beVietnamPro(
                            fontSize: 26,
                            fontWeight: FontWeight.w700,
                            color: primaryNavy,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Đăng nhập để trải nghiệm dịch vụ chăm sóc và đào tạo nghề.',
                          style: GoogleFonts.beVietnamPro(
                            fontSize: 13.5,
                            color: textMuted,
                            height: 1.45,
                          ),
                        ),

                        const SizedBox(height: 24),

                        // --- 3. TAB CHUYỂN ĐỔI: EMAIL & SỐ ĐIỆN THOẠI ---
                        Container(
                          height: 46,
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              // Tab 0: Email
                              Expanded(
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _selectedTabIndex = 0;
                                      _errorMessage = null;
                                    });
                                  },
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: _selectedTabIndex == 0 ? Colors.white : Colors.transparent,
                                      borderRadius: BorderRadius.circular(10),
                                      boxShadow: _selectedTabIndex == 0
                                          ? [
                                              BoxShadow(
                                                color: Colors.black.withValues(alpha: 0.06),
                                                blurRadius: 6,
                                                offset: const Offset(0, 2),
                                              ),
                                            ]
                                          : null,
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      'Email & Mật khẩu',
                                      style: GoogleFonts.beVietnamPro(
                                        fontSize: 13.5,
                                        fontWeight: _selectedTabIndex == 0 ? FontWeight.w700 : FontWeight.w500,
                                        color: _selectedTabIndex == 0 ? primaryNavy : textMuted,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              // Tab 1: Số điện thoại
                              Expanded(
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _selectedTabIndex = 1;
                                      _errorMessage = null;
                                    });
                                  },
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: _selectedTabIndex == 1 ? Colors.white : Colors.transparent,
                                      borderRadius: BorderRadius.circular(10),
                                      boxShadow: _selectedTabIndex == 1
                                          ? [
                                              BoxShadow(
                                                color: Colors.black.withValues(alpha: 0.06),
                                                blurRadius: 6,
                                                offset: const Offset(0, 2),
                                              ),
                                            ]
                                          : null,
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      'Số điện thoại',
                                      style: GoogleFonts.beVietnamPro(
                                        fontSize: 13.5,
                                        fontWeight: _selectedTabIndex == 1 ? FontWeight.w700 : FontWeight.w500,
                                        color: _selectedTabIndex == 1 ? primaryNavy : textMuted,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 20),

                        // Error Banner nếu có
                        if (_errorMessage != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF2F2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _errorMessage!,
                                    style: GoogleFonts.beVietnamPro(
                                      color: const Color(0xFF991B1B),
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // --- 4. FORM THEO TAB HIỆN TẠI ---
                        if (_selectedTabIndex == 0)
                          // === TAB EMAIL & MẬT KHẨU ===
                          Form(
                            key: _emailFormKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  'Địa chỉ Email',
                                  style: GoogleFonts.beVietnamPro(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w600,
                                    color: primaryNavy,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(14),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.04),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: TextFormField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    style: GoogleFonts.beVietnamPro(
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.w500,
                                      color: textDark,
                                    ),
                                    validator: AppValidators.email,
                                    decoration: InputDecoration(
                                      hintText: 'example@mldvietnam.vn',
                                      hintStyle: GoogleFonts.beVietnamPro(
                                        fontSize: 14,
                                        color: const Color(0xFF94A3B8),
                                      ),
                                      prefixIcon: const Icon(Icons.email_outlined, color: primaryNavy, size: 20),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                                      border: InputBorder.none,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Mật khẩu',
                                  style: GoogleFonts.beVietnamPro(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w600,
                                    color: primaryNavy,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(14),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.04),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: TextFormField(
                                    controller: _passwordController,
                                    obscureText: _obscurePassword,
                                    style: GoogleFonts.beVietnamPro(
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.w500,
                                      color: textDark,
                                    ),
                                    validator: (v) {
                                      if (v == null || v.isEmpty) return 'Vui lòng nhập mật khẩu';
                                      if (v.length < 6) return 'Mật khẩu tối thiểu 6 ký tự';
                                      return null;
                                    },
                                    decoration: InputDecoration(
                                      hintText: 'Nhập mật khẩu của bạn',
                                      hintStyle: GoogleFonts.beVietnamPro(
                                        fontSize: 14,
                                        color: const Color(0xFF94A3B8),
                                      ),
                                      prefixIcon: const Icon(Icons.lock_outline_rounded, color: primaryNavy, size: 20),
                                      suffixIcon: IconButton(
                                        icon: Icon(
                                          _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                          color: textMuted,
                                          size: 20,
                                        ),
                                        onPressed: () {
                                          setState(() {
                                            _obscurePassword = !_obscurePassword;
                                          });
                                        },
                                      ),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                                      border: InputBorder.none,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: GestureDetector(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => const A03ForgotPasswordScreen(),
                                        ),
                                      );
                                    },
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 4),
                                      child: Text(
                                        'Quên mật khẩu?',
                                        style: GoogleFonts.beVietnamPro(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: primaryNavy,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 18),
                                PrimaryButton(
                                  text: 'Đăng nhập',
                                  backgroundColor: ctaGreen,
                                  isLoading: _isLoading,
                                  onPressed: _handleEmailLogin,
                                ),
                                const SizedBox(height: 12),
                                OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    side: const BorderSide(color: AppColors.secondary, width: 1.2),
                                  ),
                                  icon: const Icon(Icons.mark_email_read_outlined, size: 18, color: AppColors.primary),
                                  label: const Text(
                                    'Đăng nhập bằng mã OTP qua Email',
                                    style: TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  onPressed: _isLoading ? null : _handleRequestLoginOtp,
                                ),
                              ],
                            ),
                          )
                        else
                          // === TAB SỐ ĐIỆN THOẠI ===
                          Form(
                            key: _phoneFormKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  'Số điện thoại',
                                  style: GoogleFonts.beVietnamPro(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w600,
                                    color: primaryNavy,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  height: 54,
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
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
                                      Text(
                                        '+84',
                                        style: GoogleFonts.beVietnamPro(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w600,
                                          color: primaryNavy,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Container(
                                        width: 1,
                                        height: 22,
                                        color: const Color(0xFFE2E8F0),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: TextFormField(
                                          controller: _phoneController,
                                          keyboardType: TextInputType.phone,
                                          style: GoogleFonts.beVietnamPro(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w500,
                                            color: textDark,
                                          ),
                                          validator: (value) {
                                            if (value == null || value.trim().isEmpty) {
                                              return 'Vui lòng nhập số điện thoại';
                                            }
                                            final clean = value.trim().replaceAll(' ', '');
                                            final fullNumber = clean.startsWith('0') ? clean : '0$clean';
                                            return AppValidators.phone(fullNumber);
                                          },
                                          decoration: InputDecoration(
                                            hintText: '912 345 678',
                                            hintStyle: GoogleFonts.beVietnamPro(
                                              fontSize: 14.5,
                                              color: const Color(0xFF94A3B8),
                                            ),
                                            contentPadding: EdgeInsets.zero,
                                            border: InputBorder.none,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 20),
                                PrimaryButton(
                                  text: 'Tiếp tục',
                                  backgroundColor: ctaGreen,
                                  isLoading: _isLoading,
                                  onPressed: _handlePhoneContinue,
                                ),
                              ],
                            ),
                          ),

                        const SizedBox(height: 20),

                        // --- 5. ĐĂNG KÝ TÀI KHOẢN MỚI ---
                        Wrap(
                          alignment: WrapAlignment.center,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Text(
                              'Chưa có tài khoản? ',
                              style: GoogleFonts.beVietnamPro(
                                fontSize: 13.5,
                                color: textMuted,
                              ),
                            ),
                            InkWell(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const A03EmailRegisterScreen(),
                                  ),
                                );
                              },
                              child: Text(
                                'Đăng ký ngay',
                                style: GoogleFonts.beVietnamPro(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700,
                                  color: primaryNavy,
                                  decoration: TextDecoration.underline,
                                  decorationColor: primaryNavy,
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 20),

                        // --- 6. NÚT KHÁM PHÁ APP DÀNH CHO KHÁCH ---
                        InkWell(
                          onTap: () {
                            if (Navigator.canPop(context)) {
                              Navigator.pop(context);
                            } else {
                              Navigator.pushReplacement(
                                context,
                                MaterialPageRoute(builder: (_) => const MainLayoutScreen()),
                              );
                            }
                          },
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            height: 50,
                            decoration: BoxDecoration(
                              color: Colors.white,
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
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.explore_outlined, size: 20, color: primaryNavy),
                                const SizedBox(width: 8),
                                Text(
                                  'Khám phá ứng dụng',
                                  style: GoogleFonts.beVietnamPro(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: primaryNavy,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        const Spacer(),
                        const SizedBox(height: 24),

                        // --- 7. TRỢ GIÚP & ĐIỀU KHOẢN ---
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            InkWell(
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Hotline hỗ trợ MLD: 0987 186 399'),
                                    backgroundColor: primaryNavy,
                                    duration: Duration(seconds: 2),
                                  ),
                                );
                              },
                              borderRadius: BorderRadius.circular(8),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                child: Text(
                                  'Cần hỗ trợ?',
                                  style: GoogleFonts.beVietnamPro(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: primaryNavy,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              alignment: WrapAlignment.center,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                GestureDetector(
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => const LegalDocumentScreen(type: LegalDocType.termsOfService),
                                      ),
                                    );
                                  },
                                  child: Text(
                                    'Điều khoản sử dụng',
                                    style: GoogleFonts.beVietnamPro(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: primaryNavy,
                                      decoration: TextDecoration.underline,
                                    ),
                                  ),
                                ),
                                Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 10),
                                  width: 1,
                                  height: 12,
                                  color: const Color(0xFFCBD5E1),
                                ),
                                GestureDetector(
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => const LegalDocumentScreen(type: LegalDocType.privacyPolicy),
                                      ),
                                    );
                                  },
                                  child: Text(
                                    'Chính sách bảo mật',
                                    style: GoogleFonts.beVietnamPro(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: primaryNavy,
                                      decoration: TextDecoration.underline,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
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
