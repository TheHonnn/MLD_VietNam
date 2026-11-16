import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../widgets/academy_widgets.dart';
import 'e01_academy_home_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';

class E12LearningResultsScreen extends StatefulWidget {
  const E12LearningResultsScreen({super.key});

  @override
  State<E12LearningResultsScreen> createState() => _E12LearningResultsScreenState();
}

class _E12LearningResultsScreenState extends State<E12LearningResultsScreen> {
  bool _isLoading = true;
  List<StudentCertificateModel> _certificates = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final certs = await AcademyRepository.instance.getMyCertificates();
      if (mounted) {
        setState(() {
          _certificates = certs;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AcademyColors.background,
        appBar: AcademyAppBar(),
        body: Center(
          child: CircularProgressIndicator(color: AcademyColors.primary),
        ),
      );
    }

    final hasRealCertificates = _certificates.isNotEmpty;
    final profile = MembershipRepository.instance.profile;
    final defaultStudentName = profile.fullName.trim().isNotEmpty
        ? profile.fullName.trim()
        : 'Học viên MLD';

    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(),
      body: RefreshIndicator(
        color: AcademyColors.primary,
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Kết quả học tập & Chứng chỉ',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: AcademyColors.heading,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Chứng chỉ điện tử chính thức được Ban Quản trị Học viện xét duyệt và phát hành.',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AcademyColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),

              if (!hasRealCertificates) ...[
                _buildEmptyResultState(context),
              ] else ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: const BoxDecoration(
                          color: AcademyColors.cardWarm,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            defaultStudentName.isNotEmpty ? defaultStudentName[0].toUpperCase() : 'H',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AcademyColors.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              defaultStudentName,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: AcademyColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'Đã cấp ${_certificates.length} chứng nhận chính thức',
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF208C58),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),

                const Text(
                  'CHỨNG NHẬN ĐÃ ĐƯỢC PHÁT HÀNH',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                    color: AcademyColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 12),

