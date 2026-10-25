import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  RotateCcw,
  Layers,
  History,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  Droplet,
  Search,
  Filter,
} from 'lucide-react';
import { inventoryService, treatmentService, branchService } from '../services';
import { ServiceMaterial, InventoryConsumptionLog, Service, Branch } from '../types/shared_types';
import { toast } from '../components/common';

export const W15_InventoryBOM: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bom' | 'logs'>('bom');
  const [materials, setMaterials] = useState<ServiceMaterial[]>([]);
  const [logs, setLogs] = useState<InventoryConsumptionLog[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [filterServiceId, setFilterServiceId] = useState<string>('all');
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Add BOM Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newServiceId, setNewServiceId] = useState<string>('');
  const [newMaterialName, setNewMaterialName] = useState<string>('');
  const [newDosage, setNewDosage] = useState<string>('20');
  const [newUnit, setNewUnit] = useState<string>('ml');
  const [newNotes, setNewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [matRes, logRes, srvRes, brRes] = await Promise.all([
        inventoryService.getServiceMaterials(filterServiceId !== 'all' ? filterServiceId : undefined),
        inventoryService.getConsumptionLogs({
          branchId: filterBranchId !== 'all' ? filterBranchId : undefined,
          serviceId: filterServiceId !== 'all' ? filterServiceId : undefined,
        }),
        treatmentService.getServices(),
        branchService.getAllBranches(),
      ]);

      if (matRes.success && matRes.data) setMaterials(matRes.data);
      if (logRes.success && logRes.data) setLogs(logRes.data);
      if (srvRes.success && srvRes.data) {
        setServices(srvRes.data);
        if (!newServiceId && srvRes.data.length > 0) {
          setNewServiceId(srvRes.data[0].id);
        }
      }
      if (brRes.success && brRes.data) setBranches(brRes.data);
    } catch (err) {
      console.error('Error loading inventory BOM data:', err);
      toast.error('Lỗi', 'Không thể kết nối đến máy chủ CSDL.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterServiceId, filterBranchId]);

  const handleAddBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim() || !newServiceId) {
      toast.error('Lỗi', 'Vui lòng nhập tên nguyên vật liệu và chọn dịch vụ.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await inventoryService.addServiceMaterial({
        serviceId: newServiceId,
        materialName: newMaterialName.trim(),
        dosagePerSession: Number(newDosage) || 1,
        unit: newUnit.trim(),
        notes: newNotes.trim() || undefined,
      });

      if (res.success) {
        toast.success('Bổ sung thành công', `Đã thêm định mức cho nguyên liệu ${newMaterialName}.`);
        setIsAddModalOpen(false);
        setNewMaterialName('');
        setNewNotes('');
        loadData();
      } else {
        toast.error('Lỗi', res.message);
      }
    } catch {
      toast.error('Lỗi', 'Không thể thêm định mức vật tư.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group materials by service
  const groupedMaterials = services.map((srv) => ({
    service: srv,
    items: materials.filter((m) => m.serviceId === srv.id),
  })).filter((g) => filterServiceId === 'all' || g.service.id === filterServiceId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8EFF5] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-600 mb-1">
            <Boxes className="w-4 h-4" />
            <span>Quản trị chuỗi cung ứng & Dược mỹ phẩm</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">
            Quản Lý Định Mức Vật Tư (BOM) & Tự Động Trừ Kho
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Cấu hình định mức tiêu hao nguyên vật liệu y khoa cho từng ca trị liệu. Tự động trừ kho tại chi nhánh khi bấm Kết ca.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm định mức mới</span>
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
          onClick={() => setActiveTab('bom')}
          className={`pb-3 px-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'bom'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Định mức tiêu hao theo Dịch vụ (BOM)</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'logs'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Nhật ký trừ kho tự động ({logs.length})</span>
        </button>
      </div>

      {/* Tab 1: BOM Cards */}
      {activeTab === 'bom' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <span className="text-xs font-semibold text-[#64748B]">Lọc theo dịch vụ:</span>
            <select
              value={filterServiceId}
              onChange={(e) => setFilterServiceId(e.target.value)}
              className="p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="all">Tất cả dịch vụ ({services.length})</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groupedMaterials.map(({ service, items }) => (
              <div
                key={service.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 hover:border-sky-300 transition-all space-y-4"
              >
                <div className="flex items-start justify-between border-b border-[#F1F5F9] pb-3">
                  <div>
                    <h3 className="font-bold text-[#0F172A] text-sm">{service.name}</h3>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Thời lượng: {service.durationMinutes || 60} phút · {items.length} loại vật tư tiêu hao
                    </p>
                  </div>
                  <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                    BOM SOP
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#94A3B8]">
                    Chưa thiết lập định mức vật tư cho dịch vụ này
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {items.map((mat) => (
                      <div
                        key={mat.id}
                        className="p-3 bg-[#F8FAFC] rounded-xl border border-[#EDF2F7] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-[#1E293B] flex items-center gap-1.5">
                            <Droplet className="w-3.5 h-3.5 text-sky-600" />
                            <span>{mat.materialName}</span>
                          </div>
                          {mat.notes && (
                            <p className="text-[10.5px] text-[#64748B] mt-0.5">{mat.notes}</p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-sky-700 text-sm">{mat.dosagePerSession}</span>{' '}
                          <span className="text-[#64748B] text-[11px]">{mat.unit}/ca</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Consumption Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
              <select
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                className="bg-transparent text-xs text-[#0F172A] focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs">
              <select
                value={filterServiceId}
                onChange={(e) => setFilterServiceId(e.target.value)}
                className="bg-transparent text-xs text-[#0F172A] focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả dịch vụ</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadData}
              className="px-3.5 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-700 transition-colors cursor-pointer"
            >
              Lọc
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Cơ sở / Chi nhánh</th>
                    <th className="py-3 px-4">Dịch vụ & KTV</th>
                    <th className="py-3 px-4">Nguyên vật liệu trừ</th>
                    <th className="py-3 px-4 text-right">Số lượng tiêu hao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs text-[#334155]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#94A3B8]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                          <span>Đang tải nhật ký tiêu hao kho...</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#94A3B8]">
                        <p className="font-medium text-sm">Chưa có nhật ký trừ kho nào</p>
                        <p className="text-[11px] mt-0.5">Hệ thống sẽ tự động trừ kho khi KTV hoàn thành và bấm Kết ca trị liệu.</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 text-[11px] text-[#64748B]">
                          {new Date(log.loggedAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F172A]">
                          {log.branchName || 'Chi nhánh MLD'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-sky-800">{log.serviceName}</div>
                          <div className="text-[11px] text-[#64748B]">{log.technicianName}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#1E293B]">
                          {log.materialName}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-red-600">
                          -{log.quantityDeducted} {log.unit}
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

      {/* Modal Add BOM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
                <Plus className="w-4 h-4" />
                <span>Thêm định mức tiêu hao nguyên vật liệu (BOM)</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBOM} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Dịch vụ áp dụng</label>
                <select
                  value={newServiceId}
                  onChange={(e) => setNewServiceId(e.target.value)}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Tên nguyên vật liệu / Dược mỹ phẩm</label>
                <input
                  type="text"
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  placeholder="VD: Tinh dầu dẫn lưu bạch huyết y khoa"
                  required
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">Định mức tiêu hao/buổi</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    required
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[#64748B] font-semibold mb-1">Đơn vị tính</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="ml, cái, gói, gram..."
                    required
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Ghi chú SOP chuẩn y tế</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="VD: Dầu chuyên dụng tiệt trùng organic..."
                  rows={2}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Đang lưu...' : 'Lưu định mức'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
