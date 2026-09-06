import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

// Quicksand é a fonte de corpo: geométrica de pontas arredondadas, combina com
// o rosa e os cantos arredondados do app sem perder legibilidade.
const FONT_MAP = {
  regular: 'Quicksand_400Regular',
  medium: 'Quicksand_500Medium',
  semibold: 'Quicksand_600SemiBold',
  bold: 'Quicksand_700Bold',
} as const;

/**
 * Fonte de destaque, usada só nos títulos grandes de cada tela.
 *
 * O applyGlobalFont() abaixo injeta a Quicksand como padrão, mas o style de
 * quem chama tem precedência — então basta espalhar `fontFamily: Fonts.display`
 * no style do título para ele sair com a Fraunces.
 *
 * Não use no corpo do texto: a Fraunces é serifada e perde legibilidade em
 * tamanhos pequenos, o que importa nas telas de SOS e alertas.
 */
export const Fonts = {
  display: 'Fraunces_700Bold',
} as const;

const flattenFontWeight = (style: any): string | number | undefined => {
  if (!style) return undefined;
  if (Array.isArray(style)) {
    for (let i = style.length - 1; i >= 0; i--) {
      const found = flattenFontWeight(style[i]);
      if (found) return found;
    }
    return undefined;
  }
  return style.fontWeight;
};

const resolveFontFamily = (style: any) => {
  const weight = flattenFontWeight(style);
  const numeric = Number(weight);
  if (weight === 'bold' || numeric >= 700) return FONT_MAP.bold;
  if (numeric >= 600) return FONT_MAP.semibold;
  if (numeric >= 500) return FONT_MAP.medium;
  return FONT_MAP.regular;
};

let applied = false;

/**
 * Injeta a fonte padrão no elemento já renderizado por Text/TextInput.
 *
 * O style precisa sair daqui como um OBJETO, não como array.
 *
 * No React Native um array de styles é normal. No react-native-web, porém,
 * `render` já devolveu o elemento do DOM (<span> / <input>) — e o React
 * atribui `style` direto ao CSSStyleDeclaration. Um array vira `node.style[0]`
 * e o navegador lança:
 *
 *   TypeError: Failed to set an indexed property [0] on 'CSSStyleDeclaration'
 *
 * StyleSheet.flatten resolve o array antes disso, mantendo a mesma precedência
 * (o style de quem chama sobrescreve a fontFamily padrão) nas duas plataformas.
 */
const comFontePadrao = (origin: any) =>
  React.cloneElement(origin, {
    style: StyleSheet.flatten([
      { fontFamily: resolveFontFamily(origin.props.style) },
      origin.props.style,
    ]),
  });

export const applyGlobalFont = () => {
  if (applied) return;
  applied = true;

  const TextAny = Text as any;
  const originalTextRender = TextAny.render;
  TextAny.render = function (...args: any[]) {
    return comFontePadrao(originalTextRender.apply(this, args));
  };

  const InputAny = TextInput as any;
  const originalInputRender = InputAny.render;
  InputAny.render = function (...args: any[]) {
    return comFontePadrao(originalInputRender.apply(this, args));
  };
};
