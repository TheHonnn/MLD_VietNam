import { useState, useEffect, useCallback, useRef } from 'react';
import {
  supportService,
  SystemDiagnosticData,
  AdminSopGuide,
  AdminSupportTicket,
  CustomerSupportTicket,
  CreateTicketPayload,
  UpdateTicketPayload,
  UpdateCustomerTicketPayload,
} from '../services/support.service';
import { toast } from '../components/common';

export function useAdminSupport() {
  const [diagnostics, setDiagnostics] = useState<SystemDiagnosticData | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  const [guides, setGuides] = useState<AdminSopGuide[]>([]);
  const [guidesLoading, setGuidesLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [guideSearch, setGuideSearch] = useState('');

  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const [customerTickets, setCustomerTickets] = useState<CustomerSupportTicket[]>([]);
  const [customerTicketsLoading, setCustomerTicketsLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // 1. Tải dữ liệu chẩn đoán
  const loadDiagnostics = useCallback(async () => {
    setDiagnosticsLoading(true);
    try {
      const data = await supportService.getDiagnostics();
      setDiagnostics(data);
    } catch {
      toast.error('Lỗi chẩn đoán', 'Không thể đo lường độ trễ hệ thống.');
    } finally {
      setDiagnosticsLoading(false);
    }
  }, []);

  // 2. Tải danh sách tài liệu SOP
  const loadGuides = useCallback(async (module = 'ALL', search = '') => {
    setGuidesLoading(true);
    try {
      const list = await supportService.getGuides(module, search);
      setGuides(list);
    } catch {
      toast.error('Lỗi tải tài liệu', 'Không thể tải danh sách cẩm nang SOP.');
    } finally {
      setGuidesLoading(false);
    }
  }, []);

  // 3. Tải danh sách tickets
  const loadTickets = useCallback(async (filters?: { status?: string; priority?: string; category?: string; search?: string }) => {
    setTicketsLoading(true);
    try {
      const list = await supportService.getTickets(filters);
      setTickets(list);
    } catch {
      toast.error('Lỗi tải phiếu hỗ trợ', 'Không thể tải danh sách phiếu hỗ trợ.');
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  // 4. Gửi phiếu hỗ trợ mới
  const submitTicket = useCallback(async (data: { category: string; priority?: string; title: string; description: string; attachments?: string[] }) => {
    setSubmittingTicket(true);
    try {
      // Tự động thu thập thông tin môi trường kỹ thuật của máy trạm
      const envInfo = {
        userAgent: navigator.userAgent,
        currentPath: window.location.pathname + window.location.search,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio,
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        submittedAt: new Date().toISOString(),
      };

      const payload: CreateTicketPayload = {
        ...data,
        environment_info: envInfo,
      };

      const created = await supportService.createTicket(payload);
      toast.success(
        'Đã gửi yêu cầu hỗ trợ',
        `Mã phiếu của bạn là ${created.ticket_code || 'mới tạo'}. Đội ngũ kỹ thuật sẽ tiếp nhận và phản hồi sớm nhất.`
      );
      // Reload tickets
      await loadTickets();
      return true;
    } catch (err: any) {
      toast.error('Gửi yêu cầu thất bại', err?.message || 'Vui lòng kiểm tra lại kết nối mạng.');
      return false;
    } finally {
      setSubmittingTicket(false);
    }
  }, [loadTickets]);

  const loadCustomerTickets = useCallback(async (filters?: { status?: string; search?: string }) => {
    setCustomerTicketsLoading(true);
    try {
      const list = await supportService.getCustomerTickets(filters);
      setCustomerTickets(list);
    } catch {
      toast.error('Lỗi tải phiếu khách hàng', 'Không thể tải danh sách yêu cầu từ ứng dụng khách hàng.');
    } finally {
      setCustomerTicketsLoading(false);
    }
  }, []);

  const updateTicket = useCallback(async (id: string, data: UpdateTicketPayload) => {
    try {
      await supportService.updateTicket(id, data);
      toast.success('Đã cập nhật phiếu hỗ trợ', 'Phản hồi và trạng thái xử lý đã được lưu.');
      await loadTickets();
      return true;
    } catch (err: any) {
      toast.error('Cập nhật thất bại', err?.message || 'Không thể cập nhật phiếu hỗ trợ.');
      return false;
    }
  }, [loadTickets]);

  const updateCustomerTicket = useCallback(async (id: string, data: UpdateCustomerTicketPayload) => {
    try {
      await supportService.updateCustomerTicket(id, data);
      toast.success('Đã phản hồi khách hàng', 'Trạng thái yêu cầu hỗ trợ đã được cập nhật.');
      await loadCustomerTickets();
      return true;
    } catch (err: any) {
      toast.error('Cập nhật thất bại', err?.message || 'Không thể cập nhật yêu cầu khách hàng.');
      return false;
    }
  }, [loadCustomerTickets]);

  useEffect(() => {
    loadDiagnostics();
    loadGuides();
    loadTickets();
    loadCustomerTickets();
  }, [loadDiagnostics, loadGuides, loadTickets, loadCustomerTickets]);

  return {
    diagnostics,
    diagnosticsLoading,
    loadDiagnostics,

    guides,
    guidesLoading,
    selectedModule,
    setSelectedModule,
    guideSearch,
    setGuideSearch,
    loadGuides,

    tickets,
    ticketsLoading,
    submittingTicket,
    loadTickets,
    submitTicket,
    updateTicket,

    customerTickets,
    customerTicketsLoading,
    loadCustomerTickets,
    updateCustomerTicket,
  };
}
