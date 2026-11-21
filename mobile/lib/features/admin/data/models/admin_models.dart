import 'dart:convert';
import 'package:intl/intl.dart';

class AdminKpiMetrics {
  final double todayRevenue;
  final double monthRevenue;
  final int todayStudentsCount;
  final int monthStudentsCount;
  final int todayBookingsCount;
  final int checkedInBookingsCount;
  final int waitingBatchStudentsCount;
  final int pendingActionsCount;
  final int pendingBookingsCount;
  final int pendingQuizzesCount;

  const AdminKpiMetrics({
    this.todayRevenue = 0.0,
    this.monthRevenue = 0.0,
    this.todayStudentsCount = 0,
    this.monthStudentsCount = 0,
    this.todayBookingsCount = 0,
    this.checkedInBookingsCount = 0,
    this.waitingBatchStudentsCount = 0,
    this.pendingActionsCount = 0,
    this.pendingBookingsCount = 0,
    this.pendingQuizzesCount = 0,
  });

  factory AdminKpiMetrics.empty() => const AdminKpiMetrics();
}

/// 2. Hàng việc cần xử lý khẩn cấp (Action Required Feed)
enum AdminActionType {
  pendingBooking, // Lịch hẹn mới chờ duyệt
  waitingBatch,   // Học viên đã đóng tiền chờ xếp lớp
  newQuizSubmission, // Học viên mới nộp bài thi
}

class AdminActionItem {
  final String id;
  final AdminActionType type;
  final String title;
  final String subtitle;
  final String timeAgo;
  final String? secondaryInfo;
  final String rawId; // ID đối tượng trong DB (bookingId, enrollmentId, submissionId)
  final Map<String, dynamic> rawData;

  const AdminActionItem({
    required this.id,
    required this.type,
    required this.title,
    required this.subtitle,
    required this.timeAgo,
    this.secondaryInfo,
    required this.rawId,
    this.rawData = const {},
  });
}

/// 3. Chi nhánh (Branch)
class AdminBranchModel {
  final String id;
  final String name;
  final String address;
  final String phone;
  final String district;

  const AdminBranchModel({
    required this.id,
    required this.name,
    required this.address,
    required this.phone,
    required this.district,
  });

  factory AdminBranchModel.fromJson(Map<String, dynamic> json) {
    return AdminBranchModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'MLD Spa',
      address: json['address']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      district: json['district']?.toString() ?? '',
    );
  }
}

/// 4. Lịch hẹn Spa (Booking)
class AdminBookingModel {
  final String id;
  final String bookingCode;
  final String bookingDate; // YYYY-MM-DD
  final String startTime;   // HH:mm
  final String endTime;     // HH:mm
  final String customerName;
  final String customerPhone;
  final String serviceName;
  final double finalPrice;
  final String status; // PENDING, CONFIRMED, CHECKED_IN, IN_SERVICE, COMPLETED, CANCELLED
  final String paymentStatus; // UNPAID, PAID
  final String sessionStatus;
  final String paymentMethod;
  final String? branchId;
  final String? branchName;
  final String? technicianName;
  final String? roomName;
  final String? checkedInAt;
  final String? serviceStartedAt;
  final String? checkedOutAt;
  final String? notes;
  final String? cancellationReason;
  final String? packageName;
  final int? totalSessions;
  final int? completedSessions;
  final int? sessionNumber;

  const AdminBookingModel({
    required this.id,
    required this.bookingCode,
    required this.bookingDate,
    required this.startTime,
    required this.endTime,
    required this.customerName,
    required this.customerPhone,
    required this.serviceName,
    required this.finalPrice,
    required this.status,
    required this.paymentStatus,
    this.sessionStatus = 'NOT_STARTED',
    this.paymentMethod = 'CASH_AT_SPA',
    this.branchId,
    this.branchName,
    this.technicianName,
    this.roomName,
    this.checkedInAt,
    this.serviceStartedAt,
    this.checkedOutAt,
    this.notes,
    this.cancellationReason,
    this.packageName,
    this.totalSessions,
    this.completedSessions,
    this.sessionNumber,
  });

  factory AdminBookingModel.fromJson(Map<String, dynamic> json) {
    final branchObj = json['branches'] ?? json['branch'];
    final techObj = json['technicians'] ?? json['technician'];
    final roomObj = json['branch_rooms'] ?? json['branch_room'] ?? json['room'];
    final userObj = json['users'] ?? json['user'];

    String custName = json['booked_for_name']?.toString() ?? json['customer_name']?.toString() ?? '';
    if (custName.isEmpty && userObj is Map) {
      custName = userObj['full_name']?.toString() ?? '';
    }
    String custPhone = json['booked_for_phone']?.toString() ?? json['customer_phone']?.toString() ?? '';
    if (custPhone.isEmpty && userObj is Map) {
      custPhone = userObj['phone']?.toString() ?? '';
    }

    String sTime = json['start_time']?.toString() ?? '';
    if (sTime.length > 5) {
      sTime = sTime.substring(0, 5);
    }
    String eTime = json['end_time']?.toString() ?? '';
    if (eTime.length > 5) {
      eTime = eTime.substring(0, 5);
    }

    String sName = json['service_name']?.toString() ?? '';
    if (sName.isEmpty && json['booking_items'] is List && (json['booking_items'] as List).isNotEmpty) {
      final firstItem = (json['booking_items'] as List).first;
      if (firstItem is Map && firstItem['services'] is Map) {
        sName = firstItem['services']['name']?.toString() ?? '';
      }
    }

    return AdminBookingModel(
      id: json['id']?.toString() ?? '',
      bookingCode: json['booking_code']?.toString() ?? 'BK-000',
      bookingDate: json['booking_date']?.toString() ?? '',
      startTime: sTime,
      endTime: eTime,
      customerName: custName.isNotEmpty ? custName : 'Khách hàng',
      customerPhone: custPhone,
      serviceName: sName.isNotEmpty ? sName : 'Trị liệu MLD',
      finalPrice: (json['final_price'] != null)
          ? double.tryParse(json['final_price'].toString()) ?? 0.0
          : (json['base_total'] != null)
              ? double.tryParse(json['base_total'].toString()) ?? 0.0
              : 0.0,
      status: (json['status']?.toString() ?? 'PENDING').toUpperCase(),
      paymentStatus: (json['payment_status']?.toString() ?? 'UNPAID').toUpperCase(),
      sessionStatus: (json['session_status']?.toString() ?? 'NOT_STARTED').toUpperCase(),
      paymentMethod: (json['payment_method']?.toString() ?? 'CASH_AT_SPA').toUpperCase(),
      branchId: json['branch_id']?.toString(),
      branchName: branchObj is Map ? branchObj['name']?.toString() : null,
      technicianName: techObj is Map ? techObj['full_name']?.toString() : null,
      roomName: roomObj is Map ? roomObj['name']?.toString() : null,
      checkedInAt: json['checked_in_at']?.toString(),
      serviceStartedAt: json['service_started_at']?.toString(),
      checkedOutAt: json['checked_out_at']?.toString(),
      notes: json['notes']?.toString() ?? json['special_notes']?.toString(),
      cancellationReason: json['cancellation_reason']?.toString() ?? json['cancel_reason']?.toString(),
      packageName: json['package_name']?.toString(),
      totalSessions: (json['total_sessions'] as num?)?.toInt(),
      completedSessions: (json['completed_sessions'] as num?)?.toInt(),
      sessionNumber: (json['session_number'] as num?)?.toInt(),
    );
  }

