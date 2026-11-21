export function escapeCsvCell(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[\s]*[=+@-]|^[\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function buildCsvContent(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return '\uFEFF' + lines.join('\r\n');
}

export function exportCsvWithBom(
  filename: string,
  headers: string[],
  rows: unknown[][],
): void {
  const safeFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  const csvContent = buildCsvContent(headers, rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface PrintableReportOptions {
  title: string;
  subtitle?: string;
  summaryItems?: Array<{ label: string; value: string }>;
  headers: string[];
  rows: unknown[][];
}

export function buildPrintableHtml(options: PrintableReportOptions): string {
  const printedAt = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());

  const summaryHtml = (options.summaryItems || []).length
    ? `<div class="summary">${(options.summaryItems || [])
        .map(
          (item) =>
            `<div class="summary-card"><div class="summary-label">${escapeHtml(item.label)}</div><div class="summary-value">${escapeHtml(item.value)}</div></div>`,
        )
        .join('')}</div>`
    : '';

  const theadHtml = `<tr>${options.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbodyHtml = options.rows.length
    ? options.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
        )
        .join('')
    : `<tr><td colspan="${Math.max(1, options.headers.length)}" class="empty">Không có dữ liệu phù hợp bộ lọc hiện tại.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(options.title)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  body { font-family: "Plus Jakarta Sans", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; line-height: 1.45; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #004890; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 11px; font-weight: 700; color: #004890; text-transform: uppercase; letter-spacing: 0.04em; }
  h1 { font-size: 18px; margin: 4px 0 2px; color: #004890; }
  .subtitle { font-size: 11px; color: #475569; margin: 0; }
  .meta { font-size: 10px; color: #64748b; text-align: right; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 14px; }
  .summary-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; background: #eff6ee; }
  .summary-label { font-size: 10px; color: #475569; font-weight: 600; }
  .summary-value { font-size: 13px; font-weight: 700; color: #004890; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { background: #deeaf6; color: #004890; font-weight: 700; text-align: left; font-size: 10.5px; padding: 7px 8px; border: 1px solid #cbd5e1; }
  td { padding: 6px 8px; border: 1px solid #e2e8f0; vertical-align: top; word-break: break-word; }
  tr:nth-child(even) td { background: #f8fafc; }
  .empty { text-align: center; padding: 18px; color: #64748b; }
  .footer { margin-top: 14px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">MLD Việt Nam · Hệ thống Quản trị</div>
      <h1>${escapeHtml(options.title)}</h1>
      ${options.subtitle ? `<p class="subtitle">${escapeHtml(options.subtitle)}</p>` : ''}
    </div>
    <div class="meta">
      <div>Ngày in: ${escapeHtml(printedAt)}</div>
      <div>Tổng dòng: ${options.rows.length}</div>
    </div>
  </div>
  ${summaryHtml}
  <table>
    <thead>${theadHtml}</thead>
    <tbody>${tbodyHtml}</tbody>
  </table>
  <div class="footer">
    <span>MLD Việt Nam</span>
    <span>Tài liệu đối soát nội bộ</span>
  </div>
</body>
</html>`;
}

export function printStructuredTable(options: PrintableReportOptions): boolean {
  if (typeof document === 'undefined') return false;
  const html = buildPrintableHtml(options);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const cleanup = () => {
    window.setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1000);
  };

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const win = iframe.contentWindow;
  if (!win) {
    cleanup();
    return false;
  }
  win.focus();
  win.print();
  cleanup();
  return true;
}
