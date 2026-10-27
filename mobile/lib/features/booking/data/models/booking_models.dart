import '../../../home/data/models/home_models.dart';

/// Các phân đoạn ca giờ trong ngày
enum SlotPeriod { morning, afternoon, evening }

/// Trạng thái lịch hẹn theo chuẩn Figma Group C
enum AppointmentStatus {
  pending, // Chờ xác nhận
  confirmed, // Đã xác nhận
  inService, // Đang phục vụ
  completed, // Hoàn thành
  cancelled, // Đã hủy
}

extension AppointmentStatusExtension on AppointmentStatus {
  String get label {
    switch (this) {
      case AppointmentStatus.pending:
        return 'Chờ xác nhận';
      case AppointmentStatus.confirmed:
        return 'Đã xác nhận';
      case AppointmentStatus.inService:
        return 'Đang phục vụ';
      case AppointmentStatus.completed:
        return 'Hoàn thành';
      case AppointmentStatus.cancelled:
        return 'Đã hủy';
    }
  }

  String get shortLabel {
    switch (this) {
      case AppointmentStatus.pending:
        return 'Chờ xác nhận';
      case AppointmentStatus.confirmed:
        return 'Đã xác nhận';
      case AppointmentStatus.inService:
        return 'Đang phục vụ';
      case AppointmentStatus.completed:
        return 'Hoàn thành';
      case AppointmentStatus.cancelled:
        return 'Đã hủy';
    }
  }
}

/// 1. Mô hình Khung giờ hẹn làm dịch vụ Spa
class TimeSlotModel {
  final String id;
  final String time; // VD: "14:00 - 15:00"
  final String periodName; // "Sáng", "Chiều", "Tối"
  final SlotPeriod period;
  final bool isAvailable;
  final String? subtext; // "Đã đặt", "Không khả dụng", "Kín lịch"...
  final String? unavailableReason; // Lý do chi tiết: "Chuyên viên đang có lịch hẹn với khách hàng khác"

  const TimeSlotModel({
    required this.id,
    required this.time,
    required this.periodName,
    required this.period,
    this.isAvailable = true,
    this.subtext,
    this.unavailableReason,
  });
}

/// 2. Dòng sự kiện tiến trình lịch hẹn (Booking Timeline)
class BookingTimelineEvent {
  final String title;
  final String description;
  final DateTime? timestamp;
  final bool isCompleted;
  final bool isCurrent;

  const BookingTimelineEvent({
    required this.title,
    this.description = '',
    this.timestamp,
    this.isCompleted = false,
    this.isCurrent = false,
  });
}

/// 3. Mô hình Lịch hẹn Hoàn chỉnh (Dùng cho C09 Lịch hẹn của tôi & C10 Chi tiết lịch hẹn)
class AppointmentItemModel {
  final String id;
  final String bookingCode; // 'SPA-DEMO-000128'
  final String? branchId;
  final String? serviceId;
  final String? technicianId;
  final String serviceName; // 'Massage thư giãn toàn thân'
  final String serviceImage;
  final int durationMinutes; // 60
  final String branchName; // 'Chi nhánh Quận 3'
  final String branchAddress; // '123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh'
  final String branchPhone; // '0901 234 567'
  final String specialistName; // 'Trần Minh Phương'
  final String specialistTitle; // 'Kỹ thuật viên massage'
  final String specialistAvatar;
  final DateTime appointmentDate;
  final String timeSlot; // '14:00 - 15:00'
  final String customerName;
  final String customerPhone;
  final String customerEmail;
  final String specialNotes;
  final double totalAmount; // 450.000đ
  final double depositAmount; // 150.000đ
  final double remainingAmount; // 300.000đ
  final String paymentMethod; // 'Chuyển khoản ngân hàng / QR'
  final AppointmentStatus status;
  final DateTime createdAt;
  final List<BookingTimelineEvent> timeline;

  const AppointmentItemModel({
    required this.id,
    required this.bookingCode,
    this.branchId,
    this.serviceId,
    this.technicianId,
    required this.serviceName,
    required this.serviceImage,
    this.durationMinutes = 60,
    required this.branchName,
    required this.branchAddress,
    this.branchPhone = '0901 234 567',
    required this.specialistName,
    this.specialistTitle = 'Kỹ thuật viên massage',
    required this.specialistAvatar,
    required this.appointmentDate,
    required this.timeSlot,
    required this.customerName,
    required this.customerPhone,
    this.customerEmail = '',
    this.specialNotes = '',
    required this.totalAmount,
    required this.depositAmount,
    required this.remainingAmount,
    this.paymentMethod = 'Chuyển khoản ngân hàng / QR',
    this.status = AppointmentStatus.confirmed,
    required this.createdAt,
    this.timeline = const [],
  });

