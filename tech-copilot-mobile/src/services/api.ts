import * as SecureStore from 'expo-secure-store';

// Production backend URL
const API_BASE_URL = 'https://backend-production-32f0.up.railway.app';

// Helper function to get auth token
async function getAuthToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('accessToken');
}

// Helper function to make authenticated requests
async function fetchWithAuth(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = await getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    return response;
}

// Helper to handle response
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// Auth functions
export const login = async (username: string, password: string) => {
    const response = await fetchWithAuth('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse<{ access_token: string }>(response);
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

// Troubleshooting functions
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
            symptom: symptom,
            model_id: modelId || 'claude-sonnet-4-5',
        }),
    });
    return handleResponse(response);
};

// Manual functions
export const getManuals = async (
    manufacturer?: string,
    model?: string,
    manualType?: string
) => {
    const params = new URLSearchParams();
    if (manufacturer) params.append('manufacturer', manufacturer);
    if (model) params.append('model', model);
    if (manualType) params.append('manual_type', manualType);

    const queryString = params.toString();
    const response = await fetchWithAuth(`/manuals${queryString ? `?${queryString}` : ''}`);
    return handleResponse(response);
};

export const getManual = async (manualId: number) => {
    const response = await fetchWithAuth(`/manuals/${manualId}`);
    return handleResponse(response);
};

export const searchManual = async (
    manufacturer: string,
    model: string,
    manualType: string = 'service'
) => {
    const params = new URLSearchParams({
        manufacturer,
        model,
        manual_type: manualType,
    });
    const response = await fetchWithAuth(`/manuals/search?${params.toString()}`, {
        method: 'POST',
    });
    return handleResponse(response);
};

// System functions
export const getHealth = async () => {
    const response = await fetchWithAuth('/health');
    return handleResponse(response);
};

export const getStats = async () => {
    const response = await fetchWithAuth('/stats');
    return handleResponse(response);
};

// Default export for backwards compatibility
const api = {
    login,
    register,
    logout,
    getCurrentUser,
    troubleshoot,
    getManuals,
    getManual,
    searchManual,
    getHealth,
    getStats,
};

export default api;
