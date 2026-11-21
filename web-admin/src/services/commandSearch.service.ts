import { adminApi } from '../admin/api';

export interface CommandSearchCustomer {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: string;
  referralCode?: string | null;
}

export interface CommandSearchInvoice {
  id: string;
  invoiceCode: string;
  totalAmount: number;
  paymentStatus: string;
  sourceKind: string;
  customerName: string;
}

export interface CommandSearchEnrollment {
  id: string;
  studentCode: string;
  studentName: string;
  phone?: string | null;
  status: string;
  courseTitle?: string;
}

export interface CommandSearchBooking {
  id: string;
  bookingCode: string;
  bookingDate: string;
  startTime: string;
  status: string;
  customerName: string;
}

export interface CommandSearchResult {
  query: string;
  customers: CommandSearchCustomer[];
  invoices: CommandSearchInvoice[];
  enrollments: CommandSearchEnrollment[];
  bookings: CommandSearchBooking[];
}

const EMPTY_RESULT: CommandSearchResult = {
  query: '',
  customers: [],
  invoices: [],
  enrollments: [],
  bookings: [],
};

export const commandSearchService = {
  async search(query: string, signal?: AbortSignal): Promise<CommandSearchResult> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return EMPTY_RESULT;
    }
    const params = new URLSearchParams({ q: trimmed });
    const result = await adminApi<CommandSearchResult>(
      'command-search?' + params.toString(),
      undefined,
      signal,
    );
    return {
      query: result?.query || trimmed,
      customers: Array.isArray(result?.customers) ? result.customers : [],
      invoices: Array.isArray(result?.invoices) ? result.invoices : [],
      enrollments: Array.isArray(result?.enrollments) ? result.enrollments : [],
      bookings: Array.isArray(result?.bookings) ? result.bookings : [],
    };
  },
};
