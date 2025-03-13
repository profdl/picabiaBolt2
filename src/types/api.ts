export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  error?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
}

export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiClient {
  request<T>(config: ApiRequestConfig): Promise<ApiResponse<T>>;
  get<T>(url: string, config?: Omit<ApiRequestConfig, 'method' | 'url'>): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'url' | 'data'>): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'url' | 'data'>): Promise<ApiResponse<T>>;
  delete<T>(url: string, config?: Omit<ApiRequestConfig, 'method' | 'url'>): Promise<ApiResponse<T>>;
  patch<T>(url: string, data?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'url' | 'data'>): Promise<ApiResponse<T>>;
} 