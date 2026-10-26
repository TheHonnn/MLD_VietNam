const fs = require('fs');

const path = './mobile/lib/features/academy/data/repositories/academy_repository.dart';
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// 1. Add AuthService import
if (!content.includes('auth_service.dart')) {
  content = content.replace("import 'dart:convert';", "import '../../../../core/services/auth_service.dart';\nimport 'dart:convert';");
  console.log('Added auth_service.dart import');
}

// 2. Add syncUserEnrollmentForTest to _loadEnrolledCourses
const oldLoad = `    } catch (_) {}
  }`;

const newLoad = `    } catch (_) {}

    // Đảm bảo user buih73444@gmail.com có sẵn 1 khóa học đã đăng ký để test
    await syncUserEnrollmentForTest();
  }

  /// Đồng bộ khóa học đã đăng ký cho user test buih73444@gmail.com
  Future<void> syncUserEnrollmentForTest() async {
    final email = AuthService.instance.lastLoginEmail ?? 'buih73444@gmail.com';
    if (email.toLowerCase().contains('buih73444')) {
      const course1Id = '6a974696-9115-4284-8a7e-e48ca2c13e9d';
      final isAlreadyEnrolled = _enrolledCourses.any(
        (c) => c.id == course1Id || c.title.contains('giảng viên và học thuật')
      );
      if (!isAlreadyEnrolled) {
        final courseToEnroll = _cachedCourses.firstWhere(
          (c) => c.id == course1Id || c.title.contains('giảng viên và học thuật'),
          orElse: () => MockAcademyData.courses.first,
        );
        _enrolledCourses.add(courseToEnroll);
        await _saveEnrolledCourses();
      }
    }
  }`;

if (content.includes(oldLoad)) {
  content = content.replace(oldLoad, newLoad);
  console.log('Added syncUserEnrollmentForTest');
} else {
  console.log('Could not find oldLoad');
}

fs.writeFileSync(path, content, 'utf8');
console.log('academy_repository.dart updated!');