                ..._certificates.map((cert) => _buildCourseCertificateCard(context, cert)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCourseCertificateCard(BuildContext context, StudentCertificateModel cert) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _openFullCertificateViewer(context, cert),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6EE),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.workspace_premium_rounded,
                          color: Color(0xFF208C58),
                          size: 24,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            cert.courseTitle,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1E293B),
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6EE),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                Icon(Icons.verified_rounded, size: 14, color: Color(0xFF208C58)),
                                SizedBox(width: 5),
                                Text(
                                  'Đã phát hành chính thức',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF208C58),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Học viên:', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
                    Text(
                      cert.studentName,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF004890)),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Mã chứng nhận:', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
                    Text(
                      cert.certificateCode,
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Xếp loại:', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
                    Text(
                      cert.finalGrade,
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFFB48228)),
                    ),
                  ],
                ),
                if (cert.theoryScore > 0 || cert.practicalScore > 0) ...[
                  const SizedBox(height: 5),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Điểm thi (LT / TH):', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
                      Text(
                        '${cert.theoryScore} / ${cert.practicalScore}',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 5),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Ngày cấp:', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
                    Text(
                      cert.issueDate,
                      style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.workspace_premium_rounded, size: 18, color: Colors.white),
                        label: const Text(
                          'Xem chứng nhận',
                          style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                        onPressed: () => _openFullCertificateViewer(context, cert),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF004890),
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.download_rounded, size: 18, color: Color(0xFF004890)),
                        label: const Text(
                          'Tải PDF',
                          style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Color(0xFF004890)),
                        ),
                        onPressed: () => _downloadCertificatePdf(context, cert),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF004890), width: 1.5),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openFullCertificateViewer(BuildContext context, StudentCertificateModel cert) {
    final boundaryKey = GlobalKey();

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: const BoxDecoration(
                  color: Color(0xFF004890),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 22),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        cert.courseTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.download_rounded, color: Colors.white, size: 22),
                      tooltip: 'Tải PDF',
                      onPressed: () {
                        _downloadCertificatePdf(context, cert, boundaryKey);
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white, size: 22),
                      tooltip: 'Đóng',
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              Flexible(
                child: Container(
                  color: const Color(0xFF1E293B),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                    child: InteractiveViewer(
                      panEnabled: true,
                      minScale: 0.8,
                      maxScale: 3.5,
                      child: CertificateVisualCard(
                        cert: cert,
                        repaintKey: boundaryKey,
                      ),
                    ),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.share_rounded, size: 18),
                        label: const Text(
                          'Chia sẻ',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                        onPressed: () {
                          _downloadCertificatePdf(context, cert, boundaryKey);
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF004890),
                          side: const BorderSide(color: Color(0xFF004890)),
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.download_rounded, size: 18, color: Colors.white),
                        label: const Text(
                          'Tải PDF về máy',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                        onPressed: () {
                          _downloadCertificatePdf(context, cert, boundaryKey);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF208C58),
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _downloadCertificatePdf(
    BuildContext context,
    StudentCertificateModel cert, [
    GlobalKey? boundaryKey,
  ]) async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đang xử lý và tải chứng nhận PDF về máy...'),
        duration: Duration(seconds: 2),
      ),
    );

    try {
      Uint8List? pngBytes;
      if (boundaryKey?.currentContext != null) {
        try {
          final boundary = boundaryKey!.currentContext!.findRenderObject() as RenderRepaintBoundary?;
          if (boundary != null) {
            final image = await boundary.toImage(pixelRatio: 3.0);
            final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
            pngBytes = byteData?.buffer.asUint8List();
          }
        } catch (_) {}
      }

      final document = PdfDocument();
      document.pageSettings.orientation = PdfPageOrientation.portrait;

      if (pngBytes != null && pngBytes.isNotEmpty) {
        document.pageSettings.margins.all = 0;
        final page = document.pages.add();
        final bitmap = PdfBitmap(pngBytes);
        page.graphics.drawImage(
          bitmap,
          Rect.fromLTWH(0, 0, page.getClientSize().width, page.getClientSize().height),
        );
      } else {
        document.pageSettings.margins.all = 20;
        final page = document.pages.add();
        final graphics = page.graphics;
        final size = page.getClientSize();

        final fontTitle = PdfStandardFont(PdfFontFamily.helvetica, 18, style: PdfFontStyle.bold);
        graphics.drawString(
          'CHUNG NHAN HOAN THANH DAO TAO',
          fontTitle,
          brush: PdfSolidBrush(PdfColor(11, 67, 168)),
          bounds: Rect.fromLTWH(0, 40, size.width, 26),
          format: PdfStringFormat(alignment: PdfTextAlignment.center),
        );

        final fontSub = PdfStandardFont(PdfFontFamily.helvetica, 14, style: PdfFontStyle.bold);
        graphics.drawString(
          cert.studentName,
          fontSub,
          brush: PdfSolidBrush(PdfColor(30, 41, 59)),
          bounds: Rect.fromLTWH(0, 80, size.width, 22),
          format: PdfStringFormat(alignment: PdfTextAlignment.center),
        );

        final fontCourse = PdfStandardFont(PdfFontFamily.helvetica, 13, style: PdfFontStyle.bold);
        graphics.drawString(
          cert.courseTitle,
          fontCourse,
          brush: PdfSolidBrush(PdfColor(11, 67, 168)),
          bounds: Rect.fromLTWH(20, 115, size.width - 40, 26),
          format: PdfStringFormat(alignment: PdfTextAlignment.center),
        );

        final fontMeta = PdfStandardFont(PdfFontFamily.helvetica, 10);
        graphics.drawString(
          'Ma: ${cert.certificateCode}  |  Ngay: ${cert.issueDate}',
          fontMeta,
          brush: PdfSolidBrush(PdfColor(100, 116, 139)),
          bounds: Rect.fromLTWH(0, 155, size.width, 20),
          format: PdfStringFormat(alignment: PdfTextAlignment.center),
        );
      }

      final bytes = document.saveSync();
      document.dispose();

      final cleanCode = cert.certificateCode.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
      final fileName = 'MLD_GCN_$cleanCode.pdf';

      final appDir = await getApplicationDocumentsDirectory();
      final appFile = File('${appDir.path}/$fileName');
      await appFile.writeAsBytes(bytes);

      String finalSavedPath = appFile.path;
      try {
        final downloadDir = Directory('/storage/emulated/0/Download');
        if (await downloadDir.exists()) {
          final downloadFile = File('${downloadDir.path}/$fileName');
          await downloadFile.writeAsBytes(bytes);
          finalSavedPath = downloadFile.path;
        }
      } catch (_) {}

      await Share.shareXFiles(
        [XFile(finalSavedPath, mimeType: 'application/pdf', name: fileName)],
        text: 'Giấy chứng nhận: ${cert.courseTitle}',
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF208C58),
            content: Text('Đã tải chứng nhận về máy: $fileName'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.red[700],
            content: Text('Không thể tải chứng nhận PDF: $e'),
          ),
        );
      }
    }
  }

  Widget _buildEmptyResultState(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AcademyColors.cardWarm,
              shape: BoxShape.circle,
              border: Border.all(color: AcademyColors.primary.withValues(alpha: 0.2), width: 1.5),
            ),
            child: const Center(
              child: Icon(
                Icons.school_outlined,
                size: 36,
                color: AcademyColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            context.tr('Chưa có giấy chứng nhận được cấp', 'No certificates issued yet'),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AcademyColors.heading,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            context.tr(
              'Sau khi hoàn thành khóa đào tạo, Ban Quản trị Học viện sẽ tiến hành thẩm định và phát hành Giấy chứng nhận chính thức tại đây.',
              'Once you complete the course, MLD Academy Administrators will review and issue your official certificate here.',
            ),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w400,
              color: AcademyColors.textSecondary,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const E01AcademyHomeScreen()),
                );
              },
              icon: const Icon(Icons.explore_outlined, size: 18),
              label: Text(
                context.tr('Khám phá khóa học ngay', 'Explore Courses Now'),
                style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AcademyColors.primary,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class CertificateVisualCard extends StatelessWidget {
  final StudentCertificateModel cert;
  final String? dateOfBirth;
  final GlobalKey? repaintKey;

  const CertificateVisualCard({
    super.key,
    required this.cert,
    this.dateOfBirth,
    this.repaintKey,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveDob = (cert.dateOfBirth != null && cert.dateOfBirth!.isNotEmpty)
        ? _formatDate(cert.dateOfBirth!)
        : (dateOfBirth != null && dateOfBirth!.isNotEmpty ? _formatDate(dateOfBirth!) : '__/__/____');
    final formattedIssueDate = _formatDate(cert.issueDate);
    const primaryColor = Color(0xFF0B43A8);

    Widget cardContent = AspectRatio(
      aspectRatio: 210 / 297,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: const Color(0xFFBAE6FD), width: 1.0),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: Stack(
            children: [
              Center(
                child: Opacity(
                  opacity: 0.05,
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 220,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Text(
                      'MLD VIETNAM',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 4.0,
                        color: Color(0xFF0B43A8),
                      ),
                    ),
                  ),
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0xD1B4DEF8),
                          Color(0x40FFFFFF),
                        ],
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Image.asset(
                          'assets/images/logo.png',
                          height: 34,
                          width: 50,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.spa_rounded,
                            color: Color(0xFF0B43A8),
                            size: 30,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: const [
                              Text(
                                'VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN CÔNG NGHỆ CSSK CỘNG ĐỒNG',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 7.5,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF0B43A8),
                                  letterSpacing: -0.2,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'TRUNG TÂM ỨNG DỤNG KHOA HỌC BẠCH HUYẾT VIỆT NAM',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 7.0,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF0B43A8),
                                  letterSpacing: -0.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Text(
                          'CHỨNG NHẬN',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'serif',
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.0,
                            color: primaryColor,
                          ),
                        ),
                        const SizedBox(height: 3),
                        const Text(
                          'HOÀN THÀNH ĐÀO TẠO',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                            color: primaryColor,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          cert.courseTitle.toUpperCase(),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Chứng nhận này xác nhận rằng, học viên:',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1F2937),
                          ),
                        ),
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            const Text(
                              'Họ và tên: ',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            Expanded(
                              child: Text(
                                cert.studentName.toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF111827),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Text(
                              'Ngày sinh: ',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            Text(
                              effectiveDob,
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF111827),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Text(
                              'Mã học viên: ',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            Text(
                              cert.certificateCode,
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF111827),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Text(
                              'Ngày cấp: ',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            Text(
                              formattedIssueDate,
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF111827),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Đã hoàn thành chương trình đào tạo:',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1F2937),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${cert.courseTitle.toUpperCase()} THUỘC KHUNG ĐÀO TẠO SỐ 4 CỦA MLD VIỆT NAM TẠI THÀNH PHỐ HỒ CHÍ MINH.',
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: primaryColor,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Padding(
                    padding: const EdgeInsets.only(right: 28, bottom: 4),
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            (cert.signerTitle.isNotEmpty ? cert.signerTitle : 'GIÁM ĐỐC').toUpperCase(),
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF111827),
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 28),
                          Text(
                            cert.signerName.isNotEmpty ? cert.signerName : 'Xuan Truong',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF111827),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(
                    height: 110,
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: CustomPaint(
                            painter: CertificateMountainPainter(),
                          ),
                        ),
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.white.withValues(alpha: 0.85),
                                Colors.white.withValues(alpha: 0.05),
                              ],
                              stops: const [0.0, 0.45],
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: const [
                              _CertificateNoteItem(
                                text: 'Chứng nhận này xác nhận học viên đã hoàn thành đầy đủ các yêu cầu đào tạo của cấp độ tương ứng theo quy định của chương trình.',
                              ),
                              SizedBox(height: 2),
                              _CertificateNoteItem(
                                text: 'Chứng nhận này không đồng nghĩa với việc được phép giảng dạy, đào tạo, cấp chứng nhận hoặc chuyển giao phương pháp Dẫn lưu Bạch huyết Thủ công (MLD) cho người khác.',
                              ),
                              SizedBox(height: 2),
                              _CertificateNoteItem(
                                text: 'Quyền giảng dạy và tư cách giảng viên chỉ được công nhận thông qua Chương trình Đào tạo Giảng viên chính thức và phải có sự phê duyệt bằng văn bản từ Hệ thống Đào tạo MLD Việt Nam.',
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (repaintKey != null) {
      return RepaintBoundary(key: repaintKey, child: cardContent);
    }
    return cardContent;
  }

  static String _formatDate(String raw) {
    if (raw.isEmpty) return '__/__/____';
    final parts = raw.split('-');
    if (parts.length == 3) {
      return '${parts[2].padLeft(2, '0')}/${parts[1].padLeft(2, '0')}/${parts[0]}';
    }
    return raw;
  }
}

class CertificateMountainPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final backPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFFE6F7FB), Color(0xFFA6E0EA)],
      ).createShader(Rect.fromLTWH(0, 0, w, h))
      ..style = PaintingStyle.fill;

    final backPath = Path()
      ..moveTo(0, h * 0.28)
      ..lineTo(w * 0.08, h * 0.25)
      ..lineTo(w * 0.16, h * 0.05)
      ..lineTo(w * 0.23, h * 0.12)
      ..lineTo(w * 0.31, h * 0.35)
      ..lineTo(w * 0.43, h * 0.28)
      ..lineTo(w * 0.54, h * 0.07)
      ..lineTo(w * 0.64, h * 0.23)
      ..lineTo(w * 0.73, h * 0.31)
      ..lineTo(w * 0.82, h * 0.10)
      ..lineTo(w * 0.91, h * 0.23)
      ..lineTo(w, h * 0.19)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(backPath, backPaint);

    final midPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFF8BD6E2), Color(0xFF5CAEC4)],
      ).createShader(Rect.fromLTWH(0, 0, w, h))
      ..style = PaintingStyle.fill;

    final midPath = Path()
      ..moveTo(0, h * 0.47)
      ..lineTo(w * 0.11, h * 0.42)
      ..lineTo(w * 0.19, h * 0.28)
      ..lineTo(w * 0.30, h * 0.45)
      ..lineTo(w * 0.39, h * 0.53)
      ..lineTo(w * 0.51, h * 0.31)
      ..lineTo(w * 0.62, h * 0.48)
      ..lineTo(w * 0.74, h * 0.34)
      ..lineTo(w * 0.84, h * 0.48)
      ..lineTo(w * 0.95, h * 0.37)
      ..lineTo(w, h * 0.41)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(midPath, midPaint);

    final frontPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFF4EAA76), Color(0xFF126274)],
      ).createShader(Rect.fromLTWH(0, 0, w, h))
      ..style = PaintingStyle.fill;

    final frontPath = Path()
      ..moveTo(0, h * 0.72)
      ..lineTo(w * 0.12, h * 0.61)
      ..lineTo(w * 0.25, h * 0.74)
      ..lineTo(w * 0.38, h * 0.57)
      ..lineTo(w * 0.50, h * 0.63)
      ..lineTo(w * 0.63, h * 0.43)
      ..lineTo(w * 0.76, h * 0.58)
      ..lineTo(w * 0.87, h * 0.68)
      ..lineTo(w, h * 0.54)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(frontPath, frontPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _CertificateNoteItem extends StatelessWidget {
  final String text;
  const _CertificateNoteItem({required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '• ',
          style: TextStyle(
            fontSize: 6.8,
            height: 1.25,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1E293B),
          ),
        ),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 6.8,
              height: 1.25,
              fontWeight: FontWeight.w500,
              color: Color(0xFF1E293B),
            ),
          ),
        ),
      ],
    );
  }
}