  String? get userPackageId {
    final n = notes ?? '';
    if (n.isEmpty) return null;
    return RegExp(r'user_package_id=([0-9a-fA-F-]+)').firstMatch(n)?.group(1);
  }

  String? get catalogPackageId {
    final n = notes ?? '';
    if (n.isEmpty) return null;
    return RegExp(r'package_id=([0-9a-fA-F-]+)').firstMatch(n)?.group(1);
  }

  bool get isPackageSession {
    final n = notes ?? '';
    return userPackageId != null ||
        catalogPackageId != null ||
        n.contains('Gói liệu trình') ||
        paymentMethod == 'MEMBERSHIP_WALLET';
  }

  String get displayPackageName {
    if (packageName != null && packageName!.trim().isNotEmpty) {
      return packageName!.trim();
    }
    final n = notes ?? '';
    final m = RegExp(r'Gói liệu trình:\s*([^|\]]+)', caseSensitive: false).firstMatch(n);
    if (m != null && (m.group(1)?.trim().isNotEmpty ?? false)) {
      return m.group(1)!.trim();
    }
    return serviceName;
  }

  int? get parsedNoteSessionNumber {
    final n = notes ?? '';
    final m = RegExp(r'Buổi\s+(\d+)(?:\s*/\s*(\d+))?', caseSensitive: false).firstMatch(n);
    if (m != null) return int.tryParse(m.group(1) ?? '');
    return null;
  }

  int? get parsedNoteTotalSessions {
    final n = notes ?? '';
    final m = RegExp(r'Buổi\s+\d+\s*/\s*(\d+)', caseSensitive: false).firstMatch(n);
    if (m != null) return int.tryParse(m.group(1) ?? '');
    return null;
  }

  int? get effectiveTotalSessions => totalSessions ?? parsedNoteTotalSessions;

  int get effectiveSessionNumber {
    if (sessionNumber != null && sessionNumber! > 0) return sessionNumber!;
    if (completedSessions != null) {
      final total = effectiveTotalSessions ?? 999;
      if (isClinicalCompleted) {
        return completedSessions!.clamp(1, total);
      }
      return (completedSessions! + 1).clamp(1, total);
    }
    return parsedNoteSessionNumber ?? 1;
  }

  bool get isClinicalCompleted => sessionStatus == 'COMPLETED';

  bool get isPaid => paymentStatus == 'PAID';

  AdminBookingModel copyWith({
    String? status,
    String? paymentStatus,
    String? sessionStatus,
    String? paymentMethod,
    String? checkedInAt,
    String? serviceStartedAt,
    String? checkedOutAt,
    String? cancellationReason,
    String? packageName,
    int? totalSessions,
    int? completedSessions,
    int? sessionNumber,
  }) {
    return AdminBookingModel(
      id: id,
      bookingCode: bookingCode,
      bookingDate: bookingDate,
      startTime: startTime,
      endTime: endTime,
      customerName: customerName,
      customerPhone: customerPhone,
      serviceName: serviceName,
      finalPrice: finalPrice,
      status: status ?? this.status,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      sessionStatus: sessionStatus ?? this.sessionStatus,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      branchId: branchId,
      branchName: branchName,
      technicianName: technicianName,
      roomName: roomName,
      checkedInAt: checkedInAt ?? this.checkedInAt,
      serviceStartedAt: serviceStartedAt ?? this.serviceStartedAt,
      checkedOutAt: checkedOutAt ?? this.checkedOutAt,
      notes: notes,
      cancellationReason: cancellationReason ?? this.cancellationReason,
      packageName: packageName ?? this.packageName,
      totalSessions: totalSessions ?? this.totalSessions,
      completedSessions: completedSessions ?? this.completedSessions,
      sessionNumber: sessionNumber ?? this.sessionNumber,
    );
  }
}

class AdminConsultationNoteModel {
  final String timestamp;
  final String author;
  final String note;

  const AdminConsultationNoteModel({
    required this.timestamp,
    required this.author,
    required this.note,
  });

