import React, { useState, useEffect } from 'react';
import {
  FileText,
  Shield,
  Eye,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { LegalPolicyItem } from '../../types/shared_types';
import { portalService } from '../../services';

export const PortalLegalPoliciesTab: React.FC = () => {
  const [policies, setPolicies] = useState<LegalPolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<LegalPolicyItem | null>(null);
  const [editorMode, setEditorMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [isSaving, setIsSaving] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoadError('');
    setIsLoading(true);
    try {
      const res = await portalService.getLegalPolicies();
      if (!res.success) throw new Error(res.message || 'Không tải được dữ liệu.');
      if (res.data && res.data.length > 0) {
        setPolicies(res.data);
        setSelectedPolicy(res.data[0]);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
      console.error('Error loading legal policies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicy) return;

    setIsSaving(true);
    try {
      const res = await portalService.saveLegalPolicy(selectedPolicy);
      if (res.success && res.data) {
        showToast('Cập nhật chính sách pháp lý thành công!', 'success');
        setPolicies((prev) => prev.some(p => p.id === res.data!.id)
          ? prev.map((p) => (p.id === res.data!.id ? res.data! : p))
          : [...prev, res.data!]);
        setSelectedPolicy(res.data);
      } else {
        showToast(res.message || 'Lỗi khi lưu chính sách.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối máy chủ.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSimpleMarkdownPreview = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-3 text-xs leading-relaxed text-[#2C241E]">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-base font-bold text-[#985018] border-b border-[#E8DFD8] pb-1.5 mt-2">
                {trimmed.replace('# ', '')}
              </h1>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-sm font-bold text-[#2C241E] mt-3">
                {trimmed.replace('## ', '')}
              </h2>
            );
          }
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-xs font-bold text-[#985018] mt-2">
                {trimmed.replace('### ', '')}
              </h3>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#985018] mt-1.5 shrink-0" />
                <span className="text-[#73675F]">{trimmed.replace(/^[-•]\s*/, '')}</span>
              </div>
            );
          }
          return (
            <p key={idx} className="text-[#73675F]">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="w-8 h-8 text-[#985018] animate-spin" />
        <span className="text-xs text-[#73675F]">Đang tải văn bản chính sách pháp lý...</span>
      </div>
    );
  }

  if (loadError) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p>{loadError}</p><button className="mt-2 underline" type="button" onClick={loadPolicies}>Thử tải lại</button></div>;

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

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-[#FAF0E4] text-[#985018]">
            <Shield className="w-4 h-4" />
          </span>
          <h3 className="text-base font-bold text-[#2C241E]">Chính sách & Điều khoản Pháp lý (Legal CMS)</h3>
        </div>
        <p className="text-xs text-[#73675F]">
          Soạn thảo và quản lý các văn bản Chính sách bảo mật, Điều khoản dịch vụ và Quy chế hoàn hủy để đồng bộ động lên màn hình Pháp lý trên App Mobile.
        </p>
      </div>

      {/* Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List: 4 cols */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E8DFD8] p-4 shadow-xs space-y-3">
          <div className="text-xs font-bold text-[#73675F] uppercase tracking-wider px-2">
            Danh mục Văn bản Pháp lý ({policies.length})
          </div>

          <div className="space-y-2">
            <button type="button" className="w-full rounded-lg border border-[#E8DFD8] p-3 text-sm text-[#985018]" onClick={() => setSelectedPolicy({ id: '', slug: '', title: '', version: '1.0', contentMarkdown: '', effectiveDate: new Date().toISOString().slice(0, 10), isPublished: false })}>Thêm bản nháp chính sách</button>
            {!policies.length && <p className="px-2 text-xs text-[#73675F]">Chưa có chính sách. Soạn nội dung thực tế và kiểm tra trước khi xuất bản.</p>}
            {policies.map((p) => {
              const isSelected = selectedPolicy?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPolicy(p)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-[#FAF0E4] border-[#985018] ring-1 ring-[#985018] shadow-xs'
                      : 'bg-white border-[#E8DFD8] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#E8DFD8] text-[10px] font-mono font-bold text-[#985018]">
                      {p.slug}
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                        p.isPublished ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.isPublished ? 'v' + p.version : 'Bản nháp'}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-[#2C241E] line-clamp-1">{p.title}</h5>

                  <div className="flex items-center gap-1.5 text-[10px] text-[#73675F]">
                    <Calendar className="w-3 h-3" />
                    <span>Hiệu lực: {p.effectiveDate || '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Editor: 8 cols */}
        {selectedPolicy ? (
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E8DFD8] p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DFD8]">
              <div>
                <h4 className="text-sm font-bold text-[#2C241E]">Chỉnh sửa: {selectedPolicy.title}</h4>
                <label className="block text-xs text-[#73675F]">Mã chính sách
                  <input required pattern="[a-z0-9_-]+" disabled={Boolean(selectedPolicy.id)} className="mt-1 block rounded border p-2" placeholder="privacy_policy" value={selectedPolicy.slug} onChange={e => setSelectedPolicy({ ...selectedPolicy, slug: e.target.value })} />
                </label>
              </div>

              {/* Toggle Editor / Preview Tab */}
              <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8DFD8]">
                <button
                  type="button"
                  onClick={() => setEditorMode('EDIT')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    editorMode === 'EDIT' ? 'bg-[#985018] text-white shadow-xs' : 'text-[#73675F] hover:text-[#2C241E]'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Soạn thảo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('PREVIEW')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    editorMode === 'PREVIEW' ? 'bg-[#985018] text-white shadow-xs' : 'text-[#73675F] hover:text-[#2C241E]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem trước App</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Tiêu đề văn bản</label>
                  <input
                    type="text"
                    required
                    value={selectedPolicy.title}
                    onChange={(e) => setSelectedPolicy({ ...selectedPolicy, title: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Phiên bản (Version)</label>
                  <input
                    type="text"
                    required
                    value={selectedPolicy.version}
                    onChange={(e) => setSelectedPolicy({ ...selectedPolicy, version: e.target.value })}
                    placeholder="1.0"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Ngày hiệu lực</label>
                  <input
                    type="date"
                    value={selectedPolicy.effectiveDate ? selectedPolicy.effectiveDate.slice(0, 10) : ''}
                    onChange={(e) => setSelectedPolicy({ ...selectedPolicy, effectiveDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="policyPublished"
                    checked={selectedPolicy.isPublished}
                    onChange={(e) => setSelectedPolicy({ ...selectedPolicy, isPublished: e.target.checked })}
                    className="w-4 h-4 text-[#985018] rounded cursor-pointer"
                  />
                  <label htmlFor="policyPublished" className="text-xs font-bold text-[#2C241E] cursor-pointer">
                    Xuất bản văn bản này lên App Mobile
                  </label>
                </div>
              </div>

              {/* Editor Mode vs Preview Mode */}
              {editorMode === 'EDIT' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#2C241E]">
                      Nội dung văn bản (Định dạng Markdown)
                    </label>
                    <span className="text-[10px] text-[#73675F]">Hỗ trợ # Tiêu đề, ## Mục con, - Gạch đầu dòng</span>
                  </div>
                  <textarea
                    rows={14}
                    value={selectedPolicy.contentMarkdown}
                    onChange={(e) => setSelectedPolicy({ ...selectedPolicy, contentMarkdown: e.target.value })}
                    className="w-full text-xs p-3.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] font-mono leading-relaxed"
                  />
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E8DFD8] min-h-[300px]">
                  <div className="max-w-[480px] mx-auto bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
                    <div className="text-center pb-3 border-b border-slate-100 mb-4">
                      <div className="text-[10px] text-slate-400">MLD VIỆT NAM • PHÁP LÝ</div>
                      <h3 className="text-sm font-bold text-slate-800 mt-1">{selectedPolicy.title}</h3>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        Phiên bản {selectedPolicy.version} • Cập nhật {selectedPolicy.effectiveDate}
                      </div>
                    </div>
                    {renderSimpleMarkdownPreview(selectedPolicy.contentMarkdown)}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#985018] hover:bg-[#804213] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSaving ? 'Đang lưu văn bản...' : 'Lưu & Xuất bản lên App Mobile'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E8DFD8] p-12 text-center text-xs text-[#73675F]">
            Vui lòng chọn một văn bản pháp lý ở cột bên trái để bắt đầu chỉnh sửa.
          </div>
        )}
      </div>
    </div>
  );
};
