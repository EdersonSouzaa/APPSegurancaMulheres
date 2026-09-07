import React from 'react';
import { StyleSheet, StyleProp, TouchableOpacity, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useI18n } from '../context/I18nContext';
import { haptics } from '../lib/haptics';

type Props = {
  style?: StyleProp<ViewStyle>;
  size?: number;
  to?: string;
};

/** Botão fixo (quadrado branco, seta vermelha) para voltar direto à tela inicial (ou a `to`, se informado) de qualquer tela do app. */
export function BackHomeButton({ style, size = 22, to = '/home' }: Props) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      activeOpacity={0.75}
      onPress={() => {
        haptics.toque();
        router.replace(to as any);
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={to === '/home' ? t('a11y.voltarInicio') : t('a11y.voltar')}
    >
      <MaterialCommunityIcons name="arrow-left" size={size} color="#E53935" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
});
