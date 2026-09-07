import { pt } from './pt';
import { en } from './en';
import type { ChaveTraducao, Dicionario, Idioma, Interpolacao } from './tipos';

export type { ChaveTraducao, Dicionario, Idioma, Interpolacao };

export const DICIONARIOS: Record<Idioma, Dicionario> = { pt, en };

export const IDIOMAS: { codigo: Idioma; rotuloChave: ChaveTraducao }[] = [
  { codigo: 'pt', rotuloChave: 'idioma.pt' },
  { codigo: 'en', rotuloChave: 'idioma.en' },
];

/** Locale usado por date-fns / Intl para cada idioma do app. */
export const LOCALE_DE: Record<Idioma, string> = {
  pt: 'pt-BR',
  en: 'en-US',
};

/** Caminha 'mapa.titulo' dentro do dicionário. */
function buscar(dicionario: Dicionario, caminho: string): string | undefined {
  const valor = caminho
    .split('.')
    .reduce<any>((no, parte) => (no == null ? undefined : no[parte]), dicionario);
  return typeof valor === 'string' ? valor : undefined;
}

/** Troca {nome} pelos valores passados. Placeholder sem valor fica como está. */
function interpolar(texto: string, valores?: Interpolacao): string {
  if (!valores) return texto;
  return texto.replace(/\{(\w+)\}/g, (original, chave) =>
    valores[chave] === undefined ? original : String(valores[chave])
  );
}

/**
 * Traduz uma chave.
 *
 * Cai para o português quando o idioma escolhido não tem a chave — num app de
 * segurança, texto em outro idioma é melhor que um rótulo em branco num botão.
 * Em último caso devolve a própria chave, o que deixa o buraco visível em
 * desenvolvimento em vez de escondê-lo.
 */
export function traduzir(idioma: Idioma, chave: ChaveTraducao, valores?: Interpolacao): string {
  const texto = buscar(DICIONARIOS[idioma], chave) ?? buscar(pt, chave);
  if (texto === undefined) {
    if (__DEV__) console.warn(`[i18n] chave sem tradução: ${chave}`);
    return chave;
  }
  return interpolar(texto, valores);
}

/**
 * Plural simples de 1 vs. muitos, que é tudo de que o app precisa hoje
 * ("1 relato" / "3 relatos"). Não tenta cobrir as regras de plural de
 * idiomas com mais de duas formas — quando isso for necessário, aqui é o
 * lugar de trocar por Intl.PluralRules.
 */
export function traduzirPlural(
  idioma: Idioma,
  chaveSingular: ChaveTraducao,
  chavePlural: ChaveTraducao,
  quantidade: number,
  valores?: Interpolacao
): string {
  const chave = quantidade === 1 ? chaveSingular : chavePlural;
  return traduzir(idioma, chave, { n: quantidade, ...valores });
}
