import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { exigirUsuaria } from './firestoreHelpers';
import { listarContatosEmergenciais, type ContatoApp } from './contatos';

export type SosApp = {
  id: string;
  user_id: string;
  location: string | null;
  created_at: string | null;
};

export type ResultadoSos = {
  message: string;
  data: SosApp;
  contatosEmergencia: ContatoApp[];
};

/**
 * Registra o acionamento e devolve os contatos emergenciais da usuária —
 * mesma resposta do POST /sos antigo, que as telas usam para dizer quantas
 * pessoas foram notificadas.
 *
 * Por Security Rule, documentos em /sos não podem ser editados nem apagados:
 * é registro histórico.
 */
export async function acionarSos(location: string | null): Promise<ResultadoSos> {
  const user = exigirUsuaria();

  const ref = await addDoc(collection(db, 'sos'), {
    userId: user.uid,
    userName: user.displayName ?? '',
    location: location ?? null,
    createdAt: serverTimestamp(),
  });

  // Se a leitura dos contatos falhar, o SOS já está gravado — não faz sentido
  // derrubar a operação inteira por causa da lista de notificação.
  let contatos: ContatoApp[] = [];
  try {
    contatos = await listarContatosEmergenciais();
  } catch (e) {
    console.error('SOS registrado, mas falhou ao carregar contatos emergenciais:', e);
  }

  return {
    message: 'SOS acionado com sucesso',
    data: {
      id: ref.id,
      user_id: user.uid,
      location: location ?? null,
      created_at: new Date().toISOString(),
    },
    contatosEmergencia: contatos,
  };
}
