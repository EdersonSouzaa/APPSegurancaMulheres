import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = {
  primary: '#F06292',
  secondary: '#9C97AC',
  background: '#FDEAF9',
  text: '#212121',
  white: '#FFFFFF',
  purple: '#9575CD',
};

export default function About() {

  const FeatureRow = ({ icon, title, description }: { icon: any, title: string, description: string }) => (
    <View style={styles.featureItem}>
      <View style={styles.iconCircleSmall}>
        <MaterialCommunityIcons name={icon} size={24} color={COLORS.primary} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );

  return (
    // SafeAreaView garante que o conteúdo não fique sob o notch ou barra de status
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Navbar fixa no topo */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7}>
          <MaterialCommunityIcons name="chevron-left" size={32} color={COLORS.text} />
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
            <MaterialCommunityIcons name="shield-sun-outline" size={60} color={COLORS.primary} />
          </View>
          <View style={styles.logoRow}>
            <Text style={styles.appNameText}>Ela</Text>
            <Text style={[styles.appNameText, { color: COLORS.primary }]}>Segura</Text>
            <MaterialCommunityIcons name="heart" size={24} color={COLORS.purple} style={{ marginLeft: 5 }} />
          </View>
          <Text style={styles.tagline}>Sua segurança é importante</Text>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.missionTitle}>Nossa Missão</Text>
          <Text style={styles.description}>
            Cuidar e proteger mulheres através da tecnologia e da comunidade.
            Acreditamos que toda mulher tem o direito de transitar com confiança e           segurança.
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    // Adiciona padding extra no Android para não colar na StatusBar
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appNameText: {
    fontSize: 32,
    fontWeight: '800',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 4,
    opacity: 0.8,
  },
  mainCard: {
    backgroundColor: COLORS.white,
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
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
    opacity: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
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
    backgroundColor: COLORS.background,
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
    color: COLORS.text,
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  version: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  madeWith: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 4,
  },
});