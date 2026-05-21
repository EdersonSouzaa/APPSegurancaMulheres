import React from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

// Cores movidas para dentro do componente ou usando o tema central

export default function About() {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();

  // Cores dinâmicas para esta tela
  const colors = {
    primary: '#F06292',
    secondary: isDarkMode ? '#A0A0A0' : '#9C97AC',
    background: isDarkMode ? '#121212' : '#FDEAF9',
    card: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#212121',
    purple: '#9575CD',
    divider: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  };

  const styles = getStyles(colors);

  const FeatureRow = ({ icon, title, description }: { icon: any, title: string, description: string }) => (
    <View style={styles.featureItem}>
      <View style={styles.iconCircleSmall}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );


  return (
    // SafeAreaView garante que o conteúdo não fique sob o notch ou barra de status
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Navbar fixa no topo */}
      <View style={styles.navbar}>
        <TouchableOpacity 
          style={styles.backButton} 
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="chevron-left" size={32} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.navbarTitle}>Sobre o App</Text>
        {/* View vazia apenas para centralizar o título perfeitamente */}
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroSection}>
          <View style={styles.iconCircleLarge}>
            <MaterialCommunityIcons name="shield-sun-outline" size={60} color={colors.primary} />
          </View>
          <View style={styles.logoRow}>
            <Text style={styles.appNameText}>Ela</Text>
            <Text style={[styles.appNameText, { color: colors.primary }]}>Segura</Text>
            <MaterialCommunityIcons name="heart" size={24} color={colors.purple} style={{ marginLeft: 5 }} />
          </View>
          <Text style={styles.tagline}>Sua segurança é importante</Text>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.missionTitle}>Nossa Missão</Text>
          <Text style={styles.description}>
            Cuidar e proteger mulheres através da tecnologia e da comunidade.
            Acreditamos que toda mulher tem o direito de transitar com confiança e segurança.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Como funcionamos</Text>

          <FeatureRow
            icon="target-account"
            title="Botão SOS Instantâneo"
            description="Envio de localização em tempo real para contatos de confiança."
          />
          <FeatureRow
            icon="map-marker-path"
            title="Caminho Seguro"
            description="Visualize avaliações da comunidade sobre a segurança das ruas."
          />
          <FeatureRow
            icon="account-group-outline"
            title="Rede de Apoio"
            description="Conecte-se com outras usuárias para compartilhar rotas."
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>Versão 1.0.0</Text>
          <Text style={styles.madeWith}>Desenvolvido para sua proteção.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  iconCircleLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appNameText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginTop: 4,
    opacity: 0.8,
  },
  mainCard: {
    backgroundColor: colors.card,
    borderRadius: 30,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  missionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    opacity: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  iconCircleSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  version: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
  },
  madeWith: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },
});