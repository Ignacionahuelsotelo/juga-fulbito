export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: {
    items: T[];
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user_id: string;
}

export interface ApiError {
  detail: string;
}
