const fs = require('fs');

// 1. PATCH e03_course_detail_screen.dart
const e03Path = './mobile/lib/features/academy/presentation/screens/e03_course_detail_screen.dart';
let e03 = fs.readFileSync(e03Path, 'utf8').replace(/\r\n/g, '\n');

// 1.1 Patch _onLessonTap
const oldTap = `  void _onLessonTap(LessonModel lesson) async {
    final isEnrolledOrFree = _isEnrolled || lesson.isFreePreview;
    if (!isEnrolledOrFree) {
      _showEnrollRequiredModal(lesson);
      return;
    }`;

const newTap = `  void _onLessonTap(LessonModel lesson) async {
    // Chưa đăng ký khóa học tuyệt đối không được xem bài học nào
    if (!_isEnrolled) {
      _showEnrollRequiredModal(lesson);
      return;
    }`;

if (e03.includes(oldTap)) {
  e03 = e03.replace(oldTap, newTap);
  console.log('e03: Patched _onLessonTap');
} else {
  console.log('e03: Could not find oldTap');
}

// 1.2 Patch _showEnrollRequiredModal text
const oldModalText = `            const Text(
              'Yêu cầu đăng ký khóa học',
              style: TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Video "\${lesson.title}" thuộc khóa học "\${widget.course.title}".\\n\\nBạn cần đăng ký khóa học để xem toàn bộ video bài giảng và thực hành chuẩn MLD.',`;

const newModalText = `            const Text(
              'Đăng ký để học',
              style: TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Bạn cần đăng ký khóa học "\${widget.course.title}" để xem bài giảng này.',`;

if (e03.includes(oldModalText)) {
  e03 = e03.replace(oldModalText, newModalText);
  console.log('e03: Patched modal text');
} else {
  console.log('e03: Could not find oldModalText');
}

// 1.3 Patch lesson card icon & duration
const oldCardIcon = `                                isCompleted
                                    ? Icons.check
                                    : (isUnlocked ? Icons.play_arrow_rounded : Icons.lock_outline_rounded),`;

const newCardIcon = `                                isCompleted
                                    ? Icons.check
                                    : (!_isEnrolled
                                        ? Icons.lock_outline_rounded
                                        : (isUnlocked ? Icons.play_arrow_rounded : Icons.lock_outline_rounded)),`;

if (e03.includes(oldCardIcon)) {
  e03 = e03.replace(oldCardIcon, newCardIcon);
  console.log('e03: Patched card icon');
}

const oldDuration = `                                child: Text(
                                  '\${lesson.durationMinutes}:00',`;

const newDuration = `                                child: Text(
                                  lesson.formattedDuration,`;

if (e03.includes(oldDuration)) {
  e03 = e03.replace(oldDuration, newDuration);
  console.log('e03: Patched duration');
}

fs.writeFileSync(e03Path, e03, 'utf8');


// 2. PATCH e08_class_detail_screen.dart
const e08Path = './mobile/lib/features/academy/presentation/screens/e08_class_detail_screen.dart';
let e08 = fs.readFileSync(e08Path, 'utf8').replace(/\r\n/g, '\n');

const oldE08Tap = `  void _onLessonTap(LessonModel lesson) {
    if (_isEnrolled || lesson.isFreePreview) {`;

const newE08Tap = `  void _onLessonTap(LessonModel lesson) {
    // Chưa đăng ký khóa học tuyệt đối không được xem
    if (_isEnrolled) {`;

if (e08.includes(oldE08Tap)) {
  e08 = e08.replace(oldE08Tap, newE08Tap);
  console.log('e08: Patched _onLessonTap');
}

const oldE08Modal = `            const Text(
              'Yêu cầu đăng ký khóa học',`;
const newE08Modal = `            const Text(
              'Đăng ký để học',`;

if (e08.includes(oldE08Modal)) {
  e08 = e08.replace(oldE08Modal, newE08Modal);
  console.log('e08: Patched modal title');
}

const oldE08Duration = `'Video · \${lesson.durationMinutes} phút\${lesson.isFreePreview ? ' · Học thử' : ''}',`;
const newE08Duration = `'Video · \${lesson.formattedDuration}',`;

if (e08.includes(oldE08Duration)) {
  e08 = e08.replace(oldE08Duration, newE08Duration);
  console.log('e08: Patched duration');
}

fs.writeFileSync(e08Path, e08, 'utf8');

console.log('Done patching e03 and e08!');

