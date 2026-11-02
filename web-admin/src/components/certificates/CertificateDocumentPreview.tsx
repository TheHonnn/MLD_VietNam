import React from 'react';

export interface CertificateDocumentSettings {
  organization: string;
  institute: string;
  title: string;
  subtitle: string;
  intro: string;
  completion: string;
  framework: string;
  location: string;
  footerNotes: string[];
  primaryColor: string;
  titleSize: number;
  showLogo: boolean;
  showWatermark: boolean;
  showFooterNotes: boolean;
}

export interface CertificateDocumentFields {
  studentName: string;
  dateOfBirth: string;
  courseTitle: string;
  certificateCode: string;
  issueDate: string;
  signerName: string;
  signerTitle: string;
}

export const CertificateDocumentPreview: React.FC<{
  fields: CertificateDocumentFields;
  settings: CertificateDocumentSettings;
  elementRef?: React.Ref<HTMLDivElement>;
  id?: string;
}> = ({ fields, settings, elementRef, id }) => (
  <>
    <style>{`
      .certificate-header { background: linear-gradient(180deg, rgba(180,222,248,.82), rgba(255,255,255,.25)); }
      .certificate-footer { isolation: isolate; }
      .certificate-footer::before { content: ''; position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgba(255,255,255,.82), rgba(255,255,255,.04) 42%); }
      .certificate-mountain { position: absolute; inset-inline: -2%; bottom: -1px; z-index: 0; height: 88%; pointer-events: none; filter: blur(1.5px); }
      .certificate-mountain-back { opacity: .72; background: linear-gradient(180deg, #e6f7fb 0%, #a6e0ea 100%); clip-path: polygon(0 28%, 8% 25%, 16% 5%, 23% 12%, 31% 35%, 43% 28%, 54% 7%, 64% 23%, 73% 31%, 82% 10%, 91% 23%, 100% 19%, 100% 100%, 0 100%); }
      .certificate-mountain-mid { opacity: .86; background: linear-gradient(180deg, #8bd6e2 0%, #5caec4 100%); clip-path: polygon(0 47%, 11% 42%, 19% 28%, 30% 45%, 39% 53%, 51% 31%, 62% 48%, 74% 34%, 84% 48%, 95% 37%, 100% 41%, 100% 100%, 0 100%); }
      .certificate-mountain-front { background: linear-gradient(180deg, #4eaa76 0%, #126274 100%); clip-path: polygon(0 72%, 12% 61%, 25% 74%, 38% 57%, 50% 63%, 63% 43%, 76% 58%, 87% 68%, 100% 54%, 100% 100%, 0 100%); }
    `}</style>
    <article
      id={id}
      ref={elementRef}
      className="certificate-sheet relative mx-auto flex aspect-[210/297] w-full flex-col overflow-hidden border border-sky-200 bg-white px-[7.5%] pb-[3.5%] pt-[3.5%] font-sans text-gray-900"
      style={{ '--certificate-primary': settings.primaryColor } as React.CSSProperties}
    >
      {settings.showWatermark && <div className="pointer-events-none absolute inset-x-[8%] top-[24%] flex h-[48%] items-center justify-center opacity-[0.055]" aria-hidden="true"><img src="/logo_mld.png" alt="" className="h-full w-full object-contain" /></div>}
      <div className="certificate-header relative flex items-center gap-[3%] px-1 py-[1.5%]" style={{ color: settings.primaryColor }}>
        {settings.showLogo && <img src="/logo_mld.png" alt="Logo MLD Việt Nam" crossOrigin="anonymous" className="h-auto max-h-12 w-[20%] shrink-0 object-contain object-left" />}
        <div className="min-w-0 flex-1 text-center"><p className="text-[clamp(7px,1.25vw,12px)] font-extrabold leading-tight">{settings.organization}</p><p className="mt-0.5 text-[clamp(7px,1.2vw,11px)] font-bold leading-tight">{settings.institute}</p></div>
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
        <p>Mã học viên: <strong>{fields.certificateCode || 'MLD-GCN-2026-XXXX'}</strong></p>
        <p>Ngày cấp: <strong>{fields.issueDate || '__/__/____'}</strong></p>
        <p className="pt-[1%]">{settings.completion}</p>
        <p className="font-extrabold uppercase leading-snug" style={{ color: settings.primaryColor }}>{fields.courseTitle || 'TÊN CHƯƠNG TRÌNH ĐÀO TẠO'} {settings.framework && <span className="font-semibold">{settings.framework}</span>}{settings.location && <span className="font-semibold"> tại {settings.location}.</span>}</p>
      </div>
      <div className="relative mt-[2%] flex min-h-[14%] justify-end pb-[1%] pr-[5%] text-center">
        <div className="w-[42%]"><p className="text-[clamp(10px,1.65vw,14px)] font-extrabold uppercase">{fields.signerTitle || 'GIÁM ĐỐC'}</p><div className="h-[clamp(38px,7vw,60px)]" />{fields.signerName && <p className="text-[clamp(9px,1.5vw,13px)] font-bold">{fields.signerName}</p>}</div>
      </div>
      {settings.showFooterNotes && <footer className="certificate-footer relative -mx-[9.2%] mt-auto min-h-[27%] px-[9.2%] pb-[4%] pt-[5%] text-[clamp(7px,1.2vw,10px)] leading-[1.3] text-gray-900"><div className="certificate-mountain certificate-mountain-back" /><div className="certificate-mountain certificate-mountain-mid" /><div className="certificate-mountain certificate-mountain-front" /><ul className="relative z-10 max-w-[95%] list-disc space-y-[1%] pl-4">{settings.footerNotes.filter(Boolean).map((note, index) => <li key={index}>{note}</li>)}</ul></footer>}
    </article>
  </>
);

export default CertificateDocumentPreview;