  factory AdminConsultationNoteModel.fromJson(Map<String, dynamic> json) {
    return AdminConsultationNoteModel(
      timestamp: json['timestamp']?.toString() ?? '',
      author: json['author']?.toString() ?? 'Nhân viên tư vấn',
      note: json['note']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'timestamp': timestamp,
        'author': author,
        'note': note,
      };
}

/// 5. Hồ sơ học viên tuyển sinh (Course Enrollment)
class AdminCandidateModel {
  final String id;
  final String studentId;
  final String? studentCode;
  final String? studentRole;
  final String orderCode;
  final String candidateName;
  final String candidatePhone;
  final String? candidateEmail;
  final String courseId;
  final String courseTitle;
  final String? batchId;
  final String? batchCode;
  final String? batchStartDate;
  final String? batchEndDate;
  final double tuitionTotal;
  final double amountPaid;
  final String status; // PENDING_CONSULTATION, CONFIRMED_PENDING_PAY, PAID_WAITING_CLASS, ENROLLED_STUDYING, NOT_GRADUATED, COMPLETED, ARCHIVED, DROPPED
  final String createdAt;
  final String? notes;
  final String targetAudience;
  final List<AdminConsultationNoteModel> consultationHistory;

  const AdminCandidateModel({
    required this.id,
    this.studentId = '',
    this.studentCode,
    this.studentRole,
    required this.orderCode,
    required this.candidateName,
    required this.candidatePhone,
    this.candidateEmail,
    required this.courseId,
    required this.courseTitle,
    this.batchId,
    this.batchCode,
    this.batchStartDate,
    this.batchEndDate,
    required this.tuitionTotal,
    required this.amountPaid,
    required this.status,
    required this.createdAt,
    this.notes,
    this.targetAudience = 'Người mới bắt đầu',
    this.consultationHistory = const [],
  });

  int get consultationCount => consultationHistory.length;

  String? get latestConsultationSummary =>
      consultationHistory.isNotEmpty ? consultationHistory.last.note : null;

  factory AdminCandidateModel.fromJson(Map<String, dynamic> json) {
    final batchObj = json['course_batches'];
    final courseObj = json['courses'];

    String title = json['course_title']?.toString() ?? '';
    if (title.isEmpty && courseObj is Map) {
      title = courseObj['title']?.toString() ?? '';
    }

    String audience = json['target_audience']?.toString().trim() ?? '';
    if (audience.isEmpty && courseObj is Map) {
      final outcomes = courseObj['learning_outcomes'];
      if (outcomes is Map) {
        audience = outcomes['target_audience']?.toString().trim() ??
            outcomes['targetAudience']?.toString().trim() ??
            '';
      }
      if (audience.isEmpty) {
        audience = courseObj['target_audience']?.toString().trim() ?? '';
      }
    }
    if (audience.isEmpty) {
      final sType = json['student_type']?.toString().toUpperCase() ?? '';
      if (sType == 'PRO') {
        audience = 'Người làm nghề / KTV Spa';
      } else if (sType == 'ADVANCED') {
        audience = 'Chuyên môn y khoa';
      } else {
        audience = 'Người mới bắt đầu';
      }
    }

    final List<AdminConsultationNoteModel> history = [];
    final rawHistory = json['consultation_history'] ?? json['consultationHistory'];
    if (rawHistory is List) {
      for (final item in rawHistory) {
        if (item is Map) {
          final parsed = AdminConsultationNoteModel.fromJson(Map<String, dynamic>.from(item));
          if (parsed.note.trim().isNotEmpty) {
            history.add(parsed);
          }
        }
      }
    }

    final bId = json['batch_id']?.toString();
    final paid = double.tryParse(json['amount_paid']?.toString() ?? '0') ?? 0.0;
    final total = double.tryParse(json['tuition_total']?.toString() ?? '0') ?? 0.0;
    final rawStatus = json['status']?.toString().toUpperCase() ?? 'CONSULTING';
    final consultationStatus = json['consultation_status']?.toString().toUpperCase() ?? '';
    final studentStatus = json['student_status']?.toString().toUpperCase() ?? '';
    final approvalStatus = json['approval_status']?.toString().toUpperCase() ?? '';

    String workflowStatus;
    if (rawStatus == 'ARCHIVED' ||
        consultationStatus == 'ARCHIVED' ||
        (history.length > 3 &&
            paid <= 0 &&
            (bId == null || bId.isEmpty) &&
            consultationStatus != 'ADMIN_PINNED')) {
      workflowStatus = 'ARCHIVED';
    } else if (rawStatus == 'NOT_GRADUATED' || studentStatus == 'NOT_GRADUATED') {
      workflowStatus = 'NOT_GRADUATED';
    } else if (rawStatus == 'GRADUATED' || rawStatus == 'COMPLETED') {
      workflowStatus = 'COMPLETED';
    } else if (bId != null && bId.isNotEmpty) {
      workflowStatus = 'ENROLLED_STUDYING';
    } else if (paid > 0 || approvalStatus == 'APPROVED' || rawStatus == 'PAID' || rawStatus == 'ENROLLED') {
      workflowStatus = 'PAID_WAITING_CLASS';
    } else if (consultationStatus == 'CONFIRMED' || rawStatus == 'CONFIRMED' || rawStatus == 'DEPOSITED') {
      workflowStatus = 'CONFIRMED_PENDING_PAY';
    } else {
      workflowStatus = 'PENDING_CONSULTATION';
    }

    final userObj = json['users'];
    String cName = json['student_name']?.toString() ?? json['candidate_name']?.toString() ?? '';
    if (cName.isEmpty && userObj is Map) {
      cName = userObj['full_name']?.toString() ?? '';
    }
    String cPhone = json['student_phone']?.toString() ?? json['candidate_phone']?.toString() ?? '';
    if (cPhone.isEmpty && userObj is Map) {
      cPhone = userObj['phone']?.toString() ?? '';
    }
    String? cEmail = json['student_email']?.toString() ?? json['candidate_email']?.toString();
    if ((cEmail == null || cEmail.isEmpty) && userObj is Map) {
      cEmail = userObj['email']?.toString();
    }

    final rawStudentCode = (userObj is Map ? userObj['student_code']?.toString() : null) ??
        json['student_code']?.toString() ??
        json['studentCode']?.toString();
    final rawStudentRole = (userObj is Map ? userObj['role']?.toString() : null) ??
        json['student_role']?.toString();

    return AdminCandidateModel(
      id: json['id']?.toString() ?? '',
      studentId: json['student_id']?.toString() ?? '',
      studentCode: (rawStudentCode != null && rawStudentCode.trim().isNotEmpty)
          ? rawStudentCode.trim()
          : null,
      studentRole: rawStudentRole,
      orderCode: json['order_code']?.toString() ?? 'ENR-000',
      candidateName: cName.isNotEmpty ? cName : 'Học viên',
      candidatePhone: cPhone,
      candidateEmail: cEmail,
      courseId: json['course_id']?.toString() ?? '',
      courseTitle: title.isNotEmpty ? title : 'Khóa đào tạo MLD',
      batchId: bId,
      batchCode: batchObj is Map ? batchObj['batch_code']?.toString() : null,
      batchStartDate: batchObj is Map ? batchObj['start_date']?.toString() : null,
      batchEndDate: batchObj is Map ? batchObj['end_date']?.toString() : null,
      tuitionTotal: total,
      amountPaid: paid,
      status: workflowStatus,
      createdAt: json['enrolled_at']?.toString() ?? json['created_at']?.toString() ?? '',
      notes: json['approval_notes']?.toString() ?? json['notes']?.toString(),
      targetAudience: audience,
      consultationHistory: history,
    );
  }

