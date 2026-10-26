const fs = require('fs');

const path = './mobile/lib/features/academy/data/repositories/academy_repository.dart';
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const oldBlock = `  Future<void> markLessonCompleted(String courseId, String lessonId) async {
    _completedLessonIds.add(lessonId);
    _completedLessonIds.add('\${courseId}_\$lessonId');
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_lessonProgressKey, _completedLessonIds.toList());
    } catch (_) {}
  }

  bool isLessonCompleted(String courseId, String lessonId) {
    return _completedLessonIds.contains(lessonId) || _completedLessonIds.contains('\${courseId}_\$lessonId');
  }

  /// Kiểm tra bài học có được phép xem hay chưa:
  /// Bài 1 luôn mở. Bài n chỉ mở khi Bài (n-1) đã hoàn thành xem hết clip.
  bool canAccessLesson(String courseId, LessonModel lesson, List<LessonModel> allCourseLessons) {
    if (lesson.isFreePreview) return true;
    final index = allCourseLessons.indexWhere((l) => l.id == lesson.id);
    if (index <= 0) return true; // Bài 1 luôn mở
    final previousLesson = allCourseLessons[index - 1];
    return isLessonCompleted(courseId, previousLesson.id);
  }`;

const newBlock = `  Future<void> markLessonCompleted(String courseId, String lessonId) async {
    _completedLessonIds.add('\${courseId}_\$lessonId');
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_lessonProgressKey, _completedLessonIds.toList());
    } catch (_) {}
  }

  /// Kiểm tra bài học đã xem hết hay chưa (được phân tách chính xác theo từng khóa học)
  bool isLessonCompleted(String courseId, String lessonId) {
    return _completedLessonIds.contains('\${courseId}_\$lessonId');
  }

  /// Kiểm tra bài học có được phép xem hay chưa:
  /// Khóa học phải được đăng ký hợp lệ.
  /// Bài 1 luôn mở đầu tiên. Bài n chỉ mở khi Bài (n-1) đã hoàn thành xem hết clip.
  bool canAccessLesson(String courseId, LessonModel lesson, List<LessonModel> allCourseLessons) {
    if (!isCourseEnrolled(courseId)) return false;
    final index = allCourseLessons.indexWhere((l) => l.id == lesson.id);
    if (index <= 0) return true; // Bài 1 luôn mở cho học viên đã đăng ký
    final previousLesson = allCourseLessons[index - 1];
    return isLessonCompleted(courseId, previousLesson.id);
  }`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully updated lesson completion and access checks!');
} else {
  console.error('Could not find oldBlock in academy_repository.dart');
}

