import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MarkedZone, ZoneLevel } from '../components/LeafletMap';
import {
  criarZona,
  excluirZona,
  observarZonasProximas,
  RAIO_PADRAO,
  type ZonaApp,
} from '../services/zonas';
import { auth } from '../services/firebase';
import { lerCache, salvarCache } from '../services/cacheOffline';

/** Chave da versão antiga, quando as áreas viviam só neste aparelho. */
export const MARKED_ZONES_KEY = '@elasegura/marked_zones';
const CHAVE_MIGRACAO = '@elasegura/marked_zones_migradas';
const NOME_CACHE = 'zonasComunidade';

type ZonaLocalAntiga = { id: string; lat: number; lng: number; level: ZoneLevel; radius: number };

function paraMarkedZone(z: ZonaApp): MarkedZone {
  return {
    id: z.id,
    lat: z.lat,
    lng: z.lng,
    level: z.level,
    radius: z.radius,
    author: z.minha ? undefined : z.user_name || undefined,
    mine: z.minha,
  };
}

/**
 * Sobe para o Firestore as áreas que ficaram guardadas só no aparelho.
 *
 * Antes desta versão, marcar uma área no mapa gravava em AsyncStorage e
 * pronto: ninguém além da própria usuária via aquilo, apesar de o app
 * prometer um mapa colaborativo. Aqui essas marcações viram documentos de
 * verdade, uma única vez — a flag de migração evita duplicar tudo a cada
 * abertura, e a chave antiga é apagada no fim.
 *
 * Falha em silêncio de propósito: não conseguir migrar marcações antigas não
 * pode impedir alguém de abrir o mapa.
 */
async function migrarZonasLocais() {
  try {
    if (await AsyncStorage.getItem(CHAVE_MIGRACAO)) return;

    const bruto = await AsyncStorage.getItem(MARKED_ZONES_KEY);
    const antigas: ZonaLocalAntiga[] = bruto ? JSON.parse(bruto) : [];

    for (const z of antigas) {
      if (typeof z?.lat !== 'number' || typeof z?.lng !== 'number') continue;
      await criarZona(z.lat, z.lng, z.level ?? 'alert', z.radius ?? RAIO_PADRAO);
    }

    await AsyncStorage.multiSet([[CHAVE_MIGRACAO, '1']]);
    await AsyncStorage.removeItem(MARKED_ZONES_KEY);

    if (antigas.length) {
      console.info(`[zonas] ${antigas.length} área(s) local(is) migrada(s) para a comunidade.`);
    }
  } catch (e) {
    console.warn('[zonas] não foi possível migrar as áreas locais:', e);
  }
}

type Resultado = {
  markedZones: MarkedZone[];
  adicionarZona: (lat: number, lng: number, level: ZoneLevel) => Promise<void>;
  removerZona: (id: string) => Promise<void>;
  /** Zona pertence à usuária logada? Só nesse caso oferecemos remover. */
  ehMinha: (id: string) => boolean;
  carregando: boolean;
};

/**
 * Áreas marcadas pela comunidade, ao vivo, ao redor de um ponto.
 *
 * O listener é reaberto quando o centro ou o raio mudam de forma relevante —
 * não a cada tremida do GPS, senão a tela reassinaria dezenas de consultas por
 * minuto. Por isso o centro entra arredondado: dois pontos a poucas dezenas de
 * metros um do outro produzem a mesma chave e reaproveitam o mesmo listener.
 */
export function useMarkedZones(
  centro: { latitude: number; longitude: number } | null,
  raioMetros = 5000
): Resultado {
  const [markedZones, setMarkedZones] = useState<MarkedZone[]>([]);
  const [carregando, setCarregando] = useState(true);
  const zonasRef = useRef<MarkedZone[]>([]);
  zonasRef.current = markedZones;

  // 3 casas decimais ≈ 110 m: granularidade boa o suficiente para não
  // reassinar o listener à toa.
  const chaveLat = centro ? centro.latitude.toFixed(3) : null;
  const chaveLng = centro ? centro.longitude.toFixed(3) : null;

  useEffect(() => {
    let cancelado = false;
    let cancelarListener: (() => void) | null = null;

    (async () => {
      const uid = auth.currentUser?.uid ?? null;

      // Mostra a última lista conhecida enquanto a rede não responde — sem
      // isso, abrir o mapa offline dá um mapa sem nenhuma área marcada, o que
      // é indistinguível de "não há risco por aqui".
      const salvo = await lerCache<MarkedZone[]>(uid, NOME_CACHE);
      if (salvo && !cancelado && zonasRef.current.length === 0) {
        setMarkedZones(salvo.dados);
      }

      if (!centro || chaveLat === null || chaveLng === null) {
        if (!cancelado) setCarregando(false);
        return;
      }

      await migrarZonasLocais();
      if (cancelado) return;

      try {
        cancelarListener = observarZonasProximas(
          centro.latitude,
          centro.longitude,
          raioMetros,
          (zonas) => {
            if (cancelado) return;
            const mapeadas = zonas.map(paraMarkedZone);
            setMarkedZones(mapeadas);
            setCarregando(false);
            salvarCache(uid, NOME_CACHE, mapeadas);
          },
          () => {
            if (!cancelado) setCarregando(false);
          }
        );
      } catch (e) {
        console.warn('[zonas] não foi possível observar as áreas:', e);
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
      cancelarListener?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveLat, chaveLng, raioMetros]);

  const adicionarZona = useCallback(async (lat: number, lng: number, level: ZoneLevel) => {
    const criada = await criarZona(lat, lng, level);
    // Pintura otimista: o listener confirma em seguida, mas a área aparece no
    // toque, não no round-trip.
    setMarkedZones((anteriores) =>
      anteriores.some((z) => z.id === criada.id)
        ? anteriores
        : [...anteriores, paraMarkedZone(criada)]
    );
  }, []);

  const removerZona = useCallback(async (id: string) => {
    setMarkedZones((anteriores) => anteriores.filter((z) => z.id !== id));
    try {
      await excluirZona(id);
    } catch (e) {
      // Devolve a área para a tela: sumir da vista sem ter sumido do banco
      // seria pior que o erro.
      console.warn('[zonas] falha ao remover, recarregando estado:', e);
      throw e;
    }
  }, []);

  const ehMinha = useCallback(
    (id: string) => zonasRef.current.find((z) => z.id === id)?.mine === true,
    []
  );

  return { markedZones, adicionarZona, removerZona, ehMinha, carregando };
}
