import { supabase } from './supabaseClient';
import { ZaloZnsLog } from '../types/shared_types';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'BOOKING' | 'PAYMENT' | 'ACADEMY' | 'SYSTEM';
  createdAt: string;
  isRead: boolean;
  link?: string;
}

const STORAGE_KEY = 'mld_admin_notifications';
const ZNS_STORAGE_KEY = 'mld_zalo_zns_logs';

class NotificationService {
  private listeners: Array<(items: AdminNotification[]) => void> = [];
  private items: AdminNotification[] = [];
  private znsListeners: Array<(logs: ZaloZnsLog[]) => void> = [];
  private znsLogs: ZaloZnsLog[] = [];

  constructor() {
    this.loadFromStorage();
    this.fetchRemote();
  }

  private isTestNotification(item: { title?: string; message?: string }): boolean {
    const text = `${item.title || ''} ${item.message || ''}`;
    return /WB-\d+|UAT-\d+/i.test(text);
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: AdminNotification[] = JSON.parse(stored);
        this.items = parsed.filter((item) => !this.isTestNotification(item));
      } else {
        this.items = [];
      }
    } catch {
      this.items = [];
    }

    try {
      const storedZns = localStorage.getItem(ZNS_STORAGE_KEY);
      if (storedZns) {
        this.znsLogs = JSON.parse(storedZns);
      } else {
        this.znsLogs = [];
      }
    } catch {
      this.znsLogs = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn('[NotificationService] Lưu storage lỗi:', e);
    }
    this.notify();
  }

  private saveZnsToStorage() {
    try {
      localStorage.setItem(ZNS_STORAGE_KEY, JSON.stringify(this.znsLogs));
    } catch (e) {
      console.warn('[NotificationService] Lưu ZNS storage lỗi:', e);
    }
    this.notifyZns();
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.items]));
  }

  private notifyZns() {
    this.znsListeners.forEach((listener) => listener([...this.znsLogs]));
  }

  private async fetchRemote() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        // Map Supabase rows to AdminNotification
        const remoteItems: AdminNotification[] = data
          .map((d: any) => ({
            id: d.id,
            title: d.title,
            message: d.message,
            type: (d.type || 'SYSTEM').toUpperCase() as any,
            createdAt: d.created_at,
            isRead: !!d.is_read,
            link: d.data?.link,
          }))
          .filter((i) => !this.isTestNotification(i));

        // Merge without duplicating IDs
        const existingIds = new Set(this.items.map((i) => i.id));
        const newOnes = remoteItems.filter((i) => !existingIds.has(i.id));
        if (newOnes.length > 0) {
          this.items = [...newOnes, ...this.items];
          this.saveToStorage();
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Lỗi kết nối Supabase notifications:', err);
    }
  }

  public subscribe(callback: (items: AdminNotification[]) => void): () => void {
    this.listeners.push(callback);
    callback([...this.items]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public subscribeZns(callback: (logs: ZaloZnsLog[]) => void): () => void {
    this.znsListeners.push(callback);
    callback([...this.znsLogs]);
    return () => {
      this.znsListeners = this.znsListeners.filter((l) => l !== callback);
    };
  }

  public getNotifications(): AdminNotification[] {
    return [...this.items];
  }

  public getZnsLogs(): ZaloZnsLog[] {
    return [...this.znsLogs];
  }

  public getUnreadCount(): number {
    return this.items.filter((i) => !i.isRead).length;
  }

  public async markAsRead(id: string) {
    this.items = this.items.map((item) =>
      item.id === id ? { ...item, isRead: true } : item
    );
    this.saveToStorage();
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch {
      // Ignore background sync errors
    }
  }

  public async markAllAsRead() {
    this.items = this.items.map((item) => ({ ...item, isRead: true }));
    this.saveToStorage();
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    } catch {
      // Ignore background sync errors
    }
  }

  public async deleteNotification(id: string) {
    this.items = this.items.filter((item) => item.id !== id);
    this.saveToStorage();
    try {
      await supabase.from('notifications').delete().eq('id', id);
    } catch {
      // Ignore background sync errors
    }
  }

  public addNotification(notification: Omit<AdminNotification, 'id' | 'createdAt' | 'isRead'>) {
    if (this.isTestNotification(notification)) {
      return; // Never save automated test notifications
    }
    const newItem: AdminNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    this.items = [newItem, ...this.items];
    this.saveToStorage();
  }

  public clearTestNotifications() {
    this.items = this.items.filter((item) => !this.isTestNotification(item));
    this.saveToStorage();
  }

  /**
   * Enterprise Pillar 3: Tự động hóa CRM gửi tin nhắn Zalo ZNS
   */
  public async sendZaloZNS(
    templateType: 'BOOKING_CONFIRM' | 'PRE_REMINDER_2H' | 'POST_CARE_24H' | 'REVISIT_14D',
    customerPhone: string,
    customerName: string,
    details?: {
      serviceName?: string;
      appointmentTime?: string;
      branchName?: string;
      invoiceCode?: string;
      bookingCode?: string;
      amount?: string;
      customerId?: string;
    }
  ): Promise<ZaloZnsLog> {
    let contentPreview = '';
    const sName = details?.serviceName || 'Dịch vụ Spa & Chăm sóc da';
    const time = details?.appointmentTime || 'Hôm nay';
    const branch = details?.branchName || 'MLD Beauty & Spa';
    const code = details?.bookingCode || details?.invoiceCode || 'MLD';

    switch (templateType) {
      case 'BOOKING_CONFIRM':
        contentPreview = `[MLD Clinic] Xác nhận lịch hẹn: Chào ${customerName}, bạn đã đặt hẹn thành công dịch vụ "${sName}" vào lúc ${time} tại ${branch}. Mã đơn: ${code}.`;
        break;
      case 'PRE_REMINDER_2H':
        contentPreview = `[MLD Clinic] Nhắc lịch hẹn: Kính chào ${customerName}, quý khách có lịch hẹn dịch vụ "${sName}" sau 2 giờ (${time}) tại ${branch}. Hotline: 1900 8888.`;
        break;
      case 'POST_CARE_24H':
        contentPreview = `[MLD Clinic] Chăm sóc sau liệu trình: Cảm ơn ${customerName} đã sử dụng dịch vụ tại MLD. Xin vui lòng uống đủ 2L nước và bôi dưỡng ẩm theo tư vấn KTV. Phản hồi: mld.vn/care`;
        break;
      case 'REVISIT_14D':
        contentPreview = `[MLD Clinic] Lời nhắc tái khám: Đã 14 ngày kể từ buổi chăm sóc gần nhất. Kính mời ${customerName} đặt hẹn kiểm tra da định kỳ cùng chuyên gia MLD.`;
        break;
    }

    const logItem: ZaloZnsLog = {
      id: `zns-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: details?.customerId || 'cust-auto',
      customerName,
      phone: customerPhone,
      templateType,
      status: 'SENT',
      contentPreview,
      sentAt: new Date().toISOString(),
    };

    // 1. Lưu vào RAM & LocalStorage
    this.znsLogs = [logItem, ...this.znsLogs];
    this.saveZnsToStorage();

    // 2. Thêm vào Admin In-App Notifications để Thu ngân / Lễ tân thấy ngay
    this.addNotification({
      title: `Zalo ZNS đã gửi: ${templateType === 'BOOKING_CONFIRM' ? 'Xác nhận đơn' : templateType === 'PRE_REMINDER_2H' ? 'Nhắc hẹn trước 2h' : templateType === 'POST_CARE_24H' ? 'Chăm sóc 24h' : 'Nhắc tái khám 14d'}`,
      message: `Đã tự động gửi Zalo ZNS tới ${customerName} (${customerPhone}).`,
      type: 'SYSTEM',
    });

    // 3. Sync ngầm Supabase (nếu bảng tồn tại)
    try {
      await supabase.from('zalo_zns_logs').insert([
        {
          id: logItem.id,
          customer_name: customerName,
          phone: customerPhone,
          template_type: templateType,
          status: 'SENT',
          content_preview: contentPreview,
          sent_at: logItem.sentAt,
        },
      ]);
    } catch {
      // Ignored if table is local/offline
    }

    return logItem;
  }
}

export const notificationService = new NotificationService();
