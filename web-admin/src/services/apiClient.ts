import { ApiResponse } from '../types/shared_types';

/**
 * MLD Việt Nam - Web Admin API Client
 * Chuẩn hóa giao tiếp Backend NestJS tuân thủ ApiResponse<T>
 * Lỗi backend được trả về rõ ràng, không thay bằng dữ liệu mô phỏng.
 */

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api/v1';

export class ApiError extends Error {
  statusCode: number;
  data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    try {
      const token = localStorage.getItem('mld_auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Ignore if localStorage unavailable
    }
    return headers;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(
      endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    );
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }
    return url.toString();
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, ...customConfig } = options;
    const url = this.buildUrl(endpoint, params);

    const config: RequestInit = {
      ...customConfig,
      headers: {
        ...this.getAuthHeaders(),
        ...(customConfig.headers || {}),
      },
    };

    try {
      // 5s timeout signal
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      config.signal = controller.signal;

      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new ApiError(
          json.message || `Lỗi yêu cầu máy chủ: ${response.status}`,
          json.statusCode || response.status,
          json.data
        );
      }

      return json as ApiResponse<T>;
    } catch (err: any) {
      throw new ApiError(
        err?.message || 'Không thể kết nối đến máy chủ Backend MLD',
        err?.statusCode || 500
      );
    }
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
