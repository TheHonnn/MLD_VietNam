import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/locale_cubit.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/utils/launcher_helper.dart';
import '../../../auth/presentation/screens/a03_login_screen.dart';
import '../../../auth/widgets/update_phone_modal.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/branch_repository.dart';
import '../../data/models/membership_models.dart';
import '../../data/repositories/membership_repository.dart';
import 'f02_edit_profile_screen.dart';
import '../widgets/change_password_modal.dart';

class F08SettingsScreen extends StatefulWidget {
  const F08SettingsScreen({super.key});

  @override
  State<F08SettingsScreen> createState() => _F08SettingsScreenState();
}

class _F08SettingsScreenState extends State<F08SettingsScreen> {
  final MembershipRepository _repo = MembershipRepository.instance;
  late UserSettings _settings;

  @override
  void initState() {
    super.initState();
    _settings = _repo.settings;
    if (BranchRepository.instance.activeBranch != null) {
      _settings = _settings.copyWith(preferredBranch: BranchRepository.instance.activeBranch!.name);
    }
  }

  void _updateSettings(UserSettings updated) {
    setState(() {
      _settings = updated;
    });
    _repo.updateSettings(updated);
  }

  void _showLanguageDialog(BuildContext context) {
    final isEn = _settings.language == 'English' || Localizations.localeOf(context).languageCode == 'en';
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetContext) {
        final currentLang = _settings.language;
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isEn ? 'Select Language' : 'Chọn ngôn ngữ',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHeading,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                    onPressed: () => Navigator.pop(bottomSheetContext),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                tileColor: currentLang.contains('Việt') ? AppColors.secondary.withValues(alpha: 0.1) : Colors.transparent,
                title: const Text(
                  'Tiếng Việt',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                subtitle: const Text('Vietnamese (mặc định)'),
                trailing: currentLang.contains('Việt')
                    ? const Icon(Icons.check_circle_rounded, color: AppColors.primary)
                    : null,
                onTap: () {
                  context.read<LocaleCubit>().setLocale(const Locale('vi'));
                  _updateSettings(_settings.copyWith(language: 'Tiếng Việt'));
                  Navigator.pop(bottomSheetContext);
                },
              ),
              const SizedBox(height: 8),
              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                tileColor: currentLang.toLowerCase().contains('eng') ? AppColors.secondary.withValues(alpha: 0.1) : Colors.transparent,
                title: const Text(
                  'English',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                subtitle: const Text('Tiếng Anh'),
                trailing: currentLang.toLowerCase().contains('eng')
                    ? const Icon(Icons.check_circle_rounded, color: AppColors.primary)
                    : null,
                onTap: () {
                  context.read<LocaleCubit>().setLocale(const Locale('en'));
                  _updateSettings(_settings.copyWith(language: 'English'));
                  Navigator.pop(bottomSheetContext);
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  void _showBranchPicker(BuildContext context) async {
    final isEn = _settings.language == 'English' || Localizations.localeOf(context).languageCode == 'en';
    List<BranchModel> branches = BranchRepository.instance.cachedBranches;
    if (branches.isEmpty) {
      branches = await BranchRepository.instance.getBranches();
    }
    if (!context.mounted) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isEn ? 'Preferred Branch' : 'Chọn chi nhánh ưu tiên',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHeading,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...branches.map((b) {
                final isSelected = _settings.preferredBranch == b.name ||
                    BranchRepository.instance.activeBranch?.id == b.id;
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFFF5F7F7) : Colors.transparent,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : AppColors.border,
                      width: 1.0,
                    ),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    leading: Icon(
                      Icons.storefront_rounded,
                      color: isSelected ? AppColors.primary : AppColors.textSecondary,
                    ),
                    title: Text(
                      b.name,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? AppColors.primary : AppColors.textPrimary,
                      ),
                    ),
                    subtitle: Text(
                      b.address,
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    trailing: isSelected
                        ? const Icon(Icons.check_circle_rounded, color: AppColors.primary)
                        : null,
                    onTap: () {
                      BranchRepository.instance.setActiveBranch(b);
                      _updateSettings(_settings.copyWith(preferredBranch: b.name));
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(isEn ? 'Preferred branch updated: ${b.name}' : 'Đã chọn chi nhánh: ${b.name}'),
                          backgroundColor: AppColors.primary,
                        ),
                      );
                    },
                  ),
                );
              }),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  void _showThemePicker(BuildContext context) {
    final isEn = _settings.language == 'English' || Localizations.localeOf(context).languageCode == 'en';
    final themes = [
      {'val': 'Sáng', 'en': 'Light', 'icon': Icons.wb_sunny_outlined},
      {'val': 'Tối', 'en': 'Dark', 'icon': Icons.nightlight_round},
      {'val': 'Hệ thống', 'en': 'System', 'icon': Icons.settings_suggest_outlined},
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isEn ? 'Appearance Theme' : 'Giao diện ứng dụng',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 16),
              ...themes.map((t) {
                final isSelected = _settings.theme == t['val'] || _settings.theme == t['en'];
                return ListTile(
                  leading: Icon(t['icon'] as IconData, color: isSelected ? AppColors.primary : AppColors.textSecondary),
                  title: Text(isEn ? t['en'] as String : t['val'] as String),
                  trailing: isSelected ? const Icon(Icons.check_circle_rounded, color: AppColors.primary) : null,
                  onTap: () {
                    _updateSettings(_settings.copyWith(theme: isEn ? t['en'] as String : t['val'] as String));
                    Navigator.pop(ctx);
                  },
                );
              }),
            ],
          ),
        );
      },
    );
  }

  void _showInfoModal(BuildContext context, String title, String body) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(24),
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHeading,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: SingleChildScrollView(
                  child: Text(
                    body,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.6,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showDeleteAccountDialog(BuildContext context, bool isEn) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 24),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isEn ? 'Delete Account' : 'Xóa tài khoản',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isEn
                    ? 'Are you sure you want to delete your account? This action is permanent and cannot be undone.'
                    : 'Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản không? Thao tác này không thể hoàn tác.',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                isEn
                    ? 'All your personal data, booking records, membership tiers, loyalty points, treatment history, and academy course progress will be permanently erased in compliance with Apple and Google privacy standards.'
                    : 'Toàn bộ dữ liệu cá nhân, lịch hẹn spa, hạng thành viên, điểm tích lũy, hồ sơ trị liệu và tiến trình khóa học sẽ bị xóa vĩnh viễn khỏi hệ thống MLD Việt Nam theo quy chuẩn bảo mật.',
                style: const TextStyle(
                  fontSize: 13,
                  height: 1.5,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: Text(
              isEn ? 'Cancel' : 'Hủy',
              style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w500),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(dialogCtx);
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (_) => const Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              );

              await AuthService.instance.deleteAccount();

              if (context.mounted) {
                Navigator.pop(context);
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const A03LoginScreen()),
                  (route) => false,
                );
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: AppColors.textHeading,
                    content: Text(
                      isEn
                          ? 'Your account and personal data have been permanently deleted.'
                          : 'Tài khoản và dữ liệu cá nhân của bạn đã được xóa vĩnh viễn thành công.',
                    ),
                  ),
                );
              }
            },
            child: Text(
              isEn ? 'Delete Permanently' : 'Xóa vĩnh viễn',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isEn = _settings.language == 'English' || Localizations.localeOf(context).languageCode == 'en';
    final userPhone = _repo.profile.phone.trim();

    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- 1. HEADER & BACK BUTTON ---
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  InkWell(
                    onTap: () => Navigator.pop(context),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.arrow_back_rounded,
                          size: 20,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              Text(
                isEn ? 'Account Settings' : 'Cài đặt tài khoản',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading, // #693B20
                ),
              ),
              const SizedBox(height: 6),
              Text(
                isEn ? 'Manage your experience, security, and preferences.' : 'Quản lý trải nghiệm, bảo mật và các tùy chọn của bạn.',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),

              const SizedBox(height: 24),

              // --- 2. NHÓM BẢO MẬT & TÀI KHOẢN ---
              _buildSectionTitle(isEn ? 'Security & Account' : 'Bảo mật & Tài khoản'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.person_outline_rounded,
                  title: isEn ? 'Personal Profile' : 'Thông tin cá nhân',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F02EditProfileScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.lock_reset_rounded,
                  title: isEn ? 'Change Password' : 'Đổi mật khẩu',
                  onTap: () {
                    if (!AuthService.instance.isLoggedIn) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(isEn ? 'Please sign in to change password' : 'Vui lòng đăng nhập để đổi mật khẩu'),
                        ),
                      );
                      return;
                    }
                    ChangePasswordModal.show(context);
                  },
                ),
                _buildMenuItem(
                  icon: Icons.smartphone_rounded,
                  title: isEn ? 'Linked Phone Number' : 'Số điện thoại liên kết',
                  subtitle: userPhone.isNotEmpty
                      ? '$userPhone · ${isEn ? "Verified" : "Đã xác thực"}'
                      : (isEn ? 'Not linked yet (Tap to link)' : 'Chưa liên kết (Bấm để liên kết)'),
                  isLast: true,
                  onTap: () {
                    if (userPhone.isEmpty) {
                      UpdatePhoneModal.show(context).then((res) { if (res == true && mounted) setState(() {}); });
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(isEn ? 'Phone number verified' : 'Số điện thoại chính đã xác thực')),
                      );
                    }
                  },
                ),
              ]),

              const SizedBox(height: 20),

              // --- 3. NHÓM THÔNG BÁO (Toggles) ---
              _buildSectionTitle(isEn ? 'Notifications' : 'Thông báo'),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border, width: 1.0),
                ),
                child: Column(
                  children: [
                    _buildToggleRow(
                      title: isEn ? 'Appointment Reminders' : 'Thông báo lịch hẹn',
                      value: _settings.notifyAppointments,
                      isEn: isEn,
                      onChanged: (val) {
                        _updateSettings(_settings.copyWith(notifyAppointments: val));
                      },
                    ),
                    const Divider(height: 1, thickness: 1, indent: 16, endIndent: 16, color: Color(0xFFE8F5F1)),
                    _buildToggleRow(
                      title: isEn ? 'Treatment Alerts' : 'Thông báo liệu trình',
                      value: _settings.notifyTreatments,
                      isEn: isEn,
                      onChanged: (val) {
                        _updateSettings(_settings.copyWith(notifyTreatments: val));
                      },
                    ),
                    const Divider(height: 1, thickness: 1, indent: 16, endIndent: 16, color: Color(0xFFE8F5F1)),
                    _buildToggleRow(
                      title: isEn ? 'Course Notifications' : 'Thông báo khóa học',
                      value: _settings.notifyCourses,
                      isEn: isEn,
                      onChanged: (val) {
                        _updateSettings(_settings.copyWith(notifyCourses: val));
                      },
                    ),
                    const Divider(height: 1, thickness: 1, indent: 16, endIndent: 16, color: Color(0xFFE8F5F1)),
                    _buildToggleRow(
                      title: isEn ? 'Promotions & Offers' : 'Chương trình ưu đãi',
                      value: _settings.notifyPromotions,
                      isEn: isEn,
                      isLast: true,
                      onChanged: (val) {
                        _updateSettings(_settings.copyWith(notifyPromotions: val));
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // --- 4. NHÓM TÙY CHỌN ---
              _buildSectionTitle(isEn ? 'Preferences' : 'Tùy chọn'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.language_rounded,
                  title: isEn ? 'Language' : 'Ngôn ngữ',
                  subtitle: _settings.language,
                  onTap: () => _showLanguageDialog(context),
                ),
                _buildMenuItem(
                  icon: Icons.location_on_outlined,
                  title: isEn ? 'Preferred Branch' : 'Chi nhánh ưu tiên',
                  subtitle: _settings.preferredBranch,
                  onTap: () => _showBranchPicker(context),
                ),
                _buildMenuItem(
                  icon: Icons.wb_sunny_outlined,
                  title: isEn ? 'Theme' : 'Giao diện',
                  subtitle: _settings.theme,
                  isLast: true,
                  onTap: () => _showThemePicker(context),
                ),
              ]),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4.0),
                child: Text(
                  isEn ? 'One account across all official MLD Vietnam centers.' : 'Một tài khoản dùng tại các cơ sở liên kết của MLD Việt Nam.',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // --- 5. NHÓM QUYỀN RIÊNG TƯ & BẢO MẬT ---
              _buildSectionTitle(isEn ? 'Privacy & Security' : 'Quyền riêng tư & bảo mật'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.security_rounded,
                  title: isEn ? 'Privacy Policy' : 'Chính sách bảo mật',
                  onTap: () => _showInfoModal(
                    context,
                    isEn ? 'Privacy Policy' : 'Chính sách bảo mật',
                    isEn
                        ? 'MLD Vietnam commits to protecting all personal information and medical data of customers. Information is only used for booking, treatment journals, and loyalty programs under Vietnamese law.'
                        : 'MLD Việt Nam cam kết bảo vệ dữ liệu cá nhân và hồ sơ trị liệu của khách hàng tuyệt đối an toàn. Mọi dữ liệu chỉ phục vụ đặt lịch, liệu trình và tích điểm theo quy chuẩn an toàn thông tin.',
                  ),
                ),
                _buildMenuItem(
                  icon: Icons.description_outlined,
                  title: isEn ? 'Terms of Service' : 'Điều khoản dịch vụ',
                  onTap: () => _showInfoModal(
                    context,
                    isEn ? 'Terms of Service' : 'Điều khoản dịch vụ',
                    isEn
                        ? 'By using the MLD Vietnam application, you agree to our terms of booking, payment policies, cancellation guidelines, and customer code of conduct.'
                        : 'Khi sử dụng ứng dụng MLD Việt Nam, quý khách đồng ý với các quy định đặt lịch, chính sách thanh toán, hướng dẫn đổi hủy và quy tắc ứng xử của viện thẩm mỹ.',
                  ),
                ),
                _buildMenuItem(
                  icon: Icons.rule_folder_outlined,
                  title: isEn ? 'Data Privacy Rights' : 'Quyền riêng tư dữ liệu',
                  onTap: () => _showInfoModal(
                    context,
                    isEn ? 'Data Privacy Rights' : 'Quyền riêng tư dữ liệu',
                    isEn
                        ? 'Customers have the right to request access, correction, export, or deletion of their personal data stored within MLD Vietnam systems.'
                        : 'Khách hàng có toàn quyền yêu cầu xem, chỉnh sửa, trích xuất hoặc xóa dữ liệu cá nhân khỏi hệ thống máy chủ MLD Việt Nam bất cứ lúc nào.',
                  ),
                ),
                _buildMenuItem(
                  icon: Icons.download_rounded,
                  title: isEn ? 'Request Data Export' : 'Yêu cầu xuất dữ liệu',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(isEn ? 'Data export request submitted' : 'Yêu cầu xuất bản sao dữ liệu đã gửi')),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.person_remove_outlined,
                  title: isEn ? 'Delete Account' : 'Xóa tài khoản',
                  isLast: true,
                  onTap: () => _showDeleteAccountDialog(context, isEn),
                ),
              ]),

              const SizedBox(height: 20),

              // --- 6. NHÓM HỖ TRỢ ---
              _buildSectionTitle(isEn ? 'Support' : 'Hỗ trợ'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.headset_mic_outlined,
                  title: isEn ? 'Customer Service Hotline' : 'Hotline CSKH',
                  subtitle: '1900 6868',
                  onTap: () => AppLauncherHelper.makePhoneCall(context, '19006868'),
                ),
                _buildMenuItem(
                  icon: Icons.help_outline_rounded,
                  title: isEn ? 'FAQs' : 'Câu hỏi thường gặp',
                  onTap: () => _showInfoModal(
                    context,
                    isEn ? 'Frequently Asked Questions' : 'Câu hỏi thường gặp',
                    isEn
                        ? '1. How do I book an appointment? Choose service -> Select branch & specialist -> Select time -> Confirm.\n2. Can I cancel a booking? Yes, at least 2 hours before the scheduled time.'
                        : '1. Cách đặt lịch? Chọn dịch vụ -> Chọn chi nhánh & kỹ thuật viên -> Chọn giờ -> Xác nhận.\n2. Có thể đổi lịch không? Quý khách có thể đổi trước giờ hẹn tối thiểu 2 tiếng qua app.',
                  ),
                ),
                _buildMenuItem(
                  icon: Icons.chat_bubble_outline_rounded,
                  title: isEn ? 'App Feedback' : 'Góp ý ứng dụng',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(isEn ? 'Thank you for your feedback!' : 'Cảm ơn bạn đã đóng góp ý kiến!')),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.info_outline_rounded,
                  title: isEn ? 'About MLD Vietnam' : 'Về MLD Việt Nam',
                  subtitle: 'Phiên bản 1.0.0',
                  isLast: true,
                  onTap: () => _showInfoModal(
                    context,
                    'MLD Việt Nam',
                    isEn
                        ? 'MLD Vietnam - Premier medical aesthetic, body healthcare, and international standard vocational training center.'
                        : 'MLD Việt Nam - Hệ thống chăm sóc thẩm mỹ, dưỡng sinh y khoa và học viện đào tạo nghề thẩm mỹ chuẩn quốc tế.',
                  ),
                ),
              ]),

              const SizedBox(height: 24),

              // --- 7. ĐĂNG XUẤT ---
              InkWell(
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      title: Text(isEn ? 'Sign Out' : 'Đăng xuất'),
                      content: Text(isEn ? 'Are you sure you want to sign out?' : 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng không?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: Text(isEn ? 'Cancel' : 'Hủy', style: const TextStyle(color: AppColors.textSecondary)),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                          onPressed: () async {
                            Navigator.pop(ctx);
                            await AuthService.instance.logout();
                            if (context.mounted) {
                              Navigator.pushAndRemoveUntil(
                                context,
                                MaterialPageRoute(builder: (_) => const A03LoginScreen()),
                                (route) => false,
                              );
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(isEn ? 'Signed out successfully' : 'Đã đăng xuất thành công')),
                              );
                            }
                          },
                          child: Text(isEn ? 'Sign Out' : 'Đăng xuất', style: const TextStyle(color: Colors.white)),
                        ),
                      ],
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  width: double.infinity,
                  height: 48,
                  alignment: Alignment.center,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.logout_rounded, size: 20, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Text(
                        isEn ? 'Sign Out' : 'Đăng xuất',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary, // #985018
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              Center(
                child: Text(
                  _settings.version,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppColors.textHeading, // #693B20
        ),
      ),
    );
  }

  Widget _buildCardGroup(List<Widget> items) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: items,
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
    bool isLast = false,
  }) {
    return Column(
      children: [
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          leading: Icon(icon, size: 22, color: AppColors.primary),
          title: Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
            ),
          ),
          subtitle: subtitle != null
              ? Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                )
              : null,
          trailing: const Icon(
            Icons.chevron_right_rounded,
            size: 20,
            color: AppColors.textSecondary,
          ),
          onTap: onTap,
        ),
        if (!isLast)
          const Divider(
            height: 1,
            thickness: 1,
            indent: 16,
            endIndent: 16,
            color: Color(0xFFE8F5F1),
          ),
      ],
    );
  }

  Widget _buildToggleRow({
    required String title,
    required bool value,
    required ValueChanged<bool> onChanged,
    required bool isEn,
    bool isLast = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value ? (isEn ? 'Enabled' : 'Đang bật') : (isEn ? 'Disabled' : 'Đang tắt'),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          ),
          const SizedBox(width: 8),
          Switch(
            value: value,
            activeThumbColor: Colors.white,
            activeTrackColor: AppColors.primary, // #985018
            inactiveThumbColor: Colors.white,
            inactiveTrackColor: AppColors.surfaceDisabled,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
