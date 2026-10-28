import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Smartphone,
  Phone,
  User,
  Sliders,
  Check,
  X,
  FileText,
  Search,
  Filter,
  Settings,
  Key,
  Shield,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  Copy,
} from 'lucide-react';
import { znsService } from '../services';
import { ZaloCloudConfig } from '../services/zns.service';
import { ZNSTemplate, ZaloZnsLog } from '../types/shared_types';
import { toast } from '../components/common';

export const W14_ZaloZNS: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'logs' | 'config'>('templates');
  const [templates, setTemplates] = useState<ZNSTemplate[]>([]);
  const [logs, setLogs] = useState<ZaloZnsLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Zalo Cloud Config State
  const [zaloConfig, setZaloConfig] = useState<ZaloCloudConfig>(() => znsService.getZaloConfig());
  const [showToken, setShowToken] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState<boolean>(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Search & Filters for Logs
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [filterTemplate, setFilterTemplate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Test Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testPhone, setTestPhone] = useState<string>('0908889999');
  const [testName, setTestName] = useState<string>('Chị Thu Trang');
  const [testTemplateCode, setTestTemplateCode] = useState<string>('BOOKING_CONFIRMATION');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  // Tải cấu hình từ Supabase Cloud khi mở trang
  useEffect(() => {
    znsService.loadZaloConfigFromCloud().then((cfg) => {
      if (cfg) setZaloConfig(cfg);
    });
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tRes, lRes] = await Promise.all([
        znsService.getTemplates(),
        znsService.getLogs({
          phone: searchPhone || undefined,
          templateCode: filterTemplate !== 'all' ? filterTemplate : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
        }),
      ]);

      if (tRes.success && tRes.data) setTemplates(tRes.data);
      if (lRes.success && lRes.data) setLogs(lRes.data);
    } catch (err) {
      console.error('Error loading ZNS data:', err);
      toast.error('Lỗi kết nối', 'Không thể tải dữ liệu Zalo ZNS từ CSDL.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterTemplate, filterStatus]);

  const handleToggleTemplate = async (templateId: string, currentActive: boolean) => {
    try {
      const res = await znsService.toggleTemplate(templateId, !currentActive);
      if (res.success) {
        toast.success(
          'Đã cập nhật kịch bản',
          `Trạng thái: ${!currentActive ? 'Kích hoạt' : 'Tạm dừng'} tự động gửi.`
        );
        setTemplates((prev) =>
          prev.map((t) => (t.id === templateId ? { ...t, isActive: !currentActive } : t))
        );
      }
    } catch {
      toast.error('Lỗi', 'Không thể thay đổi trạng thái kịch bản.');
    }
  };

  const handleSendTestZns = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập số điện thoại người nhận.');
      return;
    }

    setIsSendingTest(true);
    try {
      const template = templates.find((t) => t.templateCode === testTemplateCode);
      const params = template?.sampleParams || {
        customer_name: testName,
        service_name: 'Dẫn lưu bạch huyết vùng bụng',
        booking_time: '14:30',
        branch_name: 'MLD Nam Kỳ Khởi Nghĩa',
      };

      const res = await znsService.sendZns({
        recipientPhone: testPhone,
        recipientName: testName,
        templateCode: testTemplateCode,
        paramsSent: params,
      });

      if (res.success) {
        toast.success('Gửi thử nghiệm thành công!', `Đã chuyển tin nhắn ZNS mẫu đến số ${testPhone}.`);
        setIsTestModalOpen(false);
        setActiveTab('logs');
        loadData();
      } else {
        toast.error('Gửi thất bại', res.message);
      }
    } catch {
      toast.error('Lỗi', 'Có lỗi khi kết nối cổng Zalo ZNS.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    znsService.saveZaloConfig(zaloConfig);
    toast.success('Đã lưu cấu hình', 'Thông số cổng Zalo Cloud API đã được cập nhật thành công.');
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await znsService.testZaloConnection(zaloConfig.accessToken);
      setConnectionResult({ success: res.success, message: res.message });
      if (res.success) {
        toast.success('Kết nối thành công', res.message);
      } else {
        toast.error('Kết nối thất bại', res.message);
      }
    } catch {
      setConnectionResult({ success: false, message: 'Lỗi không xác định khi kiểm tra kết nối Zalo OA.' });
      toast.error('Lỗi', 'Không thể kết nối đến máy chủ Zalo.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleAutoRefreshToken = async () => {
    setIsRefreshingToken(true);
    try {
      const res = await znsService.refreshZaloToken(zaloConfig);
      if (res.success && res.data) {
        setZaloConfig((prev) => ({
          ...prev,
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
          expiresAt: res.data.expiresAt,
        }));
        setConnectionResult({ success: true, message: res.message });
        toast.success('Làm mới Token thành công', res.message);
      } else {
        toast.error('Làm mới thất bại', res.message);
        setConnectionResult({ success: false, message: res.message });
      }
    } catch (err: any) {
      toast.error('Lỗi', `Không thể làm mới Zalo token: ${err.message}`);
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const renderMessagePreview = (template: ZNSTemplate) => {
    let preview = template.contentTemplate;
    const params = template.sampleParams || {};
    for (const [key, val] of Object.entries(params)) {
      preview = preview.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
    }
    return preview;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8EFF5] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-600 mb-1">
            <Smartphone className="w-4 h-4" />
            <span>Chăm sóc khách hàng tự động hóa</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">
            Quản Lý Kịch Bản & Tự Động Hóa CRM Zalo ZNS
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Tự động gửi tin nhắn thương hiệu MLD qua cổng Zalo ZNS: Xác nhận lịch hẹn, nhắc hẹn trước 2h, dặn dò sau trị liệu 24h và nhắc tái khám 14 ngày.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi tin kiểm thử</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4">
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'templates'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>4 Kịch bản ZNS Chuẩn ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'logs'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Nhật ký gửi tin ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 px-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'config'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Cấu hình Zalo Cloud API</span>
          {zaloConfig.accessToken && zaloConfig.accessToken.trim() ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Đã có Access Token"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="Chờ cấu hình Access Token"></span>
          )}
        </button>
      </div>

      {/* Tab 1: Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 flex flex-col justify-between hover:border-sky-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      {tmpl.templateCode}
                    </span>
                    <h3 className="font-bold text-[#0F172A] text-sm mt-1.5">{tmpl.name}</h3>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tmpl.isActive}
                      onChange={() => handleToggleTemplate(tmpl.id, tmpl.isActive)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>

                <p className="text-xs text-[#64748B] mb-4">{tmpl.description}</p>

                {/* Zalo Chat Bubble Simulation */}
                <div className="bg-[#EBF3FB] p-4 rounded-2xl border border-[#D0E2F5] relative text-xs text-[#1E293B] shadow-2xs">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#D0E2F5]/60 text-[11px] font-semibold text-sky-800">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                      Z
                    </div>
                    <span>MLD Vietnam (Official ZNS Verified)</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-line">{renderMessagePreview(tmpl)}</p>
                  <div className="text-[10px] text-right text-gray-500 mt-2">Vừa xong · Đã nhận</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
                <span>Trạng thái tự động:</span>
                <span
                  className={`font-semibold ${
                    tmpl.isActive ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                >
                  {tmpl.isActive ? '● Đang kích hoạt' : '○ Tạm dừng'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo số điện thoại..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#64748B]" />
              <select
                value={filterTemplate}
                onChange={(e) => setFilterTemplate(e.target.value)}
                className="bg-transparent text-xs text-[#0F172A] focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả mẫu tin</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.templateCode}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs text-[#0F172A] focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="SENT">Đã gửi (SENT)</option>
                <option value="DELIVERED">Đã nhận (DELIVERED)</option>
                <option value="FAILED">Thất bại (FAILED)</option>
              </select>
            </div>

            <button
              onClick={loadData}
              className="px-3.5 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-700 transition-colors cursor-pointer"
            >
              Lọc
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-4">Người nhận & SĐT</th>
                    <th className="py-3 px-4">Kịch bản ZNS</th>
                    <th className="py-3 px-4">Tham số đã truyền</th>
                    <th className="py-3 px-4">Thời gian gửi</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs text-[#334155]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#94A3B8]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                          <span>Đang tải nhật ký ZNS...</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#94A3B8]">
                        <p className="font-medium text-sm">Chưa có nhật ký gửi tin ZNS nào</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#0F172A]">{log.recipientName || 'Khách hàng'}</div>
                          <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5 font-mono">
                            <Phone className="w-3 h-3 text-[#94A3B8]" />
                            <span>{log.recipientPhone}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-sky-800 text-xs">
                            {templates.find((t) => t.templateCode === log.templateCode)?.name || log.templateCode}
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-xs truncate text-[11px] text-[#64748B] font-mono">
                          {JSON.stringify(log.paramsSent)}
                        </td>

                        <td className="py-3 px-4 text-[11px] text-[#64748B]">
                          {new Date(log.sentAt).toLocaleString('vi-VN')}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                              log.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : log.status === 'SENT'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {log.status === 'DELIVERED'
                              ? 'Đã nhận'
                              : log.status === 'SENT'
                              ? 'Đã gửi'
                              : 'Thất bại'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Zalo Cloud API Configuration */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Status banner */}
          <div
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
              zaloConfig.accessToken && zaloConfig.accessToken.trim()
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  zaloConfig.accessToken && zaloConfig.accessToken.trim()
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">
                  {zaloConfig.accessToken && zaloConfig.accessToken.trim()
                    ? 'Cổng Zalo Cloud OpenAPI Đã Cấu Hình Sẵn Sàng'
                    : 'Cổng Zalo Cloud API Chờ Cấu Hình Token'}
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {zaloConfig.accessToken && zaloConfig.accessToken.trim()
                    ? 'Hệ thống kết nối trực tiếp với endpoint Zalo OpenAPI chính thức: business.openapi.zalo.me.'
                    : 'Hệ thống đang hoạt động ở chế độ Sandbox ghi log CSDL. Vui lòng nạp Access Token từ Zalo Developers để kích hoạt tin gửi thực.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoRefreshToken}
                disabled={isRefreshingToken}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Tự động gia hạn Access Token qua Zalo OAuth v4"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isRefreshingToken ? 'animate-spin' : ''}`} />
                <span>{isRefreshingToken ? 'Đang làm mới...' : 'Tự động làm mới Token (OAuth v4)'}</span>
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-gray-50 text-[#0F172A] rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                <span>{isTestingConnection ? 'Đang kiểm tra...' : 'Kiểm tra kết nối Zalo'}</span>
              </button>
            </div>
          </div>

          {/* Connection Test Result Message */}
          {connectionResult && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
                connectionResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {connectionResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{connectionResult.message}</span>
            </div>
          )}

          {/* Configuration Form Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">Thông Số Kết Nối Zalo Official Account (OA)</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Thông số xác thực chính thức từ Zalo for Developers cho Viện Trị Liệu MLD Việt Nam.
                </p>
              </div>
              <a
                href="https://developers.zalo.me"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-semibold"
              >
                <span>Cổng Zalo Developers</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    Zalo Official Account ID (OA ID)
                  </label>
                  <input
                    type="text"
                    value={zaloConfig.oaId}
                    onChange={(e) => setZaloConfig({ ...zaloConfig, oaId: e.target.value })}
                    placeholder="VD: 2849182390192830192"
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <p className="text-[11px] text-[#94A3B8] mt-1">ID trang OA đã xác minh của Doanh nghiệp MLD.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    Zalo App ID (Mã Ứng Dụng)
                  </label>
                  <input
                    type="text"
                    value={zaloConfig.appId}
                    onChange={(e) => setZaloConfig({ ...zaloConfig, appId: e.target.value })}
                    placeholder="VD: 4928109283019283"
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <p className="text-[11px] text-[#94A3B8] mt-1">App ID quản trị trên Zalo Developers.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    Zalo App Secret (Khóa bí mật ứng dụng)
                  </label>
                  <input
                    type="password"
                    value={zaloConfig.appSecret}
                    onChange={(e) => setZaloConfig({ ...zaloConfig, appSecret: e.target.value })}
                    placeholder="Nhập App Secret từ Zalo Developers..."
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <p className="text-[11px] text-[#94A3B8] mt-1">Dùng để ký xác thực tự động gia hạn token.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    Zalo Refresh Token (Để tự động gia hạn Access Token)
                  </label>
                  <input
                    type="password"
                    value={zaloConfig.refreshToken || ''}
                    onChange={(e) => setZaloConfig({ ...zaloConfig, refreshToken: e.target.value })}
                    placeholder="Nhập Refresh Token từ cổng Zalo OAuth..."
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <p className="text-[11px] text-[#94A3B8] mt-1">Hệ thống dùng token này để tự động refresh mỗi 6 giờ.</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#334155]">
                    Zalo Cloud Access Token (Bearer Token gửi ZNS)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showToken ? 'Ẩn token' : 'Hiển thị token'}</span>
                  </button>
                </div>
                <textarea
                  value={zaloConfig.accessToken}
                  onChange={(e) => setZaloConfig({ ...zaloConfig, accessToken: e.target.value })}
                  placeholder="Dán mã Zalo Access Token từ cổng Zalo API Explorer..."
                  rows={3}
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500 font-mono"
                />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-1">
                  <p className="text-[11px] text-[#94A3B8]">
                    Được dùng để gọi trực tiếp tới endpoint: <code>https://business.openapi.zalo.me/message/template</code>
                  </p>
                  {zaloConfig.expiresAt && (
                    <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Hết hạn: {new Date(zaloConfig.expiresAt).toLocaleTimeString('vi-VN')}, {new Date(zaloConfig.expiresAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1.5">
                  Webhook Callback URL (Nhận kết quả giao tin từ Zalo)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={zaloConfig.webhookUrl || 'https://wstvwushpwcdsmhpunvh.supabase.co/functions/v1/zalo-webhook'}
                    className="flex-1 px-3.5 py-2.5 bg-gray-100 border border-[#CBD5E1] rounded-xl text-xs text-[#64748B] font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        zaloConfig.webhookUrl || 'https://wstvwushpwcdsmhpunvh.supabase.co/functions/v1/zalo-webhook'
                      );
                      toast.success('Đã sao chép Webhook URL vào clipboard');
                    }}
                    className="p-2.5 border border-[#CBD5E1] hover:bg-gray-100 rounded-xl text-gray-600 transition-colors cursor-pointer"
                    title="Sao chép Webhook URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu cấu hình Cổng Zalo</span>
                </button>
              </div>
            </form>
          </div>

          {/* Integration Guide */}
          <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-6 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-600" />
              <span>Quy Trình 3 Bước Kích Hoạt Zalo ZNS Chính Thức Cho MLD Việt Nam</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#475569]">
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                <div className="font-bold text-[#0F172A] mb-1">1. Đăng ký & Xác minh OA</div>
                <p>Hoàn tất đăng ký trang Zalo OA Doanh nghiệp tại oa.zalo.me và nâng cấp tích vàng chính chủ.</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                <div className="font-bold text-[#0F172A] mb-1">2. Đăng ký 4 Mẫu ZNS</div>
                <p>Nộp duyệt 4 mẫu tin: Xác nhận lịch, Nhắc hẹn 2h, Dặn dò sau trị liệu 24h và Nhắc tái khám 14 ngày.</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                <div className="font-bold text-[#0F172A] mb-1">3. Cấp Token & Kết nối</div>
                <p>Truy cập Zalo API Explorer, tạo Access Token có quyền gửi tin ZNS và dán vào form trên để chạy thật.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
                <Send className="w-4 h-4" />
                <span>Gửi thử nghiệm tin nhắn Zalo ZNS</span>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Token Status Badge in Modal */}
            {zaloConfig.accessToken && zaloConfig.accessToken.trim() ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Chế độ Live: Tin sẽ được gửi trực tiếp qua Zalo Cloud OpenAPI.</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Chế độ Sandbox: Chưa có Access Token. Yêu cầu sẽ được ghi log CSDL để đối soát.</span>
              </div>
            )}

            <form onSubmit={handleSendTestZns} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Kịch bản muốn kiểm thử</label>
                <select
                  value={testTemplateCode}
                  onChange={(e) => setTestTemplateCode(e.target.value)}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.templateCode}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Tên khách hàng test</label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="VD: Chị Minh Anh"
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Số điện thoại nhận tin ZNS</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="09xxxxxxxx"
                  required
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTest ? 'Đang gửi...' : 'Gửi tin ngay'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
