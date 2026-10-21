import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:medical_healthcare_app/features/academy/data/repositories/academy_repository.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/treatment/data/repositories/treatment_repository.dart';
import 'package:medical_healthcare_app/features/membership/data/repositories/membership_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Group E: AcademyRepository tests', () {
    test('getCourses returns courses with fallback resilience', () async {
      final repo = AcademyRepository.instance;
      final courses = await repo.getCourses();
      expect(courses, isNotEmpty);
      expect(courses.first.title, isNotEmpty);
    });

    test('enrollCourseLocal persists and increases enrolled courses', () {
      final repo = AcademyRepository.instance;
      repo.clearEnrolledCourses();
      expect(repo.hasEnrolledCourses, isFalse);

      const mockCourse = CourseModel(
        id: 'test_course_01',
        title: 'Khóa Massage Test',
        category: 'Massage',
        level: 'Cơ bản',
        durationWeeks: 4,
        totalHours: 48,
        theoryHours: 16,
        practiceHours: 32,
        tuitionFee: 5000000,
        depositFee: 1500000,
        image: 'assets/images/gioithieu_1.png',
        instructorName: 'Cô Phương',
        instructorTitle: 'Giảng viên',
        instructorAvatar: 'assets/images/tran_minh_phuong.png',
        branch: 'Chi nhánh Quận 3',
        schedule: 'T7-CN',
        description: 'Mô tả ngắn',
      );

      repo.enrollCourseLocal(mockCourse);
      expect(repo.hasEnrolledCourses, isTrue);
      expect(repo.enrolledCourses.length, 1);
      expect(repo.enrolledCourses.first.id, 'test_course_01');
    });
  });

  group('Group D: TreatmentRepository tests', () {
    test('fetchPackages and fetchCareJournal provide robust models', () async {
      final repo = TreatmentRepository.instance;
      final packages = await repo.fetchPackages();
      expect(packages, isNotNull);

      final journal = await repo.fetchCareJournal();
      expect(journal, isNotNull);
    });

    test('addJournalNote adds entry locally with timestamp', () async {
      final repo = TreatmentRepository.instance;
      final initialCount = repo.journalEntries.length;

      await repo.addJournalNote('Khách hàng cảm thấy vai gáy rất nhẹ sau buổi trị liệu.');
      expect(repo.journalEntries.length, initialCount + 1);
      expect(repo.journalEntries.first.sessionNote, contains('vai gáy rất nhẹ'));
    });
  });

  group('Group F: MembershipRepository tests', () {
    test('fetchProfile returns valid UserProfile object', () async {
      final repo = MembershipRepository.instance;
      final profile = await repo.fetchProfile();
      expect(profile, isNotNull);
    });

    test('updateProfile updates local state and synchronizes', () async {
      final repo = MembershipRepository.instance;
      final current = repo.profile;

      final updated = current.copyWith(
        fullName: 'Nguyễn Văn Test',
        phone: '0987654321',
      );

      await repo.updateProfile(updated);
      expect(repo.profile.fullName, 'Nguyễn Văn Test');
      expect(repo.profile.phone, '0987654321');
      expect(repo.profile.isPhoneVerified, isTrue);
    });

    test('fetchLoyaltyPoints, fetchVouchers, fetchPaymentHistory, fetchReferralProgram return valid data', () async {
      final repo = MembershipRepository.instance;
      final points = await repo.fetchLoyaltyPoints();
      expect(points, isNotEmpty);

      final vouchers = await repo.fetchVouchers();
      expect(vouchers, isNotEmpty);

      final payments = await repo.fetchPaymentHistory();
      expect(payments, isNotEmpty);

      final referrals = await repo.fetchReferralProgram();
      expect(referrals, isNotEmpty);
    });
  });
}
