import 'dart:math';
import '../models/booking_models.dart';

class MockBookingRepository {
  // Singleton pattern để duy trì danh sách lịch hẹn xuyên suốt phiên người dùng
  static final MockBookingRepository _instance = MockBookingRepository._internal();
  factory MockBookingRepository() => _instance;

  final List<AppointmentItemModel> _appointments = [];

  MockBookingRepository._internal() {
    _initSampleAppointments();
  }

  void _initSampleAppointments() {
    _appointments.addAll([
      // 1. Lịch hẹn sắp tới (Chính là mẫu trong Figma Group C)
      AppointmentItemModel(
        id: 'apt-001',
        bookingCode: 'SPA-DEMO-000128',
        serviceName: 'Massage thư giãn toàn thân',
        serviceImage: 'assets/images/specialist_hero_1.png',
        durationMinutes: 60,
        branchName: 'Chi nhánh mẫu 01 — Quận 3',
        branchAddress: '123 Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh',
        branchPhone: '0901 234 567',
        specialistName: 'Trần Minh Phương',
        specialistTitle: 'Kỹ thuật viên massage',
        specialistAvatar: 'assets/images/specialist_avatar_1.png',
        appointmentDate: DateTime(2026, 10, 12),
        timeSlot: '14:00 - 15:00',
        customerName: 'Nguyễn Minh Anh',
        customerPhone: '0912 345 678',
        customerEmail: 'minh.anh@example.com',
        specialNotes: 'Tập trung vùng vai gáy, dùng lực vừa phải.',
        totalAmount: 450000.0,
        depositAmount: 150000.0,
        remainingAmount: 300000.0,
        paymentMethod: 'Chuyển khoản ngân hàng / QR',
        status: AppointmentStatus.confirmed,
        createdAt: DateTime(2026, 10, 10, 14, 30),
        timeline: [
          BookingTimelineEvent(
            title: 'Đã tạo yêu cầu',
            description: 'Đăng ký lịch hẹn qua ứng dụng',
            timestamp: DateTime(2026, 10, 10, 14, 30),
            isCompleted: true,
          ),
          BookingTimelineEvent(
            title: 'Chờ xác nhận / thanh toán',
            description: 'Đã thanh toán tiền cọc 150.000đ',
            timestamp: DateTime(2026, 10, 10, 14, 35),
            isCompleted: true,
          ),
          BookingTimelineEvent(
            title: 'Đã xác nhận (mô phỏng)',
            description: 'Chi nhánh tiếp nhận và phân công chuyên viên',
            timestamp: DateTime(2026, 10, 10, 14, 40),
            isCompleted: true,
            isCurrent: true,
          ),
          const BookingTimelineEvent(
            title: 'Hoàn thành',
            description: 'Chưa diễn ra',
            isCompleted: false,
          ),
        ],
      ),

      // 2. Lịch hẹn hoàn thành
      AppointmentItemModel(
        id: 'apt-002',
        bookingCode: 'SPA-DEMO-000126',
        serviceName: 'Chăm sóc da chuyên sâu',
        serviceImage: 'assets/images/gioithieu_2.png',
        durationMinutes: 90,
        branchName: 'Chi nhánh mẫu 01 — Quận 3',
        branchAddress: '123 Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh',
        branchPhone: '0901 234 567',
        specialistName: 'Nguyễn Thu Hà',
        specialistTitle: 'Kỹ thuật viên trị liệu da',
        specialistAvatar: 'assets/images/specialist_avatar_2.png',
        appointmentDate: DateTime(2026, 10, 5),
        timeSlot: '14:00 - 15:30',
        customerName: 'Nguyễn Minh Anh',
        customerPhone: '0912 345 678',
        customerEmail: 'minh.anh@example.com',
        specialNotes: 'Da nhạy cảm, sử dụng mỹ phẩm dịu nhẹ.',
        totalAmount: 650000.0,
        depositAmount: 150000.0,
        remainingAmount: 500000.0,
        paymentMethod: 'Chuyển khoản ngân hàng / QR',
        status: AppointmentStatus.completed,
        createdAt: DateTime(2026, 10, 3, 9, 0),
        timeline: [
          BookingTimelineEvent(
            title: 'Đã tạo yêu cầu',
            timestamp: DateTime(2026, 10, 3, 9, 0),
            isCompleted: true,
          ),
          BookingTimelineEvent(
            title: 'Đã hoàn thành',
            description: 'Buổi chăm sóc đã kết thúc tốt đẹp',
            timestamp: DateTime(2026, 10, 5, 15, 30),
            isCompleted: true,
          ),
        ],
      ),

      // 3. Lịch hẹn đã hủy
      AppointmentItemModel(
        id: 'apt-003',
        bookingCode: 'SPA-DEMO-000127',
        serviceName: 'Massage thư giãn toàn thân',
        serviceImage: 'assets/images/specialist_hero_1.png',
        durationMinutes: 60,
        branchName: 'Chi nhánh mẫu 01 — Quận 3',
        branchAddress: '123 Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh',
        branchPhone: '0901 234 567',
        specialistName: 'Trần Minh Phương',
        specialistTitle: 'Kỹ thuật viên massage',
        specialistAvatar: 'assets/images/specialist_avatar_1.png',
        appointmentDate: DateTime(2026, 10, 6),
        timeSlot: '14:00 - 15:00',
        customerName: 'Nguyễn Minh Anh',
        customerPhone: '0912 345 678',
        customerEmail: 'minh.anh@example.com',
        specialNotes: 'Hủy do có lịch công tác đột xuất.',
        totalAmount: 450000.0,
        depositAmount: 150000.0,
        remainingAmount: 300000.0,
        paymentMethod: 'Chuyển khoản ngân hàng / QR',
        status: AppointmentStatus.cancelled,
        createdAt: DateTime(2026, 10, 4, 11, 20),
        timeline: [
          BookingTimelineEvent(
            title: 'Đã tạo yêu cầu',
            timestamp: DateTime(2026, 10, 4, 11, 20),
            isCompleted: true,
          ),
          BookingTimelineEvent(
            title: 'Đã hủy (mô phỏng)',
            description: 'Khách hàng yêu cầu hủy lịch',
            timestamp: DateTime(2026, 10, 5, 10, 0),
            isCompleted: true,
          ),
        ],
      ),
    ]);
  }

