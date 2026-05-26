import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface User {
  id: string;
  username: string;
  level: number;
  xp: number;
  streak: number;
  avatar?: string;
  updated_at: string;
  is_admin: boolean;
  topic_scores?: any;
  eula_accepted?: boolean;
  eula_version?: string;
  cookie_preferences?: any;
  last_admin_login?: string;
  admin_notes?: string;
}

export interface UserDetail extends User {
  quizzes: any[];
  sessions: any[];
  completions: any[];
  stats: {
    totalLessonsCompleted: number;
    totalQuizzes: number;
    avgQuizScore: number;
  };
}

export interface UserListResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AnalyticsOverview {
  totalUsers: number;
  newUsersThisMonth: number;
  activeUsersLast7Days: number;
  latestSnapshot: any;
}

class ApiClient {
  public client: AxiosInstance;
  private token: string | null = localStorage.getItem('admin_token');

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Handle 401 responses
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('admin_token', token);
    this.client.defaults.headers.Authorization = `Bearer ${token}`;
  }

  getToken(): string | null {
    return this.token;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('admin_token');
    delete this.client.defaults.headers.Authorization;
  }

  // Authentication
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/admin/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  // User Management
  async getUsers(page: number = 1, limit: number = 20, search: string = '', status: string = 'active'): Promise<UserListResponse> {
    const response = await this.client.get<UserListResponse>('/admin/users', {
      params: { page, limit, search, status },
    });
    return response.data;
  }

  async getUserDetail(userId: string): Promise<UserDetail> {
    const response = await this.client.get<UserDetail>(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUser(userId: string, updates: Partial<User> & { admin_notes?: string }): Promise<User> {
    const response = await this.client.put<User>(`/admin/users/${userId}`, updates);
    return response.data;
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/admin/users/${userId}`);
    return response.data;
  }

  async resetUserProgress(userId: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>(`/admin/users/${userId}/reset-progress`);
    return response.data;
  }

  // Analytics
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const response = await this.client.get<AnalyticsOverview>('/admin/analytics/overview');
    return response.data;
  }

  async generateSnapshot(): Promise<{ message: string; snapshot: any }> {
    const response = await this.client.post('/admin/analytics/snapshot');
    return response.data;
  }
}

export const apiClient = new ApiClient();
