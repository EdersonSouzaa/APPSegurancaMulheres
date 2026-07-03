import React from 'react';
import { Text, TextInput } from 'react-native';

const FONT_MAP = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
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

export const applyGlobalFont = () => {
  if (applied) return;
  applied = true;

  const TextAny = Text as any;
  const originalTextRender = TextAny.render;
  TextAny.render = function (...args: any[]) {
    const origin = originalTextRender.apply(this, args);
    return React.cloneElement(origin, {
      style: [{ fontFamily: resolveFontFamily(origin.props.style) }, origin.props.style],
    });
  };

  const InputAny = TextInput as any;
  const originalInputRender = InputAny.render;
  InputAny.render = function (...args: any[]) {
    const origin = originalInputRender.apply(this, args);
    return React.cloneElement(origin, {
      style: [{ fontFamily: resolveFontFamily(origin.props.style) }, origin.props.style],
    });
  };
};
