import React from 'react';
import { StyleSheet, StyleProp, TouchableOpacity, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  style?: StyleProp<ViewStyle>;
  size?: number;
};

/** Botão fixo (quadrado branco, seta vermelha) para voltar direto à tela inicial de qualquer tela do app. */
export function BackHomeButton({ style, size = 22 }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      activeOpacity={0.75}
      onPress={() => router.replace('/home')}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
