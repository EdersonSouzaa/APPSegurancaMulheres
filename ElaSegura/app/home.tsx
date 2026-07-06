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
import { Colors } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocation } from '../hooks/use-location';
import { api } from '../services/api';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { FakeCallModal } from '../components/FakeCallModal';
import { ToastNotification } from '../components/ToastNotification';
import { SuccessPopup } from '../components/SuccessPopup';
import { LeafletMap } from '../components/LeafletMap';

const TRUST_COLORS = ['#F5A623', '#7C4DFF', '#2196F3', '#4CAF50', '#FF7043'];
const FORTALEZA_CENTER: [number, number] = [-3.766, -38.483];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia,';
  if (hour < 18) return 'Boa tarde,';
  return 'Boa noite,';
};

const Home = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, theme } = useTheme();
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
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const userData = await api.get('/user/me', token);
        if (userData) {
          setLocationEnabled(userData.location_enabled || false);
          await AsyncStorage.setItem('@notifications_enabled', String(userData.notifications_enabled));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar preferência de localização:', error);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const data = await api.get('/alertas', token);
        const occurrencesOnly = (data.alerts || []).filter((item: any) => item.source === 'ocorrencia');
        setOccurrences(occurrencesOnly);
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    }
  }, []);

  const loadTrustedContacts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const data = await api.get('/contatos', token);
        const emergenciais = (data || []).filter((c: any) => c.emergencial);
        setTrustedContacts(emergenciais);
      }
    } catch (error) {
      console.error('Erro ao carregar círculo de confiança:', error);
    }
  }, []);

  const formatAlertTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
    setEditSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Atenção', 'Faça login para editar esta ocorrência.');
        return;
      }
      await api.put(
        `/ocorrencias/${editingOccurrence.id}`,
        { title: editTitle.trim(), description: editDescription.trim(), type: editType },
        token
      );
      setOccurrences((prev) =>
        prev.map((o) =>
          o.id === editingOccurrence.id
            ? { ...o, title: editTitle.trim(), description: editDescription.trim(), type: editType }
            : o
        )
      );
      closeEditOccurrence();
      setEditSuccessVisible(true);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível atualizar a ocorrência.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteOccurrence = (item: any) => {
    Alert.alert(
      'Excluir ocorrência',
      'Tem certeza que deseja excluir esta ocorrência? Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              if (!token) {
                Alert.alert('Atenção', 'Faça login para excluir esta ocorrência.');
                return;
              }
              await api.delete(`/ocorrencias/${item.id}`, token);
              setOccurrences((prev) => prev.filter((o) => o.id !== item.id));
              showToast('Ocorrência excluída com sucesso!', 'success');
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível excluir a ocorrência.');
            }
          },
        },
      ]
    );
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
    const url = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
    try {
      await Share.share({
        message: `📍 Esta é minha localização em tempo real:\n${url}\n— Enviado pelo ElaSegura`,
      });
    } catch {
      showToast('Não foi possível compartilhar a localização.', 'danger');
    }
  };

  const handleSilentAlert = async () => {
    setSilentAlertLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const locationString = coords
        ? `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`
        : 'Localização não disponível';

      const response = await api.post('/sos', { location: locationString }, token);
      const contatos = response.contatosEmergencia || [];

      if (contatos.length === 0) {
        showToast('Nenhum contato emergencial para notificar.', 'info');
      } else {
        showToast('Alerta discreto enviado ao seu círculo de confiança.', 'success');
      }
    } catch {
      showToast('Não foi possível enviar o alerta silencioso.', 'danger');
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
                {getGreeting()} <Text style={styles.headerName}>{userName || 'Usuária'}</Text>
              </Text>
              <View style={styles.headerSubtitleRow}>
                <Text style={styles.headerSubtitleText}>Você está segura aqui</Text>
                <MaterialCommunityIcons name="heart" size={14} color={colors.primary} style={styles.headerSubtitleIcon} />
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerBellButton}
                onPress={() => router.push('/alertas' as any)}
                activeOpacity={0.8}
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
                onPress={() => router.push('/perfil')}
                activeOpacity={0.8}
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
              if (locationEnabled) {
                router.push('/mapa');
              } else {
                setLocationPopupVisible(true);
              }
            }}
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
            <Text style={styles.sectionTitle}>Ações rápidas</Text>
            <TouchableOpacity onPress={() => setMoreActionsVisible(true)}>
              <Text style={styles.sectionLink}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickAccessGrid}>
            <QuickActionCard
              styles={styles}
              color="#F35F74"
              tint={isDarkMode ? '#F35F7433' : '#FFF0F2'}
              icon="navigation-variant-outline"
              label="Rota segura"
              sublabel="Navegue com segurança"
              onPress={() => router.push('/mapa')}
            />
            <QuickActionCard
              styles={styles}
              color="#2196F3"
              tint={isDarkMode ? '#2196F333' : '#E3F2FD'}
              icon="crosshairs-gps"
              label="Compartilhar local"
              sublabel="Ao vivo com contatos"
              onPress={handleShareLocation}
            />
            <QuickActionCard
              styles={styles}
              color="#9C27B0"
              tint={isDarkMode ? '#9C27B033' : '#F3E5F5'}
              icon="phone-alert-outline"
              label="Chamada falsa"
              sublabel="Escape de situações"
              onPress={() => setFakeCallVisible(true)}
            />
            <QuickActionCard
              styles={styles}
              color="#FF9800"
              tint={isDarkMode ? '#FF980033' : '#FFF3E0'}
              icon="bell-off-outline"
              label="Alerta silencioso"
              sublabel="SOS discreto"
              onPress={handleSilentAlert}
              loading={silentAlertLoading}
            />
          </View>

          {/* Círculo de confiança */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Círculo de confiança</Text>
            <TouchableOpacity onPress={() => router.push('/contatos')}>
              <Text style={styles.sectionLink}>Gerenciar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trustCircleRow}>
            {trustedContacts.map((contact, index) => (
              <TouchableOpacity
                key={contact.id}
                style={styles.trustCircleItem}
                activeOpacity={0.8}
                onPress={() => router.push('/contatos')}
              >
                <View style={[styles.trustCircleAvatar, { backgroundColor: TRUST_COLORS[index % TRUST_COLORS.length] }]}>
                  <Text style={styles.trustCircleAvatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.trustCircleName} numberOfLines={1}>{contact.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.trustCircleItem} activeOpacity={0.8} onPress={() => router.push('/contatos')}>
              <View style={styles.trustCircleAddButton}>
                <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
              </View>
              <Text style={styles.trustCircleName}>Adicionar</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Ocorrências Recentes */}
          <View style={styles.recentSectionHeader}>
            <Text style={styles.sectionTitle}>Ocorrências Recentes</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={styles.sectionLink}>Ver todas ❯</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.recentRegisterButton}
            activeOpacity={0.85}
            onPress={() => router.push('/ocorrencias')}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#FFF" />
            <Text style={styles.recentRegisterButtonText}>Registrar ocorrência</Text>
          </TouchableOpacity>

          <View style={{ gap: 15 }}>
            {occurrences.length === 0 ? (
              <View style={styles.emptyOccurrenceCard}>
                <View style={styles.emptyOccurrenceIconBox}>
                  <MaterialCommunityIcons name="shield-check-outline" size={36} color="#34C759" />
                </View>
                <Text style={styles.emptyOccurrenceTitle}>Nenhuma ocorrência recente</Text>
                <Text style={styles.emptyOccurrenceSubtitle}>
                  Tudo tranquilo por aqui! Se algo acontecer, registre para manter seu círculo de confiança informado.
                </Text>
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
        <NavItem active icon={<MaterialIcons name="home" size={26} color={colors.primary} />} label="Início" styles={styles} />
        <NavItem icon={<MaterialCommunityIcons name="map-outline" size={26} color={colors.secondary} />} label="Mapa" onPress={() => router.push('/mapa')} styles={styles} />
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
            <TouchableOpacity style={styles.sosNavButtonTouchable} activeOpacity={0.85} onPress={() => router.push('/sos' as any)}>
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
        <NavItem icon={<MaterialCommunityIcons name="account-plus-outline" size={26} color={colors.secondary} />} label="Contatos" onPress={() => router.push('/contatos')} styles={styles} />
        <NavItem icon={<MaterialCommunityIcons name="account-circle-outline" size={26} color={colors.secondary} />} label="Perfil" onPress={() => router.push('/perfil')} styles={styles} />
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
            <Text style={styles.locationPopupTitle}>Ativar Localização?</Text>
            <Text style={styles.locationPopupDescription}>
              Para acessar o mapa e compartilhar sua localização em tempo real com seus contatos SOS, ative a permissão de localização.
            </Text>
            <TouchableOpacity
              style={[styles.locationPopupButton, { backgroundColor: colors.primary }]}
              onPress={async () => {
                setLocationLoading(true);
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();

                  if (status !== 'granted') {
                    setLocationLoading(false);
                    Alert.alert(
                      'Permissão Necessária',
                      'Você negou o acesso à localização. Para usar o mapa, ative a permissão de localização nas configurações do seu celular.',
                      [{ text: 'OK' }]
                    );
                    return;
                  }

                  const token = await AsyncStorage.getItem('userToken');
                  if (token) {
                    await api.put('/user/preferences', {
                      notifications_enabled: true,
                      location_enabled: true
                    }, token);
                    setLocationEnabled(true);
                  }

                  setLocationLoading(false);
                  setLocationPopupVisible(false);

                  if (Constants.appOwnership !== 'expo') {
                    const Notifications = require('expo-notifications');
                    const { status: notifStatus } = await Notifications.getPermissionsAsync();
                    if (notifStatus !== 'granted') {
                      await Notifications.requestPermissionsAsync();
                    }
                    await Notifications.scheduleNotificationAsync({
                      content: {
                        title: 'Localização Ativada',
                        body: 'Sua localização está habilitada e o mapa será aberto.',
                        sound: true,
                      },
                      trigger: null,
                    });
                  }
                  router.push('/mapa');
                } catch (error) {
                  setLocationLoading(false);
                  Alert.alert('Erro', 'Não foi possível ativar a localização. Tente novamente.');
                }
              }}
              activeOpacity={0.8}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.locationPopupButtonText}>Ativar Localização</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locationPopupCancelButton}
              onPress={() => setLocationPopupVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.locationPopupCancelText}>Agora não</Text>
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
              <Text style={styles.sectionTitle}>Últimas Ocorrências</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {occurrences.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, color: colors.secondary }}>Nenhuma ocorrência encontrada.</Text>
              ) : (
                occurrences.map((item) => (
                  <View key={`${item.source}-${item.id}`} style={styles.occurrenceCard}>
                    <View style={styles.occurrenceIconBox}>
                      <MaterialCommunityIcons
                        name={item.source === 'sos' ? 'shield-alert' : 'alert-circle'}
                        size={30}
                        color={item.source === 'sos' ? '#FF5252' : colors.primary}
                      />
                    </View>
                    <View style={styles.occurrenceInfo}>
                      <Text style={styles.occurrenceTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.occurrenceDescription} numberOfLines={2}>{item.description}</Text>
                      <View style={styles.occurrenceCardFooter}>
                        <View style={styles.occurrenceTimeRow}>
                          <MaterialCommunityIcons name="clock-outline" size={12} color={colors.secondary} />
                          <Text style={styles.occurrenceTime} numberOfLines={1}>{formatAlertTime(item.created_at)}</Text>
                        </View>
                        <View style={styles.occurrenceActionsRow}>
                          <TouchableOpacity
                            style={styles.occurrenceActionButton}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            onPress={() => {
                              setModalVisible(false);
                              openEditOccurrence(item);
                            }}
                          >
                            <MaterialCommunityIcons name="pencil-outline" size={19} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.occurrenceActionButton, styles.occurrenceActionButtonDanger]}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            onPress={() => handleDeleteOccurrence(item)}
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={19} color="#E53935" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
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
              <Text style={styles.sectionTitle}>Todas as ações</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setMoreActionsVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <MoreActionRow
              styles={styles}
              colors={colors}
              icon="file-alert-outline"
              label="Ocorrências"
              onPress={() => { setMoreActionsVisible(false); router.push('/ocorrencias'); }}
            />
            <MoreActionRow
              styles={styles}
              colors={colors}
              icon="account-heart-outline"
              label="Contatos SOS"
              onPress={() => { setMoreActionsVisible(false); router.push('/contatos'); }}
            />
            <MoreActionRow
              styles={styles}
              colors={colors}
              icon="bell-outline"
              label="Alertas Recentes"
              onPress={() => { setMoreActionsVisible(false); router.push('/alertas' as any); }}
            />
            <MoreActionRow
              styles={styles}
              colors={colors}
              icon="map-marker-alert-outline"
              label="Áreas de risco"
              onPress={() => { setMoreActionsVisible(false); router.push('/mapa' as any); }}
            />
            <MoreActionRow
              styles={styles}
              colors={colors}
              icon="cog-outline"
              label="Ajustes"
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
                <Text style={styles.sectionTitle}>Editar ocorrência</Text>
                <Text style={{ fontSize: 13, color: colors.secondary, marginTop: 2 }}>Atualize as informações abaixo</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={closeEditOccurrence}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.editTypeRow}>
              <TouchableOpacity
                style={[styles.editTypeChip, editType === 'error' && styles.editTypeChipActiveError]}
                onPress={() => setEditType('error')}
              >
                <MaterialCommunityIcons name="alert-decagram" size={16} color={editType === 'error' ? '#FFF' : '#E53935'} />
                <Text style={[styles.editTypeChipText, editType === 'error' && styles.editTypeChipTextActive]}>Emergência</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editTypeChip, editType === 'warning' && styles.editTypeChipActiveWarning]}
                onPress={() => setEditType('warning')}
              >
                <MaterialCommunityIcons name="alert" size={16} color={editType === 'warning' ? '#FFF' : '#FB8C00'} />
                <Text style={[styles.editTypeChipText, editType === 'warning' && styles.editTypeChipTextActive]}>Atenção</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Título da ocorrência"
              placeholderTextColor={colors.secondary}
              maxLength={40}
            />
            <TextInput
              style={[styles.editInput, styles.editTextArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Descreva o que aconteceu"
              placeholderTextColor={colors.secondary}
              multiline
              textAlignVertical="top"
              maxLength={160}
            />

            <TouchableOpacity
              style={[styles.editSaveButton, (!canSaveEdit || editSaving) && styles.editSaveButtonDisabled]}
              activeOpacity={0.85}
              onPress={handleSaveEditOccurrence}
              disabled={!canSaveEdit || editSaving}
            >
              {editSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={22} color="#FFF" />
                  <Text style={styles.editSaveButtonText}>Salvar alterações</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SuccessPopup
        visible={editSuccessVisible}
        onContinue={() => setEditSuccessVisible(false)}
        title="Ocorrência atualizada!"
        message="As alterações foram salvas com sucesso."
      />
    </SafeAreaView>
  );
};

// --- COMPONENTES AUXILIARES ---

const QuickActionCard = ({ icon, label, sublabel, onPress, styles, color, tint, loading }: any) => (
  <TouchableOpacity style={styles.quickAccessCard} activeOpacity={0.7} onPress={onPress} disabled={loading}>
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
  <TouchableOpacity style={styles.moreActionsRow} activeOpacity={0.7} onPress={onPress}>
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
      <View style={styles.occurrenceCardFooter}>
        <View style={styles.occurrenceTimeRow}>
          <MaterialCommunityIcons name="clock-outline" size={12} color={colors.secondary} />
          <Text style={styles.occurrenceTime} numberOfLines={1}>{time}</Text>
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
                <MaterialCommunityIcons name="pencil-outline" size={19} color={colors.primary} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={[styles.occurrenceActionButton, styles.occurrenceActionButtonDanger]}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={onDelete}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={19} color="#E53935" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  </View>
);

const NavItem = ({ active, icon, label, onPress, styles }: any) => (
  <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onPress}>
    <View style={active ? styles.navIconActive : undefined}>
      {icon}
    </View>
    <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

export default Home;
