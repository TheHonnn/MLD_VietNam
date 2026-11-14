import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  settingsService,
  SystemSettingsState,
  DEFAULT_SETTINGS_STATE,
} from '../services/settings.service';
import { toast } from '../components/common';

export function useAdminSettings() {
  const [settings, setSettings] = useState<SystemSettingsState>(DEFAULT_SETTINGS_STATE);
  const [originalSettings, setOriginalSettings] = useState<SystemSettingsState>(DEFAULT_SETTINGS_STATE);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testingZns, setTestingZns] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestRef = useRef<AbortController | null>(null);

  // Tải cài đặt từ backend
  const loadSettings = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const { signal } = controller;
    setLoading(true);
    setError(null);
    try {
      const resp = await settingsService.getAllSettings(signal);
      if (signal.aborted) return;
      const merged: SystemSettingsState = {
        general: { ...DEFAULT_SETTINGS_STATE.general, ...(resp.general?.data || {}) },
        booking: { ...DEFAULT_SETTINGS_STATE.booking, ...(resp.booking?.data || {}) },
        pos: { ...DEFAULT_SETTINGS_STATE.pos, ...(resp.pos?.data || {}) },
        academy: { ...DEFAULT_SETTINGS_STATE.academy, ...(resp.academy?.data || {}) },
        integrations: { ...DEFAULT_SETTINGS_STATE.integrations, ...(resp.integrations?.data || {}) },
        security: { ...DEFAULT_SETTINGS_STATE.security, ...(resp.security?.data || {}) },
      };
      setSettings(merged);
      setOriginalSettings(merged);
    } catch (err: any) {
      if (signal?.aborted) return;
      const msg = err?.message || 'Không thể tải cấu hình hệ thống';
      setError(msg);
      toast.error('Lỗi tải cài đặt', msg);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadSettings();
    return () => requestRef.current?.abort();
  }, [loadSettings]);

  // Cập nhật giá trị trường trong 1 danh mục
  const updateField = useCallback((category: keyof SystemSettingsState, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  }, []);

  // Kiểm tra danh mục có thay đổi chưa lưu
  const isCategoryDirty = useCallback(
    (category: keyof SystemSettingsState): boolean => {
      const current = settings[category];
      const original = originalSettings[category];
      if (!current || !original) return false;
      return JSON.stringify(current) !== JSON.stringify(original);
    },
    [settings, originalSettings],
  );

  // Kiểm tra toàn bộ hệ thống có thay đổi chưa lưu
  const isAnyDirty = useMemo(() => {
    const categories: (keyof SystemSettingsState)[] = [
      'general',
      'booking',
      'pos',
      'academy',
      'integrations',
      'security',
    ];
    return categories.some((cat) => isCategoryDirty(cat));
  }, [isCategoryDirty]);

  // Hoàn tác thay đổi của 1 danh mục về ban đầu
  const resetCategory = useCallback(
    (category: keyof SystemSettingsState) => {
      setSettings((prev) => ({
        ...prev,
        [category]: { ...originalSettings[category] },
      }));
      toast.info('Đã hoàn tác', `Đã khôi phục cài đặt nhóm '${category}' về giá trị trước đó.`);
    },
    [originalSettings],
  );

  // Lưu cài đặt của 1 danh mục vào cơ sở dữ liệu
  const saveCategory = useCallback(
    async (category: keyof SystemSettingsState) => {
      setSaving(true);
      try {
        const payload = settings[category];
        const res = await settingsService.updateSettings<any>(category, payload);
        if (res && res.success !== false) {
          setOriginalSettings((prev) => ({
            ...prev,
            [category]: { ...payload },
          }));
          toast.success(
            'Lưu cài đặt thành công',
            res.message || `Cấu hình nhóm '${category}' đã được cập nhật vào hệ thống.`,
          );
          return true;
        } else {
          throw new Error(res?.message || 'Lỗi cập nhật cấu hình');
        }
      } catch (err: any) {
        const msg = err?.message || 'Không thể lưu cấu hình hệ thống';
        toast.error('Lỗi lưu cài đặt', msg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [settings],
  );

  // Thử nghiệm kết nối ZNS
  const testZns = useCallback(async () => {
    setTestingZns(true);
    try {
      const res = await settingsService.testZnsConnection();
      if (res.success) {
        toast.success('Kết nối Zalo ZNS thành công', res.message);
      } else {
        toast.error('Kết nối Zalo ZNS thất bại', res.message);
      }
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Không thể kết nối máy chủ Zalo';
      toast.error('Lỗi kiểm tra ZNS', msg);
      return { success: false, message: msg, timestamp: new Date().toISOString() };
    } finally {
      setTestingZns(false);
    }
  }, []);

  // Đổi mật khẩu cá nhân
  const changePassword = useCallback(async (oldPass: string, newPass: string) => {
    if (!oldPass || !newPass) {
      toast.error('Lỗi nhập liệu', 'Vui lòng điền cả mật khẩu cũ và mật khẩu mới.');
      return false;
    }
    if (newPass.length < 8) {
      toast.error('Mật khẩu quá ngắn', 'Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return false;
    }

    setSaving(true);
    try {
      const res = await settingsService.changePassword(oldPass, newPass);
      if (res && res.success !== false) {
        toast.success('Đổi mật khẩu thành công', 'Mật khẩu đăng nhập quản trị đã được cập nhật.');
        return true;
      } else {
        throw new Error(res?.message || 'Lỗi đổi mật khẩu');
      }
    } catch (err: any) {
      const msg = err?.message || 'Không thể đổi mật khẩu';
      toast.error('Đổi mật khẩu thất bại', msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    settings,
    originalSettings,
    loading,
    saving,
    testingZns,
    error,
    isDirty: isAnyDirty,
    isCategoryDirty,
    updateField,
    saveCategory,
    resetCategory,
    reload: loadSettings,
    testZns,
    changePassword,
  };
}
