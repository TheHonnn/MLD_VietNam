import {
  PortalContentItem,
  PortalContentKind,
  PortalContentStatus,
  DocumentAccessLevel,
  ApiResponse,
  PortalContacts,
  PortalTaxonomyItem,
  TaxonomyType,
  SupportFaqItem,
  LegalPolicyItem,
} from '../types/shared_types';
import { portalQuery } from './portalQuery';
import { validatePortalPublication } from './portalValidation';
import { getAdminAuthToken, supabase } from './supabaseClient';
import { compressImageFile } from '../utils/imageCompressor';

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
    // Phân quyền chuyên sâu cho Giáo trình & Tài liệu đào tạo MLD
    courseId: item.course_id || null,
    courseTitle: item.courses ? item.courses.title : (item.course_title || undefined),
    allowDownload: item.allow_download !== undefined ? Boolean(item.allow_download) : false,
    requireFullPayment: item.require_full_payment !== undefined ? Boolean(item.require_full_payment) : true,
    allowedRoles: Array.isArray(item.allowed_roles) ? item.allowed_roles : ['STUDENT', 'INSTRUCTOR', 'ADMIN'],
    watermarkText: item.watermark_text || 'MLD ACADEMY - BẢN QUYỀN ĐÀO TẠO',
    publishedAt: item.published_at || null,
    createdAt: item.created_at || new Date().toISOString(),
    updatedAt: item.updated_at || new Date().toISOString(),
  };
}

