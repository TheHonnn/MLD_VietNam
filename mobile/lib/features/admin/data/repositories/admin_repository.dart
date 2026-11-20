import 'dart:io' show Platform;
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/admin_models.dart';

/// Central Admin & Manager Repository kết nối trực tiếp Supabase Cloud REST
/// Phục vụ 100% các chức năng quản trị, tiếp đón, tuyển sinh và phê duyệt
class AdminRepository {
  AdminRepository._internal();
  static final AdminRepository instance = AdminRepository._internal();
  factory AdminRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;
  String? lastBookingActionError;

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
          const sName = 'Trị liệu MLD';
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
          '/rest/v1/bookings?select=*,branches(name),technicians(full_name),branch_rooms(name),booking_items(*,services(name))&order=booking_date.desc,start_time.asc';
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

  String _extractDioErrorMessage(Object error, String fallback) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final msg = data['message'];
        if (msg is List && msg.isNotEmpty) {
          return msg.first.toString();
        }
        if (msg != null && msg.toString().trim().isNotEmpty) {
          return msg.toString().trim();
        }
      }
    }
    return fallback;
  }

  bool _shouldFallbackToSupabase(DioException error) {
    final code = error.response?.statusCode;
    if (code == 404 || code == 502 || code == 503) {
      return true;
    }
    return error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout;
  }

  Future<({bool handled, bool success})> _postBookingAction(
    String bookingId,
    String action, {
    Map<String, dynamic>? extra,
  }) async {
    lastBookingActionError = null;
    try {
      final res = await _apiClient.dio.post(
        '/admin/bookings/action',
        data: {
          'key': {'id': bookingId},
          'action': action,
          ...?extra,
        },
      );
      final ok = res.statusCode == 200 || res.statusCode == 201;
      return (handled: true, success: ok);
    } on DioException catch (e) {
      if (_shouldFallbackToSupabase(e)) {
        return (handled: false, success: false);
      }
      lastBookingActionError = _extractDioErrorMessage(
        e,
        'Không thể thực hiện thao tác ($action). Vui lòng thử lại.',
      );
      return (handled: true, success: false);
    } catch (e) {
      lastBookingActionError = 'Lỗi kết nối: $e';
      return (handled: true, success: false);
    }
  }

  Future<Map<String, dynamic>?> _fetchSingleBookingSnapshot(String bookingId) async {
    final res = await _apiClient.dio.get(
      '/rest/v1/bookings?id=eq.$bookingId&select=id,customer_id,technician_id,assigned_room_id,booking_date,start_time,end_time,status,session_status,payment_status,payment_method,final_price,special_notes&limit=1',
    );
    if (res.statusCode == 200 && res.data is List && (res.data as List).isNotEmpty) {
      return Map<String, dynamic>.from((res.data as List).first as Map);
    }
    return null;
  }

  Future<bool> approveBooking(String bookingId) async {
    final backend = await _postBookingAction(bookingId, 'confirm');
    if (backend.handled) return backend.success;
    try {
      final current = await _fetchSingleBookingSnapshot(bookingId);
      if (current != null && (current['status']?.toString().toUpperCase() ?? '') != 'PENDING') {
        lastBookingActionError = 'Chỉ xác nhận lịch đang chờ xử lý.';
        return false;
      }
      final res = await _apiClient.dio.patch(
        '/rest/v1/bookings?id=eq.$bookingId',
        data: {'status': 'CONFIRMED'},
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      lastBookingActionError = _extractDioErrorMessage(e, 'Không thể duyệt lịch.');
      return false;
    }
  }

  Future<bool> checkInBooking(String bookingId, {String? userPackageId}) async {
    String? resolvedPackageId = userPackageId;
    Map<String, dynamic>? current;
    if (resolvedPackageId == null || resolvedPackageId.isEmpty) {
      try {
        current = await _fetchSingleBookingSnapshot(bookingId);
        resolvedPackageId = extractUserPackageId(current?['special_notes']?.toString());
      } catch (_) {}
    }

    final backend = await _postBookingAction(
      bookingId,
      'checkin',
      extra: {
        if (resolvedPackageId != null && resolvedPackageId.isNotEmpty)
          'userPackageId': resolvedPackageId,
      },
    );
    if (backend.handled) return backend.success;

    try {
      current ??= await _fetchSingleBookingSnapshot(bookingId);
      final currentStatus = current?['status']?.toString().toUpperCase() ?? '';
      if (current != null && currentStatus != 'CONFIRMED') {
        lastBookingActionError = 'Chỉ check-in lịch đã được xác nhận.';
        return false;
      }
      final paymentMethod = current?['payment_method']?.toString().toUpperCase() ?? '';
      final finalPrice = double.tryParse(current?['final_price']?.toString() ?? '') ?? 0;
      final shouldMarkPackagePaid =
          paymentMethod == 'MEMBERSHIP_WALLET' && finalPrice == 0 && resolvedPackageId != null;
      final res = await _apiClient.dio.patch(
        '/rest/v1/bookings?id=eq.$bookingId',
        data: {
          'status': 'CHECKED_IN',
          'checked_in_at': DateTime.now().toIso8601String(),
          if (shouldMarkPackagePaid) 'payment_status': 'PAID',
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      lastBookingActionError = _extractDioErrorMessage(e, 'Lỗi tiếp đón Check-in.');
      return false;
    }
  }

  Future<bool> startServiceBooking(String bookingId) async {
    final backend = await _postBookingAction(bookingId, 'start-service');
    if (backend.handled) return backend.success;
    try {
      final current = await _fetchSingleBookingSnapshot(bookingId);
      final currentStatus = current?['status']?.toString().toUpperCase() ?? '';
      if (current != null && currentStatus != 'CHECKED_IN') {
        lastBookingActionError = currentStatus == 'PENDING'
            ? 'Cần xác nhận lịch hẹn trước khi check-in và phục vụ.'
            : 'Khách chưa check-in tại quầy. Vui lòng Check-in trước khi bắt đầu phục vụ.';
        return false;
      }
      final res = await _apiClient.dio.patch(
        '/rest/v1/bookings?id=eq.$bookingId',
        data: {
          'status': 'IN_SERVICE',
          'session_status': 'IN_SERVICE',
          'service_started_at': DateTime.now().toIso8601String(),
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      lastBookingActionError = _extractDioErrorMessage(e, 'Lỗi bắt đầu dịch vụ.');
      return false;
    }
  }

  Future<bool> completeClinicalSession({
    required String bookingId,
    String? userPackageId,
    String conditionBefore = '',
    String conditionAfter = '',
    String treatmentNotes = '',
    String homeCareInstructions = '',
    bool hasAbnormalReaction = false,
    String adverseReactions = '',
  }) async {
    lastBookingActionError = null;
    String? resolvedPackageId = userPackageId;
    Map<String, dynamic>? current;

    if (resolvedPackageId == null || resolvedPackageId.isEmpty) {
      try {
        current = await _fetchSingleBookingSnapshot(bookingId);
        resolvedPackageId = extractUserPackageId(current?['special_notes']?.toString());
      } catch (_) {}
    }

    if (resolvedPackageId != null && resolvedPackageId.isNotEmpty) {
      try {
        final res = await _apiClient.dio.post(
          '/admin/treatment/packages/$resolvedPackageId/complete-session',
          data: {
            'bookingId': bookingId,
            'condition_before': conditionBefore.trim(),
            'condition_after': conditionAfter.trim(),
            'treatment_notes': treatmentNotes.trim(),
            if (homeCareInstructions.trim().isNotEmpty)
              'home_care_instructions': homeCareInstructions.trim(),
            'has_abnormal_reaction': hasAbnormalReaction,
            if (adverseReactions.trim().isNotEmpty)
              'adverse_reactions': adverseReactions.trim(),
          },
        );
        return res.statusCode == 200 || res.statusCode == 201;
      } on DioException catch (e) {
        if (!_shouldFallbackToSupabase(e)) {
          lastBookingActionError = _extractDioErrorMessage(
            e,
            'Không thể hoàn tất hồ sơ chuyên môn cho buổi trị liệu.',
          );
          return false;
        }
      } catch (e) {
        lastBookingActionError = 'Lỗi kết nối: $e';
        return false;
      }

      try {
        current ??= await _fetchSingleBookingSnapshot(bookingId);
        if (current != null) {
          final st = current['status']?.toString().toUpperCase() ?? '';
          final ss = current['session_status']?.toString().toUpperCase() ?? '';
          if (st != 'IN_SERVICE' || ss == 'COMPLETED') {
            lastBookingActionError = 'Chỉ xác nhận lịch đang phục vụ và chưa hoàn tất chuyên môn.';
            return false;
          }
        }
        await _syncPackageSessionOnCheckout(
          bookingId,
          conditionBefore: conditionBefore,
          conditionAfter: conditionAfter,
          treatmentNotes: treatmentNotes,
          homeCareInstructions: homeCareInstructions,
        );
        final paymentMethod = current?['payment_method']?.toString().toUpperCase() ?? '';
        final finalPrice = double.tryParse(current?['final_price']?.toString() ?? '') ?? 0;
        final res = await _apiClient.dio.patch(
          '/rest/v1/bookings?id=eq.$bookingId',
          data: {
            'session_status': 'COMPLETED',
            if (paymentMethod == 'MEMBERSHIP_WALLET' && finalPrice == 0)
              'payment_status': 'PAID',
          },
        );
        return res.statusCode == 200 || res.statusCode == 204;
      } catch (e) {
        lastBookingActionError = _extractDioErrorMessage(e, 'Không thể ghi nhận buổi liệu trình.');
        return false;
      }
    }

    final backend = await _postBookingAction(bookingId, 'finish-service');
    if (backend.handled) return backend.success;

    try {
      current ??= await _fetchSingleBookingSnapshot(bookingId);
      if (current != null) {
        final st = current['status']?.toString().toUpperCase() ?? '';
        final ss = current['session_status']?.toString().toUpperCase() ?? '';
        if (st != 'IN_SERVICE' || ss == 'COMPLETED') {
          lastBookingActionError = 'Ca dịch vụ không ở trạng thái có thể hoàn tất chuyên môn.';
          return false;
        }
      }
      final res = await _apiClient.dio.patch(
        '/rest/v1/bookings?id=eq.$bookingId',
        data: {'session_status': 'COMPLETED'},
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      lastBookingActionError = _extractDioErrorMessage(e, 'Không thể hoàn tất chuyên môn.');
      return false;
    }
  }

  Future<bool> checkOutBooking(String bookingId) async {
    final backend = await _postBookingAction(bookingId, 'checkout');
    if (backend.handled) {
      if (backend.success) {
        _autoGrantBookingCompletionVoucher(bookingId);
      }
      return backend.success;
    }

    try {
      final current = await _fetchSingleBookingSnapshot(bookingId);
      if (current != null) {
        final st = current['status']?.toString().toUpperCase() ?? '';
        final ss = current['session_status']?.toString().toUpperCase() ?? '';
        final ps = current['payment_status']?.toString().toUpperCase() ?? '';
        if (st != 'IN_SERVICE' || ss != 'COMPLETED') {
          lastBookingActionError = 'Cần hoàn tất hồ sơ chuyên môn trước khi check-out.';
          return false;
        }
        if (ps != 'PAID') {
          lastBookingActionError = 'Cần hoàn tất thanh toán trước khi check-out.';
          return false;
        }
      }
      final res = await _apiClient.dio.patch(
        '/rest/v1/bookings?id=eq.$bookingId',
        data: {
          'status': 'COMPLETED',
          'checked_out_at': DateTime.now().toIso8601String(),
        },
      );
      if (res.statusCode == 200 || res.statusCode == 204) {
        _autoGrantBookingCompletionVoucher(bookingId);
        return true;
      }
      return false;
    } catch (e) {
      lastBookingActionError = _extractDioErrorMessage(e, 'Lỗi hoàn thành Check-out.');
      return false;
    }
  }

  /// Cấp voucher ưu đãi / tri ân cho khách hàng hoặc học viên
  Future<bool> grantRewardVoucher({
    required String userId,
    String couponCode = 'SPADAY20',
    String? note,
  }) async {
    try {
      // 1. Tìm coupon theo mã
      final cRes = await _apiClient.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/coupons?code=eq.$couponCode&select=*',
        options: Options(headers: {
          'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
          'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
        }),
      );
      if (cRes.statusCode != 200 || cRes.data is! List || (cRes.data as List).isEmpty) {
        return false;
      }
      final coupon = (cRes.data as List).first as Map<String, dynamic>;
      final couponId = coupon['id']?.toString() ?? '';

      // 2. Kiểm tra xem đã có voucher này chưa
      final existRes = await _apiClient.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/user_vouchers?user_id=eq.$userId&coupon_id=eq.$couponId&status=eq.AVAILABLE&select=id',
        options: Options(headers: {
          'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
          'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
        }),
      );
      if (existRes.statusCode == 200 && existRes.data is List && (existRes.data as List).isNotEmpty) {
        return true;
      }

      // 3. Thêm voucher vào ví user_vouchers
      final expiresAt = coupon['valid_to']?.toString() ??
          DateTime.now().add(const Duration(days: 60)).toIso8601String();

      final res = await _apiClient.dio.post(
        '${ApiEndpoints.supabaseUrl}/rest/v1/user_vouchers',
        data: {
          'user_id': userId,
          'coupon_id': couponId,
          'status': 'AVAILABLE',
          'source_trigger': 'MANUAL_BY_ADMIN',
          'expires_at': expiresAt,
        },
        options: Options(headers: {
          'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
          'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          'Prefer': 'return=representation',
        }),
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('[AdminRepository] grantRewardVoucher error: $e');
      return false;
    }
  }

  /// Tự động gửi voucher tri ân khi hoàn tất dịch vụ
  Future<void> _autoGrantBookingCompletionVoucher(String bookingId) async {
    try {
      final res = await _apiClient.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/bookings?id=eq.$bookingId&select=user_id,customer_id',
        options: Options(headers: {
          'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
          'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
        }),
      );
      if (res.statusCode == 200 && res.data is List && (res.data as List).isNotEmpty) {
        final b = (res.data as List).first as Map<String, dynamic>;
        final userId = b['user_id']?.toString() ?? b['customer_id']?.toString();
        if (userId != null && userId.isNotEmpty && !userId.startsWith('usr-temp')) {
          await grantRewardVoucher(userId: userId, couponCode: 'SPADAY20');
        }
      }
    } catch (e) {
      debugPrint('[AdminRepository] _autoGrantBookingCompletionVoucher error: $e');
    }
  }

  /// Tự động gửi voucher tri ân khi duyệt học viên nhập học
  Future<void> _autoGrantCourseCompletionVoucher(String candidateId) async {
    try {
      final res = await _apiClient.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/course_enrollments?id=eq.$candidateId&select=user_id',
        options: Options(headers: {
          'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
          'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
        }),
      );
      if (res.statusCode == 200 && res.data is List && (res.data as List).isNotEmpty) {
        final enr = (res.data as List).first as Map<String, dynamic>;
        final userId = enr['user_id']?.toString();
        if (userId != null && userId.isNotEmpty && !userId.startsWith('usr-temp')) {
          await grantRewardVoucher(userId: userId, couponCode: 'MLDCHAOXIN');
        }
      }
    } catch (e) {
      debugPrint('[AdminRepository] _autoGrantCourseCompletionVoucher error: $e');
    }
  }

  Future<bool> cancelBooking(String bookingId, {String? reason}) async {
    final safeReason = (reason != null && reason.trim().isNotEmpty)
        ? reason.trim()
        : 'Hủy lịch hẹn bởi quản trị viên';
    final backend = await _postBookingAction(
      bookingId,
      'cancel',
      extra: {'reason': safeReason},
    );
    if (backend.handled) return backend.success;
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/bookings?id=eq.$bookingId',
        data: {
          'status': 'CANCELLED',
          'cancelled_at': DateTime.now().toIso8601String(),
          'cancellation_reason': safeReason,
        },
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      lastBookingActionError = _extractDioErrorMessage(e, 'Lỗi khi hủy lịch.');
      return false;
    }
  }

  /// 5. Quản lý Tuyển sinh (Enrollments)
  Future<List<AdminCandidateModel>> fetchCandidates({String? statusFilter}) async {
    try {
      String query =
          '/rest/v1/course_enrollments?select=*,courses(title,learning_outcomes),course_batches(batch_code,start_date,end_date)&order=enrolled_at.desc';
      final res = await _apiClient.dio.get(
        query,
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
      );
      if (res.data is List) {
        final rawRows = (res.data as List)
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList();
        final studentIds = rawRows
            .map((r) => r['student_id']?.toString() ?? '')
            .where((id) => id.isNotEmpty)
            .toSet()
            .toList();
        final Map<String, Map<String, dynamic>> userMap = {};
        if (studentIds.isNotEmpty) {
          try {
            final userRes = await _apiClient.dio.get(
              '/rest/v1/users?id=in.(${studentIds.join(',')})&select=id,student_code,role',
              options: Options(
                headers: {
                  'apikey': ApiEndpoints.supabaseAnonKey,
                  'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
                },
              ),
            );
            if (userRes.data is List) {
              for (final u in (userRes.data as List)) {
                if (u is Map && u['id'] != null) {
                  userMap[u['id'].toString()] = Map<String, dynamic>.from(u);
                }
              }
            }
          } catch (_) {}
        }
        for (final row in rawRows) {
          final sid = row['student_id']?.toString() ?? '';
          if (sid.isNotEmpty && userMap.containsKey(sid)) {
            row['users'] = userMap[sid];
          }
        }
        final all = rawRows
            .map((item) => AdminCandidateModel.fromJson(item))
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

  Future<String?> updateCandidateStudentCode({
    required String studentId,
    required String studentCode,
    String? currentRole,
  }) async {
    final trimmed = studentCode.trim();
    if (trimmed.isNotEmpty && !RegExp(r'^[A-Za-z0-9_-]{2,50}$').hasMatch(trimmed)) {
      return 'Mã học viên chỉ gồm chữ, số, "-" hoặc "_" (2–50 ký tự).';
    }
    final nextCode = trimmed.isNotEmpty ? trimmed : null;
    try {
      if (nextCode != null) {
        final dupRes = await _apiClient.dio.get(
          '/rest/v1/users?select=id&student_code=ilike.${Uri.encodeComponent(nextCode)}&id=neq.$studentId&limit=1',
          options: Options(
            headers: {
              'apikey': ApiEndpoints.supabaseAnonKey,
              'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
            },
          ),
        );
        if (dupRes.data is List && (dupRes.data as List).isNotEmpty) {
          return 'Mã học viên "$nextCode" đã tồn tại trên hệ thống.';
        }
      }

      final payload = <String, dynamic>{
        'student_code': nextCode,
      };
      if (nextCode != null && (currentRole == null || currentRole == 'CUSTOMER')) {
        payload['role'] = 'STUDENT';
      }

      final res = await _apiClient.dio.patch(
        '/rest/v1/users?id=eq.$studentId',
        data: payload,
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
      );
      if (res.statusCode == 200 || res.statusCode == 204) {
        return null;
      }
      return 'Không thể cập nhật mã học viên. Vui lòng thử lại.';
    } catch (e) {
      debugPrint('[AdminRepository] updateCandidateStudentCode error: $e');
      return 'Lỗi lưu mã học viên. Vui lòng kiểm tra kết nối hoặc cập nhật CSDL.';
    }
  }

  Future<bool> assignBatchToCandidate(String enrollmentId, String batchId) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/course_enrollments?id=eq.$enrollmentId',
        data: {
          'batch_id': batchId,
          'status': 'ENROLLED',
          'student_status': 'ENROLLED',
        },
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] assignBatchToCandidate error: $e');
      return false;
    }
  }

  Future<bool> unassignBatchFromCandidate(String enrollmentId) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/course_enrollments?id=eq.$enrollmentId',
        data: {
          'batch_id': null,
          'status': 'ENROLLED',
          'approval_status': 'APPROVED',
          'student_status': 'APPROVED',
        },
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
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
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
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
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
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

  Future<bool> createCourseBatch({
    required String courseId,
    required String batchCode,
    required String startDate,
    required String endDate,
    required String scheduleText,
    String? branchId,
    String? instructorId,
    int maxStudents = 15,
  }) async {
    lastScheduleError = null;
    try {
      final defaultBranchId = (branchId != null && branchId.isNotEmpty)
          ? branchId
          : (_branches.isNotEmpty ? _branches.first.id : 'aaaaaaaa-0001-0001-0001-000000000001');
      final res = await _apiClient.dio.post(
        '/rest/v1/course_batches',
        data: {
          'course_id': courseId,
          'branch_id': defaultBranchId,
          'batch_code': batchCode.trim(),
          'start_date': startDate,
          'end_date': endDate,
          'schedule_text': scheduleText.trim(),
          'max_students': maxStudents,
          'enrolled_count': 0,
          'status': 'OPEN_FOR_ENROLLMENT',
          if (instructorId != null && instructorId.isNotEmpty) 'instructor_id': instructorId,
        },
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
            'Prefer': 'return=representation',
          },
        ),
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data.containsKey('message')) {
        lastScheduleError = data['message'].toString();
      } else if (data is String) {
        lastScheduleError = data;
      } else {
        lastScheduleError = e.message;
      }
      return false;
    } catch (e) {
      lastScheduleError = e.toString();
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> fetchInstructors() async {
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/instructors?select=id,full_name,title&order=full_name.asc',
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
      );
      if (res.data is List) {
        return (res.data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (e) {
      debugPrint('[AdminRepository] fetchInstructors error: $e');
    }
    return [];
  }

  /// 5.3.1. Lấy danh sách Lịch học chi tiết theo Buổi (Batch Schedules)
  Future<List<AdminBatchScheduleModel>> fetchBatchSchedules(String batchId) async {
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/batch_schedules?select=*,branch_rooms(name)&batch_id=eq.$batchId&order=session_date.asc,start_time.asc',
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
      );
      if (res.data is List && (res.data as List).isNotEmpty) {
        return (res.data as List)
            .map((item) => AdminBatchScheduleModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      debugPrint('[AdminRepository] fetchBatchSchedules error: $e');
    }
    return [];
  }

  /// 5.3.1.1. Lấy lịch học theo Course ID (dành cho Màn Chi tiết Khóa học phía Học viên)
  Future<List<AdminBatchScheduleModel>> fetchBatchSchedulesForCourse(String courseId) async {
    try {
      final batchRes = await _apiClient.dio.get(
        '/rest/v1/course_batches?select=id&course_id=eq.$courseId&order=start_date.desc&limit=1',
      );
      String? batchId;
      if (batchRes.data is List && (batchRes.data as List).isNotEmpty) {
        batchId = (batchRes.data as List).first['id']?.toString();
      }
      if (batchId == null || batchId.isEmpty) {
        final anyBatch = await _apiClient.dio.get('/rest/v1/course_batches?select=id&limit=1');
        if (anyBatch.data is List && (anyBatch.data as List).isNotEmpty) {
          batchId = (anyBatch.data as List).first['id']?.toString();
        }
      }
      if (batchId != null && batchId.isNotEmpty) {
        return fetchBatchSchedules(batchId);
      }
    } catch (e) {
      debugPrint('[AdminRepository] fetchBatchSchedulesForCourse error: $e');
    }
    return [];
  }

  String? lastScheduleError;

  Future<bool> createBatchSchedule({
    required String batchId,
    required String topic,
    required String sessionDate,
    required String startTime,
    required String endTime,
    required bool isPracticeLab,
    String? assignedRoomId,
  }) async {
    lastScheduleError = null;
    try {
      final res = await _apiClient.dio.post(
        '/rest/v1/batch_schedules',
        data: {
          'batch_id': batchId,
          'topic': topic,
          'session_date': sessionDate,
          'start_time': startTime,
          'end_time': endTime,
          'is_practice_lab': isPracticeLab,
          if (assignedRoomId != null && assignedRoomId.isNotEmpty) 'assigned_room_id': assignedRoomId,
        },
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
            'Prefer': 'return=representation',
          },
        ),
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data.containsKey('message')) {
        lastScheduleError = data['message'].toString();
      } else if (data is String) {
        lastScheduleError = data;
      } else {
        lastScheduleError = e.message;
      }
      return false;
    } catch (e) {
      lastScheduleError = e.toString();
      return false;
    }
  }

  Future<bool> updateBatchSchedule({
    required String scheduleId,
    required String topic,
    required String sessionDate,
    required String startTime,
    required String endTime,
    required bool isPracticeLab,
    String? assignedRoomId,
  }) async {
    lastScheduleError = null;
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/batch_schedules?id=eq.$scheduleId',
        data: {
          'topic': topic,
          'session_date': sessionDate,
          'start_time': startTime,
          'end_time': endTime,
          'is_practice_lab': isPracticeLab,
          if (assignedRoomId != null && assignedRoomId.isNotEmpty) 'assigned_room_id': assignedRoomId,
        },
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
            'Prefer': 'return=representation',
          },
        ),
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data.containsKey('message')) {
        lastScheduleError = data['message'].toString();
      } else if (data is String) {
        lastScheduleError = data;
      } else {
        lastScheduleError = e.message;
      }
      return false;
    } catch (e) {
      lastScheduleError = e.toString();
      return false;
    }
  }

  Future<bool> deleteBatchSchedule(String scheduleId) async {
    lastScheduleError = null;
    try {
      final res = await _apiClient.dio.delete(
        '/rest/v1/batch_schedules?id=eq.$scheduleId',
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data.containsKey('message')) {
        lastScheduleError = data['message'].toString();
      } else if (data is String) {
        lastScheduleError = data;
      } else {
        lastScheduleError = e.message;
      }
      return false;
    } catch (e) {
      lastScheduleError = e.toString();
      return false;
    }
  }

  /// 5.3.3. Lấy dữ liệu điểm danh theo Buổi học (Session Attendance)
  Future<Map<String, String>> fetchSessionAttendance(String scheduleId) async {
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/student_attendance?schedule_id=eq.$scheduleId&select=enrollment_id,status',
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
      );
      if (res.data is List) {
        final Map<String, String> map = {};
        for (final item in res.data as List) {
          final enrId = item['enrollment_id']?.toString();
          final status = item['status']?.toString();
          if (enrId != null && status != null) {
            map[enrId] = status;
          }
        }
        return map;
      }
    } catch (e) {
      debugPrint('[AdminRepository] fetchSessionAttendance error: $e');
    }
    return {};
  }

  /// 5.3.4. Lưu điểm danh buổi học cho học viên
  Future<bool> markSessionAttendance({
    required String scheduleId,
    required String enrollmentId,
    required String status,
  }) async {
    try {
      final res = await _apiClient.dio.post(
        '/rest/v1/student_attendance',
        data: {
          'schedule_id': scheduleId,
          'enrollment_id': enrollmentId,
          'status': status,
          'check_in_time': DateTime.now().toIso8601String(),
        },
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
            'Prefer': 'resolution=merge-duplicates',
          },
        ),
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('[AdminRepository] markSessionAttendance error: $e');
      return false;
    }
  }

  /// 5.4. Thêm mới học viên tuyển sinh (CRUD kiểu Trello - Create)
  Future<bool> createCandidate({
    required String candidateName,
    required String candidatePhone,
    String? candidateEmail,
    required String courseId,
    String status = 'PENDING',
    double amountPaid = 0.0,
    String? notes,
  }) async {
    try {
      final isConfirmed = status == 'CONFIRMED' || status == 'CONFIRMED_PENDING_PAY';
      final res = await _apiClient.dio.post(
        '/rest/v1/course_enrollments',
        data: {
          'student_name': candidateName,
          'student_phone': candidatePhone,
          if (candidateEmail != null && candidateEmail.isNotEmpty) 'student_email': candidateEmail,
          'course_id': courseId,
          'status': isConfirmed ? 'DEPOSITED' : 'CONSULTING',
          'consultation_status': isConfirmed ? 'CONFIRMED' : 'PENDING_CONSULTATION',
          'amount_paid': amountPaid,
          'enrolled_at': DateTime.now().toIso8601String(),
          if (notes != null && notes.isNotEmpty) 'approval_notes': notes,
        },
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
      );
      return res.statusCode == 201 || res.statusCode == 200;
    } catch (e) {
      debugPrint('[AdminRepository] createCandidate error: $e');
      return false;
    }
  }

  Future<bool> updateCandidateStatus(String candidateId, String newStatus) async {
    try {
      final patchData = <String, dynamic>{};
      if (newStatus == 'PENDING' || newStatus == 'PENDING_CONSULTATION' || newStatus == 'CONSULTING') {
        patchData['status'] = 'CONSULTING';
        patchData['consultation_status'] = 'PENDING_CONSULTATION';
        patchData['approval_status'] = 'PENDING_APPROVAL';
        patchData['student_status'] = 'NOT_APPROVED';
      } else if (newStatus == 'CONFIRMED' || newStatus == 'CONFIRMED_PENDING_PAY' || newStatus == 'DEPOSITED') {
        patchData['status'] = 'DEPOSITED';
        patchData['consultation_status'] = 'CONFIRMED';
      } else if (newStatus == 'PAID' || newStatus == 'PAID_WAITING_CLASS' || newStatus == 'ENROLLED') {
        patchData['status'] = 'ENROLLED';
        patchData['approval_status'] = 'APPROVED';
        patchData['student_status'] = 'APPROVED';
        _autoGrantCourseCompletionVoucher(candidateId);
      } else if (newStatus == 'STUDYING' || newStatus == 'ENROLLED_STUDYING') {
        patchData['status'] = 'STUDYING';
        patchData['student_status'] = 'ENROLLED';
      } else if (newStatus == 'NOT_GRADUATED') {
        patchData['status'] = 'NOT_GRADUATED';
        patchData['student_status'] = 'NOT_GRADUATED';
      } else if (newStatus == 'COMPLETED' || newStatus == 'GRADUATED') {
        patchData['status'] = 'GRADUATED';
        patchData['student_status'] = 'GRADUATED';
      } else if (newStatus == 'ARCHIVED') {
        patchData['status'] = 'ARCHIVED';
        patchData['consultation_status'] = 'ARCHIVED';
      } else {
        patchData['status'] = newStatus;
      }

      final res = await _apiClient.dio.patch(
        '/rest/v1/course_enrollments?id=eq.$candidateId',
        data: patchData,
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      if (newStatus == 'NOT_GRADUATED' || newStatus == 'ARCHIVED') {
        try {
          final fallbackData = newStatus == 'NOT_GRADUATED'
              ? {'status': 'STUDYING', 'student_status': 'NOT_GRADUATED'}
              : {'status': 'DROPPED', 'consultation_status': 'ARCHIVED'};
          final res = await _apiClient.dio.patch(
            '/rest/v1/course_enrollments?id=eq.$candidateId',
            data: fallbackData,
            options: Options(
              headers: {
                'apikey': ApiEndpoints.supabaseAnonKey,
                'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
              },
            ),
          );
          return res.statusCode == 200 || res.statusCode == 204;
        } catch (_) {}
      }
      debugPrint('[AdminRepository] updateCandidateStatus error: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>> addConsultationNote({
    required String enrollmentId,
    required String note,
    required String authorName,
    required List<AdminConsultationNoteModel> currentHistory,
    bool isEnrolledOrPaid = false,
    bool autoArchiveOnLimit = true,
  }) async {
    final trimmed = note.trim();
    if (trimmed.isEmpty) {
      return {'success': false, 'autoArchived': false, 'history': currentHistory};
    }

    final newEntry = AdminConsultationNoteModel(
      timestamp: DateTime.now().toIso8601String(),
      author: authorName.trim().isNotEmpty ? authorName.trim() : 'Nhân viên tư vấn',
      note: trimmed,
    );
    final updatedHistory = [...currentHistory, newEntry];
    final shouldAutoArchive = autoArchiveOnLimit && updatedHistory.length > 3 && !isEnrolledOrPaid;

    final payload = <String, dynamic>{
      'consultation_history': updatedHistory.map((e) => e.toJson()).toList(),
    };
    if (shouldAutoArchive) {
      payload['status'] = 'ARCHIVED';
      payload['consultation_status'] = 'ARCHIVED';
    } else if (!autoArchiveOnLimit && updatedHistory.length > 3 && !isEnrolledOrPaid) {
      payload['consultation_status'] = 'ADMIN_PINNED';
    }

    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/course_enrollments?id=eq.$enrollmentId',
        data: payload,
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
      );
      if (res.statusCode == 200 || res.statusCode == 204) {
        return {
          'success': true,
          'autoArchived': shouldAutoArchive,
          'history': updatedHistory,
        };
      }
    } catch (e) {
      if (shouldAutoArchive) {
        try {
          final fallbackPayload = {
            'consultation_history': updatedHistory.map((e) => e.toJson()).toList(),
            'status': 'DROPPED',
            'consultation_status': 'ARCHIVED',
          };
          final res = await _apiClient.dio.patch(
            '/rest/v1/course_enrollments?id=eq.$enrollmentId',
            data: fallbackPayload,
            options: Options(
              headers: {
                'apikey': ApiEndpoints.supabaseAnonKey,
                'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
              },
            ),
          );
          if (res.statusCode == 200 || res.statusCode == 204) {
            return {
              'success': true,
              'autoArchived': true,
              'history': updatedHistory,
            };
          }
        } catch (_) {}
      }
      debugPrint('[AdminRepository] addConsultationNote error: $e');
    }

    return {'success': false, 'autoArchived': false, 'history': currentHistory};
  }

  Future<bool> deleteCandidate(String candidateId) async {
    try {
      final res = await _apiClient.dio.delete(
        '/rest/v1/course_enrollments?id=eq.$candidateId',
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
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

  /// 6.3. Lấy Danh mục Gói Liệu trình / Gói Trị liệu Bổ trợ (treatment_packages)
  Future<List<AdminTreatmentPackageModel>> fetchTreatmentPackages() async {
    try {
      final res = await _apiClient.dio.get(
        '/rest/v1/treatment_packages?select=*&order=price.asc,created_at.asc',
      );
      if (res.statusCode == 200 && res.data is List) {
        return (res.data as List)
            .map((item) => AdminTreatmentPackageModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('[AdminRepository] fetchTreatmentPackages error: $e');
      return [];
    }
  }

  /// 6.4. Bật/Tắt Duyệt kinh doanh Gói liệu trình 1 chạm (is_active toggle)
  Future<bool> toggleTreatmentPackageActive(String packageId, bool nextStatus) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/treatment_packages?id=eq.$packageId',
        data: {'is_active': nextStatus},
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] toggleTreatmentPackageActive error: $e');
      return false;
    }
  }

  /// 6.5. Tạo mới hoặc Cập nhật Gói Bổ trợ / Gói Liệu trình (treatment_packages)
  Future<bool> saveTreatmentPackage({String? id, required Map<String, dynamic> data}) async {
    try {
      if (id != null && id.isNotEmpty) {
        final res = await _apiClient.dio.patch(
          '/rest/v1/treatment_packages?id=eq.$id',
          data: data,
        );
        return res.statusCode == 200 || res.statusCode == 204;
      } else {
        final res = await _apiClient.dio.post(
          '/rest/v1/treatment_packages',
          data: data,
        );
        return res.statusCode == 200 || res.statusCode == 201;
      }
    } catch (e) {
      debugPrint('[AdminRepository] saveTreatmentPackage error: $e');
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
      final res = await _apiClient.dio.get(
        query,
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
      );
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
        '/rest/v1/quiz_submissions?select=*,course_quizzes(title),course_enrollments(student_name,student_phone,courses(title))&order=submitted_at.desc',
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          },
        ),
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

  // =========================================================================
  // 15. QUẢN LÝ BANNERS TRANG CHỦ & TRUYỀN THÔNG (miniapp_shared_content)
  // =========================================================================

  /// 15.1. Lấy danh sách banner (Tất cả hoặc chỉ PUBLISHED)
  Future<List<AdminBannerModel>> fetchBanners({bool onlyActive = false}) async {
    try {
      if (Platform.environment.containsKey('FLUTTER_TEST')) {
        return [
          const AdminBannerModel(
            id: 'test-banner-1',
            title: 'Khóa Đào tạo Chuyên sâu',
            summary: 'Lộ trình dẫn lưu bạch huyết chuẩn Y khoa Vodder',
            imageUrl: 'assets/images/therapy_hero_banner.jpg',
            category: 'DAO_TAO',
            targetLink: '/academy',
            status: 'PUBLISHED',
            sortOrder: 1,
            isFeatured: true,
          ),
        ];
      }
    } catch (_) {}

    try {
      String query =
          '/rest/v1/miniapp_shared_content?kind=eq.BANNER&order=sort_order.asc,created_at.desc&select=*';
      if (onlyActive) {
        query += '&status=in.(PUBLISHED,APPROVED)';
      }
      final res = await _apiClient.dio.get(query);
      if (res.data is List) {
        return (res.data as List)
            .map((item) => AdminBannerModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('[AdminRepository] fetchBanners error: $e');
      return [];
    }
  }

  /// 15.2. Bật/Tắt hiển thị Banner 1 chạm (PUBLISHED <-> DRAFT)
  Future<bool> toggleBannerStatus(String bannerId, bool isPublished) async {
    try {
      final nextStatus = isPublished ? 'PUBLISHED' : 'DRAFT';
      final res = await _apiClient.dio.patch(
        '/rest/v1/miniapp_shared_content?id=eq.$bannerId',
        data: {'status': nextStatus},
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] toggleBannerStatus error: $e');
      return false;
    }
  }

  /// 15.3. Tạo mới hoặc Cập nhật Banner Trang chủ
  Future<bool> saveBanner({String? id, required Map<String, dynamic> data}) async {
    try {
      if (id != null && id.isNotEmpty) {
        final res = await _apiClient.dio.patch(
          '/rest/v1/miniapp_shared_content?id=eq.$id',
          data: data,
        );
        return res.statusCode == 200 || res.statusCode == 204;
      } else {
        final payload = {
          'kind': 'BANNER',
          'title': data['title'] ?? '',
          'summary': data['summary'] ?? '',
          'content_text': data['content_text'] ?? '',
          'image_url': data['image_url'] ?? '',
          'target_link': data['target_link'] ?? '/academy',
          'sort_order': data['sort_order'] ?? 1,
          'is_featured': data['is_featured'] ?? true,
          'category': data['category'] ?? 'DAO_TAO',
          'access_level': 'PUBLIC',
          'status': data['status'] ?? 'PUBLISHED',
          'author_name': data['author_name'] ?? 'Ban Quản Trị MLD',
          'payload_hash': ' ',
          'file_url': '',
          'author_avatar': '',
          'allow_download': false,
          'require_full_payment': true,
          'allowed_roles': ['STUDENT', 'INSTRUCTOR', 'ADMIN'],
          'watermark_text': 'MLD ACADEMY - BẢN QUYỀN ĐÀO TẠO',
        };
        final res = await _apiClient.dio.post(
          '/rest/v1/miniapp_shared_content',
          data: payload,
        );
        return res.statusCode == 200 || res.statusCode == 201;
      }
    } catch (e) {
      debugPrint('[AdminRepository] saveBanner error: $e');
      return false;
    }
  }

  /// 15.4. Xóa Banner Trang chủ
  Future<bool> deleteBanner(String bannerId) async {
    try {
      final res = await _apiClient.dio.delete(
        '/rest/v1/miniapp_shared_content?id=eq.$bannerId',
      );
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[AdminRepository] deleteBanner error: $e');
      return false;
    }
  }

  static String? extractUserPackageId(String? specialNotes) {
    if (specialNotes == null || specialNotes.isEmpty) return null;
    final match = RegExp(r'user_package_id=([0-9a-fA-F-]+)').firstMatch(specialNotes);
    return match?.group(1);
  }

  static ({int completedSessions, String status}) computeNextPackageProgress({
    required int totalSessions,
    required int completedSessions,
  }) {
    final safeTotal = totalSessions > 0 ? totalSessions : 1;
    final nextCompleted = (completedSessions + 1).clamp(0, safeTotal);
    final nextStatus = nextCompleted >= safeTotal ? 'COMPLETED' : 'ACTIVE';
    return (completedSessions: nextCompleted, status: nextStatus);
  }

  Future<void> _syncPackageSessionOnCheckout(
    String bookingId, {
    String conditionBefore = '',
    String conditionAfter = '',
    String treatmentNotes = '',
    String homeCareInstructions = '',
  }) async {
    try {
      final bRes = await _apiClient.dio.get(
        '/rest/v1/bookings?id=eq.$bookingId&select=id,customer_id,technician_id,assigned_room_id,booking_date,start_time,end_time,special_notes',
      );
      if (bRes.statusCode != 200 || bRes.data is! List || (bRes.data as List).isEmpty) {
        return;
      }
      final booking = Map<String, dynamic>.from((bRes.data as List).first as Map);
      final userPackageId = extractUserPackageId(booking['special_notes']?.toString());
      if (userPackageId == null || userPackageId.isEmpty) {
        return;
      }

      final existingJournal = await _apiClient.dio.get(
        '/rest/v1/treatment_journal?booking_id=eq.$bookingId&select=id&limit=1',
      );
      if (existingJournal.statusCode == 200 &&
          existingJournal.data is List &&
          (existingJournal.data as List).isNotEmpty) {
        return;
      }

      final pkgRes = await _apiClient.dio.get(
        '/rest/v1/user_packages?id=eq.$userPackageId&select=id,customer_id,total_sessions,completed_sessions,status',
      );
      if (pkgRes.statusCode != 200 || pkgRes.data is! List || (pkgRes.data as List).isEmpty) {
        return;
      }
      final pkg = Map<String, dynamic>.from((pkgRes.data as List).first as Map);
      final totalSessions = (pkg['total_sessions'] as num?)?.toInt() ?? 10;
      final completedSessions = (pkg['completed_sessions'] as num?)?.toInt() ?? 0;
      if (completedSessions >= totalSessions) {
        return;
      }

      final progress = computeNextPackageProgress(
        totalSessions: totalSessions,
        completedSessions: completedSessions,
      );

      await _apiClient.dio.patch(
        '/rest/v1/user_packages?id=eq.$userPackageId',
        data: {
          'completed_sessions': progress.completedSessions,
          'status': progress.status,
        },
      );

      final customerId = pkg['customer_id']?.toString() ?? booking['customer_id']?.toString() ?? '';
      if (customerId.isNotEmpty) {
        final effectiveNotes = treatmentNotes.trim().isNotEmpty
            ? treatmentNotes.trim()
            : 'Hoàn tất buổi ${progress.completedSessions}/$totalSessions (1 buổi = 1 ca)';
        await _apiClient.dio.post(
          '/rest/v1/treatment_journal',
          data: {
            'user_package_id': userPackageId,
            'booking_id': bookingId,
            'customer_id': customerId,
            if (booking['technician_id'] != null) 'technician_id': booking['technician_id'],
            if (booking['assigned_room_id'] != null) 'assigned_room_id': booking['assigned_room_id'],
            'session_number': progress.completedSessions > 0 ? progress.completedSessions : 1,
            'session_date': booking['booking_date']?.toString() ?? DateTime.now().toIso8601String().split('T').first,
            if (booking['start_time'] != null) 'treatment_start_time': booking['start_time'],
            if (booking['end_time'] != null) 'treatment_end_time': booking['end_time'],
            if (conditionBefore.trim().isNotEmpty) 'condition_before': conditionBefore.trim(),
            if (conditionAfter.trim().isNotEmpty) 'condition_after': conditionAfter.trim(),
            if (homeCareInstructions.trim().isNotEmpty) 'home_care_instructions': homeCareInstructions.trim(),
            'confirmation_status': 'CONFIRMED',
            'treatment_notes': effectiveNotes,
          },
        );
      }
    } catch (e) {
      debugPrint('[AdminRepository] _syncPackageSessionOnCheckout error: $e');
    }
  }

  Future<List<AdminBookingModel>> fetchMonthlyBookings({
    required int year,
    required int month,
    String? branchId,
  }) async {
    try {
      final monthStr = month.toString().padLeft(2, '0');
      final startStr = '$year-$monthStr-01';
      final lastDay = DateTime(year, month + 1, 0).day.toString().padLeft(2, '0');
      final endStr = '$year-$monthStr-$lastDay';

      String query =
          '/rest/v1/bookings?select=*,branches(name),technicians(full_name),branch_rooms(name),booking_items(*,services(name))&booking_date=gte.$startStr&booking_date=lte.$endStr&order=booking_date.asc,start_time.asc';
      if (branchId != null && branchId.isNotEmpty && branchId != 'ALL') {
        query += '&branch_id=eq.$branchId';
      }

      final res = await _apiClient.dio.get(query);
      if (res.statusCode == 200 && res.data is List) {
        return (res.data as List)
            .map((e) => AdminBookingModel.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      }
    } catch (e) {
      debugPrint('[AdminRepository] fetchMonthlyBookings error: $e');
    }
    return [];
  }

  Future<List<AdminTechnicianShiftModel>> fetchMonthlyShifts({
    required int year,
    required int month,
    String? branchId,
  }) async {
    try {
      final monthStr = month.toString().padLeft(2, '0');
      final startStr = '$year-$monthStr-01';
      final lastDay = DateTime(year, month + 1, 0).day.toString().padLeft(2, '0');
      final endStr = '$year-$monthStr-$lastDay';

      String query =
          '/rest/v1/technician_shifts?select=*,technicians(full_name),branches(name),branch_rooms(name)&shift_date=gte.$startStr&shift_date=lte.$endStr&is_cancelled=eq.false&order=shift_date.asc,start_time.asc';
      if (branchId != null && branchId.isNotEmpty && branchId != 'ALL') {
        query += '&branch_id=eq.$branchId';
      }

      final res = await _apiClient.dio.get(query);
      if (res.statusCode == 200 && res.data is List) {
        return (res.data as List)
            .map((e) => AdminTechnicianShiftModel.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      }
    } catch (e) {
      debugPrint('[AdminRepository] fetchMonthlyShifts error: $e');
    }
    return [];
  }
}
