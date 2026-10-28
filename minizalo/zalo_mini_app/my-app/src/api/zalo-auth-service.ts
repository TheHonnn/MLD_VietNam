import { getUserInfo, getPhoneNumber, getAccessToken } from 'zmp-sdk';
import { apiClient } from './client';
import { SupabaseDataService } from './supabase';
import { UserProfile } from '@/core/types';

export const GUEST_USER_PROFILE: UserProfile = {
  id: '',
  fullName: 'Khách hàng',
  phone: '',
  isPhoneVerified: false,
  email: '',
  gender: 'Nữ',
  dateOfBirth: '',
  address: '',
  avatarUrl: '',
  memberCode: '',
};

class ZaloAuthService {
  /**
   * Lấy thông tin hồ sơ hiện tại từ localStorage hoặc trả về hồ sơ Khách
   */
  getProfile(): UserProfile {
    return SupabaseDataService.getUserProfile();
  }

  /**
   * Kiểm tra người dùng có đang ở chế độ khách hay không
   */
  isGuest(profile?: UserProfile): boolean {
    const p = profile || this.getProfile();
    return !p.isPhoneVerified || !p.phone;
  }

  /**
   * Chuẩn hóa số điện thoại Việt Nam (09xxxxxxxx)
   */
  normalizePhone(raw: string): string {
    if (!raw) return '';
    let phone = raw.trim().replace(/[\s().-]/g, '');
    if (phone.startsWith('+84')) phone = '0' + phone.slice(3);
    if (phone.startsWith('84') && phone.length >= 11) phone = '0' + phone.slice(2);
    return phone;
  }

