# Training navigation and mobile synchronization handoff

Admin workflow: Courses → Content chapters/lessons → Quizzes → Questions → Submissions → Progress.
Course categories and curriculum planning are separate configuration links. Lesson routes remain available from each chapter; no data or route was deleted.

Mobile owned by another developer. Required changes before claiming end-to-end synchronization:
- academy_repository.dart saveLessonPosition writes `_` while getLessonPosition reads courseId_lessonId. Use the same course/lesson key.
- saveLessonPosition and markLessonCompleted send synthetic enrollment IDs (`enroll_...`). Resolve the authenticated student's actual enrollment ID before saving progress.
- Report failed progress synchronization; do not silently equate local completion with server persistence.
- getCourseQuizModels falls back to MockAcademyData questions/quizzes; remove production fallback. Missing questions must show an unavailable state.
- ensureQuizId falls back to another available quiz. Do not attach submissions to an unrelated quiz.
- Validate authenticated enrollment ownership and course/lesson/quiz relationship on the server.

Acceptance: two courses and two accounts, complete distinct lessons, restart app, confirm correct server enrollment/lesson progress and quiz submissions; no invented questions or records. Use isolated data, not production financial records.
