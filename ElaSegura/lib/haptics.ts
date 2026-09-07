import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Camada fina sobre expo-haptics.
 *
 * Dois motivos para ela existir:
 *
 * 1. Na web não há motor de vibração e as chamadas rejeitam. Como quase todo
 *    ponto de uso está dentro de um onPress que não trata erro, uma rejeição
 *    solta viraria unhandled promise rejection no console a cada toque.
 * 2. Dá vocabulário ao app: quem chama diz `haptics.emergencia()`, não
 *    "notificationAsync(Warning)". A intenção fica no nome e a intensidade
 *    pode ser reajustada num lugar só.
 *
 * Toda função é fire-and-forget: feedback tátil nunca deve segurar nem
 * derrubar a ação que o disparou.
 */
const DISPONIVEL = Platform.OS !== 'web';

const ignorar = () => {};

/** Toque leve: seleção de chip, filtro, item de lista. */
function selecao() {
  if (!DISPONIVEL) return;
  Haptics.selectionAsync().catch(ignorar);
}

/** Toque médio: botão comum, abrir modal, alternar switch. */
function toque() {
  if (!DISPONIVEL) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignorar);
}

/** Ação com peso: salvar, enviar, confirmar. */
function acao() {
  if (!DISPONIVEL) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(ignorar);
}

/** Deu certo. */
function sucesso() {
  if (!DISPONIVEL) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignorar);
}

/** Deu errado — usado junto do toast vermelho, nunca sozinho. */
function erro() {
  if (!DISPONIVEL) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(ignorar);
}

/** Aviso: algo exige atenção, mas não é falha. */
function aviso() {
  if (!DISPONIVEL) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(ignorar);
}

/**
 * Padrão do SOS: três impactos pesados em sequência.
 *
 * É a confirmação tátil de que o alerta saiu — feita para ser sentida com o
 * telefone no bolso ou na mão fechada, quando olhar a tela não é uma opção.
 */
function emergencia() {
  if (!DISPONIVEL) return;
  const bater = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(ignorar);
  bater();
  setTimeout(bater, 140);
  setTimeout(bater, 280);
}

export const haptics = {
  selecao,
  toque,
  acao,
  sucesso,
  erro,
  aviso,
  emergencia,
};
