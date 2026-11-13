import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Target,
  Sparkles,
  School,
  Heart,
  Stethoscope,
  Briefcase,
  BookOpen,
  Award,
  Store,
  Layers,
  X,
} from 'lucide-react';
import { PortalTaxonomyItem, TaxonomyType } from '../../types/shared_types';
import { portalService } from '../../services';

const AVAILABLE_ICONS = [
  { id: 'school', name: 'Trường học / Người mới', icon: School },
  { id: 'spa', name: 'Làm đẹp / Spa Pro', icon: Sparkles },
  { id: 'medical_services', name: 'Y tế / Y Bác sĩ', icon: Stethoscope },
  { id: 'favorite', name: 'Gia đình / Tự chăm sóc', icon: Heart },
  { id: 'briefcase', name: 'Nghề nghiệp / Doanh nhân', icon: Briefcase },
  { id: 'menu_book', name: 'Sách giáo trình / Nền tảng', icon: BookOpen },
  { id: 'verified', name: 'Chứng nhận / Chuẩn Vodder', icon: Award },
  { id: 'storefront', name: 'Cơ sở / Setup phòng', icon: Store },
  { id: 'layers', name: 'Đa lớp / Tích hợp', icon: Layers },
];

export const PortalTaxonomiesTab: React.FC = () => {
  const [activeType, setActiveType] = useState<TaxonomyType>('TARGET_AUDIENCE');
  const [items, setItems] = useState<PortalTaxonomyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PortalTaxonomyItem> | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadTaxonomies();
  }, [activeType]);

  const loadTaxonomies = async () => {
    setIsLoading(true);
    try {
      const res = await portalService.getTaxonomies(activeType);
      if (res.data) {
        setItems(res.data);
      }
    } catch (err) {
      console.error('Error loading taxonomies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenModal = (item?: PortalTaxonomyItem) => {
    if (item) {
      setEditingItem({ ...item });
    } else {
      setEditingItem({
        type: activeType,
        code: '',
        name: '',
        description: '',
        iconName: activeType === 'TARGET_AUDIENCE' ? 'school' : 'menu_book',
        sortOrder: items.length + 1,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name || !editingItem.code) {
      showToast('Vui lòng nhập đầy đủ mã và tên phân loại.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await portalService.saveTaxonomy(editingItem);
      if (res.success) {
        showToast(editingItem.id ? 'Cập nhật phân loại thành công!' : 'Thêm mới phân loại thành công!', 'success');
        setIsModalOpen(false);
        setEditingItem(null);
        await loadTaxonomies();
      } else {
        showToast(res.message || 'Lỗi khi lưu phân loại.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối máy chủ.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phân loại "${name}" không?`)) return;

    try {
      const res = await portalService.deleteTaxonomy(id);
      if (res.success) {
        showToast('Xóa phân loại thành công!', 'success');
        await loadTaxonomies();
      } else {
        showToast(res.message || 'Không thể xóa phân loại này.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa phân loại.', 'error');
    }
  };

  const handleToggleActive = async (item: PortalTaxonomyItem) => {
    try {
      await portalService.saveTaxonomy({ id: item.id, isActive: !item.isActive });
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, isActive: !x.isActive } : x)));
      showToast(`Đã ${!item.isActive ? 'kích hoạt' : 'ẩn'} "${item.name}" trên App.`, 'success');
    } catch (err) {
      showToast('Lỗi thay đổi trạng thái.', 'error');
    }
  };

  const handleMoveOrder = async (item: PortalTaxonomyItem, direction: 'UP' | 'DOWN') => {
    const currentIndex = items.findIndex((x) => x.id === item.id);
    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const targetItem = items[targetIndex];
    const currentOrder = item.sortOrder;
    const targetOrder = targetItem.sortOrder;

    try {
      await Promise.all([
        portalService.saveTaxonomy({ id: item.id, sortOrder: targetOrder }),
        portalService.saveTaxonomy({ id: targetItem.id, sortOrder: currentOrder }),
      ]);
      await loadTaxonomies();
    } catch (err) {
      showToast('Lỗi thay đổi thứ tự.', 'error');
    }
  };

  const getIconComponent = (iconId?: string) => {
    const match = AVAILABLE_ICONS.find((x) => x.id === iconId);
    return match ? match.icon : Tag;
  };

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

      {/* Header and Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#FAF0E4] text-[#985018]">
              <Tag className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-[#2C241E]">Danh mục Đối tượng & Nhu cầu Master</h3>
          </div>
          <p className="text-xs text-[#73675F]">
            Quản trị các nhóm đối tượng học viên và nhu cầu để đồng bộ lên Bộ lọc Trang chủ B01, Đào tạo E01, Form Đăng ký E05 và Trình tạo Khóa học.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{activeType === 'TARGET_AUDIENCE' ? '+ Thêm Đối tượng' : '+ Thêm Nhu cầu'}</span>
        </button>
      </div>

      {/* Sub-tabs Selector */}
      <div className="flex items-center gap-2 border-b border-[#E8DFD8] pb-1">
        <button
          type="button"
          onClick={() => setActiveType('TARGET_AUDIENCE')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeType === 'TARGET_AUDIENCE'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#2C241E]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>1. Đối tượng Học viên & Khách hàng</span>
          <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-md text-[10px]">
            {activeType === 'TARGET_AUDIENCE' ? items.length : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveType('TARGET_NEED')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeType === 'TARGET_NEED'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#2C241E]'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>2. Nhu cầu Đào tạo & Trị liệu</span>
          <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-md text-[10px]">
            {activeType === 'TARGET_NEED' ? items.length : ''}
          </span>
        </button>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl border border-[#E8DFD8] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-2">
            <Loader2 className="w-6 h-6 text-[#985018] animate-spin" />
            <span className="text-xs text-[#73675F]">Đang tải danh mục...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center p-12 space-y-2">
            <Tag className="w-8 h-8 mx-auto text-[#A89F91]" />
            <p className="text-xs font-semibold text-[#2C241E]">Chưa có phân loại nào trong nhóm này</p>
            <p className="text-[11px] text-[#73675F]">Bấm nút "+ Thêm" phía trên để tạo mục đầu tiên.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2C241E]">
              <thead className="bg-[#FAF8F5] text-[#73675F] border-b border-[#E8DFD8] text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Tên phân loại & Biểu tượng</th>
                  <th className="py-3 px-4">Mã hệ thống (Code)</th>
                  <th className="py-3 px-4">Mô tả trên App (Subtitle)</th>
                  <th className="py-3 px-4 text-center">Thứ tự</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE4D9]">
                {items.map((item, idx) => {
                  const IconComp = getIconComponent(item.iconName);
                  return (
                    <tr key={item.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3.5 px-4 text-center text-[#73675F] font-semibold">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#FAF0E4] text-[#985018] flex items-center justify-center shrink-0">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[#2C241E]">{item.name}</div>
                            <div className="text-[10px] text-[#73675F]">Icon: {item.iconName || 'person'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[#FAF0E4] text-[#985018] font-mono font-bold text-[10px]">
                          {item.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <p className="text-xs text-[#73675F] line-clamp-2">{item.description || '—'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-[#FAF8F5] px-2 py-1 rounded-lg border border-[#E8DFD8]">
                          <span className="font-bold text-xs">{item.sortOrder}</span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveOrder(item, 'UP')}
                              className="text-slate-400 hover:text-[#985018] disabled:opacity-20 cursor-pointer"
                              title="Tăng thứ tự"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === items.length - 1}
                              onClick={() => handleMoveOrder(item, 'DOWN')}
                              className="text-slate-400 hover:text-[#985018] disabled:opacity-20 cursor-pointer"
                              title="Giảm thứ tự"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                            item.isActive
                              ? 'bg-[#ECFDF5] text-[#065F46] border border-[#10B981]/30 hover:bg-[#D1FAE5]'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {item.isActive ? 'Đang hiển thị' : 'Đã ẩn'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(item)}
                            className="p-1.5 text-slate-500 hover:text-[#985018] hover:bg-[#FAF0E4] rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa mục này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Taxonomy */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E8DFD8] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E8DFD8] bg-[#FAF8F5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#FAF0E4] text-[#985018]">
                  <Tag className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-[#2C241E]">
                  {editingItem.id ? 'Chỉnh sửa Phân loại' : 'Thêm mới Phân loại'}
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
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Nhóm phân loại
                </label>
                <select
                  value={editingItem.type}
                  onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as TaxonomyType })}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                >
                  <option value="TARGET_AUDIENCE">Đối tượng học viên & Khách hàng</option>
                  <option value="TARGET_NEED">Nhu cầu đào tạo & Trị liệu</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">
                    Tên hiển thị <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    placeholder="VD: Người mới bắt đầu"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">
                    Mã hệ thống (Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.code || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    placeholder="VD: BEGINNER"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Mô tả chi tiết (Phụ đề thẻ hiển thị trên App Mobile)
                </label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="VD: Chưa có kinh nghiệm, muốn học kiến thức nền tảng và tự chăm sóc cơ bản..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] resize-none"
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Chọn biểu tượng (Icon)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 border border-[#E8DFD8] rounded-xl">
                  {AVAILABLE_ICONS.map((ic) => {
                    const IconC = ic.icon;
                    const isSelected = editingItem.iconName === ic.id;
                    return (
                      <button
                        type="button"
                        key={ic.id}
                        onClick={() => setEditingItem({ ...editingItem, iconName: ic.id })}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FAF0E4] border-[#985018] text-[#985018] shadow-xs ring-1 ring-[#985018]'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <IconC className="w-4 h-4" />
                        <span className="text-[9px] font-semibold truncate w-full text-center">{ic.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 items-center pt-1">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min="1"
                    value={editingItem.sortOrder || 1}
                    onChange={(e) => setEditingItem({ ...editingItem, sortOrder: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="modalTaxonomyActive"
                    checked={editingItem.isActive}
                    onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#985018] rounded cursor-pointer"
                  />
                  <label htmlFor="modalTaxonomyActive" className="text-xs font-bold text-[#2C241E] cursor-pointer">
                    Kích hoạt trên App
                  </label>
                </div>
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
                  <span>{editingItem.id ? 'Cập nhật' : 'Thêm mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
