export interface ConsultationSurveyRecord {
  id?: string;
  booking_id?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  has_sensitive_skin?: boolean;
  has_oil_allergy?: boolean;
  allergy_details?: string | null;
  pressure_pref?: string | null;
  focus_areas?: unknown;
  special_requests?: string | null;
  created_at?: string | null;
}

export interface StaffScheduleSlot {
  technicianId: string;
  technicianName: string;
  start: string;
  end: string;
  roomId?: string;
  roomName: string;
  bed: string;
  bedId?: string;
}

export interface StaffScheduleSlotCapacity {
  start: string;
  end: string;
  totalBeds: number;
  freeBeds: number;
  freeStaff: number;
  remainingCapacity: number;
  availableTechnicianIds: string[];
}

export interface OnLeaveTechnician {
  technicianId: string;
  fullName: string;
  reason?: string;
}

export function findCustomerConsultationSurvey<T extends ConsultationSurveyRecord>(
  surveys: T[],
  criteria: {
    bookingId?: string | null;
    customerId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
  },
): T | null {
  if (!Array.isArray(surveys) || surveys.length === 0) return null;
  const bookingId = String(criteria.bookingId || '').trim();
  const customerId = String(criteria.customerId || '').trim();
  const customerPhone = String(criteria.customerPhone || '').replace(/\D+/g, '');
  const customerName = String(criteria.customerName || '').trim().toLowerCase();

  if (bookingId) {
    const byBooking = surveys.find((s) => s.booking_id === bookingId);
    if (byBooking) return byBooking;
  }
  if (customerId) {
    const byCustomerId = surveys.find((s) => s.customer_id === customerId);
    if (byCustomerId) return byCustomerId;
  }
  if (customerPhone) {
    const byPhone = surveys.find(
      (s) => String(s.customer_phone || '').replace(/\D+/g, '') === customerPhone,
    );
    if (byPhone) return byPhone;
  }
  if (customerName) {
    const byName = surveys.find(
      (s) => String(s.customer_name || '').trim().toLowerCase() === customerName,
    );
    if (byName) return byName;
  }
  return null;
}

export function buildTechnicianBookingOptions<T extends { id: string; fullName: string; title?: string }>(
  technicians: T[],
  capacity: StaffScheduleSlotCapacity | null | undefined,
  onLeaveTechnicians: OnLeaveTechnician[],
) {
  const leaveIds = new Set(onLeaveTechnicians.map((item) => item.technicianId));
  const availableIds = capacity ? new Set(capacity.availableTechnicianIds) : null;

  return technicians
    .map((tech) => {
      const isOnLeave = leaveIds.has(tech.id);
      const isAvailable = availableIds ? availableIds.has(tech.id) && !isOnLeave : !isOnLeave;
      return {
        technician: tech,
        isOnLeave,
        isAvailable,
      };
    })
    .sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      if (a.isOnLeave !== b.isOnLeave) return a.isOnLeave ? 1 : -1;
      return a.technician.fullName.localeCompare(b.technician.fullName, 'vi');
    });
}