  /// Lấy danh sách lịch hẹn theo bộ lọc
  List<AppointmentItemModel> getAppointments({AppointmentStatus? status}) {
    if (status == null) return List.unmodifiable(_appointments);
    return _appointments.where((a) => a.status == status).toList();
  }

  /// Lấy danh sách lịch hẹn sắp tới (pending, confirmed, inService)
  List<AppointmentItemModel> getUpcomingAppointments() {
    return _appointments.where((a) =>
      a.status == AppointmentStatus.confirmed ||
      a.status == AppointmentStatus.pending ||
      a.status == AppointmentStatus.inService
    ).toList();
  }

  /// Lấy danh sách lịch hẹn đã hoàn thành
  List<AppointmentItemModel> getCompletedAppointments() {
    return _appointments.where((a) => a.status == AppointmentStatus.completed).toList();
  }

  /// Lấy danh sách lịch hẹn đã hủy
  List<AppointmentItemModel> getCancelledAppointments() {
    return _appointments.where((a) => a.status == AppointmentStatus.cancelled).toList();
  }

  /// Tìm lịch hẹn theo id
  AppointmentItemModel? getAppointmentById(String id) {
    try {
      return _appointments.firstWhere((a) => a.id == id);
    } catch (_) {
      return null;
    }
  }

  /// Thêm lịch hẹn mới vào đầu danh sách
  void createAppointment(AppointmentItemModel appointment) {
    _appointments.insert(0, appointment);
  }

