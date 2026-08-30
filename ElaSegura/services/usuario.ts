import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { auth, db } from './firebase';
import { toISO, exigirUsuaria } from './firestoreHelpers';

/** Formato snake_case que as telas já esperam (herdado da API Express). */
export type UsuarioApp = {
  id: string;
  name: string;
  email: string;
  profile_picture: string | null;
  notifications_enabled: boolean;
  location_enabled: boolean;
  alert_radius: number;
  created_at: string | null;
};

const refPerfil = (uid: string) => doc(db, 'usuarios', uid);

/**
 * Lê usuarios/{uid}. Se o documento não existir (conta criada antes desta
 * migração, ou criada direto pelo console do Firebase), cria com os padrões.
 */
export async function obterPerfil(): Promise<UsuarioApp> {
  const user = exigirUsuaria();
  const snap = await getDoc(refPerfil(user.uid));

  if (!snap.exists()) {
    const padrao = {
      name: user.displayName ?? '',
      email: user.email ?? '',
      profilePictureUrl: null,
      notificationsEnabled: true,
      locationEnabled: false,
      alertRadius: 5000,
      createdAt: serverTimestamp(),
    };
    await setDoc(refPerfil(user.uid), padrao);
    return {
      id: user.uid,
      name: padrao.name,
      email: padrao.email,
      profile_picture: null,
      notifications_enabled: true,
      location_enabled: false,
      alert_radius: 5000,
      created_at: new Date().toISOString(),
    };
  }

  const d = snap.data();
  return {
    id: user.uid,
    name: d.name ?? user.displayName ?? '',
    email: d.email ?? user.email ?? '',
    profile_picture: d.profilePictureUrl ?? null,
    notifications_enabled: d.notificationsEnabled ?? true,
    location_enabled: d.locationEnabled ?? false,
    alert_radius: d.alertRadius ?? 5000,
    created_at: toISO(d.createdAt),
  };
}

export type ResultadoAtualizarPerfil = {
  name: string;
  email: string;
  /** true quando foi enviado link de confirmação para um novo e-mail de login. */
  emailPendenteConfirmacao?: boolean;
};

/**
 * Atualiza nome e, quando mudou, dispara a troca de e-mail de login.
 *
 * O Firebase não troca o e-mail de autenticação sem confirmação: ele envia um
 * link para o novo endereço e só efetiva depois do clique. Por isso o e-mail
 * retornado continua sendo o atual até a confirmação.
 */
export async function atualizarPerfil(name: string, email: string): Promise<ResultadoAtualizarPerfil> {
  const user = exigirUsuaria();
  const nomeLimpo = name.trim();
  const emailLimpo = email.trim();

  await updateDoc(refPerfil(user.uid), { name: nomeLimpo });
  await updateProfile(user, { displayName: nomeLimpo });

  const emailAtual = user.email ?? '';
  if (emailLimpo && emailLimpo.toLowerCase() !== emailAtual.toLowerCase()) {
    await verifyBeforeUpdateEmail(user, emailLimpo);
    return { name: nomeLimpo, email: emailAtual, emailPendenteConfirmacao: true };
  }

  return { name: nomeLimpo, email: emailAtual };
}

/**
 * Limite prático: um documento do Firestore tem teto rígido de 1 MiB.
 * A tela de perfil usa quality 0.3 com recorte 1:1, o que costuma gerar
 * ~50-150 KB — bem abaixo do teto. O guard existe para falhar com mensagem
 * clara em vez de estourar no servidor.
 */
const LIMITE_FOTO_BYTES = 900_000;

export async function atualizarFoto(dataUrlBase64: string) {
  const user = exigirUsuaria();

  if (dataUrlBase64.length > LIMITE_FOTO_BYTES) {
    throw new Error('A imagem é muito grande. Escolha uma foto menor ou recorte antes de enviar.');
  }

  await updateDoc(refPerfil(user.uid), { profilePictureUrl: dataUrlBase64 });
  return { profile_picture: dataUrlBase64 };
}

const RAIOS_VALIDOS = [500, 1000, 2000, 5000, 10000];

export async function atualizarPreferencias(prefs: {
  notifications_enabled?: boolean;
  location_enabled?: boolean;
  alert_radius?: number;
}) {
  const user = exigirUsuaria();

  if (prefs.alert_radius !== undefined && !RAIOS_VALIDOS.includes(Number(prefs.alert_radius))) {
    throw new Error('Raio de alerta inválido. Use 500, 1000, 2000, 5000 ou 10000.');
  }

  // COALESCE do SQL antigo: só grava o que veio preenchido.
  const patch: Record<string, any> = {};
  if (prefs.notifications_enabled !== undefined) patch.notificationsEnabled = prefs.notifications_enabled;
  if (prefs.location_enabled !== undefined) patch.locationEnabled = prefs.location_enabled;
  if (prefs.alert_radius !== undefined) patch.alertRadius = Number(prefs.alert_radius);

  if (Object.keys(patch).length > 0) {
    await updateDoc(refPerfil(user.uid), patch);
  }

  const atual = await obterPerfil();
  return {
    notifications_enabled: atual.notifications_enabled,
    location_enabled: atual.location_enabled,
    alert_radius: atual.alert_radius,
  };
}

/**
 * Troca de senha com reautenticação.
 *
 * O Firebase exige login recente para operações sensíveis. Como a tela já pede
 * a senha atual, usamos ela para reautenticar — o que também substitui a
 * verificação com bcrypt.compare que existia no backend.
 */
export async function atualizarSenha(currentPassword: string, newPassword: string) {
  const user = exigirUsuaria();

  if (!user.email) {
    throw new Error('Esta conta não tem e-mail associado.');
  }

  const credencial = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credencial);
  await updatePassword(user, newPassword);

  return { message: 'Senha atualizada com sucesso' };
}

export const uidAtual = () => auth.currentUser?.uid ?? null;
