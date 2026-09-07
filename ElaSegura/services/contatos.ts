import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { toISO, exigirUsuaria } from './firestoreHelpers';
import { comCache, salvarCache } from './cacheOffline';

export type ContatoApp = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  emergencial: boolean;
  created_at: string | null;
};

/** Subcoleção usuarios/{uid}/contatos — privada por Security Rule. */
const colContatos = (uid: string) => collection(db, 'usuarios', uid, 'contatos');

/**
 * Lista os contatos da usuária, mais recentes primeiro.
 *
 * A ordenação é feita em memória de propósito. Com orderBy('createdAt') o
 * Firestore EXCLUI silenciosamente todo documento que não tenha esse campo —
 * e um contato invisível numa tela de emergência é um modo de falha
 * inaceitável. Ordenar aqui garante que todo contato salvo apareça, mesmo que
 * o createdAt esteja ausente ou ainda não tenha resolvido no servidor.
 *
 * O custo é irrelevante: são poucas dezenas de contatos, no máximo.
 *
 * A lista passa pelo cache local em disco. É a consulta em que isso mais
 * importa: sem sinal, é dela que sai para quem o SOS deve ligar, e uma tela de
 * contatos vazia numa emergência é indistinguível de "não tenho ninguém".
 */
export async function listarContatos(): Promise<ContatoApp[]> {
  const user = exigirUsuaria();

  const { dados } = await comCache<ContatoApp[]>(user.uid, 'contatos', async () => {
    const snap = await getDocs(colContatos(user.uid));

    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          user_id: user.uid,
          name: data.name ?? '',
          phone: data.phone ?? '',
          emergencial: data.emergencial ?? false,
          created_at: toISO(data.createdAt),
        };
      })
      .sort((a, b) => {
        // Sem createdAt vai para o fim da lista, nunca some.
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
  });

  return dados;
}

/**
 * Invalida a cópia local depois de criar, editar ou excluir um contato.
 *
 * Sem isso, uma escrita offline ficaria na fila do Firestore enquanto o cache
 * continuaria devolvendo a lista antiga — e a usuária veria o contato que
 * acabou de salvar sumir ao trocar de tela.
 */
async function revalidarCache(uid: string) {
  try {
    const snap = await getDocs(colContatos(uid));
    const lista = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        user_id: uid,
        name: data.name ?? '',
        phone: data.phone ?? '',
        emergencial: data.emergencial ?? false,
        created_at: toISO(data.createdAt),
      };
    });
    await salvarCache(uid, 'contatos', lista);
  } catch {
    // Offline: a próxima leitura com rede reconstrói o cache sozinha.
  }
}

export async function criarContato(
  name: string,
  phone: string,
  emergencial = false
): Promise<ContatoApp> {
  const user = exigirUsuaria();

  if (!name?.trim() || !phone?.trim()) {
    throw new Error('Nome e telefone são obrigatórios.');
  }

  const ref = await addDoc(colContatos(user.uid), {
    name: name.trim(),
    phone: phone.trim(),
    emergencial: !!emergencial,
    createdAt: serverTimestamp(),
  });

  revalidarCache(user.uid);

  return {
    id: ref.id,
    user_id: user.uid,
    name: name.trim(),
    phone: phone.trim(),
    emergencial: !!emergencial,
    // serverTimestamp() ainda não resolveu neste ponto; a tela só precisa
    // de algo ordenável até o próximo refetch.
    created_at: new Date().toISOString(),
  };
}

export async function atualizarContato(
  id: string,
  dados: { name: string; phone: string; emergencial?: boolean }
): Promise<ContatoApp> {
  const user = exigirUsuaria();

  if (!dados.name?.trim() || !dados.phone?.trim()) {
    throw new Error('Nome e telefone são obrigatórios.');
  }

  const ref = doc(colContatos(user.uid), id);
  const antes = await getDoc(ref);
  if (!antes.exists()) {
    throw new Error('Contato não encontrado.');
  }

  await updateDoc(ref, {
    name: dados.name.trim(),
    phone: dados.phone.trim(),
    emergencial: !!dados.emergencial,
  });

  revalidarCache(user.uid);

  return {
    id,
    user_id: user.uid,
    name: dados.name.trim(),
    phone: dados.phone.trim(),
    emergencial: !!dados.emergencial,
    created_at: toISO(antes.data().createdAt),
  };
}

export async function excluirContato(id: string) {
  const user = exigirUsuaria();
  const ref = doc(colContatos(user.uid), id);

  const antes = await getDoc(ref);
  if (!antes.exists()) {
    throw new Error('Contato não encontrado.');
  }

  await deleteDoc(ref);
  revalidarCache(user.uid);

  return { message: 'Contato excluído com sucesso', data: { id } };
}

/** Contatos marcados como emergenciais — usados no disparo do SOS. */
export async function listarContatosEmergenciais(): Promise<ContatoApp[]> {
  const todos = await listarContatos();
  return todos.filter((c) => c.emergencial).slice(0, 20);
}
