import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/launcher_helper.dart';
import '../../../home/data/models/home_models.dart';

class B06BranchDetailScreen extends StatelessWidget {
  final String branchName;
  final String branchAddress;
  final String branchImage;
  final String branchPhone;
  final BranchModel? branch;

  const B06BranchDetailScreen({
    super.key,
    this.branchName = 'Trụ sở MLD Việt Nam (5 Master LV3)',
    this.branchAddress = 'Số 260, Ngõ 271 Bùi Xương Trạch, Khương Đình, Hà Nội, Phường Khương Đình, Thành phố Hà Nội',
    this.branchImage = 'assets/images/chinhanh.webp',
    this.branchPhone = '096.7786.399',
    this.branch,
  });

  Widget _buildImage(String imageUrl) {
    if (imageUrl.startsWith('http')) {
      return Image.network(
        imageUrl,
        width: double.infinity,
        height: 220,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Image.asset(
          'assets/images/chinhanh.webp',
          width: double.infinity,
          height: 220,
          fit: BoxFit.cover,
        ),
      );
    }
    return Image.asset(
      imageUrl.isNotEmpty ? imageUrl : 'assets/images/chinhanh.webp',
      width: double.infinity,
      height: 220,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(
        width: double.infinity,
        height: 220,
        color: AppColors.surfaceSecondary,
        child: const Center(
          child: Icon(Icons.storefront_rounded, size: 48, color: AppColors.primary),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = branch?.name ?? branchName;
    final address = branch?.address ?? branchAddress;
    final phone = (branch != null && branch!.phone.isNotEmpty) ? branch!.phone : branchPhone;
    final image = (branch != null && branch!.imageUrl.isNotEmpty) ? branch!.imageUrl : branchImage;

    final googleMapsUrl = 'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Back Button
              Row(
                children: [
                  InkWell(
                    onTap: () => Navigator.pop(context),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(Icons.arrow_back, color: AppColors.textPrimary, size: 22),
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Text(
                      'Chi tiết chi nhánh',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Hình ảnh
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: _buildImage(image),
              ),

              const SizedBox(height: 20),

              // Tên cơ sở
              Text(
                name,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),

              const SizedBox(height: 12),

              // Địa chỉ
              Text(
                address,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.5,
                  color: AppColors.textPrimary,
                ),
              ),

              const SizedBox(height: 16),

              // Hotline / Số điện thoại
              InkWell(
                onTap: () => AppLauncherHelper.makePhoneCall(context, phone),
                child: Text(
                  'Hotline: $phone',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Nút liên kết Google Map trỏ đến đúng trung tâm
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => AppLauncherHelper.openWebUrl(context, googleMapsUrl),
                  child: const Text(
                    'Xem trên Google Maps',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
