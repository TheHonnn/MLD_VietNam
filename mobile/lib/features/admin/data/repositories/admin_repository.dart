import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import '../../../../core/network/api_client.dart';
import '../models/admin_models.dart';

/// Central Admin & Manager Repository kết nối trực tiếp Supabase Cloud REST
/// Phục vụ 100% các chức năng quản trị, tiếp đón, tuyển sinh và phê duyệt
class AdminRepository {
  AdminRepository._internal();
  static final AdminRepository instance = AdminRepository._internal();
  factory AdminRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;

  // Cache danh sách chi nhánh
  List<AdminBranchModel> _branches = [];
  List<AdminBranchModel> get branches => List.unmodifiable(_branches);

  /// 1. Tải danh mục Chi nhánh (Branches)
  Future<List<AdminBranchModel>> fetchBranches() async {
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/branches?select=id,name,address,phone,district&order=name.asc',
      );
      if (res.data is List) {
        _branches = (res.data as List)
            .map((item) => AdminBranchModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return _branches;
    } catch (e) {
      debugPrint('[AdminRepository] fetchBranches error: $e');
      return _branches;
    }
  }

  /// 2. Tải chỉ số KPI Dashboard
  Future<AdminKpiMetrics> fetchDashboardMetrics({String? branchId}) async {
    try {
      final now = DateTime.now();
      final todayStr = DateFormat('yyyy-MM-dd').format(now);

      // A. Doanh thu hôm nay (tổng từ hóa đơn đã thanh toán hôm nay)
      double todayRev = 0.0;
      try {
        final branchParam = (branchId != null && branchId.isNotEmpty && branchId != 'ALL')
            ? '&branch_id=eq.$branchId'
            : '';
        final invRes = await _apiClient.dio.get(
          '/rest/v1/invoices?select=total_amount,payment_status,created_at&payment_status=eq.PAID&created_at=gte.$todayStr$branchParam',
        );
        if (invRes.data is List) {
          for (final inv in invRes.data) {
            final amt = double.tryParse(inv['total_amount']?.toString() ?? '0') ?? 0.0;
            todayRev += amt;
          }
        }
      } catch (_) {}

      // B. Thống kê lịch hẹn hôm nay
      int todayBk = 0;
      int checkedInBk = 0;
      int pendingBk = 0;
      try {
        final branchParam = (branchId != null && branchId.isNotEmpty && branchId != 'ALL')
            ? '&branch_id=eq.$branchId'
            : '';
        final bkRes = await _apiClient.dio.get(
          '/rest/v1/bookings?select=id,status,booking_date&booking_date=eq.$todayStr$branchParam',
        );
        if (bkRes.data is List) {
          todayBk = bkRes.data.length;
          for (final b in bkRes.data) {
            final st = (b['status']?.toString() ?? '').toUpperCase();
            if (st == 'CHECKED_IN' || st == 'IN_SERVICE') {
              checkedInBk++;
            } else if (st == 'PENDING') {
              pendingBk++;
            }
          }
        }
      } catch (_) {}

      // C. Học viên đã nộp tiền chờ xếp lớp
      int waitingBatchCount = 0;
      try {
        final enrRes = await _apiClient.dio.get(
          '/rest/v1/course_enrollments?select=id,batch_id,amount_paid&batch_id=is.null&amount_paid=gt.0',
        );
        if (enrRes.data is List) {
          waitingBatchCount = enrRes.data.length;
        }
      } catch (_) {}

      // D. Bài thi nộp gần đây chưa duyệt feedback
      int pendingQuizCount = 0;
      try {
        final qRes = await _apiClient.dio.get(
          '/rest/v1/quiz_submissions?select=id,instructor_feedback&instructor_feedback=is.null&limit=20',
        );
        if (qRes.data is List) {
          pendingQuizCount = qRes.data.length;
        }
      } catch (_) {}

      final totalActions = pendingBk + waitingBatchCount + pendingQuizCount;

      return AdminKpiMetrics(
        todayRevenue: todayRev,
        todayBookingsCount: todayBk,
        checkedInBookingsCount: checkedInBk,
        waitingBatchStudentsCount: waitingBatchCount,
        pendingActionsCount: totalActions,
      );
    } catch (e) {
      debugPrint('[AdminRepository] fetchDashboardMetrics error: $e');
      return AdminKpiMetrics.empty();
    }
  }

