import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Função para detectar o endereço da API automaticamente.
 * Resolve o problema de 'localhost' não funcionar em dispositivos nativos.
 */
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  // Seu IP fixo da máquina Windows (onde o WSL está rodando)
  // Usamos ele como prioridade para garantir que o celular nativo conecte
  const myComputerIp = '192.168.42.125';

  const hostUri = Constants.expoConfig?.hostUri;
  const expoIp = hostUri ? hostUri.split(':')[0] : null;

  // Se o IP do Expo for um túnel (exp.direct), usamos o IP manual
  if (!expoIp || expoIp.includes('exp.direct')) {
    return `http://${myComputerIp}:3000`;
  }

  return `http://${expoIp}:3000`;
};

export const API_URL = getBaseUrl();
console.log('Backend conectado em:', API_URL);
