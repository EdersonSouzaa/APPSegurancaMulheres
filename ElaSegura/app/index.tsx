import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

const MULHER_IMAGE = require('../assets/images/mulher.png');

const SLIDES = [
  {
    image: MULHER_IMAGE,
    title: 'Sua segurança,\nnossa prioridade',
    description: 'Alertas de emergência, mapa colaborativo e sua rede de confiança — tudo em um só lugar, sempre com você.',
  },
  {
    image: MULHER_IMAGE,
    title: 'SOS em\num toque',
    description: 'Ative o alerta de emergência e avise sua rede de confiança na hora, com sua localização em tempo real.',
  },
  {
    image: MULHER_IMAGE,
    title: 'Mapa\ncolaborativo',
    description: 'Veja áreas de risco reportadas pela comunidade e trace rotas mais seguras para chegar aonde precisa.',
  },
];

export default function Welcome() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const styles = useMemo(() => getStyles(), []);

  const gradientColors = isDarkMode
    ? (['#3D0F2C', '#1A0512'] as const)
    : (['#FF4F8E', '#B0134A'] as const);

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(newIndex);
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <View style={styles.content}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            style={styles.scrollView}
          >
            {SLIDES.map((slide, index) => (
              <View key={index} style={[styles.slide, { width }]}>
                <View style={styles.illustrationBox}>
                  <Image source={slide.image} style={styles.illustrationImage} resizeMode="contain" />
                </View>

                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.description}>{slide.description}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dots}>
            {SLIDES.map((_, index) => (
              <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/login', params: { tab: 'cadastro' } })}
          >
            <Text style={styles.primaryButtonText}>Começar →</Text>
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

const getStyles = () => StyleSheet.create({
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
  scrollView: {
    flexGrow: 0,
  },
  slide: {
    paddingHorizontal: 28,
    alignItems: 'flex-start',
  },
  illustrationBox: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  illustrationImage: {
    width: 150,
    height: 150,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 40,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },
  primaryButton: {
    marginHorizontal: 28,
    backgroundColor: '#FFFFFF',
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#C2185B',
    fontSize: 17,
    fontWeight: 'bold',
  },
  secondaryLink: {
    alignSelf: 'center',
  },
  secondaryLinkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