  AdminCandidateModel copyWith({
    String? status,
    String? batchId,
    String? batchCode,
    String? batchStartDate,
    String? batchEndDate,
    String? studentCode,
    String? studentRole,
    String? targetAudience,
    List<AdminConsultationNoteModel>? consultationHistory,
  }) {
    return AdminCandidateModel(
      id: id,
      studentId: studentId,
      studentCode: studentCode ?? this.studentCode,
      studentRole: studentRole ?? this.studentRole,
      orderCode: orderCode,
      candidateName: candidateName,
      candidatePhone: candidatePhone,
      candidateEmail: candidateEmail,
      courseId: courseId,
      courseTitle: courseTitle,
      batchId: batchId ?? this.batchId,
      batchCode: batchCode ?? this.batchCode,
      batchStartDate: batchStartDate ?? this.batchStartDate,
      batchEndDate: batchEndDate ?? this.batchEndDate,
      tuitionTotal: tuitionTotal,
      amountPaid: amountPaid,
      status: status ?? this.status,
      createdAt: createdAt,
      notes: notes,
      targetAudience: targetAudience ?? this.targetAudience,
      consultationHistory: consultationHistory ?? this.consultationHistory,
    );
  }
}

/// 6. Lớp học đào tạo (Course Batch) để xếp lớp
class AdminCourseBatchModel {
  final String id;
  final String courseId;
  final String batchCode;
  final String startDate; // YYYY-MM-DD
  final String endDate;
  final String scheduleDays; // T2-T4-T6, T7-CN...
  final String timeSlot;     // 08:30 - 11:30
  final int enrolledCount;
  final int maxStudents;
  final String status;
  final String? instructorName;
  final String? roomName;
  final String? courseTitle;

  const AdminCourseBatchModel({
    required this.id,
    required this.courseId,
    required this.batchCode,
    required this.startDate,
    required this.endDate,
    required this.scheduleDays,
    required this.timeSlot,
    required this.enrolledCount,
    required this.maxStudents,
    required this.status,
    this.instructorName,
    this.roomName,
    this.courseTitle,
  });

  bool get isFull => maxStudents > 0 && enrolledCount >= maxStudents;
  int get availableSlots => maxStudents > 0 ? (maxStudents - enrolledCount).clamp(0, 999) : 99;

  factory AdminCourseBatchModel.fromJson(Map<String, dynamic> json) {
    final instObj = json['instructors'];
    final roomObj = json['branch_rooms'];
    final branchObj = json['branches'];
    final courseObj = json['courses'];

    final roomOrBranch = roomObj is Map
        ? roomObj['name']?.toString()
        : (branchObj is Map ? branchObj['name']?.toString() : null);

    return AdminCourseBatchModel(
      id: json['id']?.toString() ?? '',
      courseId: json['course_id']?.toString() ?? '',
      batchCode: json['batch_code']?.toString() ?? 'MLD-K01',
      startDate: json['start_date']?.toString() ?? '',
      endDate: json['end_date']?.toString() ?? '',
      scheduleDays: json['schedule_days']?.toString() ?? 'T2-T4-T6',
      timeSlot: json['time_slot']?.toString() ?? '09:00 - 12:00',
      enrolledCount: int.tryParse(json['enrolled_count']?.toString() ?? '0') ?? 0,
      maxStudents: int.tryParse(json['max_students']?.toString() ?? '15') ?? 15,
      status: json['status']?.toString() ?? 'OPEN_FOR_ENROLLMENT',
      instructorName: instObj is Map ? instObj['full_name']?.toString() : null,
      roomName: roomOrBranch,
      courseTitle: courseObj is Map ? courseObj['title']?.toString() : null,
    );
  }
}

/// 6.1. Chi tiết Lịch học theo buổi (Batch Schedule Session)
class AdminBatchScheduleModel {
  final String id;
  final String batchId;
  final String sessionDate; // YYYY-MM-DD
  final String startTime;   // HH:mm:ss
  final String endTime;     // HH:mm:ss
  final String topic;
  final bool isPracticeLab;
  final String? assignedRoomId;
  final String? roomName;
  final String? instructorName;

  const AdminBatchScheduleModel({
    required this.id,
    required this.batchId,
    required this.sessionDate,
    required this.startTime,
    required this.endTime,
    required this.topic,
    required this.isPracticeLab,
    this.assignedRoomId,
    this.roomName,
    this.instructorName,
  });

