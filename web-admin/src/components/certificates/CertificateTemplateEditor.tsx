import React, { useMemo, useRef, useState } from 'react';
import { Download, Eye, EyeOff, Printer, RotateCcw, Save, Settings2, X } from 'lucide-react';
import { StudentCertificate } from '../../types/shared_types';
import CertificateDocumentPreview from './CertificateDocumentPreview';
import { exportElementToPdf } from '../../utils/pdfExport';
import { toast } from '../common';

const STORAGE_KEY = 'mld.certificate-template.v2';

const palettes = [
  { name: 'MLD Blue', value: '#0b43a8' },
  { name: 'Teal', value: '#087f8c' },
  { name: 'Navy', value: '#18345b' },
  { name: 'Green', value: '#18734f' },
];

const defaultSettings = {
  organization: 'VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN CÔNG NGHỆ CSSK CỘNG ĐỒNG',
  institute: 'TRUNG TÂM ỨNG DỤNG KHOA HỌC BẠCH HUYẾT VIỆT NAM',
  title: 'CHỨNG NHẬN',
  subtitle: 'HOÀN THÀNH ĐÀO TẠO',
  intro: 'Chứng nhận này xác nhận rằng, học viên:',
  completion: 'Đã hoàn thành xuất sắc chương trình đào tạo:',
  framework: 'thuộc Khung đào tạo số 4 của MLD Việt Nam',
  location: 'Thành phố Hồ Chí Minh',
  footerNotes: [
    'Chứng nhận này xác nhận học viên đã hoàn thành đầy đủ các yêu cầu đào tạo của cấp độ tương ứng theo quy định của chương trình.',
    'Chứng nhận này không đồng nghĩa với việc được phép giảng dạy, đào tạo, cấp chứng nhận hoặc chuyển giao phương pháp Dẫn lưu Bạch huyết Thủ công (MLD) cho người khác.',
    'Quyền giảng dạy và tư cách giảng viên chỉ được công nhận thông qua Chương trình Đào tạo Giảng viên chính thức và phải có sự phê duyệt bằng văn bản từ Hệ thống Đào tạo MLD Việt Nam.',
  ],
  primaryColor: '#0b43a8',
  titleSize: 56,
  showLogo: true,
  showWatermark: true,
  showFooterNotes: true,
};

type TemplateSettings = typeof defaultSettings;
type PrintFields = Pick<StudentCertificate, 'studentName' | 'dateOfBirth' | 'courseTitle' | 'issueDate' | 'signerName' | 'signerTitle'>;

const formatCertificateDate = (value?: string | null) => {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

const readSettings = (): TemplateSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultSettings;
    const parsed = JSON.parse(saved) as Partial<TemplateSettings>;
    return {
      ...defaultSettings,
      ...parsed,
      footerNotes: Array.isArray(parsed.footerNotes)
        ? [...defaultSettings.footerNotes.map((note, index) => parsed.footerNotes?.[index] ?? note)]
        : defaultSettings.footerNotes,
    };
  } catch {
    return defaultSettings;
  }
};

interface CertificateTemplateEditorProps {
  certificate: StudentCertificate;
  templateName?: string;
  isExporting: boolean;
  onClose: () => void;
  onExportingChange: (value: boolean) => void;
  onPrint: () => void;
}

const Field: React.FC<{ label: string; value: string; onChange: (value: string) => void; multiline?: boolean }> = ({
  label,
  value,
  onChange,
  multiline = false,
}) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-semibold text-gray-600">{label}</span>
    {multiline ? (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        className="w-full resize-y rounded-md border border-gray-300 px-2.5 py-2 text-xs leading-relaxed text-gray-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
      />
    ) : (
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-xs text-gray-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
      />
    )}
  </label>
);

