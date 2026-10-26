import { PortalContentItem, PortalContentKind, PortalContentStatus, DocumentAccessLevel, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

function mapDbToPortalContent(item: any): PortalContentItem {
  return {
    id: item.id,
    kind: (item.kind || 'BANNER').toUpperCase() as PortalContentKind,
    title: item.title || '',
    summary: item.summary || '',
    contentText: item.content_text || '',
    imageUrl: item.image_url || '',
    targetLink: item.target_link || '',
    sortOrder: Number(item.sort_order) || 0,
    downloadCount: Number(item.download_count) || 0,
    isFeatured: Boolean(item.is_featured),
    category: item.category || 'CHUNG',
    accessLevel: (item.access_level || 'PUBLIC') as DocumentAccessLevel,
    fileUrl: item.file_url || '',
    fileSizeBytes: Number(item.file_size_bytes) || 0,
    likesCount: Number(item.likes_count) || 0,
    commentsCount: Number(item.comments_count) || 0,
    status: (item.status || 'DRAFT').toUpperCase() as PortalContentStatus,
    authorName: item.author_name || 'Hệ thống MLD',
    authorAvatar: item.author_avatar || '',
    publishedAt: item.published_at || null,
    createdAt: item.created_at || new Date().toISOString(),
    updatedAt: item.updated_at || new Date().toISOString(),
  };
}

export const portalService = {
  /**
   * Lấy danh sách nội dung portal theo loại (BANNER, DOCUMENT, COMMUNITY) và trạng thái
   */
  async getContentList(params?: {
    kind?: PortalContentKind;
    status?: PortalContentStatus;
    category?: string;
    search?: string;
  }): Promise<ApiResponse<PortalContentItem[]>> {
    try {
      let queryPath = 'miniapp_shared_content?select=*&order=sort_order.asc,created_at.desc';
      
      if (params?.kind) {
        queryPath += `&kind=eq.${params.kind}`;
      }
      if (params?.status) {
        queryPath += `&status=eq.${params.status}`;
      }
      if (params?.category && params.category !== 'ALL') {
        queryPath += `&category=eq.${params.category}`;
      }
      if (params?.search) {
        queryPath += `&title=ilike.*${params.search}*`;
      }

      const raw = await supabaseService.query<any[]>(queryPath);
      if (!raw) {
        return { success: true, statusCode: 200, message: 'Danh sách nội dung portal', data: [] };
      }

      const list: PortalContentItem[] = raw.map(mapDbToPortalContent);
      return { success: true, statusCode: 200, message: 'Tải nội dung portal thành công', data: list };
    } catch (err) {
      console.error('[portalService] getContentList error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi tải nội dung portal', data: [] };
    }
  },

  /**
   * Lấy chi tiết một mục nội dung
   */
  async getContentById(id: string): Promise<ApiResponse<PortalContentItem | null>> {
    try {
      const raw = await supabaseService.query<any[]>(`miniapp_shared_content?id=eq.${id}&select=*`);
      if (!raw || raw.length === 0) {
        return { success: false, statusCode: 404, message: 'Không tìm thấy nội dung', data: null };
      }
      return { success: true, statusCode: 200, message: 'Chi tiết nội dung', data: mapDbToPortalContent(raw[0]) };
    } catch (err) {
      console.error('[portalService] getContentById error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi tải chi tiết nội dung', data: null };
    }
  },

  /**
   * Tạo mới mục nội dung
   */
  async createContent(data: Partial<PortalContentItem>): Promise<ApiResponse<PortalContentItem | null>> {
    try {
      const payload: Record<string, any> = {
        kind: (data.kind || 'BANNER').toUpperCase(),
        title: data.title || '',
        summary: data.summary || '',
        content_text: data.contentText || '',
        image_url: data.imageUrl || null,
        target_link: data.targetLink || null,
        sort_order: Number(data.sortOrder) || 0,
        download_count: Number(data.downloadCount) || 0,
        is_featured: Boolean(data.isFeatured),
        category: data.category || 'CHUNG',
        access_level: data.accessLevel || 'PUBLIC',
        file_url: data.fileUrl || null,
        file_size_bytes: Number(data.fileSizeBytes) || 0,
        likes_count: Number(data.likesCount) || 0,
        comments_count: Number(data.commentsCount) || 0,
        status: (data.status || 'PUBLISHED').toUpperCase(),
        author_name: data.authorName || 'Hệ thống MLD',
        author_avatar: data.authorAvatar || null,
        published_at: data.status === 'PUBLISHED' || data.status === 'APPROVED' ? new Date().toISOString() : null,
      };

      const res = await supabaseService.query<any[]>('miniapp_shared_content', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res || res.length === 0) {
        throw new Error('Không thể thêm nội dung vào Supabase.');
      }

      return {
        success: true,
        statusCode: 201,
        message: 'Tạo nội dung thành công',
        data: mapDbToPortalContent(res[0]),
      };
    } catch (err: any) {
      console.error('[portalService] createContent error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi thêm mới nội dung', data: null };
    }
  },

  /**
   * Cập nhật mục nội dung
   */
  async updateContent(id: string, updates: Partial<PortalContentItem>): Promise<ApiResponse<boolean>> {
    try {
      const payload: Record<string, any> = {};
      if (updates.kind !== undefined) payload.kind = updates.kind.toUpperCase();
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.summary !== undefined) payload.summary = updates.summary;
      if (updates.contentText !== undefined) payload.content_text = updates.contentText;
      if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
      if (updates.targetLink !== undefined) payload.target_link = updates.targetLink;
      if (updates.sortOrder !== undefined) payload.sort_order = Number(updates.sortOrder);
      if (updates.downloadCount !== undefined) payload.download_count = Number(updates.downloadCount);
      if (updates.isFeatured !== undefined) payload.is_featured = Boolean(updates.isFeatured);
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.accessLevel !== undefined) payload.access_level = updates.accessLevel;
      if (updates.fileUrl !== undefined) payload.file_url = updates.fileUrl;
      if (updates.fileSizeBytes !== undefined) payload.file_size_bytes = Number(updates.fileSizeBytes);
      if (updates.likesCount !== undefined) payload.likes_count = Number(updates.likesCount);
      if (updates.commentsCount !== undefined) payload.comments_count = Number(updates.commentsCount);
      if (updates.authorName !== undefined) payload.author_name = updates.authorName;
      if (updates.authorAvatar !== undefined) payload.author_avatar = updates.authorAvatar;
      if (updates.status !== undefined) {
        payload.status = updates.status.toUpperCase();
        if (payload.status === 'PUBLISHED' || payload.status === 'APPROVED') {
          payload.published_at = new Date().toISOString();
        }
      }
      payload.updated_at = new Date().toISOString();

      const res = await supabaseService.query<any>(`miniapp_shared_content?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      return { success: res !== null, statusCode: 200, message: 'Cập nhật thành công', data: true };
    } catch (err: any) {
      console.error('[portalService] updateContent error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi cập nhật nội dung', data: false };
    }
  },

  /**
   * Xóa mục nội dung
   */
  async deleteContent(id: string): Promise<ApiResponse<boolean>> {
    try {
      const res = await supabaseService.query<any>(`miniapp_shared_content?id=eq.${id}`, {
        method: 'DELETE',
      });
      return { success: res !== null, statusCode: 200, message: 'Đã xóa nội dung thành công', data: true };
    } catch (err) {
      console.error('[portalService] deleteContent error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi xóa nội dung', data: false };
    }
  },

  /**
   * Đổi trạng thái kiểm duyệt (Duyệt bài / Từ chối / Xuất bản)
   */
  async setStatus(id: string, status: PortalContentStatus): Promise<ApiResponse<boolean>> {
    return this.updateContent(id, { status });
  },

  /**
   * Đổi trạng thái nổi bật (Featured)
   */
  async toggleFeatured(id: string, isFeatured: boolean): Promise<ApiResponse<boolean>> {
    return this.updateContent(id, { isFeatured });
  },

  /**
   * Thay đổi thứ tự sắp xếp (sort_order)
   */
  async setSortOrder(id: string, sortOrder: number): Promise<ApiResponse<boolean>> {
    return this.updateContent(id, { sortOrder });
  },

  /**
   * Tăng lượt tải tài liệu giáo trình (Download Count)
   */
  async incrementDownloadCount(id: string, currentCount = 0): Promise<ApiResponse<number>> {
    const nextCount = (currentCount || 0) + 1;
    const res = await this.updateContent(id, { downloadCount: nextCount });
    if (res.success) {
      return { success: true, statusCode: 200, message: 'Đã tăng lượt tải', data: nextCount };
    }
    return { success: false, statusCode: 500, message: 'Lỗi cập nhật lượt tải', data: currentCount };
  },

  /**
   * Upload file ảnh hoặc tài liệu PDF trực tiếp lên Supabase Storage
   */
  async uploadFileToStorage(file: File | Blob, nameHint = 'portal_file.pdf'): Promise<string> {
    const ext = nameHint.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'pdf';
    const cleanFileName = `portal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const SUPABASE_URL = 'https://wstvwushpwcdsmhpunvh.supabase.co';
    const KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE';

    let targetBucket = 'services';
    let res = await fetch(`${SUPABASE_URL}/storage/v1/object/${targetBucket}/${cleanFileName}`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!res.ok) {
      targetBucket = 'avatars';
      res = await fetch(`${SUPABASE_URL}/storage/v1/object/${targetBucket}/${cleanFileName}`, {
        method: 'POST',
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });
    }

    if (!res.ok) {
      throw new Error('Không thể tải file lên đám mây Supabase.');
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${targetBucket}/${cleanFileName}`;
  },
};
