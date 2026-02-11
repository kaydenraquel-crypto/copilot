import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = 'https://backend-production-32f0.up.railway.app';

async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync('accessToken');
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

async function handleResponse<T = any>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export const login = async (username: string, password: string) => {
  const response = await fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const data = await handleResponse<any>(response);
  await SecureStore.setItemAsync('accessToken', data.access_token);
  return data;
};

export const register = async (
  username: string,
  email: string,
  password: string,
  fullName?: string
) => {
  const response = await fetchWithAuth('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email,
      password,
      full_name: fullName,
    }),
  });
  return handleResponse(response);
};

export const logout = async () => {
  await SecureStore.deleteItemAsync('accessToken');
};

export const getCurrentUser = async () => {
  const response = await fetchWithAuth('/auth/me');
  return handleResponse(response);
};

export const troubleshoot = async (
  manufacturer: string,
  model: string,
  errorCode?: string,
  symptom?: string,
  modelId?: string
) => {
  const response = await fetchWithAuth('/troubleshoot', {
    method: 'POST',
    body: JSON.stringify({
      equipment: { manufacturer, model },
      error_code: errorCode,
      symptom,
      model_id: modelId || 'claude-sonnet-4-5',
    }),
  });
  return handleResponse(response);
};

export const getManuals = async (
  manufacturer?: string,
  model?: string,
  equipmentType?: string,
  statusFilter?: string
) => {
  const params = new URLSearchParams();
  if (manufacturer) params.append('brand', manufacturer);
  if (model) params.append('model', model);
  if (equipmentType) params.append('equipment_type', equipmentType);
  if (statusFilter) params.append('status_filter', statusFilter);

  const response = await fetchWithAuth(`/manuals${params.toString() ? `?${params}` : ''}`);
  return handleResponse(response);
};

export const getManual = async (manualId: string | number) => {
  const response = await fetchWithAuth(`/manuals/${manualId}`);
  return handleResponse(response);
};

export const getManualChunks = async (manualId: string | number) => {
  const response = await fetchWithAuth(`/manuals/${manualId}/chunks`);
  return handleResponse(response);
};

export const deleteManual = async (manualId: string | number) => {
  const response = await fetchWithAuth(`/manuals/${manualId}`, { method: 'DELETE' });
  return handleResponse(response);
};

export const uploadManual = async (
  file: { uri: string; name: string; type?: string },
  manufacturer: string,
  model: string,
  manualType: string = 'service',
  pdfVersion?: string,
  serialRange: string = 'All'
) => {
  void pdfVersion;
  void serialRange;
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name || 'manual.pdf',
    type: file.type || 'application/pdf',
  } as any);
  formData.append('brand', manufacturer);
  formData.append('model', model);
  formData.append('equipment_type', manualType);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/manuals/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed: ${response.status}`);
  }

  return response.json();
};

export const searchManual = async (manufacturer: string, model: string): Promise<any> => {
  const response = await getManuals(manufacturer, model);
  const manuals = response?.data?.manuals || [];
  return {
    success: true,
    data: {
      found: manuals.length > 0,
      already_in_library: manuals.length > 0,
      auto_downloaded: false,
      page_count: null,
      source: null,
      download_error: null,
      message: manuals.length > 0
        ? 'Manual exists in indexed library.'
        : 'Manual search endpoint is not available in this build. Upload PDF manually.',
    },
  };
};

export const queryRAG = async (
  question: string,
  equipmentModel: string,
  brand: string,
  topK: number = 5
) => {
  const response = await fetchWithAuth('/query/rag', {
    method: 'POST',
    body: JSON.stringify({
      question,
      equipment_model: equipmentModel,
      brand,
      top_k: topK,
    }),
  });
  return handleResponse(response);
};

export const getManualPdfUrl = (manualId: number | string): string =>
  `${API_BASE_URL}/manuals/${manualId}/pdf`;

export const getHealth = async () => {
  const response = await fetchWithAuth('/health');
  return handleResponse(response);
};

export const getStats = async () => {
  const response = await fetchWithAuth('/stats');
  return handleResponse(response);
};

const api = {
  login,
  register,
  logout,
  getCurrentUser,
  troubleshoot,
  getManuals,
  getManual,
  getManualChunks,
  uploadManual,
  deleteManual,
  searchManual,
  queryRAG,
  getManualPdfUrl,
  getHealth,
  getStats,
};

export default api;
