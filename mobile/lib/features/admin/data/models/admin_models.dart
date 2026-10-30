// Bộ dữ liệu định dạng chuẩn Admin Mobile MLD Việt Nam
// Đồng bộ 100% với Supabase Database & Web-Admin

/// 1. Chỉ số KPI Dashboard
class AdminKpiMetrics {
  final double todayRevenue;
  final int todayBookingsCount;
  final int checkedInBookingsCount;
  final int waitingBatchStudentsCount;
  final int pendingActionsCount;

  const AdminKpiMetrics({
    this.todayRevenue = 0.0,
    this.todayBookingsCount = 0,
    this.checkedInBookingsCount = 0,
    this.waitingBatchStudentsCount = 0,
    this.pendingActionsCount = 0,
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
  final String? branchId;
  final String? branchName;
  final String? technicianName;
  final String? roomName;
  final String? checkedInAt;
  final String? serviceStartedAt;
  final String? checkedOutAt;
  final String? notes;

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
    this.branchId,
    this.branchName,
    this.technicianName,
    this.roomName,
    this.checkedInAt,
    this.serviceStartedAt,
    this.checkedOutAt,
    this.notes,
  });

  factory AdminBookingModel.fromJson(Map<String, dynamic> json) {
    final branchObj = json['branches'];
    final techObj = json['technicians'];
    final roomObj = json['branch_rooms'];
    final userObj = json['users'];

    String custName = json['booked_for_name']?.toString() ?? json['customer_name']?.toString() ?? '';
    if (custName.isEmpty && userObj is Map) {
      custName = userObj['full_name']?.toString() ?? '';
    }
    String custPhone = json['booked_for_phone']?.toString() ?? json['customer_phone']?.toString() ?? '';
    if (custPhone.isEmpty && userObj is Map) {
      custPhone = userObj['phone']?.toString() ?? '';
    }

    return AdminBookingModel(
      id: json['id']?.toString() ?? '',
      bookingCode: json['booking_code']?.toString() ?? 'BK-000',
      bookingDate: json['booking_date']?.toString() ?? '',
      startTime: json['start_time']?.toString() ?? '',
      endTime: json['end_time']?.toString() ?? '',
      customerName: custName.isNotEmpty ? custName : 'Khách hàng',
      customerPhone: custPhone,
      serviceName: json['service_name']?.toString() ?? 'Trị liệu MLD',
      finalPrice: (json['final_price'] != null)
          ? double.tryParse(json['final_price'].toString()) ?? 0.0
          : (json['base_total'] != null)
              ? double.tryParse(json['base_total'].toString()) ?? 0.0
              : 0.0,
      status: (json['status']?.toString() ?? 'PENDING').toUpperCase(),
      paymentStatus: (json['payment_status']?.toString() ?? 'UNPAID').toUpperCase(),
      branchId: json['branch_id']?.toString(),
      branchName: branchObj is Map ? branchObj['name']?.toString() : null,
      technicianName: techObj is Map ? techObj['full_name']?.toString() : null,
      roomName: roomObj is Map ? roomObj['name']?.toString() : null,
      checkedInAt: json['checked_in_at']?.toString(),
      serviceStartedAt: json['service_started_at']?.toString(),
      checkedOutAt: json['checked_out_at']?.toString(),
      notes: json['notes']?.toString(),
    );
  }

  AdminBookingModel copyWith({
    String? status,
    String? checkedInAt,
    String? serviceStartedAt,
    String? checkedOutAt,
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
      paymentStatus: paymentStatus,
      branchId: branchId,
      branchName: branchName,
      technicianName: technicianName,
      roomName: roomName,
      checkedInAt: checkedInAt ?? this.checkedInAt,
      serviceStartedAt: serviceStartedAt ?? this.serviceStartedAt,
      checkedOutAt: checkedOutAt ?? this.checkedOutAt,
      notes: notes,
    );
  }
}

/// 5. Hồ sơ học viên tuyển sinh (Course Enrollment)
class AdminCandidateModel {
  final String id;
  final String orderCode;
  final String candidateName;
  final String candidatePhone;
  final String? candidateEmail;
  final String courseId;
  final String courseTitle;
  final String? batchId;
  final String? batchCode;
  final double tuitionTotal;
  final double amountPaid;
  final String status; // PENDING_CONSULTATION, CONFIRMED_PENDING_PAY, PAID_WAITING_CLASS, ENROLLED_STUDYING, DROPPED
  final String createdAt;
  final String? notes;

  const AdminCandidateModel({
    required this.id,
    required this.orderCode,
    required this.candidateName,
    required this.candidatePhone,
    this.candidateEmail,
    required this.courseId,
    required this.courseTitle,
    this.batchId,
    this.batchCode,
    required this.tuitionTotal,
    required this.amountPaid,
    required this.status,
    required this.createdAt,
    this.notes,
  });