  factory AdminBatchScheduleModel.fromJson(Map<String, dynamic> json) {
    final roomObj = json['branch_rooms'];
    final instObj = json['instructors'];
    String? rName;
    if (roomObj is Map) {
      rName = roomObj['name']?.toString();
    }
    String? iName;
    if (instObj is Map) {
      iName = instObj['full_name']?.toString();
    }

    return AdminBatchScheduleModel(
      id: json['id']?.toString() ?? '',
      batchId: json['batch_id']?.toString() ?? '',
      sessionDate: json['session_date']?.toString() ?? '',
      startTime: json['start_time']?.toString() ?? '13:00:00',
      endTime: json['end_time']?.toString() ?? '17:00:00',
      topic: json['topic']?.toString() ?? 'Buổi học thực hành',
      isPracticeLab: json['is_practice_lab'] == true,
      assignedRoomId: json['assigned_room_id']?.toString(),
      roomName: rName,
      instructorName: iName,
    );
  }

  int get sessionIndex {
    final match = RegExp(r'Buổi\s*(\d+)', caseSensitive: false).firstMatch(topic);
    if (match != null) {
      return int.tryParse(match.group(1) ?? '1') ?? 1;
    }
    return 1;
  }

  String get timeSlotDisplay {
    final s = startTime.length >= 5 ? startTime.substring(0, 5) : startTime;
    final e = endTime.length >= 5 ? endTime.substring(0, 5) : endTime;
    return '$s – $e';
  }

  String get formattedDate {
    try {
      final dt = DateTime.parse(sessionDate);
      final days = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
      final weekday = days[dt.weekday - 1];
      final formatter = DateFormat('dd/MM/yyyy');
      return '$weekday, ${formatter.format(dt)}';
    } catch (_) {
      return sessionDate;
    }
  }

  /// Trạng thái buổi học: COMPLETED, TODAY, UPCOMING
  String get status {
    try {
      final now = DateTime.now();
      final todayStr = DateFormat('yyyy-MM-dd').format(now);
      if (sessionDate == todayStr) return 'TODAY';
      final dt = DateTime.parse(sessionDate);
      final todayDate = DateTime(now.year, now.month, now.day);
      if (dt.isBefore(todayDate)) return 'COMPLETED';
      return 'UPCOMING';
    } catch (_) {
      return 'UPCOMING';
    }
  }

  AdminBatchScheduleModel copyWith({
    String? topic,
    String? sessionDate,
    String? startTime,
    String? endTime,
    bool? isPracticeLab,
    String? assignedRoomId,
    String? roomName,
    String? instructorName,
  }) {
    return AdminBatchScheduleModel(
      id: id,
      batchId: batchId,
      sessionDate: sessionDate ?? this.sessionDate,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      topic: topic ?? this.topic,
      isPracticeLab: isPracticeLab ?? this.isPracticeLab,
      assignedRoomId: assignedRoomId ?? this.assignedRoomId,
      roomName: roomName ?? this.roomName,
      instructorName: instructorName ?? this.instructorName,
    );
  }
}

/// 7. Dịch vụ Spa (Service)
class AdminServiceModel {
  final String id;
  final String name;
  final String slug;
  final String categoryId;
  final String categoryName;
  final int durationMinutes;
  final double price;
  final double? discountPrice;
  final String imageUrl;
  final String shortDescription;
  final String fullDescription;
  final List<String> steps;
  final List<String> benefits;
  final bool isActive;
  final bool isFeatured;

  const AdminServiceModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.categoryId,
    required this.categoryName,
    required this.durationMinutes,
    required this.price,
    this.discountPrice,
    required this.imageUrl,
    required this.shortDescription,
    required this.fullDescription,
    required this.steps,
    required this.benefits,
    required this.isActive,
    required this.isFeatured,
  });

  factory AdminServiceModel.fromJson(Map<String, dynamic> json) {
    final catObj = json['service_categories'];
    String catName = 'Dịch vụ MLD';
    if (catObj is Map) {
      catName = catObj['name']?.toString() ?? catName;
    }

    List<String> parseList(dynamic val) {
      if (val is List) {
        return val.map((e) => e.toString()).toList();
      }
      return [];
    }

    return AdminServiceModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      categoryId: json['category_id']?.toString() ?? '',
      categoryName: catName,
      durationMinutes: int.tryParse(json['duration_minutes']?.toString() ?? '60') ?? 60,
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      discountPrice: json['discount_price'] != null
          ? double.tryParse(json['discount_price'].toString())
          : null,
      imageUrl: json['image_url']?.toString() ?? '',
      shortDescription: json['short_description']?.toString() ?? '',
      fullDescription: json['full_description']?.toString() ?? '',
      steps: parseList(json['steps']),
      benefits: parseList(json['benefits']),
      isActive: json['is_active'] == true,
      isFeatured: json['is_featured'] == true,
    );
  }

  AdminServiceModel copyWith({
    bool? isActive,
    bool? isFeatured,
    String? name,
    double? price,
    double? discountPrice,
    int? durationMinutes,
  }) {
    return AdminServiceModel(
      id: id,
      name: name ?? this.name,
      slug: slug,
      categoryId: categoryId,
      categoryName: categoryName,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      price: price ?? this.price,
      discountPrice: discountPrice ?? this.discountPrice,
      imageUrl: imageUrl,
      shortDescription: shortDescription,
      fullDescription: fullDescription,
      steps: steps,
      benefits: benefits,
      isActive: isActive ?? this.isActive,
      isFeatured: isFeatured ?? this.isFeatured,
    );
  }
}

class AdminCourseModel {
  final String id;
  final String title;
  final String code;
  final String categoryId;
  final String categoryName;
  final String level;
  final double tuitionFee;
  final double depositAmount;
  final int totalHours;
  final int theoryHours;
  final int practiceHours;
  final int totalLessons;
  final String imageUrl;
  final String shortDescription;
  final String fullDescription;
  final String? instructorName;
  final bool isActive;
  final bool isFeatured;
  final String targetAudience;
  final String targetNeed;
  final String courseGroup;
  final Map<String, dynamic> learningOutcomes;

