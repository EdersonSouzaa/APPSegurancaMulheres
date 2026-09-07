import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  startAt,
  endAt,
  serverTimestamp,
} from 'firebase/firestore';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';
import { db } from './firebase';
import { toISO, exigirUsuaria } from './firestoreHelpers';

export type NivelZona = 'safe' | 'alert' | 'danger';

export type ZonaApp = {
  id: string;
  user_id: string;
  user_name: string;
  lat: number;
  lng: number;
  radius: number;
  level: NivelZona;
  created_at: string | null;
  /** true quando a zona é da usuária logada — só ela pode remover. */
  minha: boolean;
};

const NIVEIS: NivelZona[] = ['safe', 'alert', 'danger'];
const nivelValido = (n: any): n is NivelZona => NIVEIS.includes(n);

/** Faixa de raio aceita, em metros. Evita alguém pintar a cidade inteira. */
export const RAIO_MIN = 50;
export const RAIO_MAX = 2000;
export const RAIO_PADRAO = 250;

const colZonas = () => collection(db, 'zonas');

function mapear(id: string, d: any, uidAtual: string): ZonaApp {
  return {
    id,
    user_id: d.userId ?? '',
    user_name: d.userName ?? '',
    lat: typeof d.lat === 'number' ? d.lat : 0,
    lng: typeof d.lng === 'number' ? d.lng : 0,
    radius: typeof d.radius === 'number' ? d.radius : RAIO_PADRAO,
    level: nivelValido(d.level) ? d.level : 'alert',
    created_at: toISO(d.createdAt),
    minha: d.userId === uidAtual,
  };
}

/**
 * Marca uma área e compartilha com a comunidade.
 *
 * O geohash é gravado junto porque o Firestore não faz consulta geoespacial:
 * é ele que permite buscar "as zonas dentro de X metros" sem varrer a coleção
 * inteira — mesma técnica já usada em ocorrências.
 */
export async function criarZona(
  lat: number,
  lng: number,
  level: NivelZona,
  radius = RAIO_PADRAO
): Promise<ZonaApp> {
  const user = exigirUsuaria();

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('Latitude inválida.');
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error('Longitude inválida.');
  if (!nivelValido(level)) throw new Error('Nível de área inválido.');

  const raio = Math.min(RAIO_MAX, Math.max(RAIO_MIN, Math.round(radius)));

  const payload = {
    userId: user.uid,
    userName: user.displayName ?? '',
    lat,
    lng,
    radius: raio,
    level,
    geohash: geohashForLocation([lat, lng]),
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(colZonas(), payload);

  return {
    ...mapear(ref.id, payload, user.uid),
    created_at: new Date().toISOString(),
  };
}

/** Remove uma área. A Security Rule também barra, mas o erro aqui é legível. */
export async function excluirZona(id: string) {
  const user = exigirUsuaria();
  const ref = doc(colZonas(), id);
  const antes = await getDoc(ref);

  if (!antes.exists()) throw new Error('Área não encontrada.');
  if (antes.data().userId !== user.uid) {
    throw new Error('Só quem marcou esta área pode removê-la.');
  }

  await deleteDoc(ref);
  return { id };
}

/** Busca pontual — usada quando não vale a pena manter um listener aberto. */
export async function listarZonasProximas(
  lat: number,
  lng: number,
  raioMetros = 5000
): Promise<ZonaApp[]> {
  const user = exigirUsuaria();
  const faixas = geohashQueryBounds([lat, lng], raioMetros);

  const resultados = await Promise.all(
    faixas.map((f) => getDocs(query(colZonas(), orderBy('geohash'), startAt(f[0]), endAt(f[1]))))
  );

  const vistos = new Set<string>();
  const lista: ZonaApp[] = [];

  for (const snap of resultados) {
    for (const d of snap.docs) {
      if (vistos.has(d.id)) continue;
      vistos.add(d.id);
      const z = mapear(d.id, d.data(), user.uid);
      if (distanceBetween([z.lat, z.lng], [lat, lng]) * 1000 > raioMetros) continue;
      lista.push(z);
    }
  }

  return lista;
}

/**
 * Assina as áreas próximas em tempo real.
 *
 * geohashQueryBounds devolve algumas faixas de string (na prática de 4 a 9)
 * que cobrem o círculo com folga, e cada faixa precisa da sua própria
 * consulta — o Firestore não sabe unir intervalos. Abrimos um listener por
 * faixa e mantemos um mapa único id → zona: assim, quando qualquer faixa
 * muda, recompomos a lista inteira já sem duplicatas e sem os falsos
 * positivos das bordas, que o filtro por distância real elimina.
 *
 * Devolve a função de cancelamento de todos os listeners de uma vez.
 */
export function observarZonasProximas(
  lat: number,
  lng: number,
  raioMetros: number,
  aoMudar: (zonas: ZonaApp[]) => void,
  aoFalhar?: (erro: unknown) => void
): () => void {
  const user = exigirUsuaria();
  const faixas = geohashQueryBounds([lat, lng], raioMetros);
  const acumulado = new Map<string, ZonaApp>();

  const emitir = () => {
    const lista = [...acumulado.values()].filter(
      (z) => distanceBetween([z.lat, z.lng], [lat, lng]) * 1000 <= raioMetros
    );
    aoMudar(lista);
  };

  const cancelamentos = faixas.map((f) =>
    onSnapshot(
      query(colZonas(), orderBy('geohash'), startAt(f[0]), endAt(f[1])),
      (snap) => {
        // Trabalhamos com docChanges para que uma faixa não apague as zonas
        // que só existem em outra faixa do mesmo círculo.
        snap.docChanges().forEach((mudanca) => {
          if (mudanca.type === 'removed') acumulado.delete(mudanca.doc.id);
          else acumulado.set(mudanca.doc.id, mapear(mudanca.doc.id, mudanca.doc.data(), user.uid));
        });
        emitir();
      },
      (erro) => {
        console.warn('[zonas] listener falhou:', erro);
        aoFalhar?.(erro);
      }
    )
  );

  return () => cancelamentos.forEach((cancelar) => cancelar());
}
