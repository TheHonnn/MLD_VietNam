import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/constants/app_colors.dart';

enum LegalDocType {
  privacyPolicy,
  termsOfService,
}

class LegalDocumentScreen extends StatelessWidget {
  final LegalDocType type;

  const LegalDocumentScreen({
    super.key,
    required this.type,
  });

  bool get isPrivacy => type == LegalDocType.privacyPolicy;

  String get screenTitle => isPrivacy ? 'Chính sách bảo mật thông tin' : 'Điều khoản sử dụng';
  String get shortTitle => isPrivacy ? 'Chính sách bảo mật' : 'Điều khoản sử dụng';
  String get organization => isPrivacy 
      ? 'Công Ty TNHH Giáo Dục Và Đào Tạo Minh Anh'
      : 'Hệ Bạch Huyết (hebachhuyet.vn) · MLD Việt Nam';

  @override
  Widget build(BuildContext context) {
    final sections = isPrivacy ? _privacySections : _termsSections;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        title: Text(
          shortTitle,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy_rounded, color: AppColors.primary, size: 20),
            tooltip: 'Sao chép nội dung',
            onPressed: () {
              final fullText = sections.map((s) => '${s.title}\n${s.content}').join('\n\n');
              Clipboard.setData(ClipboardData(text: '$screenTitle\n$organization\n\n$fullText'));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Đã sao chép văn bản vào bộ nhớ tạm'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Badge & Title Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primary.withValues(alpha: 0.08),
                      AppColors.primary.withValues(alpha: 0.02),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            isPrivacy ? Icons.verified_user_rounded : Icons.gavel_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                organization,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                  letterSpacing: 0.3,
                                ),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                'Hiệu lực: Cập nhật tháng 10/2026 · Pháp lý Việt Nam',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      screenTitle.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        height: 1.3,
                        letterSpacing: 0.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isPrivacy
                          ? 'Công Ty TNHH Giáo dục và đào tạo Minh Anh cam kết bảo mật an toàn tuyệt đối với thông tin cá nhân của khách hàng theo chính sách bảo vệ thông tin của doanh nghiệp và các quy định của pháp luật Việt Nam.'
                          : 'Chào mừng bạn ghé thăm ứng dụng và website chính thức của Hệ Bạch Huyết (hebachhuyet.vn) & MLD Việt Nam. Vui lòng dành thời gian đọc và tìm hiểu những điều khoản về thỏa thuận pháp lý dưới đây.',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Sections
              ...sections.map((section) => Container(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border, width: 0.8),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.02),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 6,
                              height: 18,
                              margin: const EdgeInsets.only(top: 2, right: 10),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                            Expanded(
                              child: Text(
                                section.title,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textHeading,
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          section.content,
                          style: const TextStyle(
                            fontSize: 13.5,
                            color: AppColors.textPrimary,
                            height: 1.6,
                          ),
                        ),
                      ],
                    ),
                  )),

              // Footer Contact Card
              Container(
                margin: const EdgeInsets.only(top: 8, bottom: 24),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'THÔNG TIN LIÊN HỆ & GIẢI ĐÁP PHÁP LÝ',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textSecondary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.business_outlined, size: 16, color: AppColors.primary),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Công Ty TNHH Giáo dục và đào tạo Minh Anh',
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.location_on_outlined, size: 16, color: AppColors.primary),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Số 8, ngõ 110 Quan Nhân, P. Nhân Chính, Q. Thanh Xuân, Hà Nội',
                            style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Row(
                      children: [
                        Icon(Icons.phone_outlined, size: 16, color: AppColors.primary),
                        SizedBox(width: 8),
                        Text(
                          '0868.06.2703 (Hotline trung tâm)',
                          style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Row(
                      children: [
                        Icon(Icons.mail_outline_rounded, size: 16, color: AppColors.primary),
                        SizedBox(width: 8),
                        Text(
                          'manihealingcare@gmail.com',
                          style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static final List<_LegalSection> _privacySections = [
    const _LegalSection(
      title: '1. Mục đích thu thập thông tin cá nhân',
      content: '– Việc thu thập dữ liệu trên website hebachhuyet.vn và ứng dụng MLD Việt Nam bao gồm: email, điện thoại, tên đăng nhập, mật khẩu đăng nhập, địa chỉ khách hàng (thành viên). Đây là các thông tin cần thành viên cung cấp bắt buộc khi đăng ký sử dụng dịch vụ và để liên hệ xác nhận khi khách hàng đăng ký sử dụng dịch vụ nhằm đảm bảo quyền lợi cho người tiêu dùng.\n\n– Các thành viên sẽ tự chịu trách nhiệm về bảo mật và lưu giữ mọi hoạt động sử dụng dịch vụ dưới tên đăng ký, mật khẩu và hộp thư điện tử của mình. Ngoài ra, thành viên có trách nhiệm thông báo kịp thời cho ban quản trị về những hành vi sử dụng trái phép, lạm dụng, vi phạm bảo mật, lưu giữ tên đăng ký và mật khẩu của bên thứ ba để có biện pháp giải quyết phù hợp.',
    ),
    const _LegalSection(
      title: '2. Phạm vi thu thập thông tin',
      content: 'Hệ thống sử dụng thông tin thành viên cung cấp để:\n• Cung cấp các dịch vụ y khoa, trị liệu và đào tạo đến Thành viên;\n• Gửi các thông báo về các hoạt động trao đổi thông tin giữa thành viên và trung tâm;\n• Ngăn ngừa các hoạt động phá hủy tài khoản người dùng của thành viên hoặc các hoạt động giả mạo Thành viên;\n• Liên lạc và giải quyết với thành viên trong những trường hợp đặc biệt;\n• Không sử dụng thông tin cá nhân của thành viên ngoài mục đích xác nhận và liên hệ có liên quan đến giao dịch;\n• Trong trường hợp có yêu cầu của pháp luật: có trách nhiệm hợp tác cung cấp thông tin cá nhân thành viên khi có yêu cầu từ cơ quan tư pháp bao gồm Viện kiểm sát, tòa án, cơ quan công an điều tra liên quan đến hành vi vi phạm pháp luật nào đó của khách hàng. Ngoài ra, không ai có quyền xâm phạm vào thông tin cá nhân của thành viên.',
    ),
    const _LegalSection(
      title: '3. Thời gian lưu trữ thông tin',
      content: 'Dữ liệu cá nhân của Thành viên sẽ được lưu trữ cho đến khi có yêu cầu hủy bỏ hoặc tự thành viên đăng nhập và thực hiện hủy bỏ. Còn lại trong mọi trường hợp thông tin cá nhân thành viên sẽ được bảo mật tuyệt đối trên hệ thống máy chủ.',
    ),
    const _LegalSection(
      title: '4. Những người hoặc tổ chức có thể tiếp cận thông tin',
      content: '– Các đối tác là bên cung cấp dịch vụ cho chúng tôi liên quan đến thực hiện đơn hàng và chỉ giới hạn trong phạm vi thông tin cần thiết cũng như áp dụng các quy định đảm bảo an ninh, bảo mật các thông tin cá nhân.\n\n– Chúng tôi sử dụng dịch vụ từ một nhà cung cấp dịch vụ là bên thứ ba để thực hiện một số hoạt động liên quan đến hệ thống. Khi đó, bên thứ ba có thể truy cập hoặc xử lý các thông tin cá nhân trong quá trình cung cấp các dịch vụ đó. Chúng tôi yêu cầu các bên thứ ba tuân thủ mọi luật lệ về bảo vệ thông tin cá nhân liên quan và các yêu cầu về an ninh liên quan đến thông tin cá nhân.\n\n– Các chương trình có tính liên kết, đồng thực hiện, thuê ngoài cho các mục đích hợp pháp và luôn áp dụng các yêu cầu bảo mật thông tin cá nhân.\n\n– Yêu cầu pháp lý: Chúng tôi có thể tiết lộ các thông tin cá nhân nếu điều đó do luật pháp yêu cầu và việc tiết lộ như vậy là cần thiết một cách hợp lý để tuân thủ các quy trình pháp lý.\n\n– Chuyển giao kinh doanh (nếu có): trong trường hợp sáp nhập, hợp nhất toàn bộ hoặc một phần với công ty khác, người mua sẽ có quyền truy cập thông tin được chúng tôi lưu trữ, duy trì trong đó bao gồm cả thông tin cá nhân.',
    ),
    const _LegalSection(
      title: '5. Địa chỉ của đơn vị thu thập và quản lý thông tin',
      content: '• Tên doanh nghiệp: Công Ty TNHH Giáo dục và đào tạo Minh Anh\n• Trụ sở chính: Số 8, ngõ 110 Quan Nhân, P. Nhân Chính, Q. Thanh Xuân, Hà Nội\n• Điện thoại: 0868.06.2703\n• Email: manihealingcare@gmail.com',
    ),
    const _LegalSection(
      title: '6. Phương thức tiếp cận và chỉnh sửa dữ liệu cá nhân',
      content: '– Thành viên có quyền tự kiểm tra, cập nhật, điều chỉnh hoặc hủy bỏ thông tin cá nhân của mình bằng cách đăng nhập vào tài khoản và chỉnh sửa thông tin cá nhân hoặc yêu cầu ban quản trị thực hiện việc này.\n\n– Thành viên có quyền gửi khiếu nại về việc lộ thông tin cá nhân cho bên thứ 3 đến Ban quản trị. Khi tiếp nhận những phản hồi này, chúng tôi sẽ xác nhận lại thông tin, có trách nhiệm trả lời lý do và hướng dẫn thành viên khôi phục và bảo mật lại thông tin an toàn.',
    ),
  ];

  static final List<_LegalSection> _termsSections = [
    const _LegalSection(
      title: '1. Quy định chung về chấp thuận điều khoản',
      content: 'Thông qua việc truy cập, duyệt nội dung, hoặc sử dụng bất kì nội dung, hình ảnh nào của trang thông tin điện tử và ứng dụng MLD Việt Nam, bạn (người sử dụng) công nhận rằng bạn đã đọc, hiểu và nhất trí với việc tuân thủ các quy định của những điều khoản này. Nếu bạn không nhất trí với những điều khoản này, xin vui lòng không sử dụng.\n\nHệ Bạch Huyết chịu trách nhiệm đảm bảo tính hợp pháp của việc cung cấp nội dung đến người sử dụng. Mọi thông tin, hình ảnh và toàn bộ nội dung được đăng tải tuân thủ các quy định của pháp luật, và phù hợp với thuần phong mỹ tục Việt Nam.',
    ),
    const _LegalSection(
      title: '2. Bản quyền và Sở hữu trí tuệ',
      content: 'Tuyên bố các quyền Sở hữu trí tuệ của Hệ Bạch Huyết đối với các đối tượng thể hiện trên hệ thống:\n\n– Hệ thống này và tất cả nội dung, bao gồm nhưng không giới hạn các văn bản, thiết kế, đồ họa, giao diện, hình ảnh, mã code đều thuộc bản quyền của Hệ Bạch Huyết hoặc bên thứ ba cấp phép cho Hệ Bạch Huyết. Bản quyền được thể hiện bằng dòng chữ: "© 2021 Copyright by Hệ Bạch Huyết. All rights reserved."\n\n– Bất kỳ nội dung nào thuộc hệ thống này bao gồm nhãn hiệu, tên thương mại, mẫu logo công ty hoặc sản phẩm, kiểu dáng sản phẩm… đều thuộc quyền sở hữu của Hệ Bạch Huyết và được bảo hộ theo quy định của Luật Sở hữu trí tuệ Việt Nam và các văn bản liên quan.\n\n– Mọi hành vi sao chép, trích dẫn, sửa đổi, phân phối, xuất bản, lưu thông… vì mục đích thương mại dưới mọi hình thức mà không được sự chấp thuận trước bằng văn bản của Hệ Bạch Huyết là xâm phạm quyền sở hữu trí tuệ. Hệ Bạch Huyết có quyền yêu cầu người sử dụng chấm dứt việc sử dụng và bồi thường thiệt hại (nếu có).',
    ),
    const _LegalSection(
      title: '3. Quyền và trách nhiệm của Hệ Bạch Huyết',
      content: '– Hệ Bạch Huyết có quyền thay đổi và/hoặc chấm dứt các nội dung, tính năng của một phần hay toàn bộ hệ thống mà không cần thông báo trước với người sử dụng.\n\n– Hệ Bạch Huyết có quyền thực hiện các biện pháp an ninh để bảo vệ và chống lại các truy cập trái phép hoặc sửa đổi trái phép, tiết lộ hoặc phá hủy thông tin trên hệ thống.\n\n– Khi sử dụng, thông tin sẽ được truyền qua một phương tiện/thiết bị nằm ngoài sự kiểm soát của Hệ Bạch Huyết. Theo đó, Hệ Bạch Huyết không chịu trách nhiệm cho hoặc liên quan đến bất kỳ sự chậm trễ, thất bại, bị gián đoạn của bất kỳ dữ liệu hoặc các thông tin khác được truyền trong kết nối với việc sử dụng.\n\n– Thông tin cá nhân như địa chỉ, email, số điện thoại của người sử dụng có thể được sử dụng nội bộ cho mục đích nâng cấp các sản phẩm, dịch vụ. Cam kết không chủ động tiết lộ thông tin cho bên thứ ba, trừ trường hợp có yêu cầu bằng văn bản của các đơn vị điều tra theo luật pháp.\n\n– Hệ Bạch Huyết được phép sử dụng bất kỳ ý tưởng hay khái niệm nào mà bạn đã đóng góp lên hệ thống cho tất cả các mục đích không giới hạn, bao gồm phát triển, sản xuất hay tiếp thị sản phẩm mà không có nghĩa vụ bồi hoàn.\n\n– Hệ Bạch Huyết có quyền từ chối một số tài liệu do người dùng gửi mà không bắt buộc phản hồi lý do.',
    ),
    const _LegalSection(
      title: '4. Quyền và nghĩa vụ của người sử dụng',
      content: '– Hệ Bạch Huyết cho phép người sử dụng xem, chiết xuất thông tin (in, tải, chuyển tiếp…) hoặc chia sẻ cho người khác nhưng chỉ cho mục đích sử dụng cá nhân và phi thương mại với điều kiện phải trích dẫn thông báo bản quyền: "©2021 Copyright by Hệ Bạch Huyết."\n\n– Bạn đảm bảo tuân theo pháp luật và các quy định liên quan đến việc sử dụng dịch vụ; Không can thiệp, gây ảnh hưởng đến việc sử dụng của những người khác; Không can thiệp vào hoạt động và hạ tầng kỹ thuật.\n\n– Bạn nhận thức rõ và chấp nhận rằng Hệ Bạch Huyết không chịu trách nhiệm đối với bất kỳ tổn thất, thiệt hại, chi phí phát sinh từ bất kỳ quyết định nào của bạn khi sử dụng bất kỳ thông tin nào với bất kỳ nguyên nhân gì.\n\n– Nếu bạn không bằng lòng với bất kỳ thông tin nào hoặc với bất kỳ điều khoản và điều kiện sử dụng nào thì phương thức duy nhất bạn nên thực hiện là chấm dứt truy cập/sử dụng.',
    ),
    const _LegalSection(
      title: '5. Điều khoản chung & Tranh chấp',
      content: '– Điều khoản sử dụng được điều chỉnh và giải thích bởi pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.\n\n– Một điều khoản sử dụng bị vô hiệu theo quyết định của tòa án có thẩm quyền sẽ không làm ảnh hưởng đến tính hiệu lực của các điều khoản còn lại.\n\n– Hệ Bạch Huyết luôn hoan nghênh những ý kiến/góp ý của bạn về nội dung. Nếu có phần nào bạn cho rằng có dấu hiệu vi phạm bản quyền, vui lòng gửi phản hồi về cho chúng tôi.\n\n– Thông báo này và tất cả các điều khoản sử dụng tạo thành toàn bộ thỏa thuận giữa Hệ Bạch Huyết và bạn liên quan đến việc sử dụng. Các điều chỉnh có hiệu lực ngay khi cập nhật trên ứng dụng.',
    ),
  ];
}

class _LegalSection {
  final String title;
  final String content;

  const _LegalSection({
    required this.title,
    required this.content,
  });
}

