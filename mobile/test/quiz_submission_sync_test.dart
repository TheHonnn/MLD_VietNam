import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Quiz Submission Synchronization Tests', () {
    test('QuizSubmissionModel serializes and deserializes enrollmentId and answers correctly', () {
      final now = DateTime.now();
      final sub = QuizSubmissionModel(
        id: 'sub_123',
        quizId: 'de293f4b-027e-45ad-85bd-6f3533f28a7a',
        courseId: '62f22649-4eac-426c-8ac6-a2b7840ead66',
        enrollmentId: '4f53bca2-f21d-48cb-ada6-7dbfb548f7cd',
        score: 9.5,
        correctCount: 9,
        totalQuestions: 10,
        passed: true,
        submittedAnswers: {0: 'A', 1: 'B', 2: 'C'},
        submittedAt: now,
      );

      final json = sub.toJson();
      expect(json['enrollmentId'], '4f53bca2-f21d-48cb-ada6-7dbfb548f7cd');
      expect(json['score'], 9.5);
      expect(json['passed'], isTrue);

      final reconstructed = QuizSubmissionModel.fromJson(json);
      expect(reconstructed.enrollmentId, '4f53bca2-f21d-48cb-ada6-7dbfb548f7cd');
      expect(reconstructed.quizId, 'de293f4b-027e-45ad-85bd-6f3533f28a7a');
      expect(reconstructed.submittedAnswers[0], 'A');
    });

    test('AdminQuizSubmissionModel.fromJson cleanly extracts student_name, student_phone, and course title from Supabase relations', () {
      final supabaseRow = {
        'id': '7d873868-b8e3-4339-855f-ff72ba45e2dc',
        'enrollment_id': '4f53bca2-f21d-48cb-ada6-7dbfb548f7cd',
        'quiz_id': 'de293f4b-027e-45ad-85bd-6f3533f28a7a',
        'score': 9.0,
        'correct_count': 9,
        'submitted_answers': {'0': 'A', '1': 'B'},
        'instructor_feedback': 'Làm bài xuất sắc!',
        'passed': true,
        'submitted_at': '2026-11-09T16:00:59.208177+00:00',
        'course_quizzes': {
          'title': 'Bài kiểm tra Đánh giá Năng lực Thực hành Tổng hợp'
        },
        'course_enrollments': {
          'student_name': 'Bùi Thế Hoàng',
          'student_phone': '0394316963',
          'courses': {
            'title': 'Dẫn lưu bạch huyết chuyên sâu cho người làm nghề'
          }
        }
      };

      final adminModel = AdminQuizSubmissionModel.fromJson(supabaseRow);
      expect(adminModel.id, '7d873868-b8e3-4339-855f-ff72ba45e2dc');
      expect(adminModel.studentName, 'Bùi Thế Hoàng');
      expect(adminModel.studentPhone, '0394316963');
      expect(adminModel.quizTitle, 'Bài kiểm tra Đánh giá Năng lực Thực hành Tổng hợp');
      expect(adminModel.courseTitle, 'Dẫn lưu bạch huyết chuyên sâu cho người làm nghề');
      expect(adminModel.score, 9.0);
      expect(adminModel.passed, isTrue);
      expect(adminModel.instructorFeedback, 'Làm bài xuất sắc!');
      expect(adminModel.submittedAnswers['0'], 'A');
    });
  });
}