const DEFAULT_PORTAL_CONTACTS: PortalContacts = {
  id: 'primary_mld_contacts', hotlineSupport: '', hotlineTraining: '', zaloOaUrl: '', messengerUrl: '',
  fanpageUrl: '', tiktokUrl: '', youtubeUrl: '', workingHours: '', headquartersAddress: '', consultationBadgeText: '', updatedAt: '',
};
function mapDbToContacts(row: any): PortalContacts {
  if (!row) return DEFAULT_PORTAL_CONTACTS;
  return {
    id: row.id || 'primary_mld_contacts',
    hotlineSupport: row.hotline_support || DEFAULT_PORTAL_CONTACTS.hotlineSupport,
    hotlineTraining: row.hotline_training || DEFAULT_PORTAL_CONTACTS.hotlineTraining,
    zaloOaUrl: row.zalo_oa_url || DEFAULT_PORTAL_CONTACTS.zaloOaUrl,
    messengerUrl: row.messenger_url || DEFAULT_PORTAL_CONTACTS.messengerUrl,
    fanpageUrl: row.fanpage_url || DEFAULT_PORTAL_CONTACTS.fanpageUrl,
    tiktokUrl: row.tiktok_url || DEFAULT_PORTAL_CONTACTS.tiktokUrl,
    youtubeUrl: row.youtube_url || '',
    workingHours: row.working_hours || DEFAULT_PORTAL_CONTACTS.workingHours,
    headquartersAddress: row.headquarters_address || DEFAULT_PORTAL_CONTACTS.headquartersAddress,
    consultationBadgeText: row.consultation_badge_text || DEFAULT_PORTAL_CONTACTS.consultationBadgeText,
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapDbToTaxonomy(row: any): PortalTaxonomyItem {
  return {
    id: row.id,
    type: row.type as TaxonomyType,
    code: row.code || '',
    name: row.name || '',
    description: row.description || '',
    iconName: row.icon_name || 'person',
    sortOrder: Number(row.sort_order) || 0,
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbToFaq(row: any): SupportFaqItem {
  return {
    id: row.id,
    category: row.category || 'CHUNG',
    question: row.question || '',
    answer: row.answer || '',
    displayOrder: Number(row.display_order) || 0,
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
    createdAt: row.created_at,
  };
}

function mapDbToPolicy(row: any): LegalPolicyItem {
  return {
    id: row.id,
    slug: row.slug || '',
    title: row.title || '',
    version: row.version || '1.0',
    contentMarkdown: row.content_markdown || '',
    effectiveDate: row.effective_date || new Date().toISOString().slice(0, 10),
    isPublished: row.is_published !== undefined ? Boolean(row.is_published) : true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    courseId?: string;
    search?: string;
  }): Promise<ApiResponse<PortalContentItem[]>> {
    try {
      let queryPath = 'miniapp_shared_content?select=*,courses:course_id(id,title)&order=sort_order.asc,created_at.desc';
      
      if (params?.kind) {
        queryPath += `&kind=eq.${params.kind}`;
      }
      if (params?.status) {
        queryPath += `&status=eq.${params.status}`;
      }
      if (params?.category && params.category !== 'ALL') {
        queryPath += `&category=eq.${params.category}`;
      }
      if (params?.courseId && params.courseId !== 'ALL') {
        queryPath += `&course_id=eq.${params.courseId}`;
      }
      if (params?.search) {
        queryPath += `&title=ilike.*${params.search}*`;
      }

      const raw = await portalQuery<any[]>(queryPath);
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
      const raw = await portalQuery<any[]>(`miniapp_shared_content?id=eq.${id}&select=*`);
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
      validatePortalPublication(data);
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
        status: (data.status || 'DRAFT').toUpperCase(),
        author_name: data.authorName || 'Hệ thống MLD',
        author_avatar: data.authorAvatar || null,
        // Phân quyền chuyên sâu cho Giáo trình & Tài liệu đào tạo MLD
        course_id: data.courseId || null,
        allow_download: Boolean(data.allowDownload),
        require_full_payment: data.requireFullPayment !== undefined ? Boolean(data.requireFullPayment) : true,
        allowed_roles: data.allowedRoles || ['STUDENT', 'INSTRUCTOR', 'ADMIN'],
        watermark_text: data.watermarkText || 'MLD ACADEMY - BẢN QUYỀN ĐÀO TẠO',
        attachments: (data as any).attachments || [],

        published_at: data.status === 'PUBLISHED' || data.status === 'APPROVED' ? new Date().toISOString() : null,
      };

      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
      payload.payload_hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');      const res = await portalQuery<any[]>('miniapp_shared_content', {
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
      {
        const current = await this.getContentById(id);
        if (!current.success || !current.data) throw new Error('Không tải được bản hiện tại để kiểm tra xuất bản.');
        validatePortalPublication({ ...current.data, ...updates });
      }
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
      // Phân quyền chuyên sâu cho Giáo trình & Tài liệu đào tạo MLD
      if (updates.courseId !== undefined) payload.course_id = updates.courseId || null;
      if (updates.allowDownload !== undefined) payload.allow_download = Boolean(updates.allowDownload);
      if (updates.requireFullPayment !== undefined) payload.require_full_payment = Boolean(updates.requireFullPayment);
      if (updates.allowedRoles !== undefined) payload.allowed_roles = updates.allowedRoles;
      if (updates.watermarkText !== undefined) payload.watermark_text = updates.watermarkText;
      if (updates.status !== undefined) {
        payload.status = updates.status.toUpperCase();
        if (payload.status === 'PUBLISHED' || payload.status === 'APPROVED') {
          payload.published_at = new Date().toISOString();
        }
      }
      payload.updated_at = new Date().toISOString();

      const res = await portalQuery<any>(`miniapp_shared_content?id=eq.${id}`, {
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
   * Kiểm tra quyền xem / tải giáo trình của học viên qua Supabase RPC
   */
  async checkStudentDocumentAccess(studentId: string, documentId: string): Promise<ApiResponse<{ can_access: boolean; can_download: boolean; reason: string }>> {
    try {
      const { data, error } = await supabase.rpc('fn_check_student_document_access', {
        p_student_id: studentId,
        p_document_id: documentId,
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Kiểm tra quyền truy cập giáo trình',
        data: data || { can_access: false, can_download: false, reason: 'Không có dữ liệu phản hồi' },
      };
    } catch (err: any) {
      console.error('[portalService] checkStudentDocumentAccess error:', err);
      return {
        success: false,
        statusCode: 500,
        message: err.message || 'Lỗi kiểm tra quyền tải giáo trình',
        data: { can_access: false, can_download: false, reason: 'Lỗi hệ thống' },
      };
    }
  },


  /**
   * Xóa mục nội dung
   */
  async deleteContent(id: string): Promise<ApiResponse<boolean>> {
    try {
      const res = await portalQuery<any>(`miniapp_shared_content?id=eq.${id}`, {
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
   * Upload file ảnh hoặc tài liệu PDF với chiến lược 3 lớp:
   * 1. Supabase Storage trực tiếp (nếu bucket khả dụng và quyền hợp lệ)
   * 2. Backend Media API (nếu có cấu hình VITE_API_BASE_URL an toàn, tránh mixed-content trên HTTPS)
   * 3. Báo lỗi rõ ràng nếu chưa lưu được tệp lên máy chủ
   */
  async uploadFileToStorage(file: File | Blob, nameHint = 'portal_file.pdf'): Promise<string> {
    if (!file) throw new Error('Không có tệp tin nào được chọn.');
    if (file.size > 20 * 1024 * 1024) throw new Error('Tệp vượt quá 20 MB. Vui lòng giảm dung lượng trước khi tải lên.');

    // Tự động nén ảnh trước khi tải lên (giảm 95% dung lượng, tránh HTTP 413)
    let uploadPayload = file;

    if (file.type?.startsWith('image/')) {
      try {
        const compressed = await compressImageFile(file, 1200, 0.82);
        uploadPayload = compressed.file;

      } catch (_) {}
    }

    const ext = nameHint.split('.').pop()?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') || 'pdf';
    const isDoc = ['pdf', 'doc', 'docx', 'zip', 'xls', 'xlsx'].includes(ext);
    const cleanHint = nameHint.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniquePath = `portal/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanHint}`;
    const contentType =
      (uploadPayload as any).type ||
      (ext === 'pdf'
        ? 'application/pdf'
        : ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : undefined);

    // Bước 1: Thử tải trực tiếp lên Supabase Storage
    try {
      const bucket = isDoc ? 'documents' : 'avatars';
      const { data, error } = await supabase.storage.from(bucket).upload(uniquePath, uploadPayload, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.warn('[portalService] Supabase Storage upload skipped or failed:', storageErr);
    }

    // Bước 2: Thử gọi Backend API nếu có cấu hình URL hợp lệ (tránh Mixed-Content HTTP trên HTTPS)
    try {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const configuredApiBase = String((import.meta as any).env?.VITE_API_BASE_URL || '').trim();
      const token = getAdminAuthToken();

      const isLocalhost = configuredApiBase.includes('127.0.0.1') || configuredApiBase.includes('localhost');
      const isMixedContent = isHttps && configuredApiBase.startsWith('http://');
      const canCallBackend = Boolean(configuredApiBase && !isMixedContent && !(isHttps && isLocalhost));

      if (canCallBackend && token) {
        const form = new FormData();
        form.append('file', uploadPayload, cleanHint);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(`${configuredApiBase.replace(/\/+$/, '')}/admin/media/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const payload = await response.json().catch(() => null);
        const result = payload?.data || payload;
        if (response.ok && result?.url) {
          return result.url;
        }
      }
    } catch (apiErr) {
      console.warn('[portalService] Backend upload API failed:', apiErr);
    }

    throw new Error('Không tải được tệp lên kho lưu trữ. Vui lòng kiểm tra quyền tải tệp và thử lại; tệp chưa được lưu.');
  },

  // ==========================================
  // 1. THÔNG TIN LIÊN HỆ & MẠNG XÃ HỘI (PORTAL CONTACTS)
  // ==========================================
  async getContacts(): Promise<ApiResponse<PortalContacts>> {
    try {
      const raw = await portalQuery<any[]>('portal_contacts?id=eq.primary_mld_contacts&select=*');
      if (!raw || raw.length === 0) {
        return { success: true, statusCode: 200, message: 'Dữ liệu liên hệ mặc định', data: DEFAULT_PORTAL_CONTACTS };
      }
      return { success: true, statusCode: 200, message: 'Tải thông tin liên hệ thành công', data: mapDbToContacts(raw[0]) };
    } catch (err: any) {
      console.warn('[portalService] getContacts fallback to defaults:', err);
      return { success: false, statusCode: 500, message: err.message || 'Không tải được thông tin liên hệ.', data: DEFAULT_PORTAL_CONTACTS };
    }
  },

  async updateContacts(data: Partial<PortalContacts>): Promise<ApiResponse<PortalContacts>> {
    try {
      const payload: Record<string, any> = {
        id: 'primary_mld_contacts',
        updated_at: new Date().toISOString(),
      };
      if (data.hotlineSupport !== undefined) payload.hotline_support = data.hotlineSupport;
      if (data.hotlineTraining !== undefined) payload.hotline_training = data.hotlineTraining;
      if (data.zaloOaUrl !== undefined) payload.zalo_oa_url = data.zaloOaUrl;
      if (data.messengerUrl !== undefined) payload.messenger_url = data.messengerUrl;
      if (data.fanpageUrl !== undefined) payload.fanpage_url = data.fanpageUrl;
      if (data.tiktokUrl !== undefined) payload.tiktok_url = data.tiktokUrl;
      if (data.youtubeUrl !== undefined) payload.youtube_url = data.youtubeUrl;
      if (data.workingHours !== undefined) payload.working_hours = data.workingHours;
      if (data.headquartersAddress !== undefined) payload.headquarters_address = data.headquartersAddress;
      if (data.consultationBadgeText !== undefined) payload.consultation_badge_text = data.consultationBadgeText;

      const existing = await portalQuery<any[]>('portal_contacts?id=eq.primary_mld_contacts&select=id');
      const res = await portalQuery<any[]>(existing.length ? 'portal_contacts?id=eq.primary_mld_contacts' : 'portal_contacts', {
        method: existing.length ? 'PATCH' : 'POST', body: JSON.stringify(payload),
      });
      return { success: true, statusCode: 200, message: 'Cập nhật thông tin liên hệ thành công', data: mapDbToContacts(res[0]) };
    } catch (err: any) {
      console.error('[portalService] updateContacts error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi cập nhật thông tin liên hệ', data: { ...DEFAULT_PORTAL_CONTACTS, ...data } };
    }
  },

  // ==========================================
  // 2. DANH MỤC ĐỐI TƯỢNG & NHU CẦU (TAXONOMIES)
  // ==========================================
  async getTaxonomies(type?: TaxonomyType): Promise<ApiResponse<PortalTaxonomyItem[]>> {
    try {
      let path = 'portal_taxonomies?select=*&order=sort_order.asc,created_at.asc';
      if (type) {
        path += `&type=eq.${type}`;
      }
      const raw = await portalQuery<any[]>(path);
      if (!raw) {
        return { success: true, statusCode: 200, message: 'Danh sách phân loại', data: [] };
      }
      return { success: true, statusCode: 200, message: 'Tải danh mục thành công', data: raw.map(mapDbToTaxonomy) };
    } catch (err: any) {
      console.error('[portalService] getTaxonomies error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi tải danh mục', data: [] };
    }
  },

  async saveTaxonomy(item: Partial<PortalTaxonomyItem>): Promise<ApiResponse<PortalTaxonomyItem | null>> {
    try {
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (item.type !== undefined) payload.type = item.type;
      if (item.code !== undefined) payload.code = item.code.trim();
      if (item.name !== undefined) payload.name = item.name.trim();
      if (item.description !== undefined) payload.description = item.description.trim();
      if (item.iconName !== undefined) payload.icon_name = item.iconName.trim();
      if (item.sortOrder !== undefined) payload.sort_order = Number(item.sortOrder);
      if (item.isActive !== undefined) payload.is_active = Boolean(item.isActive);

      if (item.id) {
        const res = await portalQuery<any[]>(`portal_taxonomies?id=eq.${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        return { success: true, statusCode: 200, message: 'Cập nhật danh mục thành công', data: res && res[0] ? mapDbToTaxonomy(res[0]) : null };
      } else {
        const res = await portalQuery<any[]>('portal_taxonomies', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return { success: true, statusCode: 201, message: 'Thêm mới danh mục thành công', data: res && res[0] ? mapDbToTaxonomy(res[0]) : null };
      }
    } catch (err: any) {
      console.error('[portalService] saveTaxonomy error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi lưu danh mục', data: null };
    }
  },

  async deleteTaxonomy(id: string): Promise<ApiResponse<boolean>> {
    try {
      await portalQuery<any[]>(`portal_taxonomies?id=eq.${id}`, { method: 'DELETE' });
      return { success: true, statusCode: 200, message: 'Xóa mục danh mục thành công', data: true };
    } catch (err: any) {
      console.error('[portalService] deleteTaxonomy error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi xóa danh mục', data: false };
    }
  },

  // ==========================================
  // 3. HỎI ĐÁP THƯỜNG GẶP (FAQS)
  // ==========================================
  async getFaqs(category?: string): Promise<ApiResponse<SupportFaqItem[]>> {
    try {
      let path = 'support_faqs?select=*&order=display_order.asc,created_at.desc';
      if (category && category !== 'ALL') {
        path += `&category=eq.${category}`;
      }
      const raw = await portalQuery<any[]>(path);
      if (!raw) {
        return { success: true, statusCode: 200, message: 'Danh sách FAQs', data: [] };
      }
      return { success: true, statusCode: 200, message: 'Tải FAQs thành công', data: raw.map(mapDbToFaq) };
    } catch (err: any) {
      console.error('[portalService] getFaqs error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi tải FAQs', data: [] };
    }
  },

  async saveFaq(item: Partial<SupportFaqItem>): Promise<ApiResponse<SupportFaqItem | null>> {
    try {
      if (!item.question?.trim() || !item.answer?.trim()) throw new Error('Nhập đầy đủ câu hỏi và câu trả lời.');
      const payload: Record<string, any> = {};
      if (item.category !== undefined) payload.category = item.category;
      if (item.question !== undefined) payload.question = item.question.trim();
      if (item.answer !== undefined) payload.answer = item.answer.trim();
      if (item.displayOrder !== undefined) payload.display_order = Number(item.displayOrder);
      if (item.isActive !== undefined) payload.is_active = Boolean(item.isActive);

      if (item.id) {
        const res = await portalQuery<any[]>(`support_faqs?id=eq.${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        return { success: true, statusCode: 200, message: 'Cập nhật câu hỏi thành công', data: res && res[0] ? mapDbToFaq(res[0]) : null };
      } else {
        const res = await portalQuery<any[]>('support_faqs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return { success: true, statusCode: 201, message: 'Thêm mới câu hỏi thành công', data: res && res[0] ? mapDbToFaq(res[0]) : null };
      }
    } catch (err: any) {
      console.error('[portalService] saveFaq error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi lưu câu hỏi', data: null };
    }
  },

  async deleteFaq(id: string): Promise<ApiResponse<boolean>> {
    try {
      await portalQuery<any[]>(`support_faqs?id=eq.${id}`, { method: 'DELETE' });
      return { success: true, statusCode: 200, message: 'Xóa câu hỏi thành công', data: true };
    } catch (err: any) {
      console.error('[portalService] deleteFaq error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi xóa câu hỏi', data: false };
    }
  },

  // ==========================================
  // 4. CHÍNH SÁCH & ĐIỀU KHOẢN PHÁP LÝ (LEGAL POLICIES)
  // ==========================================
  async getLegalPolicies(): Promise<ApiResponse<LegalPolicyItem[]>> {
    try {
      const raw = await portalQuery<any[]>('legal_policies?select=*&order=created_at.asc');
      if (!raw) {
        return { success: true, statusCode: 200, message: 'Danh sách chính sách pháp lý', data: [] };
      }
      return { success: true, statusCode: 200, message: 'Tải chính sách pháp lý thành công', data: raw.map(mapDbToPolicy) };
    } catch (err: any) {
      console.error('[portalService] getLegalPolicies error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi tải chính sách pháp lý', data: [] };
    }
  },

  async saveLegalPolicy(item: Partial<LegalPolicyItem>): Promise<ApiResponse<LegalPolicyItem | null>> {
    try {
      if (!item.title?.trim() || !item.slug?.trim() || !item.version?.trim() || !item.contentMarkdown?.trim()) throw new Error('Nhập tiêu đề, mã chính sách, phiên bản và nội dung trước khi lưu.');
      if (item.effectiveDate && !Number.isFinite(Date.parse(item.effectiveDate))) throw new Error('Ngày hiệu lực không hợp lệ.');
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (item.slug !== undefined) payload.slug = item.slug.trim();
      if (item.title !== undefined) payload.title = item.title.trim();
      if (item.version !== undefined) payload.version = item.version.trim();
      if (item.contentMarkdown !== undefined) payload.content_markdown = item.contentMarkdown;
      if (item.effectiveDate !== undefined) payload.effective_date = item.effectiveDate;
      if (item.isPublished !== undefined) payload.is_published = Boolean(item.isPublished);

      if (item.id) {
        const res = await portalQuery<any[]>(`legal_policies?id=eq.${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        return { success: true, statusCode: 200, message: 'Cập nhật chính sách thành công', data: res && res[0] ? mapDbToPolicy(res[0]) : null };
      } else {
        const res = await portalQuery<any[]>('legal_policies', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return { success: true, statusCode: 201, message: 'Thêm mới chính sách thành công', data: res && res[0] ? mapDbToPolicy(res[0]) : null };
      }
    } catch (err: any) {
      console.error('[portalService] saveLegalPolicy error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi lưu chính sách', data: null };
    }
  },
};
