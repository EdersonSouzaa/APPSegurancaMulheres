import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  startAt,
  endAt,
  serverTimestamp,
} from 'firebase/firestore';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';
import { auth, db } from './firebase';
import { toISO, exigirUsuaria, combinaFiltro, tolerarIndiceEmConstrucao } from './firestoreHelpers';
import { comCache } from './cacheOffline';

export type OcorrenciaTipo = 'error' | 'warning';

export type OcorrenciaApp = {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  description: string;
  location: string | null;
  status: string;
  type: OcorrenciaTipo;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  /** Validação comunitária — contadores desnormalizados no próprio documento. */
  confirmacoes: number;
  refutacoes: number;
  /** Só presente nas buscas por proximidade, em metros. */
  distance?: number;
};

/**
 * Janela de tempo do feed. 'tudo' desliga o corte.
 *
 * O filtro roda em memória, e não como where('createdAt', '>=', ...), porque
 * a consulta por raio já ordena por geohash — o Firestore não aceita um
 * intervalo em outro campo junto disso, e criar um índice para cada combinação
 * de raio e período seria pior que filtrar algumas dezenas de documentos aqui.
 */
export type PeriodoFiltro = '7d' | '30d' | '90d' | 'tudo';

const DIAS_DO_PERIODO: Record<Exclude<PeriodoFiltro, 'tudo'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function dentroDoPeriodo(iso: string | null, periodo?: PeriodoFiltro): boolean {
  if (!periodo || periodo === 'tudo') return true;
  // Sem data conhecida o relato fica visível: esconder algo que pode ser
  // recente é pior que mostrar algo que pode ser antigo.
  if (!iso) return true;
  const limite = Date.now() - DIAS_DO_PERIODO[periodo] * 24 * 60 * 60 * 1000;
  return new Date(iso).getTime() >= limite;
}

const colOcorrencias = () => collection(db, 'ocorrencias');

const TIPOS_VALIDOS: OcorrenciaTipo[] = ['error', 'warning'];
const tipoValido = (t: any): t is OcorrenciaTipo => TIPOS_VALIDOS.includes(t);
const latValida = (n: any) => typeof n === 'number' && Number.isFinite(n) && n >= -90 && n <= 90;
const lngValida = (n: any) => typeof n === 'number' && Number.isFinite(n) && n >= -180 && n <= 180;

function mapear(id: string, d: any): OcorrenciaApp {
  return {
    id,
    user_id: d.userId ?? '',
    user_name: d.userName ?? '',
    title: d.title ?? '',
    description: d.description ?? '',
    location: d.location ?? null,
    status: d.status ?? 'pendente',
    type: d.type === 'warning' ? 'warning' : 'error',
    latitude: typeof d.latitude === 'number' ? d.latitude : null,
    longitude: typeof d.longitude === 'number' ? d.longitude : null,
    created_at: toISO(d.createdAt),
    confirmacoes: typeof d.confirmacoes === 'number' ? d.confirmacoes : 0,
    refutacoes: typeof d.refutacoes === 'number' ? d.refutacoes : 0,
  };
}

/**
 * Ocorrências da própria usuária, mais recentes primeiro.
 *
 * Mantém o comportamento do GET /ocorrencias antigo, que filtrava por
 * user_id apesar do comentário no código chamá-lo de "feed comunitário".
 *
 * Precisa do índice composto (userId ASC, createdAt DESC) — o Firestore
 * devolve um link direto para criá-lo na primeira execução.
 */
