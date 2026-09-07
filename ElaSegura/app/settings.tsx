import React, { useState, useEffect, useCallback } from 'react';
import { Fonts } from '../constants/globalFont';
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
import { useI18n } from '@/context/I18nContext';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHomeButton } from '../components/BackHomeButton';
import { haptics } from '../lib/haptics';
import { IDIOMAS } from '../i18n';
import type { Idioma } from '../i18n';
import {
  lerDisfarce,
  salvarDisfarce,
  desativarDisfarce,
  pinValido,
  type ConfigDisfarce,
} from '../lib/preferencias';
import { obterPerfil, atualizarPreferencias, atualizarSenha } from '../services/usuario';
import { listarContatos, atualizarContato } from '../services/contatos';

const RAIOS = [500, 1000, 2000, 5000, 10000];

export default function Settings() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const { t, idioma, definirIdioma } = useI18n();

  const [currentSubScreen, setCurrentSubScreen] = useState<'main' | 'security'>('main');
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [vocesabiaModalVisible, setVocesabiaModalVisible] = useState(false);
  const [disfarceModalVisible, setDisfarceModalVisible] = useState(false);

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [alertRadius, setAlertRadius] = useState(5000);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Modo disfarce
  const [disfarce, setDisfarce] = useState<ConfigDisfarce>({ ativo: false, pin: '' });
  const [pinDigitado, setPinDigitado] = useState('');
  const [pinConfirmado, setPinConfirmado] = useState('');
  const [erroPin, setErroPin] = useState<string | null>(null);

  const colors = useSettingsColors();

  useEffect(() => {
    loadUserSettings();
    lerDisfarce().then(setDisfarce);
  }, []);

  const loadUserSettings = async () => {
    try {
      const userData = await obterPerfil();
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

  const handleToggleNotifications = async (value: boolean) => {
    haptics.selecao();
    setIsNotificationsEnabled(value);
    try {
      await atualizarPreferencias({
        notifications_enabled: value,
        location_enabled: isLocationEnabled,
      });
      await AsyncStorage.setItem('@notifications_enabled', String(value));
    } catch (error) {
      console.error('Erro ao salvar preferência de notificação:', error);
      haptics.erro();
      Alert.alert(t('comum.erro'), t('config.erroNotificacoes'));
      setIsNotificationsEnabled(!value);
    }
  };

  const handleToggleLocation = async (value: boolean) => {
    haptics.selecao();

    // Ativando: a permissão nativa vem antes — sem ela o toggle seria uma
    // promessa que o app não consegue cumprir.
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('config.permissaoNecessaria'), t('config.permissaoLocalizacaoTexto'), [{ text: 'OK' }]);
        return;
      }
    }

    setIsLocationEnabled(value);
    try {
      await atualizarPreferencias({
        notifications_enabled: isNotificationsEnabled,
        location_enabled: value,
      });
    } catch (error) {
      console.error('Erro ao salvar preferência de localização:', error);
      haptics.erro();
      Alert.alert(t('comum.erro'), t('config.erroLocalizacao'));
      setIsLocationEnabled(!value);
    }
  };

  const handleChangeAlertRadius = async (value: number) => {
    haptics.selecao();
    setAlertRadius(value);
    try {
      await atualizarPreferencias({ alert_radius: value });
    } catch (error) {
      console.error('Erro ao salvar raio de alerta:', error);
      haptics.erro();
      Alert.alert(t('comum.erro'), t('config.erroRaio'));
    }
  };

  const fetchContacts = async () => {
    setContactsLoading(true);
    try {
      setContacts(await listarContatos());
    } catch (error) {
      console.error('Erro ao buscar contatos para segurança:', error);
    } finally {
      setContactsLoading(false);
    }
  };

  const handleToggleEmergencyStatus = async (contact: any) => {
    const updatedStatus = !contact.emergencial;
    haptics.selecao();

    // Atualização otimista na interface
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, emergencial: updatedStatus } : c))
    );

    try {
      await atualizarContato(contact.id, {
        name: contact.name,
        phone: contact.phone,
        emergencial: updatedStatus,
      });
    } catch (error) {
      console.error('Erro ao atualizar status de emergência:', error);
      haptics.erro();
      Alert.alert(t('comum.erro'), t('config.erroContatoStatus'));
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, emergencial: !updatedStatus } : c))
      );
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('comum.atencao'), t('config.preenchaSenhas'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('comum.erro'), t('config.senhasDiferentes'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('comum.erro'), t('config.senhaCurta'));
      return;
    }

    haptics.acao();
    setPasswordLoading(true);
    try {
      await atualizarSenha(currentPassword, newPassword);
      haptics.sucesso();
      Alert.alert(t('config.sucesso'), t('config.senhaAtualizada'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      haptics.erro();
      Alert.alert(t('comum.erro'), error?.message || t('config.erroSenha'));
    } finally {
      setPasswordLoading(false);
    }
  };

  /* ------------------------------------------------------------- disfarce */

  const abrirDisfarce = () => {
    haptics.toque();
    setPinDigitado('');
    setPinConfirmado('');
    setErroPin(null);
    setDisfarceModalVisible(true);
  };

  const salvarPinDisfarce = async () => {
    setErroPin(null);

    if (!pinValido(pinDigitado)) {
      haptics.erro();
      setErroPin(t('disfarce.pinCurto'));
      return;
    }
    if (pinDigitado !== pinConfirmado) {
      haptics.erro();
      setErroPin(t('disfarce.pinDiferente'));
      return;
    }

    const config = { ativo: true, pin: pinDigitado };
    await salvarDisfarce(config);
    setDisfarce(config);
    haptics.sucesso();
    setDisfarceModalVisible(false);
    Alert.alert(t('disfarce.titulo'), t('disfarce.pinSalvo'));
  };

  const alternarDisfarce = useCallback(
    async (valor: boolean) => {
      haptics.selecao();
      if (valor) {
        // Ligar exige definir um PIN: sem ele a calculadora viraria uma porta
        // sem chave, e a pessoa ficaria trancada fora do próprio app.
        abrirDisfarce();
        return;
      }
      await desativarDisfarce();
      setDisfarce({ ativo: false, pin: '' });
      Alert.alert(t('disfarce.titulo'), t('disfarce.desativado'));
    },
    [t]
  );

  const entrarNoDisfarce = () => {
    if (!disfarce.ativo || !disfarce.pin) {
      Alert.alert(t('disfarce.titulo'), t('disfarce.definaPin'));
      return;
    }
    haptics.toque();
    Alert.alert(t('disfarce.titulo'), t('disfarce.avisoSaida'), [
      { text: t('comum.cancelar'), style: 'cancel' },
      { text: t('comum.continuar'), onPress: () => router.replace('/calculadora') },
    ]);
  };

  const trocarIdioma = (novo: Idioma) => {
    haptics.selecao();
    definirIdioma(novo);
  };

  /* --------------------------------------------------- sub-tela Segurança */

  if (currentSubScreen === 'security') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setCurrentSubScreen('main')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.voltar')}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">
            {t('config.seguranca')}
          </Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Section title={t('config.alterarSenha')} colors={colors}>
              <View style={styles.passwordForm}>
                <CampoSenha
                  colors={colors}
                  isDarkMode={isDarkMode}
                  rotulo={t('config.senhaAtual')}
                  valor={currentPassword}
                  aoMudar={setCurrentPassword}
                  icone="lock-outline"
                />
                <CampoSenha
                  colors={colors}
                  isDarkMode={isDarkMode}
                  rotulo={t('config.novaSenha')}
                  valor={newPassword}
                  aoMudar={setNewPassword}
                  icone="lock-outline"
                />
                <CampoSenha
                  colors={colors}
                  isDarkMode={isDarkMode}
                  rotulo={t('config.confirmarNovaSenha')}
                  valor={confirmPassword}
                  aoMudar={setConfirmPassword}
                  icone="lock-check-outline"
                />

                <TouchableOpacity
                  style={styles.savePasswordButtonWrapper}
                  onPress={handleUpdatePassword}
                  disabled={passwordLoading}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t('config.atualizarSenha')}
                  accessibilityState={{ disabled: passwordLoading, busy: passwordLoading }}
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
                      <Text style={styles.savePasswordButtonText}>{t('config.atualizarSenha')}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Section>

            <Section title={t('config.contatosSos')} colors={colors}>
              <Text style={[styles.sectionSubtitle, { color: colors.subtitle }]}>
                {t('config.contatosSosAjuda')}
              </Text>

              {contactsLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
              ) : contacts.length === 0 ? (
                <View style={styles.emptyContactsContainer}>
                  <MaterialCommunityIcons name="account-multiple-outline" size={48} color={colors.subtitle} />
                  <Text style={[styles.emptyContactsText, { color: colors.subtitle }]}>
                    {t('config.semContatos')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.linkButton, { borderColor: colors.primary }]}
                    onPress={() => {
                      haptics.toque();
                      setCurrentSubScreen('main');
                      router.push('/contatos');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.adicionarContato')}
                  >
                    <Text style={[styles.linkButtonText, { color: colors.primary }]}>
                      {t('config.cadastrarContatos')}
                    </Text>
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
                        index === contacts.length - 1 && styles.lastItem,
                      ]}
                    >
                      <View style={[styles.contactIconBox, { backgroundColor: colors.tintPink }]}>
                        <MaterialCommunityIcons
                          name={item.emergencial ? 'shield-alert' : 'account'}
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
                        accessibilityLabel={t('a11y.marcarEmergencial', { nome: item.name })}
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

  /* ------------------------------------------------------- tela principal */

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <View style={styles.header}>
        <BackHomeButton to="/perfil" />
        <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">
          {t('config.titulo')}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Section title={t('config.secSeguranca')} colors={colors}>
          <SettingItem
            colors={colors}
            icon="shield-lock-outline"
            iconColor={colors.primary}
            iconTint={colors.tintPink}
            title={t('config.senhaTitulo')}
            subtitle={t('config.senhaSubtitulo')}
            onPress={() => {
              haptics.toque();
              setCurrentSubScreen('security');
              fetchContacts();
            }}
          />
          <SettingItem
            colors={colors}
            icon="account-heart-outline"
            iconColor="#7C4DFF"
            iconTint={colors.tintPurple}
            title={t('config.contatosTitulo')}
            subtitle={t('config.contatosSubtitulo')}
            onPress={() => {
              haptics.toque();
              router.push('/contatos');
            }}
          />
          <SettingItem
            colors={colors}
            icon="map-marker-radius-outline"
            iconColor="#2196F3"
            iconTint={colors.tintBlue}
            title={t('config.localizacaoTitulo')}
            subtitle={t('config.localizacaoSubtitulo')}
            rightElement={
              <Switch
                value={isLocationEnabled}
                onValueChange={handleToggleLocation}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFF'}
                accessibilityLabel={t('a11y.alternarLocalizacao')}
              />
            }
            isLast
          />
        </Section>

        <Section title={t('config.secPreferencias')} colors={colors}>
          <SettingItem
            colors={colors}
            icon="bell-outline"
            iconColor="#FF9800"
            iconTint={colors.tintOrange}
            title={t('config.notificacoesTitulo')}
            subtitle={t('config.notificacoesSubtitulo')}
            rightElement={
              <Switch
                value={isNotificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFF'}
                accessibilityLabel={t('a11y.alternarNotificacoes')}
              />
            }
          />
          <View style={[styles.radiusRow, { borderTopColor: colors.border }]}>
            <View style={styles.radiusHeaderRow}>
              <View style={[styles.settingIconBox, { backgroundColor: colors.tintBlue }]}>
                <MaterialCommunityIcons name="radar" size={22} color="#2196F3" />
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{t('config.raioTitulo')}</Text>
                <Text style={[styles.settingSubtitle, { color: colors.subtitle }]}>
                  {t('config.raioSubtitulo')}
                </Text>
              </View>
            </View>
            <View style={styles.radiusPillsRow}>
              {RAIOS.map((valor) => {
                const rotulo = valor >= 1000 ? `${valor / 1000}km` : `${valor}m`;
                const ativo = alertRadius === valor;
                return (
                  <TouchableOpacity
                    key={valor}
                    onPress={() => handleChangeAlertRadius(valor)}
                    style={[
                      styles.radiusPill,
                      {
                        borderColor: ativo ? colors.primary : colors.border,
                        backgroundColor: ativo ? colors.primary : 'transparent',
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                    accessibilityLabel={t('a11y.filtro', { nome: rotulo })}
                  >
                    <Text style={{ color: ativo ? '#FFF' : colors.subtitle, fontWeight: '600', fontSize: 13 }}>
                      {rotulo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Idioma */}
          <View style={[styles.radiusRow, { borderTopColor: colors.border }]}>
            <View style={styles.radiusHeaderRow}>
              <View style={[styles.settingIconBox, { backgroundColor: colors.tintGreen }]}>
                <MaterialCommunityIcons name="translate" size={22} color="#4CAF50" />
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{t('config.idiomaTitulo')}</Text>
                <Text style={[styles.settingSubtitle, { color: colors.subtitle }]}>
                  {t('config.idiomaSubtitulo')}
                </Text>
              </View>
            </View>
            <View style={styles.radiusPillsRow}>
              {IDIOMAS.map((item) => {
                const ativo = idioma === item.codigo;
                const rotulo = t(item.rotuloChave);
                return (
                  <TouchableOpacity
                    key={item.codigo}
                    onPress={() => trocarIdioma(item.codigo)}
                    style={[
                      styles.radiusPill,
                      {
                        borderColor: ativo ? colors.primary : colors.border,
                        backgroundColor: ativo ? colors.primary : 'transparent',
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                    accessibilityLabel={rotulo}
                  >
                    <Text style={{ color: ativo ? '#FFF' : colors.subtitle, fontWeight: '600', fontSize: 13 }}>
                      {rotulo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Section>

        <Section title={t('config.secPrivacidade')} colors={colors}>
          <SettingItem
            colors={colors}
            icon="calculator-variant-outline"
            iconColor="#607D8B"
            iconTint={colors.tintBlue}
            title={t('config.disfarceTitulo')}
            subtitle={t('config.disfarceSubtitulo')}
            rightElement={
              <Switch
                value={disfarce.ativo}
                onValueChange={alternarDisfarce}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFF'}
                accessibilityLabel={t('disfarce.ativar')}
              />
            }
          />
          {disfarce.ativo && (
            <SettingItem
              colors={colors}
              icon="eye-off-outline"
              iconColor="#607D8B"
              iconTint={colors.tintBlue}
              title={t('disfarce.entrarAgora')}
              subtitle={t('disfarce.avisoSaida')}
              onPress={entrarNoDisfarce}
            />
          )}
          <SettingItem
            colors={colors}
            icon="key-variant"
            iconColor="#607D8B"
            iconTint={colors.tintBlue}
            title={t('disfarce.pin')}
            subtitle={t('disfarce.explicacao')}
            onPress={abrirDisfarce}
            isLast
          />
        </Section>

        <Section title={t('config.secAparencia')} colors={colors}>
          <SettingItem
            colors={colors}
            icon="moon-waning-crescent"
            iconColor="#7C4DFF"
            iconTint={colors.tintPurple}
            title={t('config.temaTitulo')}
            subtitle={t('config.temaSubtitulo')}
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={() => {
                  haptics.selecao();
                  toggleTheme();
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFF'}
                accessibilityLabel={t('a11y.alternarTema')}
              />
            }
            isLast
          />
        </Section>

        <Section title={t('config.secSuporte')} colors={colors}>
          <SettingItem
            colors={colors}
            icon="lightbulb-on-outline"
            iconColor="#FFC107"
            iconTint={colors.tintYellow}
            title={t('config.dicasTitulo')}
            subtitle={t('config.dicasSubtitulo')}
            onPress={() => {
              haptics.toque();
              setVocesabiaModalVisible(true);
            }}
          />
          <SettingItem
            colors={colors}
            icon="help-circle-outline"
            iconColor="#2196F3"
            iconTint={colors.tintBlue}
            title={t('config.ajudaTitulo')}
            subtitle={t('config.ajudaSubtitulo')}
            onPress={() => {
              haptics.toque();
              setFaqModalVisible(true);
            }}
            isLast
          />
        </Section>
      </ScrollView>

      {/* Modal do PIN do modo disfarce */}
      <Modal
        visible={disfarceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDisfarceModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <MaterialCommunityIcons name="calculator-variant" size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]} accessibilityRole="header">
                  {t('disfarce.titulo')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDisfarceModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.fecharModal')}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.faqAnswer, { color: colors.subtitle, marginBottom: 18 }]}>
              {t('disfarce.explicacao')}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>{t('disfarce.pin')}</Text>
            <View
              style={[
                styles.inputField,
                { backgroundColor: isDarkMode ? '#2D2D2D' : '#FAFAFA', borderColor: colors.border, marginBottom: 14 },
              ]}
            >
              <MaterialCommunityIcons name="dialpad" size={18} color={colors.primary} style={styles.inputFieldIcon} />
              <TextInput
                style={[styles.inputFieldText, { color: colors.text }]}
                placeholder={t('disfarce.pinPlaceholder')}
                placeholderTextColor={colors.subtitle}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
                value={pinDigitado}
                onChangeText={(v) => setPinDigitado(v.replace(/\D/g, ''))}
                accessibilityLabel={t('disfarce.pin')}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>{t('disfarce.pinConfirmar')}</Text>
            <View
              style={[
                styles.inputField,
                { backgroundColor: isDarkMode ? '#2D2D2D' : '#FAFAFA', borderColor: colors.border },
              ]}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={18}
                color={colors.primary}
                style={styles.inputFieldIcon}
              />
              <TextInput
                style={[styles.inputFieldText, { color: colors.text }]}
                placeholder={t('disfarce.pinConfirmar')}
                placeholderTextColor={colors.subtitle}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
                value={pinConfirmado}
                onChangeText={(v) => setPinConfirmado(v.replace(/\D/g, ''))}
                accessibilityLabel={t('disfarce.pinConfirmar')}
              />
            </View>

            {erroPin && (
              <Text style={{ color: '#C62828', fontSize: 13, marginTop: 12, fontWeight: '600' }}
                accessibilityLiveRegion="assertive">
                {erroPin}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.primary, marginTop: 22 }]}
              onPress={salvarPinDisfarce}
              accessibilityRole="button"
              accessibilityLabel={t('comum.salvar')}
            >
              <Text style={styles.closeButtonText}>{t('comum.salvar')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Central de Ajuda / FAQ */}
      <Modal
        visible={faqModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFaqModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]} accessibilityRole="header">
                {t('config.faqTitulo')}
              </Text>
              <TouchableOpacity
                onPress={() => setFaqModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.fecharModal')}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.faqScroll}>
              {([1, 2, 3, 4, 5, 6] as const).map((n) => (
                <View key={n} style={styles.faqItem}>
                  <Text style={[styles.faqQuestion, { color: colors.primary }]}>
                    {t(`config.faqP${n}` as 'config.faqP1')}
                  </Text>
                  <Text style={[styles.faqAnswer, { color: colors.text }]}>
                    {t(`config.faqR${n}` as 'config.faqR1')}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={() => setFaqModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t('config.entendido')}
            >
              <Text style={styles.closeButtonText}>{t('config.entendido')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Você Sabia? */}
      <Modal
        visible={vocesabiaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVocesabiaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <MaterialCommunityIcons name="lightbulb-on" size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]} accessibilityRole="header">
                  {t('config.dicasTitulo')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setVocesabiaModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.fecharModal')}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.faqScroll}>
              <Text style={{ fontSize: 13, color: colors.subtitle, marginBottom: 15, lineHeight: 18 }}>
                {t('config.dicasIntro')}
              </Text>

              <DicaBloco
                colors={colors}
                icone="scale-balance"
                titulo={t('config.dica1Titulo')}
                linhas={[t('config.dica1Texto')]}
              />
              <DicaBloco
                colors={colors}
                icone="bus-alert"
                titulo={t('config.dica2Titulo')}
                linhas={[t('config.dica2Texto')]}
              />
              <DicaBloco
                colors={colors}
                icone="heart-pulse"
                titulo={t('config.dica3Titulo')}
                linhas={[t('config.dica3Linha1'), t('config.dica3Linha2'), t('config.dica3Linha3')]}
                destacarPrimeira
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={() => setVocesabiaModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t('comum.fechar')}
            >
              <Text style={styles.closeButtonText}>{t('comum.fechar')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CampoSenha = ({ colors, isDarkMode, rotulo, valor, aoMudar, icone }: any) => (
  <View style={styles.inputContainer}>
    <Text style={[styles.inputLabel, { color: colors.text }]}>{rotulo}</Text>
    <View
      style={[
        styles.inputField,
        { backgroundColor: isDarkMode ? '#2D2D2D' : '#FAFAFA', borderColor: colors.border },
      ]}
    >
      <MaterialCommunityIcons name={icone} size={18} color={colors.primary} style={styles.inputFieldIcon} />
      <TextInput
        style={[styles.inputFieldText, { color: colors.text }]}
        placeholder={rotulo}
        placeholderTextColor={colors.subtitle}
        secureTextEntry
        value={valor}
        onChangeText={aoMudar}
        accessibilityLabel={rotulo}
      />
    </View>
  </View>
);

const DicaBloco = ({ colors, icone, titulo, linhas, destacarPrimeira }: any) => (
  <View style={styles.faqItem}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <MaterialCommunityIcons name={icone} size={20} color={colors.primary} />
      <Text style={[styles.faqQuestion, { color: colors.primary, marginBottom: 0, flexShrink: 1 }]}>
        {titulo}
      </Text>
    </View>
    {linhas.map((linha: string, i: number) => (
      <Text
        key={i}
        style={[
          styles.faqAnswer,
          { color: colors.text, marginBottom: i === linhas.length - 1 ? 0 : 4 },
          destacarPrimeira && i === 0 && { fontWeight: 'bold' },
        ]}
      >
        {linha}
      </Text>
    ))}
  </View>
);

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
      style={[styles.settingItem, { borderBottomColor: colors.border }, isLast && styles.lastItem]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${title}. ${subtitle ?? ''}`.trim() : undefined}
    >
      <View style={[styles.settingIconBox, { backgroundColor: iconTint }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.subtitle }]}>{subtitle}</Text>}
      </View>
      {rightElement ? rightElement : onPress && (
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.subtitle} />
      )}
    </TouchableOpacity>
  );
};

const Section = ({ title, children, colors }: any) => {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionHeader, { color: colors.subtitle }]} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.cardBg }]}>{children}</View>
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
    fontFamily: Fonts.display,
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
    minHeight: 68,
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
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    minHeight: 40,
    justifyContent: 'center',
  },
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
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
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
    fontFamily: Fonts.display,
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
