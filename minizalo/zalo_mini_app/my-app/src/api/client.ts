import { getAccessToken, getPhoneNumber, getUserInfo, nativeStorage } from 'zmp-sdk';
import { adaptPayload, profileToCanonical } from './adapters';
import { ReadCache } from './read-cache';
import { preloadCatalogImages } from './preload-images';
import {bookingRequest,completeBookingRequest} from './booking-request';
import {apiErrorMessage} from './error-message';
import { abortable } from '../utils/async-control';
import { OwnerWriteQueue } from '../utils/owner-write-queue';
import {isMiniAppRole,isCustomerRole} from '../utils/staff';
import {certificateVerificationUrl as verificationLink} from '../utils/certificate-verification';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'mld_miniapp_session_v2';
let memoryToken: string | null = null;
let nativeSessionStorageAvailable=true;
let verifiedZaloSessionThisPage=false;
let verifiedContext='';
const accountContext=(account:{role?:unknown;staffAccess?:unknown;staffBranchId?:unknown})=>JSON.stringify([account.role,account.staffAccess===true,account.staffBranchId??null]);
let sessionEpoch = 0;
let authController: AbortController | null = null;
type ReadResponse = { status: number; payload: Record<string, any>; cacheable?: boolean };
const readCache = new ReadCache<ReadResponse>(60000, 256, value => value.status === 200 && !value.payload.error && value.cacheable === true);
const publicReads = new Set(['/app-metadata','/services','/doctors','/branches','/courses','/care-guidelines','/support-faqs','/search/popular','/portal/banners']);
const isPublicRead = (path: string) => publicReads.has(path) || ['/health','/slots','/slots/dates'].includes(path) || /^\/portal\/content(?:\/[^/]+)?$/.test(path) || /^\/(services|doctors|courses)\/[^/]+$/.test(path);
const privateReads = new Set(['/auth/settings','/bookings','/records','/membership','/notifications','/treatment-plans','/transactions','/course-enrollments','/support-tickets','/consultation-surveys','/reviews/mine','/search/history']);
const pagedCollections:Record<string,string>={'/bookings':'bookings','/support-tickets':'tickets','/consultation-surveys':'surveys','/treatment-plans':'treatmentPlans'};
const validReadPayload = (path: string, payload: Record<string,any>) => {
  if(path==='/portal/banners')return Array.isArray(payload.banners);
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
  if(/^\/services\/[^/]+\/favorite$/.test(path))return;
  if (path === '/vouchers/apply') return;
  if (path.startsWith('/search/history')) return invalidatePaths(['/search/history','/search/popular']);
  if (path.startsWith('/notifications')) return invalidatePaths(['/notifications']);
  if (path === '/auth/settings') return invalidatePaths(['/auth/settings','/notifications']);
  if (path === '/auth/profile') return invalidatePaths(['/membership']);
  if (path.startsWith('/bookings')||path.startsWith('/staff/bookings')) return invalidatePaths(['/bookings','/membership','/notifications','/records','/treatment-plans']);
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
    // Resolve native storage once, including an empty or unavailable guest session.
    try { const stored = nativeSessionStorageAvailable?nativeStorage.getItem(SESSION_KEY):null; memoryToken = typeof stored === 'string' ? stored : ''; }
    catch { nativeSessionStorageAvailable=false;memoryToken = ''; }
    return memoryToken;
  },
  set(token: string) {
    if (session.get() !== token) { sessionEpoch++; readCache.invalidate(key => key.startsWith('private:')); }
    memoryToken = token;
    try { if(nativeSessionStorageAvailable)nativeStorage.setItem(SESSION_KEY, token); } catch { nativeSessionStorageAvailable=false; }
  },
  clear() {
    const needsNativeRemoval=memoryToken!=='';
    sessionEpoch++;
    verifiedZaloSessionThisPage=false;
    readCache.invalidate(key => key.startsWith('private:'));
    memoryToken = '';
    try { if(needsNativeRemoval&&nativeSessionStorageAvailable)nativeStorage.removeItem(SESSION_KEY); } catch { nativeSessionStorageAvailable=false; }
  },
};
const fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is required');
  const token = session.get();
  const epoch = sessionEpoch;
  const url = new URL(String(input));
  const method = (init.method || 'GET').toUpperCase();
  const guardSession = !(['GET','HEAD'].includes(method) && isPublicRead(relativePath(url)));
  const sessionChanged = () => session.get() !== token || sessionEpoch !== epoch;
  const staleSession = (): ReadResponse => ({status:401,payload:{error:'Phiên đăng nhập đã thay đổi.',status:401}});
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
    const field=method==='GET'&&!url.searchParams.has('cursor')?pagedCollections[relativePath(url)]:undefined;
    if(field&&response.ok&&envelope.success===true&&Array.isArray(envelope.data?.[field])) {
      const seen=new Set<string>();
      let next=envelope.data.nextCursor;
      while(next) {
        if(session.get()!==token||sessionEpoch!==epoch)throw new DOMException('Session changed','AbortError');
        if(typeof next!=='string'||seen.has(next))throw new Error('Invalid collection pagination');
        seen.add(next);
        const pageUrl=new URL(url);pageUrl.searchParams.set('cursor',next);
        const pageResponse=await window.fetch(pageUrl,{cache:'no-store',headers,signal:controller.signal});
        const page=await pageResponse.json();
        if(!pageResponse.ok||page.success!==true) {response=pageResponse;envelope=page;break;}
        if(!Array.isArray(page.data?.[field]))throw new Error('Invalid collection page');
        envelope.data[field].push(...page.data[field]);
        next=page.data.nextCursor;
        envelope.data.nextCursor=next;
      }
    }
  } finally { clearTimeout(timeout); init.signal?.removeEventListener('abort', abort); }
  if (guardSession && sessionChanged()) return staleSession();
  const successful = response.ok && envelope.success === true;
  const payload = successful ? adaptPayload(envelope.data || {})
    : { error: apiErrorMessage(envelope.message,response.status), status: envelope.statusCode || response.status,code:envelope.code,pricing:envelope.pricing,
      ...((relativePath(url)==='/auth/zalo'&&response.status===403)?{authIssue:envelope.message==='Staff booking access is required'?'STAFF_ACCESS_REQUIRED':envelope.message==='Active staff profile and branch are required'?'STAFF_PROFILE_INACTIVE':envelope.message==='No shared staff account matches the verified Zalo phone'?'STAFF_ACCOUNT_NOT_FOUND':undefined}:{}) };
  if (guardSession && response.status === 401 && token && session.get() === token && sessionEpoch === epoch) { session.clear(); window.dispatchEvent(new Event('mld:session-expired')); }
  if (successful && method !== 'GET' && method !== 'HEAD') {
    const path = relativePath(url);
    invalidateMutation(path);
    if (!path.startsWith('/notifications') && !path.startsWith('/search') && (!path.startsWith('/auth/')||path==='/auth/settings') && !/\/(heartbeat|playback|draft)$/.test(path)) window.dispatchEvent(new CustomEvent('mld:activity',{detail:{path}}));
  }
  return {status: successful ? 200 : (response.ok ? 400 : response.status),payload,cacheable:successful && validReadPayload(relativePath(url),payload)};
  };
  const loaded = key ? await readCache.read(key,load) : await load();
  const result = guardSession && sessionChanged() ? staleSession() : loaded;
  return new Response(JSON.stringify(result.payload), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
const responseJson = async (res: Response) => res.json();
const createCustomerRecord=async(scope:'support-tickets'|'consultation-surveys',body:unknown)=>{
  const token=session.get(),epoch=sessionEpoch;
  if(!token)return {error:'Vui lòng đăng nhập.',status:401};
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  let identity=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  try{
    // This claim only namespaces a retry key; the backend still verifies every token.
    const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const {sub}=JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')));
    if(typeof sub==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(sub))identity=sub.toLowerCase();
  }catch{/* Non-JWT sessions use only their irreversible token fingerprint. */}
  const owner=scope+':'+identity;
  const key=await bookingRequest(owner,body);
  if(session.get()!==token||sessionEpoch!==epoch)return {error:'Phiên đăng nhập đã thay đổi.',status:401};
  const response=await fetch(`${API_BASE_URL}/${scope}`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});
  const result=await responseJson(response);
  if(response.ok&&!result.error)completeBookingRequest(owner,key);
  return result;
};
const searchWrites = new OwnerWriteQueue(() => String(sessionEpoch));

