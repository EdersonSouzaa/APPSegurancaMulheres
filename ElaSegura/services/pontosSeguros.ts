import { collection, getDocs } from 'firebase/firestore';
import { distanceBetween } from 'geofire-common';
import { db } from './firebase';
import { exigirUsuaria } from './firestoreHelpers';
import { PONTOS_SEGUROS_SEED, type CategoriaPontoSeguro, type PontoSeguro } from '../constants/pontosSeguros';
import { comCache } from './cacheOffline';

const CATEGORIAS: CategoriaPontoSeguro[] = ['delegacia', 'policia', 'saude', 'acolhimento'];
const categoriaValida = (c: any): c is CategoriaPontoSeguro => CATEGORIAS.includes(c);

function mapear(id: string, d: any): PontoSeguro | null {
  if (typeof d?.lat !== 'number' || typeof d?.lng !== 'number') return null;
  return {
    id,
    nome: d.nome ?? 'Ponto de apoio',
    categoria: categoriaValida(d.categoria) ? d.categoria : 'acolhimento',
    lat: d.lat,
    lng: d.lng,
    telefone: d.telefone ?? null,
    endereco: d.endereco ?? null,
    aberto24h: d.aberto24h === true,
    // Um ponto só é verificado quando alguém marcou explicitamente. O padrão
    // é desconfiar: a tela avisa a usuária de que o endereço pode estar errado.
    verificado: d.verificado === true,
  };
}

/**
 * Pontos de apoio: delegacias da mulher, unidades de saúde 24h, batalhões e
 * casas de acolhimento.
 *
 * A fonte é a coleção `pontosSeguros`, alimentada pelo time do projeto. Quando
 * ela está vazia — projeto recém-criado, ou o app rodando antes da carga
 * inicial — caímos na semente local para o mapa não nascer sem nenhuma camada
 * de apoio. Uma coleção vazia é um estado de configuração normal, não um erro.
 *
 * A lista é pequena e muda raramente, então vale o cache local: sem internet, a
 * usuária ainda enxerga onde procurar ajuda, que é exatamente o momento em que
 * essa informação importa.
 */
export async function listarPontosSeguros(): Promise<PontoSeguro[]> {
  const user = exigirUsuaria();

  const { dados } = await comCache<PontoSeguro[]>(user.uid, 'pontosSeguros', async () => {
    const snap = await getDocs(collection(db, 'pontosSeguros'));
    const doServidor = snap.docs
      .map((d) => mapear(d.id, d.data()))
      .filter((p): p is PontoSeguro => p !== null);

    return doServidor.length > 0 ? doServidor : PONTOS_SEGUROS_SEED;
  });

  return dados;
}

/** Os pontos dentro de um raio, do mais perto para o mais longe. */
export async function listarPontosSegurosProximos(
  lat: number,
  lng: number,
  raioMetros = 10000
): Promise<(PontoSeguro & { distancia: number })[]> {
  const todos = await listarPontosSeguros();

  return todos
    .map((p) => ({ ...p, distancia: distanceBetween([p.lat, p.lng], [lat, lng]) * 1000 }))
    .filter((p) => p.distancia <= raioMetros)
    .sort((a, b) => a.distancia - b.distancia);
}
