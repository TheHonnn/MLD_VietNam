import React from 'react';
import { ArrowLeft, CheckCircle2, Database, Layers, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ModulePlaceholderProps {
  code: string;
  title: string;
  description: string;
  databaseTables: string[];
  keyFeatures: string[];
  samplePayload?: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  code,
  title,
  description,
  databaseTables,
  keyFeatures,
  samplePayload,
}) => {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Module Title Header */}
      <div className="bg-white p-6 rounded-2xl border border-spa-border shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800 border border-brand-200">
              {code}
            </span>
            <span className="text-xs font-semibold text-spa-muted uppercase tracking-wider">
              Phân Hệ Quản Trị
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-spa-dark">{title}</h1>
          <p className="text-xs text-spa-muted mt-1 leading-relaxed max-w-2xl">{description}</p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-spa-border hover:bg-stone-50 text-xs font-bold text-stone-700 transition-all shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Về Tổng Quan (W01)
        </Link>
      </div>

      {/* Grid Features & DB Mapping */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Features Card */}
        <div className="bg-white p-5 rounded-2xl border border-spa-border shadow-card">
          <div className="flex items-center gap-2 mb-3 text-brand-700 font-bold text-xs uppercase tracking-wide">
            <Sparkles className="w-4 h-4" />
            Nghiệp Vụ & Chức Năng Cốt Lõi
          </div>
          <ul className="space-y-2.5">
            {keyFeatures.map((f, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Database Mapping Card */}
        <div className="bg-white p-5 rounded-2xl border border-spa-border shadow-card">
          <div className="flex items-center gap-2 mb-3 text-brand-700 font-bold text-xs uppercase tracking-wide">
            <Database className="w-4 h-4" />
            Ánh Xạ Bảng CSDL (PostgreSQL / shared_types.ts)
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {databaseTables.map((tbl, idx) => (
              <span
                key={idx}
                className="font-mono text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 border border-stone-200"
              >
                {tbl}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-spa-muted leading-relaxed">
            Tuân thủ nguồn chân lý <code>shared_types.ts</code> — Không tự ý gõ tay interface hoặc biến đổi snake_case khi gửi API.
          </p>
        </div>
      </div>

      {/* Sample Payload Contract if provided */}
      {samplePayload && (
        <div className="bg-stone-900 text-stone-200 p-5 rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              MẪU DTO / PAYLOAD HỢP ĐỒNG API (CAMELCASE CHUẨN)
            </div>
            <span className="text-[10px] text-stone-400 font-mono">ApiResponse Envelope</span>
          </div>
          <pre className="text-xs font-mono bg-stone-950 p-4 rounded-xl overflow-x-auto text-emerald-400">
            {samplePayload}
          </pre>
        </div>
      )}
    </div>
  );
};
