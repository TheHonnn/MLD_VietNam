import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../widgets/primary_button.dart';
import 'a04_otp_screen.dart';

class A03LoginScreen extends StatefulWidget {
  const A03LoginScreen({super.key});

  @override
  State<A03LoginScreen> createState() => _A03LoginScreenState();
}

class _A03LoginScreenState extends State<A03LoginScreen> {
  final TextEditingController _phoneController = TextEditingController();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  void _handleContinue() {
    if (_formKey.currentState?.validate() ?? false) {
      setState(() {
        _isLoading = true;
      });

      Future.delayed(const Duration(milliseconds: 600), () {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => A04OtpScreen(phoneNumber: _phoneController.text.trim()),
            ),
          );
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: IntrinsicHeight(
                  child: Padding(
                    padding: const EdgeInsets.only(
                      top: 36.0, // Tinh chỉnh: nâng khoảng cách đỉnh từ 24 lên 36pt tránh dính sát mép trên
                      bottom: 24.0, // Đệm đáy thoáng đãng
                      left: 20.0,
                      right: 20.0,
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // --- 1. THẺ LOGO THƯƠNG HIỆU (136x64, r=16, viền #C58D59) ---
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Container(
                              width: 136,
                              height: 64,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: AppColors.secondary, // #C58D59
                                  width: 1.0,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.secondary.withValues(alpha: 0.12),
                                    blurRadius: 8,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                              ),
                              child: Image.asset(
                                'assets/images/logo_mld.png',
                                fit: BoxFit.contain,
                                errorBuilder: (_, __, ___) => const Center(
                                  child: Text(
                                    'MLD Vietnam',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 36), // Chuẩn Figma: 36-39pt

                          // --- 2. TIÊU ĐỀ & MÔ TẢ ---
                          const Text(
                            'Chào mừng bạn!',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w700,
                              height: 1.3,
                              color: AppColors.textHeading, // #693B20
                            ),
                          ),
                          const SizedBox(height: 14), // Chuẩn Figma: 14-16pt
                          const Text(
                            'Đăng nhập để trải nghiệm dịch vụ chăm sóc sức khỏe và các khóa đào tạo nghề.',
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w400,
                              height: 1.45,
                              color: AppColors.textSecondary, // #6B6158
                            ),
                          ),

                          const SizedBox(height: 36), // Chuẩn Figma: 36-40pt

                          // --- 3. KHUNG NHẬP SỐ ĐIỆN THOẠI ---
                          const Text(
                            'Số điện thoại',
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary, // #40352F
                            ),
                          ),
                          const SizedBox(height: 12), // Chuẩn Figma: 12-14pt

                          Container(
                            height: 56,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: BoxDecoration(
                              color: AppColors.surface, // white
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: AppColors.border, // #E3D1BF
                                width: 1.0,
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                // Tiền tố +84
                                const Text(
                                  '+84',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary, // #40352F
                                  ),
                                ),
                                const SizedBox(width: 12),

                                // Phân cách dọc
                                Container(
                                  width: 1,
                                  height: 24,
                                  color: AppColors.border, // #E3D1BF
                                ),
                                const SizedBox(width: 12),

                                // Ô nhập số
                                Expanded(
                                  child: TextFormField(
                                    controller: _phoneController,
                                    keyboardType: TextInputType.phone,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.textPrimary,
                                    ),
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return 'Vui lòng nhập số điện thoại';
                                      }
                                      if (value.trim().replaceAll(' ', '').length < 9) {
                                        return 'Số điện thoại không hợp lệ';
                                      }
                                      return null;
                                    },
                                    decoration: const InputDecoration(
                                      hintText: '912 345 678',
                                      hintStyle: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w400,
                                        color: AppColors.textPlaceholder,
                                      ),
                                      contentPadding: EdgeInsets.zero,
                                      border: InputBorder.none,
                                      enabledBorder: InputBorder.none,
                                      focusedBorder: InputBorder.none,
                                      errorBorder: InputBorder.none,
                                      focusedErrorBorder: InputBorder.none,
                                      filled: false,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 14), // Chuẩn Figma: 14-16pt

                          // Ghi chú dưới ô nhập
                          const Text(
                            'Chúng tôi sẽ gửi mã OTP để xác thực số điện thoại của bạn.',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w400,
                              height: 1.4,
                              color: AppColors.textSecondary, // #6B6158
                            ),
                          ),

                          const SizedBox(height: 22), // Chuẩn Figma: 20-22pt

                          // Nút Tiếp tục (PrimaryButton)
                          PrimaryButton(
                            text: 'Tiếp tục',
                            isLoading: _isLoading,
                            onPressed: _handleContinue,
                          ),

                          const SizedBox(height: 28), // Chuẩn Figma: 28-30pt

                          // --- 4. KHUNG CAM KẾT BẢO MẬT ---
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF6ECE0), // Màu be ấm dịu chuẩn Figma
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: const Color(0xFFEADBCE),
                                width: 0.8,
                              ),
                            ),
                            child: const Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  Icons.shield_outlined,
                                  size: 22,
                                  color: AppColors.primary, // #985018
                                ),
                                SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'Thông tin của bạn được bảo mật và sử dụng để hỗ trợ trải nghiệm.',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w400,
                                      height: 1.45,
                                      color: Color(0xFF7A6F65),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Khoảng cách giãn linh hoạt tự nhiên trước Footer
                          const Spacer(),
                          const SizedBox(height: 36),

                          // --- 5. PHẦN DƯỚI: TRỢ GIÚP & ĐIỀU KHOẢN DỊCH VỤ ---
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // Nút Cần hỗ trợ?
                              InkWell(
                                onTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Hotline hỗ trợ MLD: 1900 6868'),
                                      backgroundColor: AppColors.primary,
                                      duration: Duration(seconds: 2),
                                    ),
                                  );
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                  child: Text(
                                    'Cần hỗ trợ?',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary, // #985018
                                    ),
                                  ),
                                ),
                              ),

                              const SizedBox(height: 16), // Chuẩn Figma: 16-18pt

                              const Text(
                                'Bằng việc tiếp tục, bạn đồng ý với',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.textSecondary, // #6B6158
                                ),
                              ),

                              const SizedBox(height: 10), // Chuẩn Figma: 10-12pt

                              // Hàng điều khoản và chính sách tách biệt rõ ràng
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  GestureDetector(
                                    onTap: () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Điều khoản dịch vụ MLD Vietnam'),
                                          duration: Duration(seconds: 1),
                                        ),
                                      );
                                    },
                                    child: const Text(
                                      'Điều khoản dịch vụ',
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.primary, // #985018
                                        decoration: TextDecoration.underline,
                                        decorationColor: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    margin: const EdgeInsets.symmetric(horizontal: 12),
                                    width: 1,
                                    height: 12,
                                    color: AppColors.border, // #E3D1BF
                                  ),
                                  GestureDetector(
                                    onTap: () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Chính sách bảo mật thông tin'),
                                          duration: Duration(seconds: 1),
                                        ),
                                      );
                                    },
                                    child: const Text(
                                      'Chính sách bảo mật',
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.primary, // #985018
                                        decoration: TextDecoration.underline,
                                        decorationColor: AppColors.primary,
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
              ),
            );
          },
        ),
      ),
    );
  }
}
