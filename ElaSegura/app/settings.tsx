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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Settings() {
  const router = useRouter();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState(true);
  const [isLocationEnabled, setIsLocationEnabled] = React.useState(true);

  const SettingItem = ({ icon, title, subtitle, onPress, isLast, rightElement }: any) => (
    <TouchableOpacity 
      style={[styles.settingItem, isLast && styles.lastItem]} 
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.settingIconBox}>
        <MaterialCommunityIcons name={icon} size={24} color="#F35F74" />
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement ? rightElement : (
        onPress && <MaterialCommunityIcons name="chevron-right" size={24} color="#9C97AC" />
      )}
    </TouchableOpacity>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7D2F1" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
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
                trackColor={{ false: '#D1D1D1', true: '#F35F74' }}
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
                trackColor={{ false: '#D1D1D1', true: '#F35F74' }}
                thumbColor={'#FFF'}
              />
            }
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

        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={() => router.replace('/login')}>
          <MaterialCommunityIcons name="logout" size={22} color="#F35F74" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Versão 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7D2F1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#F7D2F1',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
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
    color: '#1A1A1A',
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
    color: '#F35F74',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#FFF',
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
    borderBottomColor: '#F0F0F0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5F6',
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
    color: '#1A1A1A',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#9C97AC',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFDEDE',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F35F74',
    marginLeft: 10,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9C97AC',
    marginBottom: 20,
  },
});
