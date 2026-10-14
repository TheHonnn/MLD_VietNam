import { getAccessToken, getUserInfo } from 'zmp-sdk';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://mld-api.onrender.com/api').replace(/\/$/, '');
const SESSION_KEY = 'mld_session_token';
const fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = localStorage.getItem(SESSION_KEY);
  return window.fetch(input, { ...init, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) } });
};

const responseJson = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ...data, error: data.error || 'Có lỗi xảy ra. Vui lòng thử lại.', status: res.status };
  return data;
};

export const apiClient = {
  async loginWithZalo(requestProfilePermission = false) {
    try {
      // This API owns the user-info consent dialog. Calling authorize first can
      // create two permission requests during the same button interaction.
      const profile = await getUserInfo({
        autoRequestPermission: requestProfilePermission,
        avatarType: 'large',
      });
      const accessToken = await getAccessToken();
      const res = await fetch(`${API_BASE_URL}/auth/zalo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, userInfo: profile?.userInfo }),
      });
      const data = await responseJson(res);
      if (data.token) localStorage.setItem(SESSION_KEY, data.token);
      return data;
    } catch (error) {
      console.error('[AUTH] Zalo login failed', error);
      const zaloError = error as { code?: number | string; message?: string };
      const code = zaloError?.code !== undefined ? ` (mã ${zaloError.code})` : '';
      return { error: `${zaloError?.message || 'Không thể kết nối tài khoản Zalo'}${code}` };
    }
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
    } catch {
      return { status: 'mock' };
    }
  },

  async getServices(category?: string, search?: string) {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      const res = await fetch(`${API_BASE_URL}/services?${params.toString()}`);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return null;
    }
  },

  async getDoctors() {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors`);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return null;
    }
  },

  async getBranches() {
    try {
      const res = await fetch(`${API_BASE_URL}/branches`);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return null;
    }
  },

  async createBooking(data: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await responseJson(res);
    } catch {
      return { error: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.' };
    }
  },

  async getBookings() {
    try {
      const res = await fetch(`${API_BASE_URL}/bookings`);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return null;
    }
  },

  async rescheduleBooking(id: string, date: string, timeSlot: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, timeSlot }),
      });
      return await responseJson(res);
    } catch (error) {
      console.error('[API] rescheduleBooking failed', error);
      return { error: 'Không thể kết nối máy chủ. Vui lòng thử lại.' };
    }
  },

  async cancelBooking(id: string, reason?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      return await responseJson(res);
    } catch (error) {
      console.error('[API] cancelBooking failed', error);
      return { error: 'Không thể kết nối máy chủ. Vui lòng thử lại.' };
    }
  },

  async getCourses() {
    try {
      const res = await fetch(`${API_BASE_URL}/courses`);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return null;
    }
  },

  async submitQuiz(courseId: string, answers: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/courses/${courseId}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return null;
    }
  },

  async getMedicalRecords() {
    try {
      const res = await fetch(`${API_BASE_URL}/records`);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return null;
    }
  },

  async getMembership() {
    try {
      const res = await fetch(`${API_BASE_URL}/membership`, { cache: 'no-store' });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return null;
    }
  },

  async getTreatmentPlans() {
    try {
      const res = await fetch(`${API_BASE_URL}/treatment-plans`, { cache: 'no-store' });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return null;
    }
  },

  async getTransactions() {
    try {
      const res = await fetch(`${API_BASE_URL}/transactions`, { cache: 'no-store' });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return null;
    }
  },

  async claimVoucher(code: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/vouchers/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      return await res.json();
    } catch {
      return { error: 'Không thể kết nối máy chủ' };
    }
  },

  async applyVoucher(code: string, orderValue: number, scope: 'service' | 'course', category = '') {
    try {
      const res = await fetch(`${API_BASE_URL}/vouchers/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orderValue, scope, category }),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async sendOtp(phone: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      return await res.json();
    } catch {
      return { otpDemo: '246800' };
    }
  },

  async verifyOtp(phone: string, otp: string, role = 'patient') {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, role }),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async login(phone: string, role = 'patient') {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role }),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateProfile(profileData: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      return await responseJson(res);
    } catch {
      return { error: 'Không thể kết nối máy chủ. Vui lòng thử lại.' };
    }
  },

  async getCurrentUser() {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`);
      return await responseJson(res);
    } catch {
      return null;
    }
  },

  async getCourseEnrollments() {
    try {
      const res = await fetch(`${API_BASE_URL}/course-enrollments`);
      return await responseJson(res);
    } catch {
      return null;
    }
  },

  async enrollCourse(data: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/course-enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await responseJson(res);
    } catch {
      return { error: 'Không thể kết nối máy chủ. Vui lòng thử lại.' };
    }
  },

  async getNotifications() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`);
      return await responseJson(res);
    } catch {
      return null;
    }
  },

  async markNotificationRead(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PATCH' });
      return await responseJson(res);
    } catch {
      return null;
    }
  },

  async markAllNotificationsRead() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, { method: 'PATCH' });
      return await responseJson(res);
    } catch {
      return null;
    }
  },

  async getAdminOverview() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/overview`);
      return await res.json();
    } catch {
      return null;
    }
  },

  async getAdminSchedule() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/schedule`);
      return await res.json();
    } catch {
      return null;
    }
  },

  async getAdminReceipts() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/receipts`);
      return await res.json();
    } catch {
      return null;
    }
  },

  async createAdminReceipt(data: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async getAdminStudents() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/students`);
      return await res.json();
    } catch {
      return null;
    }
  },
};