  const AdminCourseModel({
    required this.id,
    required this.title,
    required this.code,
    required this.categoryId,
    required this.categoryName,
    required this.level,
    required this.tuitionFee,
    required this.depositAmount,
    required this.totalHours,
    required this.theoryHours,
    required this.practiceHours,
    required this.totalLessons,
    required this.imageUrl,
    required this.shortDescription,
    required this.fullDescription,
    this.instructorName,
    required this.isActive,
    required this.isFeatured,
    this.targetAudience = '',
    this.targetNeed = '',
    this.courseGroup = '',
    this.learningOutcomes = const {},
  });

  factory AdminCourseModel.fromJson(Map<String, dynamic> json) {
    final catObj = json['course_categories'];
    final instObj = json['instructors'];

    String catName = 'Khóa học MLD';
    if (catObj is Map) {
      catName = catObj['name']?.toString() ?? catName;
    }
    String? instName;
    if (instObj is Map) {
      instName = instObj['full_name']?.toString();
    }

    Map<String, dynamic> outcomes = {};
    if (json['learning_outcomes'] is Map) {
      outcomes = Map<String, dynamic>.from(json['learning_outcomes'] as Map);
    } else if (json['learning_outcomes'] is String) {
      try {
        final decoded = jsonDecode(json['learning_outcomes']);
        if (decoded is Map) outcomes = Map<String, dynamic>.from(decoded);
      } catch (_) {}
    }

    final targetAudience = (json['target_audience'] ?? json['targetAudience'] ?? outcomes['target_audience'] ?? outcomes['targetAudience'])?.toString().trim() ?? '';
    final targetNeed = (json['target_need'] ?? json['targetNeed'] ?? outcomes['target_need'] ?? outcomes['targetNeed'])?.toString().trim() ?? '';
    final courseGroup = (json['course_group'] ?? json['courseGroup'] ?? outcomes['course_group'] ?? outcomes['courseGroup'])?.toString().trim() ?? '';

    return AdminCourseModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      categoryId: json['category_id']?.toString() ?? '',
      categoryName: catName,
      level: json['level']?.toString() ?? 'BEGINNER',
      tuitionFee: double.tryParse(json['tuition_fee']?.toString() ?? '0') ?? 0.0,
      depositAmount: double.tryParse(json['deposit_amount']?.toString() ?? '0') ?? 0.0,
      totalHours: int.tryParse(json['total_hours']?.toString() ?? '144') ?? 144,
      theoryHours: int.tryParse(json['theory_hours']?.toString() ?? '48') ?? 48,
      practiceHours: int.tryParse(json['practice_hours']?.toString() ?? '96') ?? 96,
      totalLessons: int.tryParse(json['total_lessons']?.toString() ?? '20') ?? 20,
      imageUrl: json['image_url']?.toString() ?? '',
      shortDescription: json['short_description']?.toString() ?? '',
      fullDescription: json['full_description']?.toString() ?? '',
      instructorName: instName,
      isActive: json['is_active'] == true,
      isFeatured: json['is_featured'] == true,
      targetAudience: targetAudience,
      targetNeed: targetNeed,
      courseGroup: courseGroup,
      learningOutcomes: outcomes,
    );
  }

  AdminCourseModel copyWith({
    bool? isActive,
    bool? isFeatured,
    String? title,
    double? tuitionFee,
    double? depositAmount,
    String? targetAudience,
    String? targetNeed,
    String? courseGroup,
    Map<String, dynamic>? learningOutcomes,
  }) {
    return AdminCourseModel(
      id: id,
      title: title ?? this.title,
      code: code,
      categoryId: categoryId,
      categoryName: categoryName,
      level: level,
      tuitionFee: tuitionFee ?? this.tuitionFee,
      depositAmount: depositAmount ?? this.depositAmount,
      totalHours: totalHours,
      theoryHours: theoryHours,
      practiceHours: practiceHours,
      totalLessons: totalLessons,
      imageUrl: imageUrl,
      shortDescription: shortDescription,
      fullDescription: fullDescription,
      instructorName: instructorName,
      isActive: isActive ?? this.isActive,
      isFeatured: isFeatured ?? this.isFeatured,
      targetAudience: targetAudience ?? this.targetAudience,
      targetNeed: targetNeed ?? this.targetNeed,
      courseGroup: courseGroup ?? this.courseGroup,
      learningOutcomes: learningOutcomes ?? this.learningOutcomes,
    );
  }
}

/// 9. Bài thi nộp của học viên (Quiz Submission)
class AdminQuizSubmissionModel {
  final String id;
  final String enrollmentId;
  final String studentName;
  final String studentPhone;
  final String? batchId;
  final String? batchCode;
  final String quizId;
  final String quizTitle;
  final String courseTitle;
  final double score;
  final int correctCount;
  final bool passed;
  final String? instructorFeedback;
  final String submittedAt;
  final Map<String, dynamic> submittedAnswers;

  const AdminQuizSubmissionModel({
    required this.id,
    required this.enrollmentId,
    required this.studentName,
    required this.studentPhone,
    this.batchId,
    this.batchCode,
    required this.quizId,
    required this.quizTitle,
    required this.courseTitle,
    required this.score,
    required this.correctCount,
    required this.passed,
    this.instructorFeedback,
    required this.submittedAt,
    this.submittedAnswers = const {},
  });

