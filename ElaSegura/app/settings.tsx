import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  ScrollView,
  Switch,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState(true);
  const [isLocationEnabled, setIsLocationEnabled] = React.useState(true);

  // Cores dinâmicas
  const colors = {
    bg: isDarkMode ? '#121212' : '#F7D2F1',
    cardBg: isDarkMode ? '#1E1E1E' : '#FFF',
    text: isDarkMode ? '#FFFFFF' : '#1A1A1A',
    subtitle: isDarkMode ? '#A0A0A0' : '#9C97AC',
    primary: '#F35F74',
    border: isDarkMode ? '#333333' : '#F0F0F0',
    headerBg: isDarkMode ? '#121212' : '#F7D2F1',
    iconBox: isDarkMode ? '#2D2D2D' : '#FFF5F6',
    backBtnBg: isDarkMode ? '#2D2D2D' : '#FFF',
  };

  const SettingItem = ({ icon, title, subtitle, onPress, isLast, rightElement }: any) => (
    <TouchableOpacity 
      style={[
        styles.settingItem, 
        { borderBottomColor: colors.border },
        isLast && styles.lastItem
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={[styles.settingIconBox, { backgroundColor: colors.iconBox }]}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.subtitle }]}>{subtitle}</Text>}
      </View>
      {rightElement ? rightElement : (
        onPress && <MaterialCommunityIcons name="chevron-right" size={24} color={colors.subtitle} />
      )}
    </TouchableOpacity>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={[styles.sectionHeader, { color: colors.primary }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.cardBg }]}>
        {children}
      </View>
    </View>
  );

  const MoonSwitch = () => {
    const animatedValue = React.useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

    React.useEffect(() => {
      Animated.timing(animatedValue, {
        toValue: isDarkMode ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }, [isDarkMode]);

    const translateX = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 22],
    });

    const backgroundColor = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#D1D1D1', '#4D4D4D'],
    });

    return (
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={toggleTheme}
      >
        <Animated.View style={[styles.customSwitchContainer, { backgroundColor }]}>
          <Animated.View style={[styles.customSwitchThumb, { transform: [{ translateX }] }]}>
            <MaterialCommunityIcons 
              name={isDarkMode ? "moon-waning-crescent" : "white-balance-sunny"} 
              size={16} 
              color={isDarkMode ? "#FFD700" : "#FFA500"} 
            />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />
      
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.backBtnBg }]} 
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Configurações</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Section title="Conta">
          <SettingItem 
            icon="shield-lock-outline" 
            title="Segurança" 
            subtitle="Alterar senha e biometria"
            onPress={() => {}} 
            isLast
          />
        </Section>

        <Section title="Segurança ElaSegura">
          <SettingItem 
            icon="account-group-outline" 
            title="Contatos de Emergência" 
            subtitle="Gerencie seus contatos SOS"
            onPress={() => {}} 
          />
          <SettingItem 
            icon="map-marker-radius-outline" 
            title="Localização em Tempo Real" 
            subtitle="Ativar compartilhamento de rota"
            rightElement={
              <Switch 
                value={isLocationEnabled} 
                onValueChange={setIsLocationEnabled}
                trackColor={{ false: '#D1D1D1', true: colors.primary }}
                thumbColor={'#FFF'}
              />
            }
            isLast
          />
        </Section>

        <Section title="Preferências">
          <SettingItem 
            icon="bell-outline" 
            title="Notificações" 
            subtitle="Alertas e avisos sonoros"
            rightElement={
              <Switch 
                value={isNotificationsEnabled} 
                onValueChange={setIsNotificationsEnabled}
                trackColor={{ false: '#D1D1D1', true: colors.primary }}
                thumbColor={'#FFF'}
              />
            }
            isLast
          />
        </Section>

        <Section title="Temas">
          <SettingItem 
            icon="theme-light-dark" 
            title="Tema do Aplicativo" 
            subtitle={isDarkMode ? "Tema Escuro Ativado" : "Tema Padrão Original"}
            rightElement={<MoonSwitch />}
            isLast
          />
        </Section>

        <Section title="Suporte">
          <SettingItem 
            icon="help-circle-outline" 
            title="Central de Ajuda" 
            onPress={() => {}} 
          />
          <SettingItem 
            icon="information-outline" 
            title="Sobre o App" 
            onPress={() => {}} 
            isLast
          />
        </Section>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.cardBg, borderColor: isDarkMode ? '#333' : '#FFDEDE' }]} 
          activeOpacity={0.8} 
          onPress={() => router.replace('/login')}
        >
          <MaterialCommunityIcons name="logout" size={22} color={colors.primary} />
          <Text style={[styles.logoutText, { color: colors.primary }]}>Sair da Conta</Text>
        </TouchableOpacity>
        
        <Text style={[styles.versionText, { color: colors.subtitle }]}>Versão 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 20,
  },
  customSwitchContainer: {
    width: 50,
    height: 28,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  customSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
});
