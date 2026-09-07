import axios from 'axios';
import { Project, DashboardSummary, AgencyMetrics, DuplicatePair, SystemConfig } from '../types';

const API_BASE = '/api';

export const apiClient = {
  // Dashboard
  getSummary: async (): Promise<DashboardSummary> => {
    const res = await axios.get(`${API_BASE}/dashboard/summary`);
    return res.data.data;
  },

  getTrends: async () => {
    const res = await axios.get(`${API_BASE}/dashboard/trends`);
    return res.data.data;
  },

  getGeography: async () => {
    const res = await axios.get(`${API_BASE}/dashboard/geography`);
    return res.data.data;
  },

  // Projects
  getProjects: async (params?: Record<string, any>): Promise<{ data: Project[]; total: number; total_pages: number }> => {
    const res = await axios.get(`${API_BASE}/projects`, { params });
    return res.data;
  },

  getProjectById: async (id: string): Promise<Project> => {
    const res = await axios.get(`${API_BASE}/projects/${id}`);
    return res.data.data;
  },

  getProjectExplanation: async (id: string) => {
    const res = await axios.get(`${API_BASE}/projects/${id}/explanation`);
    return res.data.data;
  },

  // Duplicates
  getDuplicates: async (): Promise<DuplicatePair[]> => {
    const res = await axios.get(`${API_BASE}/duplicates`);
    return res.data.data;
  },

  // Agencies
  getAgencies: async (): Promise<AgencyMetrics[]> => {
    const res = await axios.get(`${API_BASE}/agencies`);
    return res.data.data;
  },

  // Ingestion & Operations
  uploadCSV: async (file: File, mode: 'replace' | 'append' = 'replace') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    const res = await axios.post(`${API_BASE}/projects/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  reAnalyze: async (): Promise<DashboardSummary> => {
    const res = await axios.post(`${API_BASE}/analyze`);
    return res.data.data;
  },

  resetDemo: async (): Promise<DashboardSummary> => {
    const res = await axios.post(`${API_BASE}/reset-demo`);
    return res.data.data;
  },

  // Config
  getConfig: async (): Promise<SystemConfig> => {
    const res = await axios.get(`${API_BASE}/config`);
    return res.data.data;
  },

  updateConfig: async (config: Partial<SystemConfig>): Promise<SystemConfig> => {
    const res = await axios.post(`${API_BASE}/config`, config);
    return res.data.data;
  },

  resetConfig: async (): Promise<SystemConfig> => {
    const res = await axios.post(`${API_BASE}/config/reset`);
    return res.data.data;
  },

  // AI Assistant Copilot
  queryAssistant: async (query: string) => {
    const res = await axios.post(`${API_BASE}/assistant/query`, { query });
    return res.data.data;
  }
};
