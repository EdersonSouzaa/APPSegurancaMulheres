import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { toISO, exigirUsuaria, tolerarIndiceEmConstrucao } from './firestoreHelpers';

export type AlertaFeed = {
  id: string;
  source: 'sos' | 'ocorrencia';
  title: string;
  description: string;
  location: string | null;
  created_at: string | null;
  user_id: string;
  user_name: string;
  type: 'error' | 'warning';
};

export type RespostaAlertas = {
  summary: {
    sos_last_24h: number;
    ocorrencias_last_24h: number;
    sos_total: number;
    ocorrencias_total: number;
  };
  alerts: AlertaFeed[];
};

const LIMITE_FEED = 20;

/**
 * Reconstrói o antigo GET /alertas.
 *
 * O SQL fazia UNION ALL de SOS + ocorrências com INNER JOIN no usuário.
 * O Firestore não tem UNION nem JOIN, então buscamos as duas coleções em
 * paralelo e juntamos em memória. O nome da usuária vem desnormalizado no
 * próprio documento (userName), que é o que substitui o JOIN.
 *
 * As contagens usam getCountFromServer: contam no servidor sem baixar os
 * documentos, o que também economiza cota de leitura.
 */
export async function obterAlertas(): Promise<RespostaAlertas> {
  const user = exigirUsuaria();

  const colSos = collection(db, 'sos');
  const colOco = collection(db, 'ocorrencias');
  const ontem = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

  const filtroUsuaria = where('userId', '==', user.uid);
  const filtro24h = where('createdAt', '>=', ontem);

  const nome = user.displayName ?? '';

  // Cada consulta é tolerada individualmente: enquanto um índice composto
  // ainda estiver em construção no Firestore, a parte que já funciona
  // continua aparecendo em vez de a tela inteira ficar vazia.
  const [doSos, doOco, sos24h, oco24h, sosTotal, ocoTotal] = await Promise.all([
    tolerarIndiceEmConstrucao<AlertaFeed[]>(
      async () => {
        const snap = await getDocs(
          query(colSos, filtroUsuaria, orderBy('createdAt', 'desc'), limit(LIMITE_FEED))
        );
        return snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            source: 'sos' as const,
            title: 'Alerta SOS emitido',
            description: data.location ?? 'Localização não informada',
            location: data.location ?? null,
            created_at: toISO(data.createdAt),
            user_id: data.userId ?? user.uid,
            user_name: data.userName || nome,
            type: 'error' as const,
          };
        });
      },
      [],
      'feed de SOS'
    ),
    tolerarIndiceEmConstrucao<AlertaFeed[]>(
      async () => {
        const snap = await getDocs(
          query(colOco, filtroUsuaria, orderBy('createdAt', 'desc'), limit(LIMITE_FEED))
        );
        return snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            source: 'ocorrencia' as const,
            title: data.title ?? '',
            description: data.description || 'Ocorrência registrada',
            location: data.location ?? null,
            created_at: toISO(data.createdAt),
            user_id: data.userId ?? user.uid,
            user_name: data.userName || nome,
            type: data.type === 'warning' ? ('warning' as const) : ('error' as const),
          };
        });
      },
      [],
      'feed de ocorrências'
    ),
    tolerarIndiceEmConstrucao(
      async () => (await getCountFromServer(query(colSos, filtroUsuaria, filtro24h))).data().count,
      0,
      'SOS nas últimas 24h'
    ),
    tolerarIndiceEmConstrucao(
      async () => (await getCountFromServer(query(colOco, filtroUsuaria, filtro24h))).data().count,
      0,
      'ocorrências nas últimas 24h'
    ),
    tolerarIndiceEmConstrucao(
      async () => (await getCountFromServer(query(colSos, filtroUsuaria))).data().count,
      0,
      'total de SOS'
    ),
    tolerarIndiceEmConstrucao(
      async () => (await getCountFromServer(query(colOco, filtroUsuaria))).data().count,
      0,
      'total de ocorrências'
    ),
  ]);

  const alerts = [...doSos, ...doOco]
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    })
    .slice(0, LIMITE_FEED);

  return {
    summary: {
      sos_last_24h: sos24h,
      ocorrencias_last_24h: oco24h,
      sos_total: sosTotal,
      ocorrencias_total: ocoTotal,
    },
    alerts,
  };
}
