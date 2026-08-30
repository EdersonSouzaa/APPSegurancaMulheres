import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Espelha a sessão do Firebase no AsyncStorage.
 *
 * As telas foram escritas contra a API Express e ainda usam duas chaves:
 *
 *   'user'      — nome/foto exibidos sem ida à rede
 *   'userToken' — presença dela é o gate de "está logada?"
 *                 (padrão `const token = ...; if (!token) return;`)
 *
 * O Firebase persiste a sessão sozinho, mas não escreve nessas chaves. Sem
 * este espelho, ao reabrir o app a usuária continuaria autenticada e mesmo
 * assim nenhuma tela carregaria dados. Por isso o listener em _layout.tsx
 * chama estas funções a cada mudança de estado do Auth.
 *
 * Quem autentica de fato é auth.currentUser — 'userToken' é só o marcador
 * que as telas legadas consultam, e some junto com o adaptador api.ts.
 */

const CHAVE_USUARIA = 'user';
const CHAVE_TOKEN = 'userToken';

export async function sincronizarSessao(user: User) {
  let nome = user.displayName ?? '';
  let foto: string | null = null;

  try {
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    if (snap.exists()) {
      const d = snap.data();
      nome = d.name ?? nome;
      foto = d.profilePictureUrl ?? null;
    }
  } catch (e) {
    // Offline ou regra negando: seguimos com o que o Auth já tem em memória.
    console.warn('[session] não foi possível ler o perfil no Firestore:', e);
  }

  const token = await user.getIdToken();

  await AsyncStorage.multiSet([
    [
      CHAVE_USUARIA,
      JSON.stringify({
        id: user.uid,
        name: nome,
        email: user.email,
        profile_picture: foto,
      }),
    ],
    [CHAVE_TOKEN, token],
  ]);
}

export async function limparSessao() {
  await AsyncStorage.multiRemove([
    CHAVE_USUARIA,
    CHAVE_TOKEN,
    // Resquício do backend antigo: a senha em texto puro chegou a ser gravada
    // aqui. Removemos de quem já tinha o app instalado.
    'userPassword',
  ]);
}