export const CertificateTemplateEditor: React.FC<CertificateTemplateEditorProps> = ({
  certificate,
  templateName,
  isExporting,
  onClose,
  onExportingChange,
  onPrint,
}) => {
  const [settings, setSettings] = useState<TemplateSettings>(readSettings);
  const [fields, setFields] = useState<PrintFields>({
    studentName: certificate.studentName,
    dateOfBirth: formatCertificateDate(certificate.dateOfBirth),
    courseTitle: certificate.courseTitle,
    issueDate: formatCertificateDate(certificate.issueDate),
    signerName: certificate.signerName || '',
    signerTitle: certificate.signerTitle || 'GIÁM ĐỐC',
  });
  const [editorOpen, setEditorOpen] = useState(true);
  const [saved, setSaved] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const displayIssueDate = useMemo(() => fields.issueDate || '________________', [fields.issueDate]);

  const updateSettings = <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const updateField = (key: keyof PrintFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  const handleSaveTemplate = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaved(true);
      toast.success('Đã lưu mẫu chứng nhận trên trình duyệt này');
    } catch {
      toast.error('Không thể lưu mẫu chứng nhận', 'Hãy kiểm tra dung lượng lưu trữ của trình duyệt.');
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The in-memory defaults remain available for this print session.
    }
    setSaved(true);
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    try {
      onExportingChange(true);
      await exportElementToPdf(printRef.current, {
        fileName: `GCN_MLD_${certificate.certificateCode}_${(fields.studentName || 'HocVien').replace(/\s+/g, '_')}`,
        orientation: 'portrait',
        format: 'a4',
        scale: 2.5,
      });
      toast.success('Đã tải file PDF chứng nhận', `Số hiệu ${certificate.certificateCode}`);
    } catch (error) {
      console.error('Certificate PDF export error:', error);
      toast.error('Không thể tạo file PDF chứng nhận');
    } finally {
      onExportingChange(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-5">
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        .certificate-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #printable-certificate .certificate-header-org { font-size: clamp(6px, 1.02vw, 10.5px); letter-spacing: -0.015em; white-space: nowrap; }
        #printable-certificate .certificate-header-inst { font-size: clamp(5.5px, 0.95vw, 9.8px); letter-spacing: -0.015em; white-space: nowrap; }
        @media print {
          body * { visibility: hidden !important; }
          #printable-certificate, #printable-certificate * { visibility: visible !important; }
          #printable-certificate { position: fixed !important; inset: 0 auto auto 0 !important; width: 210mm !important; height: 297mm !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          #printable-certificate .certificate-header-org { font-size: 10.5pt !important; letter-spacing: -0.01em !important; }
          #printable-certificate .certificate-header-inst { font-size: 9.8pt !important; letter-spacing: -0.01em !important; }
        }
      `}</style>

      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-[1500px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl sm:min-h-[calc(100vh-40px)]">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700">
              <Settings2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-gray-900">{templateName || 'Mẫu chứng nhận hoàn thành khóa học'}</h2>
              <p className="truncate font-mono text-[11px] text-gray-500">Mã học viên: {certificate.certificateCode}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleDownloadPdf} disabled={isExporting} className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" title="Tải bản xem trước thành PDF A4 dọc">
              <Download className="h-4 w-4" />{isExporting ? 'Đang tạo PDF' : 'Tải PDF'}
            </button>
            <button type="button" onClick={onPrint} className="inline-flex h-9 items-center gap-2 rounded-md bg-sky-700 px-3 text-xs font-semibold text-white hover:bg-sky-800">
              <Printer className="h-4 w-4" />In
            </button>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50" title="Đóng trình chỉnh sửa">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-h-[65vh] overflow-auto bg-gray-100 p-3 sm:p-6" aria-label="Bản xem trước chứng nhận">
            <div className="mx-auto w-full max-w-[590px]">
              <CertificateDocumentPreview
                id="printable-certificate"
                elementRef={printRef}
                settings={settings}
                fields={{
                  studentName: fields.studentName || '',
                  dateOfBirth: fields.dateOfBirth || '',
                  courseTitle: fields.courseTitle || '',
                  certificateCode: certificate.certificateCode,
                  issueDate: displayIssueDate,
                  signerName: fields.signerName || '',
                  signerTitle: fields.signerTitle || '',
                }}
              />
            </div>
          </section>

          <aside className="min-h-0 border-t border-gray-200 bg-white lg:border-l lg:border-t-0" aria-label="Công cụ chỉnh sửa mẫu">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Chỉnh sửa</h3>
                <p className="mt-0.5 text-[11px] text-gray-500">Bản mẫu áp dụng trên trình duyệt này</p>
              </div>
              <button type="button" onClick={() => setEditorOpen((open) => !open)} className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50" title={editorOpen ? 'Thu gọn công cụ' : 'Mở công cụ chỉnh sửa'}>
                {editorOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {editorOpen && <div className="max-h-[56vh] space-y-5 overflow-y-auto p-4 lg:max-h-[calc(100vh-230px)]">
              <section className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase text-gray-500">Thông tin bản in</h4>
                <Field label="Họ và tên học viên" value={fields.studentName} onChange={(value) => updateField('studentName', value)} />
                <Field label="Ngày sinh" value={fields.dateOfBirth || ''} onChange={(value) => updateField('dateOfBirth', value)} />
                <Field label="Tên khóa học" value={fields.courseTitle} onChange={(value) => updateField('courseTitle', value)} multiline />
                <Field label="Ngày cấp" value={fields.issueDate} onChange={(value) => updateField('issueDate', value)} />
                <Field label="Chức danh ký" value={fields.signerTitle || ''} onChange={(value) => updateField('signerTitle', value)} />
                <Field label="Tên người ký" value={fields.signerName || ''} onChange={(value) => updateField('signerName', value)} />
                <p className="text-[10px] leading-relaxed text-gray-500">Các chỉnh sửa này chỉ dùng cho bản in/PDF hiện tại, không thay đổi hồ sơ đã cấp.</p>
              </section>

              <section className="space-y-3 border-t border-gray-200 pt-4">
                <h4 className="text-[11px] font-bold uppercase text-gray-500">Nội dung mẫu</h4>
                <Field label="Tên tổ chức" value={settings.organization} onChange={(value) => updateSettings('organization', value)} multiline />
                <Field label="Tên trung tâm" value={settings.institute} onChange={(value) => updateSettings('institute', value)} multiline />
                <Field label="Tiêu đề" value={settings.title} onChange={(value) => updateSettings('title', value)} />
                <Field label="Dòng phụ đề" value={settings.subtitle} onChange={(value) => updateSettings('subtitle', value)} />
                <Field label="Lời xác nhận học viên" value={settings.intro} onChange={(value) => updateSettings('intro', value)} multiline />
                <Field label="Lời xác nhận hoàn thành" value={settings.completion} onChange={(value) => updateSettings('completion', value)} multiline />
                <Field label="Khung chương trình" value={settings.framework} onChange={(value) => updateSettings('framework', value)} multiline />
                <Field label="Địa điểm cấp" value={settings.location} onChange={(value) => updateSettings('location', value)} />
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-600">Ghi chú cuối chứng nhận</span>
                  {settings.footerNotes.map((note, index) => (
                    <textarea key={index} aria-label={`Ghi chú ${index + 1}`} rows={3} value={note} onChange={(event) => updateSettings('footerNotes', settings.footerNotes.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="w-full resize-y rounded-md border border-gray-300 px-2.5 py-2 text-xs leading-relaxed text-gray-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" />
                  ))}
                </div>
              </section>

              <section className="space-y-3 border-t border-gray-200 pt-4">
                <h4 className="text-[11px] font-bold uppercase text-gray-500">Kiểu trình bày</h4>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-600">Màu chủ đạo</span>
                  <div className="flex items-center gap-2">
                    {palettes.map((palette) => <button key={palette.value} type="button" aria-label={palette.name} aria-pressed={settings.primaryColor === palette.value} onClick={() => updateSettings('primaryColor', palette.value)} className={`h-7 w-7 rounded-full border-2 ${settings.primaryColor === palette.value ? 'border-gray-900 ring-2 ring-gray-200' : 'border-white shadow'}`} style={{ backgroundColor: palette.value }} />)}
                    <input type="color" aria-label="Chọn màu tùy chỉnh" value={settings.primaryColor} onChange={(event) => updateSettings('primaryColor', event.target.value)} className="h-8 w-9 cursor-pointer rounded border border-gray-300 p-0.5" />
                  </div>
                </div>
                <label className="block space-y-1.5">
                  <span className="flex items-center justify-between text-xs font-semibold text-gray-600"><span>Cỡ tiêu đề</span><span>{settings.titleSize}px</span></span>
                  <input type="range" min="36" max="58" step="1" value={settings.titleSize} onChange={(event) => updateSettings('titleSize', Number(event.target.value))} className="w-full accent-sky-700" />
                </label>
                {([
                  ['showLogo', 'Hiện logo MLD'],
                  ['showWatermark', 'Hiện watermark'],
                  ['showFooterNotes', 'Hiện ghi chú cuối trang'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2.5 text-xs font-medium text-gray-700">
                    <input type="checkbox" checked={settings[key]} onChange={(event) => updateSettings(key, event.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-sky-700" />
                    {label}
                  </label>
                ))}
              </section>
            </div>}

            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
              <button type="button" onClick={handleReset} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
                <RotateCcw className="h-3.5 w-3.5" />Mặc định
              </button>
              <button type="button" onClick={handleSaveTemplate} disabled={saved} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-sky-700 px-3 text-xs font-semibold text-white hover:bg-sky-800 disabled:bg-emerald-700">
                <Save className="h-3.5 w-3.5" />{saved ? 'Đã lưu' : 'Lưu mẫu'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CertificateTemplateEditor;
