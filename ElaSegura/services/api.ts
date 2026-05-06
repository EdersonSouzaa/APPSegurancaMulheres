import Constants from 'expo-constants';

// Em desenvolvimento, o localhost funciona no navegador, 
// mas no celular físico/emulador você precisa do IP da máquina.
// O endereço abaixo é o IP detectado na sua máquina.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.1.108:3000';

export const api = {
  async post(endpoint: string, data: any, token?: string) {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro na requisição');
    return result;
  },

  async get(endpoint: string, token?: string) {
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro na requisição');
    return result;
  }
};
