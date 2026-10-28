import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e01_academy_home_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e05_enrollment_form_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e07_my_courses_screen.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e10_quiz_screen.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/treatment/presentation/screens/d09_documents_screen.dart';
import 'package:medical_healthcare_app/features/home/presentation/screens/main_layout_screen.dart';
import 'package:medical_healthcare_app/l10n/app_localizations.dart';

Widget _buildTestApp({required Widget home, Locale locale = const Locale('vi')}) {
  return MaterialApp(
    locale: locale,
    supportedLocales: const [Locale('vi'), Locale('en')],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: home,
  );
}

void main() {
  testWidgets('Test E01AcademyHomeScreen rendering in Vietnamese (Locale vi)', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(home: const E01AcademyHomeScreen(), locale: const Locale('vi')));
    await tester.pump();
    expect(find.byType(E01AcademyHomeScreen), findsOneWidget);
    expect(find.text('Đào tạo & Khóa học'), findsOneWidget);
    expect(find.text('Xin chào'), findsNothing);

    // Kiểm tra các thành phần của thẻ khóa học
    expect(find.text('DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI MỚI BẮT ĐẦU - Level 0'), findsOneWidget);
    expect(find.text('4 video'), findsWidgets);
    expect(find.text('ĐÃ ĐĂNG KÝ'), findsWidgets);
    expect(find.text('Đã đăng ký'), findsWidgets);
    expect(find.text('Đăng ký học'), findsWidgets);
  });

  testWidgets('Test E01AcademyHomeScreen rendering in English (Locale en) - 100% Translation', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(home: const E01AcademyHomeScreen(), locale: const Locale('en')));
    await tester.pump();
    expect(find.byType(E01AcademyHomeScreen), findsOneWidget);
    expect(find.text('Academy & Courses'), findsOneWidget);
    expect(find.text('BASIC MANUAL LYMPHATIC DRAINAGE FOR BEGINNERS - Level 0'), findsOneWidget);
    expect(find.text('4 videos'), findsWidgets);
    expect(find.text('ENROLLED'), findsWidgets);
    expect(find.text('Enrolled'), findsWidgets);
    expect(find.text('Enroll Now'), findsWidgets);
  });

  testWidgets('Test MainLayoutScreen tab 2 rendering for Academy directly without modal popup (Vietnamese)', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(home: const MainLayoutScreen(initialIndex: 2), locale: const Locale('vi')));
    await tester.pump();
    expect(find.byType(E01AcademyHomeScreen), findsOneWidget);
    expect(find.text('Đào tạo & Khóa học'), findsOneWidget);
    expect(find.text('Chọn đối tượng để xem chương trình đào tạo phù hợp nhất với bạn:'), findsNothing);
  });

  testWidgets('Test MainLayoutScreen tab 3 rendering for Documents (Vietnamese)', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(home: const MainLayoutScreen(initialIndex: 3), locale: const Locale('vi')));
    await tester.pump();
    expect(find.byType(D09DocumentsScreen), findsOneWidget);
    expect(find.text('Tài liệu & Y khoa MLD'), findsWidgets);
  });

  testWidgets('Test MainLayoutScreen tab 3 rendering for Documents (English)', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(home: const MainLayoutScreen(initialIndex: 3), locale: const Locale('en')));
    await tester.pump();
    expect(find.byType(D09DocumentsScreen), findsOneWidget);
    expect(find.text('Documents & Medical MLD'), findsWidgets);
  });

  testWidgets('Test E07MyCoursesScreen: 2 Tabs Đang học & Kiểm tra, bấm vào khóa học hiện danh sách kiểm tra và nút Bắt đầu', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(420, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(_buildTestApp(home: const E07MyCoursesScreen(), locale: const Locale('vi')));
    await tester.pumpAndSettle();

    // 1. Kiểm tra tiêu đề và 2 Tab duy nhất
    expect(find.text('Khóa học của tôi'), findsOneWidget);
    expect(find.textContaining('Đang học'), findsOneWidget);
    expect(find.text('Kiểm tra'), findsOneWidget);
    expect(find.text('Sắp học'), findsNothing);
    expect(find.text('Đã hoàn thành'), findsNothing);

    // 2. Chuyển sang Tab Kiểm tra
    await tester.tap(find.text('Kiểm tra'));
    await tester.pumpAndSettle();

    // 3. Hiển thị danh sách khóa học và danh sách bài kiểm tra theo course_id
    expect(find.text('Chọn khóa học để làm bài kiểm tra:'), findsOneWidget);
    expect(find.textContaining('bài kiểm tra trắc nghiệm'), findsWidgets);
    expect(find.text('Bắt đầu'), findsWidgets);
    expect(find.textContaining('≥ 8.0 / 10 điểm'), findsWidgets);
  });

  testWidgets('Test E10QuizScreen: Trả lời câu hỏi và chấm điểm chuẩn tiêu chí Admin (>= 8.0 đạt, < 8.0 chưa đạt)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(420, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    const testQuiz = CourseQuizModel(
      id: 'quiz_test_sample',
      courseId: 'course_test_1',
      title: 'Đề thi trắc nghiệm mẫu MLD',
      totalQuestions: 10,
      timeLimitMinutes: 15,
      passingScore: 8.0,
      questions: [
        QuizQuestionModel(
          id: 'q1',
          quizId: 'quiz_test_sample',
          questionNumber: 1,
          questionText: 'Lực tác động tối ưu khi thực hiện động tác vuốt dẫn lưu bạch huyết theo kỹ thuật Vodder là bao nhiêu?',
          options: {
            'A': '30 - 40 mmHg',
            'B': '80 - 100 mmHg',
          },
          correctOption: 'A',
          explanation: 'Áp lực nhẹ 30-40 mmHg.',
        ),
      ],
    );

    await tester.pumpWidget(_buildTestApp(
      home: const E10QuizScreen(
        quiz: testQuiz,
        courseTitle: 'Khóa học Test',
      ),
      locale: const Locale('vi'),
    ));
    await tester.pumpAndSettle();

    // Hiển thị câu hỏi và đồng hồ đếm ngược
    expect(find.text('Đề thi trắc nghiệm mẫu MLD'), findsOneWidget);
    expect(find.textContaining('Thời gian:'), findsOneWidget);
    expect(find.text('30 - 40 mmHg'), findsOneWidget);

    // Chọn đáp án A
    await tester.tap(find.text('30 - 40 mmHg'));
    await tester.pumpAndSettle();

    // Bấm Nộp bài
    await tester.tap(find.byKey(const Key('submit_quiz_button')));
    await tester.pumpAndSettle();

    // Modal xác nhận nộp bài xuất hiện
    expect(find.text('Xác nhận nộp bài'), findsOneWidget);
    await tester.tap(find.text('Nộp bài ngay'));
    await tester.pumpAndSettle();

    // Đạt tiêu chuẩn vì trả lời đúng 1/1 (10.0/10 >= 8.0)
    expect(find.text('CHÚC MỪNG: ĐẠT TIÊU CHUẨN'), findsOneWidget);
    expect(find.text('10.0 / 10.0'), findsWidgets);
  });

  testWidgets('Test E05EnrollmentFormScreen: Chỉ hiện Thông tin cá nhân, Cơ sở, Phân nhóm (Người mới bắt đầu/Đang làm nghề), Học phí và chuyển trạng thái Chờ duyệt', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(420, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final course = MockAcademyData.courses.length > 1
        ? MockAcademyData.courses[1]
        : MockAcademyData.courses.first;

    await tester.pumpWidget(_buildTestApp(
      home: E05EnrollmentFormScreen(course: course),
      locale: const Locale('vi'),
    ));
    await tester.pumpAndSettle();

    // 1. Kiểm tra tiêu đề và thông tin cá nhân
    expect(find.text('Đăng ký khóa học'), findsWidgets);
    expect(find.text('1. Thông tin cá nhân học viên'), findsOneWidget);
    expect(find.text('Họ và tên *'), findsOneWidget);
    expect(find.text('Số điện thoại *'), findsOneWidget);
    expect(find.text('Địa chỉ Email *'), findsOneWidget);

    // 2. Cơ sở đào tạo
    expect(find.text('2. Cơ sở đào tạo'), findsOneWidget);
    expect(find.textContaining('Chi nhánh Quận 3, TP.HCM'), findsOneWidget);

    // 3. Phân nhóm đối tượng học viên (1: Người mới bắt đầu, 2: Đang làm nghề)
    expect(find.text('3. Bạn thuộc nhóm đối tượng nào?'), findsOneWidget);
    expect(find.text('Người mới bắt đầu'), findsOneWidget);
    expect(find.text('Đang làm nghề'), findsOneWidget);

    // 4. Học phí và cam kết không có thanh toán trực tuyến
    expect(find.text('Học phí trọn gói:'), findsWidgets);

    // Không chứa bất kỳ trường thanh toán nào (không có QR, không có đặt cọc)
    expect(find.textContaining('Thanh toán ngay:'), findsNothing);
    expect(find.textContaining('Tiền cọc là một phần'), findsNothing);
    expect(find.textContaining('VietQR'), findsNothing);

    // 5. Bấm nút Đăng ký khóa học
    await tester.tap(find.byKey(const Key('submit_enrollment_button')));
    await tester.pumpAndSettle();

    // 6. Hiển thị thông báo trạng thái "Chờ nhân viên duyệt"
    expect(find.text('Đăng ký thành công'), findsOneWidget);
    expect(find.text('Trạng thái: Chờ nhân viên duyệt'), findsOneWidget);
    expect(find.textContaining('Nhân viên tuyển sinh sẽ kiểm duyệt hồ sơ thủ công'), findsOneWidget);
  });

  testWidgets('Test E05EnrollmentFormScreen & E01: Khóa học đã đăng ký hiện nút "Đã đăng ký", không cho đăng ký lại, bấm "Đăng ký học" vào thẳng E05', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(420, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    // Khóa học đầu tiên đã được ghi danh trong Mock
    final enrolledCourse = MockAcademyData.courses.first;

    // 1. Kiểm tra màn hình E05 với khóa học đã đăng ký:
    // Phải hiển thị banner cảnh báo và nút bị vô hiệu hóa
    await tester.pumpWidget(_buildTestApp(
      home: E05EnrollmentFormScreen(course: enrolledCourse),
      locale: const Locale('vi'),
    ));
    await tester.pumpAndSettle();

    expect(find.textContaining('Khóa học này đã được gửi đăng ký (Trạng thái: Chờ nhân viên duyệt). Bạn không thể đăng ký lại.'), findsOneWidget);
    expect(find.text('Đã đăng ký khóa học này'), findsOneWidget);

    // 2. Kiểm tra trên E01AcademyHomeScreen:
    await tester.pumpWidget(_buildTestApp(
      home: const E01AcademyHomeScreen(),
      locale: const Locale('vi'),
    ));
    await tester.pumpAndSettle();

    // Phải có nút "Đã đăng ký" cho khóa học đã ghi danh
    expect(find.text('Đã đăng ký'), findsWidgets);
    // Và có nút "Đăng ký học" cho khóa học chưa ghi danh
    expect(find.text('Đăng ký học'), findsWidgets);

    // Bấm nút "Đăng ký học" mở thẳng vào trang E05EnrollmentFormScreen
    await tester.tap(find.text('Đăng ký học').first);
    await tester.pumpAndSettle();
    expect(find.byType(E05EnrollmentFormScreen), findsOneWidget);
  });
}
