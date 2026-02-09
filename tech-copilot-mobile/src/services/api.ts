import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Update this to your backend URL
// Production backend URL
const API_BASE_URL = 'https://backend-production-32f0.up.railway.app';
// const API_BASE_URL = 'http://10.0.2.2:8000'; // Android emulator
// const API_BASE_URL = 'http://localhost:8000'; // iOS simulator

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 180000, // 3 minutes for multi-source AI searches
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth functions
export const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    await SecureStore.setItemAsync('accessToken', response.data.access_token);
    return response.data;
};

export const register = async (
    username: string,
    email: string,
    password: string,
    fullName?: string
) => {
    const response = await api.post('/auth/register', {
        username,
        email,
        password,
        full_name: fullName,
    });
    return response.data;
};

export const logout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
};

export const getCurrentUser = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

// Troubleshooting functions
export const troubleshoot = async (
    manufacturer: string,
    model: string,
    errorCode?: string,
    symptom?: string,
    modelId?: string
) => {
    const response = await api.post('/troubleshoot', {
        equipment: { manufacturer, model },
        error_code: errorCode,
        symptom: symptom,
        model_id: modelId || 'claude-sonnet-4-5',
    });
    return response.data;
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

    const response = await api.get(`/manuals?${params.toString()}`);
    return response.data;
};

export const getManual = async (manualId: number) => {
    const response = await api.get(`/manuals/${manualId}`);
    return response.data;
};

export const searchManual = async (
    manufacturer: string,
    model: string,
    manualType: string = 'service'
) => {
    const response = await api.post('/manuals/search', null, {
        params: { manufacturer, model, manual_type: manualType },
    });
    return response.data;
};

// System functions
export const getHealth = async () => {
    const response = await api.get('/health');
    return response.data;
};

export const getStats = async () => {
    const response = await api.get('/stats');
    return response.data;
};

export default api;
