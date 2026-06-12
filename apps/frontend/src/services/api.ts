import axios from 'axios';
import type { PostComponent, ComponentRequest, Post, Project, RequestStatus } from '../types';

export type ImportResult = { created: number; reactivated: number; skipped: number; errors: string[] };

const api = axios.create({ baseURL: '/api' });

export const componentsApi = {
  getByQr:   (qrCode: string) =>
    api.get<PostComponent>(`/components/scan/${qrCode}`).then((r) => r.data),
  getByPost: (postId: string) =>
    api.get<PostComponent[]>(`/components/by-post/${postId}`).then((r) => r.data),
};

export const postsApi = {
  list: (params?: { lineId?: string; projectId?: string }) =>
    api.get<Post[]>('/posts', { params }).then((r) => r.data),
};

export const projectsApi = {
  list: () => api.get<Project[]>('/projects').then((r) => r.data),
};

export const requestsApi = {
  list: (params?: {
    status?: RequestStatus;
    postId?: string;
    lineId?: string;
    projectId?: string;
    from?: string;
    to?: string;
  }) => api.get<ComponentRequest[]>('/requests', { params }).then((r) => r.data),

  consumption: (params?: {
    from?: string;
    to?: string;
    postId?: string;
    lineId?: string;
    projectId?: string;
  }) => api.get<ComponentRequest[]>('/requests/consumption', { params }).then((r) => r.data),

  create: (body: { componentId: string; postId: string; notes?: string }) =>
    api.post<ComponentRequest>('/requests', body).then((r) => r.data),

  updateStatus: (id: string, status: RequestStatus, issuedBy?: string, notes?: string) =>
    api.patch<ComponentRequest>(`/requests/${id}/status`, { status, issuedBy, notes }).then((r) => r.data),
};

export const adminApi = {
  listPostComponents: (params?: { postId?: string; lineId?: string; projectId?: string }) =>
    api.get<PostComponent[]>('/admin/post-components', { params }).then((r) => r.data),

  addComponent: (body: { postId: string; reference: string; category: string }) =>
    api.post<PostComponent>('/admin/post-components', body).then((r) => r.data),

  removeComponent: (id: string) =>
    api.delete<PostComponent>(`/admin/post-components/${id}`).then((r) => r.data),

  regenerateQr: (id: string) =>
    api.post<PostComponent>(`/admin/post-components/${id}/regenerate-qr`).then((r) => r.data),

  importExcel: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ImportResult>('/admin/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
