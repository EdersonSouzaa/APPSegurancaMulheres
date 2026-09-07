import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type CategoriaPontoSeguro = 'delegacia' | 'policia' | 'saude' | 'acolhimento';

export type PontoSeguro = {
  id: string;
  nome: string;
  categoria: CategoriaPontoSeguro;
  lat: number;
  lng: number;
  telefone?: string | null;
  endereco?: string | null;
  aberto24h?: boolean;
  /**
   * false = coordenada aproximada, colocada no bairro e ainda não conferida
   * no local. A tela mostra um aviso para a usuária, e o pino fica com traço
   * tracejado. Só vire para true depois de checar endereço e coordenada.
   */
  verificado: boolean;
};

/**
 * Sementes de pontos de apoio em Fortaleza.
 *
 * IMPORTANTE PARA QUEM MANTÉM: as coordenadas abaixo são APROXIMADAS, no nível
 * do bairro, e por isso todas entram com `verificado: false`. Elas servem para
 * o mapa não nascer vazio e para o time ter um ponto de partida — não para
 * alguém se orientar numa emergência. Confira endereço, telefone e coordenada
 * de cada uma antes de marcar como verificada.
 *
 * A lista definitiva vive na coleção `pontosSeguros` do Firestore; este arquivo
 * é apenas o fallback usado quando a coleção está vazia ou o aparelho está sem
 * conexão. services/pontosSeguros.ts cuida dessa escolha.
 *
 * Os telefones são as linhas públicas nacionais (180, 190, 192), que não mudam
 * de unidade para unidade e podem ser discadas de qualquer lugar do país.
 */
export const PONTOS_SEGUROS_SEED: PontoSeguro[] = [
  {
    id: 'seed-ddm-fortaleza',
    nome: 'Delegacia de Defesa da Mulher de Fortaleza',
    categoria: 'delegacia',
    lat: -3.7301,
    lng: -38.5289,
    telefone: '180',
    endereco: 'Centro, Fortaleza — confira o endereço atual',
    aberto24h: true,
    verificado: false,
  },
  {
    id: 'seed-ijf',
    nome: 'Instituto Dr. José Frota (IJF)',
    categoria: 'saude',
    lat: -3.7283,
    lng: -38.5331,
    telefone: '192',
    endereco: 'Centro, Fortaleza — confira o endereço atual',
    aberto24h: true,
    verificado: false,
  },
  {
    id: 'seed-hgf',
    nome: 'Hospital Geral de Fortaleza (HGF)',
    categoria: 'saude',
    lat: -3.7479,
    lng: -38.4884,
    telefone: '192',
    endereco: 'Papicu, Fortaleza — confira o endereço atual',
    aberto24h: true,
    verificado: false,
  },
  {
    id: 'seed-upa-conjunto-ceara',
    nome: 'UPA Conjunto Ceará',
    categoria: 'saude',
    lat: -3.7834,
    lng: -38.6095,
    telefone: '192',
    endereco: 'Conjunto Ceará, Fortaleza — confira o endereço atual',
    aberto24h: true,
    verificado: false,
  },
  {
    id: 'seed-ciops',
    nome: 'Ciops — Polícia Militar (Centro)',
    categoria: 'policia',
    lat: -3.7325,
    lng: -38.5272,
    telefone: '190',
    endereco: 'Centro, Fortaleza — confira o endereço atual',
    aberto24h: true,
    verificado: false,
  },
];

export const ICONE_CATEGORIA: Record<CategoriaPontoSeguro, IconName> = {
  delegacia: 'shield-account',
  policia: 'police-badge',
  saude: 'hospital-box',
  acolhimento: 'home-heart',
};

export const COR_CATEGORIA: Record<CategoriaPontoSeguro, string> = {
  delegacia: '#7B1FA2',
  policia: '#1565C0',
  saude: '#2E7D32',
  acolhimento: '#EF6C00',
};

export const CHAVE_ROTULO_CATEGORIA = {
  delegacia: 'pontosSeguros.delegacia',
  policia: 'pontosSeguros.policia',
  saude: 'pontosSeguros.saude',
  acolhimento: 'pontosSeguros.acolhimento',
} as const;