  /**
   * Đăng nhập Zalo 1-Chạm:
   * 1. Gọi Zalo SDK getUserInfo để lấy tên & ảnh đại diện
   * 2. Gọi getPhoneNumber để lấy token số điện thoại
   * 3. Giải mã và tra cứu/tạo User trong CSDL Supabase
   * 4. Đồng bộ vào localStorage và bắn sự kiện cập nhật
   */
  async loginWithZalo(manualPhoneFallback?: string): Promise<{
    success: boolean;
    user?: UserProfile;
    error?: string;
  }> {
    let zaloName = '';
    let zaloAvatar = '';
    let verifiedPhone = '';

    // 1. Lấy thông tin cơ bản từ Zalo (Tên & Avatar)
    try {
      const infoRes = await getUserInfo({ autoRequestPermission: true, avatarType: 'large' });
      if (infoRes?.userInfo) {
        zaloName = infoRes.userInfo.name || '';
        zaloAvatar = infoRes.userInfo.avatar || '';
      }
    } catch (e) {
      console.warn('[ZaloAuth] getUserInfo unavailable or outside Zalo client:', e);
    }

    // 2. Lấy số điện thoại
    if (manualPhoneFallback && manualPhoneFallback.trim()) {
      verifiedPhone = this.normalizePhone(manualPhoneFallback);
    } else {
      try {
        // Thử luồng backend relay / apiClient chuẩn
        const authData = await apiClient.loginWithZalo(true);
        if (authData?.user?.phone) {
          verifiedPhone = this.normalizePhone(authData.user.phone);
          if (!zaloName && authData.user.name) zaloName = authData.user.name;
          if (!zaloAvatar && authData.user.avatar) zaloAvatar = authData.user.avatar;
        } else if (authData?.phone) {
          verifiedPhone = this.normalizePhone(authData.phone);
        }
      } catch (sdkErr: any) {
        console.warn('[ZaloAuth] apiClient.loginWithZalo error:', sdkErr);
      }

      // Fallback: nếu chưa lấy được qua backend, thử gọi trực tiếp getPhoneNumber
      if (!verifiedPhone) {
        try {
          const phoneRes: any = await getPhoneNumber();
          if (phoneRes?.number) {
            verifiedPhone = this.normalizePhone(phoneRes.number);
          } else if (phoneRes?.data?.number) {
            verifiedPhone = this.normalizePhone(phoneRes.data.number);
          }
        } catch (phoneErr: any) {
          console.warn('[ZaloAuth] Direct getPhoneNumber error:', phoneErr);
        }
      }
    }

    // Nếu không lấy được số điện thoại tự động (chạy trên web preview hoặc người dùng từ chối)
    if (!verifiedPhone) {
      return {
        success: false,
        error: 'Chưa lấy được số điện thoại từ Zalo. Bạn có thể nhập số điện thoại để xác thực.',
      };
    }

    // 3. Tra cứu hoặc tạo User trong CSDL Supabase
    try {
      const finalProfile = await this.syncWithSupabase(verifiedPhone, zaloName, zaloAvatar);
      
      // Bắn event toàn app để MainLayout và các màn hình tự re-render
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mld:profile-updated', { detail: finalProfile }));
      }

      return {
        success: true,
        user: finalProfile,
      };
    } catch (err: any) {
      console.error('[ZaloAuth] Sync with Supabase error:', err);
      // Vẫn tạo local profile để không làm gián đoạn trải nghiệm người dùng
      const localProfile: UserProfile = {
        id: `usr-${Date.now()}`,
        fullName: zaloName || 'Khách hàng MLD',
        phone: verifiedPhone,
        isPhoneVerified: true,
        email: '',
        gender: 'Nữ',
        dateOfBirth: '1995-01-01',
        address: '',
        avatarUrl: zaloAvatar || '',
        memberCode: `MLD-${verifiedPhone.slice(-6)}`,
      };
      SupabaseDataService.saveUserProfile(localProfile);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mld:profile-updated', { detail: localProfile }));
      }
      return {
        success: true,
        user: localProfile,
      };
    }
  }

  /**
   * Tra cứu User theo số điện thoại trên bảng users của Supabase.
   * Nếu đã có: đồng bộ dữ liệu. Nếu chưa có: tạo profile mới.
   */
  async syncWithSupabase(phone: string, fallbackName?: string, fallbackAvatar?: string): Promise<UserProfile> {
    const cleanPhone = this.normalizePhone(phone);
    const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://wstvwushpwcdsmhpunvh.supabase.co';
    const SUPABASE_ANON_KEY =
      (import.meta as any).env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';

    let dbUser: any = null;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${cleanPhone}&select=*`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          dbUser = list[0];
        }
      }
    } catch (e) {
      console.warn('[ZaloAuth] Lookup user on Supabase failed:', e);
    }

    const profile: UserProfile = {
      id: dbUser?.id || `usr-${Date.now()}`,
      fullName: dbUser?.full_name || fallbackName || 'Khách hàng MLD',
      phone: cleanPhone,
      isPhoneVerified: true,
      email: dbUser?.email || '',
      gender: dbUser?.gender || 'Nữ',
      dateOfBirth: dbUser?.date_of_birth || '1995-01-01',
      address: dbUser?.address || '',
      avatarUrl: dbUser?.avatar_url || fallbackAvatar || '',
      memberCode: dbUser?.referral_code || dbUser?.member_code || `MLD-${cleanPhone.slice(-6)}`,
    };

    SupabaseDataService.saveUserProfile(profile);

    // Kéo các lịch hẹn liên quan đến số điện thoại này từ Supabase
    this.syncAppointmentsFromSupabase(cleanPhone).catch(console.warn);

    return profile;
  }

  /**
   * Kéo danh sách lịch hẹn của SĐT từ CSDL Supabase
   */
  async syncAppointmentsFromSupabase(phone: string): Promise<void> {
    const cleanPhone = this.normalizePhone(phone);
    if (!cleanPhone) return;

    const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://wstvwushpwcdsmhpunvh.supabase.co';
    const SUPABASE_ANON_KEY =
      (import.meta as any).env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?booked_for_phone=eq.${cleanPhone}&select=*&order=booking_date.desc`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (res.ok) {
        const bookings = await res.json();
        if (Array.isArray(bookings) && bookings.length > 0) {
          const mappedAppointments = bookings.map((b: any) => ({
            id: b.id,
            bookingCode: b.booking_code || `MLD-${b.id.slice(0, 6).toUpperCase()}`,
            serviceId: '235166f2-66c9-4231-bbe1-af91b48fc67c',
            serviceName: 'Dẫn lưu phù bạch huyết MLD Vodder',
            specialistName: 'Chuyên viên chỉ định MLD',
            branchName: 'MLD Center Quận 3 - TP.HCM',
            branchAddress: 'Chi nhánh MLD Việt Nam',
            branchPhone: '096.7786.399',
            appointmentDate: b.booking_date,
            appointmentTime: `${b.start_time?.slice(0, 5) || '09:00'} - ${b.end_time?.slice(0, 5) || '10:00'}`,
            status: (b.status || 'confirmed').toLowerCase(),
            totalAmount: Number(b.final_price || b.base_total || 700000),
            depositAmount: 0,
            customerName: b.booked_for_name || 'Khách hàng',
            customerPhone: b.booked_for_phone || cleanPhone,
            createdAt: b.created_at || new Date().toISOString(),
          }));
          localStorage.setItem('mld_appointments', JSON.stringify(mappedAppointments));
        }
      }
    } catch (e) {
      console.warn('[ZaloAuth] Fetch bookings from Supabase error:', e);
    }
  }

  /**
   * Đăng xuất tài khoản -> Đưa về Chế độ Khách
   */
  async logout(): Promise<UserProfile> {
    try {
      await apiClient.logout();
    } catch (e) {
      console.warn('[ZaloAuth] apiClient.logout error:', e);
    }

    try {
      localStorage.removeItem('mld_user_profile');
    } catch { }

    const guestProfile = { ...GUEST_USER_PROFILE };
    SupabaseDataService.saveUserProfile(guestProfile);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mld:profile-updated', { detail: guestProfile }));
    }

    return guestProfile;
  }
}

export const zaloAuthService = new ZaloAuthService();
export default zaloAuthService;
