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
} from 'lucide-react';
import { znsService } from '../services';
import { ZNSTemplate, ZaloZnsLog } from '../types/shared_types';
import { toast } from '../components/common';

export const W14_ZaloZNS: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates');
  const [templates, setTemplates] = useState<ZNSTemplate[]>([]);
  const [logs, setLogs] = useState<ZaloZnsLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
