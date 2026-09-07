import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence existe no build React Native do SDK,
// mas nao e exposto nas tipagens publicas de 'firebase/auth' (firebase 12.x).
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  memoryLruGarbageCollector,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

if (!firebaseConfig.apiKey) {
  console.warn(
    '[Firebase] EXPO_PUBLIC_FIREBASE_API_KEY vazia. ' +
    'Confira o arquivo .env e reinicie o Expo com: npx expo start -c'
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth so pode rodar uma vez por app. Em Fast Refresh o modulo
// e reavaliado e a segunda chamada lanca — por isso o fallback em getAuth.
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

/**
 * Cache do Firestore, escolhido por plataforma.
 *
 * Na web existe IndexedDB, então dá para usar o cache persistente do SDK: os
 * documentos sobrevivem ao fechar a aba e as consultas respondem sem rede.
 * `persistentMultipleTabManager` evita o erro de "só uma aba pode ter
 * persistência" quando a usuária abre o app em duas abas.
 *
 * No React Native o SDK JS não tem IndexedDB, e o cache persistente
 * simplesmente não funciona — a promessa falha silenciosamente e as leituras
 * voltam a bater na rede. Lá usamos cache de memória com LRU generoso, que
 * atende o app inteiro enquanto ele estiver aberto, e complementamos com o
 * cache em AsyncStorage de services/cacheOffline.ts, que é quem realmente faz
 * as telas abrirem com conteúdo sem internet.
 *
 * Os dois casos mantêm a fila de escrita offline do próprio Firestore: um SOS
 * ou uma ocorrência criada sem sinal fica pendente e sobe sozinha quando a
 * conexão volta.
 */
function criarFirestore() {
  const cache =
    Platform.OS === 'web'
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : memoryLocalCache({ garbageCollector: memoryLruGarbageCollector({ cacheSizeBytes: 50 * 1024 * 1024 }) });

  try {
    return initializeFirestore(app, { localCache: cache });
  } catch {
    // Fast Refresh reavalia o modulo e initializeFirestore so aceita uma
    // chamada por app — a instancia ja configurada e devolvida por getFirestore.
    return getFirestore(app);
  }
}

export const auth = authInstance;
export const db = criarFirestore();
export const storage = getStorage(app);
export default app;
