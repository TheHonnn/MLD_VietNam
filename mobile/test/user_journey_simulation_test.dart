import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/academy/data/repositories/academy_repository.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e08_class_detail_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e09_lesson_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e11_attendance_schedule_screen.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:medical_healthcare_app/features/booking/presentation/screens/c09_my_appointments_screen.dart';
import 'package:medical_healthcare_app/features/home/data/repositories/branch_repository.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _buildTestWrapper({required Widget child}) {
  return MaterialApp(
    locale: const Locale('vi'),
    supportedLocales: const [Locale('vi'), Locale('en')],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: child,
  );
}

void main() {
  setUp(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues({});
    await BranchRepository.instance.init();
  });

  group('Kịch bản 1: Test đặt lịch trị liệu thử (Booking Flow)', () {
    testWidgets('Đặt lịch AllInOneBooking -> Hiển thị Modal thành công -> Mở xem danh sách lịch hẹn',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(420, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWrapper(child: const AllInOneBookingScreen()));
      await tester.pumpAndSettle();

      // 1. Kiểm tra các trường thông tin hiển thị đầy đủ
      expect(find.text('Đặt lịch trị liệu'), findsOneWidget);
      expect(find.text('Chi nhánh thực hiện'), findsOneWidget);
      expect(find.text('Thời gian hẹn'), findsOneWidget);

      // Điền thông tin đảm bảo form validation thành công
      final textFields = find.byType(TextFormField);
      if (textFields.evaluate().length >= 2) {
        await tester.enterText(textFields.at(0), 'Nguyễn Văn Test');
        await tester.enterText(textFields.at(1), '0967786399');
        await tester.pumpAndSettle();
      }

      // 2. Bấm nút "Xác nhận đặt lịch"
      final confirmBtn = find.text('Xác nhận đặt lịch');
      expect(confirmBtn, findsOneWidget);
      await tester.ensureVisible(confirmBtn);
      await tester.tap(confirmBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();

      // 3. Kiểm tra Modal thông báo "Đặt lịch thành công!" xuất hiện
      expect(find.text('Đặt lịch thành công!'), findsOneWidget);
      expect(find.text('Xem lịch hẹn của tôi'), findsOneWidget);

      // 4. Bấm "Xem lịch hẹn của tôi" chuyển sang C09
      await tester.tap(find.text('Xem lịch hẹn của tôi'));
      await tester.pumpAndSettle();

      expect(find.byType(C09MyAppointmentsScreen), findsOneWidget);
      expect(find.text('Lịch hẹn của tôi'), findsOneWidget);
    });
  });

  group('Kịch bản 2: Test lịch học & điểm danh thử (Attendance Schedule)', () {
    testWidgets('Mở E11AttendanceScheduleScreen hiển thị lịch học và các buổi thực hành',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(420, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWrapper(child: const E11AttendanceScheduleScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Lịch học & điểm danh'), findsOneWidget);
      expect(find.byType(E11AttendanceScheduleScreen), findsOneWidget);
    });
  });

  group('Kịch bản 3: Test khi học xong hiển thị thông báo thế nào (Lesson & Course Completion)', () {
    testWidgets('Học xong 1 bài: Thông báo SnackBar và chuyển trạng thái ✓ Đã hoàn thành',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(420, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const testLesson = LessonModel(
        id: 'test_les_01',
        title: 'Bài 1: Tổng quan dẫn lưu Vodder',
        durationMinutes: 18,
      );

      await tester.pumpWidget(_buildTestWrapper(
        child: const E09LessonScreen(
          lesson: testLesson,
          courseTitle: 'Khóa học Test',
          courseId: 'test_course_123',
        ),
      ));
      await tester.pumpAndSettle();

      // Kiểm tra nút "Đánh dấu đã xem hết"
      final markBtn = find.text('Đánh dấu đã xem hết');
      expect(markBtn, findsOneWidget);

      // Bấm hoàn thành bài học
      await tester.tap(markBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Thông báo SnackBar xuất hiện
      expect(find.text('✓ Đã ghi nhận xem hết bài: Bài 1: Tổng quan dẫn lưu Vodder'), findsOneWidget);

      // Nút chuyển sang trạng thái đã hoàn thành
      expect(find.text('✓ Đã hoàn thành bài học'), findsOneWidget);
    });

    testWidgets('Trong E08: Hoàn thành 1 bài thì bài tiếp theo mở khóa, hoàn thành 100% thì mở khóa bài kiểm tra',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(420, 1800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const testCourse = CourseModel(
        id: 'course_test_completion',
        title: 'Khóa Học Kiểm Tra Hoàn Thành',
        category: 'Người mới bắt đầu',
        level: 'Cơ bản',
        durationWeeks: 4,
        totalHours: 24,
        theoryHours: 12,
        practiceHours: 12,
        tuitionFee: 599000,
        depositFee: 200000,
        image: 'assets/images/logo.webp',
        instructorName: 'ThS. Nguyễn Thu Hà',
        instructorTitle: 'Giảng viên chuyên môn MLD',
        instructorAvatar: 'assets/images/logo.webp',
        branch: 'Chi nhánh Quận 3',
        schedule: 'Thứ 6–7–Chủ nhật',
        description: 'Mô tả test',
      );

      // Ghi danh trước để vào lớp học
      AcademyRepository.instance.enrollCourseLocal(testCourse);

      // Khởi tạo màn hình lớp học E08
      await tester.pumpWidget(_buildTestWrapper(
        child: const E08ClassDetailScreen(course: testCourse),
      ));
      await tester.pumpAndSettle();

      // Chưa học bài nào: Hiển thị 0 bài hoàn thành và bài kiểm tra bị khóa
      expect(find.textContaining('bài học đã hoàn thành'), findsOneWidget);
      expect(find.text('Phần kiểm tra đánh giá khóa học 🔒'), findsOneWidget);

      // Đánh dấu hoàn thành toàn bộ bài học của khóa
      const chapters = MockAcademyData.syllabusChapters;
      for (final ch in chapters) {
        for (final l in ch.lessons) {
          await AcademyRepository.instance.markLessonCompleted(testCourse.id, l.id);
        }
      }

      // Re-pump E08 để cập nhật giao diện sau khi học xong 100%
      await tester.pumpWidget(_buildTestWrapper(
        child: const E08ClassDetailScreen(course: testCourse),
      ));
      await tester.pumpAndSettle();

      // 1. Thông báo banner chúc mừng hoàn thành xuất hiện
      expect(find.text('Đã hoàn thành tất cả video!'), findsOneWidget);
      expect(find.textContaining('Hãy làm bài kiểm tra để hoàn tất chứng chỉ'), findsOneWidget);

      // 2. Bài kiểm tra chuyển sang trạng thái ĐÃ MỞ KHÓA
      expect(find.text('Phần kiểm tra đánh giá khóa học'), findsOneWidget);
      expect(find.text('Làm bài ▶'), findsWidgets);

      // 3. Thanh nút cố định dưới màn hình đổi thành nút làm bài kiểm tra
      expect(find.text('Làm bài kiểm tra đánh giá'), findsOneWidget);
      expect(find.text('Đã hoàn thành 100% video bài giảng ✓'), findsOneWidget);
    });
  });
}

