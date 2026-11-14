import { PortalContentItem } from '../types/shared_types';

export function validatePortalPublication(item: Partial<PortalContentItem>): void {
  if (!['PUBLISHED', 'APPROVED'].includes(item.status || '')) return;
  if (!item.title?.trim()) throw new Error('Nhập tiêu đề trước khi xuất bản.');
  const https = (value?: string) => { try { return new URL(value || '').protocol === 'https:'; } catch { return false; } };
  if (item.kind === 'BANNER') {
    if (!https(item.imageUrl)) throw new Error('Banner cần ảnh HTTPS hợp lệ trước khi hiển thị.');
    if (item.targetLink && !(/^\/(?!\/)[^\s]*$/.test(item.targetLink) || https(item.targetLink))) throw new Error('Liên kết banner phải là đường dẫn trong ứng dụng hoặc HTTPS.');
  }
  if (item.kind === 'DOCUMENT') {
    if (!https(item.fileUrl || item.targetLink)) throw new Error('Tài liệu cần liên kết HTTPS hợp lệ.');
    if (!['PUBLIC', 'MEMBERS_ONLY', 'FREE_TRIAL'].includes(item.accessLevel || '')) throw new Error('Chọn phạm vi truy cập tài liệu trước khi xuất bản.');
  }
  if (item.kind === 'COMMUNITY' && !item.contentText?.trim()) throw new Error('Bài viết cần nội dung trước khi xuất bản.');
}
