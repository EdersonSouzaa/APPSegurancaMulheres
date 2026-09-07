import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Preferências locais do aparelho — as que não fazem sentido no Firestore
 * porque descrevem este telefone, não a conta.
 */

const CHAVE_ONBOARDING = '@elasegura/onboarding_concluido';
const CHAVE_DISFARCE = '@elasegura/disfarce';

/* ---------------------------------------------------------------- onboarding */

export async function onboardingConcluido(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CHAVE_ONBOARDING)) === '1';
  } catch {
    // Na dúvida, considere concluído: repetir o onboarding a cada abertura
    // seria pior que pulá-lo uma vez.
    return true;
  }
}

export async function marcarOnboardingConcluido() {
  try {
    await AsyncStorage.setItem(CHAVE_ONBOARDING, '1');
  } catch {
    // best-effort
  }
}

/** Usado no logout: a próxima pessoa a entrar neste aparelho vê o onboarding. */
export async function limparOnboarding() {
  try {
    await AsyncStorage.removeItem(CHAVE_ONBOARDING);
  } catch {
    // best-effort
  }
}

/* ------------------------------------------------------------------ disfarce */

export type ConfigDisfarce = {
  ativo: boolean;
  pin: string;
};

export const DISFARCE_DESLIGADO: ConfigDisfarce = { ativo: false, pin: '' };

export const PIN_MIN = 4;
export const PIN_MAX = 8;

export function pinValido(pin: string) {
  return /^\d+$/.test(pin) && pin.length >= PIN_MIN && pin.length <= PIN_MAX;
}

/**
 * Configuração do modo disfarce.
 *
 * O PIN fica em AsyncStorage em texto puro, e isso é uma decisão consciente,
 * não um esquecimento. O disfarce protege contra alguém que pega o telefone
 * destravado e olha a tela — ele não protege contra quem consegue ler o
 * armazenamento do app, e fingir o contrário seria pior que ser explícito.
 *
 * Guardar um hash aqui só daria a impressão de segurança: sem uma biblioteca
 * de criptografia no projeto, qualquer função de embaralhamento escrita à mão
 * seria reversível por quem tivesse acesso ao mesmo código. Quando o projeto
 * precisar de verdade desse nível, o caminho é expo-secure-store (Keychain no
 * iOS, Keystore no Android), e este módulo é o único lugar a mudar.
 */
export async function lerDisfarce(): Promise<ConfigDisfarce> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_DISFARCE);
    if (!bruto) return DISFARCE_DESLIGADO;
    const dados = JSON.parse(bruto);
    return {
      ativo: dados?.ativo === true,
      pin: typeof dados?.pin === 'string' ? dados.pin : '',
    };
  } catch {
    return DISFARCE_DESLIGADO;
  }
}

export async function salvarDisfarce(config: ConfigDisfarce) {
  try {
    await AsyncStorage.setItem(CHAVE_DISFARCE, JSON.stringify(config));
  } catch {
    // best-effort
  }
}

export async function desativarDisfarce() {
  await salvarDisfarce(DISFARCE_DESLIGADO);
}
