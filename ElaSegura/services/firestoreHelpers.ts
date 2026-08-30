import { Timestamp } from 'firebase/firestore';
import { auth } from './firebase';

/**
 * Converte um Timestamp do Firestore para string ISO.
 *
 * As telas formatam datas com `new Date(iso)` e date-fns, exatamente como
 * recebiam do Postgres. Manter o formato evita mexer em todo o código de
 * renderização.
 *
 * Retorna null quando o campo veio de um serverTimestamp() que ainda não
 * resolveu no servidor (acontece na leitura logo após a escrita).
 */
export function toISO(value: any): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

/** Usuária logada ou erro claro. Substitui o middleware authenticateToken. */
export function exigirUsuaria() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return user;
}

/**
 * True quando a consulta falhou porque o índice composto ainda não está
 * pronto — seja porque não foi criado, seja porque está em construção.
 *
 * Nos dois casos o Firestore devolve o código 'failed-precondition'. É um
 * estado transitório de configuração, não um defeito da consulta: assim que
 * o índice fica Enabled no console, a mesma chamada passa a funcionar.
 */
export function indiceIndisponivel(erro: any): boolean {
  if (erro?.code !== 'failed-precondition') return false;
  return /index/i.test(erro?.message ?? '');
}

/**
 * Executa a consulta e, se o único problema for índice indisponível, devolve
 * o fallback em vez de derrubar a tela inteira. Qualquer outro erro sobe
 * normalmente — mascarar falha real seria pior que a tela quebrada.
 */
export async function tolerarIndiceEmConstrucao<T>(
  consulta: () => Promise<T>,
  fallback: T,
  rotulo: string
): Promise<T> {
  try {
    return await consulta();
  } catch (erro) {
    if (indiceIndisponivel(erro)) {
      console.warn(
        `[Firestore] ${rotulo}: índice composto ainda não está pronto. ` +
        'Exibindo dados parciais — confira o status em Firestore → Indexes.'
      );
      return fallback;
    }
    throw erro;
  }
}

/**
 * Busca textual em memória.
 *
 * O Postgres resolvia isso com ILIKE. O Firestore não tem busca por substring,
 * então filtramos no cliente. Para o volume deste app (ocorrências de uma
 * usuária ou de um raio de poucos km) o custo é irrelevante.
 */
export function combinaFiltro(texto: string | undefined, ...campos: (string | null | undefined)[]) {
  if (!texto?.trim()) return true;
  const alvo = texto.trim().toLowerCase();
  return campos.some((c) => (c ?? '').toLowerCase().includes(alvo));
}
