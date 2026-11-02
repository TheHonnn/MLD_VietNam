import React, { useMemo, useRef, useState } from 'react';
import { Download, Eye, EyeOff, Printer, RotateCcw, Save, Settings2, X } from 'lucide-react';
import { StudentCertificate } from '../../types/shared_types';
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
        .certificate-header { background: linear-gradient(180deg, rgba(180,222,248,.82), rgba(255,255,255,.25)); }
        .certificate-footer { isolation: isolate; }
        .certificate-footer::before { content: ''; position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgba(255,255,255,.82), rgba(255,255,255,.04) 42%); }
        .certificate-mountain { position: absolute; inset-inline: -2%; bottom: -1px; z-index: 0; height: 88%; pointer-events: none; filter: blur(1.5px); }
        .certificate-mountain-back { opacity: .72; background: linear-gradient(180deg, #e6f7fb 0%, #a6e0ea 100%); clip-path: polygon(0 28%, 8% 25%, 16% 5%, 23% 12%, 31% 35%, 43% 28%, 54% 7%, 64% 23%, 73% 31%, 82% 10%, 91% 23%, 100% 19%, 100% 100%, 0 100%); }
        .certificate-mountain-mid { opacity: .86; background: linear-gradient(180deg, #8bd6e2 0%, #5caec4 100%); clip-path: polygon(0 47%, 11% 42%, 19% 28%, 30% 45%, 39% 53%, 51% 31%, 62% 48%, 74% 34%, 84% 48%, 95% 37%, 100% 41%, 100% 100%, 0 100%); }
        .certificate-mountain-front { background: linear-gradient(180deg, #4eaa76 0%, #126274 100%); clip-path: polygon(0 72%, 12% 61%, 25% 74%, 38% 57%, 50% 63%, 63% 43%, 76% 58%, 87% 68%, 100% 54%, 100% 100%, 0 100%); }
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
              <article
                id="printable-certificate"
                ref={printRef}
                className="certificate-sheet relative mx-auto flex aspect-[210/297] w-full flex-col overflow-hidden border border-sky-200 bg-white px-[7.5%] pb-[3.5%] pt-[3.5%] font-sans text-gray-900 shadow-xl"
                style={{ '--certificate-primary': settings.primaryColor } as React.CSSProperties}
              >
                {settings.showWatermark && (
                  <div className="pointer-events-none absolute inset-x-[8%] top-[24%] flex h-[48%] items-center justify-center opacity-[0.055]" aria-hidden="true">
                    <img src="/logo_mld.png" alt="" className="h-full w-full object-contain" />
                  </div>
                )}

                <div className="certificate-header relative flex items-center gap-2 sm:gap-3 px-2 py-[1.5%]" style={{ color: settings.primaryColor }}>
                  {settings.showLogo && (
                    <img
                      src="/logo_mld.png"
                      alt="Logo MLD Việt Nam"
                      crossOrigin="anonymous"
                      className="h-auto max-h-11 w-[15%] max-w-[68px] shrink-0 object-contain object-left"
                    />
                  )}
                  <div className="min-w-0 flex-1 text-center">
                    {settings.organization.split('\n').map((line, idx) => (
                      <p
                        key={idx}
                        className="certificate-header-org font-extrabold uppercase leading-tight tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"
                        title={line}
                      >
                        {line.replace(/CỘNG\s+ĐỒNG/g, 'CỘNG\u00A0ĐỒNG')}
                      </p>
                    ))}
                    {settings.institute.split('\n').map((line, idx) => (
                      <p
                        key={idx}
                        className="certificate-header-inst mt-0.5 font-bold uppercase leading-tight tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"
                        title={line}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="relative mt-[3.5%] text-center" style={{ color: settings.primaryColor }}>
                  <h1 className="font-serif font-bold leading-none" style={{ fontSize: `clamp(34px, ${settings.titleSize / 5.9}vw, ${settings.titleSize}px)` }}>{settings.title}</h1>
                  <p className="mt-[1.6%] text-[clamp(10px,1.8vw,16px)] font-extrabold leading-tight">{settings.subtitle}</p>
                  <p className="mx-auto mt-[0.6%] max-w-[95%] text-[clamp(9px,1.6vw,14px)] font-bold uppercase leading-snug">{fields.courseTitle || 'TÊN CHƯƠNG TRÌNH ĐÀO TẠO'}</p>
                </div>

                <div className="relative mt-[6%] space-y-[0.7%] text-left text-[clamp(10px,1.75vw,15px)] font-semibold leading-snug">
                  <p>{settings.intro}</p>
                  <p>Họ và tên: <strong className="font-extrabold uppercase">{fields.studentName || '____________________________'}</strong></p>
                  <p>Ngày sinh: <strong>{fields.dateOfBirth || '__/__/____'}</strong></p>
                  <p>Mã học viên: <strong>{certificate.certificateCode}</strong></p>
                  <p>Ngày cấp: <strong>{displayIssueDate}</strong></p>
                  <p className="pt-[1%]">{settings.completion}</p>
                  <p className="font-extrabold uppercase leading-snug" style={{ color: settings.primaryColor }}>
                    {fields.courseTitle || 'Tên khóa học'} {settings.framework && <span className="font-semibold">{settings.framework}</span>}
                    {settings.location && <span className="font-semibold"> tại {settings.location}.</span>}
                  </p>
                </div>

                <div className="relative mt-[2%] flex min-h-[14%] justify-end pb-[1%] pr-[5%] text-center">
                  <div className="w-[42%]">
                    <p className="text-[clamp(10px,1.65vw,14px)] font-extrabold uppercase">{fields.signerTitle || 'GIÁM ĐỐC'}</p>
                    <div className="h-[clamp(38px,7vw,60px)]" />
                    {fields.signerName && <p className="text-[clamp(9px,1.5vw,13px)] font-bold">{fields.signerName}</p>}
                  </div>
                </div>

                {settings.showFooterNotes && (
                  <footer className="certificate-footer relative -mx-[9.2%] mt-auto min-h-[27%] px-[9.2%] pb-[4%] pt-[5%] text-[clamp(7px,1.2vw,10px)] leading-[1.3] text-gray-900">
                    <div className="certificate-mountain certificate-mountain-back" />
                    <div className="certificate-mountain certificate-mountain-mid" />
                    <div className="certificate-mountain certificate-mountain-front" />
                    <ul className="relative z-10 max-w-[95%] list-disc space-y-[1%] pl-4">
                      {settings.footerNotes.filter(Boolean).map((note, index) => <li key={index}>{note}</li>)}
                    </ul>
                  </footer>
                )}
              </article>
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