export async function listarOcorrencias(
  filtro?: string,
  periodo?: PeriodoFiltro
): Promise<OcorrenciaApp[]> {
  const user = exigirUsuaria();

  const { dados: minhas } = await comCache<OcorrenciaApp[]>(user.uid, 'minhasOcorrencias', () =>
    tolerarIndiceEmConstrucao<OcorrenciaApp[]>(
      async () => {
        const snap = await getDocs(
          query(colOcorrencias(), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
        );
        return snap.docs.map((d) => mapear(d.id, d.data()));
      },
      [],
      'minhas ocorrências'
    )
  );

  return minhas
    .filter((o) => combinaFiltro(filtro, o.title, o.description))
    .filter((o) => dentroDoPeriodo(o.created_at, periodo));
}

/**
 * Feed comunitário por raio, via geohash.
 *
 * O Firestore não faz consulta geoespacial nativa: geohashQueryBounds devolve
 * um punhado de faixas de string que cobrem o círculo com folga, e o filtro
 * por distância real elimina os falsos positivos das bordas. Sem esse filtro
 * apareceriam ocorrências fora do raio pedido.
 */
export async function listarOcorrenciasProximas(
  lat: number,
  lng: number,
  raioMetros = 1000,
  filtro?: string,
  periodo?: PeriodoFiltro
): Promise<OcorrenciaApp[]> {
  exigirUsuaria();

  if (!latValida(lat) || !lngValida(lng)) {
    throw new Error('Coordenadas inválidas.');
  }
  if (!Number.isFinite(raioMetros) || raioMetros <= 0) {
    throw new Error('O raio deve ser um número positivo em metros.');
  }

  // O cache guarda o resultado bruto do raio, antes de busca textual e
  // período: assim, offline, trocar o filtro ainda funciona sobre a última
  // vizinhança conhecida em vez de esvaziar a tela.
  const uid = auth.currentUser?.uid ?? null;
  const chaveCache = `ocorrenciasProximas:${lat.toFixed(2)}:${lng.toFixed(2)}:${raioMetros}`;

  const { dados: bruto } = await comCache<OcorrenciaApp[]>(uid, chaveCache, async () => {
    const faixas = geohashQueryBounds([lat, lng], raioMetros);

    const resultados = await Promise.all(
      faixas.map((f) =>
        getDocs(query(colOcorrencias(), orderBy('geohash'), startAt(f[0]), endAt(f[1])))
      )
    );

    const vistos = new Set<string>();
    const lista: OcorrenciaApp[] = [];

    for (const snap of resultados) {
      for (const d of snap.docs) {
        // Faixas de geohash podem se sobrepor, gerando documentos repetidos.
        if (vistos.has(d.id)) continue;
        vistos.add(d.id);

        const o = mapear(d.id, d.data());
        if (o.latitude == null || o.longitude == null) continue;

        const distancia = distanceBetween([o.latitude, o.longitude], [lat, lng]) * 1000;
        if (distancia > raioMetros) continue;

        lista.push({ ...o, distance: distancia });
      }
    }

    return lista;
  });

  return bruto
    .filter((o) => combinaFiltro(filtro, o.title, o.description))
    .filter((o) => dentroDoPeriodo(o.created_at, periodo))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}

export async function criarOcorrencia(dados: {
  title: string;
  description: string;
  location?: string | null;
  type?: OcorrenciaTipo;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<OcorrenciaApp> {
  const user = exigirUsuaria();

  if (!dados.title?.trim() || !dados.description?.trim()) {
    throw new Error('Título e descrição são obrigatórios.');
  }
  if (dados.type !== undefined && !tipoValido(dados.type)) {
    throw new Error("O tipo deve ser 'error' ou 'warning'.");
  }
  if (dados.latitude != null && !latValida(dados.latitude)) {
    throw new Error('Latitude inválida.');
  }
  if (dados.longitude != null && !lngValida(dados.longitude)) {
    throw new Error('Longitude inválida.');
  }

  const temCoordenadas = dados.latitude != null && dados.longitude != null;

  const payload: Record<string, any> = {
    userId: user.uid,
    userName: user.displayName ?? '',
    title: dados.title.trim(),
    description: dados.description.trim(),
    location: dados.location ?? null,
    status: 'pendente',
    type: dados.type ?? 'error',
    latitude: dados.latitude ?? null,
    longitude: dados.longitude ?? null,
    // Contadores da validação comunitária já nascem no documento: assim as
    // Security Rules podem exigir variação de ±1 sem ter de tratar o caso do
    // campo ainda não existir.
    confirmacoes: 0,
    refutacoes: 0,
    createdAt: serverTimestamp(),
  };

  // Só ocorrências com coordenada entram na busca por raio.
  if (temCoordenadas) {
    payload.geohash = geohashForLocation([dados.latitude as number, dados.longitude as number]);
  }

  const ref = await addDoc(colOcorrencias(), payload);

  return {
    ...mapear(ref.id, payload),
    created_at: new Date().toISOString(),
  };
}

export async function atualizarOcorrencia(
  id: string,
  dados: { title: string; description: string; type?: OcorrenciaTipo }
): Promise<OcorrenciaApp> {
  const user = exigirUsuaria();

  if (!dados.title?.trim() || !dados.description?.trim()) {
    throw new Error('Título e descrição são obrigatórios.');
  }
  if (dados.type !== undefined && !tipoValido(dados.type)) {
    throw new Error("O tipo deve ser 'error' ou 'warning'.");
  }

  const ref = doc(colOcorrencias(), id);
  const antes = await getDoc(ref);

  if (!antes.exists()) {
    throw new Error('Ocorrência não encontrada.');
  }
  if (antes.data().userId !== user.uid) {
    throw new Error('Você só pode editar as suas próprias ocorrências.');
  }

  await updateDoc(ref, {
    title: dados.title.trim(),
    description: dados.description.trim(),
    type: dados.type ?? 'error',
  });

  return mapear(id, {
    ...antes.data(),
    title: dados.title.trim(),
    description: dados.description.trim(),
    type: dados.type ?? 'error',
  });
}

export async function excluirOcorrencia(id: string) {
  const user = exigirUsuaria();
  const ref = doc(colOcorrencias(), id);
  const antes = await getDoc(ref);

  if (!antes.exists()) {
    throw new Error('Ocorrência não encontrada.');
  }
  if (antes.data().userId !== user.uid) {
    throw new Error('Você só pode excluir as suas próprias ocorrências.');
  }

  await deleteDoc(ref);
  return { message: 'Ocorrência excluída com sucesso', data: mapear(id, antes.data()) };
}
