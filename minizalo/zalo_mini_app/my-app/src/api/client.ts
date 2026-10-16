import { getAccessToken, getPhoneNumber, getUserInfo, nativeStorage } from 'zmp-sdk';
import { adaptPayload, profileToCanonical } from './adapters';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://mld-miniapp-api.onrender.com/api').replace(/\/$/, '');
const SESSION_KEY = 'mld_miniapp_session_v2';
let memoryToken: string | null = null;
const session = {
  get() {
    if (memoryToken !== null) return memoryToken;
    try { return nativeStorage.getItem(SESSION_KEY) || ''; }
    catch { return ''; }
  },
  set(token: string) {
    memoryToken = token;
    try { nativeStorage.setItem(SESSION_KEY, token); } catch { /* Keep this session in memory. */ }
  },
  clear() {
    memoryToken = '';
    try { nativeStorage.removeItem(SESSION_KEY); } catch { /* Storage may be unavailable in preview. */ }
  },
};
const fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = session.get();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response: Response;
  try {
    response = await window.fetch(input, { ...init, headers, signal: init.signal ?? controller.signal });
  } finally { clearTimeout(timeout); }
  const envelope = await response.json();
  const successful = response.ok && envelope.success === true;
  const payload = successful ? adaptPayload(envelope.data || {})
    : { error: envelope.message || 'Không thể tải dữ liệu. Vui lòng thử lại.', status: envelope.statusCode || response.status };
  if (response.status === 401) session.clear();
  if (successful && payload.token && payload.user) session.set(payload.token);
  return new Response(JSON.stringify(payload), {
    status: successful ? 200 : (response.ok ? 400 : response.status),
    headers: { 'Content-Type': 'application/json' },
  });
};
const responseJson = async (res: Response) => res.json();

export const apiClient = {
  async getAppMetadata() {
    try { return await responseJson(await fetch(`${API_BASE_URL}/app-metadata`)); }
    catch { return { error: 'Không thể tải danh mục và cấu hình ứng dụng.' }; }
  },
  async getSettings() {
    try { return await responseJson(await fetch(`${API_BASE_URL}/auth/settings`)); }
    catch { return { error: 'Không thể tải thiết lập.' }; }
  },
  async updateSettings(settings: Record<string, unknown>) {
    try { return await responseJson(await fetch(`${API_BASE_URL}/auth/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })); }
    catch { return { error: 'Không thể lưu thiết lập.' }; }
  },
  async getSupportFaqs() {
    try { return await responseJson(await fetch(`${API_BASE_URL}/support-faqs`)); }
    catch { return { error: 'Không thể tải câu hỏi thường gặp.' }; }
  },
  async createConsultationSurvey(body: Record<string, unknown>) {
    try { return await responseJson(await fetch(`${API_BASE_URL}/consultation-surveys`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })); }
    catch { return { error: 'Không thể lưu khảo sát.' }; }
  },
  async getConsultationSurveys() {
    try { return await responseJson(await fetch(`${API_BASE_URL}/consultation-surveys`)); }
    catch { return { error: 'Không thể tải khảo sát đã lưu.' }; }
  },
  async getMyReviews() {
    try { return await responseJson(await fetch(`${API_BASE_URL}/reviews/mine`)); }
    catch { return { error: 'Không thể tải đánh giá của bạn.' }; }
  },
  async createReview(body: Record<string, unknown>) {
    try { return await responseJson(await fetch(`${API_BASE_URL}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })); }
    catch { return { error: 'Không thể gửi đánh giá.' }; }
  },
  async saveLessonProgress(courseId: string, lessonId: string, body: { watchedSeconds: number; isCompleted?: boolean; studentNotes?: string }) {
    try { return await responseJson(await fetch(`${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })); }
    catch { return { error: 'Không thể lưu tiến trình học.' }; }
  },
  async loginWithZalo(requestConsent = false) {
    try {
      if (!requestConsent) {
        if (memoryToken) {
          const current = await apiClient.getCurrentUser();
          if (current?.user) return { ...current, token: session.get() };
        }
        return { needsConsent: true, error: 'Tiếp tục với Zalo và cho phép chia sẻ số điện thoại để kết nối hồ sơ.' };
      }
      // Reverify the current Zalo account on launch, even if a JWT was cached.
      session.clear();
      // Editable profile suggestions only, never a trusted phone/UUID identity.
      let suggestedName = '';
      let suggestedAvatar = '';
      try {
        const { userInfo } = await getUserInfo({ autoRequestPermission: true, avatarType: 'large' });
        suggestedName = userInfo?.name?.trim().slice(0, 150) || '';
        const avatar = new URL(userInfo?.avatar || '');
        if (avatar.protocol === 'https:' && !avatar.username && !avatar.password) suggestedAvatar = avatar.href;
      } catch { /* Profile sharing is optional; phone verification remains required. */ }
      // Request permissions only after a user action. No phone input or OTP.
      const { token: phoneToken } = await getPhoneNumber();
      if (!phoneToken) return { error: 'Bạn chưa cho phép Zalo chia sẻ số điện thoại.' };
      const accessToken = await getAccessToken();
      const res = await fetch(`${API_BASE_URL}/auth/zalo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, phoneToken }),
      });
      const data = await responseJson(res);
      if (data.token) session.set(data.token);
      return data.registrationRequired ? { ...data, suggestedName, suggestedAvatar } : data;
    } catch (error) {
      const zaloError = error as { code?: number | string; message?: string };
      const code = zaloError?.code !== undefined ? ` (mã ${zaloError.code})` : '';
      return { error: `${zaloError?.message || 'Không thể kết nối tài khoản Zalo'}${code}` };
    }
  },

  logout() {
    session.clear();
  },
  async registerZaloProfile(registrationToken: string, profile: { fullName: string; email?: string; dateOfBirth?: string; gender?: string; avatarUrl?: string; purpose?: string }) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/zalo/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, registrationToken }),
      });
      return await responseJson(res);
    } catch { return { error: 'Không thể lưu hồ sơ. Vui lòng thử lại.' }; }
  },
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
    } catch {
      return { error: 'Không thể kết nối máy chủ.' };
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

  async getSlots(branchId: string, date: string, serviceId: string, technicianId?: string) {
    try {
      const params = new URLSearchParams({ branchId, date, serviceId });
      if (technicianId) params.set('technicianId', technicianId);
      const res = await fetch(`${API_BASE_URL}/slots?${params}`, { cache: 'no-store' });
      return await responseJson(res);
    } catch {
      return { error: 'Không thể tải giờ hẹn. Vui lòng thử lại.' };
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

  async getCourseLearning(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(id)}/learning`, { cache: 'no-store' });
      return await responseJson(res);
    } catch {
      return { error: 'Không thể tải nội dung học tập. Vui lòng thử lại.' };
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

  async getSupportTickets() {
    try { return await responseJson(await fetch(`${API_BASE_URL}/support-tickets`)); }
    catch { return { error: 'Không thể tải yêu cầu hỗ trợ.' }; }
  },
  async createSupportTicket(subject: string, message: string) {
    try { return await responseJson(await fetch(`${API_BASE_URL}/support-tickets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, message }),
    })); }
    catch { return { error: 'Không thể gửi yêu cầu hỗ trợ.' }; }
  },
  async getCareGuidelines() {
    try { return await responseJson(await fetch(`${API_BASE_URL}/care-guidelines`)); }
    catch { return { error: 'Không thể tải hướng dẫn chăm sóc.' }; }
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

  async updateProfile(profileData: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileToCanonical(profileData)),
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

};

