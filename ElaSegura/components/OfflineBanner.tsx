import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useConexao } from '../context/ConexaoContext';
import { useI18n } from '../context/I18nContext';

/**
 * Faixa fina de "sem conexão", para a usuária saber que o que está na tela
 * pode estar velho antes de tomar uma decisão baseada nele.
 *
 * Aparece deslizando de cima e some sozinha quando a conexão volta. Não bloqueia
 * toque em nada — o app continua inteiro utilizável offline.
 */
export const OfflineBanner = () => {
  const { online } = useConexao();
  const { t } = useI18n();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: online ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [online, anim]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.wrapper,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
        },
      ]}
    >
      <View style={styles.banner}>
        <MaterialCommunityIcons name="wifi-off" size={15} color="#FFFFFF" />
        <Text style={styles.texto} numberOfLines={2}>
          {t('conexao.offline')}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
    paddingTop: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#37474F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: '92%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  texto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});
