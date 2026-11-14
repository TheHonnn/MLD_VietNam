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
      final monthPrefix = DateFormat('yyyy-MM').format(now);
      final monthStartStr = DateFormat('yyyy-MM-01').format(now);

      // A. Doanh thu hôm nay & tháng này (tổng từ hóa đơn Spa + Học phí đã thu)
      double todayRev = 0.0;
      double monthRev = 0.0;
      try {
        final branchParam = (branchId != null && branchId.isNotEmpty && branchId != 'ALL')
            ? '&branch_id=eq.$branchId'
            : '';
        // 1. Thu từ hóa đơn POS / Dịch vụ
        final invRes = await _apiClient.dio.get(
          '/rest/v1/invoices?select=total_amount,payment_status,paid_at,created_at&payment_status=eq.PAID$branchParam',
        );
        if (invRes.data is List) {
          for (final inv in invRes.data) {
            final amt = double.tryParse(inv['total_amount']?.toString() ?? '0') ?? 0.0;
            final pDate = inv['paid_at']?.toString() ?? inv['created_at']?.toString() ?? '';
            if (pDate.startsWith(monthPrefix)) {
              monthRev += amt;
            }
            if (pDate.startsWith(todayStr)) {
              todayRev += amt;
            }
          }
        }
      } catch (_) {}

      // 2. Thu từ Học viện (course_enrollments - đồng bộ học phí thực nộp)
      try {
        final enrRevRes = await _apiClient.dio.get(
          '/rest/v1/course_enrollments?select=amount_paid,enrolled_at,payment_status&amount_paid=gt.0',
        );
        if (enrRevRes.data is List) {
          for (final e in enrRevRes.data) {
            final amt = double.tryParse(e['amount_paid']?.toString() ?? '0') ?? 0.0;
            final eDate = e['enrolled_at']?.toString() ?? '';
            if (eDate.startsWith(monthPrefix)) {
              monthRev += amt;
            }
            if (eDate.startsWith(todayStr)) {
              todayRev += amt;
            }
          }
        }
      } catch (_) {}

      // B. Thống kê Học viên mới hôm nay & tháng này (Tuyển sinh & Ghi danh)
      int todayStudents = 0;
      int monthStudents = 0;
      try {
        final studentRes = await _apiClient.dio.get(
          '/rest/v1/course_enrollments?select=id,enrolled_at&enrolled_at=gte.$monthStartStr',
        );
        if (studentRes.data is List) {
          for (final s in studentRes.data) {
            monthStudents++;
            final enrolledAt = s['enrolled_at']?.toString() ?? '';
            if (enrolledAt.startsWith(todayStr)) {
              todayStudents++;
            }
          }
        }
      } catch (_) {}

      // C. Thống kê lịch hẹn hôm nay & Tất cả ca đang chờ duyệt
      int todayBk = 0;
      int checkedInBk = 0;
      int pendingBk = 0;
      try {
        final branchParam = (branchId != null && branchId.isNotEmpty && branchId != 'ALL')
            ? '&branch_id=eq.$branchId'
            : '';
        final bkRes = await _apiClient.dio.get(
          '/rest/v1/bookings?select=id,status,booking_date,final_price&booking_date=eq.$todayStr$branchParam',
        );
        if (bkRes.data is List) {
          todayBk = bkRes.data.length;
          for (final b in bkRes.data) {
            final st = (b['status']?.toString() ?? '').toUpperCase();
            if (st == 'CHECKED_IN' || st == 'IN_SERVICE' || st == 'COMPLETED') {
              checkedInBk++;
            }
          }
        }

        // Đếm TẤT CẢ các ca PENDING đang chờ duyệt (mọi ngày)
        final pendingRes = await _apiClient.dio.get(
          '/rest/v1/bookings?select=id&status=eq.PENDING$branchParam',
        );
        if (pendingRes.data is List) {
          pendingBk = pendingRes.data.length;
        }
      } catch (_) {}

      // D. Học viên đã nộp tiền chờ xếp lớp
      int waitingBatchCount = 0;
      try {
        final enrRes = await _apiClient.dio.get(
          '/rest/v1/course_enrollments?select=id,batch_id,amount_paid&batch_id=is.null&amount_paid=gt.0',
        );
        if (enrRes.data is List) {
          waitingBatchCount = enrRes.data.length;
        }
      } catch (_) {}

      // E. Bài thi nộp gần đây chưa duyệt feedback
      int pendingQuizCount = 0;
      try {
        final qRes = await _apiClient.dio.get(
          '/rest/v1/quiz_submissions?select=id,instructor_feedback&limit=30',
        );
        if (qRes.data is List) {
          for (final q in qRes.data) {
            final fb = q['instructor_feedback']?.toString() ?? '';
            if (fb.trim().isEmpty) {
              pendingQuizCount++;
            }
          }
        }
      } catch (_) {}

      final totalActions = pendingBk + waitingBatchCount + pendingQuizCount;

      return AdminKpiMetrics(
        todayRevenue: todayRev,
        monthRevenue: monthRev,
        todayStudentsCount: todayStudents,
        monthStudentsCount: monthStudents,
        todayBookingsCount: todayBk,
        checkedInBookingsCount: checkedInBk,
        waitingBatchStudentsCount: waitingBatchCount,
        pendingActionsCount: totalActions,
        pendingBookingsCount: pendingBk,
        pendingQuizzesCount: pendingQuizCount,
      );
    } catch (e) {
      debugPrint('[AdminRepository] fetchDashboardMetrics error: $e');
      return AdminKpiMetrics.empty();
    }
  }

  /// 3. Lấy danh sách việc cần xử lý khẩn cấp (Urgent Action Required Feed)
  Future<List<AdminActionItem>> fetchPendingActionItems({String? branchId}) async {
    final List<AdminActionItem> items = [];

    // A. Lịch hẹn PENDING (Tất cả ngày)
    try {
      String query =
          '/rest/v1/bookings?select=id,booking_code,booking_date,start_time,booked_for_name,booked_for_phone,final_price,branch_id,created_at,branches(name)&status=eq.PENDING&order=created_at.desc&limit=25';
      if (branchId != null && branchId.isNotEmpty && branchId != 'ALL') {
        query += '&branch_id=eq.$branchId';
      }
      final res = await _apiClient.dio.get(query);
      if (res.data is List) {
        for (final b in res.data) {
          final custName = b['booked_for_name']?.toString() ?? 'Khách hàng';
          final sName = 'Trị liệu MLD';
          final sTime = b['start_time']?.toString() ?? '';
          final bDate = b['booking_date']?.toString() ?? '';
          final branchObj = b['branches'];
          final branchName = branchObj is Map ? branchObj['name']?.toString() : null;

          items.add(AdminActionItem(
            id: 'bk_${b['id']}',
            type: AdminActionType.pendingBooking,
            title: '$custName đặt lịch $sName',
            subtitle: 'Thời gian: $sTime ngày $bDate${branchName != null ? " · $branchName" : ""}',
            timeAgo: 'Cần duyệt xác nhận',
            secondaryInfo: b['booked_for_phone']?.toString(),
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
        '/rest/v1/course_enrollments?select=id,order_code,student_name,student_phone,amount_paid,tuition_total,enrolled_at,courses(title)&batch_id=is.null&amount_paid=gt.0&order=enrolled_at.desc&limit=25',
      );
      if (res.data is List) {
        for (final e in res.data) {
          final sName = e['student_name']?.toString() ?? 'Học viên';
          final courseObj = e['courses'];
          final cTitle = courseObj is Map ? courseObj['title']?.toString() ?? 'Khóa học MLD' : 'Khóa học MLD';
          final paid = double.tryParse(e['amount_paid']?.toString() ?? '0') ?? 0.0;
          final formatter = NumberFormat('#,###', 'vi_VN');

          items.add(AdminActionItem(
            id: 'enr_${e['id']}',
            type: AdminActionType.waitingBatch,
            title: '$sName đã nộp ${formatter.format(paid)} ₫',
            subtitle: 'Khóa: $cTitle (Đang chờ xếp lớp)',
            timeAgo: 'Chờ xếp lớp',
            secondaryInfo: e['student_phone']?.toString(),
            rawId: e['id']?.toString() ?? '',
            rawData: e as Map<String, dynamic>,
          ));
        }
      }
    } catch (e) {
      debugPrint('[AdminRepository] fetch waiting batch error: $e');
    }

    // C. Bài thi học viên nộp gần đây chưa duyệt feedback
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/quiz_submissions?select=id,score,passed,submitted_at,instructor_feedback,course_enrollments(student_name,courses(title))&order=submitted_at.desc&limit=25',
      );
      if (res.data is List) {
        for (final q in res.data) {
          final fb = q['instructor_feedback']?.toString() ?? '';
          if (fb.trim().isNotEmpty) continue; // Đã nhận xét xong, bỏ qua

          final enr = q['course_enrollments'];
          String sName = 'Học viên';
          String cTitle = 'Đào tạo MLD';
          if (enr is Map) {
            sName = enr['student_name']?.toString() ?? sName;
            final cObj = enr['courses'];
            if (cObj is Map) {
              cTitle = cObj['title']?.toString() ?? cTitle;
            }
          }
          final score = q['score']?.toString() ?? '0';
          final passed = q['passed'] == true;

          items.add(AdminActionItem(
            id: 'quiz_${q['id']}',
            type: AdminActionType.newQuizSubmission,
            title: '$sName vừa nộp bài thi ($score điểm)',
            subtitle: 'Khóa: $cTitle · ${passed ? "HOÀN THÀNH" : "CẦN ÔN TẬP"}',
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
    bool isAllDates = false,
  }) async {
    try {
      String query =
          '/rest/v1/bookings?select=*,branches(name),technicians(full_name),branch_rooms(name)&order=booking_date.desc,start_time.asc';
      if (!isAllDates && bookingDate != null && bookingDate.isNotEmpty) {
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

  /// 4.5. Từ chối / Hủy lịch hẹn (PENDING/CONFIRMED -> CANCELLED)
  Future<bool> cancelBooking(String bookingId, {String? reason}) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/bookings?id=eq.$bookingId',
        data: {
          'status': 'CANCELLED',
          'cancelled_at': DateTime.now().toIso8601String(),
          if (reason != null && reason.trim().isNotEmpty) 'cancellation_reason': reason.trim(),
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] cancelBooking error: $e');
      return false;
    }
  }

  /// 5. Quản lý Tuyển sinh (Enrollments)
  Future<List<AdminCandidateModel>> fetchCandidates({String? statusFilter}) async {
    try {
      String query =
          '/rest/v1/course_enrollments?select=*,courses(title),course_batches(batch_code)&order=enrolled_at.desc';
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
          'status': 'STUDYING',
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] assignBatchToCandidate error: $e');
      return false;
    }
  }

  /// 5.1.1. Gỡ học viên khỏi lớp về danh sách chờ xếp lớp (Unassign Batch)
  Future<bool> unassignBatchFromCandidate(String enrollmentId) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/course_enrollments?id=eq.$enrollmentId',
        data: {
          'batch_id': null,
          'status': 'ENROLLED',
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] unassignBatchFromCandidate error: $e');
      return false;
    }
  }

  /// 5.2. Danh sách Lớp học để xếp lớp
  Future<List<AdminCourseBatchModel>> fetchCourseBatches(String courseId) async {
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/course_batches?select=*,courses(title),branches(name),instructors!course_batches_instructor_id_fkey(full_name)&course_id=eq.$courseId&order=start_date.asc',
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

  /// 5.3. Danh sách TẤT CẢ các Lớp học đang mở (Hiển thị phân nhóm theo Lớp)
  Future<List<AdminCourseBatchModel>> fetchAllCourseBatches() async {
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/course_batches?select=*,courses(title),branches(name),instructors!course_batches_instructor_id_fkey(full_name)&order=start_date.desc',
      );
      if (res.data is List) {
        return (res.data as List)
            .map((item) => AdminCourseBatchModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('[AdminRepository] fetchAllCourseBatches error: $e');
      return [];
    }
  }

  /// 5.4. Thêm mới học viên tuyển sinh (CRUD kiểu Trello - Create)
  Future<bool> createCandidate({
    required String candidateName,
    required String candidatePhone,
    String? candidateEmail,
    required String courseId,
    String status = 'CONSULTING',
    double amountPaid = 0.0,
    String? notes,
  }) async {
    try {
      String dbStatus = status.toUpperCase();
      if (dbStatus == 'PENDING' || dbStatus == 'PENDING_CONSULTATION' || dbStatus == 'PENDING_APPROVAL') {
        dbStatus = 'CONSULTING';
      } else if (dbStatus == 'CONFIRMED' || dbStatus == 'CONFIRMED_PENDING_PAY') {
        dbStatus = 'DEPOSITED';
      } else if (dbStatus == 'PAID' || dbStatus == 'PAID_WAITING_CLASS') {
        dbStatus = 'ENROLLED';
      } else if (dbStatus == 'ENROLLED_STUDYING') {
        dbStatus = 'STUDYING';
      } else if (dbStatus == 'COMPLETED') {
        dbStatus = 'GRADUATED';
      }

      final res = await _apiClient.dio.post(
        '/rest/v1/course_enrollments',
        data: {
          'student_name': candidateName,
          'student_phone': candidatePhone,
          if (candidateEmail != null && candidateEmail.isNotEmpty) 'student_email': candidateEmail,
          'course_id': courseId,
          'status': dbStatus,
          'amount_paid': amountPaid,
          'enrolled_at': DateTime.now().toIso8601String(),
          if (notes != null && notes.isNotEmpty) 'approval_notes': notes,
        },
      );
      return res.statusCode == 201 || res.statusCode == 200;
    } catch (e) {
      debugPrint('[AdminRepository] createCandidate error: $e');
      return false;
    }
  }

  /// 5.5. Cập nhật trạng thái cột Kanban (CRUD kiểu Trello - Update Column)
  Future<bool> updateCandidateStatus(String candidateId, String newStatus) async {
    try {
      String dbStatus = newStatus.toUpperCase();
      if (dbStatus == 'PENDING' || dbStatus == 'PENDING_CONSULTATION' || dbStatus == 'PENDING_APPROVAL') {
        dbStatus = 'CONSULTING';
      } else if (dbStatus == 'CONFIRMED' || dbStatus == 'CONFIRMED_PENDING_PAY') {
        dbStatus = 'DEPOSITED';
      } else if (dbStatus == 'PAID' || dbStatus == 'PAID_WAITING_CLASS') {
        dbStatus = 'ENROLLED';
      } else if (dbStatus == 'ENROLLED_STUDYING') {
        dbStatus = 'STUDYING';
      } else if (dbStatus == 'COMPLETED') {
        dbStatus = 'GRADUATED';
      }

      final res = await _apiClient.dio.patch(
        '/rest/v1/course_enrollments?id=eq.$candidateId',
        data: {
          'status': dbStatus,
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] updateCandidateStatus error: $e');
      return false;
    }
  }

  /// 5.6. Xóa / Hủy học viên (CRUD kiểu Trello - Delete)
  Future<bool> deleteCandidate(String candidateId) async {
    try {
      final res = await _apiClient.dio.delete(
        '/rest/v1/course_enrollments?id=eq.$candidateId',
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] deleteCandidate error: $e');
      return false;
    }
  }

  /// 6. Quản lý & Duyệt Dịch vụ Spa (Services) - Sắp xếp theo Thời lượng / Thứ tự chuẩn Web
  Future<List<AdminServiceModel>> fetchServices({String? categoryId}) async {
    try {
      String query =
          '/rest/v1/services?select=*,service_categories(name)&order=duration_minutes.asc,created_at.asc';
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

  /// 6.0. Tải danh mục dịch vụ (Service Categories)
  Future<List<Map<String, dynamic>>> fetchServiceCategories() async {
    try {
      final res = await _apiClient.dio.get('/rest/v1/service_categories?select=id,name&order=display_order.asc');
      if (res.data is List) {
        return List<Map<String, dynamic>>.from(res.data);
      }
      return [];
    } catch (e) {
      debugPrint('[AdminRepository] fetchServiceCategories error: $e');
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
        '/rest/v1/quiz_submissions?select=*,course_quizzes(title),course_enrollments(student_name,student_phone,batch_id,courses(title),course_batches(batch_code))&order=submitted_at.desc',
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

  /// 9. Tải Báo cáo Doanh thu chi tiết phục vụ Biểu đồ Lưới (Revenue Grid Modal)
  Future<AdminRevenueReport> fetchRevenueReport({
    String? branchId,
    String period = 'MONTH', // 'TODAY', 'WEEK', 'MONTH'
  }) async {
    try {
      final now = DateTime.now();
      final todayStr = DateFormat('yyyy-MM-dd').format(now);
      DateTime startDt;
      if (period == 'TODAY') {
        startDt = DateTime(now.year, now.month, now.day);
      } else if (period == 'WEEK') {
        startDt = now.subtract(const Duration(days: 6));
      } else {
        startDt = DateTime(now.year, now.month, 1);
      }

      final List<AdminRevenueItem> items = [];
      double serviceRev = 0.0;
      double academyRev = 0.0;
      double productRev = 0.0;

      // 1. Lấy dữ liệu Học viện (Tuyển sinh & Học phí)
      try {
        final enrRes = await _apiClient.dio.get(
          '/rest/v1/course_enrollments?select=id,order_code,student_name,student_phone,amount_paid,enrolled_at,payment_status,selected_branch,courses(title)&amount_paid=gt.0&order=enrolled_at.desc',
        );
        if (enrRes.data is List) {
          for (final e in enrRes.data) {
            final eDateStr = e['enrolled_at']?.toString() ?? '';
            if (eDateStr.isEmpty) continue;
            final eDate = DateTime.tryParse(eDateStr)?.toLocal() ?? now;

            // Kiểm tra theo khoảng thời gian
            if (period == 'TODAY') {
              if (!eDateStr.startsWith(todayStr)) continue;
            } else {
              if (eDate.isBefore(startDt)) continue;
            }

            final amt = double.tryParse(e['amount_paid']?.toString() ?? '0') ?? 0.0;
            academyRev += amt;
            final cTitle = (e['courses'] is Map) ? e['courses']['title']?.toString() ?? 'Khóa học' : 'Khóa học';
            final sName = e['student_name']?.toString() ?? 'Học viên';

            items.add(AdminRevenueItem(
              id: 'enr_${e['id']}',
              code: e['order_code']?.toString() ?? 'ENR-${e['id']?.toString().substring(0, 6)}',
              title: 'Học phí: $cTitle',
              customerOrStudentName: sName,
              phone: e['student_phone']?.toString(),
              category: 'ACADEMY_TUITION',
              amount: amt,
              timestamp: eDateStr,
              status: e['payment_status']?.toString() ?? 'PAID',
              branchName: e['selected_branch']?.toString(),
            ));
          }
        }
      } catch (e) {
        debugPrint('[AdminRepository] fetchRevenueReport enrollments error: $e');
      }

      // 2. Lấy dữ liệu Hóa đơn POS & Dịch vụ Spa
      try {
        final branchParam = (branchId != null && branchId.isNotEmpty && branchId != 'ALL')
            ? '&branch_id=eq.$branchId'
            : '';
        final invRes = await _apiClient.dio.get(
          '/rest/v1/invoices?select=id,invoice_code,total_amount,payment_status,paid_at,created_at,branch_id,branches(name)&payment_status=eq.PAID$branchParam&order=paid_at.desc',
        );
        if (invRes.data is List) {
          for (final inv in invRes.data) {
            final pDateStr = inv['paid_at']?.toString() ?? inv['created_at']?.toString() ?? '';
            if (pDateStr.isEmpty) continue;
            final pDate = DateTime.tryParse(pDateStr)?.toLocal() ?? now;

            if (period == 'TODAY') {
              if (!pDateStr.startsWith(todayStr)) continue;
            } else {
              if (pDate.isBefore(startDt)) continue;
            }

            final amt = double.tryParse(inv['total_amount']?.toString() ?? '0') ?? 0.0;
            serviceRev += amt;
            final brObj = inv['branches'];
            final brName = brObj is Map ? brObj['name']?.toString() : null;

            items.add(AdminRevenueItem(
              id: 'inv_${inv['id']}',
              code: inv['invoice_code']?.toString() ?? 'HD-${inv['id']?.toString().substring(0, 6)}',
              title: 'Hóa đơn dịch vụ trị liệu',
              customerOrStudentName: 'Khách hàng',
              category: 'SPA_SERVICE',
              amount: amt,
              timestamp: pDateStr,
              status: 'PAID',
              branchName: brName,
            ));
          }
        }
      } catch (_) {}

      // Sắp xếp items theo thời gian giảm dần
      items.sort((a, b) => b.timestamp.compareTo(a.timestamp));

      final totalRev = serviceRev + academyRev + productRev;
      final totalCount = items.length;
      final avgTicket = totalCount > 0 ? (totalRev / totalCount) : 0.0;

      // 3. Xây dựng các điểm đồ thị lưới (chartPoints)
      final List<AdminRevenuePoint> points = [];

      if (period == 'TODAY') {
        // Chia 3 khung giờ ca làm việc: Sáng (08:00 - 12:00), Chiều (12:00 - 17:30), Tối (17:30 - 21:00)
        final shifts = [
          {'label': 'Ca Sáng (8h-12h)', 'key': 'morning'},
          {'label': 'Ca Chiều (12h-17h30)', 'key': 'afternoon'},
          {'label': 'Ca Tối (17h30-21h)', 'key': 'evening'},
        ];

        for (final s in shifts) {
          double sTotal = 0.0;
          double sAcad = 0.0;
          double sServ = 0.0;
          int sCount = 0;

          for (final it in items) {
            final dt = DateTime.tryParse(it.timestamp)?.toLocal() ?? now;
            final h = dt.hour;
            bool match = false;
            if (s['key'] == 'morning' && h < 12) match = true;
            if (s['key'] == 'afternoon' && h >= 12 && h < 18) match = true;
            if (s['key'] == 'evening' && h >= 18) match = true;

            if (match) {
              sTotal += it.amount;
              sCount++;
              if (it.category == 'ACADEMY_TUITION') sAcad += it.amount;
              if (it.category == 'SPA_SERVICE') sServ += it.amount;
            }
          }

          points.add(AdminRevenuePoint(
            label: s['label']!,
            dateIso: todayStr,
            totalAmount: sTotal,
            academyAmount: sAcad,
            serviceAmount: sServ,
            transactionCount: sCount,
          ));
        }
      } else if (period == 'WEEK') {
        const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        for (int i = 6; i >= 0; i--) {
          final targetDate = now.subtract(Duration(days: i));
          final targetStr = DateFormat('yyyy-MM-dd').format(targetDate);
          final weekdayStr = weekdays[(targetDate.weekday - 1).clamp(0, 6)];
          final displayLabel = '$weekdayStr (${DateFormat('dd/MM').format(targetDate)})';

          double dTotal = 0.0;
          double dAcad = 0.0;
          double dServ = 0.0;
          int dCount = 0;

          for (final it in items) {
            if (it.timestamp.startsWith(targetStr)) {
              dTotal += it.amount;
              dCount++;
              if (it.category == 'ACADEMY_TUITION') dAcad += it.amount;
              if (it.category == 'SPA_SERVICE') dServ += it.amount;
            }
          }

          points.add(AdminRevenuePoint(
            label: displayLabel,
            dateIso: targetStr,
            totalAmount: dTotal,
            academyAmount: dAcad,
            serviceAmount: dServ,
            transactionCount: dCount,
          ));
        }
      } else {
        // THÁNG NÀY: Gom nhóm theo 4 tuần / mốc ngày (Tuần 1: 1-7, Tuần 2: 8-14, Tuần 3: 15-21, Tuần 4: 22-hết)
        final weeks = [
          {'label': 'Tuần 1 (1 - 7)', 'start': 1, 'end': 7},
          {'label': 'Tuần 2 (8 - 14)', 'start': 8, 'end': 14},
          {'label': 'Tuần 3 (15 - 21)', 'start': 15, 'end': 21},
          {'label': 'Tuần 4 (22 - ${DateTime(now.year, now.month + 1, 0).day})', 'start': 22, 'end': 31},
        ];

        for (final w in weeks) {
          double wTotal = 0.0;
          double wAcad = 0.0;
          double wServ = 0.0;
          int wCount = 0;

          for (final it in items) {
            final dt = DateTime.tryParse(it.timestamp)?.toLocal();
            if (dt != null && dt.month == now.month && dt.year == now.year) {
              if (dt.day >= (w['start'] as int) && dt.day <= (w['end'] as int)) {
                wTotal += it.amount;
                wCount++;
                if (it.category == 'ACADEMY_TUITION') wAcad += it.amount;
                if (it.category == 'SPA_SERVICE') wServ += it.amount;
              }
            }
          }

          points.add(AdminRevenuePoint(
            label: w['label'] as String,
            dateIso: DateFormat('yyyy-MM').format(now),
            totalAmount: wTotal,
            academyAmount: wAcad,
            serviceAmount: wServ,
            transactionCount: wCount,
          ));
        }
      }

      return AdminRevenueReport(
        period: period,
        totalRevenue: totalRev,
        serviceRevenue: serviceRev,
        academyRevenue: academyRev,
        productRevenue: productRev,
        totalTransactions: totalCount,
        averageTicket: avgTicket,
        chartPoints: points,
        items: items,
      );
    } catch (e) {
      debugPrint('[AdminRepository] fetchRevenueReport error: $e');
      return AdminRevenueReport.empty(period);
    }
  }
}
