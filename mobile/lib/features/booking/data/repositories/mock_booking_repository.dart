import '../models/booking_models.dart';
import 'booking_repository.dart';

/// Legacy Mock Repository maintained for backward compatibility.
/// Delegates all state and operations to the real BookingRepository connected to Backend.
class MockBookingRepository {
  static final MockBookingRepository _instance = MockBookingRepository._internal();
  factory MockBookingRepository() => _instance;
  MockBookingRepository._internal();

  final BookingRepository _realRepo = BookingRepository.instance;

  List<AppointmentItemModel> getAppointments({AppointmentStatus? status}) =>
      _realRepo.getAppointments(status: status);

  List<AppointmentItemModel> getUpcomingAppointments() =>
      _realRepo.getUpcomingAppointments();

  List<AppointmentItemModel> getCompletedAppointments() =>
      _realRepo.getCompletedAppointments();

  List<AppointmentItemModel> getCancelledAppointments() =>
      _realRepo.getCancelledAppointments();

  AppointmentItemModel? getAppointmentById(String id) =>
      _realRepo.getAppointmentById(id);

  void createAppointment(AppointmentItemModel appointment) =>
      _realRepo.createAppointment(appointment);

  AppointmentItemModel createAppointmentFromFlow(BookingFlowState flow) =>
      _realRepo.createAppointmentFromFlow(flow);

  bool rescheduleAppointment(
    String id,
    DateTime newDate,
    String newTimeSlot, {
    String? newSpecialistName,
    String? newSpecialistTitle,
    String? newSpecialistAvatar,
  }) {
    _realRepo.rescheduleAppointment(
      id,
      newDate,
      newTimeSlot,
      newSpecialistName: newSpecialistName,
      newSpecialistTitle: newSpecialistTitle,
      newSpecialistAvatar: newSpecialistAvatar,
    );
    return true;
  }

  bool cancelAppointment(String id, String reason) {
    _realRepo.cancelAppointment(id, reason);
    return true;
  }

  static List<TimeSlotModel> getSlotsForDate(DateTime date) =>
      BookingRepository.getSlotsForDate(date);

  static List<TimeSlotModel> getSlotsForDoctor(String doctorId, DateTime date) =>
      BookingRepository.getSlotsForDoctor(doctorId, date);

  static List<TimeSlotModel> getSlotsForSpecialist({
    required String specialistName,
    required DateTime date,
  }) =>
      BookingRepository.getSlotsForSpecialist(
        specialistName: specialistName,
        date: date,
      );

  static List<TimeSlotModel> getSlotsForRandomAssignment({
    required DateTime date,
  }) =>
      BookingRepository.getSlotsForRandomAssignment(date: date);

  static double validateCoupon(String code, double currentPrice) =>
      BookingRepository.validateCoupon(code, currentPrice);

  static AppointmentConfirmationModel confirmAppointment(BookingDraftModel draft) =>
      BookingRepository.confirmAppointment(draft);
}
