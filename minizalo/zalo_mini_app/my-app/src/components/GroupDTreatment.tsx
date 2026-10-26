import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { useBackAction } from '@/hooks/useNavigationHistory';
import type { User, AppNotification, Booking } from '../../../../backend/src/data/database';
import type { TreatmentPackage } from '../../../../../database/shared_types';
import { ArrowLeftIcon, StarIcon } from './Icons';
import { GroupDRecords, careDate } from './GroupDRecords';
import type { CareRecord } from './GroupDRecords';

type Tab = 'packages' | 'journal' | 'care_guide' | 'support' | 'notifications';
type Plan = {
  id: string; status?: string; name?: string; image?: string; serviceName?: string; serviceImage?: string;
  serviceId?: string; package?: TreatmentPackage; totalSessions?: number; completedSessions?: number;
  usedSessions?: number; purchasedAt?: string; expiresAt?: string; purchaseDate?: string; expiryDate?: string;
  reservedSessions?: number;
  sessions?: CareRecord[];
  durationMinutes?: number; serviceDescription?: string;
  serviceSteps?: (string | {title?:string;description?:string;desc?:string})[];
  serviceBenefits?: (string | {title?:string;description?:string})[];
};
type Guideline = {
  id: string; title?: string; summary?: string; content?: string; imageUrl?: string;
  category?: string; authorName?: string; readTimeMinutes?: number;
  steps?: (string | { title?: string; content?: string; description?: string })[];
};
type Ticket = { id: string; subject?: string; message?: string; status?: string; adminReply?: string; createdAt?: string; resolvedAt?: string };
type Faq = { id: string; question: string; answer: string };
type CareBooking = Booking & {
  reviewId?: string | null;
};
type SavedSurvey = {
  id: string; bookingId?: string | null; focusAreas?: string[]; pressurePref?: string;
  hasSensitiveSkin?: boolean; hasOilAllergy?: boolean; allergyDetails?: string | null;
  medicalConditions?: string[]; specialRequests?: string | null; createdAt?: string;
};
type SavedReview = {
  id: string; bookingId?: string; serviceId?: string; rating?: number; comment?: string | null;
  reviewTags?: string[]; photos?: string[]; branchReply?: string | null; createdAt?: string;
};
type ReviewContext = CareRecord & { bookingDate?: string };
interface GroupDTreatmentProps {
  user: User;
  notifications?: AppNotification[] | null;
  onOpenBooking: () => void;
  onOpenPlanBooking?: (planId: string, serviceId: string) => void;
  onClose: () => void;
  onOpenConsultation?: () => void;
  initialTab?: Tab;
  initialEntityId?: string;
  treatmentPlans?: Plan[] | null;
  sourceLoading?: boolean;
  sourceErrors?: {bookings?:string;records?:string;plans?:string};
  bookingError?:string;
  onRetrySource?: () => void;
  onBusyChange?: (busy:boolean) => void;
  records?: CareRecord[] | null;
  bookings?: CareBooking[];
  onNotificationsChange?: (notifications: AppNotification[]) => void;
  onOpenNotification?: (notification: AppNotification) => Promise<void>;
  onOpenInbox?:()=>void;
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'packages', label: 'Gói liệu trình' }, { id: 'journal', label: 'Nhật ký' },
  { id: 'care_guide', label: 'Chăm sóc tại nhà' }, { id: 'support', label: 'Hỗ trợ' },
  { id: 'notifications', label: 'Thông báo' },
];
const button = 'min-h-10 rounded-[8px] border border-[#c8dde3] bg-white px-3 py-2 text-xs font-semibold text-[#164e63] disabled:opacity-50';
const input = 'w-full min-w-0 rounded-[8px] border border-[#c8dde3] bg-white p-2 text-sm';
const list = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
const count = (value?: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const emptySurvey = { bookingId: '', focusAreas: '', pressurePref: '', hasSensitiveSkin: '', hasOilAllergy: '', allergyDetails: '', medicalConditions: '', specialRequests: '' };
const cachedPaths: Record<string,string> = {surveys:'/consultation-surveys',reviews:'/reviews/mine',guidelines:'/care-guidelines',tickets:'/support-tickets',faqs:'/support-faqs',records:'/records',bookings:'/bookings'};

export const GroupDTreatment: React.FC<GroupDTreatmentProps> = ({
  user, notifications: serverNotifications, onClose, initialTab = 'packages', initialEntityId,
  treatmentPlans, sourceLoading=false, sourceErrors={}, bookingError, onRetrySource, onBusyChange, records: suppliedRecords, bookings: suppliedBookings, onNotificationsChange, onOpenNotification,onOpenPlanBooking,onOpenInbox,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [packageTab, setPackageTab] = useState('active');
  const [selectedId, setSelectedId] = useState<string | null>(initialTab === 'packages' ? initialEntityId || null : null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [guidelines, setGuidelines] = useState<Guideline[]>(() => apiClient.peek('/care-guidelines')?.guidelines || []);
  const [tickets, setTickets] = useState<Ticket[]>(() => apiClient.peek('/support-tickets')?.tickets || []);
  const [faqs, setFaqs] = useState<Faq[]>(() => apiClient.peek('/support-faqs')?.faqs || []);
  const [records, setRecords] = useState<CareRecord[] | null>(null);
  const [loadedBookings, setLoadedBookings] = useState<CareBooking[]>([]);
  const [savedSurveys, setSavedSurveys] = useState<SavedSurvey[] | null>(() => apiClient.peek('/consultation-surveys')?.surveys || null);
  const [myReviews, setMyReviews] = useState<SavedReview[] | null>(() => apiClient.peek('/reviews/mine')?.reviews || null);
  const [historyRetry, setHistoryRetry] = useState(0);
  const [resourceRetry, setResourceRetry] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [localNotifications, setLocalNotifications] = useState(serverNotifications);
  const [notifFilter, setNotifFilter] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<'survey' | 'review' | null>(null);
  const [reviewSession, setReviewSession] = useState<ReviewContext | null>(null);
  const [reviewedBookings, setReviewedBookings] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState('');
  const [photos, setPhotos] = useState('');
  const [survey, setSurvey] = useState(emptySurvey);
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  const saving=Boolean(loading.form||loading.send);
  useEffect(()=>{onBusyChange?.(saving);return()=>onBusyChange?.(false);},[saving,onBusyChange]);
  useBackAction(Boolean(form || articleId || selectedId || loading.form || loading.send), () => {
    if (busy.current) return;
    if (form) setForm(null);
    else if (articleId) setArticleId(null);
    else setSelectedId(null);
  },1);
  const notificationBusy = useRef(false);
  const error = (key: string, value: string) => setErrors(prev => ({ ...prev, [key]: value }));

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);
  useEffect(() => { setLocalNotifications(serverNotifications); }, [serverNotifications]);
  useEffect(() => {
    if (!initialEntityId) return;
    document.getElementById(`care-${initialEntityId}`)?.scrollIntoView({block:'center'});
  }, [initialEntityId, tickets, myReviews, suppliedRecords]);
  useEffect(() => {
    let cancelled = false;
    setSavedSurveys(apiClient.peek('/consultation-surveys')?.surveys || null); setMyReviews(apiClient.peek('/reviews/mine')?.reviews || null); setReviewedBookings([]);
    setForm(null); setReviewSession(null); setSurvey(emptySurvey); setNotice('');
    const load = async (key: string, request: () => Promise<any>, field: string, save: (value: any) => void) => {
      const cached = apiClient.peek(cachedPaths[key]);
      if (Array.isArray(cached?.[field])) save(cached[field]);
      setLoading(prev => ({ ...prev, [key]: !cached })); error(key, '');
      try {
        const result = await request();
        if (!cancelled) {
          if (!result?.error && Array.isArray(result?.[field])) save(result[field]);
          else error(key, result?.error || 'Lịch sử chưa khả dụng.');
        }
      } catch { if (!cancelled) error(key, 'Không thể tải lịch sử. Vui lòng thử lại.'); }
      finally { if (!cancelled) setLoading(prev => ({ ...prev, [key]: false })); }
    };
    if (user.id) {
      void load('surveys', () => apiClient.getConsultationSurveys(), 'surveys', setSavedSurveys);
      void load('reviews', () => apiClient.getMyReviews(), 'reviews', setMyReviews);
    }
    return () => { cancelled = true; };
  }, [user.id, historyRetry]);
  useEffect(() => {
    let cancelled = false;
    const load = async (key: string, request: () => Promise<any>, field: string, save: (value: any) => void) => {
      const cached = apiClient.peek(cachedPaths[key]);
      if (Array.isArray(cached?.[field])) save(cached[field]);
      setLoading(prev => ({ ...prev, [key]: !cached })); error(key, '');
      try {
        const result = await request();
        if (!cancelled) {
          if (!result?.error && Array.isArray(result?.[field])) save(result[field]);
          else error(key, result?.error || 'Dữ liệu chưa khả dụng.');
        }
      } catch { if (!cancelled) error(key, 'Không thể tải dữ liệu. Vui lòng thử lại.'); }
      finally { if (!cancelled) setLoading(prev => ({ ...prev, [key]: false })); }
    };
    if (activeTab === 'care_guide') void load('guidelines', () => apiClient.getCareGuidelines(), 'guidelines', setGuidelines);
    if (activeTab === 'support') {
      void load('tickets', () => apiClient.getSupportTickets(), 'tickets', setTickets);
      void load('faqs', () => apiClient.getSupportFaqs(), 'faqs', setFaqs);
    }
    if (activeTab === 'journal' && suppliedRecords === undefined) void load('records', () => apiClient.getMedicalRecords(), 'records', setRecords);
    if ((activeTab === 'packages' || activeTab === 'journal') && suppliedBookings === undefined && user.id) void load('bookings', () => apiClient.getBookings(), 'bookings', setLoadedBookings);
    return () => { cancelled = true; };
  }, [activeTab, suppliedRecords, suppliedBookings, user.id, resourceRetry]);

  const mutate = async (key: string, request: () => Promise<any>, accept: (result: any) => boolean, success: (result: any) => void) => {
    if (busy.current) { error(key,'Đang gửi dữ liệu. Vui lòng chờ thao tác hiện tại hoàn tất.'); return; }
    busy.current = true; setLoading(prev => ({ ...prev, [key]: true })); error(key, ''); setNotice('');
    try {
      const result = await request();
      if (result?.error || !accept(result)) error(key, result?.error || 'Chưa thể xác nhận thao tác. Vui lòng thử lại.');
      else success(result);
    } catch { error(key, 'Không thể kết nối máy chủ. Vui lòng thử lại.'); }
    finally { busy.current = false; setLoading(prev => ({ ...prev, [key]: false })); }
  };

  const markRead = async (id?: string) => {
    if (notificationBusy.current || !localNotifications) return false;
    notificationBusy.current = true; error('notifications', ''); setLoading(prev => ({ ...prev, notifications: true }));
    try {
      const result = id ? await apiClient.markNotificationRead(id) : await apiClient.markAllNotificationsRead();
      if (result?.error || (id ? result?.notification?.id !== id || result.notification.isRead !== true : result?.updated !== true)) {
        error('notifications', result?.error || 'Không thể đánh dấu đã đọc.'); return false;
      }
      const next = localNotifications.map(item => !id || item.id === id ? { ...item, isRead: true } : item);
      setLocalNotifications(next); onNotificationsChange?.(next);
      return true;
    } catch { error('notifications', 'Không thể đánh dấu đã đọc.'); return false; }
    finally { notificationBusy.current = false; setLoading(prev => ({ ...prev, notifications: false })); }
  };

  const plans = Array.isArray(treatmentPlans) ? treatmentPlans : [];
  const bookings = suppliedBookings ?? loadedBookings;
  const selected = plans.find(plan => plan.id === selectedId);
  const article = guidelines.find(guide => guide.id === articleId);
  const visiblePlans = plans.filter(plan => plan.status?.toLowerCase() === packageTab);
  const sessions = selected?.sessions;
  const alreadyReviewed = (bookingId?: string | null) => Boolean(bookingId && (
    reviewedBookings.includes(bookingId) || myReviews?.some(review => review.bookingId === bookingId) ||
    bookings.some(booking => booking.id === bookingId && booking.reviewId) ||
    (suppliedRecords ?? records)?.some(item => item.bookingId === bookingId && item.reviewId) ||
    plans.some(plan => plan.sessions?.some(item => item.bookingId === bookingId && item.reviewId))));
  const reviewable = (session: CareRecord) => Boolean(user.id && myReviews && !loading.reviews && !errors.reviews && session.bookingId && session.serviceId &&
    (session.bookingStatus?.toUpperCase() === 'COMPLETED' || bookings.some(booking => booking.id === session.bookingId && booking.status.toLowerCase() === 'completed')) &&
    !bookings.some(booking => booking.id === session.bookingId && booking.userId && booking.userId !== user.id) &&
    !session.reviewId && !alreadyReviewed(session.bookingId));
  const completedBookings = bookings.filter(booking => booking.userId === user.id && booking.status.toLowerCase() === 'completed');
  const bookingServices = (booking: CareBooking) => (booking.items || []).filter(item => item.serviceId);
  const bookingContext = (booking: CareBooking, item: ReturnType<typeof bookingServices>[number]): ReviewContext => ({
    id: booking.id, bookingId: booking.id, serviceId: item.serviceId, serviceName: item.serviceTitle,
    serviceImage: item.imageUrl, branchName: booking.branchName,
    technicianName: booking.doctorName, bookingDate: booking.date || undefined, bookingStatus: booking.status, reviewId: booking.reviewId,
  });
  const reviewName = (review: SavedReview) => {
    const booking = bookings.find(item => item.id === review.bookingId);
    const item = booking && bookingServices(booking).find(service => service.serviceId === review.serviceId);
    return item?.serviceTitle || '';
  };
  const title = (plan: Plan) => plan.package?.name || plan.name || '';
  const stats = (plan: Plan) => {
    const total = count(plan.totalSessions), used = count(plan.completedSessions ?? plan.usedSessions);
    return <div className="space-y-2 text-xs">
      <p>Tổng buổi: {total ?? ''} · Đã dùng: {used ?? ''} · Còn lại: {total != null && used != null ? Math.max(0, total - used) : ''}</p>
      {total != null && total > 0 && used != null && <progress aria-label="Tiến độ liệu trình" value={Math.min(used, total)} max={total} className="h-2 w-full accent-[#2860eb]" />}
      <p>Ngày mua: {careDate(plan.purchasedAt || plan.purchaseDate)}</p><p>Hạn sử dụng: {careDate(plan.expiresAt || plan.expiryDate)}</p>
    </div>;
  };
  const startReview = (session: ReviewContext) => {
    if(busy.current)return;
    setReviewSession(session); setRating(0); setComment(''); setTags(''); setPhotos(''); error('form', ''); setNotice(''); setForm('review');
  };
  const feedback = (key: string) => <>
    {loading[key] && <p role="status" className="text-xs">Đang tải...</p>}
    {errors[key] && <p role="alert" className="text-xs text-red-700">{errors[key]}</p>}
    {errors[key] && ['guidelines','faqs','tickets','records','bookings'].includes(key) && <button type="button" className={button} onClick={()=>{apiClient.invalidateReadPaths([cachedPaths[key]]);setResourceRetry(value=>value+1);}}>Thử lại</button>}
    {key==='bookings'&&suppliedBookings!==undefined&&sourceLoading&&<p role="status" className="text-xs">Đang tải lịch hẹn...</p>}
    {key==='bookings'&&suppliedBookings!==undefined&&sourceErrors.bookings&&<p role="alert" className="text-xs text-red-700">{sourceErrors.bookings} <button type="button" disabled={sourceLoading} onClick={onRetrySource}>Thử lại</button></p>}
  </>;
  const surveyHistory = <section className="space-y-3" aria-label="Phiếu thông tin đã gửi">
    <h2 className="text-sm font-bold">Phiếu thông tin đã gửi</h2>{feedback('surveys')}
    {errors.surveys && <button className={button} onClick={() => setHistoryRetry(prev => prev + 1)}>Thử lại</button>}
    {!loading.surveys && !errors.surveys && <p className="text-xs">{savedSurveys ? savedSurveys.length ? '' : '' : ''}</p>}
    {savedSurveys?.map(saved => <article key={saved.id} className="space-y-2 border-b border-[#c8dde3] py-3 text-xs">
      <h3 className="font-semibold">{saved.bookingId ? bookings.find(booking => booking.id === saved.bookingId)?.serviceTitle || 'Phiếu theo lịch hẹn' : 'Sở thích chung'}</h3>
      <p>Ngày gửi: {careDate(saved.createdAt)}</p>
      {saved.focusAreas?.length ? <p>Vùng cần chăm sóc: {saved.focusAreas.join(', ')}</p> : null}
      <p>Lực tác động: {({ LIGHT: 'Nhẹ', MEDIUM: 'Vừa', STRONG: 'Mạnh' } as Record<string, string>)[saved.pressurePref || ''] || saved.pressurePref || ''}</p>
      <p>Da nhạy cảm: {saved.hasSensitiveSkin === true ? 'Có' : saved.hasSensitiveSkin === false ? 'Không' : ''}</p>
      <p>Dị ứng dầu: {saved.hasOilAllergy === true ? 'Có' : saved.hasOilAllergy === false ? 'Không' : ''}</p>
      {saved.allergyDetails && <p className="whitespace-pre-wrap">Thông tin dị ứng: {saved.allergyDetails}</p>}
      {saved.medicalConditions?.length ? <p>Tình trạng sức khỏe: {saved.medicalConditions.join(', ')}</p> : null}
      {saved.specialRequests && <p className="whitespace-pre-wrap">Yêu cầu riêng: {saved.specialRequests}</p>}
    </article>)}
  </section>;
  const reviewHistory = <section className="space-y-3" aria-label="Lịch sử đánh giá">
    <h2 className="text-sm font-bold">Lịch sử đánh giá</h2>{feedback('reviews')}
    {errors.reviews && <button className={button} onClick={() => setHistoryRetry(prev => prev + 1)}>Thử lại</button>}
    {!loading.reviews && !errors.reviews && <p className="text-xs">{myReviews ? myReviews.length ? '' : '' : ''}</p>}
    {myReviews?.map(review => <article key={review.id} id={`care-${review.id}`} className="space-y-2 border-b border-[#c8dde3] py-3 text-xs">
      <h3 className="font-semibold">{reviewName(review)}</h3><p>Ngày đánh giá: {careDate(review.createdAt)}</p>
      <p>{Number.isInteger(review.rating) && review.rating! >= 1 && review.rating! <= 5 ? `${review.rating}/5` : 'Mức đánh giá chưa khả dụng'}</p>
      {review.comment && <p className="whitespace-pre-wrap">{review.comment}</p>}
      {review.reviewTags?.length ? <p>{review.reviewTags.join(', ')}</p> : null}
      {review.photos?.length ? <div className="grid grid-cols-2 gap-2">{review.photos.filter(src => typeof src === 'string' && src.trim()).map((src, index) => <img key={index} src={src} alt="Ảnh đánh giá" loading="lazy" className="w-full rounded-[8px]" />)}</div> : null}
      {review.branchReply && <div><h4 className="font-semibold">Phản hồi chi nhánh</h4><p className="whitespace-pre-wrap">{review.branchReply}</p></div>}
    </article>)}
  </section>;

  return <div className="space-y-4 px-3 pt-3 pb-20 text-[#183b47] break-words">
    {bookingError&&<p role="alert" className="text-xs text-red-700">{bookingError}</p>}
    <button disabled={loading.form||loading.send} onClick={form ? () => setForm(null) : articleId ? () => setArticleId(null) : selectedId ? () => setSelectedId(null) : onClose} aria-label="Quay lại" className={`${button} flex w-10 items-center justify-center p-0`}><ArrowLeftIcon size={18} color="#183b47" /></button>
    {!form && !selected && !article && <nav aria-label="Chăm sóc" className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map(tab => <button key={tab.id} disabled={saving} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => { if(busy.current)return; if(tab.id==='notifications'&&onOpenInbox){onOpenInbox();return;} setActiveTab(tab.id); setNotice(''); }} className={`${button} shrink-0 ${activeTab === tab.id ? 'bg-[#eff4fe]' : ''}`}>{tab.label}</button>)}
    </nav>}
    {notice && <p role="status" className="text-sm">{notice}</p>}

    {form === 'survey' && <form className="space-y-4" onSubmit={event => {
      event.preventDefault();
      const focusAreas = list(survey.focusAreas), medicalConditions = list(survey.medicalConditions);
      if (focusAreas.length > 30 || medicalConditions.length > 30 || [...focusAreas, ...medicalConditions].some(value => value.length > 200)) { error('form', 'Tối đa 30 mục, mỗi mục tối đa 200 ký tự.'); return; }
      void mutate('form', () => apiClient.createConsultationSurvey({
        ...(survey.bookingId ? { bookingId: survey.bookingId } : {}), focusAreas, medicalConditions,
        pressurePref: survey.pressurePref, hasSensitiveSkin: survey.hasSensitiveSkin === 'yes', hasOilAllergy: survey.hasOilAllergy === 'yes',
        allergyDetails: survey.allergyDetails.trim() || null, specialRequests: survey.specialRequests.trim() || null,
      }), result => Boolean(result?.survey?.id), result => {
        setSavedSurveys(prev => [result.survey, ...(prev || []).filter(item => item.id !== result.survey.id)]);
        setForm(null); setSurvey(emptySurvey); setNotice('Đã gửi phiếu thông tin.');
      });
    }}>
      <fieldset disabled={saving} className="min-w-0 space-y-4 border-0 p-0">
      <h1 className="text-lg font-bold">Thông tin trước dịch vụ</h1>
      {feedback('bookings')}
      <label className="block space-y-1 text-xs">Lịch hẹn<select disabled={loading.bookings} className={input} value={survey.bookingId} onChange={e => setSurvey(prev => ({ ...prev, bookingId: e.target.value }))}>
        <option value="">Không gắn lịch hẹn</option>{bookings.filter(b => !['cancelled', 'completed', 'no_show'].includes(b.status.toLowerCase())).map(b => <option key={b.id} value={b.id}>{b.serviceTitle || b.code || b.id} · {careDate(b.date)}</option>)}
      </select></label>
      {(['focusAreas', 'medicalConditions', 'allergyDetails', 'specialRequests'] as const).map((field, index) => <label key={field} className="block space-y-1 text-xs">{['Vùng cần chăm sóc', 'Tình trạng sức khỏe', 'Thông tin dị ứng', 'Yêu cầu riêng'][index]}<textarea className={input} rows={3} value={survey[field]} onChange={e => setSurvey(prev => ({ ...prev, [field]: e.target.value }))} /></label>)}
      <label className="block space-y-1 text-xs">Lực tác động<select required className={input} value={survey.pressurePref} onChange={e => setSurvey(prev => ({ ...prev, pressurePref: e.target.value }))}><option value="">Chọn mức lực</option><option value="LIGHT">Nhẹ</option><option value="MEDIUM">Vừa</option><option value="STRONG">Mạnh</option></select></label>
      {(['hasSensitiveSkin', 'hasOilAllergy'] as const).map((field, index) => <label key={field} className="block space-y-1 text-xs">{index === 0 ? 'Da nhạy cảm' : 'Dị ứng dầu'}<select required className={input} value={survey[field]} onChange={e => setSurvey(prev => ({ ...prev, [field]: e.target.value }))}><option value="">Chọn câu trả lời</option><option value="yes">Có</option><option value="no">Không</option></select></label>)}
      {feedback('form')}<button disabled={saving || loading.surveys} className={button} type="submit">Gửi phiếu thông tin</button>
      </fieldset>
    </form>}

    {form === 'review' && reviewSession && <form className="space-y-4" onSubmit={event => {
      event.preventDefault(); if (!reviewable(reviewSession) || rating < 1) return;
      const reviewTags = list(tags), reviewPhotos = list(photos);
      if ([reviewTags, reviewPhotos].some(values => values.length > 30 || values.some(value => value.length > 2000))) { error('form', 'Tối đa 30 mục, mỗi mục tối đa 2000 ký tự.'); return; }
      if (reviewPhotos.some(value => { try { return new URL(value).protocol !== 'https:'; } catch { return true; } })) { error('form', 'Ảnh cần có đường dẫn HTTPS hợp lệ.'); return; }
      void mutate('form', () => apiClient.createReview({ bookingId: reviewSession.bookingId, serviceId: reviewSession.serviceId, rating, ...(comment.trim() ? { comment: comment.trim() } : {}), reviewTags, photos: reviewPhotos }),
        result => Boolean(result?.review?.id), result => {
          setReviewedBookings(prev => [...prev, reviewSession.bookingId!]);
          setMyReviews(prev => [result.review, ...(prev || []).filter(item => item.id !== result.review.id)]);
          setForm(null); setNotice('Đã gửi đánh giá.');
        });
    }}>
      <fieldset disabled={saving} className="min-w-0 space-y-4 border-0 p-0">
      <h1 className="text-lg font-bold">Đánh giá trải nghiệm</h1>
      {reviewSession.serviceImage && <img src={reviewSession.serviceImage} alt={reviewSession.serviceName || ''} className="w-full rounded-[8px]" />}
      <p className="text-sm">{reviewSession.serviceName || 'Tên dịch vụ chưa khả dụng'}</p>
      <p className="text-xs">{reviewSession.bookingDate ? 'Ngày hẹn' : 'Ngày chăm sóc'}: {careDate(reviewSession.bookingDate || reviewSession.sessionDate || reviewSession.diagnosisDate)}</p>
      {reviewSession.branchName && <p className="text-xs">{reviewSession.branchName}</p>}
      {reviewSession.technicianName && <p className="text-xs">{reviewSession.technicianName}</p>}
      <div role="group" aria-label="Mức độ hài lòng" className="flex gap-2">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value} sao`} aria-pressed={rating === value} onClick={() => setRating(value)} className={`${button} flex h-10 w-10 items-center justify-center p-0`}><StarIcon size={24} color={value <= rating ? '#2860eb' : '#aaa'} /></button>)}</div>
      <p className="text-xs">{rating ? `${rating}/5` : 'Chưa chọn mức đánh giá'}</p>
      {(['comment', 'tags', 'photos'] as const).map((field, index) => <label key={field} className="block space-y-1 text-xs">{['Nhận xét', 'Nhãn đánh giá', 'Đường dẫn ảnh'][index]}<textarea className={input} rows={3} maxLength={field === 'comment' ? 10000 : undefined} value={field === 'comment' ? comment : field === 'tags' ? tags : photos} onChange={e => (field === 'comment' ? setComment : field === 'tags' ? setTags : setPhotos)(e.target.value)} /></label>)}
      {feedback('form')}<button type="submit" disabled={loading.form || !rating || !reviewable(reviewSession)} className={button}>Gửi đánh giá</button>
      </fieldset>
    </form>}

    {!form && selected && <section className="space-y-4">
      <h1 className="text-lg font-bold">{title(selected)}</h1>
      <p className="text-xs">Mã gói: {selected.id}</p>
      {(selected.package?.imageUrl || selected.image || selected.serviceImage) && <img src={selected.package?.imageUrl || selected.image || selected.serviceImage} alt={title(selected)} className="w-full rounded-[8px]" />}
      {selected.package?.description && <p className="text-sm whitespace-pre-wrap">{selected.package.description}</p>}{stats(selected)}
      {selected.serviceName && <h2 className="text-sm font-semibold">{selected.serviceName}</h2>}
      {selected.durationMinutes != null && <p className="text-xs">Thời lượng mỗi buổi: {selected.durationMinutes} phút</p>}
      {selected.serviceDescription && <p className="text-sm whitespace-pre-wrap">{selected.serviceDescription}</p>}
      {!!selected.serviceBenefits?.length && <section className="space-y-2"><h2 className="text-sm font-semibold">Lợi ích liệu trình</h2><ul className="list-disc pl-4 text-xs">{selected.serviceBenefits.map((benefit,index) => <li key={index}>{typeof benefit === 'string' ? benefit : benefit.title || benefit.description}</li>)}</ul></section>}
      {!!selected.serviceSteps?.length && <section className="space-y-3"><h2 className="text-sm font-semibold">Các bước thực hiện mỗi buổi</h2><ol className="list-decimal space-y-2 pl-4 text-xs">{selected.serviceSteps.map((step,index) => <li key={index}>{typeof step === 'string' ? step : <><strong>{step.title}</strong><p className="whitespace-pre-wrap">{step.description || step.desc}</p></>}</li>)}</ol></section>}
      <p className="text-xs">Đang giữ lịch: {selected.reservedSessions || 0} buổi</p>
      <button className={button} disabled={!onOpenPlanBooking || selected.status?.toLowerCase()!=='active' || !selected.serviceId || (selected.totalSessions??0)-(selected.completedSessions??selected.usedSessions??0)-(selected.reservedSessions||0)<=0}
        onClick={()=>selected.serviceId&&onOpenPlanBooking?.(selected.id,selected.serviceId)}>Đặt lịch buổi tiếp theo</button>
      {feedback('reviews')}
      <GroupDRecords records={sessions} />
      {sessions?.map(session => <div key={session.id} className="space-y-2 border-b border-[#c8dde3] py-2">
        <p className="text-xs">{session.serviceName || 'Dịch vụ chưa khả dụng'} · {careDate(session.sessionDate)}</p>
        <button className={button} disabled={!reviewable(session)} onClick={() => startReview(session)}>{session.reviewId || alreadyReviewed(session.bookingId) ? 'Đã đánh giá' : 'Đánh giá trải nghiệm'}</button>
        {!reviewable(session) && !session.reviewId && !alreadyReviewed(session.bookingId) && <p className="text-xs">Đánh giá chưa khả dụng cho buổi này.</p>}
      </div>)}
    </section>}

    {!form && article && <article className="space-y-3">
      <h1 className="text-lg font-bold">{article.title || 'Tiêu đề chưa khả dụng'}</h1>
      {article.imageUrl && <img src={article.imageUrl} alt={article.title || ''} className="w-full rounded-[8px]" />}
      {article.category && <p className="text-xs">{article.category}</p>}{article.authorName && <p className="text-xs">{article.authorName}</p>}
      {article.readTimeMinutes != null && <p className="text-xs">{article.readTimeMinutes} phút</p>}
      <p className="text-sm whitespace-pre-wrap">{article.content || 'Nội dung chưa khả dụng.'}</p>
      {Array.isArray(article.steps) && article.steps.map((step, index) => <div key={index} className="text-sm whitespace-pre-wrap">{typeof step === 'string' ? step : <><h2 className="font-bold">{step?.title}</h2><p>{step?.content || step?.description}</p></>}</div>)}
    </article>}

    {!form && !selected && !article && activeTab === 'packages' && <section className="space-y-4">
      <h1 className="text-lg font-bold">Gói liệu trình của tôi</h1>
      {sourceLoading&&<p role="status" className="text-xs">Đang tải gói liệu trình...</p>}
      {sourceErrors.plans&&<p role="alert" className="text-xs text-red-700">{sourceErrors.plans} <button type="button" disabled={sourceLoading} onClick={onRetrySource}>Thử lại</button></p>}
      {user.id && <p className="text-sm">{user.name}{user.tier ? ` · ${user.tier}` : ''}</p>}
      <label className="block text-xs">Trạng thái gói<select className={input} value={packageTab} onChange={event => setPackageTab(event.target.value)}>{['active', 'completed', 'expired', 'paused', 'cancelled'].map((status, index) => <option key={status} value={status}>{['Đang dùng', 'Hoàn thành', 'Hết hạn', 'Tạm dừng', 'Đã hủy'][index]}</option>)}</select></label>
      {!treatmentPlans && <p className="text-xs">Gói liệu trình chưa khả dụng.</p>}
      {treatmentPlans && !visiblePlans.length && <p className="text-xs"></p>}
      {visiblePlans.map(plan => <article key={plan.id} className="space-y-3 rounded-[8px] border border-[#c8dde3] bg-white p-3">
        {(plan.package?.imageUrl || plan.image || plan.serviceImage) && <img src={plan.package?.imageUrl || plan.image || plan.serviceImage} alt={title(plan)} className="w-full rounded-[8px]" />}
        <h2 className="text-sm font-bold">{title(plan)}</h2>{plan.serviceName && <p className="text-xs">{plan.serviceName}</p>}{stats(plan)}
        <button className={button} onClick={() => setSelectedId(plan.id)}>Xem chi tiết gói</button>
      </article>)}
      <button className={button} disabled={saving} onClick={() => { if(busy.current)return; setForm('survey'); error('form', ''); setNotice(''); }}>Thông tin trước dịch vụ</button>
      {surveyHistory}
    </section>}

    {!form && !selected && !article && activeTab === 'journal' && <>
      <GroupDRecords records={suppliedRecords === undefined ? records : suppliedRecords} loading={suppliedRecords === undefined ? loading.records : sourceLoading} error={suppliedRecords === undefined ? errors.records : sourceErrors.records} />
      {(suppliedRecords===undefined?errors.records:sourceErrors.records)&&<button type="button" className={button} disabled={sourceLoading} onClick={suppliedRecords===undefined?()=>{apiClient.invalidateReadPaths(['/records']);setResourceRetry(value=>value+1);}:onRetrySource}>Thử lại</button>}
      {(suppliedRecords === undefined ? records : suppliedRecords)?.map(record => reviewable(record) && <button key={record.id} className={button} onClick={() => startReview(record)}>Đánh giá {record.serviceName || careDate(record.sessionDate || record.diagnosisDate)}</button>)}
      <section className="space-y-3" aria-label="Lịch hẹn đã hoàn thành">
        <h2 className="text-sm font-bold">Lịch hẹn đã hoàn thành</h2>{feedback('bookings')}
        {!loading.bookings && !errors.bookings && !completedBookings.length && <p className="text-xs"></p>}
        {completedBookings.map(booking => <article key={booking.id} className="space-y-2 border-b border-[#c8dde3] py-3 text-xs">
          <h3 className="font-semibold">{booking.code || 'Lịch hẹn đã hoàn thành'}</h3>
          <p>Ngày hẹn: {careDate(booking.date)}</p>{booking.branchName && <p>{booking.branchName}</p>}
          {!bookingServices(booking).length && <p>Dịch vụ chưa khả dụng.</p>}
          {bookingServices(booking).map((item, index) => {
            const context = bookingContext(booking, item);
            return <div key={`${item.serviceId}-${index}`} className="space-y-2">
              <p>{context.serviceName || 'Tên dịch vụ chưa khả dụng'}</p>
              <button className={button} disabled={!reviewable(context)} onClick={() => startReview(context)}>{alreadyReviewed(booking.id) ? 'Đã đánh giá' : `Đánh giá ${context.serviceName || 'dịch vụ'}`}</button>
            </div>;
          })}
        </article>)}
      </section>
      {reviewHistory}
    </>}

    {!form && !selected && !article && activeTab === 'care_guide' && <section className="space-y-3">
      <h1 className="text-lg font-bold">Hướng dẫn chăm sóc tại nhà</h1>{feedback('guidelines')}
      {!loading.guidelines && !errors.guidelines && !guidelines.length && <p className="text-xs"></p>}
      {guidelines.map(guide => <article key={guide.id} className="space-y-2 border-b border-[#c8dde3] py-3">
        {guide.imageUrl && <img src={guide.imageUrl} alt={guide.title || ''} loading="lazy" className="w-full rounded-[8px]" />}
        <h2 className="text-sm font-bold">{guide.title || 'Tiêu đề chưa khả dụng'}</h2>{guide.summary && <p className="text-xs whitespace-pre-wrap">{guide.summary}</p>}
        <button className={button} onClick={() => setArticleId(guide.id)}>Xem hướng dẫn</button>
      </article>)}
    </section>}

    {!form && !selected && !article && activeTab === 'support' && <section className="space-y-4">
      <h1 className="text-lg font-bold">Tư vấn & hỗ trợ</h1>{feedback('faqs')}
      {!loading.faqs && !errors.faqs && !faqs.length && <p className="text-xs"></p>}
      {faqs.map(faq => <details key={faq.id} className="border-b border-[#c8dde3] py-2 text-sm"><summary>{faq.question}</summary><p className="mt-2 whitespace-pre-wrap">{faq.answer}</p></details>)}
      {feedback('tickets')}
      {!loading.tickets && !errors.tickets && !tickets.length && <p className="text-xs"></p>}
      {tickets.map(ticket => <article key={ticket.id} id={`care-${ticket.id}`} className="space-y-2 border-b border-[#c8dde3] py-3 text-xs">
        <h2 className="font-bold">{ticket.subject}</h2><p>{careDate(ticket.createdAt)}{ticket.status ? ` · ${ticket.status}` : ''}</p><p className="whitespace-pre-wrap">{ticket.message}</p>
        {ticket.adminReply && <div><h3 className="font-semibold">Phản hồi hỗ trợ</h3><p className="whitespace-pre-wrap">{ticket.adminReply}</p>{ticket.resolvedAt && <p>Ngày giải quyết: {careDate(ticket.resolvedAt)}</p>}</div>}
      </article>)}
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (!subject.trim() || !message.trim()) return;
        void mutate('send', () => apiClient.createSupportTicket(subject.trim(), message.trim()), result => Boolean(result?.ticket?.id), result => {
          setTickets(prev => [result.ticket, ...prev.filter(ticket => ticket.id !== result.ticket.id)]); setSubject(''); setMessage(''); setNotice('Đã gửi yêu cầu hỗ trợ.');
        });
      }}>
        <fieldset disabled={saving} className="min-w-0 space-y-3 border-0 p-0">
        <label className="block space-y-1 text-xs">Tiêu đề<input required maxLength={200} className={input} value={subject} onChange={e => setSubject(e.target.value)} /></label>
        <label className="block space-y-1 text-xs">Nội dung<textarea required maxLength={10000} rows={4} className={input} value={message} onChange={e => setMessage(e.target.value)} /></label>
        {feedback('send')}<button type="submit" className={button} disabled={loading.send || loading.tickets || !subject.trim() || !message.trim()}>Gửi yêu cầu hỗ trợ</button>
        </fieldset>
      </form>
    </section>}

    {!form && !selected && !article && activeTab === 'notifications' && <section className="space-y-3">
      <h1 className="text-lg font-bold">Thông báo</h1>{feedback('notifications')}
      <button className={button} disabled={loading.notifications || !localNotifications?.some(item => !item.isRead)} onClick={() => void markRead()}>Đánh dấu tất cả đã đọc</button>
      <label className="block text-xs">Loại thông báo<select className={input} value={notifFilter} onChange={e => setNotifFilter(e.target.value)}><option value="">Tất cả</option>{Array.from(new Set(localNotifications?.map(item => item.type).filter(Boolean))).map(type => <option key={type} value={type}>{type}</option>)}</select></label>
      {!localNotifications && <p className="text-xs">Thông báo chưa khả dụng.</p>}
      {localNotifications && !localNotifications.filter(item => !notifFilter || item.type === notifFilter).length && <p className="text-xs"></p>}
      {localNotifications?.filter(item => !notifFilter || item.type === notifFilter).map(item => <article key={item.id} className={`space-y-2 rounded-[8px] border p-3 text-xs ${item.isRead ? 'border-[#c8dde3]' : 'border-[#2860eb]'}`}>
        <h2 className="font-bold">{item.title}</h2><p>{careDate(item.createdAt)}</p><p className="whitespace-pre-wrap">{item.message}</p>
        {!item.isRead && <button className={button} disabled={loading.notifications} onClick={() => void markRead(item.id)}>Đánh dấu đã đọc</button>}
        {onOpenNotification && (item.data?.target || item.type.toUpperCase() === 'BOOKING') && <button className={button} disabled={loading.notifications} onClick={() => {
          void (async () => { try { if (item.isRead || await markRead(item.id)) await onOpenNotification(item); } catch (failure) { error('notifications',failure instanceof Error ? failure.message : 'Không thể mở thông báo.'); } })();
        }}>Xem nội dung</button>}
      </article>)}
    </section>}
  </div>;
};
