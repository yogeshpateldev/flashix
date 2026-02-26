import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
const FRONTEND_BASE = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token and session ID
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("flashix_token");
  const sessionId = localStorage.getItem("flashix_session_id");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Always attach session ID for anonymous requests
  if (!token && sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }

  return config;
});

// Handle token expiry - but don't redirect anonymous users
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem("flashix_token");

      // Only redirect to login if user was authenticated
      if (token) {
        localStorage.removeItem("flashix_token");
        localStorage.removeItem("flashix_user");
        window.location.href = "/login";
      }
      // For anonymous users, just let the error propagate
    }
    return Promise.reject(error);
  }
);

interface ApiFileResponse {
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
  expiresAt: string;
  visibility: string;
  downloadCount: number;
  maxDownloads?: number;
  createdAt: string;
  isExpired: boolean;
}

export interface FileUploadPayload {
  file: File;
  expiration: string;
  visibility: "public" | "private" | "password";
  password?: string;
  downloadLimit?: number;
  expiresInMinutes: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  shortUrl: string;
  expiration: string;
  expiresAt: string;
  visibility: "public" | "private" | "password";
  downloads: number;
  downloadLimit: number | null;
  createdAt: string;
  isExpired: boolean;
}

export const fileService = {
  getFiles: async (): Promise<UploadedFile[]> => {
    try {
      const response = await api.get<{
        data: { files: ApiFileResponse[] };
      }>("/files");
      console.log('API getFiles response:', response.data);
      const files = response.data.data.files;

      return files.map((file: ApiFileResponse) => ({
        id: file.fileId,
        name: file.originalName,
        size: file.size,
        type: file.mimeType,
        // Point to the frontend file details page, not the backend download endpoint
        url: `${FRONTEND_BASE}/file/${file.fileId}`,
        shortUrl: `${FRONTEND_BASE.replace(/https?:\/\//, '')}/f/${file.fileId}`,
        expiration: '24h', // Default, calculate from expiresAt if needed
        expiresAt: file.expiresAt,
        visibility: file.visibility as UploadedFile['visibility'],
        downloads: file.downloadCount,
        downloadLimit: file.maxDownloads || null,
        createdAt: file.createdAt,
        isExpired: file.isExpired,
      }));
    } catch (error) {
      console.error('Failed to fetch files:', error);
      return [];
    }
  },

  getFile: async (id: string): Promise<UploadedFile | undefined> => {
    try {
      const response = await api.get(`/files/${id}`);

      const file = response.data.data.file;

      return {
        id: file.fileId,
        name: file.originalName,
        size: file.size,
        type: file.mimeType,
        // Point to the frontend file details page
        url: `${FRONTEND_BASE}/file/${file.fileId}`,
        shortUrl: `${FRONTEND_BASE.replace(/https?:\/\//, '')}/f/${file.fileId}`,
        expiration: '24h',
        expiresAt: file.expiresAt,
        visibility: file.visibility as UploadedFile['visibility'],
        downloads: file.downloadCount,
        downloadLimit: file.maxDownloads || null,
        createdAt: file.createdAt,
        isExpired: file.isExpired,
      };
    } catch (error) {
      console.error('Failed to fetch file:', error);
      return undefined;
    }
  },

  uploadFile: async (payload: FileUploadPayload): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('visibility', payload.visibility);
    formData.append('expiryHours', String(payload.expiresInMinutes / 60));

    if (payload.password) {
      formData.append('password', payload.password);
    }

    if (payload.downloadLimit) {
      formData.append('maxDownloads', String(payload.downloadLimit));
    }

    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const fileData = response.data.data.file;

    return {
      id: fileData.fileId,
      name: fileData.originalName,
      size: fileData.size,
      type: fileData.mimeType,
      // Point to the frontend file details page
      url: `${FRONTEND_BASE}/file/${fileData.fileId}`,
      shortUrl: `${FRONTEND_BASE.replace(/https?:\/\//, '')}/f/${fileData.fileId}`,
      expiration: payload.expiration,
      expiresAt: fileData.expiresAt,
      visibility: fileData.visibility as UploadedFile['visibility'],
      downloads: fileData.downloadCount,
      downloadLimit: fileData.maxDownloads || null,
      createdAt: fileData.createdAt,
      isExpired: new Date() > new Date(fileData.expiresAt),
    };
  },

  deleteFile: async (id: string): Promise<void> => {
    await api.delete(`/files/${id}`);
  },
};

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post<{
      data: {
        user: { id: string; email: string; role: string };
        accessToken: string;
        refreshToken: string;
      };
    }>("/auth/login", { email, password });
    return {
      token: res.data.data.accessToken,
      user: {
        id: res.data.data.user.id,
        email: res.data.data.user.email,
        name: email.split("@")[0],
        role: res.data.data.user.role
      },
    };
  },

  register: async (name: string, email: string, password: string) => {
    const res = await api.post<{
      data: {
        user: { id: string; email: string; role: string };
        accessToken: string;
        refreshToken: string;
      };
    }>("/auth/register", { name, email, password });
    return {
      token: res.data.data.accessToken,
      user: {
        id: res.data.data.user.id,
        email: res.data.data.user.email,
        name,
        role: res.data.data.user.role
      },
    };
  },
};

export const publicService = {
  getPublicFiles: async (options: {
    page?: number;
    limit?: number;
    sort?: string;
    search?: string;
  }): Promise<{ files: UploadedFile[], pagination: any, stats: any }> => {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.sort) params.append('sort', options.sort);
      if (options.search) params.append('search', options.search);

      const response = await api.get(`/files/public?${params.toString()}`);

      const files = response.data.data.files.map((file: any) => ({
        id: file.fileId,
        name: file.originalName,
        size: file.size,
        type: file.mimeType,
        // Point to the frontend file details page
        url: `${FRONTEND_BASE}/file/${file.fileId}`,
        shortUrl: `${FRONTEND_BASE.replace(/https?:\/\//, '')}/f/${file.fileId}`,
        expiration: '24h',
        expiresAt: file.expiresAt,
        visibility: file.visibility as UploadedFile['visibility'],
        downloads: file.downloadCount,
        downloadLimit: file.maxDownloads || null,
        createdAt: file.createdAt,
        isExpired: new Date() > new Date(file.expiresAt),
      }));

      return {
        files,
        pagination: response.data.data.pagination,
        stats: response.data.data.stats,
      };
    } catch (error) {
      console.error('Failed to fetch public files:', error);
      return { files: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 }, stats: { total: 0, active: 0, expired: 0 } };
    }
  },
};

export default api;
