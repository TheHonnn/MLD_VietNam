import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/constants/app_colors.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:medical_healthcare_app/features/treatment/data/models/treatment_models.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d01_my_packages_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d02_package_details_screen.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d03_care_journal_screen.dart';

Widget _buildTestApp(Widget child) {
  return MaterialApp(
    locale: const Locale('vi'),
    supportedLocales: const [Locale('vi'), Locale('en')],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    theme: ThemeData(
      primaryColor: AppColors.primary,
      fontFamily: 'Montserrat',
    ),
    home: child,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Kiểm thử Phân hệ Gói liệu trình & Nhật ký trị liệu chuẩn Y khoa MLD', () {
    testWidgets('D01MyPackagesScreen hiển thị Empty State chuẩn khi không có dữ liệu demo', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(const D01MyPackagesScreen()));
      await tester.pumpAndSettle();

      // Kiểm tra tiêu đề màn hình
      expect(find.text('Gói liệu trình của tôi'), findsOneWidget);
      // Kiểm tra Empty State xuất hiện
      expect(find.text('Bạn chưa có gói liệu trình nào đang hoạt động'), findsOneWidget);
      expect(find.text('Khám phá dịch vụ'), findsOneWidget);
    });

    testWidgets('D02PackageDetailsScreen hiển thị đầy đủ thông tin gói & chia buổi', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final samplePackage = UserPackageModel(
        id: 'pkg-101',
        packageCode: 'MLD-PKG-101',
        packageName: 'Liệu trình Phục hồi Chuyên sâu MLD',
        serviceName: 'Dẫn lưu bạch huyết vùng cổ vai',
        customerName: 'Nguyễn Thị Lan Anh',
        totalSessions: 5,
        completedSessions: 2,
        status: PackageStatus.active,
        expiryDate: '31/12/2026',
        specialistName: 'Trần Minh Phương',
        branchName: 'Chi nhánh Quận 3',
        price: 3500000,
        sessions: [
          const TreatmentSessionModel(
            id: 's-1',
            sessionNumber: 1,
            packageCode: 'MLD-PKG-101',
            packageName: 'Liệu trình Phục hồi Chuyên sâu MLD',
            serviceName: 'Dẫn lưu bạch huyết vùng cổ vai',
            customerName: 'Nguyễn Thị Lan Anh',
            treatmentTime: '09:00 · 10/10/2026',
            totalSessions: 5,
            status: 'COMPLETED',
            title: 'Khai thông hạch bạch huyết cổ',
            content: 'Đã giải tỏa các điểm căng cơ và dẫn lưu dịch ứ trệ vùng cổ.',
            evidenceImages: [],
            specialistName: 'Trần Minh Phương',
            branchName: 'Chi nhánh Quận 3',
          ),
          const TreatmentSessionModel(
            id: 's-2',
            sessionNumber: 2,
            packageCode: 'MLD-PKG-101',
            packageName: 'Liệu trình Phục hồi Chuyên sâu MLD',
            serviceName: 'Dẫn lưu bạch huyết vùng cổ vai',
            customerName: 'Nguyễn Thị Lan Anh',
            treatmentTime: '09:00 · 15/10/2026',
            totalSessions: 5,
            status: 'COMPLETED',
            title: 'Dẫn lưu sâu vùng vai gáy',
            content: 'Mô cơ mềm hơn 35%, tuần hoàn vùng chẩm cải thiện rõ nét.',
            evidenceImages: [],
            specialistName: 'Trần Minh Phương',
            branchName: 'Chi nhánh Quận 3',
          ),
        ],
      );

      await tester.pumpWidget(_buildTestApp(D02PackageDetailsScreen(package: samplePackage)));
      await tester.pumpAndSettle();

      // Kiểm tra tiêu đề và thông tin gói
      expect(find.text('Chi tiết gói liệu trình'), findsOneWidget);
      expect(find.text('#MLD-PKG-101'), findsOneWidget);
      expect(find.text('Liệu trình Phục hồi Chuyên sâu MLD'), findsOneWidget);
      expect(find.text('Dẫn lưu bạch huyết vùng cổ vai'), findsOneWidget);
      expect(find.text('Nguyễn Thị Lan Anh'), findsOneWidget);

      // Kiểm tra các buổi được chia hiển thị
      expect(find.text('Buổi 1'), findsOneWidget);
      expect(find.text('Buổi 2'), findsOneWidget);

      // Bấm vào xem chi tiết buổi 1 để mở BottomSheet (cuộn đến buổi nếu cần)
      await tester.ensureVisible(find.text('Buổi 1'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Buổi 1'));
      await tester.pumpAndSettle();

      // Kiểm tra BottomSheet hiển thị đủ các trường theo yêu cầu:
      // Mã liệu trình, Tên liệu trình, Tên dịch vụ, Tên khách hàng, Giờ điều trị, Số buổi, Tổng số buổi, Trạng thái, Nội dung, Hình ảnh minh chứng
      expect(find.text('Chi tiết buổi điều trị'), findsOneWidget);
      expect(find.text('Nội dung buổi điều trị'), findsOneWidget);
      expect(find.text('Hình ảnh minh chứng'), findsOneWidget);
      expect(find.text('Đã giải tỏa các điểm căng cơ và dẫn lưu dịch ứ trệ vùng cổ.'), findsOneWidget);
    });

    testWidgets('D03CareJournalScreen hiển thị Empty State chuẩn khi không có dữ liệu demo', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(const D03CareJournalScreen()));
      await tester.pumpAndSettle();

      // Kiểm tra tiêu đề
      expect(find.text('Nhật ký trị liệu'), findsOneWidget);
      // Kiểm tra banner xâu chuỗi minh chứng
      expect(find.text('Xâu chuỗi minh chứng tiến trình'), findsOneWidget);
      // Kiểm tra Empty State
      expect(find.text('Chưa có nhật ký & minh chứng trị liệu'), findsOneWidget);
      expect(find.text('Khám phá dịch vụ trị liệu'), findsOneWidget);
    });
  });
}