export const apiClient = {
  getSessionDiagnostics(){return {nativeStorageAvailable:nativeSessionStorageAvailable,verifiedZaloSessionThisPage};},
  certificateVerificationUrl(path:unknown){return verificationLink(path,API_BASE_URL);},
  async getServiceFavorite(id:string){
    try{return await responseJson(await fetch(`${API_BASE_URL}/services/${encodeURIComponent(id)}/favorite`));}catch{return {error:'Không thể tải mục yêu thích.'};}
  },
  async setServiceFavorite(id:string,isFavorite:boolean){
    try{return await responseJson(await fetch(`${API_BASE_URL}/services/${encodeURIComponent(id)}/favorite`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({isFavorite})}));}catch{return {error:'Không thể lưu mục yêu thích.'};}
  },
  sessionVersion:()=>sessionEpoch,
  hasSession:()=>Boolean(session.get()),
  peek<T = any>(path: string): T | null {
    if (!API_BASE_URL) return null;
    const key = cacheKey(new URL(API_BASE_URL + path));
    return key ? readCache.peek(key)?.payload as T ?? null : null;
  },
  clearReadCache() { readCache.invalidate(); },
  invalidateReadPaths(paths: string[]) { invalidatePaths(paths); },

  async preloadPublicData(signal?: AbortSignal) {
    const results = await Promise.all([apiClient.getAppMetadata(),apiClient.getServices(),apiClient.getDoctors(),apiClient.getBranches(),apiClient.getCourses(),apiClient.getCareGuidelines(),apiClient.getSupportFaqs(),apiClient.getPopularSearches()]);
    void preloadCatalogImages(results,signal);
    return results;
  },
  async preloadPrivateData(staffMode=false) {
    const owner = session.get(), epoch = sessionEpoch;
    const results = await Promise.all(staffMode
      ?[apiClient.getSettings(),apiClient.getSearchHistory(),apiClient.getCourseEnrollments()]
      :[apiClient.getMedicalRecords(),apiClient.getMembership(),apiClient.getBookings(),apiClient.getNotifications(),apiClient.getTreatmentPlans(),apiClient.getSettings(),apiClient.getTransactions(),apiClient.getSupportTickets(),apiClient.getConsultationSurveys(),apiClient.getMyReviews(),apiClient.getSearchHistory(),apiClient.getCourseEnrollments()]);
    const enrollments = results[results.length - 1]?.enrollments;
    // Catalogs are warmed globally; full learning payloads are bounded for mobile memory.
    const eligible = Array.isArray(enrollments) ? enrollments.filter((entry: any) => ['enrolled','studying'].includes(entry.status?.toLowerCase())).slice(0,3) : [];
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
    const normalized = query.normalize('NFC').replace(/\s+/g,' ').trim();
    try { return await searchWrites.run(`save:${normalized.toLocaleLowerCase('vi')}`, async () => responseJson(await fetchHistory())); }
    catch { return {error:'Không thể lưu lịch sử tìm kiếm.'}; }
    async function fetchHistory() { return fetch(`${API_BASE_URL}/search/history`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:normalized})}); }
  },
  async deleteSearchHistory(id?: string) {
    try { return await searchWrites.run(`delete:${id || '*'}`, async () => responseJson(await fetch(`${API_BASE_URL}/search/history${id ? `/${encodeURIComponent(id)}` : ''}`, {method:'DELETE'}))); }
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
    try { return await createCustomerRecord('consultation-surveys',body); }
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
    if (requestConsent && authController) return { error: 'Đang kết nối Zalo. Vui lòng chờ.' };
    const controller = new AbortController();
    if (requestConsent) authController = controller;
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
      if (!requestConsent) {
        if (verifiedZaloSessionThisPage&&memoryToken) {
          const current = await apiClient.getCurrentUser();
          if (current?.user&&isMiniAppRole(current.user.role)) {
            const context=accountContext(current.user);
            if(verifiedContext!==context)readCache.invalidate(key=>key.startsWith('private:'));
            verifiedContext=context;
            return { ...current, token: session.get() };
          }
          if(current?.user){session.clear();window.dispatchEvent(new Event('mld:session-expired'));return {error:'Tài khoản hiện tại không được phép truy cập ứng dụng.',status:403};}
        }
        return { needsConsent: true, error: 'Tiếp tục với Zalo và cho phép chia sẻ số điện thoại để kết nối hồ sơ.' };
      }
      // Reverify the current Zalo account on launch, even if a JWT was cached.
      session.clear();
      // Request permissions only after a user action. No phone input or OTP.
      if (controller.signal.aborted) throw new Error('Kết nối đã hủy hoặc quá thời gian chờ. Vui lòng thử lại.');
      const { token: phoneToken } = await abortable(getPhoneNumber(), controller.signal);
      if (!phoneToken) return { error: 'Bạn chưa cho phép Zalo chia sẻ số điện thoại.' };
      const accessToken = await abortable(getAccessToken(), controller.signal);
      const res = await fetch(`${API_BASE_URL}/auth/zalo`, {
        signal: controller.signal,
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, phoneToken }),
      });
      const data = await responseJson(res);
      if (controller.signal.aborted || authController !== controller) return { error: 'Kết nối đã hủy. Vui lòng thử lại.' };
      if(data.user&&!isMiniAppRole(data.user.role))return {error:'Tài khoản hiện tại không được phép truy cập ứng dụng.',status:403};
      if (data.token&&data.user) {session.set(data.token);verifiedZaloSessionThisPage=true;verifiedContext=accountContext(data.user);}
      return data;
    } catch (error) {
      if (controller.signal.aborted) return { error: 'Kết nối đã hủy hoặc quá thời gian chờ. Bạn có thể xem dịch vụ và thử lại sau.' };
      const zaloError = error as { code?: number | string; message?: string };
      const code = zaloError?.code !== undefined ? ` (mã ${zaloError.code})` : '';
      return { error: `${zaloError?.message || 'Không thể kết nối tài khoản Zalo'}${code}` };
    } finally {
      clearTimeout(timer);
      if (authController === controller) authController = null;
    }
  },

  cancelZaloLogin() { authController?.abort(); authController = null; },
  async getZaloProfile() {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    try {
      const { userInfo } = await abortable(getUserInfo({autoRequestPermission:true,avatarType:'large'}), controller.signal);
      let avatarUrl = '';
      try {
        const avatar = new URL(userInfo.avatar || '');
        if (avatar.protocol === 'https:' && !avatar.username && !avatar.password) avatarUrl=avatar.href;
      } catch { /* A missing avatar must not discard the shared name. */ }
      return { name: userInfo.name?.trim().slice(0,150) || '', avatar: avatarUrl };
    } finally { clearTimeout(timer); }
  },
  logout() {
    const token=session.get();
    apiClient.cancelZaloLogin();
    session.clear();
    try{localStorage.removeItem('mld_pending_voucher');}catch{/* Restricted storage cannot supply this selection. */}
    window.dispatchEvent(new Event('mld:session-cleared'));
    if(!token)return Promise.resolve({revoked:true});
    const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),8000);
    // Revoke the captured token, never a newer account's session established meanwhile.
    return window.fetch(`${API_BASE_URL}/auth/logout`,{method:'POST',headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:controller.signal})
      .then(response=>response.ok||response.status===401?{revoked:true}:{error:'Đã đăng xuất trên máy nhưng chưa thu hồi được phiên trên máy chủ. Khi có mạng, hãy đăng nhập lại và đăng xuất các phiên khác.'})
      .catch(()=>({error:'Đã đăng xuất trên máy nhưng chưa thu hồi được phiên trên máy chủ. Khi có mạng, hãy đăng nhập lại và đăng xuất các phiên khác.'})).finally(()=>clearTimeout(timer));
  },
  async getAccountSessions(signal?:AbortSignal){
    try{return await responseJson(await fetch(`${API_BASE_URL}/auth/sessions`,{signal,cache:'no-store'}));}
    catch{return {error:'Không thể tải phiên đăng nhập. Vui lòng thử lại.'};}
  },
  async revokeAccountSession(id?:string){
    try{return await responseJson(await fetch(`${API_BASE_URL}/auth/sessions/${id?encodeURIComponent(id)+'/revoke':'revoke-others'}`,{method:'POST'}));}
    catch{return {error:'Chưa xác định được kết quả đăng xuất. Vui lòng cập nhật lại danh sách.'};}
  },
  async registerZaloProfile(registrationToken: string, profile: { fullName: string; email?: string; dateOfBirth?: string; gender?: string; avatarUrl?: string; purpose?: string }, signal?: AbortSignal) {
    const epoch=sessionEpoch;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/zalo/register`, {
        signal,
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, registrationToken }),
      });
      const result=await responseJson(res);
      if(signal?.aborted||epoch!==sessionEpoch)return {error:'Phiên đăng ký đã thay đổi. Vui lòng xác minh lại.',status:401};
      if(result?.user&&result.token&&isCustomerRole(result.user.role)){session.set(result.token);verifiedZaloSessionThisPage=true;verifiedContext=accountContext(result.user);}
      return result;
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

  async getSlots(branchId: string, date: string, serviceId: string, technicianId?: string, signal?: AbortSignal) {
    try {
      const params = new URLSearchParams({ branchId, date, serviceId });
      if (technicianId) params.set('technicianId', technicianId);
      const res = await fetch(`${API_BASE_URL}/slots?${params}`, { cache: 'no-store', signal });
      return await responseJson(res);
    } catch {
      return { error: 'Không thể tải giờ hẹn. Vui lòng thử lại.' };
    }
  },

  async getSlotDates(branchId:string,date:string,throughDate:string,serviceId:string,technicianId?:string,signal?:AbortSignal){
    try{
      const params=new URLSearchParams({branchId,date,throughDate,serviceId});
      if(technicianId)params.set('technicianId',technicianId);
      const response = await fetch(`${API_BASE_URL}/slots/dates?${params}`,{cache:'no-store',signal});
      if ([401,404].includes(response.status)) return {error:'Máy chủ chưa cập nhật tính năng tìm ngày trống. Bạn có thể chọn ngày trực tiếp trong lịch.',status:response.status};
      return await responseJson(response);
    }catch{return {error:'Không thể tải ngày có lịch trống. Vui lòng thử lại.'};}
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

  async createBooking(data: any,ownerId?:string) {
    try {
      const owner=ownerId||'current',requestKey=await bookingRequest(owner,data);
      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json','Idempotency-Key':requestKey },
        body: JSON.stringify(data),
      });
      const result=await responseJson(res);
      if(result?.booking?.id)completeBookingRequest(owner,requestKey);
      return result;
    } catch {
      return { error: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.' };
    }
  },

  async getStaffContext(signal?:AbortSignal){
    try{return await responseJson(await fetch(`${API_BASE_URL}/staff/context`,{signal}));}
    catch{return {error:'Không thể kiểm tra quyền nhân viên. Vui lòng thử lại.'};}
  },
  async getStaffDashboard(signal?:AbortSignal){
    try{
      const response=await fetch(`${API_BASE_URL}/staff/dashboard`,{cache:'no-store',signal});
      if(response.status===404)return {error:'Máy chủ chưa cập nhật trang công việc nhân viên. Vui lòng liên hệ quản trị viên.',status:404};
      return await responseJson(response);
    }
    catch{return {error:'Không thể tải thông tin công tác. Vui lòng thử lại.'};}
  },
  async getStaffCustomerDirectory(search:string,cursor?:string,signal?:AbortSignal){
    const params=new URLSearchParams({search,limit:'20',...(cursor?{cursor}:{})});
    try{
      const response=await fetch(`${API_BASE_URL}/staff/customers/directory?${params}`,{cache:'no-store',signal});
      if(response.status===404)return {error:'Máy chủ chưa cập nhật danh sách khách hàng dành cho nhân viên.',status:404};
      return await responseJson(response);
    }
    catch{return {error:'Không thể tải danh sách khách hàng. Vui lòng thử lại.'};}
  },
  async getStaffCustomers(search:string,signal?:AbortSignal){
    try{return await responseJson(await fetch(`${API_BASE_URL}/staff/customers?${new URLSearchParams({search})}`,{signal}));}
    catch{return {error:'Không thể tìm khách hàng. Vui lòng thử lại.'};}
  },
  async getStaffSlots(branchId:string,date:string,serviceId:string,people:number,signal?:AbortSignal,throughDate?:string){
    try{
      const params=new URLSearchParams({branchId,date,serviceId,people:String(people),...(throughDate?{throughDate}:{})});
      return await responseJson(await fetch(`${API_BASE_URL}/staff/slots${throughDate?'/dates':''}?${params}`,{cache:'no-store',signal}));
    }catch{return {error:'Không thể tải lịch còn đủ giường và kỹ thuật viên. Vui lòng thử lại.'};}
  },
  async getStaffCustomerPackages(customerId:string,signal?:AbortSignal){
    try{return await responseJson(await fetch(`${API_BASE_URL}/staff/customers/${encodeURIComponent(customerId)}/packages`,{cache:'no-store',signal}));}
    catch{return {error:'Không thể tải liệu trình của khách hàng. Vui lòng thử lại.'};}
  },
  async getStaffCustomerRecords(customerId:string,section:string,cursor?:string,signal?:AbortSignal){
    const params=new URLSearchParams({section,limit:'20',...(cursor?{cursor}:{})});
    try{return await responseJson(await fetch(`${API_BASE_URL}/staff/customers/${encodeURIComponent(customerId)}/records?${params}`,{cache:'no-store',signal}));}
    catch{return {error:'Không thể tải hồ sơ khách hàng. Vui lòng thử lại.'};}
  },
  async getDocuments(search:string,cursor?:string,signal?:AbortSignal){
    const params=new URLSearchParams({search,limit:'20',...(cursor?{cursor}:{})});
    try{return await responseJson(await fetch(`${API_BASE_URL}/documents?${params}`,{cache:'no-store',signal}));}
    catch{return {error:'Không thể tải tài liệu. Vui lòng thử lại.'};}
  },
  async getDocument(id:string,signal?:AbortSignal){
    try{return await responseJson(await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(id)}`,{cache:'no-store',signal}));}
    catch{return {error:'Không thể mở tài liệu. Vui lòng thử lại.'};}
  },
  async getSharedContent(kind:'COMMUNITY'|'DOCUMENT',search:string,cursor?:string,signal?:AbortSignal){
    const params=new URLSearchParams({kind,search,limit:'20',...(cursor?{cursor}:{})});
    try{return await responseJson(await fetch(`${API_BASE_URL}/portal/${session.get()?'library':'content'}?${params}`,{cache:'no-store',signal}));}
    catch{return {error:'Không thể tải nội dung chia sẻ. Vui lòng thử lại.'};}
  },
  async getSharedContentItem(id:string,signal?:AbortSignal){
    try{return await responseJson(await fetch(`${API_BASE_URL}/portal/${session.get()?'library':'content'}/${encodeURIComponent(id)}`,{cache:'no-store',signal}));}
    catch{return {error:'Không thể mở nội dung chia sẻ. Vui lòng thử lại.'};}
  },
  async createStaffBooking(data:Record<string,unknown>,ownerId:string){
    const owner='staff:'+ownerId;
    try{
      const key=await bookingRequest(owner,data);
      const result=await responseJson(await fetch(`${API_BASE_URL}/staff/bookings`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(data)}));
      if(result?.booking?.id)completeBookingRequest(owner,key);
      return result;
    }catch{return {error:'Không thể gửi lịch hẹn. Vui lòng thử lại để kiểm tra kết quả.'};}
  },
  async updateStaffSession(id:string,status:string,treatmentNotes?:string,details?:{conditionBefore:string;conditionAfter:string;specialistAdvice:string}){
    try{return await responseJson(await fetch(`${API_BASE_URL}/staff/bookings/${encodeURIComponent(id)}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,treatmentNotes,...details})}));}
    catch{return {error:'Không thể cập nhật ca trị liệu. Vui lòng thử lại.'};}
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

  async getBookingGroup(id:string,signal?:AbortSignal){
    try{return await responseJson(await fetch(`${API_BASE_URL}/staff/bookings/${encodeURIComponent(id)}/group`,{signal,cache:'no-store'}));}
    catch{return {error:'Không thể tải nhóm đặt lịch. Vui lòng thử lại.'};}
  },
  async cancelBookingGroup(id:string){
    try{return await responseJson(await fetch(`${API_BASE_URL}/staff/bookings/${encodeURIComponent(id)}/group/cancel`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:'Nhân viên hủy cả nhóm trên Mini App'})}));}
    catch{return {error:'Không thể hủy nhóm đặt lịch. Vui lòng thử lại.'};}
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

  async startQuiz(courseId:string,quizId:string,enrollmentId:string) {
    try {return await responseJson(await fetch(`${API_BASE_URL}/courses/${courseId}/quiz/start`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quizId,enrollmentId})}));}
    catch {return {error:'Không thể bắt đầu bài kiểm tra.'};}
  },
  async saveQuizDraft(courseId:string,attemptId:string,enrollmentId:string,answers:Record<string,string>) {
    try {return await responseJson(await fetch(`${API_BASE_URL}/courses/${courseId}/quiz/draft`,{method:'PUT',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId,enrollmentId,answers})}));}
    catch {return {error:'Không thể lưu lựa chọn. Vui lòng kiểm tra kết nối.'};}
  },
  async startPlayback(courseId:string,lessonId:string,enrollmentId:string) {
    try {return await responseJson(await fetch(`${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/playback`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enrollmentId})}));}
    catch {return {error:'Không thể tạo phiên xem video.'};}
  },
  async videoHeartbeat(courseId:string,lessonId:string,enrollmentId:string,playbackId:string,position:number) {
    try {return await responseJson(await fetch(`${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/heartbeat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enrollmentId,playbackId,position})}));}
    catch {return {error:'Không thể lưu thời gian xem video.'};}
  },
  async submitQuiz(courseId: string, answers: any, quizId?: string, enrollmentId?: string,attemptId?:string) {
    try {
      const res = await fetch(`${API_BASE_URL}/courses/${courseId}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, quizId, enrollmentId,attemptId }),
      });
      return await responseJson(res);
    } catch {
      return {error:'Không thể nộp bài. Vui lòng kiểm tra kết nối và thử lại.'};
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
    try { return await createCustomerRecord('support-tickets',{subject,message}); }
    catch { return { error: 'Không thể gửi yêu cầu hỗ trợ.' }; }
  },
  async getCareGuidelines(signal?: AbortSignal) {
    try { return await responseJson(await fetch(`${API_BASE_URL}/care-guidelines`, {signal})); }
    catch { return { error: 'Không thể tải hướng dẫn chăm sóc.' }; }
  },
  async getPortalBanners(){
    try{return await responseJson(await fetch(`${API_BASE_URL}/portal/banners`));}
    catch{return {error:'Không thể tải banner trang chủ.'};}
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
  async getCertificates(cursor?:string,signal?:AbortSignal){
    try{
      const query=new URLSearchParams({limit:'20',...(cursor?{cursor}:{})});
      return await responseJson(await fetch(`${API_BASE_URL}/certificates?${query}`,{cache:'no-store',signal}));
    }catch{return {error:'Không thể tải giấy chứng nhận. Vui lòng thử lại.'};}
  },
  async getCertificate(id:string,signal?:AbortSignal){
    try{return await responseJson(await fetch(`${API_BASE_URL}/certificates/${encodeURIComponent(id)}`,{cache:'no-store',signal}));}
    catch{return {error:'Không thể tải giấy chứng nhận. Vui lòng thử lại.'};}
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

  async getNotifications(fresh = false,cursor?:string,filter:'all'|'unread'='all') {
    if (fresh) invalidatePaths(['/notifications']);
    try {
      const query=new URLSearchParams();
      if(cursor)query.set('cursor',cursor);
      if(filter!=='all')query.set('filter',filter);
      const res = await fetch(`${API_BASE_URL}/notifications${query.size?`?${query}`:''}`);
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

