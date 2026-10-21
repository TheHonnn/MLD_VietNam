import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/academy_models.dart';

/// Repository for Academy (Group E) connecting to NestJS Backend Gateway
/// With automatic resilient fallback to MockAcademyData.
class AcademyRepository {
  AcademyRepository._internal() {
    _loadEnrolledCourses();
  }
  static final AcademyRepository instance = AcademyRepository._internal();
  factory AcademyRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;
  static const String _enrolledStorageKey = 'mld_academy_enrolled_courses';

  List<CourseModel> _cachedCourses = [];
  final List<CourseModel> _enrolledCourses = [];

  List<CourseModel> get cachedCourses => List.unmodifiable(_cachedCourses);
  List<CourseModel> get enrolledCourses => List.unmodifiable(_enrolledCourses);
  bool get hasEnrolledCourses => _enrolledCourses.isNotEmpty;

  Future<void> _loadEnrolledCourses() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getStringList(_enrolledStorageKey);
      if (raw != null && raw.isNotEmpty) {
        _enrolledCourses.clear();
        for (final item in raw) {
          try {
            final map = jsonDecode(item) as Map<String, dynamic>;
            _enrolledCourses.add(CourseModel.fromJson(map));
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  Future<void> _saveEnrolledCourses() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = _enrolledCourses.map((c) => jsonEncode(c.toJson())).toList();
      await prefs.setStringList(_enrolledStorageKey, list);
    } catch (_) {}
  }

  /// E01/E02: Lấy danh sách khóa học từ Backend
  Future<List<CourseModel>> getCourses({String? category}) async {
    try {
      String path = ApiEndpoints.academyCourses;
      if (category != null && category.isNotEmpty && category != 'Tất cả') {
        path += '?category=${Uri.encodeComponent(category)}';
      }

      final response = await _apiClient.dio.get(path);
      if (response.statusCode == 200 && response.data != null) {
        final rawData = response.data['data'] ?? response.data;
        if (rawData is List) {
          final courses = rawData
              .map((c) => CourseModel.fromJson(c as Map<String, dynamic>))
              .toList();
          if (courses.isNotEmpty) {
            _cachedCourses = courses;
            return courses;
          }
        }
      }
    } catch (e) {
      debugPrint('>>> [AcademyRepository] Error fetching courses from Backend: $e');
    }

    // Fallback an toàn nếu mất mạng
    _cachedCourses = MockAcademyData.courses;
    return _cachedCourses;
  }

  /// E03: Lấy chi tiết một khóa học
  Future<CourseModel?> getCourseDetail(String id) async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.academyCourseDetail(id));
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] ?? response.data;
        if (data is Map<String, dynamic>) {
          return CourseModel.fromJson(data);
        }
      }
    } catch (e) {
      debugPrint('>>> [AcademyRepository] Error fetching course detail: $e');
    }

    try {
      return MockAcademyData.courses.firstWhere((c) => c.id == id);
    } catch (_) {
      return MockAcademyData.courses.isNotEmpty ? MockAcademyData.courses.first : null;
    }
  }

  /// E05/E06: Ghi danh khóa học & thanh toán đặt cọc
  Future<Map<String, dynamic>> enrollCourse({
    required CourseModel course,
    required String studentName,
    required String studentPhone,
    required String studentEmail,
    String? selectedBranch,
    String? selectedShift,
    double? depositAmount,
  }) async {
    // Luôn lưu local trước để đảm bảo trải nghiệm người dùng
    enrollCourseLocal(course);

    try {
      final response = await _apiClient.dio.post(
        ApiEndpoints.academyEnroll,
        data: {
          'courseId': course.id,
          'studentName': studentName,
          'studentPhone': studentPhone,
          'studentEmail': studentEmail,
          'selectedBranch': selectedBranch ?? course.branch,
          'selectedShift': selectedShift ?? course.schedule,
          'depositAmount': depositAmount ?? course.depositFee,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return (response.data['data'] ?? response.data) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('>>> [AcademyRepository] Error posting course enrollment to Backend: $e');
    }

    return {
      'enrollmentCode': 'MLD-EDU-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      'courseTitle': course.title,
      'studentName': studentName,
      'depositAmount': depositAmount ?? course.depositFee,
      'status': 'PENDING_PAYMENT',
      'qrCodeUrl': 'https://api.vietqr.io/image/970422-0912345678-compact2.jpg?amount=${(depositAmount ?? course.depositFee).toInt()}&addInfo=HOCPHI%20${course.id}',
    };
  }

  /// E07: Lấy danh sách khóa học của học viên
  Future<List<CourseModel>> getMyCourses() async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.academyMyCourses);
      if (response.statusCode == 200 && response.data != null) {
        final raw = response.data['data'] ?? response.data;
        if (raw is List && raw.isNotEmpty) {
          final list = raw.map((item) {
            if (item is Map<String, dynamic>) {
              return CourseModel.fromJson(item);
            }
            return MockAcademyData.courses.first;
          }).toList();
          return list;
        }
      }
    } catch (e) {
      debugPrint('>>> [AcademyRepository] Error fetching my courses: $e');
    }

    return enrolledCourses;
  }

  /// E11: Lịch học & điểm danh
  Future<List<AttendanceScheduleItem>> getMySchedule() async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.academySchedule);
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] ?? response.data;
        final sessions = data['upcomingSessions'] as List?;
        if (sessions != null && sessions.isNotEmpty) {
          return sessions.map((s) {
            return AttendanceScheduleItem(
              date: DateTime.now().add(const Duration(days: 1)),
              timeSlot: s['time']?.toString() ?? '13:00–17:00',
              title: s['topic']?.toString() ?? 'Thực hành kỹ thuật chuyên sâu',
              room: s['room']?.toString() ?? 'Phòng thực hành 204',
              type: 'practice',
            );
          }).toList();
        }
      }
    } catch (e) {
      debugPrint('>>> [AcademyRepository] Error fetching schedule: $e');
    }

    return MockAcademyData.getAttendanceSchedule();
  }

  /// E12: Kết quả học tập
  Future<Map<String, dynamic>> getMyResults() async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.academyResults);
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] ?? response.data;
        if (data is Map<String, dynamic>) {
          return data;
        }
      }
    } catch (e) {
      debugPrint('>>> [AcademyRepository] Error fetching results: $e');
    }

    return {
      'studentName': 'Học viên MLD',
      'courseTitle': 'Khóa Kỹ Thuật Viên Spa Chuyên Nghiệp',
      'gpa': '8.9 / 10',
      'status': 'TỐT NGHIỆP LOẠI GIỎI',
      'attendanceRate': 100,
    };
  }

  void enrollCourseLocal(CourseModel course) {
    if (!_enrolledCourses.any((c) => c.id == course.id)) {
      _enrolledCourses.add(course);
      _saveEnrolledCourses();
    }
  }

  void clearEnrolledCourses() {
    _enrolledCourses.clear();
    _saveEnrolledCourses();
  }
}

