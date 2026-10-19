import { getAccessToken, getPhoneNumber, getUserInfo, nativeStorage } from 'zmp-sdk';
import { adaptPayload, profileToCanonical } from './adapters';
import { ReadCache } from './read-cache';
import { preloadCatalogImages } from './preload-images';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'mld_miniapp_session_v2';
let memoryToken: string | null = null;
let sessionEpoch = 0;
type ReadResponse = { status: number; payload: Record<string, any>; cacheable?: boolean };
const readCache = new ReadCache<ReadResponse>(60000, 256, value => value.status === 200 && !value.payload.error && value.cacheable === true);
const publicReads = new Set(['/app-metadata','/services','/doctors','/branches','/courses','/care-guidelines','/support-faqs','/search/popular']);
const privateReads = new Set(['/auth/settings','/bookings','/records','/membership','/notifications','/treatment-plans','/transactions','/course-enrollments','/support-tickets','/consultation-surveys','/reviews/mine','/search/history']);
const validReadPayload = (path: string, payload: Record<string,any>) => {
  const listFields: Record<string,string> = {'/services':'services','/doctors':'doctors','/branches':'branches','/courses':'courses','/care-guidelines':'guidelines','/support-faqs':'faqs','/search/popular':'popularSearches','/bookings':'bookings','/records':'records','/notifications':'notifications','/treatment-plans':'treatmentPlans','/course-enrollments':'enrollments','/support-tickets':'tickets','/consultation-surveys':'surveys','/reviews/mine':'reviews','/search/history':'history'};
  if (listFields[path]) return Array.isArray(payload[listFields[path]]);
  if (path === '/auth/settings') return payload.settings === null || (typeof payload.settings === 'object' && Boolean(payload.settings));
  if (path === '/app-metadata') return ['serviceCategories','courseCategories','instructors'].every(field=>Array.isArray(payload[field]));
  if (path === '/membership') return Boolean(payload.user?.id && payload.summary);
  if (path === '/transactions') return Array.isArray(payload.invoices) && Array.isArray(payload.pointTransactions) && payload.totalSpent != null && Number.isFinite(Number(payload.totalSpent));
  if (/^\/courses\/[^/]+\/learning$/.test(path)) return Boolean(payload.course?.id && Array.isArray(payload.course.lessons));
  return false;
};
const relativePath = (url: URL) => url.pathname.slice(new URL(API_BASE_URL).pathname.replace(/\/$/,'').length);
const cacheKey = (url: URL, token = session.get()) => {
  const path = relativePath(url);
  const scope = publicReads.has(path) ? 'public' : privateReads.has(path) || /^\/courses\/[^/]+\/learning$/.test(path) ? 'private' : '';
  if (!scope) return null;
  const canonical = new URL(url); canonical.searchParams.sort(); canonical.search = canonical.searchParams.toString();
  return `${scope === 'public' ? 'public' : `private:${token}`}\n${canonical.href}`;
};
const invalidatePaths = (paths: string[]) => readCache.invalidate(key => {
  const url = new URL(key.slice(key.indexOf('\n') + 1));
  return paths.some(path => relativePath(url) === path || relativePath(url).startsWith(path + '/'));
});
const invalidateMutation = (path: string) => {
  if (path === '/vouchers/apply') return;
  if (path.startsWith('/search/history')) return invalidatePaths(['/search/history','/search/popular']);
  if (path.startsWith('/notifications')) return invalidatePaths(['/notifications']);
  if (path === '/auth/settings') return invalidatePaths(['/auth/settings']);
  if (path === '/auth/profile') return invalidatePaths(['/membership']);
  if (path.startsWith('/bookings')) return invalidatePaths(['/bookings','/membership','/notifications','/records','/treatment-plans']);
  if (path === '/course-enrollments') return invalidatePaths(['/course-enrollments','/courses','/membership','/notifications']);
  const course = path.match(/^\/courses\/([^/]+)\//);
  if (course) return invalidatePaths([`/courses/${course[1]}/learning`,'/course-enrollments']);
  if (path === '/reviews') return invalidatePaths(['/reviews/mine','/services','/doctors','/records','/treatment-plans']);
  if (path === '/consultation-surveys') return invalidatePaths(['/consultation-surveys']);
  if (path === '/support-tickets') return invalidatePaths(['/support-tickets']);
  if (path.startsWith('/vouchers')) return invalidatePaths(['/membership']);
  readCache.invalidate(key => key.startsWith('private:'));
};
const session = {
  get() {
    if (memoryToken !== null) return memoryToken;
    try { return nativeStorage.getItem(SESSION_KEY) || ''; }
    catch { return ''; }
  },
  set(token: string) {
    if (session.get() !== token) { sessionEpoch++; readCache.invalidate(key => key.startsWith('private:')); }
    memoryToken = token;
    try { nativeStorage.setItem(SESSION_KEY, token); } catch { /* Keep this session in memory. */ }
  },
  clear() {
    sessionEpoch++;
    readCache.invalidate(key => key.startsWith('private:'));
    memoryToken = '';
    try { nativeStorage.removeItem(SESSION_KEY); } catch { /* Storage may be unavailable in preview. */ }
  },
};
const fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is required');
  const token = session.get();
  const epoch = sessionEpoch;
  const url = new URL(String(input));
  const method = (init.method || 'GET').toUpperCase();
  const key = method === 'GET' && !init.signal ? cacheKey(url, token) : null;
  const load = async (): Promise<ReadResponse> => {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response: Response;
  let envelope: any;
  try {
    response = await window.fetch(input, { cache: 'no-store', ...init, headers, signal: controller.signal });
    envelope = await response.json();
  } finally { clearTimeout(timeout); init.signal?.removeEventListener('abort', abort); }
  const successful = response.ok && envelope.success === true;
  const payload = successful ? adaptPayload(envelope.data || {})
    : { error: response.status === 401 ? 'Vui lòng đăng nhập lại để tiếp tục.' : envelope.message || 'Không thể tải dữ liệu. Vui lòng thử lại.', status: envelope.statusCode || response.status };
  if (response.status === 401 && session.get() === token && sessionEpoch === epoch) session.clear();
  if (successful && method !== 'GET' && method !== 'HEAD') invalidateMutation(relativePath(url));
  if (successful && payload.token && payload.user) session.set(payload.token);
  if (key?.startsWith('private:') && (session.get() !== token || sessionEpoch !== epoch)) return {status:401,payload:{error:'Phiên đăng nhập đã thay đổi.',status:401}};
  return {status: successful ? 200 : (response.ok ? 400 : response.status),payload,cacheable:successful && validReadPayload(relativePath(url),payload)};
  };
  const result = key ? await readCache.read(key,load) : await load();
  return new Response(JSON.stringify(result.payload), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
const responseJson = async (res: Response) => res.json();

export const apiClient = {
  peek<T = any>(path: string): T | null {
    if (!API_BASE_URL) return null;
    const key = cacheKey(new URL(API_BASE_URL + path));
    return key ? readCache.peek(key)?.payload as T ?? null : null;
  },
  clearReadCache() { readCache.invalidate(); },

  async preloadPublicData() {
    const results = await Promise.all([apiClient.getAppMetadata(),apiClient.getServices(),apiClient.getDoctors(),apiClient.getBranches(),apiClient.getCourses(),apiClient.getCareGuidelines(),apiClient.getSupportFaqs(),apiClient.getPopularSearches()]);
    void preloadCatalogImages(results);
    return results;
  },
  async preloadPrivateData() {
    const owner = session.get(), epoch = sessionEpoch;
    const results = await Promise.all([apiClient.getMedicalRecords(),apiClient.getMembership(),apiClient.getBookings(),apiClient.getNotifications(),apiClient.getTreatmentPlans(),apiClient.getSettings(),apiClient.getTransactions(),apiClient.getSupportTickets(),apiClient.getConsultationSurveys(),apiClient.getMyReviews(),apiClient.getSearchHistory(),apiClient.getCourseEnrollments()]);
    const enrollments = results[results.length - 1]?.enrollments;
    const eligible = Array.isArray(enrollments) ? enrollments.filter((entry: any) => ['enrolled','studying','graduated'].includes(entry.status?.toLowerCase())) : [];
    let index = 0;
    const learning: any[] = [];
    await Promise.all(Array.from({length:Math.min(3,eligible.length)},async () => {
      while (index < eligible.length && session.get() === owner && sessionEpoch === epoch) {
        const entry = eligible[index++];
        learning.push(await apiClient.getCourseLearning(entry.courseId,entry.id));
      }
    }));
    return [...results,...learning];
  },
  async getPopularSearches() {
    try { return await responseJson(await fetch(`${API_BASE_URL}/search/popular`)); }
    catch { return {error:'Không thể tải tìm kiếm phổ biến.'}; }
  },
  async getSearchHistory() {
    try { return await responseJson(await fetch(`${API_BASE_URL}/search/history`)); }
    catch { return {error:'Không thể tải lịch sử tìm kiếm.'}; }
  },
  async saveSearchHistory(query: string) {
    try { return await responseJson(await fetch(`${API_BASE_URL}/search/history`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query})})); }
    catch { return {error:'Không thể lưu lịch sử tìm kiếm.'}; }
  },
  async deleteSearchHistory(id?: string) {
    try { return await responseJson(await fetch(`${API_BASE_URL}/search/history${id ? `/${encodeURIComponent(id)}` : ''}`, {method:'DELETE'})); }
    catch { return {error:'Không thể xóa lịch sử tìm kiếm.'}; }
  },
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
  async saveLessonProgress(courseId: string, lessonId: string, body: { watchedSeconds: number; isCompleted?: boolean; studentNotes?: string; enrollmentId?: string }) {
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

  async getBookingSlots(bookingId: string, date: string) {
    try { return await responseJson(await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/slots?${new URLSearchParams({ date })}`)); }
    catch { return { error: 'Không thể tải giờ đổi lịch. Vui lòng thử lại.' }; }
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

  async getCourseLearning(id: string, enrollmentId?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(id)}/learning${enrollmentId?`?enrollmentId=${encodeURIComponent(enrollmentId)}`:''}`, { cache: 'no-store' });
      return await responseJson(res);
    } catch {
      return { error: 'Không thể tải nội dung học tập. Vui lòng thử lại.' };
    }
  },

  async submitQuiz(courseId: string, answers: any, quizId?: string, enrollmentId?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/courses/${courseId}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, quizId, enrollmentId }),
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

