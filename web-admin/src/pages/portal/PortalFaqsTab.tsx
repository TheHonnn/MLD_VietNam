import React, { useState, useEffect, useMemo } from 'react';
import {
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  BookOpen,
  Calendar,
  CreditCard,
  X,
  Filter,
} from 'lucide-react';
import { SupportFaqItem } from '../../types/shared_types';
import { portalService } from '../../services';

const FAQ_CATEGORIES: { id: string; label: string; icon: any; colorClass: string }[] = [
  { id: 'ALL', label: 'Tất cả chuyên mục', icon: Filter, colorClass: 'bg-slate-100 text-slate-700' },
  { id: 'DAO_TAO', label: 'Đào tạo & Học phí', icon: BookOpen, colorClass: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]' },
  { id: 'DICH_VU', label: 'Dịch vụ & Trị liệu', icon: Sparkles, colorClass: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]' },
  { id: 'DAT_LICH', label: 'Đặt lịch & Cơ sở', icon: Calendar, colorClass: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]' },
  { id: 'HOI_VIEN', label: 'Hội viên & Ưu đãi', icon: CreditCard, colorClass: 'bg-[#FAF0E4] text-[#985018] border-[#EFE4D9]' },
];

export const PortalFaqsTab: React.FC = () => {
  const [faqs, setFaqs] = useState<SupportFaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Partial<SupportFaqItem> | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadFaqs();
  }, []);

  const loadFaqs = async () => {
    setLoadError('');
    setIsLoading(true);
    try {
      const res = await portalService.getFaqs();
      if (!res.success) throw new Error(res.message || 'Không tải được dữ liệu.');
      if (res.data) {
        setFaqs(res.data);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
      console.error('Error loading FAQs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenModal = (faq?: SupportFaqItem) => {
    if (faq) {
      setEditingFaq({ ...faq });
    } else {
      setEditingFaq({
        category: selectedCategory === 'ALL' ? 'DICH_VU' : selectedCategory,
        question: '',
        answer: '',
        displayOrder: faqs.length + 1,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq || !editingFaq.question || !editingFaq.answer) {
      showToast('Vui lòng nhập câu hỏi và câu trả lời.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await portalService.saveFaq(editingFaq);
      if (res.success) {
        showToast(editingFaq.id ? 'Cập nhật câu hỏi thành công!' : 'Thêm mới câu hỏi thành công!', 'success');
        setIsModalOpen(false);
        setEditingFaq(null);
        await loadFaqs();
      } else {
        showToast(res.message || 'Lỗi lưu câu hỏi.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối máy chủ.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, question: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa câu hỏi:\n"${question}"?`)) return;

    try {
      const res = await portalService.deleteFaq(id);
      if (res.success) {
        showToast('Xóa câu hỏi thành công!', 'success');
        await loadFaqs();
      } else {
        showToast(res.message || 'Không thể xóa câu hỏi này.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa câu hỏi.', 'error');
    }
  };

  const handleToggleActive = async (faq: SupportFaqItem) => {
    try {
      await portalService.saveFaq({ id: faq.id, isActive: !faq.isActive });
      setFaqs((prev) => prev.map((x) => (x.id === faq.id ? { ...x, isActive: !x.isActive } : x)));
      showToast(`Đã ${!faq.isActive ? 'hiển thị' : 'ẩn'} câu hỏi trên App.`, 'success');
    } catch (err) {
      showToast('Lỗi thay đổi trạng thái.', 'error');
    }
  };

  const filteredFaqs = useMemo(() => {
    return faqs.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const kw = searchKeyword.trim().toLowerCase();
      const matchKw =
        !kw ||
        item.question.toLowerCase().includes(kw) ||
        item.answer.toLowerCase().includes(kw);
      return matchCat && matchKw;
    });
  }, [faqs, selectedCategory, searchKeyword]);

  const getCategoryBadge = (cat: string) => {
    const match = FAQ_CATEGORIES.find((x) => x.id === cat);
    return match || { id: cat, label: cat, colorClass: 'bg-slate-100 text-slate-700' };
  };

  if (loadError) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p>{loadError}</p><button className="mt-2 underline" type="button" onClick={loadFaqs}>Thử tải lại</button></div>;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold shadow-sm transition-all ${
            toastType === 'success'
              ? 'bg-[#ECFDF5] border-[#10B981] text-[#065F46]'
              : 'bg-[#FEF2F2] border-[#EF4444] text-[#991B1B]'
          }`}
        >
          {toastType === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#FAF0E4] text-[#985018]">
              <HelpCircle className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-[#2C241E]">Hỏi đáp thường gặp FAQs</h3>
          </div>
          <p className="text-xs text-[#73675F]">
            Quản trị câu hỏi và câu trả lời thường gặp để tự động đồng bộ lên Màn hình Hỗ trợ CSKH D07 trên ứng dụng di động.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm Câu hỏi FAQ</span>
        </button>
      </div>

      {/* Category Chips and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {FAQ_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = cat.id === 'ALL' ? faqs.length : faqs.filter((f) => f.category === cat.id).length;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#985018] text-white shadow-xs'
                    : 'bg-white border border-[#E8DFD8] text-[#73675F] hover:bg-[#FAF8F5]'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm kiếm câu hỏi hoặc trả lời..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
          />
        </div>
      </div>

      {/* FAQs List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-14 space-y-2 bg-white rounded-2xl border border-[#E8DFD8]">
          <Loader2 className="w-6 h-6 text-[#985018] animate-spin" />
          <span className="text-xs text-[#73675F]">Đang tải danh sách câu hỏi...</span>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="text-center p-14 bg-white rounded-2xl border border-[#E8DFD8] space-y-2">
          <HelpCircle className="w-8 h-8 mx-auto text-[#A89F91]" />
          <p className="text-xs font-semibold text-[#2C241E]">Không tìm thấy câu hỏi nào phù hợp</p>
          <p className="text-[11px] text-[#73675F]">Hãy thử đổi chuyên mục hoặc bấm "+ Thêm Câu hỏi FAQ".</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isExpanded = expandedFaqId === faq.id;
            const badge = getCategoryBadge(faq.category);
            return (
              <div
                key={faq.id}
                className="bg-white rounded-2xl border border-[#E8DFD8] p-4 shadow-xs transition-all hover:border-[#985018]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex-1 cursor-pointer select-none space-y-1.5"
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.colorClass}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-[#73675F]">Thứ tự: #{faq.displayOrder}</span>
                    </div>

                    <h4 className="text-xs font-bold text-[#2C241E] hover:text-[#985018] transition-colors flex items-center gap-1.5">
                      <span>
                        {idx + 1}. {faq.question}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </h4>
                  </div>

                  {/* Actions & Active Toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(faq)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                        faq.isActive
                          ? 'bg-[#ECFDF5] text-[#065F46] border border-[#10B981]/30'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {faq.isActive ? 'Đang hiện' : 'Đã ẩn'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenModal(faq)}
                      className="p-1.5 text-slate-500 hover:text-[#985018] hover:bg-[#FAF0E4] rounded-lg transition-colors cursor-pointer"
                      title="Chỉnh sửa câu hỏi"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(faq.id, faq.question)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa câu hỏi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Answer Body */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[#EFE4D9] text-xs text-[#2C241E] leading-relaxed bg-[#FAF8F5] p-3.5 rounded-xl animate-in fade-in duration-150">
                    <div className="font-semibold text-[11px] text-[#985018] mb-1">Nội dung giải đáp:</div>
                    <p className="whitespace-pre-line text-[#73675F]">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit FAQ */}
      {isModalOpen && editingFaq && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E8DFD8] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E8DFD8] bg-[#FAF8F5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#FAF0E4] text-[#985018]">
                  <HelpCircle className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-[#2C241E]">
                  {editingFaq.id ? 'Chỉnh sửa Câu hỏi FAQ' : 'Thêm mới Câu hỏi FAQ'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">
                    Chuyên mục câu hỏi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingFaq.category || 'DICH_VU'}
                    onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="DICH_VU">Dịch vụ & Trị liệu</option>
                    <option value="DAO_TAO">Đào tạo & Học phí</option>
                    <option value="DAT_LICH">Đặt lịch & Cơ sở</option>
                    <option value="HOI_VIEN">Hội viên & Ưu đãi</option>
                    <option value="CHUNG">Câu hỏi chung</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min="1"
                    value={editingFaq.displayOrder || 1}
                    onChange={(e) => setEditingFaq({ ...editingFaq, displayOrder: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Tiêu đề câu hỏi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingFaq.question || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  placeholder="VD: Dẫn lưu bạch huyết MLD có khác gì so với massage thư giãn?"
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Nội dung câu trả lời chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={editingFaq.answer || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  placeholder="Nhập nội dung giải đáp y khoa chính xác, rõ ràng..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalFaqActive"
                  checked={editingFaq.isActive}
                  onChange={(e) => setEditingFaq({ ...editingFaq, isActive: e.target.checked })}
                  className="w-4 h-4 text-[#985018] rounded cursor-pointer"
                />
                <label htmlFor="modalFaqActive" className="text-xs font-bold text-[#2C241E] cursor-pointer">
                  Kích hoạt hiển thị trên Màn hình CSKH App Mobile
                </label>
              </div>

              <div className="pt-3 border-t border-[#E8DFD8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-[#E8DFD8] bg-white rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#985018] hover:bg-[#804213] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingFaq.id ? 'Cập nhật' : 'Thêm mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