  factory AdminQuizSubmissionModel.fromJson(Map<String, dynamic> json) {
    final enrObj = json['course_enrollments'];
    final quizObj = json['course_quizzes'];

    String sName = 'Học viên';
    String sPhone = '';
    String? bId;
    String? bCode;
    String cTitle = 'Đào tạo MLD';
    if (enrObj is Map) {
      sName = enrObj['student_name']?.toString() ?? enrObj['candidate_name']?.toString() ?? sName;
      sPhone = enrObj['student_phone']?.toString() ?? enrObj['candidate_phone']?.toString() ?? '';
      bId = enrObj['batch_id']?.toString();
      final batchObj = enrObj['course_batches'];
      if (batchObj is Map) {
        bCode = batchObj['batch_code']?.toString();
      }
      final cObj = enrObj['courses'];
      if (cObj is Map) {
        cTitle = cObj['title']?.toString() ?? cTitle;
      } else {
        cTitle = enrObj['course_title']?.toString() ?? cTitle;
      }
    }

    String qTitle = 'Bài kiểm tra kiến thức MLD';
    if (quizObj is Map) {
      qTitle = quizObj['title']?.toString() ?? qTitle;
    }

    Map<String, dynamic> answers = {};
    if (json['submitted_answers'] is Map) {
      answers = Map<String, dynamic>.from(json['submitted_answers']);
    }

    return AdminQuizSubmissionModel(
      id: json['id']?.toString() ?? '',
      enrollmentId: json['enrollment_id']?.toString() ?? '',
      studentName: sName,
      studentPhone: sPhone,
      batchId: bId,
      batchCode: bCode,
      quizId: json['quiz_id']?.toString() ?? '',
      quizTitle: qTitle,
      courseTitle: cTitle,
      score: double.tryParse(json['score']?.toString() ?? '0') ?? 0.0,
      correctCount: int.tryParse(json['correct_count']?.toString() ?? '0') ?? 0,
      passed: json['passed'] == true,
      instructorFeedback: json['instructor_feedback']?.toString(),
      submittedAt: json['submitted_at']?.toString() ?? '',
      submittedAnswers: answers,
    );
  }

  AdminQuizSubmissionModel copyWith({
    String? batchId,
    String? batchCode,
    String? instructorFeedback,
    bool? passed,
  }) {
    return AdminQuizSubmissionModel(
      id: id,
      enrollmentId: enrollmentId,
      studentName: studentName,
      studentPhone: studentPhone,
      batchId: batchId ?? this.batchId,
      batchCode: batchCode ?? this.batchCode,
      quizId: quizId,
      quizTitle: quizTitle,
      courseTitle: courseTitle,
      score: score,
      correctCount: correctCount,
      passed: passed ?? this.passed,
      instructorFeedback: instructorFeedback ?? this.instructorFeedback,
      submittedAt: submittedAt,
      submittedAnswers: submittedAnswers,
    );
  }
}

class AdminRevenuePoint {
  final String label;
  final String dateIso;
  final double totalAmount;
  final double serviceAmount;
  final double packageAmount;
  final double academyAmount;
  final int transactionCount;

  const AdminRevenuePoint({
    required this.label,
    required this.dateIso,
    required this.totalAmount,
    this.serviceAmount = 0.0,
    this.packageAmount = 0.0,
    this.academyAmount = 0.0,
    this.transactionCount = 0,
  });
}

class AdminRevenueItem {
  final String id;
  final String code;
  final String title;
  final String customerOrStudentName;
  final String? phone;
  final String category;
  final double amount;
  final String timestamp;
  final String status;
  final String? branchName;

  const AdminRevenueItem({
    required this.id,
    required this.code,
    required this.title,
    required this.customerOrStudentName,
    this.phone,
    required this.category,
    required this.amount,
    required this.timestamp,
    required this.status,
    this.branchName,
  });
}

class AdminRevenueReport {
  final String period;
  final double totalRevenue;
  final double grossCollected;
  final double refundAmount;
  final int refundCount;
  final double receivableAmount;
  final int receivableCount;
  final double serviceRevenue;
  final double packageRevenue;
  final double academyRevenue;
  final double productRevenue;
  final int totalTransactions;
  final double averageTicket;
  final List<AdminRevenuePoint> chartPoints;
  final List<AdminRevenueItem> items;

  const AdminRevenueReport({
    required this.period,
    required this.totalRevenue,
    this.grossCollected = 0.0,
    this.refundAmount = 0.0,
    this.refundCount = 0,
    this.receivableAmount = 0.0,
    this.receivableCount = 0,
    required this.serviceRevenue,
    this.packageRevenue = 0.0,
    required this.academyRevenue,
    this.productRevenue = 0.0,
    required this.totalTransactions,
    required this.averageTicket,
    required this.chartPoints,
    required this.items,
  });

  factory AdminRevenueReport.empty(String period) {
    return AdminRevenueReport(
      period: period,
      totalRevenue: 0.0,
      grossCollected: 0.0,
      refundAmount: 0.0,
      refundCount: 0,
      receivableAmount: 0.0,
      receivableCount: 0,
      serviceRevenue: 0.0,
      packageRevenue: 0.0,
      academyRevenue: 0.0,
      productRevenue: 0.0,
      totalTransactions: 0,
      averageTicket: 0.0,
      chartPoints: const [],
      items: const [],
    );
  }
}

/// Model Gói Liệu trình / Gói Trị liệu Bổ trợ dành cho Admin Catalog (treatment_packages)
class AdminTreatmentPackageModel {
  final String id;
  final String name;
  final String? serviceId;
  final int totalSessions;
  final double price;
  final double? discountPrice;
  final int validityMonths;
  final String description;
  final String imageUrl;
  final bool isActive;
  final DateTime? createdAt;

  const AdminTreatmentPackageModel({
    required this.id,
    required this.name,
    this.serviceId,
    required this.totalSessions,
    required this.price,
    this.discountPrice,
    this.validityMonths = 6,
    this.description = '',
    this.imageUrl = '',
    required this.isActive,
    this.createdAt,
  });

