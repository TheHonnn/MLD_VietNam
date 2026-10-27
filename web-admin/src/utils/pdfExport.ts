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

  const imgData = canvas.toDataURL('image/png', 1.0);
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

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = imgWidth / imgHeight;

  let renderWidth = pdfWidth;
  let renderHeight = pdfWidth / ratio;

  // Căn chỉnh vừa khớp trang
  if (renderHeight > pdfHeight) {
    renderHeight = pdfHeight;
    renderWidth = pdfHeight * ratio;
  }

  const posX = (pdfWidth - renderWidth) / 2;
  const posY = (pdfHeight - renderHeight) / 2;

  pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

  const finalFileName = options.fileName.toLowerCase().endsWith('.pdf')
    ? options.fileName
    : `${options.fileName}.pdf`;

  pdf.save(finalFileName);

  return pdf.output('blob');
}
