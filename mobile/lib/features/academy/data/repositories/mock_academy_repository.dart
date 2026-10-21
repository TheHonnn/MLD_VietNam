import '../models/academy_models.dart';
import 'academy_repository.dart';

/// Legacy Mock Repository maintained for backward compatibility.
/// Delegates all state and operations to the real AcademyRepository.
class MockAcademyRepository {
  static final MockAcademyRepository _instance = MockAcademyRepository._internal();
  factory MockAcademyRepository() => _instance;
  MockAcademyRepository._internal();

  final AcademyRepository _realRepo = AcademyRepository.instance;

  List<CourseModel> get enrolledCourses => _realRepo.enrolledCourses;
  bool get hasEnrolledCourses => _realRepo.hasEnrolledCourses;

  void enrollCourse(CourseModel course) {
    _realRepo.enrollCourseLocal(course);
  }

  void clearEnrolledCourses() {
    _realRepo.clearEnrolledCourses();
  }
}
