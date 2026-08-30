import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export type PerfilUsuaria = {
  name: string;
  email: string;
  profilePictureUrl: string | null;
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  alertRadius: number;
};

/**
 * Cria a conta no Firebase Auth e o documento de perfil em usuarios/{uid}.
 *
 * createUserWithEmailAndPassword ja deixa a usuaria logada. Como a tela de
 * cadastro mostra "agora e so entrar" e volta para a aba de login, deslogamos
 * no final para o fluxo continuar fazendo sentido.
 */
export async function registrar(name: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

  await updateProfile(cred.user, { displayName: name.trim() });

  await setDoc(doc(db, 'usuarios', cred.user.uid), {
    name: name.trim(),
    email: email.trim(),
    profilePictureUrl: null,
    notificationsEnabled: true,
    locationEnabled: false,
    alertRadius: 5000,
    createdAt: serverTimestamp(),
  });

  await signOut(auth);
  return cred.user;
}

/** Faz login e devolve o usuario do Auth junto do perfil do Firestore. */
export async function entrar(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const snap = await getDoc(doc(db, 'usuarios', cred.user.uid));
  const perfil = snap.exists() ? (snap.data() as PerfilUsuaria) : null;
  return { user: cred.user, perfil };
}

/** Envia o e-mail oficial do Firebase com o link de redefinicao de senha. */
export function recuperarSenha(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function sair() {
  return signOut(auth);
}

export function observarAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export const usuarioAtual = () => auth.currentUser;

/** Traduz os codigos de erro do Firebase Auth para mensagens da usuaria. */
export function mensagemErroAuth(error: any): string {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos';
    case 'auth/invalid-email':
      return 'Digite um e-mail valido (ex: seuemail@dominio.com)';
    case 'auth/email-already-in-use':
      return 'Ja existe uma conta com esse e-mail';
    case 'auth/weak-password':
      return 'A senha precisa ter no minimo 6 caracteres';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    case 'auth/network-request-failed':
      return 'Sem conexao. Verifique sua internet e tente de novo.';
    case 'auth/operation-not-allowed':
      return 'Login por e-mail/senha nao esta habilitado no Firebase.';
    default:
      return 'Nao foi possivel concluir. Tente novamente.';
  }
}