  factory AdminCandidateModel.fromJson(Map<String, dynamic> json) {
    final batchObj = json['course_batches'];
    final courseObj = json['courses'];

    String title = json['course_title']?.toString() ?? '';
    if (title.isEmpty && courseObj is Map) {
      title = courseObj['title']?.toString() ?? '';
    }

    // Determine workflow state:
    // 1. PENDING_CONSULTATION (CONSULTING)
    // 2. CONFIRMED_PENDING_PAY
    // 3. PAID_WAITING_CLASS (amountPaid >= deposit/total but no batchId)
    // 4. ENROLLED_STUDYING (has batchId & enrolled)
    String rawStatus = json['status']?.toString() ?? 'CONSULTING';
    final bId = json['batch_id']?.toString();
    final paid = double.tryParse(json['amount_paid']?.toString() ?? '0') ?? 0.0;
    final total = double.tryParse(json['tuition_total']?.toString() ?? '0') ?? 0.0;

    String workflowStatus = rawStatus;
    if (rawStatus == 'CONSULTING') {
      workflowStatus = 'PENDING_CONSULTATION';
    } else if (rawStatus == 'CONFIRMED' || rawStatus == 'DEPOSITED') {
      if (bId == null || bId.isEmpty) {
        workflowStatus = paid > 0 ? 'PAID_WAITING_CLASS' : 'CONFIRMED_PENDING_PAY';
      } else {
        workflowStatus = 'ENROLLED_STUDYING';
      }
    } else if (rawStatus == 'ENROLLED' || rawStatus == 'STUDYING') {
      workflowStatus = 'ENROLLED_STUDYING';
    }

    final cName = json['student_name']?.toString() ?? json['candidate_name']?.toString() ?? '';
    final cPhone = json['student_phone']?.toString() ?? json['candidate_phone']?.toString() ?? '';
    final cEmail = json['student_email']?.toString() ?? json['candidate_email']?.toString();

    return AdminCandidateModel(
      id: json['id']?.toString() ?? '',
      orderCode: json['order_code']?.toString() ?? 'ENR-000',
      candidateName: cName.isNotEmpty ? cName : 'Học viên',
      candidatePhone: cPhone,
      candidateEmail: cEmail,
      courseId: json['course_id']?.toString() ?? '',
      courseTitle: title.isNotEmpty ? title : 'Khóa đào tạo MLD',
      batchId: bId,
      batchCode: batchObj is Map ? batchObj['batch_code']?.toString() : null,
      tuitionTotal: total,
      amountPaid: paid,
      status: workflowStatus,
      createdAt: json['created_at']?.toString() ?? '',
      notes: json['notes']?.toString(),
    );
  }

  AdminCandidateModel copyWith({
    String? status,
    String? batchId,
    String? batchCode,
  }) {
    return AdminCandidateModel(
      id: id,
      orderCode: orderCode,
      candidateName: candidateName,
      candidatePhone: candidatePhone,
      candidateEmail: candidateEmail,
      courseId: courseId,
      courseTitle: courseTitle,
      batchId: batchId ?? this.batchId,
      batchCode: batchCode ?? this.batchCode,
      tuitionTotal: tuitionTotal,
      amountPaid: amountPaid,
      status: status ?? this.status,
      createdAt: createdAt,
      notes: notes,
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
  });

  bool get isFull => maxStudents > 0 && enrolledCount >= maxStudents;
  int get availableSlots => maxStudents > 0 ? (maxStudents - enrolledCount).clamp(0, 999) : 99;

  factory AdminCourseBatchModel.fromJson(Map<String, dynamic> json) {
    final instObj = json['instructors'];
    final roomObj = json['branch_rooms'];

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
      roomName: roomObj is Map ? roomObj['name']?.toString() : null,
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

/// 8. Khóa học đào tạo (Course)
class AdminCourseModel {
  final String id;
  final String title;
  final String code;
  final String categoryId;
  final String categoryName;
  final String level; // BEGINNER, INTERMEDIATE, ADVANCED, MASTER
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
    );
  }

  AdminCourseModel copyWith({
    bool? isActive,
    bool? isFeatured,
    String? title,
    double? tuitionFee,
    double? depositAmount,
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
    );
  }
}

/// 9. Bài thi nộp của học viên (Quiz Submission)
class AdminQuizSubmissionModel {
  final String id;
  final String enrollmentId;
  final String studentName;
  final String studentPhone;
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
    String cTitle = 'Đào tạo MLD';
    if (enrObj is Map) {
      sName = enrObj['candidate_name']?.toString() ?? sName;
      sPhone = enrObj['candidate_phone']?.toString() ?? '';
      cTitle = enrObj['course_title']?.toString() ?? cTitle;
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
    String? instructorFeedback,
    bool? passed,
  }) {
    return AdminQuizSubmissionModel(
      id: id,
      enrollmentId: enrollmentId,
      studentName: studentName,
      studentPhone: studentPhone,
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