  /// Tạo lịch hẹn mới từ BookingFlowState
  AppointmentItemModel createAppointmentFromFlow(BookingFlowState flow) {
    final randomNum = 100 + Random().nextInt(900);
    final bookingCode = 'SPA-DEMO-000$randomNum';
    final id = 'apt-${DateTime.now().millisecondsSinceEpoch}';

    final specialistName = flow.autoAssignSpecialist || flow.selectedSpecialist == null
        ? 'Chuyên viên chỉ định ngẫu nhiên'
        : flow.selectedSpecialist!.name;
    final specialistTitle = flow.selectedSpecialist?.title ?? 'Kỹ thuật viên dưỡng sinh';
    final specialistAvatar = flow.selectedSpecialist?.avatarUrl ?? 'assets/images/specialist_avatar_1.png';

    final branchName = flow.selectedBranch?.name ?? 'Chi nhánh mẫu 01 — Quận 3';
    final branchAddress = flow.selectedBranch?.address ?? '123 Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh';
    final serviceName = flow.selectedService?.name ?? 'Massage thư giãn toàn thân';

    final item = AppointmentItemModel(
      id: id,
      bookingCode: bookingCode,
      serviceName: serviceName,
      serviceImage: flow.selectedService?.imageUrl ?? 'assets/images/specialist_hero_1.png',
      durationMinutes: 60,
      branchName: branchName,
      branchAddress: branchAddress,
      specialistName: specialistName,
      specialistTitle: specialistTitle,
      specialistAvatar: specialistAvatar,
      appointmentDate: flow.selectedDate,
      timeSlot: flow.selectedSlot?.time ?? '14:00 - 15:00',
      customerName: flow.customerName.isEmpty ? 'Nguyễn Minh Anh' : flow.customerName,
      customerPhone: flow.customerPhone.isEmpty ? '0912 345 678' : flow.customerPhone,
      customerEmail: flow.customerEmail,
      specialNotes: flow.specialNotes,
      totalAmount: flow.servicePrice,
      depositAmount: flow.payableNow,
      remainingAmount: flow.remainingAmount,
      paymentMethod: flow.paymentMethod == 'BANK_TRANSFER_QR' ? 'Chuyển khoản ngân hàng / QR' : 'Thanh toán tại cơ sở',
      status: AppointmentStatus.confirmed,
      createdAt: DateTime.now(),
      timeline: [
        BookingTimelineEvent(
          title: 'Đã tạo yêu cầu',
          description: 'Đăng ký dịch vụ qua ứng dụng',
          timestamp: DateTime.now(),
          isCompleted: true,
        ),
        BookingTimelineEvent(
          title: 'Chờ xác nhận / thanh toán',
          description: 'Đã thanh toán ${flow.payableNow.toInt()}đ',
          timestamp: DateTime.now(),
          isCompleted: true,
        ),
        const BookingTimelineEvent(
          title: 'Đã xác nhận (mô phỏng)',
          description: 'Hệ thống đã ghi nhận lịch hẹn',
          isCompleted: true,
          isCurrent: true,
        ),
        const BookingTimelineEvent(
          title: 'Hoàn thành',
          description: 'Chưa diễn ra',
          isCompleted: false,
        ),
      ],
    );

    _appointments.insert(0, item);
    return item;
  }

  /// Đổi lịch hẹn (Reschedule)
  bool rescheduleAppointment(String id, DateTime newDate, String newTimeSlot) {
    final index = _appointments.indexWhere((a) => a.id == id);
    if (index != -1) {
      final old = _appointments[index];
      _appointments[index] = old.copyWith(
        appointmentDate: newDate,
        timeSlot: newTimeSlot,
      );
      return true;
    }
    return false;
  }

  /// Hủy lịch hẹn
  bool cancelAppointment(String id, String reason) {
    final index = _appointments.indexWhere((a) => a.id == id);
    if (index != -1) {
      final old = _appointments[index];
      _appointments[index] = old.copyWith(
        status: AppointmentStatus.cancelled,
        specialNotes: reason.isNotEmpty ? 'Lý do hủy: $reason' : old.specialNotes,
      );
      return true;
    }
    return false;
  }

