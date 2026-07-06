import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Switch,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import * as Location from 'expo-location';
import { BackHomeButton } from '../components/BackHomeButton';

export default function Settings() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();

  // Navegação interna na aba de configurações
  const [currentSubScreen, setCurrentSubScreen] = useState<'main' | 'security'>('main');
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [vocesabiaModalVisible, setVocesabiaModalVisible] = useState(false);

  // Preferências do usuário
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [alertRadius, setAlertRadius] = useState(5000);

  // Alterar Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Contatos SOS
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Cores dinâmicas
  const colors = useSettingsColors();

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
        await AsyncStorage.setItem('@notifications_enabled', String(userData.notifications_enabled));
        setIsLocationEnabled(userData.location_enabled);
        if (userData.alert_radius) setAlertRadius(userData.alert_radius);
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
      await AsyncStorage.setItem('@notifications_enabled', String(value));
    } catch (error) {
      console.error('Erro ao salvar preferência de notificação:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a preferência de notificações.');
      setIsNotificationsEnabled(!value);
    }
  };

  const handleToggleLocation = async (value: boolean) => {
    // Se o usuário está ATIVANDO, pede a permissão nativa do sistema primeiro
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Usuário negou a permissão do sistema → não altera o toggle
        Alert.alert(
          'Permissão Necessária',
          'Para ativar a localização em tempo real, é preciso permitir o acesso à localização nas configurações do seu celular.',
          [{ text: 'OK' }]
        );
        return; // Não continua sem a permissão
      }
    }

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

  const handleChangeAlertRadius = async (value: number) => {
    setAlertRadius(value);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      await api.put('/user/preferences', { alert_radius: value }, token);
    } catch (error) {
      console.error('Erro ao salvar raio de alerta:', error);
      Alert.alert('Erro', 'Não foi possível salvar o raio de alerta.');
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

      await AsyncStorage.setItem('userPassword', newPassword);

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

  // Se o usuário selecionou a sub-tela de Segurança
  if (currentSubScreen === 'security') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

        {/* Cabeçalho da sub-tela de Segurança */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentSubScreen('main')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Segurança</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Alterar Senha */}
            <Section title="Alterar Senha" colors={colors}>
              <View style={styles.passwordForm}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Senha atual</Text>
                  <View style={[styles.inputField, { backgroundColor: isDarkMode ? '#2D2D2D' : '#FAFAFA', borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="lock-outline" size={18} color={colors.primary} style={styles.inputFieldIcon} />
                    <TextInput
                      style={[styles.inputFieldText, { color: colors.text }]}
                      placeholder="Digite sua senha atual"
                      placeholderTextColor={colors.subtitle}
                      secureTextEntry
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Nova senha</Text>
                  <View style={[styles.inputField, { backgroundColor: isDarkMode ? '#2D2D2D' : '#FAFAFA', borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="lock-outline" size={18} color={colors.primary} style={styles.inputFieldIcon} />
                    <TextInput
                      style={[styles.inputFieldText, { color: colors.text }]}
                      placeholder="Digite a nova senha"
                      placeholderTextColor={colors.subtitle}
                      secureTextEntry
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Confirmar nova senha</Text>
                  <View style={[styles.inputField, { backgroundColor: isDarkMode ? '#2D2D2D' : '#FAFAFA', borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="lock-check-outline" size={18} color={colors.primary} style={styles.inputFieldIcon} />
                    <TextInput
                      style={[styles.inputFieldText, { color: colors.text }]}
                      placeholder="Confirme a nova senha"
                      placeholderTextColor={colors.subtitle}
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.savePasswordButtonWrapper}
                  onPress={handleUpdatePassword}
                  disabled={passwordLoading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[colors.primary, '#C2185B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.savePasswordButton}
                  >
                    {passwordLoading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.savePasswordButtonText}>Atualizar senha</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Section>

            {/* Contatos SOS */}
            <Section title="Contatos de Emergência SOS" colors={colors}>
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
                      <View style={[styles.contactIconBox, { backgroundColor: colors.tintPink }]}>
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
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={'#FFF'}
                      />
                    </View>
                  ))}
                </View>
              )}
            </Section>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Tela Principal de Configurações
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      <View style={styles.header}>
        <BackHomeButton to="/perfil" />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Configurações</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Section title="Segurança" colors={colors}>
          <SettingItem
            colors={colors}
            icon="shield-lock-outline"
            iconColor={colors.primary}
            iconTint={colors.tintPink}
            title="Senha e biometria"
            subtitle="Altere sua senha de acesso"
            onPress={() => {
              setCurrentSubScreen('security');
              fetchContacts();
            }}
          />
          <SettingItem
            colors={colors}
            icon="account-heart-outline"
            iconColor="#7C4DFF"
            iconTint={colors.tintPurple}
            title="Contatos de emergência"
            subtitle="Gerencie sua rede de confiança"
            onPress={() => router.push('/contatos')}
          />
          <SettingItem
            colors={colors}
            icon="map-marker-radius-outline"
            iconColor="#2196F3"
            iconTint={colors.tintBlue}
            title="Localização em tempo real"
            subtitle="Atualiza sua posição ao vivo"
            rightElement={
              <Switch
                value={isLocationEnabled}
                onValueChange={handleToggleLocation}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFF'}
              />
            }
            isLast
          />
        </Section>

        <Section title="Preferências" colors={colors}>
          <SettingItem
            colors={colors}
            icon="bell-outline"
            iconColor="#FF9800"
            iconTint={colors.tintOrange}
            title="Notificações"
            subtitle="Alertas de risco por perto"
            rightElement={
              <Switch
                value={isNotificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFF'}
              />
            }
          />
          <View style={[styles.radiusRow, { borderTopColor: colors.border }]}>
            <View style={styles.radiusHeaderRow}>
              <View style={[styles.settingIconBox, { backgroundColor: colors.tintBlue }]}>
                <MaterialCommunityIcons name="radar" size={22} color="#2196F3" />
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Raio de alertas</Text>
                <Text style={[styles.settingSubtitle, { color: colors.subtitle }]}>Distância para ocorrências próximas</Text>
              </View>
            </View>
            <View style={styles.radiusPillsRow}>
              {[
                { label: '500m', value: 500 },
                { label: '1km', value: 1000 },
                { label: '2km', value: 2000 },
                { label: '5km', value: 5000 },
                { label: '10km', value: 10000 },
              ].map(item => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => handleChangeAlertRadius(item.value)}
                  style={[
                    styles.radiusPill,
                    {
                      borderColor: alertRadius === item.value ? colors.primary : colors.border,
                      backgroundColor: alertRadius === item.value ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: alertRadius === item.value ? '#FFF' : colors.subtitle, fontWeight: '600', fontSize: 13 }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Section>

        <Section title="Aparência" colors={colors}>
          <SettingItem
            colors={colors}
            icon="moon-waning-crescent"
            iconColor="#7C4DFF"
            iconTint={colors.tintPurple}
            title="Modo escuro"
            subtitle="Alterna entre tema claro e escuro"
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFF'}
              />
            }
            isLast
          />
        </Section>

        <Section title="Dicas e suporte" colors={colors}>
          <SettingItem
            colors={colors}
            icon="lightbulb-on-outline"
            iconColor="#FFC107"
            iconTint={colors.tintYellow}
            title="Você sabia?"
            subtitle="Dicas, leis e contatos de apoio gratuito"
            onPress={() => setVocesabiaModalVisible(true)}
          />
          <SettingItem
            colors={colors}
            icon="help-circle-outline"
            iconColor="#2196F3"
            iconTint={colors.tintBlue}
            title="Central de ajuda"
            subtitle="Perguntas frequentes"
            onPress={() => setFaqModalVisible(true)}
            isLast
          />
        </Section>
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
                  Acesse &ldquo;Contatos de emergência&rdquo; no menu de configurações para cadastrar novos contatos de confiança. Depois, na mesma seção, você pode marcar quais deles ficarão ativos para receber os alertas de SOS.
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
                  Não. Sua localização só é transmitida quando você ativa explicitamente o alerta de SOS na tela principal, ou quando ativa a opção &ldquo;Localização em tempo real&rdquo; em suas preferências.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: colors.primary }]}>Como ativar o Tema Escuro?</Text>
                <Text style={[styles.faqAnswer, { color: colors.text }]}>
                  Basta ativar a opção &ldquo;Modo escuro&rdquo; na seção &ldquo;Aparência&rdquo; da tela de configurações para alternar o visual do aplicativo a qualquer momento.
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

      {/* Modal Você Sabia? */}
      <Modal
        visible={vocesabiaModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVocesabiaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="lightbulb-on" size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Você Sabia?</Text>
              </View>
              <TouchableOpacity onPress={() => setVocesabiaModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.faqScroll}>
              <Text style={{ fontSize: 13, color: colors.subtitle, marginBottom: 15, lineHeight: 18 }}>
                Confira dicas rápidas semanais de segurança, direitos da mulher e canais de apoio gratuito.
              </Text>

              {/* Dica 1: Lei Maria da Penha */}
              <View style={styles.faqItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <MaterialCommunityIcons name="scale-balance" size={20} color={colors.primary} />
                  <Text style={[styles.faqQuestion, { color: colors.primary, marginBottom: 0 }]}>Lei Maria da Penha (Lei 11.340)</Text>
                </View>
                <Text style={[styles.faqAnswer, { color: colors.text }]}>
                  Ela protege mulheres contra violência doméstica e familiar. Existem 5 formas de violência definidas pela lei: física, psicológica (humilhações, controle), sexual, patrimonial (reter dinheiro/bens) e moral (calúnia/difamação).
                </Text>
              </View>

              {/* Dica 2: Assédio no Transporte */}
              <View style={styles.faqItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <MaterialCommunityIcons name="bus-alert" size={20} color={colors.primary} />
                  <Text style={[styles.faqQuestion, { color: colors.primary, marginBottom: 0 }]}>Assédio no Transporte Público</Text>
                </View>
                <Text style={[styles.faqAnswer, { color: colors.text }]}>
                  Importunação sexual é crime (Lei 13.718). Se acontecer com você ou com outra pessoa, denuncie imediatamente ao motorista, grite para expor o agressor e chame o 190. Tente anotar a linha e o número do veículo para facilitar o boletim de ocorrência.
                </Text>
              </View>

              {/* Dica 3: Canais de Apoio Gratuito */}
              <View style={styles.faqItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <MaterialCommunityIcons name="heart-pulse" size={20} color={colors.primary} />
                  <Text style={[styles.faqQuestion, { color: colors.primary, marginBottom: 0 }]}>Canais de Apoio Gratuito</Text>
                </View>
                <Text style={[styles.faqAnswer, { color: colors.text, fontWeight: 'bold', marginBottom: 4 }]}>
                  📞 Ligue 180 — Central de Atendimento à Mulher (24h, gratuito e confidencial).
                </Text>
                <Text style={[styles.faqAnswer, { color: colors.text, marginBottom: 4 }]}>
                  ⚖️ Defensoria Pública (NUDEM): Oferece orientação e defesa jurídica gratuita para mulheres vítimas de violência.
                </Text>
                <Text style={[styles.faqAnswer, { color: colors.text }]}>
                  🧠 Apoio Psicológico Social: Diversas universidades públicas e clínicas sociais oferecem psicoterapia gratuita de forma online ou presencial.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={() => setVocesabiaModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const useSettingsColors = () => {
  const { isDarkMode } = useTheme();
  return {
    bg: isDarkMode ? '#121212' : '#FFECF4',
    cardBg: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#1A1A1A',
    subtitle: isDarkMode ? '#A0A0A0' : '#9C97AC',
    primary: '#F35F74',
    border: isDarkMode ? '#333333' : '#F0F0F0',
    tintPink: isDarkMode ? '#F35F7433' : '#FFF0F2',
    tintPurple: isDarkMode ? '#7C4DFF33' : '#EDE7F6',
    tintBlue: isDarkMode ? '#2196F333' : '#E3F2FD',
    tintOrange: isDarkMode ? '#FF980033' : '#FFF3E0',
    tintYellow: isDarkMode ? '#FFC10733' : '#FFF8E1',
    tintGreen: isDarkMode ? '#4CAF5033' : '#E8F5E9',
  };
};

const SettingItem = ({ icon, iconColor, iconTint, title, subtitle, onPress, isLast, rightElement, colors }: any) => {
  return (
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
      <View style={[styles.settingIconBox, { backgroundColor: iconTint }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.subtitle }]}>{subtitle}</Text>}
      </View>
      {rightElement ? rightElement : (
        onPress && <MaterialCommunityIcons name="chevron-right" size={22} color={colors.subtitle} />
      )}
    </TouchableOpacity>
  );
};

const Section = ({ title, children, colors }: any) => {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionHeader, { color: colors.subtitle }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.cardBg }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 6,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
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
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  radiusRow: {
    padding: 16,
    borderTopWidth: 1,
  },
  radiusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  radiusPillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  radiusPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  inputFieldIcon: {
    marginRight: 10,
  },
  inputFieldText: {
    flex: 1,
    fontSize: 15,
  },
  savePasswordButtonWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#F35F74',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  savePasswordButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
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
