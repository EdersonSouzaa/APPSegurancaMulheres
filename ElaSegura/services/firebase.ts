import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence existe no build React Native do SDK,
// mas nao e exposto nas tipagens publicas de 'firebase/auth' (firebase 12.x).
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

export const auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
