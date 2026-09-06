import React, { useMemo, useRef, useState } from 'react';
import { Fonts } from '../constants/globalFont';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, ThemeColors } from '../constants/theme';

const MULHER_IMAGE = require('../assets/images/logo.png');

// Esta é a tela de abertura do app: ela fica SEMPRE no tema claro, mesmo que a
// pessoa já tenha escolhido o tema escuro nas configurações. Por isso aqui não
// usamos o useTheme() — as cores vêm fixas de Colors.light.
const LIGHT_COLORS = Colors.light;
const LIGHT_GRADIENT = ['#FFFFFF', '#FFECF4'] as const;

const SLIDES = [
  {
    image: MULHER_IMAGE,
    icon: 'shield-check' as const,
    kicker: 'Bem-vinda',
    title: 'Sua segurança,\nnossa prioridade',
    description: 'Alertas de emergência, mapa colaborativo e sua rede de confiança — tudo em um só lugar, sempre com você.',
  },
  {
    image: MULHER_IMAGE,
    icon: 'alarm-light' as const,
    kicker: 'Emergência',
    title: 'SOS em\num toque',
    description: 'Ative o alerta de emergência e avise sua rede de confiança na hora, com sua localização em tempo real.',
  },
  {
    image: MULHER_IMAGE,
    icon: 'map-marker-radius' as const,
    kicker: 'Comunidade',
    title: 'Mapa\ncolaborativo',
    description: 'Veja áreas de risco reportadas pela comunidade e trace rotas mais seguras para chegar aonde precisa.',
  },
];

type Metrics = ReturnType<typeof getMetrics>;

// A ilustração é limitada pela menor dimensão E pela altura da tela, para não
// ficar gigante em celular/tablet nem estourar em telas baixas ou em paisagem.
const getMetrics = (width: number, height: number) => {
  const shortestSide = Math.min(width, height);
  const illustrationSize = Math.round(
    Math.max(132, Math.min(shortestSide * 0.55, height * 0.28, 240))
  );

  return {
    illustrationSize,
    horizontalPadding: Math.round(Math.max(20, Math.min(width * 0.07, 32))),
    illustrationSpacing: Math.round(Math.max(12, illustrationSize * 0.09)),
    titleSize: Math.round(Math.max(24, Math.min(shortestSide * 0.082, 32))),
    descriptionSize: Math.round(Math.max(13, Math.min(shortestSide * 0.039, 15))),
    buttonHeight: Math.round(Math.max(50, Math.min(height * 0.07, 58))),
    dotsSpacing: Math.round(Math.max(14, Math.min(height * 0.03, 24))),
  };
};

export default function Welcome() {
  const router = useRouter();
  const colors = LIGHT_COLORS;
  const { width, height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const metrics = useMemo(() => getMetrics(width, height), [width, height]);
  const styles = useMemo(() => getStyles(metrics, colors), [metrics, colors]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const goToSlide = (nextIndex: number) => {
    if (nextIndex === activeIndexRef.current || nextIndex < 0 || nextIndex >= SLIDES.length) return;
    Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setActiveIndex(nextIndex);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -40) {
          goToSlide(activeIndexRef.current + 1);
        } else if (gesture.dx > 40) {
          goToSlide(activeIndexRef.current - 1);
        }
      },
    })
  ).current;

  const slide = SLIDES[activeIndex];

  return (
    <LinearGradient colors={LIGHT_GRADIENT} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        <View style={styles.content}>
          <Animated.View style={[styles.slide, { opacity: fadeAnim }]} {...panResponder.panHandlers}>
            <View style={styles.illustrationBox}>
              <Image source={slide.image} style={styles.illustrationImage} resizeMode="contain" />
            </View>

            <View style={styles.kickerPill}>
              <MaterialCommunityIcons name={slide.icon} size={15} color={colors.primary} />
              <Text style={styles.kickerText}>{slide.kicker}</Text>
            </View>

            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </Animated.View>

          <View style={styles.dots}>
            {SLIDES.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => goToSlide(index)}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <View style={[styles.dot, index === activeIndex && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButtonWrapper}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/login', params: { tab: 'cadastro' } })}
          >
            <LinearGradient
              colors={[colors.primary, '#C2185B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Começar →</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryLink}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/login', params: { tab: 'login' } })}
          >
            <Text style={styles.secondaryLinkText}>Já tenho uma conta</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (metrics: Metrics, colors: ThemeColors) => StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  slide: {
    paddingHorizontal: metrics.horizontalPadding,
    alignItems: 'flex-start',
  },
  illustrationBox: {
    alignSelf: 'center',
    width: metrics.illustrationSize,
    height: metrics.illustrationSize,
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: metrics.illustrationSpacing,
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  kickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  kickerText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: metrics.dotsSpacing,
    marginBottom: Math.round(metrics.dotsSpacing * 1.3),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: metrics.titleSize,
    fontWeight: 'bold',
    color: colors.text,
    lineHeight: Math.round(metrics.titleSize * 1.25),
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: metrics.descriptionSize,
    color: colors.secondary,
    lineHeight: Math.round(metrics.descriptionSize * 1.47),
  },
  primaryButtonWrapper: {
    marginHorizontal: metrics.horizontalPadding,
    borderRadius: 18,
    marginTop: 20,
    marginBottom: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  primaryButton: {
    height: metrics.buttonHeight,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  secondaryLink: {
    alignSelf: 'center',
  },
  secondaryLinkText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
