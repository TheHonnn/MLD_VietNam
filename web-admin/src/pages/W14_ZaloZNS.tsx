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
  KeyRound,
  FileText,
  Search,
  Filter,
  Settings,
  Eye,
} from 'lucide-react';
import { znsService } from '../services';
import { ZNSTemplate, ZaloZnsLog } from '../types/shared_types';
import { toast, AdminTabs } from '../components/common';

const gatewaySettings = [
  { key: 'tokenConfigured', label: 'OA Access Token', icon: KeyRound },
  { key: 'templateConfigured', label: 'Mẫu xác nhận lịch đã duyệt', icon: FileText },
  { key: 'testPhoneConfigured', label: 'Số điện thoại nhận thử', icon: Phone },
] as const;

const testTemplateCode = 'BOOKING_CONFIRMATION';
const fallbackTestParameters = {
  customer_name: 'Khách kiểm thử',
  service_name: 'Chăm sóc mở rộng',
  booking_time: '14:30',
  branch_name: 'MLD Việt Nam',
};

export const W14_ZaloZNS: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'logs' | 'config'>('config');
  const [templates, setTemplates] = useState<ZNSTemplate[]>([]);
  const [logs, setLogs] = useState<ZaloZnsLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Zalo Cloud Config State
  const [gateway, setGateway] = useState<Awaited<ReturnType<typeof znsService.getGatewayStatus>> | null>(null);
  const [isCheckingGateway, setIsCheckingGateway] = useState(true);
  const [gatewayError, setGatewayError] = useState('');
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);
  const [testError, setTestError] = useState('');
  const configuredCount = gatewaySettings.filter(({ key }) => gateway?.[key]).length;
  const canSendTest = !isCheckingGateway && configuredCount === gatewaySettings.length;

  const loadGateway = async () => {
    setIsCheckingGateway(true);
    setGatewayError('');
    try {
      setGateway(await znsService.getGatewayStatus());
    } catch (error) {
      setGateway(null);
      setGatewayError(error instanceof Error ? error.message : 'Không tải được trạng thái máy chủ.');
    } finally {
      setIsCheckingGateway(false);
    }
  };

  // Search & Filters for Logs
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [filterTemplate, setFilterTemplate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [accessToken, setAccessToken] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedConfiguration, setSavedConfiguration] = useState(false);
  const configurationEdited = Boolean(accessToken) || templateId !== null || testPhone !== null;
  const [testParameters, setTestParameters] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  useEffect(() => {
    localStorage.removeItem('mld_zalo_cloud_config');
    void loadGateway();
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
          `Trạng thái: ${!currentActive ? 'Kích hoạt' : 'Tạm dừng'} cấu hình mẫu.`
        );
        setTemplates((prev) =>
          prev.map((t) => (t.id === templateId ? { ...t, isActive: !currentActive } : t))
        );
      }
    } catch {
      toast.error('Lỗi', 'Không thể thay đổi trạng thái kịch bản.');
    }
  };

  const sampleParameters = templates.find((template) => template.templateCode === testTemplateCode)?.sampleParams;
  const defaultTestParameters = JSON.stringify(
    sampleParameters && Object.keys(sampleParameters).length ? sampleParameters : fallbackTestParameters,
    null,
    2,
  );

  const handleSaveConfiguration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSavingConfig || isCheckingGateway || isSendingTest) return;
    setSaveError('');
    setSavedConfiguration(false);
    setIsSavingConfig(true);
    try {
      const configuration = await znsService.saveGatewayConfiguration({
        accessToken: accessToken.trim() || undefined,
        templateId: templateId ?? gateway?.templateId ?? '',
        testPhone: testPhone ?? gateway?.testPhone ?? '',
      });
      setGateway(configuration);
      setGatewayError('');
      setAccessToken('');
      setTemplateId(null);
      setTestPhone(null);
      setLastReceipt(null);
      setTestError('');
      setSavedConfiguration(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không thể xác minh kết quả lưu cấu hình.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSendTestZns = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendTest || !gateway?.testPhone || isSendingTest || isSavingConfig || configurationEdited) return;
    setLastReceipt(null);
    setTestError('');

    let payload: Record<string, string>;
    try {
      const parsed = JSON.parse(testParameters ?? defaultTestParameters);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        !Object.keys(parsed).length || Object.values(parsed).some((value) => typeof value !== 'string')) {
        throw new Error('Invalid template parameters');
      }
      payload = parsed;
    } catch {
      setTestError('Nhập tham số dưới dạng JSON. Mỗi tên tham số cần có một giá trị văn bản.');
      return;
    }

    setIsSendingTest(true);
    try {
      const result = await znsService.sendTest({
        recipientPhone: gateway.testPhone,
        templateCode: testTemplateCode,
        paramsSent: payload,
      });
      if (result.success && result.data) {
        setLastReceipt(result.data.messageId);
      } else {
        setTestError(result.message);
      }
    } catch {
      setTestError('Chưa xác minh được kết quả gửi. Kiểm tra Zalo trước khi thử lại.');
    } finally {
      setIsSendingTest(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EFE4D9] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8A4F23] mb-1">
            <Smartphone className="w-4 h-4" />
            <span>Chăm sóc khách hàng qua Zalo</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2C241E]">
            Tin nhắn Zalo OA
          </h1>
          <p className="text-xs text-[#73675F] mt-1">
            Quản lý mẫu tin và kiểm tra kết nối. Gửi tự động đang tắt.
          </p>
        </div>

        {activeTab !== 'config' && (
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] px-3.5 py-2 text-xs font-semibold text-[#2C241E] hover:bg-[#F3E5D4] disabled:opacity-60 sm:self-auto"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? 'motion-safe:animate-spin' : ''}`} />
            Làm mới
          </button>
        )}
      </div>

      {/* Tabs */}
      <AdminTabs
        ariaLabel="Phân hệ Zalo ZNS"
        variant="line"
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
        tabs={[
          { id: 'config', label: 'Kết nối Zalo OA', icon: Settings },
          { id: 'templates', label: `Mẫu tin (${templates.length})`, icon: Sliders },
          { id: 'logs', label: `Nhật ký gửi tin (${logs.length})`, icon: Clock },
        ]}
      />

      {/* Tab 1: Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white rounded-2xl border border-[#EFE4D9] shadow-xs p-5 flex flex-col justify-between hover:border-[#8A4F23]/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A4F23] bg-[#FAF0E4] px-2 py-0.5 rounded-full border border-[#E8DFD8]">
                      {tmpl.templateCode}
                    </span>
                    <h3 className="font-bold text-[#2C241E] text-sm mt-1.5">{tmpl.name}</h3>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tmpl.isActive}
                      onChange={() => handleToggleTemplate(tmpl.id, tmpl.isActive)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8A4F23]"></div>
                  </label>
                </div>

                <p className="text-xs text-[#73675F] mb-4">{tmpl.description}</p>

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

              <div className="mt-4 pt-3 border-t border-[#EFE4D9] flex items-center justify-between text-[11px] text-[#73675F]">
                <span>Trạng thái mẫu:</span>
                <span
                  className={`font-semibold ${
                    tmpl.isActive ? 'text-[#0D6832]' : 'text-gray-400'
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
          <div className="bg-white p-4 rounded-2xl border border-[#EFE4D9] shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo số điện thoại..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#8A4F23] focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl px-3 py-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#8C7A6B]" />
              <select
                value={filterTemplate}
                onChange={(e) => setFilterTemplate(e.target.value)}
                className="bg-transparent text-xs text-[#2C241E] focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả mẫu tin</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.templateCode}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl px-3 py-2 text-xs">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs text-[#2C241E] focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="SENT">Đã gửi (SENT)</option>
                <option value="DELIVERED">Đã nhận (DELIVERED)</option>
                <option value="FAILED">Thất bại (FAILED)</option>
              </select>
            </div>

            <button
              onClick={loadData}
              className="px-3.5 py-2 bg-[#8A4F23] hover:bg-[#72401C] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Lọc
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EFE4D9] text-[11px] font-bold text-[#73675F] uppercase tracking-wider">
                    <th className="py-3 px-4">Người nhận & SĐT</th>
                    <th className="py-3 px-4">Kịch bản ZNS</th>
                    <th className="py-3 px-4">Tham số đã truyền</th>
                    <th className="py-3 px-4">Thời gian gửi</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9] text-xs text-[#2C241E]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#8C7A6B]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-[#8A4F23] border-t-transparent rounded-full animate-spin" />
                          <span>Đang tải nhật ký ZNS...</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#8C7A6B]">
                        <p className="font-medium text-sm text-[#2C241E]">Chưa có nhật ký gửi tin ZNS nào</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#2C241E]">{log.recipientName || 'Khách hàng'}</div>
                          <div className="text-[11px] text-[#73675F] flex items-center gap-1 mt-0.5 font-mono">
                            <Phone className="w-3 h-3 text-[#8C7A6B]" />
                            <span>{log.recipientPhone}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#8A4F23] text-xs">
                            {templates.find((t) => t.templateCode === log.templateCode)?.name || log.templateCode}
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-xs truncate text-[11px] text-[#73675F] font-mono">
                          {JSON.stringify(log.paramsSent)}
                        </td>

                        <td className="py-3 px-4 text-[11px] text-[#73675F]">
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

      {activeTab === 'config' && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <section aria-labelledby="zalo-config-title" className="min-w-0 overflow-hidden rounded-2xl border border-[#E8DFD8] bg-white">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EFE4D9] px-5 py-4 sm:px-6">
              <div>
                <h2 id="zalo-config-title" className="text-base font-bold text-[#2C241E]">Cấu hình Zalo OA</h2>
                <p role="status" className="mt-1 text-sm text-[#73675F]">
                  {isCheckingGateway ? 'Đang kiểm tra cấu hình…' : gateway ? `${configuredCount}/${gatewaySettings.length} mục đã cấu hình` : 'Chưa xác minh được cấu hình'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadGateway()}
                disabled={isCheckingGateway || isSavingConfig}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E8DFD8] px-3 text-sm font-semibold text-[#2C241E] hover:bg-[#FAF8F5] disabled:opacity-60"
              >
                <RotateCcw aria-hidden="true" className={`h-4 w-4 ${isCheckingGateway ? 'motion-safe:animate-spin' : ''}`} />
                Kiểm tra lại
              </button>
            </header>
            {gatewayError && (
              <p role="alert" className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-6">
                {gatewayError}
              </p>
            )}
            <form onSubmit={handleSaveConfiguration}>
              <fieldset disabled={isSavingConfig || isCheckingGateway || !gateway} className="divide-y divide-[#EFE4D9] px-5 sm:px-6">
                {gatewaySettings.map(({ key, label, icon: Icon }) => {
                  const configured = gateway?.[key];
                  const configuredLabel = configured ? 'Đã cấu hình' : gateway ? 'Còn thiếu' : 'Chưa xác minh';
                  const isToken = key === 'tokenConfigured';
                  const isTemplate = key === 'templateConfigured';
                  return (
                    <div key={key} className="space-y-2 py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label htmlFor={key} className="inline-flex items-center gap-2 text-sm font-semibold text-[#2C241E]">
                          <Icon aria-hidden="true" className="h-4 w-4 text-[#8A4F23]" />
                          {label}
                        </label>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${configured ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
                          {configuredLabel}
                        </span>
                      </div>
                      <input
                        id={key}
                        type={isToken ? 'password' : isTemplate ? 'text' : 'tel'}
                        inputMode={isTemplate ? 'numeric' : undefined}
                        autoComplete={isToken ? 'new-password' : 'off'}
                        spellCheck={false}
                        required={!isToken || !gateway?.tokenConfigured}
                        maxLength={isToken ? 4096 : 30}
                        value={isToken ? accessToken : isTemplate ? templateId ?? gateway?.templateId ?? '' : testPhone ?? gateway?.testPhone ?? ''}
                        onChange={(event) => {
                          setSavedConfiguration(false);
                          const value = event.target.value;
                          if (isToken) setAccessToken(value);
                          else if (isTemplate) setTemplateId(value);
                          else setTestPhone(value);
                        }}
                        placeholder={isToken ? configured ? 'Để trống để giữ token hiện tại' : 'Dán OA Access Token' : isTemplate ? 'Nhập mã mẫu đã duyệt trong ZBS' : '09xxxxxxxx'}
                        className="min-h-10 w-full rounded-lg border border-[#E8DFD8] bg-[#FAF8F5] px-3 py-2 text-sm text-[#2C241E] focus-visible:outline-2 focus-visible:outline-[#8A4F23]"
                      />
                    </div>
                  );
                })}
              </fieldset>
              <div className="space-y-3 border-t border-[#EFE4D9] bg-[#FAF8F5] px-5 py-4 sm:px-6">
                {saveError && <p role="alert" className="text-sm text-red-800">{saveError}</p>}
                {savedConfiguration && <p role="status" className="text-sm font-semibold text-emerald-800">Đã lưu cấu hình. Bạn có thể gửi tin thử.</p>}
                <button type="submit" disabled={isSavingConfig || isCheckingGateway || isSendingTest || !gateway || !configurationEdited}
                  className="min-h-10 rounded-lg bg-[#8A4F23] px-4 text-sm font-semibold text-white hover:bg-[#72401C] disabled:cursor-not-allowed disabled:opacity-60">
                  {isSavingConfig ? 'Đang lưu…' : 'Lưu cấu hình'}
                </button>
              </div>
            </form>
          </section>

          <section aria-labelledby="zalo-test-title" className="min-w-0 overflow-hidden rounded-2xl border border-[#E8DFD8] bg-white">
            <header className="border-b border-[#EFE4D9] px-5 py-4 sm:px-6">
              <h2 id="zalo-test-title" className="text-base font-bold text-[#2C241E]">Gửi tin thử</h2>
              <p className="mt-1 text-sm text-[#73675F]">Mẫu tin xác nhận lịch hẹn</p>
            </header>
            <form onSubmit={handleSendTestZns} className="space-y-4 px-5 py-4 sm:px-6">
              <div className="rounded-lg border border-[#E8DFD8] bg-[#FAF8F5] px-3 py-2.5 text-sm">
                <span className="text-[#73675F]">Gửi đến </span>
                <strong className="text-[#2C241E]">{gateway?.testPhone ? `+${gateway.testPhone}` : 'Số điện thoại đã lưu trong cấu hình'}</strong>
              </div>
              <details className="rounded-lg border border-[#E8DFD8] bg-[#FAF8F5]">
                <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-[#2C241E]">Tham số mẫu tin</summary>
                <div className="space-y-2 border-t border-[#E8DFD8] p-3">
                  <label htmlFor="zalo-test-parameters" className="block text-xs text-[#73675F]">Dùng đúng tên trường trong mẫu Zalo đã duyệt.</label>
                  <textarea
                    id="zalo-test-parameters"
                    rows={6}
                    spellCheck={false}
                    value={testParameters ?? defaultTestParameters}
                    onChange={(event) => setTestParameters(event.target.value)}
                    className="w-full rounded-lg border border-[#E8DFD8] bg-white p-2 font-mono text-xs leading-relaxed text-[#2C241E] focus-visible:outline-2 focus-visible:outline-[#8A4F23]"
                  />
                  <button type="button" onClick={() => setTestParameters(null)} className="text-xs font-semibold text-[#8A4F23] hover:underline">Dùng lại dữ liệu mẫu</button>
                </div>
              </details>
              {testError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{testError}</p>}
              {lastReceipt && (
                <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  <p className="font-semibold">Zalo đã tiếp nhận</p>
                  <p className="mt-1">Mã tin <code className="break-all">{lastReceipt}</code>. Kiểm tra tin trên điện thoại đã khai báo.</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 border-t border-[#EFE4D9] pt-4">
                <button
                  type="submit"
                  disabled={!canSendTest || !gateway?.testPhone || isSendingTest || isSavingConfig || configurationEdited}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#8A4F23] px-4 text-sm font-semibold text-white hover:bg-[#72401C] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Send aria-hidden="true" className="h-4 w-4" />
                  {isSendingTest ? 'Đang gửi…' : 'Gửi tin thử'}
                </button>
                {(!canSendTest || configurationEdited) && !isCheckingGateway && <p className="text-xs text-[#73675F]">Lưu đủ ba mục cấu hình để gửi thử.</p>}
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