  AppointmentItemModel copyWith({
    String? id,
    String? bookingCode,
    String? branchId,
    String? serviceId,
    String? technicianId,
    String? serviceName,
    String? serviceImage,
    int? durationMinutes,
    String? branchName,
    String? branchAddress,
    String? branchPhone,
    String? specialistName,
    String? specialistTitle,
    String? specialistAvatar,
    DateTime? appointmentDate,
    String? timeSlot,
    String? customerName,
    String? customerPhone,
    String? customerEmail,
    String? specialNotes,
    double? totalAmount,
    double? depositAmount,
    double? remainingAmount,
    String? paymentMethod,
    AppointmentStatus? status,
    DateTime? createdAt,
    List<BookingTimelineEvent>? timeline,
  }) {
    return AppointmentItemModel(
      id: id ?? this.id,
      bookingCode: bookingCode ?? this.bookingCode,
      branchId: branchId ?? this.branchId,
      serviceId: serviceId ?? this.serviceId,
      technicianId: technicianId ?? this.technicianId,
      serviceName: serviceName ?? this.serviceName,
      serviceImage: serviceImage ?? this.serviceImage,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      branchName: branchName ?? this.branchName,
      branchAddress: branchAddress ?? this.branchAddress,
      branchPhone: branchPhone ?? this.branchPhone,
      specialistName: specialistName ?? this.specialistName,
      specialistTitle: specialistTitle ?? this.specialistTitle,
      specialistAvatar: specialistAvatar ?? this.specialistAvatar,
      appointmentDate: appointmentDate ?? this.appointmentDate,
      timeSlot: timeSlot ?? this.timeSlot,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      customerEmail: customerEmail ?? this.customerEmail,
      specialNotes: specialNotes ?? this.specialNotes,
      totalAmount: totalAmount ?? this.totalAmount,
      depositAmount: depositAmount ?? this.depositAmount,
      remainingAmount: remainingAmount ?? this.remainingAmount,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      timeline: timeline ?? this.timeline,
    );
  }
}

/// 4. Quản lý trạng thái xuyên suốt luồng đặt lịch (BookingFlowState)
class BookingFlowState {
  String? bookingCode;
  SpaServiceModel? selectedService;
  List<SpaServiceModel> selectedServices;
  BranchModel? selectedBranch;
  TechnicianModel? selectedSpecialist; // null = Để trung tâm sắp xếp
  bool autoAssignSpecialist;
  DateTime selectedDate;
  TimeSlotModel? selectedSlot;
  bool isForSelf;
  String customerName;
  String customerPhone;
  String customerEmail;
  String specialNotes;
  bool payFullAmount; // false: cọc 150k, true: trả hết
  String paymentMethod; // 'BANK_TRANSFER_QR', 'ONLINE', 'AT_BRANCH', 'PREPAID_PACKAGE'
  bool usePrepaidPackage; // Sử dụng gói liệu trình đã mua
  String? prepaidPackageName;
  String? voucherCode;
  double voucherDiscount;
  String specialRequests; // Yêu cầu đặc biệt (tùy chọn)
  bool isFirstTime; // Lần đầu tiên đến trung tâm
  String accessibilityNeeds; // Hỗ trợ tiếp cận (tùy chọn)
  String otherNotes; // Ghi chú khác (tùy chọn)
  bool consentShareNeeds; // Đồng ý chia sẻ nhu cầu hỗ trợ
  bool agreeTerms; // Đồng ý với điều khoản dịch vụ
  int guestCount; // Số lượng người trị liệu (mặc định 1)

  BookingFlowState({
    this.bookingCode,
    this.selectedService,
    List<SpaServiceModel>? selectedServices,
    this.selectedBranch,
    this.selectedSpecialist,
    this.autoAssignSpecialist = false,
    DateTime? selectedDate,
    this.selectedSlot,
    this.isForSelf = true,
    this.customerName = '',
    this.customerPhone = '',
    this.customerEmail = '',
    this.specialNotes = '',
    this.payFullAmount = false,
    this.paymentMethod = 'BANK_TRANSFER_QR',
    this.usePrepaidPackage = false,
    this.prepaidPackageName,
    this.voucherCode,
    this.voucherDiscount = 0.0,
    this.specialRequests = '',
    this.isFirstTime = false,
    this.accessibilityNeeds = '',
    this.otherNotes = '',
    this.consentShareNeeds = false,
    this.agreeTerms = true,
    this.guestCount = 1,
  })  : selectedServices = selectedServices ?? (selectedService != null ? [selectedService] : []),
        selectedDate = selectedDate ?? DateTime.now();

  List<SpaServiceModel> get allSelectedServices {
    if (selectedServices.isNotEmpty) return selectedServices;
    if (selectedService != null) return [selectedService!];
    return [];
  }

  int get totalDurationMinutes {
    final list = allSelectedServices;
    if (list.isEmpty) return selectedService?.durationMinutes ?? 0;
    return list.fold(0, (sum, s) => sum + s.durationMinutes);
  }

  double get rawServicePrice {
    final list = allSelectedServices;
    final basePrice = list.isEmpty
        ? (selectedService?.displayPrice ?? 0.0)
        : list.fold(0.0, (sum, s) => sum + s.displayPrice);
    final count = guestCount > 0 ? guestCount : 1;
    return basePrice * count;
  }