  /// 3. Lấy danh sách việc cần xử lý khẩn cấp (Urgent Action Required Feed)
  Future<List<AdminActionItem>> fetchPendingActionItems({String? branchId}) async {
    final List<AdminActionItem> items = [];

    // A. Lịch hẹn PENDING
    try {
      String query =
          '/rest/v1/bookings?select=id,booking_code,booking_date,start_time,customer_name,customer_phone,service_name,branch_id,created_at&status=eq.PENDING&order=created_at.desc&limit=10';
      if (branchId != null && branchId.isNotEmpty && branchId != 'ALL') {
        query += '&branch_id=eq.$branchId';
      }
      final res = await _apiClient.dio.get(query);
      if (res.data is List) {
        for (final b in res.data) {
          final custName = b['customer_name']?.toString() ?? 'Khách hàng';
          final sName = b['service_name']?.toString() ?? 'Dịch vụ MLD';
          final sTime = b['start_time']?.toString() ?? '';
          final bDate = b['booking_date']?.toString() ?? '';

          items.add(AdminActionItem(
            id: 'bk_${b['id']}',
            type: AdminActionType.pendingBooking,
            title: '$custName đặt lịch $sName',
            subtitle: 'Thời gian: $sTime ngày $bDate',
            timeAgo: 'Cần duyệt xác nhận',
            secondaryInfo: b['customer_phone']?.toString(),
            rawId: b['id']?.toString() ?? '',
            rawData: b as Map<String, dynamic>,
          ));
        }
      }
    } catch (e) {
      debugPrint('[AdminRepository] fetch pending bookings error: $e');
    }

    // B. Học viên đã nộp tiền chờ xếp lớp
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/course_enrollments?select=id,order_code,candidate_name,candidate_phone,course_title,amount_paid,tuition_total,created_at&batch_id=is.null&amount_paid=gt.0&order=created_at.desc&limit=10',
      );
      if (res.data is List) {
        for (final e in res.data) {
          final sName = e['candidate_name']?.toString() ?? 'Học viên';
          final cTitle = e['course_title']?.toString() ?? 'Khóa học MLD';
          final paid = double.tryParse(e['amount_paid']?.toString() ?? '0') ?? 0.0;
          final formatter = NumberFormat('#,###', 'vi_VN');

          items.add(AdminActionItem(
            id: 'enr_${e['id']}',
            type: AdminActionType.waitingBatch,
            title: '$sName đã nộp ${formatter.format(paid)} ₫',
            subtitle: 'Khóa: $cTitle (Đang chờ xếp lớp)',
            timeAgo: 'Chờ xếp lớp',
            secondaryInfo: e['candidate_phone']?.toString(),
            rawId: e['id']?.toString() ?? '',
            rawData: e as Map<String, dynamic>,
          ));
        }
      }
    } catch (e) {
      debugPrint('[AdminRepository] fetch waiting batch error: $e');
    }

    // C. Bài thi học viên nộp gần đây
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/quiz_submissions?select=id,score,passed,submitted_at,course_enrollments(candidate_name,course_title)&order=submitted_at.desc&limit=5',
      );
      if (res.data is List) {
        for (final q in res.data) {
          final enr = q['course_enrollments'];
          String sName = 'Học viên';
          String cTitle = 'Đào tạo MLD';
          if (enr is Map) {
            sName = enr['candidate_name']?.toString() ?? sName;
            cTitle = enr['course_title']?.toString() ?? cTitle;
          }
          final score = q['score']?.toString() ?? '0';
          final passed = q['passed'] == true;

          items.add(AdminActionItem(
            id: 'quiz_${q['id']}',
            type: AdminActionType.newQuizSubmission,
            title: '$sName vừa nộp bài thi ($score điểm)',
            subtitle: 'Khóa: $cTitle · ${passed ? "ĐẠT CHUẨN" : "CẦN ÔN TẬP"}',
            timeAgo: 'Bài thi mới',
            secondaryInfo: 'Cần nhận xét giảng viên',
            rawId: q['id']?.toString() ?? '',
            rawData: q as Map<String, dynamic>,
          ));
        }
      }
    } catch (e) {
      debugPrint('[AdminRepository] fetch quiz submissions error: $e');
    }

    return items;
  }

  /// 4. Quản lý Lịch hẹn Spa (Frontdesk & Appointments)
  Future<List<AdminBookingModel>> fetchBookings({
    String? bookingDate,
    String? status,
    String? branchId,
  }) async {
    try {
      String query =
          '/rest/v1/bookings?select=*,branches(name),technicians(full_name),branch_rooms(name)&order=start_time.asc';
      if (bookingDate != null && bookingDate.isNotEmpty) {
        query += '&booking_date=eq.$bookingDate';
      }
      if (status != null && status.isNotEmpty && status != 'ALL') {
        query += '&status=eq.$status';
      }
      if (branchId != null && branchId.isNotEmpty && branchId != 'ALL') {
        query += '&branch_id=eq.$branchId';
      }

      final res = await _apiClient.dio.get(query);
      if (res.data is List) {
        return (res.data as List)
            .map((item) => AdminBookingModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('[AdminRepository] fetchBookings error: $e');
      return [];
    }
  }

  /// 4.1. Duyệt lịch hẹn (PENDING -> CONFIRMED)
  Future<bool> approveBooking(String bookingId) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/bookings?id=eq.$bookingId',
        data: {'status': 'CONFIRMED'},
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] approveBooking error: $e');
      return false;
    }
  }

  /// 4.2. Tiếp đón khách Check-in (CONFIRMED -> CHECKED_IN)
  Future<bool> checkInBooking(String bookingId) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/bookings?id=eq.$bookingId',
        data: {
          'status': 'CHECKED_IN',
          'checked_in_at': DateTime.now().toIso8601String(),
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] checkInBooking error: $e');
      return false;
    }
  }

  /// 4.3. Bắt đầu dịch vụ (CHECKED_IN -> IN_SERVICE)
  Future<bool> startServiceBooking(String bookingId) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/bookings?id=eq.$bookingId',
        data: {
          'status': 'IN_SERVICE',
          'service_started_at': DateTime.now().toIso8601String(),
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] startServiceBooking error: $e');
      return false;
    }
  }

  /// 4.4. Hoàn thành dịch vụ Check-out (IN_SERVICE -> COMPLETED)
  Future<bool> checkOutBooking(String bookingId) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/bookings?id=eq.$bookingId',
        data: {
          'status': 'COMPLETED',
          'checked_out_at': DateTime.now().toIso8601String(),
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] checkOutBooking error: $e');
      return false;
    }
  }

  /// 5. Quản lý Tuyển sinh (Enrollments)
  Future<List<AdminCandidateModel>> fetchCandidates({String? statusFilter}) async {
    try {
      String query =
          '/rest/v1/course_enrollments?select=*,courses(title),course_batches(batch_code)&order=created_at.desc';
      final res = await _apiClient.dio.get(query);
      if (res.data is List) {
        final all = (res.data as List)
            .map((item) => AdminCandidateModel.fromJson(item as Map<String, dynamic>))
            .toList();

        if (statusFilter != null && statusFilter.isNotEmpty && statusFilter != 'ALL') {
          return all.where((c) => c.status == statusFilter).toList();
        }
        return all;
      }
      return [];
    } catch (e) {
      debugPrint('[AdminRepository] fetchCandidates error: $e');
      return [];
    }
  }

  /// 5.1. Xếp lớp học viên (Assign Batch)
  Future<bool> assignBatchToCandidate(String enrollmentId, String batchId) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/course_enrollments?id=eq.$enrollmentId',
        data: {
          'batch_id': batchId,
          'status': 'ENROLLED',
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] assignBatchToCandidate error: $e');
      return false;
    }
  }

  /// 5.2. Danh sách Lớp học để xếp lớp
  Future<List<AdminCourseBatchModel>> fetchCourseBatches(String courseId) async {
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/course_batches?select=*,instructors(full_name),branch_rooms(name)&course_id=eq.$courseId&order=start_date.asc',
      );
      if (res.data is List) {
        return (res.data as List)
            .map((item) => AdminCourseBatchModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('[AdminRepository] fetchCourseBatches error: $e');
      return [];
    }
  }

  /// 6. Quản lý & Duyệt Dịch vụ Spa (Services)
  Future<List<AdminServiceModel>> fetchServices({String? categoryId}) async {
    try {
      String query =
          '/rest/v1/services?select=*,service_categories(name)&order=created_at.desc';
      if (categoryId != null && categoryId.isNotEmpty && categoryId != 'ALL') {
        query += '&category_id=eq.$categoryId';
      }
      final res = await _apiClient.dio.get(query);
      if (res.data is List) {
        return (res.data as List)
            .map((item) => AdminServiceModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('[AdminRepository] fetchServices error: $e');
      return [];
    }
  }

  /// 6.1. Bật/Tắt Duyệt kinh doanh dịch vụ 1 chạm (is_active toggle)
  Future<bool> toggleServiceActive(String serviceId, bool nextStatus) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/services?id=eq.$serviceId',
        data: {'is_active': nextStatus},
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] toggleServiceActive error: $e');
      return false;
    }
  }

  /// 6.2. Tạo mới hoặc Cập nhật Dịch vụ Spa
  Future<bool> saveService({String? id, required Map<String, dynamic> data}) async {
    try {
      if (id != null && id.isNotEmpty) {
        final res = await _apiClient.dio.patch(
          '/rest/v1/services?id=eq.$id',
          data: data,
        );
        return res.statusCode == 200 || res.statusCode == 204;
      } else {
        final res = await _apiClient.dio.post(
          '/rest/v1/services',
          data: data,
        );
        return res.statusCode == 200 || res.statusCode == 201;
      }
    } catch (e) {
      debugPrint('[AdminRepository] saveService error: $e');
      return false;
    }
  }

  /// 7. Quản lý & Duyệt Khóa học (Courses)
  Future<List<AdminCourseModel>> fetchCourses({String? level}) async {
    try {
      String query =
          '/rest/v1/courses?select=*,course_categories(name),instructors(full_name)&order=created_at.desc';
      if (level != null && level.isNotEmpty && level != 'ALL') {
        query += '&level=eq.$level';
      }
      final res = await _apiClient.dio.get(query);
      if (res.data is List) {
        return (res.data as List)
            .map((item) => AdminCourseModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('[AdminRepository] fetchCourses error: $e');
      return [];
    }
  }

  /// 7.1. Bật/Tắt Tuyển sinh khóa học 1 chạm (is_active toggle)
  Future<bool> toggleCourseActive(String courseId, bool nextStatus) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/courses?id=eq.$courseId',
        data: {'is_active': nextStatus},
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] toggleCourseActive error: $e');
      return false;
    }
  }

  /// 7.2. Tạo mới hoặc Cập nhật Khóa học đào tạo
  Future<bool> saveCourse({String? id, required Map<String, dynamic> data}) async {
    try {
      if (id != null && id.isNotEmpty) {
        final res = await _apiClient.dio.patch(
          '/rest/v1/courses?id=eq.$id',
          data: data,
        );
        return res.statusCode == 200 || res.statusCode == 204;
      } else {
        final res = await _apiClient.dio.post(
          '/rest/v1/courses',
          data: data,
        );
        return res.statusCode == 200 || res.statusCode == 201;
      }
    } catch (e) {
      debugPrint('[AdminRepository] saveCourse error: $e');
      return false;
    }
  }

  /// 8. Quản lý Bài thi học viên (Quiz Submissions)
  Future<List<AdminQuizSubmissionModel>> fetchQuizSubmissions() async {
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/quiz_submissions?select=*,course_quizzes(title),course_enrollments(candidate_name,candidate_phone,course_title)&order=submitted_at.desc',
      );
      if (res.data is List) {
        return (res.data as List)
            .map((item) => AdminQuizSubmissionModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('[AdminRepository] fetchQuizSubmissions error: $e');
      return [];
    }
  }

  /// 8.1. Cập nhật nhận xét bài thi của Giảng viên / Quản lý
  Future<bool> submitInstructorFeedback({
    required String submissionId,
    required String feedback,
    required bool passed,
  }) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/quiz_submissions?id=eq.$submissionId',
        data: {
          'instructor_feedback': feedback,
          'passed': passed,
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] submitInstructorFeedback error: $e');
      return false;
    }
  }
}
