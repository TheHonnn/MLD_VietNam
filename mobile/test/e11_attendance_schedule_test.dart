import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/academy/presentation/screens/e11_attendance_schedule_screen.dart';

void main() {
  group('E11 Attendance & Batch Schedule Tests', () {
    test('StudentBatchScheduleItem parses correctly from JSON', () {
      final json = {
        'id': 'enr-123',
        'status': 'STUDYING',
        'courses': {
          'id': 'c-456',
          'title': 'Dẫn lưu bạch huyết chuyên sâu cho người làm nghề',
        },
        'course_batches': {
          'batch_code': 'K26-MLD-CS',
          'schedule_text': 'Thứ 7 – Chủ nhật (08:30 – 16:30)',
          'start_date': '2026-11-08',
          'end_date': '2026-12-28',
          'instructors': {
            'full_name': 'Lâm Xuân Trường',
          },
          'branches': {
            'name': 'Trụ sở MLD Việt Nam (5 Master LV3)',
            'address': 'Số 260, Ngõ 271 Bùi Xương Trạch, Khương Đình, Hà Nội',
          },
        },
      };

      final item = StudentBatchScheduleItem.fromJson(json);
      expect(item.enrollmentId, 'enr-123');
      expect(item.courseId, 'c-456');
      expect(item.courseTitle, 'Dẫn lưu bạch huyết chuyên sâu cho người làm nghề');
      expect(item.batchCode, 'K26-MLD-CS');
      expect(item.scheduleDays, 'Thứ 7 – Chủ nhật');
      expect(item.timeSlot, '08:30 – 16:30');
      expect(item.startDate, '2026-11-08');
      expect(item.endDate, '2026-12-28');
      expect(item.instructorName, 'Lâm Xuân Trường');
      expect(item.branchName, 'Trụ sở MLD Việt Nam (5 Master LV3)');
      expect(item.status, 'STUDYING');
    });

    testWidgets('E11AttendanceScheduleScreen renders batch schedule card', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          locale: Locale('vi', 'VN'),
          home: E11AttendanceScheduleScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('K26-GV-Q3'), findsOneWidget);
      expect(find.text('Chương trình phát triển giảng viên và học thuật'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is RichText && widget.text.toPlainText().contains('Lâm Xuân Trường'),
        ),
        findsOneWidget,
      );
      expect(find.byIcon(Icons.event_available), findsOneWidget);
    });
  });
}