  double get servicePrice {
    final raw = rawServicePrice - voucherDiscount;
    return raw > 0 ? raw : 0.0;
  }

  double get depositAmount => 0.0;
  double get payableNow => 0.0;
  double get remainingAmount => servicePrice;

  BookingFlowState copyWith({
    String? bookingCode,
    SpaServiceModel? selectedService,
    BranchModel? selectedBranch,
    TechnicianModel? selectedSpecialist,
    bool? autoAssignSpecialist,
    DateTime? selectedDate,
    TimeSlotModel? selectedSlot,
    bool? isForSelf,
    String? customerName,
    String? customerPhone,
    String? customerEmail,
    String? specialNotes,
    bool? payFullAmount,
    String? paymentMethod,
    int? guestCount,
  }) {
    return BookingFlowState(
      bookingCode: bookingCode ?? this.bookingCode,
      selectedService: selectedService ?? this.selectedService,
      selectedBranch: selectedBranch ?? this.selectedBranch,
      selectedSpecialist: selectedSpecialist ?? this.selectedSpecialist,
      autoAssignSpecialist: autoAssignSpecialist ?? this.autoAssignSpecialist,
      selectedDate: selectedDate ?? this.selectedDate,
      selectedSlot: selectedSlot ?? this.selectedSlot,
      isForSelf: isForSelf ?? this.isForSelf,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      customerEmail: customerEmail ?? this.customerEmail,
      specialNotes: specialNotes ?? this.specialNotes,
      payFullAmount: payFullAmount ?? this.payFullAmount,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      guestCount: guestCount ?? this.guestCount,
    );
  }
}

/// 5. Mô hình Đặt lịch Spa tương thích mã nguồn cũ
class SpaBookingDraftModel {
  TechnicianModel doctor;
  BranchModel clinic;
  final SpaServiceModel? service;
  final TreatmentPackageModel? selectedPackage;
  DateTime selectedDate;
  TimeSlotModel? selectedSlot;
  String customerName;
  String customerPhone;
  String specialNotes;
  String? symptomsDescription;
  bool isForSelf;
  String? couponCode;
  double discountAmount;
  String paymentMethod;

  SpaBookingDraftModel({
    required this.doctor,
    required this.clinic,
    this.service,
    this.selectedPackage,
    required this.selectedDate,
    this.selectedSlot,
    this.customerName = '',
    this.customerPhone = '',
    this.specialNotes = '',
    this.symptomsDescription,
    this.isForSelf = true,
    this.couponCode,
    this.discountAmount = 0.0,
    this.paymentMethod = 'CASH_AT_SPA',
  });

  String get patientName => customerName;
  set patientName(String val) => customerName = val;
  String get patientPhone => customerPhone;
  set patientPhone(String val) => customerPhone = val;
  String get reasonForVisit => specialNotes;
  set reasonForVisit(String val) => specialNotes = val;

  TechnicianModel get technician => doctor;
  set technician(TechnicianModel val) => doctor = val;
  BranchModel get branch => clinic;
  set branch(BranchModel val) => clinic = val;

  double get basePrice => selectedPackage?.price ?? (service?.displayPrice ?? doctor.consultationFee);
  double get finalPrice => (basePrice - discountAmount).clamp(0, double.infinity);
}

/// 6. Mô hình Xác nhận Đặt lịch Thành công tương thích
class SpaBookingConfirmationModel {
  final String appointmentId;
  final String bookingCode;
  final String doctorName;
  final String doctorTitle;
  final String doctorSpeciality;
  final String clinicName;
  final String clinicAddress;
  final String roomNumber;
  final DateTime appointmentDate;
  final String slotTime;
  final String patientName;
  final String patientPhone;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final String qrCodeData;

  const SpaBookingConfirmationModel({
    required this.appointmentId,
    required this.bookingCode,
    required this.doctorName,
    required this.doctorTitle,
    this.doctorSpeciality = 'Chăm sóc da & Dưỡng sinh',
    required this.clinicName,
    required this.clinicAddress,
    this.roomNumber = 'Phòng Spa 204',
    required this.appointmentDate,
    required this.slotTime,
    required this.patientName,
    required this.patientPhone,
    required this.totalAmount,
    required this.paymentMethod,
    this.paymentStatus = 'Đã xác nhận',
    required this.qrCodeData,
  });

  String get bookingId => appointmentId;
  String get serviceName => doctorTitle;
  String get technicianName => doctorName;
  String get branchName => clinicName;
  String get branchAddress => clinicAddress;
  DateTime get bookingDate => appointmentDate;
  String get timeSlot => slotTime;
  double get totalPrice => totalAmount;
  String get qrCodeHash => qrCodeData;
}

typedef BookingDraftModel = SpaBookingDraftModel;
typedef AppointmentConfirmationModel = SpaBookingConfirmationModel;