  factory AdminTreatmentPackageModel.fromJson(Map<String, dynamic> json) {
    return AdminTreatmentPackageModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? json['title']?.toString() ?? 'Gói liệu trình MLD',
      serviceId: json['service_id']?.toString(),
      totalSessions: int.tryParse(json['total_sessions']?.toString() ?? json['sessionsCount']?.toString() ?? '10') ?? 10,
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      discountPrice: json['discount_price'] != null ? double.tryParse(json['discount_price'].toString()) : null,
      validityMonths: int.tryParse(json['validity_months']?.toString() ?? '6') ?? 6,
      description: json['description']?.toString() ?? '',
      imageUrl: json['image_url']?.toString() ?? '',
      isActive: json['is_active'] == true,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }

  AdminTreatmentPackageModel copyWith({
    bool? isActive,
    String? name,
    double? price,
    int? totalSessions,
  }) {
    return AdminTreatmentPackageModel(
      id: id,
      name: name ?? this.name,
      serviceId: serviceId,
      totalSessions: totalSessions ?? this.totalSessions,
      price: price ?? this.price,
      discountPrice: discountPrice,
      validityMonths: validityMonths,
      description: description,
      imageUrl: imageUrl,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt,
    );
  }
}

/// 14. Banner Quảng cáo & Truyền thông Trang chủ (miniapp_shared_content kind=BANNER)
class AdminBannerModel {
  final String id;
  final String title;
  final String summary;
  final String imageUrl;
  final String category;
  final String targetLink;
  final String status;
  final int sortOrder;
  final bool isFeatured;
  final DateTime? createdAt;

  const AdminBannerModel({
    required this.id,
    required this.title,
    required this.summary,
    required this.imageUrl,
    required this.category,
    required this.targetLink,
    required this.status,
    required this.sortOrder,
    required this.isFeatured,
    this.createdAt,
  });

  bool get isPublished => status.toUpperCase() == 'PUBLISHED' || status.toUpperCase() == 'APPROVED';

  String get categoryDisplay {
    switch (category.toUpperCase()) {
      case 'DAO_TAO':
        return 'Đào tạo Y khoa';
      case 'DICH_VU':
        return 'Dịch vụ Trị liệu';
      case 'KHUYEN_MAI':
        return 'Ưu đãi Đặc quyền';
      case 'SU_KIEN':
        return 'Sự kiện Chuyên ngành';
      default:
        return category.isNotEmpty ? category : 'Chung';
    }
  }

  factory AdminBannerModel.fromJson(Map<String, dynamic> json) {
    return AdminBannerModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      summary: json['summary']?.toString() ?? '',
      imageUrl: json['image_url']?.toString() ?? '',
      category: json['category']?.toString() ?? 'DAO_TAO',
      targetLink: json['target_link']?.toString() ?? '/academy',
      status: json['status']?.toString() ?? 'PUBLISHED',
      sortOrder: int.tryParse(json['sort_order']?.toString() ?? '0') ?? 0,
      isFeatured: json['is_featured'] == true,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }

  AdminBannerModel copyWith({
    String? title,
    String? summary,
    String? imageUrl,
    String? category,
    String? targetLink,
    String? status,
    int? sortOrder,
    bool? isFeatured,
  }) {
    return AdminBannerModel(
      id: id,
      title: title ?? this.title,
      summary: summary ?? this.summary,
      imageUrl: imageUrl ?? this.imageUrl,
      category: category ?? this.category,
      targetLink: targetLink ?? this.targetLink,
      status: status ?? this.status,
      sortOrder: sortOrder ?? this.sortOrder,
      isFeatured: isFeatured ?? this.isFeatured,
      createdAt: createdAt,
    );
  }
}

class AdminTechnicianShiftModel {
  final String id;
  final String technicianId;
  final String technicianName;
  final String branchId;
  final String branchName;
  final String? assignedRoomId;
  final String? roomName;
  final String shiftDate;
  final String startTime;
  final String endTime;
  final bool isCancelled;

  const AdminTechnicianShiftModel({
    required this.id,
    required this.technicianId,
    required this.technicianName,
    required this.branchId,
    required this.branchName,
    this.assignedRoomId,
    this.roomName,
    required this.shiftDate,
    required this.startTime,
    required this.endTime,
    this.isCancelled = false,
  });

  static String _trimTime(dynamic raw) {
    final value = raw?.toString() ?? '';
    return value.length >= 5 ? value.substring(0, 5) : value;
  }

  String get shiftSlot {
    final parts = startTime.split(':');
    final h = parts.isNotEmpty ? (int.tryParse(parts[0]) ?? 9) : 9;
    final m = parts.length > 1 ? (int.tryParse(parts[1]) ?? 0) : 0;
    if (h < 12) return 'morning';
    if (h < 17 || (h == 17 && m <= 30)) return 'afternoon';
    return 'evening';
  }

  String get shiftLabel {
    switch (shiftSlot) {
      case 'morning':
        return 'Ca Sáng';
      case 'afternoon':
        return 'Ca Chiều';
      default:
        return 'Ca Tối';
    }
  }

  factory AdminTechnicianShiftModel.fromJson(Map<String, dynamic> json) {
    final techObj = json['technicians'] ?? json['technician'];
    final branchObj = json['branches'] ?? json['branch'];
    final roomObj = json['branch_rooms'] ?? json['room'];

    return AdminTechnicianShiftModel(
      id: json['id']?.toString() ?? '',
      technicianId: json['technician_id']?.toString() ?? '',
      technicianName: techObj is Map ? (techObj['full_name']?.toString() ?? 'KTV') : (json['technician_name']?.toString() ?? 'KTV'),
      branchId: json['branch_id']?.toString() ?? '',
      branchName: branchObj is Map ? (branchObj['name']?.toString() ?? 'MLD Spa') : (json['branch_name']?.toString() ?? 'MLD Spa'),
      assignedRoomId: json['assigned_room_id']?.toString(),
      roomName: roomObj is Map ? roomObj['name']?.toString() : json['room_name']?.toString(),
      shiftDate: json['shift_date']?.toString() ?? '',
      startTime: _trimTime(json['start_time']),
      endTime: _trimTime(json['end_time']),
      isCancelled: json['is_cancelled'] == true,
    );
  }
}



