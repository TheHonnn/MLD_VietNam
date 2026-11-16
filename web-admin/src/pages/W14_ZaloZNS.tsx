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
  Eye,
} from 'lucide-react';
import { znsService } from '../services';
import { ZNSTemplate, ZaloZnsLog } from '../types/shared_types';
import { toast, AdminTabs } from '../components/common';

export const W14_ZaloZNS: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'logs' | 'config'>('templates');
  const [templates, setTemplates] = useState<ZNSTemplate[]>([]);
  const [logs, setLogs] = useState<ZaloZnsLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Zalo Cloud Config State
  const [gateway, setGateway] = useState<Awaited<ReturnType<typeof znsService.getGatewayStatus>> | null>(null);
  const [gatewayError, setGatewayError] = useState('');
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  const loadGateway = async () => {
    setGatewayError('');
    try {
      setGateway(await znsService.getGatewayStatus());
    } catch (error) {
      setGateway(null);
      setGatewayError(error instanceof Error ? error.message : 'Không tải được trạng thái máy chủ.');
    }
  };

  // Search & Filters for Logs
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [filterTemplate, setFilterTemplate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Test Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testPhone, setTestPhone] = useState<string>('');
  const testTemplateCode = 'BOOKING_CONFIRMATION';
  const [testParameters, setTestParameters] = useState('');
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
        customer_name: 'Khách kiểm thử',
        service_name: 'Dẫn lưu bạch huyết vùng bụng',
        booking_time: '14:30',
        branch_name: 'MLD Nam Kỳ Khởi Nghĩa',
      };

      let payload = params;
      if (testParameters.trim()) {
        try {
          payload = JSON.parse(testParameters);
        } catch {
          toast.error('JSON không hợp lệ', 'Kiểm tra lại tham số của mẫu tin.');
          return;
        }
      }
      setLastReceipt(null);
      const res = await znsService.sendTest({
        recipientPhone: testPhone,
        templateCode: testTemplateCode,
        paramsSent: payload,
      });

      if (res.success && res.data) {
        setLastReceipt(res.data.messageId);
        toast.success('Zalo đã tiếp nhận', 'Mở Zalo trên điện thoại để xác nhận đã nhận tin.');
      } else {
        toast.error('Gửi thất bại', res.message);
      }
    } catch {
      toast.error('Lỗi', 'Có lỗi khi kết nối cổng Zalo ZNS.');
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (gateway?.tokenConfigured && gateway.templateConfigured && gateway.testPhoneConfigured) {
                setLastReceipt(null);
                setIsTestModalOpen(true);
              } else {
                setActiveTab('config');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#8A4F23] hover:bg-[#72401C] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi tin kiểm thử</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FAF8F5] hover:bg-[#F3E5D4] text-[#2C241E] border border-[#E8DFD8] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <AdminTabs
        ariaLabel="Phân hệ Zalo ZNS"
        variant="line"
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
        tabs={[
          { id: 'templates', label: `Mẫu tin (${templates.length})`, icon: Sliders },
          { id: 'logs', label: `Nhật ký gửi tin (${logs.length})`, icon: Clock },
          {
            id: 'config',
            label: 'Kết nối Zalo OA',
            icon: Settings,
          },
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

      {/* Tab 3: Zalo Cloud API Configuration */}
      {activeTab === 'config' && (
        <section className="rounded-2xl border border-[#EFE4D9] bg-white p-5 space-y-4">
          <h2 className="text-lg font-bold">Kết nối Zalo OA</h2>
          <p className="text-sm">Gửi thử mẫu xác nhận lịch hẹn qua backend. Gửi tự động đang tắt.</p>
          {gatewayError && <p role="alert" className="text-sm text-red-700">{gatewayError}</p>}
          <dl className="space-y-2 text-sm">
            <div><dt>OA Access Token</dt><dd>{gateway ? gateway.tokenConfigured ? 'Đã cấu hình' : 'Chưa cấu hình' : 'Chưa kiểm tra'}</dd></div>
            <div><dt>Template ID xác nhận lịch</dt><dd>{gateway ? gateway.templateConfigured ? 'Đã cấu hình' : 'Chưa cấu hình' : 'Chưa kiểm tra'}</dd></div>
            <div><dt>Số điện thoại thử</dt><dd>{gateway ? gateway.testPhoneConfigured ? 'Đã cấu hình' : 'Chưa cấu hình' : 'Chưa kiểm tra'}</dd></div>
          </dl>
          <p className="text-sm">Thêm ZALO_OA_ACCESS_TOKEN, ZALO_BOOKING_CONFIRMATION_TEMPLATE_ID và ZALO_TEST_PHONE vào Environment của backend trên Render.</p>
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => void loadGateway()}>Kiểm tra lại cấu hình</button>
        </section>
      )}

      {/* Test Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EFE4D9] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE4D9] pb-3">
              <div className="flex items-center gap-2 text-[#8A4F23] font-bold text-sm">
                <Send className="w-4 h-4" />
                <span>Gửi thử nghiệm tin nhắn Zalo ZNS</span>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="text-[#8C7A6B] hover:text-[#2C241E] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm">Tin thử gửi đến số đã cấu hình trên Render. Dùng tên tham số đúng với mẫu Zalo đã duyệt.</p>
            {lastReceipt && <p role="status" className="text-sm text-green-800">Mã tin Zalo: {lastReceipt}. Hãy kiểm tra trên điện thoại.</p>}

            <form onSubmit={handleSendTestZns} className="space-y-3.5 text-xs">
              <label className="block">
                Tham số mẫu (JSON)
                <textarea className="mt-1 w-full rounded-lg border p-2" rows={4}
                  value={testParameters} onChange={(e) => setTestParameters(e.target.value)}
                  placeholder="Để trống để dùng tham số mẫu xác nhận lịch trong MLD" />
              </label>

              <div>
                <label htmlFor="zalo-test-phone" className="block text-[#73675F] font-semibold mb-1">Số điện thoại nhận tin ZNS</label>
                <input
                  id="zalo-test-phone"
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="09xxxxxxxx"
                  required
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#8A4F23]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 bg-[#FAF8F5] border border-[#E8DFD8] hover:bg-[#F3E5D4] text-[#2C241E] rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-4 py-2 bg-[#8A4F23] hover:bg-[#72401C] text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
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
