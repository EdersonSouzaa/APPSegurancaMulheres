import type { Traducoes } from './pt';

/**
 * pt.ts usa `as const`, então cada texto vira um tipo literal ('Cancelar', e
 * não string). Isso é ótimo para autocompletar as chaves, mas impediria
 * qualquer outro idioma de existir: 'Cancel' não é atribuível a 'Cancelar'.
 *
 * Widen alarga só as folhas para `string`, preservando o formato do objeto.
 * O resultado é o contrato que en.ts (e qualquer idioma futuro) precisa
 * cumprir — mesmas chaves, textos livres.
 */
type Widen<T> = {
  [K in keyof T]: T[K] extends string ? string : Widen<T[K]>;
};

export type Dicionario = Widen<Traducoes>;

export type Idioma = 'pt' | 'en';

/**
 * Caminhos de chave válidos, em profundidade ('mapa.titulo', 'a11y.voltar').
 * É o que faz `t('mapa.titluo')` falhar no editor em vez de virar texto vazio
 * no meio de uma tela de emergência.
 */
export type ChaveTraducao = CaminhosDe<Traducoes>;

type CaminhosDe<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${CaminhosDe<T[K]>}`;
}[keyof T & string];

export type Interpolacao = Record<string, string | number>;
