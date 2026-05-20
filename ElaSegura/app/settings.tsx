import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export default function Settings() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  
  // Navegação interna na aba de configurações
  const [currentSubScreen, setCurrentSubScreen] = useState<'main' | 'security'>('main');
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  
  // Preferências do usuário
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isLocationEnabled, setIsLocationEnabled] = useState(true);

  // Biometria local
  const [isBiometryEnabled, setIsBiometryEnabled] = useState(false);

  // Alterar Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Contatos SOS
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

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

  // Carrega configurações iniciais
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      // Busca informações do usuário no backend
      const userData = await api.get('/user/me', token);
      if (userData) {
        setIsNotificationsEnabled(userData.notifications_enabled);
        setIsLocationEnabled(userData.location_enabled);
      }

      // Busca biometria salva localmente
      const biometry = await AsyncStorage.getItem('isBiometryEnabled');
      if (biometry !== null) {
        setIsBiometryEnabled(biometry === 'true');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do usuário:', error);
    }
  };

  // Atualiza as preferências no backend
  const handleToggleNotifications = async (value: boolean) => {
    setIsNotificationsEnabled(value);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      await api.put('/user/preferences', {
        notifications_enabled: value,
        location_enabled: isLocationEnabled
      }, token);
    } catch (error) {
      console.error('Erro ao salvar preferência de notificação:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a preferência de notificações.');
      setIsNotificationsEnabled(!value);
    }
  };

  const handleToggleLocation = async (value: boolean) => {
    setIsLocationEnabled(value);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      await api.put('/user/preferences', {
        notifications_enabled: isNotificationsEnabled,
        location_enabled: value
      }, token);
    } catch (error) {
      console.error('Erro ao salvar preferência de localização:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a preferência de localização.');
      setIsLocationEnabled(!value);
    }
  };

  // Atualiza preferência de biometria
  const handleToggleBiometry = async (value: boolean) => {
    setIsBiometryEnabled(value);
    try {
      await AsyncStorage.setItem('isBiometryEnabled', String(value));
    } catch (error) {
      console.error('Erro ao salvar preferência de biometria:', error);
    }
  };

  // Busca lista de contatos para a tela de segurança
  const fetchContacts = async () => {
    setContactsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const data = await api.get('/contatos', token);
      setContacts(data);
    } catch (error) {
      console.error('Erro ao buscar contatos para segurança:', error);
    } finally {
      setContactsLoading(false);
    }
  };

  // Alterna o status SOS/emergencial do contato na tela de segurança
  const handleToggleEmergencyStatus = async (contact: any) => {
    const updatedStatus = !contact.emergencial;
    
    // Atualização otimista na interface
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, emergencial: updatedStatus } : c));
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      await api.put(`/contatos/${contact.id}`, {
        name: contact.name,
        phone: contact.phone,
        emergencial: updatedStatus
      }, token);
      
    } catch (error) {
      console.error('Erro ao atualizar status de emergência:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status do contato.');
      // Reverte o estado em caso de erro
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, emergencial: !updatedStatus } : c));
    }
  };

  // Atualiza senha no backend
  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Aviso', 'Preencha todos os campos de senha.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'A nova senha e a confirmação não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setPasswordLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erro', 'Sessão expirada. Faça login novamente.');
        router.replace('/login');
        return;
      }

      await api.put('/user/update-password', {
        currentPassword,
        newPassword
      }, token);

      Alert.alert('Sucesso', 'Senha atualizada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      Alert.alert('Erro', error.message || 'Erro ao atualizar senha. Verifique se a senha atual está correta.');
    } finally {
      setPasswordLoading(false);
    }
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
    const animatedValue = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

    useEffect(() => {
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

  // Se o usuário selecionou a sub-tela de Segurança
  if (currentSubScreen === 'security') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />
        
        {/* Cabeçalho da sub-tela de Segurança */}
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.backBtnBg }]} 
            onPress={() => setCurrentSubScreen('main')}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Segurança</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Biometria */}
          <Section title="Acesso e Biometria">
            <SettingItem 
              icon="fingerprint" 
              title="Acesso por Biometria" 
              subtitle="Desbloqueio rápido e seguro"
              rightElement={
                <Switch 
                  value={isBiometryEnabled} 
                  onValueChange={handleToggleBiometry}
                  trackColor={{ false: '#D1D1D1', true: colors.primary }}
                  thumbColor={'#FFF'}
                />
              }
              isLast
            />
          </Section>

          {/* Alterar Senha */}
          <Section title="Alterar Senha">
            <View style={styles.passwordForm}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.subtitle }]}>Senha Atual</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: isDarkMode ? '#2D2D2D' : '#FAFAFA', color: colors.text, borderColor: colors.border }]}
                  placeholder="Digite sua senha atual"
                  placeholderTextColor={colors.subtitle}
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.subtitle }]}>Nova Senha</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: isDarkMode ? '#2D2D2D' : '#FAFAFA', color: colors.text, borderColor: colors.border }]}
                  placeholder="Digite a nova senha"
                  placeholderTextColor={colors.subtitle}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.subtitle }]}>Confirmar Nova Senha</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: isDarkMode ? '#2D2D2D' : '#FAFAFA', color: colors.text, borderColor: colors.border }]}
                  placeholder="Confirme a nova senha"
                  placeholderTextColor={colors.subtitle}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>

              <TouchableOpacity 
                style={[styles.savePasswordButton, { backgroundColor: colors.primary }]}
                onPress={handleUpdatePassword}
                disabled={passwordLoading}
                activeOpacity={0.8}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.savePasswordButtonText}>Atualizar Senha</Text>
                )}
              </TouchableOpacity>
            </View>
          </Section>

          {/* Contatos SOS */}
          <Section title="Contatos de Emergência SOS">
            <Text style={[styles.sectionSubtitle, { color: colors.subtitle }]}>
              Marque quais contatos receberão seus alertas imediatos de SOS e localização em tempo real.
            </Text>

            {contactsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : contacts.length === 0 ? (
              <View style={styles.emptyContactsContainer}>
                <MaterialCommunityIcons name="account-multiple-outline" size={48} color={colors.subtitle} />
                <Text style={[styles.emptyContactsText, { color: colors.subtitle }]}>
                  Nenhum contato cadastrado ainda.
                </Text>
                <TouchableOpacity 
                  style={[styles.linkButton, { borderColor: colors.primary }]}
                  onPress={() => {
                    setCurrentSubScreen('main');
                    router.push('/contatos');
                  }}
                >
                  <Text style={[styles.linkButtonText, { color: colors.primary }]}>Cadastrar Contatos</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.contactsList}>
                {contacts.map((item, index) => (
                  <View 
                    key={item.id} 
                    style={[
                      styles.contactItemRow, 
                      { borderBottomColor: colors.border },
                      index === contacts.length - 1 && styles.lastItem
                    ]}
                  >
                    <View style={[styles.contactIconBox, { backgroundColor: colors.iconBox }]}>
                      <MaterialCommunityIcons 
                        name={item.emergencial ? "shield-alert" : "account"} 
                        size={22} 
                        color={item.emergencial ? colors.primary : colors.subtitle} 
                      />
                    </View>
                    <View style={styles.contactDetails}>
                      <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.contactPhone, { color: colors.subtitle }]}>{item.phone}</Text>
                    </View>
                    <Switch
                      value={item.emergencial}
                      onValueChange={() => handleToggleEmergencyStatus(item)}
                      trackColor={{ false: '#D1D1D1', true: colors.primary }}
                      thumbColor={'#FFF'}
                    />
                  </View>
                ))}
              </View>
            )}
          </Section>
          
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Tela Principal de Configurações
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
            onPress={() => {
              setCurrentSubScreen('security');
              fetchContacts();
            }} 
            isLast
          />
        </Section>

        <Section title="Segurança ElaSegura">
          <SettingItem 
            icon="account-group-outline" 
            title="Contatos de Emergência" 
            subtitle="Gerencie seus contatos SOS"
            onPress={() => router.push('/contatos')} 
          />
          <SettingItem 
            icon="map-marker-radius-outline" 
            title="Localização em Tempo Real" 
            subtitle="Ativar compartilhamento de rota"
            rightElement={
              <Switch 
                value={isLocationEnabled} 
                onValueChange={handleToggleLocation}
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
                onValueChange={handleToggleNotifications}
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
            onPress={() => setFaqModalVisible(true)} 
          />
          <SettingItem 
            icon="information-outline" 
            title="Sobre o App" 
            onPress={() => router.push('/about')} 
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

      {/* Modal Central de Ajuda / FAQ */}
      <Modal
        visible={faqModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFaqModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Central de Ajuda</Text>
              <TouchableOpacity onPress={() => setFaqModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.faqScroll}>
              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: colors.primary }]}>Como funciona o botão SOS?</Text>
                <Text style={[styles.faqAnswer, { color: colors.text }]}>
                  O botão SOS na tela principal ativa um alarme sonoro instantâneo e envia mensagens de socorro com a sua localização em tempo real para os contatos que você definiu como contatos SOS/emergenciais.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: colors.primary }]}>Como definir meus contatos de emergência?</Text>
                <Text style={[styles.faqAnswer, { color: colors.text }]}>
                  Acesse "Contatos de Emergência" no menu de configurações para cadastrar novos contatos de confiança. Depois, na aba "Segurança", você pode marcar quais deles ficarão ativos para receber os alertas de SOS.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: colors.primary }]}>O aplicativo funciona sem internet?</Text>
                <Text style={[styles.faqAnswer, { color: colors.text }]}>
                  Para enviar sua localização atualizada em tempo real para seus contatos e fazer requisições à nuvem, é recomendável possuir uma conexão ativa de dados móveis ou Wi-Fi.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: colors.primary }]}>Minha localização é compartilhada o tempo todo?</Text>
                <Text style={[styles.faqAnswer, { color: colors.text }]}>
                  Não. Sua localização só é transmitida quando você ativa explicitamente o alerta de SOS na tela principal, ou quando ativa a opção "Localização em Tempo Real" em suas preferências.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: colors.primary }]}>Como ativar o Tema Escuro?</Text>
                <Text style={[styles.faqAnswer, { color: colors.text }]}>
                  Basta clicar no botão de alternância do Sol/Lua na seção "Temas" da tela de configurações para alternar o visual do aplicativo a qualquer momento.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={() => setFaqModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  
  // Estilos da Sub-tela de Segurança
  passwordForm: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputField: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  savePasswordButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  savePasswordButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    lineHeight: 18,
  },
  emptyContactsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  emptyContactsText: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  linkButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  contactsList: {
    paddingHorizontal: 8,
  },
  contactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  contactIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
  },
  contactPhone: {
    fontSize: 13,
    marginTop: 1,
  },
  
  // Estilos do Modal Central de Ajuda
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 28,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  faqScroll: {
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 18,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
