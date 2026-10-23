import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { notificationService } from './notification.service';

export type RealtimeSyncStatus = 'CONNECTING' | 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

export type RealtimeTable =
  | 'invoices'
  | 'bookings'
  | 'tuition_transactions'
  | 'course_enrollments'
  | 'user_packages'
  | 'users'
  | 'notifications';

export interface RealtimeChangeEvent<T = any> {
  table: RealtimeTable;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  newRecord: T | null;
  oldRecord: T | null;
  timestamp: Date;
}

export interface RealtimeEventLog {
  id: string;
  table: RealtimeTable;
  action: string;
  description: string;
  timestamp: Date;
}

type RealtimeCallback = (event: RealtimeChangeEvent) => void;
type StatusCallback = (status: RealtimeSyncStatus, isLive: boolean) => void;

class RealtimeSyncService {
  private channel: RealtimeChannel | null = null;
  private status: RealtimeSyncStatus = 'CONNECTING';
  private listeners: Map<string, Set<RealtimeCallback>> = new Map();
  private statusListeners: Set<StatusCallback> = new Set();
  private lastSyncTime: Date = new Date();
  private eventLogs: RealtimeEventLog[] = [];
  private reconnectTimer: any = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.connect();

    // Listen to network changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[RealtimeSyncService] Network online - reconnecting...');
        this.reconnect();
      });
      window.addEventListener('offline', () => {
        console.warn('[RealtimeSyncService] Network offline');
        this.setStatus('CLOSED');
      });
    }
  }

  private connect() {
    try {
      this.setStatus('CONNECTING');

      // Create unique multiplexed channel
      this.channel = supabase.channel('mld-realtime-sync-master', {
        config: {
          broadcast: { self: true },
        },
      });

      // Subscribe to all operational tables
      const monitoredTables: RealtimeTable[] = [
        'invoices',
        'bookings',
        'tuition_transactions',
        'course_enrollments',
        'user_packages',
        'users',
        'notifications',
      ];

      monitoredTables.forEach((table) => {
        this.channel?.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => this.handlePostgresChange(table, payload)
        );
      });

      // Subscribe and monitor status
      this.channel.subscribe((status, error) => {
        if (error) {
          console.error('[RealtimeSyncService] Subscription error:', error);
          this.setStatus('CHANNEL_ERROR');
          this.scheduleReconnect();
          return;
        }

        if (status === 'SUBSCRIBED') {
          console.log('[RealtimeSyncService] ✅ Realtime WebSocket Connected & Subscribed!');
          this.setStatus('SUBSCRIBED');
          this.lastSyncTime = new Date();
        } else if (status === 'CLOSED' || status === 'TIMED_OUT') {
          this.setStatus(status);
          this.scheduleReconnect();
        }
      });
    } catch (err) {
      console.error('[RealtimeSyncService] Failed to establish connection:', err);
      this.setStatus('CHANNEL_ERROR');
      this.scheduleReconnect();
    }
  }

  private setStatus(newStatus: RealtimeSyncStatus) {
    this.status = newStatus;
    const isLive = newStatus === 'SUBSCRIBED';
    this.statusListeners.forEach((fn) => fn(newStatus, isLive));
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log('[RealtimeSyncService] Attempting reconnect...');
      this.reconnect();
    }, 5000);
  }

  public reconnect() {
    if (this.channel) {
      try {
        supabase.removeChannel(this.channel);
      } catch (e) {
        // Ignore removal error
      }
      this.channel = null;
    }
    this.connect();
  }

  private handlePostgresChange(table: RealtimeTable, payload: any) {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const newRecord = payload.new || null;
    const oldRecord = payload.old || null;
    const timestamp = new Date();

    this.lastSyncTime = timestamp;

    const event: RealtimeChangeEvent = {
      table,
      eventType,
      newRecord,
      oldRecord,
      timestamp,
    };

    // 1. Log event
    const logItem: RealtimeEventLog = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      table,
      action: eventType,
      description: this.formatEventDescription(table, eventType, newRecord),
      timestamp,
    };
    this.eventLogs = [logItem, ...this.eventLogs.slice(0, 49)];

    // 2. Auto-dispatch desktop / admin notification on key events
    this.generateAutoNotification(table, eventType, newRecord);

    // 3. Dispatch to specific table listeners
    const tableListeners = this.listeners.get(table);
    if (tableListeners) {
      tableListeners.forEach((fn) => {
        try {
          fn(event);
        } catch (e) {
          console.error(`[RealtimeSyncService] Listener error for table ${table}:`, e);
        }
      });
    }

    // 4. Dispatch to wildcard listeners
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      allListeners.forEach((fn) => {
        try {
          fn(event);
        } catch (e) {
          console.error('[RealtimeSyncService] Wildcard listener error:', e);
        }
      });
    }

    // 5. Dispatch global window custom event for easy non-hook integration
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mld-realtime-update', {
          detail: event,
        })
      );
    }
  }

  private formatEventDescription(table: RealtimeTable, eventType: string, record: any): string {
    if (!record) return `${eventType} trên bảng ${table}`;

    switch (table) {
      case 'invoices':
        return `Hóa đơn ${record.invoice_code || ''}: ${Number(record.total_amount || 0).toLocaleString('vi-VN')}đ (${record.payment_status || 'PAID'})`;
      case 'bookings':
        return `Lịch hẹn ${record.booking_code || ''}: ${record.booking_date || ''} (${record.status || 'NEW'})`;
      case 'tuition_transactions':
        return `Học phí ${record.transaction_code || ''}: ${Number(record.amount || 0).toLocaleString('vi-VN')}đ`;
      case 'course_enrollments':
        return `Hồ sơ tuyển sinh khóa học (${record.status || 'ENROLLED'})`;
      case 'users':
        return `Khách hàng / Người dùng: ${record.full_name || record.phone || ''} (${record.role || 'CUSTOMER'})`;
      default:
        return `${eventType} bản ghi trên ${table}`;
    }
  }

  private generateAutoNotification(table: RealtimeTable, eventType: string, record: any) {
    if (!record || eventType === 'DELETE') return;

    if (table === 'bookings' && eventType === 'INSERT') {
      notificationService.addNotification({
        title: '⚡ Lịch hẹn mới từ khách hàng',
        message: `Khách hàng vừa đặt lịch hẹn #${record.booking_code || ''} ngày ${record.booking_date || ''} lúc ${record.start_time?.slice(0, 5) || ''}.`,
        type: 'BOOKING',
        link: `/staff-schedule?booking=${record.booking_code || ''}`,
      });
    } else if (table === 'invoices' && (eventType === 'INSERT' || record.payment_status === 'PAID')) {
      const amount = Number(record.total_amount || 0).toLocaleString('vi-VN');
      notificationService.addNotification({
        title: '💰 Giao dịch thanh toán thành công',
        message: `Hóa đơn #${record.invoice_code || ''} trị giá ${amount}đ đã thanh toán qua ${record.payment_method || 'quầy'}.`,
        type: 'PAYMENT',
        link: `/cashier-pos?booking=${record.booking_code || record.invoice_code || ''}&receipt=true`,
      });
    } else if (table === 'tuition_transactions' && eventType === 'INSERT') {
      const amount = Number(record.amount || 0).toLocaleString('vi-VN');
      notificationService.addNotification({
        title: '🎓 Khoản đóng học phí mới',
        message: `Giao dịch học phí #${record.transaction_code || ''} trị giá ${amount}đ đã được ghi nhận.`,
        type: 'ACADEMY',
        link: '/academy-enrollment',
      });
    } else if (table === 'users' && eventType === 'INSERT' && (record.role === 'CUSTOMER' || !record.role)) {
      notificationService.addNotification({
        title: '👤 Khách hàng mới gia nhập',
        message: `Khách hàng ${record.full_name || record.phone || 'mới'} vừa tạo tài khoản trên hệ thống.`,
        type: 'SYSTEM',
        link: `/customers?search=${encodeURIComponent(record.phone || record.full_name || '')}`,
      });
    }
  }

  /**
   * Subscribe to changes on a specific table or '*' for all tables
   */
  public subscribeTable(table: RealtimeTable | '*', callback: RealtimeCallback): () => void {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    this.listeners.get(table)!.add(callback);

    return () => {
      const set = this.listeners.get(table);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(table);
        }
      }
    };
  }

  /**
   * Subscribe to realtime connection status
   */
  public subscribeStatus(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.status, this.status === 'SUBSCRIBED');
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public getStatus(): RealtimeSyncStatus {
    return this.status;
  }

  public isLive(): boolean {
    return this.status === 'SUBSCRIBED';
  }

  public getLastSyncTime(): Date {
    return this.lastSyncTime;
  }

  public getRecentLogs(): RealtimeEventLog[] {
    return [...this.eventLogs];
  }
}

export const realtimeSyncService = new RealtimeSyncService();
