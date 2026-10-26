import 'package:flutter/material.dart';
import 'package:medical_healthcare_app/features/booking/presentation/widgets/group_c_widgets.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../widgets/academy_widgets.dart';
import 'e07_my_courses_screen.dart';

/// Screen E06: Thanh toán học phí [8116:25740]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
class E06TuitionPaymentScreen extends StatefulWidget {
  final CourseModel course;
  final String studentName;
  final String studentPhone;
  final String studentEmail;
  final String selectedBranch;
  final String selectedShift;

  const E06TuitionPaymentScreen({
    super.key,
    required this.course,
    required this.studentName,
    required this.studentPhone,
    required this.studentEmail,
    required this.selectedBranch,
    required this.selectedShift,
  });

  @override
  State<E06TuitionPaymentScreen> createState() => _E06TuitionPaymentScreenState();
}

class _E06TuitionPaymentScreenState extends State<E06TuitionPaymentScreen> {
  String _selectedPaymentMethod = 'BANK_TRANSFER'; // BANK_TRANSFER, QR_PAYMENT, ONLINE, INSTALLMENT

  @override
  Widget build(BuildContext context) {
    final course = widget.course;

    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        
      ),
      bottomNavigationBar: AcademyFixedBottomBar(
        summaryText: 'Chờ thanh toán · Trả ngay 2.000.000đ',
        buttonText: 'Xác nhận thanh toán',
        onPressed: () async {
          await AcademyRepository.instance.enrollCourse(
            course: course,
            studentName: widget.studentName,
            studentPhone: widget.studentPhone,
            studentEmail: widget.studentEmail,
            selectedBranch: widget.selectedBranch,
            selectedShift: widget.selectedShift,
          );
          if (context.mounted) {
            _showPaymentSuccessDialog(context);
          }
        },
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Tiêu đề trang [8116:25745]
            const Text(
              'Thanh toán học phí',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Kiểm tra học phí và lựa chọn phương thức thanh toán.',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: AcademyColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),

            // 2. Chờ thanh toán [8116:25752]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.access_time_rounded, color: AcademyColors.primary, size: 22),
                      SizedBox(width: 8),
                      Text(
                        'Chờ thanh toán',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AcademyColors.primary,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Chưa ghi danh · Không thực hiện thanh toán bằng mẫu này.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 3. Thẻ ghi danh nền vàng, chữ đen như design, không có tên mô tả [8116:25756]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    course.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${widget.studentName} · MCN-1026',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Khai giảng 23/10/2026 · Học trực tiếp',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.selectedBranch,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.selectedShift,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AcademyColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 4. Chi tiết học phí [8116:25762]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Học phí',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  const SizedBox(height: 14),
                  _buildPriceRow('Học phí', '${formatCurrency(course.tuitionFee)}đ'),
                  const SizedBox(height: 8),
                  _buildPriceRow('Giảm giá', '0đ'),
                  const SizedBox(height: 8),
                  _buildPriceRow('Phí đăng ký', '0đ'),
                  const SizedBox(height: 12),
                  const Divider(color: AcademyColors.cardBorder, height: 1),
                  const SizedBox(height: 12),
                  _buildPriceRow(
                    'Tổng học phí',
                    '${formatCurrency(course.tuitionFee)}đ',
                    isTotal: true,
                  ),
                  const SizedBox(height: 8),
                  _buildPriceRow('Đặt cọc', '2.000.000đ'),
                  const SizedBox(height: 8),
                  _buildPriceRow('Còn lại', '7.000.000đ'),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Thẻ cọc
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Thanh toán ngay: 2.000.000đ',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.primary,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Tiền cọc là một phần của tổng học phí 9.000.000đ, không cộng thêm vào tổng.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AcademyColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 5. Phương thức thanh toán [8116:25768]
            const Text(
              'Phương thức thanh toán',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 14),

            // Phương thức 1: Chuyển khoản ngân hàng (Đang chọn)
            _buildPaymentMethodTile(
              id: 'BANK_TRANSFER',
              title: 'Chuyển khoản ngân hàng',
              isSelected: _selectedPaymentMethod == 'BANK_TRANSFER',
              onSelect: () => setState(() => _selectedPaymentMethod = 'BANK_TRANSFER'),
            ),
            if (_selectedPaymentMethod == 'BANK_TRANSFER') ...[
              const SizedBox(height: 12),
              const PaymentQRPlaceholderWidget(
                amount: 2000000,
                transferCode: 'HV-DEMO-000256',
              ),
            ],
            const SizedBox(height: 12),

            // Phương thức 2: Thanh toán QR
            _buildPaymentMethodTile(
              id: 'QR_PAYMENT',
              title: 'Thanh toán QR',
              subtitle: 'Quét mã QR qua ứng dụng ngân hàng.',
              isSelected: _selectedPaymentMethod == 'QR_PAYMENT',
              onSelect: () => setState(() => _selectedPaymentMethod = 'QR_PAYMENT'),
            ),
            if (_selectedPaymentMethod == 'QR_PAYMENT') ...[
              const SizedBox(height: 12),
              const PaymentQRPlaceholderWidget(
                amount: 2000000,
                transferCode: 'HV-DEMO-000256',
              ),
            ],
            const SizedBox(height: 12),

            // Phương thức 3: Thanh toán trực tuyến
            _buildPaymentMethodTile(
              id: 'ONLINE',
              title: 'Thanh toán trực tuyến',
              subtitle: 'Thanh toán an toàn qua cổng thanh toán liên kết.',
              isSelected: _selectedPaymentMethod == 'ONLINE',
              onSelect: () => setState(() => _selectedPaymentMethod = 'ONLINE'),
            ),
            const SizedBox(height: 12),

            // Phương thức 4: Thanh toán theo đợt
            _buildPaymentMethodTile(
              id: 'INSTALLMENT',
              title: 'Thanh toán theo đợt (nếu trung tâm hỗ trợ)',
              subtitle: 'Hỗ trợ trả góp học phí linh hoạt qua thẻ tín dụng.',
              isSelected: _selectedPaymentMethod == 'INSTALLMENT',
              onSelect: () => setState(() => _selectedPaymentMethod = 'INSTALLMENT'),
            ),
            const SizedBox(height: 16),

            // 6. Điều kiện đăng ký [8116:25782]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Điều kiện đăng ký',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Thanh toán theo đợt chỉ là tình huống mẫu về điều kiện hỗ trợ. Chưa cấu hình ngân hàng, cổng thanh toán hoặc chính sách thực tế.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AcademyColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriceRow(String label, String value, {bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 15 : 13,
            fontWeight: isTotal ? FontWeight.w700 : FontWeight.w400,
            color: isTotal ? AcademyColors.textPrimary : AcademyColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isTotal ? 18 : 14,
            fontWeight: isTotal ? FontWeight.w700 : FontWeight.w600,
            color: isTotal ? AcademyColors.price : AcademyColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentMethodTile({
    required String id,
    required String title,
    String? subtitle,
    required bool isSelected,
    required VoidCallback onSelect,
  }) {
    return InkWell(
      onTap: onSelect,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: isSelected ? AcademyColors.cardWarm : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: AcademyColors.cardBorder,
            width: 1.0,
          ),
        ),
        padding: const EdgeInsets.all(16),
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
                    color: isSelected ? AcademyColors.primary : Colors.white,
                    border: Border.all(
                      color: AcademyColors.primary,
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
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.only(left: 36),
                child: Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AcademyColors.textPrimary,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showPaymentSuccessDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: AcademyColors.cardWarm,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: AcademyColors.primary,
                size: 40,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Ghi danh thành công!',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Khóa học đã được thêm vào mục "Khóa học của tôi".',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: AcademyColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(
                      builder: (_) => const E07MyCoursesScreen(),
                    ),
                    (route) => route.isFirst,
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AcademyColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Xem khóa học của tôi',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
