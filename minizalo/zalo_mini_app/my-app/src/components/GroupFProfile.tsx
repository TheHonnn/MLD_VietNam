import React, { useEffect, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import { readAvatar } from '@/utils/read-avatar';
import { useBackAction } from '@/hooks/useNavigationHistory';
import { LegalLinks } from './LegalLinks';
import { QRCode } from './QRCode';
import {openShareSheet} from 'zmp-sdk';
import { apiClient } from '@/api/client';
import {translate} from '@/i18n';
import {canUseStaffTools,staffRoleLabel} from '@/utils/staff';
import type {CustomerSection,StaffDashboard} from '@/types/staff';
import {StaffWorkspace} from './StaffWorkspace';
import type { User, Voucher, Branch } from '../../../../backend/src/data/database';
import type { Invoice, MembershipTierRule, LoyaltyPointSetting } from '../../../../../database/shared_types';
import {
  CreditCardIcon,
  UserCheckIcon,
  ArrowLeftIcon,
  TagIcon,
  ShieldIcon,
  CameraIcon,
  CalendarIcon,
  NavAcademyIcon,
  HeartIcon,
  FileTextIcon,
  StarIcon,
} from './Icons';

type ProfileInvoice = Invoice & {
  branchName?: string;
  items?: { id: string; itemName: string; quantity: number; unitPrice: number; amount: number }[];
};

const ProfileLayer:React.FC<React.HTMLAttributes<HTMLDivElement>>=({children,...props})=>{
  const target=typeof document==='undefined'?null:document.querySelector('.mini-app-shell');
  const layer=<div {...props}>{children}</div>;
  return target?createPortal(layer,target):layer;
};

interface GroupFProfileProps {
  staffDashboard?:StaffDashboard|null;
  onOpenCustomers?:(section:CustomerSection)=>void;
  onOpenDocuments?:()=>void;
  onOpenCommunity?:()=>void;
  branches?: Branch[];
  onRefreshData?:()=>void;
  notificationTarget?: {id:string; tab:'payments'|'points'|'vouchers'; entityId?:string};
  onLogout?: () => Promise<void>;
  onManageSessions?:()=>void;
  onSelectVoucher?: (voucher: Voucher) => void;
  metadata?: {
    brandName?: string;
    phoneVerified?: boolean;
    benefits?: string[];
    tierRules?: MembershipTierRule[];
    loyalty?: LoyaltyPointSetting;
    referral?: { code: string; terms?: string };
  };
  user: User;
  onUserUpdated: (user: User) => void;
  onOpenAppointments: () => void;
  onOpenPackages: () => void;
  onOpenAcademy: () => void;
  onOpenCourseCatalog: () => void;
  onOpenOnboarding: () => void;
  vouchers: Voucher[];
  onVouchersUpdated: (vouchers: Voucher[]) => void;
  summary: { upcomingBookings: number; remainingTreatmentSessions: number; activeCourses: number } | null;
  summaryError?:string;
}

export const GroupFProfile: React.FC<GroupFProfileProps> = ({
  staffDashboard=null,onOpenCustomers,onOpenDocuments,onOpenCommunity,
  branches=[],
  notificationTarget,
  onRefreshData,
  metadata,
  onLogout,
  onManageSessions,
  onSelectVoucher,
  user,
  onUserUpdated,
  onOpenAppointments,
  onOpenPackages,
  onOpenAcademy,
  vouchers,
  onVouchersUpdated,
  summary,
  summaryError,
}) => {
  const staffMode=canUseStaffTools(user);
  type Settings = { biometricEnabled: boolean; appointmentReminder: boolean; promotionNotify: boolean; systemNotify: boolean; language: string };
  const [settings, setSettings] = useState<Settings | null>(() => apiClient.peek('/auth/settings')?.settings || null);
  const [settingsStatus, setSettingsStatus] = useState<'loading' | 'missing' | 'loaded' | 'error'>(() => { const cached=apiClient.peek('/auth/settings'); return cached ? cached.settings ? 'loaded' : 'missing' : 'loading'; });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const settingsSaveLock=useRef(false);
  const [settingsVersion,setSettingsVersion]=useState(0);
  const [membership, setMembership] = useState<{ membershipCard?:{cardCode:string;expiresAt:string|null}|null; membershipTiers?: NonNullable<GroupFProfileProps['metadata']>['tierRules']; loyaltySettings?: NonNullable<GroupFProfileProps['metadata']>['loyalty']; referrals?: { id: string; rewardPoints: number; isRewarded: boolean; createdAt: string }[]; referralCode?: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const cachedSettings = apiClient.peek('/auth/settings'), cachedMembership = apiClient.peek('/membership');
    setSettings(cachedSettings?.settings || null);
    setSettingsStatus(cachedSettings ? cachedSettings.settings ? 'loaded' : 'missing' : 'loading');
    setMembership(cachedMembership ? {...cachedMembership,referralCode:cachedMembership.user?.referralCode} : null);
    apiClient.getSettings().then(result => {
      if (cancelled) return;
      if (result && !result.error && result.settings) {
        setSettings(result.settings);
        setSettingsStatus('loaded');
      } else setSettingsStatus(result && !result.error && result.settings === null ? 'missing' : 'error');
    }).catch(() => { if (!cancelled) setSettingsStatus('error'); });
    if(!staffMode)apiClient.getMembership().then(result => {
      if (!cancelled && result && !result.error) setMembership({ ...result, referralCode: result.user?.referralCode });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user.id,settingsVersion,staffMode]);
  const saveSetting = async (patch: Partial<Settings>) => {
    if (settingsSaveLock.current || (!settings && settingsStatus !== 'missing')) return;
    settingsSaveLock.current=true;
    setSettingsSaving(true);
    try {
      const result = await apiClient.updateSettings(patch);
      if(!mounted.current)return;
      if (result?.settings && !result.error) {
        setSettings(result.settings);
        setSettingsStatus('loaded');
        if(result.localeError)showToast(result.localeError);
      }
      else showToast(result?.error || 'Không thể lưu cài đặt.');
    } catch { showToast('Không thể lưu cài đặt.'); }
    finally { settingsSaveLock.current=false;if(mounted.current)setSettingsSaving(false); }
  };
  const tierRules = membership?.membershipTiers ?? metadata?.tierRules;
  const loyalty = membership?.loyaltySettings ?? metadata?.loyalty;
  const referralCode = membership?.referralCode ?? metadata?.referral?.code;
  const membershipCardCode = membership?.membershipCard?.cardCode;
  const membershipExpiresAt = membership?.membershipCard?.expiresAt;
  useEffect(()=>{
    if(!membershipExpiresAt)return;
    let timer:number;
    const check=()=>{
      const remaining=Date.parse(membershipExpiresAt)-Date.now();
      if(remaining<=0)setMembership(current=>current?{...current,membershipCard:null}:current);
      else timer=window.setTimeout(check,Math.min(remaining,2147483647));
    };
    check();
    return()=>clearTimeout(timer);
  },[membershipExpiresAt]);
  const currentTierRule = tierRules?.find(rule => rule.tier.toLowerCase() === user.tier.toLowerCase());
  // Modal states for F02 - F08 screens
  const [activeModal, setActiveModal] = useState<
    'edit_profile' | 'digital_card' | 'points' | 'vouchers' | 'payments' | 'referral' | 'settings' | null
  >(staffMode?null:notificationTarget?.tab || null);
  useBackAction(Boolean(activeModal), () => { if(!profileSaveLock.current)setActiveModal(null); });

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const copyTimer = useRef<number>();
  const avatarRead = useRef<AbortController | null>(null);
  const [avatarReading,setAvatarReading]=useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current=true;
    return () => { mounted.current=false;clearTimeout(toastTimer.current);clearTimeout(copyTimer.current);avatarRead.current?.abort(); };
  }, []);
  const showToast = (msg: string) => {
    if(!mounted.current)return;
    setToastMessage(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2500);
  };

  // Profile data (Figma F01)
  const [userProfile, setUserProfile] = useState({
    name: user.name,
    phone: user.phone,
    tier: user.tier || '',
    points: user.points,
    dob: user.dob,
    gender: user.gender,
    email: user.email,
    address: user.address,
    preferredBranch: user.preferredBranch || '',
    skinType: user.skinType || '',
    healthNotes: user.healthNotes || '',
    emergencyContactName: user.emergencyContactName || '',
    emergencyContactPhone: user.emergencyContactPhone || '',
    avatar: user.avatar,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const profileSaveLock=useRef(false);
  const [transactions, setTransactions] = useState<{ invoices: ProfileInvoice[]; pointTransactions: { id: string; description: string; createdAt: string; points: number }[]; totalSpent: number } | null>(() => { const cached=apiClient.peek('/transactions'); return cached ? {...cached,totalSpent:Number(cached.totalSpent)} : null; });
  const [transactionsLoading, setTransactionsLoading] = useState(() => !apiClient.peek('/transactions'));
  const [transactionsError, setTransactionsError] = useState(false);

  useEffect(() => {
    if(staffMode){setTransactions(null);setTransactionsLoading(false);setTransactionsError(false);return;}
    let cancelled = false;
    const cached = apiClient.peek('/transactions');
    setTransactions(cached ? {...cached,totalSpent:Number(cached.totalSpent)} : null);
    setSelectedInvoice(null);
    setTransactionsLoading(!cached);
    setTransactionsError(false);
    apiClient.getTransactions().then((result) => {
      if (cancelled) return;
      if (result && !result.error && Array.isArray(result.invoices) && Array.isArray(result.pointTransactions) && result.totalSpent != null && Number.isFinite(Number(result.totalSpent))) {
        setTransactions({ ...result, totalSpent: Number(result.totalSpent) });
      } else setTransactionsError(true);
    }).catch(() => { if (!cancelled) setTransactionsError(true); })
      .finally(() => { if (!cancelled) setTransactionsLoading(false); });
    return () => { cancelled = true; };
  }, [user.id,staffMode]);

  const selectAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    avatarRead.current?.abort();
    const controller = new AbortController();
    avatarRead.current = controller;
    setAvatarReading(true);
    try {
      const avatar = await readAvatar(file,controller.signal);
      if (controller.signal.aborted) return;
      setUserProfile(current => ({...current,avatar}));
      showToast('Đã chọn ảnh. Nhấn Lưu để cập nhật hồ sơ.');
    } catch (error) {
      if (!controller.signal.aborted) showToast(error instanceof Error ? error.message : 'Không đọc được ảnh.');
    } finally {
      if(avatarRead.current===controller){avatarRead.current=null;if(mounted.current)setAvatarReading(false);}
    }
  };

  useEffect(() => {
    if(activeModal==='edit_profile')return;
    setUserProfile((current) => ({
      ...current,
      name: user.name,
      phone: user.phone,
      email: user.email,
      dob: user.dob,
      gender: user.gender,
      address: user.address,
      avatar: user.avatar,
      points: user.points,
      tier: user.tier || '',
      preferredBranch: user.preferredBranch || '',
      skinType: user.skinType || '',
      healthNotes: user.healthNotes || '',
      emergencyContactName: user.emergencyContactName || '',
      emergencyContactPhone: user.emergencyContactPhone || '',
    }));
  }, [user,activeModal]);

  useEffect(()=>()=>{avatarRead.current?.abort();},[activeModal]);

  const saveProfile = async () => {
    if (profileSaveLock.current||avatarRead.current) return;
    profileSaveLock.current=true;
    setSavingProfile(true);
    try {
      const { name, dob, gender, email, address, avatar, emergencyContactName, emergencyContactPhone,preferredBranch,skinType,healthNotes } = userProfile;
      const response = await apiClient.updateProfile({ name, dob, gender, email, address, avatar, ...(staffMode?{}:{emergencyContactName, emergencyContactPhone,preferredBranch,skinType,healthNotes}) });
      if(!mounted.current)return;
      if (response?.user && !response.error) {
        onUserUpdated(response.user);
        setActiveModal(null);
        showToast('Đã lưu hồ sơ vào hệ thống.');
        return;
      }
      showToast(response?.error || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } catch {
      showToast('Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally { profileSaveLock.current=false;if(mounted.current)setSavingProfile(false); }
  };

  // Edit Profile sub-tab
  const [profileSubTab, setProfileSubTab] = useState<'personal' | 'health'>('personal');

  // Digital Card Barcode/QR toggle
  const cardShareLock=useRef(false);
  const [sharingCard,setSharingCard]=useState(false);
  const referralShareLock=useRef(false);
  const [sharingReferral,setSharingReferral]=useState(false);
  const shareReferral=async()=>{
    if(!referralCode||referralShareLock.current)return;
    referralShareLock.current=true;setSharingReferral(true);
    const text=[translate(`Mã giới thiệu MLD Việt Nam: ${referralCode}`),metadata?.referral?.terms].filter(Boolean).join('\n');
    try{
      if(/Zalo/i.test(navigator.userAgent)||Boolean((window as any).ZJSBridge))await openShareSheet({type:'text',data:{text}});
      else if(navigator.share)await navigator.share({title:'Mã giới thiệu MLD Việt Nam',text});
      else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);showToast('Đã sao chép mã giới thiệu.');}
      else showToast('Thiết bị không hỗ trợ chia sẻ.');
    }catch(error){if((error as {name?:string})?.name!=='AbortError')showToast('Không thể chia sẻ mã. Vui lòng thử lại.');}
    finally{referralShareLock.current=false;if(mounted.current)setSharingReferral(false);}
  };
  const shareCard=async()=>{
    if(!membershipCardCode||cardShareLock.current)return;
    cardShareLock.current=true;setSharingCard(true);
    const text=[user.name,membershipCardCode].filter(Boolean).join('\n');
    try {
      if(/Zalo/i.test(navigator.userAgent)||Boolean((window as any).ZJSBridge)) {
        await openShareSheet({type:'text',data:{text}});
      } else if(navigator.share)await navigator.share({title:'Thẻ hội viên',text});
      else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);showToast('Đã sao chép thông tin thẻ.');}
      else showToast('Thiết bị không hỗ trợ chia sẻ.');
    } catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))showToast('Không thể chia sẻ thẻ. Vui lòng thử lại.');}
    finally{cardShareLock.current=false;if(mounted.current)setSharingCard(false);}
  };

  // Points sub-tab
  const [pointsTab, setPointsTab] = useState<'rewards' | 'tiers' | 'history'>(notificationTarget?.tab === 'points' ? 'history' : 'rewards');

  // Vouchers state & sub-tab
  const [voucherTab, setVoucherTab] = useState<'available' | 'used' | 'expired'>(() => {
    const status = notificationTarget?.tab === 'vouchers' ? vouchers.find(item => item.id === notificationTarget.entityId)?.status : undefined;
    return status === 'used' ? 'used' : status === 'expired' ? 'expired' : 'available';
  });
  const [voucherInput, setVoucherInput] = useState('');
  const voucherClaimLock=useRef(false);
  const [voucherClaiming,setVoucherClaiming]=useState(false);
  const [vouchersList, setVouchersList] = useState<Voucher[]>(vouchers);
  useEffect(() => setVouchersList(vouchers), [vouchers]);

  // Invoice detail modal state
  const [selectedInvoice, setSelectedInvoice] = useState<ProfileInvoice | null>(null);
  useEffect(() => {
    if (notificationTarget?.tab === 'payments' && transactions) setSelectedInvoice(transactions.invoices.find(item => item.id === notificationTarget.entityId) || null);
  }, [notificationTarget, transactions]);
  useEffect(() => {
    if (notificationTarget?.entityId && activeModal === notificationTarget.tab && activeModal !== 'payments') document.getElementById(`profile-entry-${notificationTarget.entityId}`)?.scrollIntoView({block:'center'});
  }, [notificationTarget, activeModal, transactions, vouchersList, voucherTab]);

  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);
  const handleCopy = async (text: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if(!mounted.current)return;
      setCopiedVoucher(text);
      showToast(`Đã sao chép: ${text}`);
      clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedVoucher(null), 2000);
    } catch { showToast('Không thể sao chép. Vui lòng thử lại.'); }
  };

  const voucherLabel = (voucher: Voucher) => {
    if (voucher.discountType === 'percent') return `GIẢM ${voucher.discountValue}%`;
    const amount = voucher.discountValue ?? voucher.discountAmount;
    if (amount == null) return '';
    return `GIẢM ${amount.toLocaleString('vi-VN')} đ`;
  };

  const voucherExpiry = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
  };

  const useVoucher = (voucher: Voucher) => {
    if (!onSelectVoucher) return;
    onSelectVoucher(voucher);
    setActiveModal(null);
  };

  const handleApplyNewVoucher = async () => {
    const clean = voucherInput.trim().toUpperCase();
    if (!clean || voucherClaimLock.current) return;
    if (vouchersList.some((v) => v.code === clean)) {
      showToast('Mã voucher này đã có trong ví của bạn!');
      return;
    }
    voucherClaimLock.current=true;setVoucherClaiming(true);
    const epoch=apiClient.sessionVersion();
    try {
      const response = await apiClient.claimVoucher(clean);
      if(!mounted.current||apiClient.sessionVersion()!==epoch)return;
      if (!response?.voucher || response.error) {showToast(response?.error || 'Không thể thêm mã ưu đãi.');return;}
      const next = [response.voucher, ...vouchersList.filter(item=>item.id!==response.voucher.id)];
      setVouchersList(next);onVouchersUpdated(next);setVoucherInput('');
      showToast(response.message || `Đã thêm mã ${clean} vào ví ưu đãi!`);
    } catch {showToast('Không thể thêm mã ưu đãi.');}
    finally {voucherClaimLock.current=false;if(mounted.current)setVoucherClaiming(false);}
  };

  const money = (value: unknown) => value != null && Number.isFinite(Number(value)) ? `${Number(value).toLocaleString('vi-VN')} ₫` : '';
  const dateLabel = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN') : '';
  const transactionMessage = transactionsLoading ? 'Đang tải giao dịch...' : transactionsError ? 'Không thể tải giao dịch. Vui lòng mở lại trang.' : null;
  const receiptUrl = (value?: string | null) => {
    if (!value) return undefined;
    try { const url = new URL(value, window.location.origin); return url.protocol === 'https:' || url.origin === window.location.origin ? url.href : undefined; }
    catch { return undefined; }
  };

  return (
    <div className="space-y-3 px-3 pt-3 pb-20 animate-fade-in relative">
      {/* Toast Notification */}
      {toastMessage && (
        <ProfileLayer role="status" className="pointer-events-none fixed top-14 left-1/2 -translate-x-1/2 z-[200] bg-[#183b47] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl flex items-center space-x-2 animate-bounce">
          <span>{toastMessage}</span>
        </ProfileLayer>
      )}

      {/* =========================================================================
          F01: TÀI KHOẢN CỦA TÔI (PROFILE HOME FIGMA 100%)
      ========================================================================= */}
      {/* User Header Profile Card (Matching Figma F01) */}
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center space-x-3">
          {user.avatar ? <img
            src={user.avatar}
            alt="Avatar"
            className="w-12 h-12 rounded-full object-cover border border-[#c8dde3]"
          /> : <div className="w-12 h-12 rounded-full bg-white border border-[#c8dde3] flex items-center justify-center"><UserCheckIcon size={24} /></div>}
          <div className="min-w-0 break-words">
            <h2 className="text-sm font-bold text-[#183b47]">{user.name}</h2>
            <p className="text-[11px] text-[#526a73] mt-0.5">{user.phone}{metadata?.phoneVerified === true ? ' · Đã xác thực' : ''}</p>
            <span className="inline-block px-2 py-0.5 rounded-full bg-[#f1f8fa] text-[#2860eb] text-[10px] font-semibold mt-1">
              {staffMode?staffRoleLabel(user.role):userProfile.tier}
            </span>
          </div>
        </div>
        <button
          onClick={() => setActiveModal('edit_profile')}
          className="w-8 h-8 rounded-full bg-white border border-[#c8dde3] flex items-center justify-center text-[#526a73] hover:text-[#183b47] shadow-xs transition active:scale-95"
          title="Chỉnh sửa thông tin"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
      </div>

      {staffMode?<StaffWorkspace data={staffDashboard} error={summaryError} onRetry={onRefreshData}
        onAppointments={onOpenAppointments} onCustomers={section=>onOpenCustomers?.(section)} onAcademy={onOpenAcademy}
        onDocuments={()=>onOpenDocuments?.()} onCommunity={()=>onOpenCommunity?.()}/>:<>
      {/* VIP Gold Card Preview (Figma F01) */}
      <button type="button"
        onClick={() => setActiveModal('digital_card')}
        className="w-full text-left rounded-[10px] p-4 text-white bg-[#9C4F1B] cursor-pointer transition active:scale-[0.99] relative overflow-hidden"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-[10px] font-medium text-white/70">{userProfile.tier}</h3>
          </div>
          <CreditCardIcon size={20} />
        </div>

        <div className="my-3">
          <p className="text-[22px] font-bold text-white">{userProfile.points.toLocaleString()} điểm</p>
          <p className="mt-1 text-[9px] text-white/75">Mã thẻ · {membershipCardCode || ''}</p>
        </div>

        <div className="flex justify-between items-center text-[9px] text-white border-t border-white/20 pt-2">
          <span>▦ &nbsp; Xem thẻ hội viên</span>
          <span>→</span>
        </div>
      </button>

      {summaryError&&<p role="alert" className="text-xs text-red-700">{summaryError} {onRefreshData&&<button type="button" className="underline" onClick={onRefreshData}>Thử lại</button>}</p>}
      <div className="grid grid-cols-3 gap-2" aria-busy={Boolean(user.id&&!summary&&!summaryError)}>
        {[
          { value: summary?String(summary.upcomingBookings):'', label: 'Lịch hẹn', sub: 'sắp tới', action: onOpenAppointments },
          { value: summary?String(summary.remainingTreatmentSessions):'', label: 'Liệu trình', sub: 'buổi còn lại', action: onOpenPackages },
          { value: summary?String(summary.activeCourses):'', label: 'Khóa học', sub: 'đang học', action: onOpenAcademy },
        ].map((item) => (
          <button key={item.label} onClick={item.action} className="min-h-[78px] rounded-[10px] bg-white p-3 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <span className="text-[17px] font-bold text-[#2860eb]">{item.value}</span>
            <span className="mt-1 block text-[9px] font-medium text-[#183b47]">{item.label}</span>
            <span className="block text-[8px] text-[#526a73]">{item.sub}</span>
          </button>
        ))}
      </div>

      {/* Menu Group 1: Dịch vụ của bạn (Figma F01) */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-[#183b47]">
          Dịch vụ của tôi
        </div>
        <div className="bg-white rounded-[10px] border border-[#f1f8fa] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-[#ffffff]">
          <button type="button"
            onClick={onOpenAppointments}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-[#ffffff] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <CalendarIcon size={16} className="text-[#2860eb]" />
              <span className="font-semibold text-[#183b47]">Lịch hẹn của tôi</span>
            </div>
            <span className="text-[#607780]">&gt;</span>
          </button>

          <button type="button"
            onClick={onOpenPackages}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-[#ffffff] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <HeartIcon size={16} className="text-[#2860eb]" />
              <span className="font-semibold text-[#183b47]">Gói liệu trình</span>
            </div>
            <span className="text-[#607780]">&gt;</span>
          </button>

          <button type="button"
            onClick={onOpenAcademy}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-[#ffffff] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <NavAcademyIcon size={16} className="text-[#2860eb]" />
              <span className="font-semibold text-[#183b47]">Khóa học & Chứng nhận của tôi</span>
            </div>
            <span className="text-[#607780]">&gt;</span>
          </button>
        </div>
      </div>

      </>}
      {/* Menu Group 2: Tài khoản & Quyền lợi (Figma F01) */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-[#183b47]">
          {staffMode?'Tài khoản nhân viên':'Tài khoản & Quyền lợi hội viên'}
        </div>
        <div className="bg-white rounded-[10px] border border-[#f1f8fa] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-[#ffffff]">
          {!staffMode&&<><button type="button"
            onClick={() => setActiveModal('vouchers')}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-[#ffffff] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <span className="flex h-7 w-7 items-center justify-center text-[#2860eb]"><TagIcon size={17} /></span>
              <span className="font-semibold text-[#183b47]">Ưu đãi của tôi{summary?` (${vouchersList.filter(v => v.status === 'available').length} voucher)`:''}</span>
            </div>
            <span className="text-[#607780]">&gt;</span>
          </button>

          <button type="button"
            onClick={() => setActiveModal('points')}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-[#ffffff] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <span className="flex h-7 w-7 items-center justify-center text-[#2860eb]"><StarIcon size={17} filled={false} /></span>
              <span className="font-semibold text-[#183b47]">Điểm tích lũy & Hạng hội viên</span>
            </div>
            <span className="text-[#607780]">&gt;</span>
          </button>

          <button type="button"
            onClick={() => setActiveModal('referral')}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-[#ffffff] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <span className="flex h-7 w-7 items-center justify-center text-[#2860eb]"><UserCheckIcon size={17} /></span>
              <span className="font-semibold text-[#183b47]">Giới thiệu bạn bè</span>
            </div>
            <span className="text-[#607780]">&gt;</span>
          </button>

          </>}
          <button type="button"
            onClick={() => setActiveModal('settings')}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-[#ffffff] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <span className="flex h-7 w-7 items-center justify-center text-[#2860eb]"><ShieldIcon size={17} /></span>
              <span className="font-semibold text-[#183b47]">Cài đặt tài khoản & Bảo mật</span>
            </div>
            <span className="text-[#607780]">&gt;</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SCREEN F02: CHUYÊN TRANG THÔNG TIN CÁ NHÂN & EMR PROFILE
      ========================================================================= */}
      {activeModal === 'edit_profile' && (
        <ProfileLayer role="dialog" aria-modal="true" aria-label="Hồ sơ cá nhân" className="profile-overlay absolute inset-0 z-50 bg-[#ffffff] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#c8dde3] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                disabled={savingProfile}
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#ffffff] border border-[#c8dde3] flex items-center justify-center text-[#183b47] hover:bg-[#c8dde3] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#183b47" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-[#183b47]">{staffMode?'Thông tin nhân viên':'Hồ sơ cá nhân & Y tế'}</h2>
                {metadata?.phoneVerified&&<span className="text-[10px] text-emerald-600 font-bold">Đã xác minh qua Zalo</span>}
              </div>
            </div>
            <button
              onClick={saveProfile}
              disabled={savingProfile||avatarReading}
              aria-busy={savingProfile||avatarReading}
              className="text-xs font-bold text-[#2860eb] px-2.5 py-1 rounded-lg bg-[#f1f8fa] hover:bg-[#eff4fe]"
            >
              {savingProfile ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>

          {/* Sub tabs */}
          <div className="flex border-b border-[#c8dde3] bg-white px-4 shrink-0">
            <button
              onClick={() => setProfileSubTab('personal')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                profileSubTab === 'personal'
                  ? 'border-[#2860eb] text-[#2860eb]'
                  : 'border-transparent text-[#526a73]'
              }`}
            >
              Thông tin liên hệ
            </button>
            {!staffMode&&<button
              onClick={() => setProfileSubTab('health')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                profileSubTab === 'health'
                  ? 'border-[#2860eb] text-[#2860eb]'
                  : 'border-transparent text-[#526a73]'
              }`}
            >
              Thể trạng & EMR Notes
            </button>}
          </div>

          <fieldset disabled={savingProfile} className="m-0 min-w-0 flex-1 overflow-y-auto border-0 p-4 space-y-4 pb-24">
            {staffMode||profileSubTab === 'personal' ? (
              <>
                {/* Avatar Picker */}
                <div className="bg-white p-4 rounded-2xl border border-[#c8dde3] shadow-xs text-center space-y-2.5">
                  {userProfile.avatar ? <img
                    src={userProfile.avatar}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-[#2860eb] shadow-sm"
                  /> : <div className="w-20 h-20 mx-auto rounded-full bg-stone-100 flex items-center justify-center"><UserCheckIcon size={32} /></div>}
                  <div>
                    <p className="text-xs font-bold text-[#183b47]">Ảnh đại diện</p>
                    <label htmlFor="profile-avatar-file" className="mx-auto mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#2860eb] bg-white text-xs font-bold text-[#2860eb]">
                      <CameraIcon size={17} /> {avatarReading?'Đang xử lý ảnh...':'Chọn ảnh từ thiết bị'}
                    </label>
                    <input id="profile-avatar-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatarFile} className="hidden" />
                  </div>
                </div>

                {/* Form Fields */}
                <div className="bg-white p-4 rounded-2xl border border-[#c8dde3] shadow-xs space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#526a73] block mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      value={userProfile.name}
                      onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#c8dde3] text-xs font-medium focus:border-[#2860eb] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#526a73] block mb-1">Giới tính</label>
                    <div className="flex space-x-2">
                      {(['Nữ', 'Nam', 'Khác'] as const).map((g) => (
                        <button
                          key={g}
                          onClick={() => setUserProfile({ ...userProfile, gender: g })}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                            userProfile.gender === g
                              ? 'bg-[#2860eb] text-white border-[#2860eb]'
                              : 'bg-white text-stone-700 border-[#c8dde3]'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#526a73] block mb-1">Số điện thoại liên kết</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        disabled
                        value={userProfile.phone}
                        className="flex-1 p-2.5 rounded-xl border border-[#c8dde3] bg-[#ffffff] text-xs font-medium text-[#526a73]"
                      />
                      {metadata?.phoneVerified === true && <span className="text-[10px] text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded-lg">Đã xác thực</span>}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#526a73] block mb-1">Email liên hệ</label>
                    <input
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#c8dde3] text-xs font-medium focus:border-[#2860eb] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#526a73] block mb-1">Ngày sinh</label>
                    <input
                      type="date"
                      value={userProfile.dob?.slice(0, 10) || ''}
                      onChange={(e) => setUserProfile({ ...userProfile, dob: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#c8dde3] text-xs font-medium focus:border-[#2860eb] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#526a73] block mb-1">Địa chỉ sinh sống</label>
                    <input
                      type="text"
                      value={userProfile.address}
                      onChange={(e) => setUserProfile({ ...userProfile, address: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#c8dde3] text-xs font-medium focus:border-[#2860eb] outline-none"
                    />
                  </div>

                  <div>
                    {!staffMode&&<><label className="text-[11px] font-bold text-[#526a73] block mb-1">Chi nhánh yêu thích</label>
                    <select
                      aria-label="Chi nhánh yêu thích"
                      value={userProfile.preferredBranch}
                      onChange={event=>setUserProfile(current=>({...current,preferredBranch:event.target.value}))}
                      className="w-full p-2.5 rounded-xl border border-[#c8dde3] text-xs font-medium focus:border-[#2860eb] outline-none bg-white cursor-pointer"
                    >
                      <option value=""></option>
                      {branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select></>}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Health & EMR Notes */}
                <div className="bg-white p-4 rounded-2xl border border-[#c8dde3] shadow-xs space-y-3.5">

                  <div>
                    <label className="text-[11px] font-bold text-[#526a73] block mb-1">Đặc điểm làn da</label>
                    <input
                      type="text"
                      value={userProfile.skinType}
                      aria-label="Đặc điểm làn da"
                      maxLength={150}
                      onChange={event=>setUserProfile(current=>({...current,skinType:event.target.value}))}
                      className="w-full p-2.5 rounded-xl border border-[#c8dde3] text-xs font-medium focus:border-[#2860eb] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#526a73] block mb-1">
                      Lưu ý thể trạng & Vùng cơ cần chăm sóc đặc biệt
                    </label>
                    <textarea
                      value={userProfile.healthNotes}
                      aria-label="Lưu ý thể trạng"
                      maxLength={10000}
                      onChange={event=>setUserProfile(current=>({...current,healthNotes:event.target.value}))}
                      rows={3}
                      className="w-full p-2.5 rounded-xl border border-[#c8dde3] text-xs font-medium focus:border-[#2860eb] outline-none resize-none"
                    />
                  </div>

                  <div className="border-t border-[#c8dde3] pt-3">
                    <h4 className="text-xs font-bold text-[#183b47] mb-2">Người thân liên hệ khẩn cấp:</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-[#526a73] block mb-0.5">Họ tên người thân</label>
                        <input
                          type="text"
                          value={userProfile.emergencyContactName}
                          aria-label="Họ tên liên hệ khẩn cấp"
                          maxLength={150}
                          onChange={(e) => setUserProfile({ ...userProfile, emergencyContactName: e.target.value })}
                          className="w-full p-2 rounded-xl border border-[#c8dde3] text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#526a73] block mb-0.5">Số điện thoại khẩn cấp</label>
                        <input
                          value={userProfile.emergencyContactPhone}
                          aria-label="Số điện thoại khẩn cấp"
                          type="tel"
                          maxLength={20}
                          onChange={(e) => setUserProfile({ ...userProfile, emergencyContactPhone: e.target.value })}
                          className="w-full p-2 rounded-xl border border-[#c8dde3] text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={saveProfile}
              disabled={savingProfile||avatarReading}
              className="w-full py-3 rounded-xl bg-[#2860eb] text-white text-xs font-bold hover:bg-[#076985] shadow-md transition active:scale-95"
            >
              {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}
            </button>
          </fieldset>
        </ProfileLayer>
      )}

      {/* =========================================================================
          SCREEN F03: CHUYÊN TRANG THẺ HỘI VIÊN ĐIỆN TỬ VIP
      ========================================================================= */}
      {activeModal === 'digital_card' && (
        <ProfileLayer role="dialog" aria-modal="true" aria-label="Thẻ hội viên" className="profile-overlay absolute inset-0 z-50 bg-[#ffffff] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#c8dde3] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#ffffff] border border-[#c8dde3] flex items-center justify-center text-[#183b47] hover:bg-[#c8dde3] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#183b47" />
              </button>
              <h2 className="text-sm font-bold text-[#183b47]">Thẻ hội viên điện tử</h2>
            </div>
            <button
              type="button"
              disabled={!membershipCardCode||sharingCard}
              onClick={shareCard}
              title="Chia sẻ thẻ"
              className="text-xs font-bold text-[#2860eb] px-2 py-1"
            >
              Chia sẻ
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            {/* VIP Card */}
            <div className="rounded-3xl p-5 text-white shadow-xl bg-gradient-to-br from-[#6A3916] via-[#52290D] to-[#3B1C08] border border-[#8C4E20]/60 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8B878]">
                    {metadata?.brandName || 'Thẻ hội viên'}
                  </span>
                  <h4 className="text-sm font-bold text-[#E8B878] mt-0.5">{userProfile.tier.toUpperCase()}</h4>
                </div>
                <CreditCardIcon size={24} />
              </div>

              <div className="my-4">
                <p className="text-sm uppercase font-bold text-white tracking-wide">{user.name}</p>
                <p className="text-[11px] text-[#D2A066] mt-0.5">
                  MÃ THẺ: {membershipCardCode || ''}
                </p>
              </div>

              <div className="flex justify-between items-end text-[10px] text-white/80 border-t border-[#8C4E20]/40 pt-2">
                <span>{userProfile.points.toLocaleString()} điểm khả dụng</span>
                <span>Hạn thẻ: {dateLabel(membershipExpiresAt||undefined)}</span>
              </div>
            </div>

            {/* Code switcher */}
            <div className="p-4 rounded-2xl bg-white border border-[#c8dde3] text-center space-y-3 shadow-xs">
              <div className="flex justify-center space-x-2 border-b border-[#c8dde3] pb-2">
                <span className="px-3 py-1 text-xs font-bold text-[#2860eb]">Mã QR thẻ hội viên</span>
              </div>

              <div className="w-44 h-44 mx-auto bg-white p-2 rounded-2xl border border-[#c8dde3] flex items-center justify-center text-xs text-[#526a73]">
                {membershipCardCode&&<QRCode value={membershipCardCode} size={160}/>}
              </div>
              <p className="font-mono text-sm font-bold text-[#2860eb]">{membershipCardCode || ''}</p>

              <div className="flex space-x-2 pt-1">
                <button
                  disabled
                  title="Chưa hỗ trợ ví điện tử"
                  className="flex-1 py-2 rounded-xl bg-[#f1f8fa] text-[#2860eb] text-xs font-bold hover:bg-[#eff4fe]"
                >
                  Lưu vào Ví điện tử
                </button>
                <button
                  disabled={!membershipCardCode}
                  onClick={() => membershipCardCode && handleCopy(membershipCardCode)}
                  className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200"
                >
                  Sao chép mã thẻ
                </button>
              </div>
            </div>

            {/* VIP Benefits */}
            <div className="bg-white p-4 rounded-2xl border border-[#c8dde3] space-y-2.5 text-xs">
              <h4 className="font-bold text-[#183b47] flex items-center space-x-1.5">
                <CreditCardIcon size={14} />
                <span>Quyền lợi hội viên:</span>
              </h4>
              <div className="space-y-2 text-stone-600 text-[11px]">
                {metadata?.benefits ? metadata.benefits.map((benefit, index) => <p key={index}>{benefit}</p>) : currentTierRule ? <>
                  <p>{currentTierRule.description}</p>
                  <p>Giảm giá dịch vụ: {currentTierRule.discountServicePercent}%</p>
                  <p>Buổi head spa miễn phí: {currentTierRule.freeHeadSpaSessions}</p>
                  <p>Ưu tiên đặt lịch: {currentTierRule.priorityBooking ? 'Có' : 'Không'}</p>
                </> : <p></p>}
              </div>
            </div>
          </div>
        </ProfileLayer>
      )}

      {/* =========================================================================
          SCREEN F04: CHUYÊN TRANG ĐIỂM TÍCH LŨY & TIẾN TRÌNH LÊN HẠNG
      ========================================================================= */}
      {activeModal === 'points' && (
        <ProfileLayer role="dialog" aria-modal="true" aria-label="Điểm tích lũy" className="profile-overlay absolute inset-0 z-50 bg-[#ffffff] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#c8dde3] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#ffffff] border border-[#c8dde3] flex items-center justify-center text-[#183b47] hover:bg-[#c8dde3] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#183b47" />
              </button>
              <h2 className="text-sm font-bold text-[#183b47]">Điểm tích lũy & Hạng hội viên</h2>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="text-xs font-bold text-[#526a73] hover:text-[#2860eb] px-2 py-1"
            >
              Đóng
            </button>
          </div>

          <div className="flex border-b border-[#c8dde3] bg-white px-4 shrink-0">
            <button
              onClick={() => setPointsTab('rewards')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                pointsTab === 'rewards' ? 'border-[#2860eb] text-[#2860eb]' : 'border-transparent text-[#526a73]'
              }`}
            >
              Đổi quà từ điểm
            </button>
            <button
              onClick={() => setPointsTab('tiers')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                pointsTab === 'tiers' ? 'border-[#2860eb] text-[#2860eb]' : 'border-transparent text-[#526a73]'
              }`}
            >
              Bảng hạng hội viên
            </button>
            <button
              onClick={() => setPointsTab('history')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                pointsTab === 'history' ? 'border-[#2860eb] text-[#2860eb]' : 'border-transparent text-[#526a73]'
              }`}
            >
              Lịch sử điểm
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            {/* Points Summary Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#c8dde3] shadow-xs text-center space-y-1">
              <span className="text-[11px] font-semibold text-[#526a73]">Điểm thưởng khả dụng</span>
              <div className="text-3xl font-black text-[#2860eb]">{userProfile.points.toLocaleString()} điểm</div>
              <p className="text-xs">{userProfile.tier}</p>
            </div>
            {pointsTab === 'rewards' && <div className="space-y-2 text-xs"><p></p>{loyalty && <><p>Tích 1 điểm / {money(loyalty.earnAmountPerPoint)}</p><p>Giá trị 1 điểm: {money(loyalty.redeemValuePerPoint)}</p><p>Giới hạn sử dụng: {loyalty.maxRedeemPercentPerOrder}% mỗi đơn</p><p>Thời hạn điểm: {loyalty.pointExpiryMonths} tháng</p></>}</div>}
            {pointsTab === 'tiers' && <div className="space-y-2 text-xs">{tierRules ? tierRules.map(rule => <div key={rule.tier} className="p-3 bg-white rounded-xl border border-[#c8dde3]"><p className="font-bold">{rule.tier}</p><p>Chi tiêu tối thiểu: {money(rule.minAccumulatedSpent)}</p><p>Tỷ lệ tích điểm: {rule.pointEarningRate}%</p><p>{rule.description}</p></div>) : <p></p>}</div>}

            {pointsTab === 'history' && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-[#183b47]">Lịch sử giao dịch điểm:</h4>
                {transactionMessage && <p className="text-xs">{transactionMessage}</p>}
                {transactions?.pointTransactions.map((h) => (
                  <div key={h.id} id={`profile-entry-${h.id}`} className="p-3 bg-white rounded-xl border border-[#c8dde3] flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-[#183b47]">{h.description}</p>
                      <p className="text-[10px] text-[#526a73] mt-0.5">{new Date(h.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <span className={`font-black ${h.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {h.points >= 0 ? '+' : ''}{h.points.toLocaleString('vi-VN')} điểm
                    </span>
                  </div>
                ))}
                {transactions && !transactions.pointTransactions.length && <p className="py-8 text-center text-xs text-[#526a73]"></p>}
              </div>
            )}
          </div>
        </ProfileLayer>
      )}

      {/* =========================================================================
          SCREEN F05: CHUYÊN TRANG ƯU ĐÃI & KHO VOUCHER
      ========================================================================= */}
      {activeModal === 'vouchers' && (
        <ProfileLayer role="dialog" aria-modal="true" aria-label="Ưu đãi của tôi" className="profile-overlay absolute inset-0 z-50 bg-[#ffffff] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#c8dde3] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#ffffff] border border-[#c8dde3] flex items-center justify-center text-[#183b47] hover:bg-[#c8dde3] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#183b47" />
              </button>
              <h2 className="text-sm font-bold text-[#183b47]">Kho ưu đãi & Mã giảm giá</h2>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="text-xs font-bold text-[#526a73] hover:text-[#2860eb] px-2 py-1"
            >
              Đóng
            </button>
          </div>

          {/* Add voucher input bar */}
          <div className="p-3.5 bg-white border-b border-[#c8dde3] flex items-center space-x-2 shrink-0">
            <input
              type="text"
              placeholder="Nhập mã voucher..."
              disabled={voucherClaiming}
              maxLength={60}
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value)}
              className="flex-1 p-2.5 rounded-xl border border-[#c8dde3] bg-[#ffffff] text-xs font-mono uppercase font-bold outline-none focus:border-[#2860eb]"
            />
            <button
              onClick={handleApplyNewVoucher}
              disabled={voucherClaiming||!voucherInput.trim()}
              aria-busy={voucherClaiming}
              className="px-4 py-2.5 rounded-xl bg-[#2860eb] text-white text-xs font-bold hover:bg-[#076985] active:scale-95 transition"
            >
              {voucherClaiming?'Đang thêm...':'Áp dụng'}
            </button>
          </div>

          {/* Voucher Tabs */}
          <div className="flex border-b border-[#c8dde3] bg-white px-4 shrink-0">
            {[
              { id: 'available', label: `Khả dụng (${vouchersList.filter(v => v.status === 'available').length})` },
              { id: 'used', label: `Đã dùng (${vouchersList.filter(v => v.status === 'used').length})` },
              { id: 'expired', label: `Hết hạn (${vouchersList.filter(v => v.status === 'expired').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVoucherTab(tab.id as any)}
                className={`flex-1 py-2 text-xs font-bold border-b-2 text-center transition ${
                  voucherTab === tab.id ? 'border-[#2860eb] text-[#2860eb]' : 'border-transparent text-[#526a73]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-24">
            {vouchersList
              .filter((v) => v.status === voucherTab)
              .map((vc, idx) => (
                <div key={idx} id={`profile-entry-${vc.id}`} className="bg-white p-4 rounded-2xl border border-[#c8dde3] shadow-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-extrabold text-[#2860eb] bg-[#ffffff] px-2.5 py-1 rounded-md border border-[#c8dde3]">
                      {voucherLabel(vc)}
                    </span>
                    <span className="text-[11px] text-[#526a73]">HSD: {voucherExpiry(vc.expiryDate)}</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#183b47]">{vc.title}</h4>
                  <p className="text-[11px] text-[#526a73] leading-relaxed">{vc.description}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-[#c8dde3]">
                    <span className="font-mono text-xs font-black text-[#2860eb]">{vc.code}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCopy(vc.code)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#ffffff] text-stone-700 text-[11px] font-bold border border-[#c8dde3]"
                      >
                        {copiedVoucher === vc.code ? 'Đã chép ✓' : 'Sao chép'}
                      </button>
                      {vc.status === 'available' && (
                        <button
                          onClick={() => useVoucher(vc)}
                          disabled={!onSelectVoucher}
                          title={!onSelectVoucher ? 'Chưa hỗ trợ chuyển voucher sang đơn hàng' : 'Chọn voucher cho đơn hàng'}
                          className="px-3.5 py-1.5 rounded-lg bg-[#2860eb] text-white text-[11px] font-bold hover:bg-[#076985]"
                        >
                          {onSelectVoucher ? 'Chọn voucher' : 'Chưa hỗ trợ'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </ProfileLayer>
      )}

      {/* =========================================================================
          SCREEN F06: CHUYÊN TRANG LỊCH SỬ GIAO DỊCH & HÓA ĐƠN ĐIỆN TỬ
      ========================================================================= */}
      {activeModal === 'payments' && (
        <div className="absolute inset-0 z-50 bg-[#ffffff] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#c8dde3] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#ffffff] border border-[#c8dde3] flex items-center justify-center text-[#183b47] hover:bg-[#c8dde3] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#183b47" />
              </button>
              <h2 className="text-sm font-bold text-[#183b47]">Lịch sử giao dịch & Hóa đơn</h2>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="text-xs font-bold text-[#526a73] hover:text-[#2860eb] px-2 py-1"
            >
              Đóng
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            {/* Total Expense Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#c8dde3] shadow-xs text-center space-y-1">
              <span className="text-[11px] font-semibold text-[#526a73]">Tổng chi tiêu tích lũy</span>
              <div className="text-2xl font-black text-[#2860eb]">{transactions ? money(transactions.totalSpent) : transactionMessage}</div>
              {transactions && <p className="text-[11px] text-[#607780]">{transactions.invoices.filter((item) => item.paymentStatus === 'PAID').length} giao dịch hoàn tất</p>}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#183b47]">Danh sách hóa đơn:</h4>
              {transactions?.invoices.map((item) => {
                const inv = { id: item.invoiceCode, service: item.items?.map(line => line.itemName).join(', ') || '', branch: item.branchName || item.branch?.name || '', date: dateLabel(item.paidAt), method: item.paymentMethod, price: money(item.totalAmount), status: item.paymentStatus };
                return <div key={item.id} className="p-4 rounded-2xl border border-[#c8dde3] bg-white shadow-xs space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] text-stone-400 font-bold block">{inv.id}</span>
                      <p className="font-bold text-[#183b47] text-xs mt-0.5">{inv.service}</p>
                    </div>
                    <span className="font-black text-[#2860eb] text-sm">{inv.price}</span>
                  </div>

                  <div className="text-[11px] text-[#526a73] space-y-0.5">
                    <p>📍 {inv.branch}</p>
                    <p>⏱ {inv.date} · {inv.method}</p>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#ffffff]">
                    <span className="text-[10px] text-stone-700 bg-stone-100 px-2 py-0.5 rounded font-bold">
                      ● {inv.status}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedInvoice(item)}
                        className="px-2.5 py-1 rounded-lg bg-[#ffffff] text-[#2860eb] text-[11px] font-bold border border-[#c8dde3]"
                      >
                        Chi tiết hóa đơn
                      </button>
                      <button
                        onClick={() => {
                          setActiveModal(null);
                          onOpenAppointments();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#2860eb] text-white text-[11px] font-bold"
                      >
                        Đặt lịch
                      </button>
                    </div>
                  </div>
                </div>;
              })}
              {transactions && !transactions.invoices.length && <p className="py-8 text-center text-xs text-[#526a73]"></p>}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal Overlay */}
      {selectedInvoice && (
        <div className="absolute inset-0 z-50 bg-[#ffffff] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#c8dde3] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 rounded-full bg-[#ffffff] border border-[#c8dde3] flex items-center justify-center text-[#183b47]"
              >
                <ArrowLeftIcon size={16} color="#183b47" />
              </button>
              <h3 className="text-sm font-bold text-[#183b47]">Chi tiết hóa đơn</h3>
            </div>
            <button
              onClick={() => setSelectedInvoice(null)}
              className="text-xs text-[#2860eb] font-bold"
            >
              Đóng
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
            <div className="bg-white p-5 rounded-2xl border border-[#c8dde3] shadow-sm space-y-3 text-xs">
              <div className="border-b border-[#ffffff] pb-2 text-center">
                <h4 className="font-black text-sm text-[#183b47]">{selectedInvoice.branchName || selectedInvoice.branch?.name || ''}</h4>
                <p className="text-[10px] text-stone-500 mt-0.5"></p>
                <p className="font-mono text-xs font-bold text-[#2860eb] mt-1">Số: {selectedInvoice.invoiceCode}</p>
              </div>

              <div className="space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span>Khách hàng hiện tại:</span>
                  <span className="font-bold text-stone-900">{selectedInvoice.customer?.fullName || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Số điện thoại hiện tại:</span>
                  <span className="font-bold text-stone-900">{selectedInvoice.customer?.phone || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dịch vụ thực hiện:</span>
                  <span className="font-bold text-[#183b47]">{selectedInvoice.items?.map(line => `${line.itemName} × ${line.quantity}: ${money(line.amount)}`).join('; ') || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian ghi nhận:</span>
                  <span>{dateLabel(selectedInvoice.paidAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phương thức:</span>
                  <span>{selectedInvoice.paymentMethod}</span>
                </div>
              </div>

              <div className="border-t border-[#ffffff] pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Tiền dịch vụ:</span>
                  <span className="font-bold">{money(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Giảm giá:</span>
                  <span>{money(selectedInvoice.discountAmount)}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Giảm từ điểm:</span>
                  <span>{money(selectedInvoice.pointsRedeemedAmount)}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Thuế GTGT:</span>
                  <span>{money(selectedInvoice.vatAmount)}</span>
                </div>
                <div className="flex justify-between text-[#2860eb] font-black text-sm pt-1 border-t border-dashed border-stone-200">
                  <span>TỔNG THANH TOÁN:</span>
                  <span>{money(selectedInvoice.totalAmount)}</span>
                </div>
              </div>
            </div>

            {receiptUrl(selectedInvoice.receiptPdfUrl) ? <a href={receiptUrl(selectedInvoice.receiptPdfUrl)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="block text-center w-full py-3 rounded-xl bg-[#2860eb] text-white text-xs font-bold">Mở hóa đơn điện tử PDF</a> : <p className="text-center text-xs text-[#526a73]"></p>}
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN F07: CHUYÊN TRANG GIỚI THIỆU BẠN BÈ
      ========================================================================= */}
      {activeModal === 'referral' && (
        <ProfileLayer role="dialog" aria-modal="true" aria-label="Giới thiệu bạn bè" className="profile-overlay absolute inset-0 z-50 bg-[#ffffff] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="shrink-0 px-3 pb-2 pt-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-[8px] bg-white border border-[#c8dde3] flex items-center justify-center text-[#183b47] active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#183b47" />
              </button>
            </div>
            <h2 className="mt-2 text-[21px] font-bold text-[#164e63]">Giới thiệu bạn bè</h2>
            <p className="mt-1 text-[10px] text-[#526a73]">{metadata?.referral?.terms || ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-24">
            <div className="overflow-hidden rounded-[10px] bg-white">
              <div className="p-3">
                <h4 className="text-[13px] font-bold text-[#164e63]">Mời bạn cùng trải nghiệm</h4>
                <p className="mt-2 text-[9px] leading-relaxed text-[#526a73]"></p>
              </div>
            </div>

            <div className="p-3 rounded-[10px] bg-[#eff4fe] space-y-3">
              <span className="text-[9px] text-[#526a73]">Mã giới thiệu của bạn</span>
              <p className="text-[13px] font-bold text-[#2860eb]">{referralCode || ''}</p>
              <div className="flex space-x-2">
                <button
                  disabled={!referralCode}
                  onClick={() => referralCode && handleCopy(referralCode)}
                  className="flex-1 h-10 rounded-[8px] bg-white text-[#2860eb] text-[10px] font-bold border border-[#2860eb]"
                >
                  {referralCode && copiedVoucher === referralCode ? 'Đã sao chép ✓' : 'Sao chép mã'}
                </button>
                <button type="button" disabled={!referralCode||sharingReferral} onClick={()=>void shareReferral()} className="flex-1 h-10 rounded-[8px] bg-[#2860eb] text-white text-[10px] font-bold disabled:opacity-50">{sharingReferral?'Đang chia sẻ…':'Chia sẻ mã'}</button>
              </div>
            </div>

            <div className="bg-white p-3 rounded-[10px] border border-[#c8dde3] space-y-2.5 text-xs">
              <h5 className="font-bold text-[#164e63]">Lịch sử giới thiệu</h5>
              <div className="space-y-2">
                {membership?.referrals?.map((f) => (
                  <div key={f.id} className="flex justify-between items-center p-2 rounded-xl bg-[#ffffff] text-[11px]">
                    <span className="font-semibold text-stone-900">{dateLabel(f.createdAt)}</span>
                    <span className={f.isRewarded ? 'text-emerald-700 font-bold' : 'text-amber-700 font-semibold'}>
                      {f.isRewarded ? `Đã thưởng ${f.rewardPoints} điểm` : 'Chưa nhận thưởng'}
                    </span>
                  </div>
                ))}
                {!membership?.referrals && <p>Không thể tải lịch sử giới thiệu.</p>}
                {membership?.referrals?.length === 0 && <p></p>}
              </div>
            </div>
          </div>
        </ProfileLayer>
      )}

      {/* =========================================================================
          SCREEN F08: CHUYÊN TRANG CÀI ĐẶT & THÔNG BÁO & BẢO MẬT
      ========================================================================= */}
      {activeModal === 'settings' && (
        <ProfileLayer role="dialog" aria-modal="true" aria-label="Cài đặt tài khoản" className="profile-overlay absolute inset-0 z-50 bg-[#ffffff] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="shrink-0 px-3 pb-2 pt-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-[8px] bg-white border border-[#c8dde3] flex items-center justify-center text-[#183b47] active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#183b47" />
              </button>
            </div>
            <h2 className="mt-2 text-[21px] font-bold text-[#164e63]">Cài đặt tài khoản</h2>
            <LegalLinks />
            <p className="mt-1 text-[10px] text-[#526a73]">Quản lý trải nghiệm, bảo mật và các tùy chọn của bạn.</p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-24">
            <div>
              <h3 className="mb-2 text-[13px] font-bold text-[#164e63]">Tài khoản</h3>
              <div className="overflow-hidden rounded-[10px] bg-white divide-y divide-[#f1f8fa]">
                {['Thông tin cá nhân', 'Số điện thoại liên kết'].map((label, index) => (
                  <button key={label} onClick={() => setActiveModal('edit_profile')} className="flex min-h-11 w-full items-center justify-between px-3 text-left">
                    <span className="text-[10px] text-[#183b47]">{label}{index === 1 && <small className="block text-[8px] text-[#526a73]">{user.phone || ''}</small>}</span><span className="text-[#607780]">›</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[13px] font-bold text-[#164e63]">Thông báo</h3>
              {!settings && <p className="text-xs text-[#526a73]">{settingsStatus === 'loading' ? 'Đang tải cài đặt...' : settingsStatus === 'missing' ? '' : 'Không thể tải cài đặt tài khoản.'}</p>}
              {settingsStatus==='error'&&<button type="button" className="my-2 text-xs font-bold text-[#2860eb]" onClick={()=>{apiClient.invalidateReadPaths(['/auth/settings']);setSettingsVersion(value=>value+1);}}>Thử lại</button>}
              {settingsStatus === 'missing' && <button disabled={settingsSaving} onClick={() => saveSetting({})} className="my-2 text-xs font-bold text-[#2860eb]">{settingsSaving ? 'Đang lưu...' : 'Lưu cài đặt mặc định của hệ thống'}</button>}
              <div className="bg-white p-2 rounded-[10px] divide-y divide-[#f1f8fa] text-xs">
              {[
                { key: 'appointmentReminder' as const, label: 'Thông báo lịch hẹn' },
                { key: 'systemNotify' as const, label: 'Hiển thị thông báo hệ thống' },
                { key: 'promotionNotify' as const, label: 'Hiển thị thông báo ưu đãi' },
              ].filter(st=>!staffMode||st.key!=='promotionNotify').map((st) => (
                <label key={st.key} className="flex justify-between items-center p-2 cursor-pointer">
                  <span className="text-[10px] text-[#183b47]">{st.label}<small className="block text-[8px] text-[#526a73]">{settings ? settings[st.key] ? 'Đang bật' : 'Đang tắt' : ''}</small></span>
                  <input
                    type="checkbox"
                    checked={settings?.[st.key] === true}
                    disabled={!settings || settingsSaving}
                    onChange={(e) => saveSetting({ [st.key]: e.target.checked })}
                    className="h-5 w-9 appearance-none rounded-full bg-[#DDC8B7] checked:bg-[#2860eb] relative cursor-pointer after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition checked:after:translate-x-4"
                  />
                </label>
              ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#c8dde3] shadow-xs space-y-3 text-xs">
              <h4 className="font-bold text-[#183b47]">Bảo mật & Hệ thống:</h4>
              <label className="flex items-center justify-between gap-2">
                <span>Ngôn ngữ giao diện</span><select aria-label="Ngôn ngữ giao diện" value={settings?.language||'vi'} disabled={settingsSaving||!['loaded','missing'].includes(settingsStatus)} onChange={event=>void saveSetting({language:event.target.value})}><option value="vi">Tiếng Việt</option><option value="en">English</option></select>
              </label>

              <button
                onClick={()=>{apiClient.clearReadCache();showToast('Đã xóa dữ liệu tải tạm.');onRefreshData?.();}}
                className="w-full py-2.5 rounded-xl border border-[#c8dde3] text-xs font-bold text-stone-700 hover:bg-stone-50 text-left px-3 flex justify-between items-center"
              >
                <span>Xóa dữ liệu tải tạm</span>
              </button>

              <button
                disabled={!onLogout}
                onClick={async () => {
                  try { await onLogout?.(); }
                  catch { showToast('Không thể đăng xuất. Vui lòng thử lại.'); }
                }}
                title={!onLogout ? 'Chưa kết nối luồng đăng xuất và xóa trạng thái tài khoản' : 'Đăng xuất'}
                className="w-full py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition"
              >
                {onLogout ? 'Đăng xuất tài khoản' : 'Đăng xuất chưa khả dụng'}
              </button>
              {onManageSessions&&<button type="button" className="flex w-full min-h-11 items-center gap-2 rounded-[8px] border border-[#c8dde3] px-3 py-2 text-left text-xs font-semibold text-[#076985]" onClick={onManageSessions}><ShieldIcon size={18}/>Tài khoản & thiết bị</button>}
            </div>
          </div>
        </ProfileLayer>
      )}
    </div>
  );
};
