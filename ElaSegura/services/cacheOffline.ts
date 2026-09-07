import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache "última resposta boa" em AsyncStorage.
 *
 * O cache do Firestore em React Native vive só na memória do processo: fechou
 * o app, sumiu. Este módulo cobre exatamente esse buraco — guarda o resultado
 * já mapeado de cada consulta, para a tela abrir com conteúdo mesmo sem
 * internet, que é justamente quando a emergência costuma acontecer.
 *
 * Regras deliberadas:
 *
 * - Nunca falha. Erro de leitura ou escrita vira "sem cache". Um app de
 *   segurança não pode quebrar porque o armazenamento local encheu.
 * - Não tem expiração. Dado velho, marcado como velho, é melhor que tela
 *   vazia; quem consome mostra o aviso de offline.
 * - É por usuária: a chave inclui o uid, então trocar de conta no mesmo
 *   aparelho não vaza contatos nem ocorrências de uma para a outra.
 */

const PREFIXO = '@elasegura/cache';

export type EntradaCache<T> = {
  dados: T;
  salvoEm: string;
};

function chaveDe(uid: string | null | undefined, nome: string) {
  return `${PREFIXO}:${uid ?? 'anon'}:${nome}`;
}

export async function salvarCache<T>(uid: string | null | undefined, nome: string, dados: T) {
  try {
    const entrada: EntradaCache<T> = { dados, salvoEm: new Date().toISOString() };
    await AsyncStorage.setItem(chaveDe(uid, nome), JSON.stringify(entrada));
  } catch {
    // best-effort: sem cache é pior, mas não é motivo para derrubar a tela.
  }
}

export async function lerCache<T>(
  uid: string | null | undefined,
  nome: string
): Promise<EntradaCache<T> | null> {
  try {
    const bruto = await AsyncStorage.getItem(chaveDe(uid, nome));
    if (!bruto) return null;
    const entrada = JSON.parse(bruto);
    if (!entrada || typeof entrada !== 'object' || !('dados' in entrada)) return null;
    return entrada as EntradaCache<T>;
  } catch {
    return null;
  }
}

/**
 * Executa a consulta e guarda o resultado. Se a rede falhar, devolve o que
 * estava salvo em vez de propagar o erro.
 *
 * `origem` diz para a tela se o que ela recebeu veio da rede ou do disco —
 * é o que permite mostrar "dados salvos no aparelho" sem mentir para a usuária.
 * Quando não há rede nem cache, o erro original sobe: aí a tela realmente não
 * tem o que mostrar, e esconder isso seria pior.
 */
export async function comCache<T>(
  uid: string | null | undefined,
  nome: string,
  consulta: () => Promise<T>
): Promise<{ dados: T; origem: 'rede' | 'cache'; salvoEm?: string }> {
  try {
    const dados = await consulta();
    salvarCache(uid, nome, dados);
    return { dados, origem: 'rede' };
  } catch (erro) {
    const salvo = await lerCache<T>(uid, nome);
    if (salvo) {
      console.warn(`[cache] ${nome}: consulta falhou, usando cópia local de ${salvo.salvoEm}`);
      return { dados: salvo.dados, origem: 'cache', salvoEm: salvo.salvoEm };
    }
    throw erro;
  }
}

/** Apaga tudo que foi guardado para uma usuária — usado no logout. */
export async function limparCache(uid: string | null | undefined) {
  try {
    const chaves = await AsyncStorage.getAllKeys();
    const minhas = chaves.filter((k) => k.startsWith(chaveDe(uid, '')));
    if (minhas.length) await AsyncStorage.multiRemove(minhas);
  } catch {
    // idem: melhor deixar lixo do que quebrar o logout.
  }
}
