import { Platform } from 'react-native';

const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
const isLocalWeb =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// No navegador da mesma maquina usamos localhost.
// Em celular fisico continuamos usando o IP configurado no .env.
const API_URL = isLocalWeb ? 'http://localhost:3000' : envApiUrl || 'http://10.0.1.108:3000';

export const api = {
  async post(endpoint: string, data: any, token?: string) {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro na requisicao');
    return result;
  },

  async get(endpoint: string, token?: string) {
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro na requisicao');
    return result;
  },

  async put(endpoint: string, data: any, token?: string) {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro na requisicao');
    return result;
  },

  async delete(endpoint: string, token?: string) {
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro na requisicao');
    return result;
  },
};
