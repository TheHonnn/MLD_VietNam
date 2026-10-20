import { supabase } from './supabaseClient';

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

class NotificationService {
  private listeners: Array<(items: AdminNotification[]) => void> = [];
  private items: AdminNotification[] = [];

  constructor() {
    this.loadFromStorage();
    this.fetchRemote();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.items = JSON.parse(stored);
      } else {
        this.items = [];
      }
    } catch {
      this.items = [];
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

  private notify() {
    this.listeners.forEach((listener) => listener([...this.items]));
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
        const remoteItems: AdminNotification[] = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          message: d.message,
          type: (d.type || 'SYSTEM').toUpperCase() as any,
          createdAt: d.created_at,
          isRead: !!d.is_read,
          link: d.data?.link,
        }));

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

  public getNotifications(): AdminNotification[] {
    return [...this.items];
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
    const newItem: AdminNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    this.items = [newItem, ...this.items];
    this.saveToStorage();
  }
}

export const notificationService = new NotificationService();
