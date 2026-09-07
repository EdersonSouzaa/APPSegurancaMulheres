import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { exigirUsuaria } from './firestoreHelpers';

export type Voto = 'confirma' | 'refuta';

export type PlacarValidacao = {
  confirmacoes: number;
  refutacoes: number;
  /** Voto da usuária logada, ou null se ela ainda não votou. */
  meuVoto: Voto | null;
};

export const PLACAR_VAZIO: PlacarValidacao = { confirmacoes: 0, refutacoes: 0, meuVoto: null };

/**
 * Um relato é considerado contestado quando as contestações superam as
 * confirmações com alguma folga. O piso de 3 votos evita que uma única pessoa
 * mal-intencionada consiga marcar um relato verdadeiro como falso.
 */
export function estaContestado(placar: { confirmacoes: number; refutacoes: number }) {
  return placar.refutacoes >= 3 && placar.refutacoes > placar.confirmacoes * 2;
}

const refValidacao = (ocorrenciaId: string, uid: string) =>
  doc(db, 'ocorrencias', ocorrenciaId, 'validacoes', uid);

/**
 * Registra, troca ou retira o voto da usuária num relato.
 *
 * Tudo acontece numa transação porque duas coisas precisam andar juntas: o
 * documento de voto (que garante uma pessoa, um voto) e os contadores
 * desnormalizados na ocorrência (que evitam N consultas só para desenhar a
 * lista). Se elas se separassem, um erro no meio deixaria o placar mentindo.
 *
 * Votar de novo no mesmo lado retira o voto — é o comportamento que as pessoas
 * já esperam de um botão que fica "aceso" depois de tocado.
 *
 * As Security Rules verificam os mesmos passos do lado do servidor: só
 * aceitam variação de ±1 nos contadores, e só na direção coerente com o voto
 * que já existe (ou com a ausência dele). Ou seja, a integridade do placar não
 * depende deste código estar correto.
 */
export async function votar(ocorrenciaId: string, voto: Voto): Promise<PlacarValidacao> {
  const user = exigirUsuaria();
  const refOcorrencia = doc(db, 'ocorrencias', ocorrenciaId);
  const refVoto = refValidacao(ocorrenciaId, user.uid);

  return runTransaction(db, async (transacao) => {
    const [snapOcorrencia, snapVoto] = await Promise.all([
      transacao.get(refOcorrencia),
      transacao.get(refVoto),
    ]);

    if (!snapOcorrencia.exists()) throw new Error('Ocorrência não encontrada.');
    if (snapOcorrencia.data().userId === user.uid) {
      throw new Error('Você não pode validar o seu próprio relato.');
    }

    const dados = snapOcorrencia.data();
    let confirmacoes = typeof dados.confirmacoes === 'number' ? dados.confirmacoes : 0;
    let refutacoes = typeof dados.refutacoes === 'number' ? dados.refutacoes : 0;

    const anterior: Voto | null = snapVoto.exists() ? snapVoto.data().voto : null;
    let novo: Voto | null;

    if (anterior === voto) {
      novo = null; // tocou de novo no mesmo botão: retira o voto
      if (voto === 'confirma') confirmacoes -= 1;
      else refutacoes -= 1;
    } else {
      novo = voto;
      if (anterior === 'confirma') confirmacoes -= 1;
      if (anterior === 'refuta') refutacoes -= 1;
      if (voto === 'confirma') confirmacoes += 1;
      else refutacoes += 1;
    }

    // Contador nunca fica negativo, mesmo se um documento antigo vier torto.
    confirmacoes = Math.max(0, confirmacoes);
    refutacoes = Math.max(0, refutacoes);

    transacao.update(refOcorrencia, { confirmacoes, refutacoes });

    if (novo === null) {
      transacao.delete(refVoto);
    } else {
      transacao.set(refVoto, {
        userId: user.uid,
        ocorrenciaId,
        voto: novo,
        createdAt: serverTimestamp(),
      });
    }

    return { confirmacoes, refutacoes, meuVoto: novo };
  });
}

/**
 * Todos os votos da usuária logada, de uma vez.
 *
 * Uma consulta de grupo de coleção em vez de um get por ocorrência: a tela de
 * ocorrências mostra dezenas de cards, e ler o voto de cada um separadamente
 * seria dezenas de idas ao servidor só para pintar dois botões.
 *
 * Depende do índice de escopo de grupo em validacoes.userId, declarado em
 * firestore.indexes.json.
 */
export async function meusVotos(): Promise<Record<string, Voto>> {
  const user = exigirUsuaria();

  try {
    const snap = await getDocs(
      query(collectionGroup(db, 'validacoes'), where('userId', '==', user.uid))
    );

    const mapa: Record<string, Voto> = {};
    snap.docs.forEach((d) => {
      const dados = d.data();
      // O id da ocorrência vem do próprio caminho quando o campo não existe
      // (documentos gravados antes deste campo passar a ser salvo).
      const ocorrenciaId = dados.ocorrenciaId ?? d.ref.parent.parent?.id;
      if (ocorrenciaId && (dados.voto === 'confirma' || dados.voto === 'refuta')) {
        mapa[ocorrenciaId] = dados.voto;
      }
    });
    return mapa;
  } catch (erro) {
    // Sem o índice de grupo os botões só perdem o estado "já votei"; o resto
    // da tela continua funcionando, então não vale derrubar nada por isso.
    console.warn('[validacoes] não foi possível carregar seus votos:', erro);
    return {};
  }
}

/** Placar ao vivo de um relato — usado quando ele está aberto em detalhe. */
export function observarPlacar(
  ocorrenciaId: string,
  aoMudar: (placar: { confirmacoes: number; refutacoes: number }) => void
) {
  return onSnapshot(doc(db, 'ocorrencias', ocorrenciaId), (snap) => {
    const d = snap.data();
    aoMudar({
      confirmacoes: typeof d?.confirmacoes === 'number' ? d.confirmacoes : 0,
      refutacoes: typeof d?.refutacoes === 'number' ? d.refutacoes : 0,
    });
  });
}

/** Quem validou um relato — útil para uma futura tela de detalhe. */
export async function listarValidacoes(ocorrenciaId: string) {
  exigirUsuaria();
  const snap = await getDocs(collection(db, 'ocorrencias', ocorrenciaId, 'validacoes'));
  return snap.docs.map((d) => ({ uid: d.id, voto: d.data().voto as Voto }));
}
