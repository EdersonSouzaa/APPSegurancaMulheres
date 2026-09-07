import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  Alert,
  ActivityIndicator,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getStyles } from '../styles/home.styles';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { Colors } from '../constants/theme';
import { haptics } from '../lib/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocation } from '../hooks/use-location';
import { obterPerfil, atualizarPreferencias } from '../services/usuario';
import { obterAlertas } from '../services/alertas';
import { listarContatos } from '../services/contatos';
import { atualizarOcorrencia, excluirOcorrencia } from '../services/ocorrencias';
import { acionarSos } from '../services/sos';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { FakeCallModal } from '../components/FakeCallModal';
import { ToastNotification } from '../components/ToastNotification';
import { SuccessPopup } from '../components/SuccessPopup';
import { LeafletMap } from '../components/LeafletMap';

const TRUST_COLORS = ['#F5A623', '#7C4DFF', '#2196F3', '#4CAF50', '#FF7043'];
const FORTALEZA_CENTER: [number, number] = [-3.766, -38.483];

/** Chave da saudação conforme a hora do aparelho. */
const chaveDaSaudacao = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'home.bomDia' as const;
  if (hora < 18) return 'home.boaTarde' as const;
  return 'home.boaNoite' as const;
};

const Home = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, theme } = useTheme();
  const { t, locale } = useI18n();
  const [modalVisible, setModalVisible] = useState(false);
  const [moreActionsVisible, setMoreActionsVisible] = useState(false);
  const [locationPopupVisible, setLocationPopupVisible] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [userName, setUserName] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [trustedContacts, setTrustedContacts] = useState<any[]>([]);
  const [fakeCallVisible, setFakeCallVisible] = useState(false);
  const [silentAlertLoading, setSilentAlertLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger' | 'info'>('success');
  const { coords } = useLocation();

  // Pulsação sutil no botão SOS da barra de navegação
  const sosPulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(sosPulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sosPulseAnim]);

  // Edição/exclusão de ocorrências direto pelos cards da home
  const [editingOccurrence, setEditingOccurrence] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<'error' | 'warning'>('error');
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccessVisible, setEditSuccessVisible] = useState(false);

  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const showToast = (message: string, type: 'success' | 'danger' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const loadUserData = useCallback(async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        const firstName = user.name.split(' ')[0];
        setUserName(firstName);
        setProfilePicture(user.profile_picture || null);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }, []);

  const loadLocationPreference = useCallback(async () => {
    try {
      const userData = await obterPerfil();
      if (userData) {
        setLocationEnabled(userData.location_enabled || false);
        await AsyncStorage.setItem('@notifications_enabled', String(userData.notifications_enabled));
      }
    } catch (error) {
      console.error('Erro ao carregar preferência de localização:', error);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await obterAlertas();
      setOccurrences((data.alerts || []).filter((item) => item.source === 'ocorrencia'));
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    }
  }, []);

  const loadTrustedContacts = useCallback(async () => {
    try {
      const data = (await listarContatos()) || [];

      // Mostra todos os contatos cadastrados, com os emergenciais na frente.
      // Antes o filtro deixava só os emergenciais, então quem cadastrava um
      // contato sem marcar o switch via o círculo vazio e achava que o
      // cadastro tinha falhado.
      setTrustedContacts([
        ...data.filter((c) => c.emergencial),
        ...data.filter((c) => !c.emergencial),
      ]);
    } catch (error) {
      console.error('Erro ao carregar círculo de confiança:', error);
    }
  }, []);

  const formatAlertTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const day = d.toLocaleDateString(locale, { day: '2-digit', month: 'long' });
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return `${day}, ${time}`;
  };

  const openEditOccurrence = (item: any) => {
    setEditingOccurrence(item);
    setEditTitle(item.title ?? '');
    setEditDescription(item.description ?? '');
    setEditType(item.type === 'warning' ? 'warning' : 'error');
  };

  const closeEditOccurrence = () => {
    setEditingOccurrence(null);
    setEditTitle('');
    setEditDescription('');
    setEditType('error');
  };

  const canSaveEdit = editTitle.trim().length > 0 && editDescription.trim().length > 0;

  const handleSaveEditOccurrence = async () => {
    if (!editingOccurrence || !canSaveEdit || editSaving) return;
    haptics.acao();
    setEditSaving(true);
    try {
      await atualizarOcorrencia(editingOccurrence.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        type: editType,
      });
      setOccurrences((prev) =>
        prev.map((o) =>
          o.id === editingOccurrence.id
            ? { ...o, title: editTitle.trim(), description: editDescription.trim(), type: editType }
            : o
        )
      );
      haptics.sucesso();
      closeEditOccurrence();
      setEditSuccessVisible(true);
    } catch (e: any) {
      haptics.erro();
      Alert.alert(t('comum.erro'), e?.message ?? t('home.erroAtualizar'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteOccurrence = (item: any) => {
    haptics.aviso();
    Alert.alert(t('home.excluirTitulo'), t('home.excluirPergunta'), [
      { text: t('comum.cancelar'), style: 'cancel' },
      {
        text: t('comum.excluir'),
        style: 'destructive',
        onPress: async () => {
          try {
            await excluirOcorrencia(item.id);
            setOccurrences((prev) => prev.filter((o) => o.id !== item.id));
            haptics.sucesso();
            showToast(t('home.ocorrenciaExcluida'), 'success');
          } catch (e: any) {
            haptics.erro();
            Alert.alert(t('comum.erro'), e?.message ?? t('home.erroExcluir'));
          }
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadLocationPreference();
      loadAlerts();
      loadTrustedContacts();
    }, [loadUserData, loadLocationPreference, loadAlerts, loadTrustedContacts])
  );

  const handleShareLocation = async () => {
    if (!coords) {
      setLocationPopupVisible(true);
      return;
    }
    haptics.acao();
    const url = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
    try {
      await Share.share({ message: t('home.localizacaoMensagem', { url }) });
    } catch {
      haptics.erro();
      showToast(t('home.erroCompartilhar'), 'danger');
    }
  };

  const handleSilentAlert = async () => {
    // Sem som e sem alerta na tela — mas com vibração, que é o único retorno
    // possível quando olhar o aparelho não é uma opção.
    haptics.emergencia();
    setSilentAlertLoading(true);
    try {
      const locationString = coords
        ? `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`
        : null;

      const response = await acionarSos(locationString);
      const contatos = response.contatosEmergencia || [];

      showToast(
        contatos.length === 0 ? t('home.semContatoEmergencial') : t('home.alertaDiscretoEnviado'),
        contatos.length === 0 ? 'info' : 'success'
      );
    } catch {
      showToast(t('home.erroAlertaSilencioso'), 'danger');
    } finally {
      setSilentAlertLoading(false);
    }
  };

  const userInitial = (userName || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? colors.cardBackground : "#FFF"} />

      <ToastNotification visible={toastVisible} message={toastMessage} type={toastType} onClose={() => setToastVisible(false)} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerContent}>
              <Text style={styles.headerGreeting} numberOfLines={1}>
                {t(chaveDaSaudacao())} <Text style={styles.headerName}>{userName || t('home.usuaria')}</Text>
              </Text>
              <View style={styles.headerSubtitleRow}>
                <Text style={styles.headerSubtitleText}>{t('home.voceEstaSegura')}</Text>
                <MaterialCommunityIcons name="heart" size={14} color={colors.primary} style={styles.headerSubtitleIcon} />
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerBellButton}
                onPress={() => {
                  haptics.toque();
                  router.push('/alertas' as any);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.verAlertas')}
              >
                <MaterialCommunityIcons name="bell-outline" size={22} color={colors.primary} />
                {occurrences.length > 0 && (
                  <View style={styles.headerBellBadge}>
                    <Text style={styles.headerBellBadgeText}>{occurrences.length > 9 ? '9+' : occurrences.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerAvatar}
                onPress={() => {
                  haptics.toque();
                  router.push('/perfil');
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.editarPerfil')}
              >
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={{ width: 42, height: 42, borderRadius: 21 }} />
                ) : (
                  <Text style={styles.headerAvatarText}>{userInitial}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.content, { paddingBottom: 100 + insets.bottom }]}>
          {/* Card de status com preview do mapa em tempo real */}
          <TouchableOpacity
            style={styles.statusCard}
            activeOpacity={0.9}
            onPress={() => {
              haptics.toque();
              if (locationEnabled) {
                router.push('/mapa');
              } else {
                setLocationPopupVisible(true);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.rotaSegura')}
          >
            <View style={styles.statusMapPreview}>
              <LeafletMap
                userCoords={coords}
                riskZones={[]}
                incidents={[]}
                showIncidents={false}
                interactive={false}
                initialCenter={coords ? [coords.latitude, coords.longitude] : FORTALEZA_CENTER}
                initialZoom={15}
                isDarkMode={isDarkMode}
              />
            </View>
          </TouchableOpacity>

          {/* Ações rápidas */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('home.acoesRapidas')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                haptics.toque();
                setMoreActionsVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.abrirMenu')}
            >
              <Text style={styles.sectionLink}>{t('home.verTodas')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickAccessGrid}>
            <QuickActionCard
              styles={styles}
              color="#F35F74"
              tint={isDarkMode ? '#F35F7433' : '#FFF0F2'}
              icon="navigation-variant-outline"
              label={t('home.rotaSegura')}
              sublabel={t('home.rotaSeguraSub')}
              a11y={t('a11y.rotaSegura')}
              onPress={() => {
                haptics.toque();
                router.push('/mapa');
              }}
            />
            <QuickActionCard
              styles={styles}
              color="#2196F3"
              tint={isDarkMode ? '#2196F333' : '#E3F2FD'}
              icon="crosshairs-gps"
              label={t('home.compartilharLocal')}
              sublabel={t('home.compartilharLocalSub')}
              a11y={t('a11y.compartilharLocal')}
              onPress={handleShareLocation}
            />
            <QuickActionCard
              styles={styles}
              color="#9C27B0"
              tint={isDarkMode ? '#9C27B033' : '#F3E5F5'}
              icon="phone-alert-outline"
              label={t('home.chamadaFalsa')}
              sublabel={t('home.chamadaFalsaSub')}
              a11y={t('a11y.chamadaFalsa')}
              onPress={() => {
                haptics.toque();
                setFakeCallVisible(true);
              }}
            />
            <QuickActionCard
              styles={styles}
              color="#FF9800"
              tint={isDarkMode ? '#FF980033' : '#FFF3E0'}
              icon="bell-off-outline"
              label={t('home.alertaSilencioso')}
              sublabel={t('home.alertaSilenciosoSub')}
              a11y={t('a11y.alertaSilencioso')}
              onPress={handleSilentAlert}
              loading={silentAlertLoading}
            />
          </View>

          {/* Círculo de confiança */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('home.circuloConfianca')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/contatos')}
              accessibilityRole="button"
              accessibilityLabel={t('home.gerenciar')}
            >
              <Text style={styles.sectionLink}>{t('home.gerenciar')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trustCircleRow}>
            <TouchableOpacity
              style={styles.trustCircleItem}
              activeOpacity={0.8}
              onPress={() => {
                haptics.toque();
                router.push('/contatos');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.adicionarContato')}
            >
              <View style={styles.trustCircleAddButton}>
                <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
              </View>
              <Text style={styles.trustCircleName}>{t('home.adicionar')}</Text>
            </TouchableOpacity>

            {trustedContacts.map((contact, index) => (
              <TouchableOpacity
                key={contact.id}
                style={styles.trustCircleItem}
                activeOpacity={0.8}
                onPress={() => router.push('/contatos')}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.editarContato', { nome: contact.name })}
              >
                <View style={[styles.trustCircleAvatar, { backgroundColor: TRUST_COLORS[index % TRUST_COLORS.length] }]}>
                  <Text style={styles.trustCircleAvatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.trustCircleName} numberOfLines={1}>{contact.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Ocorrências Recentes */}
          <View style={styles.recentSectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('home.ocorrenciasRecentes')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                haptics.toque();
                setModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.verOcorrencias')}
            >
              <Text style={styles.sectionLink}>{t('home.verTodas')} ❯</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.recentRegisterButton}
            activeOpacity={0.85}
            onPress={() => {
              haptics.toque();
              router.push('/ocorrencias');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.reportarOcorrencia')}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#FFF" />
            <Text style={styles.recentRegisterButtonText}>{t('home.registrarOcorrencia')}</Text>
          </TouchableOpacity>

          <View style={{ gap: 15 }}>
            {occurrences.length === 0 ? (
              <View style={styles.emptyOccurrenceCard}>
                <View style={styles.emptyOccurrenceIconBox}>
                  <MaterialCommunityIcons name="shield-check-outline" size={36} color="#34C759" />
                </View>
                <Text style={styles.emptyOccurrenceTitle}>{t('home.semOcorrenciasTitulo')}</Text>
                <Text style={styles.emptyOccurrenceSubtitle}>{t('home.semOcorrenciasTexto')}</Text>
              </View>
            ) : (
              occurrences.slice(0, 2).map((item) => (
                <OccurrenceCard
                  key={`${item.source}-${item.id}`}
                  styles={styles}
                  colors={colors}
                  title={item.title}
                  description={item.description}
                  time={formatAlertTime(item.created_at)}
                  source={item.source}
                  onEdit={() => openEditOccurrence(item)}
                  onDelete={() => handleDeleteOccurrence(item)}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Barra de Navegação Inferior */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 15) }]}>
        <NavItem active icon={<MaterialIcons name="home" size={26} color={colors.primary} />} label={t('nav.inicio')} styles={styles} />
        <NavItem icon={<MaterialCommunityIcons name="map-outline" size={26} color={colors.secondary} />} label={t('nav.mapa')} onPress={() => router.push('/mapa')} styles={styles} />
        <View style={styles.sosNavItem}>
          <View style={styles.sosPulseWrapper}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sosPulseRing,
                {
                  backgroundColor: colors.primary,
                  opacity: sosPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
                  transform: [{ scale: sosPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
                },
              ]}
            />
            <TouchableOpacity
              style={styles.sosNavButtonTouchable}
              activeOpacity={0.85}
              onPress={() => {
                haptics.emergencia();
                router.push('/sos' as any);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.acionarSos')}
              accessibilityHint={t('a11y.acionarSosDica')}
            >
              <LinearGradient
                colors={[colors.primary, '#C2185B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sosNavButton}
              >
                <Text style={styles.sosNavButtonText}>SOS</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        <NavItem icon={<MaterialCommunityIcons name="account-plus-outline" size={26} color={colors.secondary} />} label={t('nav.contatos')} onPress={() => router.push('/contatos')} styles={styles} />
        <NavItem icon={<MaterialCommunityIcons name="account-circle-outline" size={26} color={colors.secondary} />} label={t('nav.perfil')} onPress={() => router.push('/perfil')} styles={styles} />
      </View>

      <FakeCallModal visible={fakeCallVisible} onClose={() => setFakeCallVisible(false)} />

      {/* POPUP DE ATIVAÇÃO DE LOCALIZAÇÃO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={locationPopupVisible}
        onRequestClose={() => setLocationPopupVisible(false)}
      >
        <View style={styles.locationPopupOverlay}>
          <View style={styles.locationPopupContent}>
            <View style={styles.locationPopupIconBox}>
              <MaterialCommunityIcons name="map-marker-radius" size={48} color={colors.primary} />
            </View>
            <Text style={styles.locationPopupTitle} accessibilityRole="header">
              {t('home.ativarLocalizacaoTitulo')}
            </Text>
            <Text style={styles.locationPopupDescription}>{t('home.ativarLocalizacaoTexto')}</Text>
            <TouchableOpacity
              style={[styles.locationPopupButton, { backgroundColor: colors.primary }]}
              onPress={async () => {
                haptics.acao();
                setLocationLoading(true);
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();

                  if (status !== 'granted') {
                    setLocationLoading(false);
                    haptics.aviso();
                    Alert.alert(t('home.permissaoNegadaTitulo'), t('home.permissaoNegadaTexto'), [{ text: 'OK' }]);
                    return;
                  }

                  await atualizarPreferencias({ notifications_enabled: true, location_enabled: true });
                  setLocationEnabled(true);

                  setLocationLoading(false);
                  setLocationPopupVisible(false);
                  haptics.sucesso();

                  if (Constants.appOwnership !== 'expo') {
                    const Notifications = require('expo-notifications');
                    const { status: notifStatus } = await Notifications.getPermissionsAsync();
                    if (notifStatus !== 'granted') {
                      await Notifications.requestPermissionsAsync();
                    }
                    await Notifications.scheduleNotificationAsync({
                      content: {
                        title: t('home.notifLocalizacaoTitulo'),
                        body: t('home.notifLocalizacaoTexto'),
                        sound: true,
                      },
                      trigger: null,
                    });
                  }
                  router.push('/mapa');
                } catch (error) {
                  setLocationLoading(false);
                  haptics.erro();
                  Alert.alert(t('comum.erro'), t('home.erroAtivarLocalizacao'));
                }
              }}
              activeOpacity={0.8}
              disabled={locationLoading}
              accessibilityRole="button"
              accessibilityLabel={t('home.ativarLocalizacaoBotao')}
              accessibilityState={{ disabled: locationLoading, busy: locationLoading }}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.locationPopupButtonText}>{t('home.ativarLocalizacaoBotao')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locationPopupCancelButton}
              onPress={() => setLocationPopupVisible(false)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('home.agoraNao')}
            >
              <Text style={styles.locationPopupCancelText}>{t('home.agoraNao')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* POPUP DE OCORRÊNCIAS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t('home.ultimasOcorrencias')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.fecharModal')}
              >
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {occurrences.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, color: colors.secondary }}>{t('home.nenhumaEncontrada')}</Text>
              ) : (
                occurrences.map((item) => (
                  <OccurrenceCard
                    key={`${item.source}-${item.id}`}
                    styles={styles}
                    colors={colors}
                    title={item.title}
                    description={item.description}
                    time={formatAlertTime(item.created_at)}
                    source={item.source}
                    onEdit={() => {
                      setModalVisible(false);
                      openEditOccurrence(item);
                    }}
                    onDelete={() => handleDeleteOccurrence(item)}
                  />
                ))
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL "VER TODAS" AÇÕES */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={moreActionsVisible}
        onRequestClose={() => setMoreActionsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t('home.todasAcoes')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setMoreActionsVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.fecharModal')}
              >
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <MoreActionRow
              styles={styles}
              colors={colors}
              icon="file-alert-outline"
              label={t('home.acaoOcorrencias')}
              onPress={() => { setMoreActionsVisible(false); router.push('/ocorrencias'); }}
            />
            <MoreActionRow
              styles={styles}
              colors={colors}
              icon="account-heart-outline"
              label={t('home.acaoContatos')}
              onPress={() => { setMoreActionsVisible(false); router.push('/contatos'); }}
            />
            <MoreActionRow
              styles={styles}
              colors={colors}
              icon="bell-outline"
              label={t('home.acaoAlertas')}
              onPress={() => { setMoreActionsVisible(false); router.push('/alertas' as any); }}
            />
            <MoreActionRow
              styles={styles}
              colors={colors}
              icon="map-marker-alert-outline"
              label={t('home.acaoAreasRisco')}
              onPress={() => { setMoreActionsVisible(false); router.push('/mapa' as any); }}
            />
            <MoreActionRow
              styles={styles}
              colors={colors}
              icon="cog-outline"
              label={t('home.acaoAjustes')}
              onPress={() => { setMoreActionsVisible(false); router.push('/settings'); }}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL DE EDIÇÃO DE OCORRÊNCIA */}
      <Modal
        animationType="slide"
        transparent
        visible={!!editingOccurrence}
        onRequestClose={closeEditOccurrence}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {t('home.editarOcorrencia')}
                </Text>
                <Text style={{ fontSize: 13, color: colors.secondary, marginTop: 2 }}>{t('home.atualizeAbaixo')}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeEditOccurrence}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.fecharModal')}
              >
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.editTypeRow}>
              <TouchableOpacity
                style={[styles.editTypeChip, editType === 'error' && styles.editTypeChipActiveError]}
                onPress={() => {
                  haptics.selecao();
                  setEditType('error');
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: editType === 'error' }}
                accessibilityLabel={t('mapa.emergencia')}
              >
                <MaterialCommunityIcons name="alert-decagram" size={16} color={editType === 'error' ? '#FFF' : '#E53935'} />
                <Text style={[styles.editTypeChipText, editType === 'error' && styles.editTypeChipTextActive]}>{t('mapa.emergencia')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editTypeChip, editType === 'warning' && styles.editTypeChipActiveWarning]}
                onPress={() => {
                  haptics.selecao();
                  setEditType('warning');
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: editType === 'warning' }}
                accessibilityLabel={t('mapa.atencaoTipo')}
              >
                <MaterialCommunityIcons name="alert" size={16} color={editType === 'warning' ? '#FFF' : '#FB8C00'} />
                <Text style={[styles.editTypeChipText, editType === 'warning' && styles.editTypeChipTextActive]}>{t('mapa.atencaoTipo')}</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder={t('home.tituloOcorrencia')}
              placeholderTextColor={colors.secondary}
              maxLength={40}
              accessibilityLabel={t('home.tituloOcorrencia')}
            />
            <TextInput
              style={[styles.editInput, styles.editTextArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder={t('home.descrevaOqueAconteceu')}
              placeholderTextColor={colors.secondary}
              multiline
              textAlignVertical="top"
              maxLength={160}
              accessibilityLabel={t('home.descrevaOqueAconteceu')}
            />

            <TouchableOpacity
              style={[styles.editSaveButton, (!canSaveEdit || editSaving) && styles.editSaveButtonDisabled]}
              activeOpacity={0.85}
              onPress={handleSaveEditOccurrence}
              disabled={!canSaveEdit || editSaving}
              accessibilityRole="button"
              accessibilityLabel={t('home.salvarAlteracoes')}
              accessibilityState={{ disabled: !canSaveEdit || editSaving, busy: editSaving }}
            >
              {editSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={22} color="#FFF" />
                  <Text style={styles.editSaveButtonText}>{t('home.salvarAlteracoes')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SuccessPopup
        visible={editSuccessVisible}
        onContinue={() => setEditSuccessVisible(false)}
        title={t('home.ocorrenciaAtualizada')}
        message={t('home.ocorrenciaAtualizadaTexto')}
        continueLabel={t('comum.continuar')}
      />
    </SafeAreaView>
  );
};

// --- COMPONENTES AUXILIARES ---

const QuickActionCard = ({ icon, label, sublabel, a11y, onPress, styles, color, tint, loading }: any) => (
  <TouchableOpacity
    style={styles.quickAccessCard}
    activeOpacity={0.7}
    onPress={onPress}
    disabled={loading}
    accessibilityRole="button"
    accessibilityLabel={a11y ?? label}
    accessibilityHint={sublabel}
    accessibilityState={{ disabled: !!loading, busy: !!loading }}
  >
    <View style={[styles.quickAccessIconBox, { backgroundColor: tint }]}>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      )}
    </View>
    <Text style={styles.quickAccessLabel}>{label}</Text>
    <Text style={styles.quickAccessSubLabel}>{sublabel}</Text>
  </TouchableOpacity>
);

const MoreActionRow = ({ icon, label, onPress, styles, colors }: any) => (
  <TouchableOpacity
    style={styles.moreActionsRow}
    activeOpacity={0.7}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <View style={styles.moreActionsIconBox}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
    </View>
    <Text style={styles.moreActionsLabel}>{label}</Text>
    <MaterialIcons name="chevron-right" size={22} color={colors.secondary} style={{ marginLeft: 'auto' }} />
  </TouchableOpacity>
);

const OccurrenceCard = ({ title, description, time, source, styles, colors, onEdit, onDelete }: any) => (
  <View style={styles.occurrenceCard}>
    <View style={styles.occurrenceIconBox}>
      <MaterialCommunityIcons
        name={source === 'sos' ? 'shield-alert' : 'alert-circle'}
        size={30}
        color={source === 'sos' ? '#FF5252' : colors.primary}
      />
    </View>
    <View style={styles.occurrenceInfo}>
      <Text style={styles.occurrenceTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.occurrenceDescription} numberOfLines={2}>{description}</Text>
      <View style={styles.occurrenceTimeRow}>
        <MaterialCommunityIcons name="clock-outline" size={12} color={colors.secondary} />
        <Text style={styles.occurrenceTime} numberOfLines={1}>{time}</Text>
      </View>
    </View>
    {(onEdit || onDelete) && (
      <View style={styles.occurrenceActionsRow}>
        {onEdit && (
          <TouchableOpacity
            style={styles.occurrenceActionButton}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={onEdit}
          >
            <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            style={[styles.occurrenceActionButton, styles.occurrenceActionButtonDanger]}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={onDelete}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#E53935" />
          </TouchableOpacity>
        )}
      </View>
    )}
  </View>
);

const NavItem = ({ active, icon, label, onPress, styles }: any) => (
  <TouchableOpacity
    style={styles.navItem}
    activeOpacity={0.7}
    onPress={onPress}
    accessibilityRole="tab"
    accessibilityState={{ selected: !!active }}
    accessibilityLabel={label}
  >
    <View style={active ? styles.navIconActive : undefined}>
      {icon}
    </View>
    <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

export default Home;
