import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Create axios instance with default configuration
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            { refreshToken }
          );

          const { accessToken } = response.data.data.tokens;
          localStorage.setItem('accessToken', accessToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post<ApiResponse>('/auth/login', credentials),

  register: (userData: any) =>
    api.post<ApiResponse>('/auth/register', userData),

  refreshToken: (refreshToken: string) =>
    api.post<ApiResponse>('/auth/refresh', { refreshToken }),

  getProfile: () =>
    api.get<ApiResponse>('/auth/profile'),

  updateProfile: (userData: any) =>
    api.put<ApiResponse>('/auth/profile', userData),

  changePassword: (passwordData: { currentPassword: string; newPassword: string }) =>
    api.put<ApiResponse>('/auth/change-password', passwordData),

  logout: () =>
    api.post<ApiResponse>('/auth/logout'),
};

// User API
export const userAPI = {
  getUsers: (params?: any) =>
    api.get<ApiResponse>('/users', { params }),

  getUserById: (userId: string) =>
    api.get<ApiResponse>(`/users/${userId}`),

  updateUser: (userId: string, userData: any) =>
    api.put<ApiResponse>(`/users/${userId}`, userData),

  createUser: (userData: any) =>
    api.post<ApiResponse>('/users', userData),

  deactivateUser: (userId: string) =>
    api.delete<ApiResponse>(`/users/${userId}`),

  getUserStats: () =>
    api.get<ApiResponse>('/users/stats/dashboard'),
};

// Attendance API
export const attendanceAPI = {
  getClasses: (params?: any) =>
    api.get<ApiResponse>('/attendance/classes', { params }),

  markAttendance: (attendanceData: any) =>
    api.post<ApiResponse>('/attendance/mark', attendanceData),

  getStudentAttendance: (studentId: string, params?: any) =>
    api.get<ApiResponse>(`/attendance/student/${studentId}`, { params }),

  getClassAttendance: (classId: string, date: string) =>
    api.get<ApiResponse>(`/attendance/class/${classId}/${date}`),
};

// Permission API
export const permissionAPI = {
  getPermissions: (params?: any) =>
    api.get<ApiResponse>('/permissions', { params }),

  createPermission: (permissionData: any) =>
    api.post<ApiResponse>('/permissions', permissionData),

  updatePermissionStatus: (permissionId: string, status: string, remarks?: string) =>
    api.put<ApiResponse>(`/permissions/${permissionId}/approve`, {
      status,
      remarks,
    }),

  uploadPermissionProof: (permissionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse>(`/permissions/${permissionId}/proof`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Club API
export const clubAPI = {
  getClubs: (params?: any) =>
    api.get<ApiResponse>('/clubs', { params }),

  createClub: (clubData: any) =>
    api.post<ApiResponse>('/clubs', clubData),

  getClubById: (clubId: string) =>
    api.get<ApiResponse>(`/clubs/${clubId}`),

  updateClub: (clubId: string, clubData: any) =>
    api.put<ApiResponse>(`/clubs/${clubId}`, clubData),
};

// Event API
export const eventAPI = {
  getEvents: (params?: any) =>
    api.get<ApiResponse>('/events', { params }),

  createEvent: (eventData: any) =>
    api.post<ApiResponse>('/events', eventData),

  getEventById: (eventId: string) =>
    api.get<ApiResponse>(`/events/${eventId}`),

  addEventParticipants: (eventId: string, participants: string[]) =>
    api.post<ApiResponse>(`/events/${eventId}/participants`, {
      participants,
    }),

  getEventParticipants: (eventId: string) =>
    api.get<ApiResponse>(`/events/${eventId}/participants`),
};

// Achievement API
export const achievementAPI = {
  getAchievements: (params?: any) =>
    api.get<ApiResponse>('/achievements', { params }),

  createAchievement: (achievementData: any) =>
    api.post<ApiResponse>('/achievements', achievementData),

  verifyAchievement: (achievementId: string, status: string, remarks?: string) =>
    api.put<ApiResponse>(`/achievements/${achievementId}/verify`, {
      status,
      remarks,
    }),

  exportAchievements: (params: any) =>
    api.get<ApiResponse>('/achievements/export', { params }),
};

// Analytics API
export const analyticsAPI = {
  getAttendanceAnalytics: (params?: any) =>
    api.get<ApiResponse>('/analytics/dashboard/attendance', { params }),

  getPermissionAnalytics: (params?: any) =>
    api.get<ApiResponse>('/analytics/dashboard/permissions', { params }),

  getAchievementAnalytics: (params?: any) =>
    api.get<ApiResponse>('/analytics/dashboard/achievements', { params }),

  exportReport: (params: any) =>
    api.get<ApiResponse>('/analytics/reports/export', { params }),
};

// File API
export const fileAPI = {
  uploadFile: (file: File, type?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (type) {
      formData.append('type', type);
    }
    return api.post<ApiResponse>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  downloadFile: (fileId: string) =>
    api.get(`/files/${fileId}`, {
      responseType: 'blob',
    }),

  deleteFile: (fileId: string) =>
    api.delete<ApiResponse>(`/files/${fileId}`),
};

// Notification API
export const notificationAPI = {
  getNotifications: (params?: any) =>
    api.get<ApiResponse>('/notifications', { params }),

  markAsRead: (notificationId: string) =>
    api.put<ApiResponse>(`/notifications/${notificationId}/read`),

  sendNotification: (notificationData: any) =>
    api.post<ApiResponse>('/notifications/send', notificationData),
};

export default api;