  /// Danh sách khung giờ hẹn chuẩn cho ngày
  static List<TimeSlotModel> getSlotsForDate(DateTime date) {
    return const [
      // SÁNG
      TimeSlotModel(
        id: 'slot-0830',
        time: '08:30 - 09:30',
        periodName: 'Sáng',
        period: SlotPeriod.morning,
        isAvailable: true,
      ),
      TimeSlotModel(
        id: 'slot-0930',
        time: '09:30 - 10:30',
        periodName: 'Sáng',
        period: SlotPeriod.morning,
        isAvailable: false, // đã kín
      ),
      TimeSlotModel(
        id: 'slot-1030',
        time: '10:30 - 11:30',
        periodName: 'Sáng',
        period: SlotPeriod.morning,
        isAvailable: true,
      ),
      // CHIỀU
      TimeSlotModel(
        id: 'slot-1330',
        time: '13:30 - 14:30',
        periodName: 'Chiều',
        period: SlotPeriod.afternoon,
        isAvailable: true,
      ),
      TimeSlotModel(
        id: 'slot-1400',
        time: '14:00 - 15:00',
        periodName: 'Chiều',
        period: SlotPeriod.afternoon,
        isAvailable: true, // Slot mặc định trong Figma
      ),
      TimeSlotModel(
        id: 'slot-1530',
        time: '15:30 - 16:30',
        periodName: 'Chiều',
        period: SlotPeriod.afternoon,
        isAvailable: false,
      ),
      TimeSlotModel(
        id: 'slot-1600',
        time: '16:00 - 17:00',
        periodName: 'Chiều',
        period: SlotPeriod.afternoon,
        isAvailable: true,
      ),
      // TỐI
      TimeSlotModel(
        id: 'slot-1730',
        time: '17:30 - 18:30',
        periodName: 'Tối',
        period: SlotPeriod.evening,
        isAvailable: true,
      ),
      TimeSlotModel(
        id: 'slot-1830',
        time: '18:30 - 19:30',
        periodName: 'Tối',
        period: SlotPeriod.evening,
        isAvailable: true,
      ),
      TimeSlotModel(
        id: 'slot-1930',
        time: '19:30 - 20:30',
        periodName: 'Tối',
        period: SlotPeriod.evening,
        isAvailable: false,
      ),
    ];
  }

  // Tương thích mã nguồn cũ
  static List<TimeSlotModel> getSlotsForDoctor(String doctorId, DateTime date) {
    return getSlotsForDate(date);
  }

  static double validateCoupon(String code, double currentPrice) {
    final normalized = code.trim().toUpperCase();
    if (normalized == 'MLD20' || normalized == 'HEALTHY20') {
      return currentPrice * 0.20;
    }
    if (normalized == 'VOUCHER50K') {
      return 50000.0;
    }
    return 0.0;
  }

  static AppointmentConfirmationModel confirmAppointment(BookingDraftModel draft) {
    final randomNum = 1000 + Random().nextInt(9000);
    final dateStr = '${draft.selectedDate.year}${draft.selectedDate.month.toString().padLeft(2, '0')}${draft.selectedDate.day.toString().padLeft(2, '0')}';
    final code = 'SPA-$dateStr-$randomNum';

    return AppointmentConfirmationModel(
      appointmentId: 'apt-${Random().nextInt(999999)}',
      bookingCode: code,
      doctorName: draft.doctor.name,
      doctorTitle: draft.doctor.title,
      doctorSpeciality: draft.doctor.speciality,
      clinicName: draft.clinic.name,
      clinicAddress: draft.clinic.address,
      roomNumber: 'Phòng Spa 204',
      appointmentDate: draft.selectedDate,
      slotTime: draft.selectedSlot?.time ?? '14:00 - 15:00',
      patientName: draft.patientName,
      patientPhone: draft.patientPhone,
      totalAmount: draft.finalPrice,
      paymentMethod: draft.paymentMethod,
      paymentStatus: 'Đã xác nhận',
      qrCodeData: code,
    );
  }
}
