import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dashboard API calls
export const getDashboardStats = async () => {
  try {
    const response = await api.get('/dashboard/stats');
    return response;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

// Leads API calls
export const getLeads = async (filters = {}, page = 1, limit = 100) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    const response = await api.get(`/leads?${params}`);
    return response;
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
};

export const getLeadById = async (id) => {
  try {
    const response = await api.get(`/leads/${id}`);
    return response;
  } catch (error) {
    console.error('Error fetching lead:', error);
    throw error;
  }
};

export const createLead = async (leadData) => {
  try {
    const response = await api.post('/leads', leadData);
    return response;
  } catch (error) {
    console.error('Error creating lead:', error);
    throw error;
  }
};

export const updateLead = async (id, updateData) => {
  try {
    const response = await api.put(`/leads/${id}`, updateData);
    return response;
  } catch (error) {
    console.error('Error updating lead:', error);
    throw error;
  }
};

export const deleteLead = async (id) => {
  try {
    const response = await api.delete(`/leads/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
};

// Lead Prospecting API calls
export const startLeadProspecting = async (prospectingData) => {
  try {
    const response = await api.post('/lead-prospecting/start', prospectingData);
    return response;
  } catch (error) {
    console.error('Error starting lead prospecting:', error);
    throw error;
  }
};

export const getProspectingJob = async (jobId) => {
  try {
    const response = await api.get(`/lead-prospecting/jobs/${jobId}`);
    return response;
  } catch (error) {
    console.error('Error fetching prospecting job:', error);
    throw error;
  }
};

export const getProspectingJobs = async (filters = {}, page = 1, limit = 10) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    const response = await api.get(`/lead-prospecting/jobs?${params}`);
    return response;
  } catch (error) {
    console.error('Error fetching prospecting jobs:', error);
    throw error;
  }
};

export const cancelProspectingJob = async (jobId) => {
  try {
    const response = await api.post(`/lead-prospecting/jobs/${jobId}/cancel`);
    return response;
  } catch (error) {
    console.error('Error cancelling prospecting job:', error);
    throw error;
  }
};

export const getProspectingStats = async (timeRange = '30d') => {
  try {
    const response = await api.get(`/lead-prospecting/stats?timeRange=${timeRange}`);
    return response;
  } catch (error) {
    console.error('Error fetching prospecting stats:', error);
    throw error;
  }
};

// Real-time prospecting progress using Server-Sent Events
export const subscribeToProspectingProgress = (jobId, onProgress, onError, onComplete) => {
  const eventSource = new EventSource(`${API_BASE_URL}/lead-prospecting/progress/${jobId}`);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connected':
          console.log('Connected to prospecting progress stream');
          break;
        case 'progress':
          onProgress(data);
          break;
        case 'completed':
          onComplete(data);
          eventSource.close();
          break;
        case 'error':
          onError(data);
          eventSource.close();
          break;
        default:
          console.log('Unknown event type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing SSE data:', error);
      onError({ message: 'Failed to parse progress data' });
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    onError({ message: 'Connection lost to progress stream' });
    eventSource.close();
  };
  
  // Return cleanup function
  return () => {
    eventSource.close();
  };
};

// Lead status management
export const updateLeadStatus = async (id, status) => {
  try {
    const response = await api.patch(`/leads/${id}/status`, { status });
    return response;
  } catch (error) {
    console.error('Error updating lead status:', error);
    throw error;
  }
};

// Tags and notes
export const addTag = async (leadId, tag) => {
  try {
    const response = await api.post(`/leads/${leadId}/tags`, { tag });
    return response;
  } catch (error) {
    console.error('Error adding tag:', error);
    throw error;
  }
};

export const removeTag = async (leadId, tag) => {
  try {
    const response = await api.delete(`/leads/${leadId}/tags/${tag}`);
    return response;
  } catch (error) {
    console.error('Error removing tag:', error);
    throw error;
  }
};

export const addNote = async (leadId, note) => {
  try {
    const response = await api.post(`/leads/${leadId}/notes`, { note });
    return response;
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
};

export const getNotes = async (leadId) => {
  try {
    const response = await api.get(`/leads/${leadId}/notes`);
    return response;
  } catch (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }
};

// Analytics API calls
export const getAnalytics = async (timeRange = '30d') => {
  try {
    const response = await api.get(`/analytics?timeRange=${timeRange}`);
    return response;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

export const getLeadSources = async (timeRange = '30d') => {
  try {
    const response = await api.get(`/analytics/sources?timeRange=${timeRange}`);
    return response;
  } catch (error) {
    console.error('Error fetching lead sources:', error);
    throw error;
  }
};

export const getIndustryDistribution = async (timeRange = '30d') => {
  try {
    const response = await api.get(`/analytics/industries?timeRange=${timeRange}`);
    return response;
  } catch (error) {
    console.error('Error fetching industry distribution:', error);
    throw error;
  }
};

export const getStatusDistribution = async (timeRange = '30d') => {
  try {
    const response = await api.get(`/analytics/status?timeRange=${timeRange}`);
    return response;
  } catch (error) {
    console.error('Error fetching status distribution:', error);
    throw error;
  }
};

export const getQualityDistribution = async (timeRange = '30d') => {
  try {
    const response = await api.get(`/analytics/quality?timeRange=${timeRange}`);
    return response;
  } catch (error) {
    console.error('Error fetching quality distribution:', error);
    throw error;
  }
};

// Export API calls
export const exportLeads = async (format = 'csv', filters = {}) => {
  try {
    const params = new URLSearchParams({
      format,
      ...filters
    });
    const response = await api.get(`/export/leads?${params}`, {
      responseType: 'blob'
    });
    return response;
  } catch (error) {
    console.error('Error exporting leads:', error);
    throw error;
  }
};

// Search and filtering
export const searchLeads = async (query, filters = {}) => {
  try {
    const params = new URLSearchParams({
      q: query,
      ...filters
    });
    const response = await api.get(`/leads/search?${params}`);
    return response;
  } catch (error) {
    console.error('Error searching leads:', error);
    throw error;
  }
};

export const getLeadFilters = async () => {
  try {
    const response = await api.get('/leads/filters');
    return response;
  } catch (error) {
    console.error('Error fetching lead filters:', error);
    throw error;
  }
};

// Validation and quality
export const validateEmail = async (email) => {
  try {
    const response = await api.post('/validation/email', { email });
    return response;
  } catch (error) {
    console.error('Error validating email:', error);
    throw error;
  }
};

export const getLeadQuality = async (leadId) => {
  try {
    const response = await api.get(`/leads/${leadId}/quality`);
    return response;
  } catch (error) {
    console.error('Error fetching lead quality:', error);
    throw error;
  }
};

// Bulk operations
export const bulkUpdateLeads = async (leadIds, updateData) => {
  try {
    const response = await api.put('/leads/bulk', { leadIds, updateData });
    return response;
  } catch (error) {
    console.error('Error bulk updating leads:', error);
    throw error;
  }
};

export const bulkDeleteLeads = async (leadIds) => {
  try {
    const response = await api.delete('/leads/bulk', { data: { leadIds } });
    return response;
  } catch (error) {
    console.error('Error bulk deleting leads:', error);
    throw error;
  }
};

// Settings API calls
export const getSettings = async () => {
  try {
    const response = await api.get('/settings');
    return response;
  } catch (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }
};

export const updateSettings = async (settings) => {
  try {
    const response = await api.put('/settings', settings);
    return response;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

// Database operations
export const backupDatabase = async () => {
  try {
    const response = await api.post('/database/backup');
    return response;
  } catch (error) {
    console.error('Error backing up database:', error);
    throw error;
  }
};

export const optimizeDatabase = async () => {
  try {
    const response = await api.post('/database/optimize');
    return response;
  } catch (error) {
    console.error('Error optimizing database:', error);
    throw error;
  }
};

export const cleanInvalidData = async () => {
  try {
    const response = await api.post('/database/clean');
    return response;
  } catch (error) {
    console.error('Error cleaning invalid data:', error);
    throw error;
  }
};

// Email Marketing API calls
export const getSMTPCredentials = async () => {
  try {
    const response = await api.get('/email-marketing/smtp');
    return response;
  } catch (error) {
    console.error('Error fetching SMTP credentials:', error);
    throw error;
  }
};

export const createSMTPCredentials = async (credentials) => {
  try {
    const response = await api.post('/email-marketing/smtp', credentials);
    return response;
  } catch (error) {
    console.error('Error creating SMTP credentials:', error);
    throw error;
  }
};

export const updateSMTPCredentials = async (id, credentials) => {
  try {
    const response = await api.put(`/email-marketing/smtp/${id}`, credentials);
    return response;
  } catch (error) {
    console.error('Error updating SMTP credentials:', error);
    throw error;
  }
};

export const deleteSMTPCredentials = async (id) => {
  try {
    const response = await api.delete(`/email-marketing/smtp/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting SMTP credentials:', error);
    throw error;
  }
};

export const getEmailTemplates = async () => {
  try {
    const response = await api.get('/email-marketing/templates');
    return response;
  } catch (error) {
    console.error('Error fetching email templates:', error);
    throw error;
  }
};

export const createEmailTemplate = async (template) => {
  try {
    const response = await api.post('/email-marketing/templates', template);
    return response;
  } catch (error) {
    console.error('Error creating email template:', error);
    throw error;
  }
};

export const updateEmailTemplate = async (id, template) => {
  try {
    const response = await api.put(`/email-marketing/templates/${id}`, template);
    return response;
  } catch (error) {
    console.error('Error updating email template:', error);
    throw error;
  }
};

export const deleteEmailTemplate = async (id) => {
  try {
    const response = await api.delete(`/email-marketing/templates/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting email template:', error);
    throw error;
  }
};

export const getEmailCampaigns = async () => {
  try {
    const response = await api.get('/email-marketing/campaigns');
    return response;
  } catch (error) {
    console.error('Error fetching email campaigns:', error);
    throw error;
  }
};

export const createEmailCampaign = async (campaign) => {
  try {
    const response = await api.post('/email-marketing/campaigns', campaign);
    return response;
  } catch (error) {
    console.error('Error creating email campaign:', error);
    throw error;
  }
};

export const getEmailCampaign = async (id) => {
  try {
    const response = await api.get(`/email-marketing/campaigns/${id}`);
    return response;
  } catch (error) {
    console.error('Error fetching email campaign:', error);
    throw error;
  }
};

export const sendEmailCampaign = async (id, smtpCredentialId) => {
  try {
    const response = await api.post(`/email-marketing/campaigns/${id}/send`, { smtp_credential_id: smtpCredentialId });
    return response;
  } catch (error) {
    console.error('Error sending email campaign:', error);
    throw error;
  }
};

export const resetDailyLimits = async () => {
  try {
    const response = await api.post('/email-marketing/reset-daily-limits');
    return response;
  } catch (error) {
    console.error('Error resetting daily limits:', error);
    throw error;
  }
};

// Error handling utility
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || error.response.data?.error || 'An error occurred';
    return { message, status: error.response.status };
  } else if (error.request) {
    // Request was made but no response received
    return { message: 'No response from server. Please check your connection.', status: 0 };
  } else {
    // Something else happened
    return { message: error.message || 'An unexpected error occurred', status: 0 };
  }
};

export default api;
