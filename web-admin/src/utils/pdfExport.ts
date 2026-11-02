import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExportPdfOptions {
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a5' | [number, number];
  scale?: number;
}

/**
 * Xuất một phần tử HTML thành file PDF nhị phân chất lượng cao và tải về máy.
 */
export async function exportElementToPdf(
  elementOrId: HTMLElement | string,
  options: ExportPdfOptions
): Promise<Blob> {
  const targetElement =
    typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;

  if (!targetElement) {
    throw new Error('Không tìm thấy phần tử HTML để xuất PDF.');
  }

  // Chụp ảnh thẻ HTML với độ nét cao
  const canvas = await html2canvas(targetElement, {
    scale: options.scale || 2.5,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const orientation = options.orientation || 'portrait';
  const format = options.format || 'a4';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const sourcePageHeight = Math.max(1, Math.floor((canvas.width * pdfHeight) / pdfWidth));
  const pageCount = Math.ceil(canvas.height / sourcePageHeight);

  for (let page = 0; page < pageCount; page += 1) {
    const sourceY = page * sourcePageHeight;
    const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    const context = pageCanvas.getContext('2d');
    if (!context) throw new Error('Không thể dựng trang PDF.');
    context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (page > 0) pdf.addPage(format, orientation);
    const renderHeight = (sliceHeight * pdfWidth) / canvas.width;
    pdf.addImage(pageCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, pdfWidth, renderHeight, undefined, 'FAST');
  }

  const finalFileName = options.fileName.toLowerCase().endsWith('.pdf')
    ? options.fileName
    : `${options.fileName}.pdf`;

  pdf.save(finalFileName);

  return pdf.output('blob');
}
