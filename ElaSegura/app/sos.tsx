import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Linking, Alert, ScrollView, Platform, Share, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { getStyles } from '../styles/sos.styles';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { EmergencyCallSheet } from '../components/EmergencyCallSheet';
import { FakeCallModal } from '../components/FakeCallModal';
import { CircularProgress } from '../components/CircularProgress';
import { BackHomeButton } from '../components/BackHomeButton';

const SEND_DURATION = 5; // segundos de animação de envio antes de entrar no estado ativo
const HOLD_DURATION = 3000; // ms que o botão precisa ficar pressionado para disparar o SOS
const CONTACT_COLORS = ['#F5A623', '#7C4DFF', '#2196F3', '#4CAF50'];

const formatSeconds = (total: number) => {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

type Phase = 'confirm' | 'sending' | 'active';

const SOSScreen = () => {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [phase, setPhase] = useState<Phase>('confirm');
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [contatosNotificados, setContatosNotificados] = useState<any[]>([]);
  const [semContatos, setSemContatos] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const [fakeCallVisible, setFakeCallVisible] = useState(false);

  // Cabeçalho da tela de pedido de ajuda
  const [userName, setUserName] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [alertsCount, setAlertsCount] = useState(0);
  const [addressText, setAddressText] = useState('Obtendo localização...');

  // Segurar para ativar
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  const cancelledRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === 'sending' && elapsedSeconds >= SEND_DURATION) {
      setPhase('active');
    }
  }, [phase, elapsedSeconds]);

  const loadHeaderData = useCallback(async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setUserName(user.name.split(' ')[0]);
        setProfilePicture(user.profile_picture || null);
      }

      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const data = await api.get('/alertas', token);
        setAlertsCount((data.alerts || []).length);
      }
    } catch (error) {
      console.error('Erro ao carregar cabeçalho do SOS:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHeaderData();
    }, [loadHeaderData])
  );

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          setAddressText('Disponível no aplicativo mobile');
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setAddressText('Ative a localização para ver seu endereço');
          return;
        }

        const loc = (await Location.getLastKnownPositionAsync({})) ||
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));

        if (!loc) {
          setAddressText('Não foi possível obter sua localização');
          return;
        }

        const [place] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (place) {
          const street = [place.street, place.streetNumber].filter(Boolean).join(', ');
          const area = [place.district, place.city].filter(Boolean).join(' — ');
          const label = [street, area].filter(Boolean).join(' — ');
          setAddressText(label || 'Endereço não encontrado');
        } else {
          setAddressText('Endereço não encontrado');
        }
      } catch {
        setAddressText('Não foi possível obter o endereço');
      }
    })();
  }, []);

  const callContact = async (contact: any) => {
    try {
      await Linking.openURL(`tel:${contact.phone}`);
    } catch {
      Alert.alert('Não foi possível ligar', `Tente ligar manualmente para ${contact.name} (${contact.phone}).`);
    }
  };

  const handleShareLocation = async () => {
    if (!currentCoords) {
      Alert.alert('Localização indisponível', 'Ainda estamos obtendo sua localização.');
      return;
    }
    const url = `https://maps.google.com/?q=${currentCoords.latitude},${currentCoords.longitude}`;
    try {
      await Share.share({ message: `📍 Esta é minha localização em tempo real:\n${url}\n— Enviado pelo ElaSegura` });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar a localização.');
    }
  };

  const handleCancelAlert = () => {
    cancelledRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPhase('confirm');
    setElapsedSeconds(0);
    setContatosNotificados([]);
    setSemContatos(false);
  };

  const triggerSOSAlert = async () => {
    cancelledRef.current = false;
    setContatosNotificados([]);
    setSemContatos(false);
    setElapsedSeconds(0);
    setPhase('sending');
    setIsLoading(true);

    intervalRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    try {
      let coords: { latitude: number; longitude: number } | null = null;
      let locationString = 'Localização não disponível';

      if (Platform.OS === 'web') {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
              locationString = `${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`;
              resolve();
            },
            () => resolve(),
            { timeout: 5000 }
          );
        });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const lastKnown = await Location.getLastKnownPositionAsync({});
          let locCoords = lastKnown ? lastKnown.coords : null;

          if (!locCoords) {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            locCoords = loc.coords;
          }

          if (locCoords) {
            coords = { latitude: locCoords.latitude, longitude: locCoords.longitude };
            locationString = `${locCoords.latitude.toFixed(6)},${locCoords.longitude.toFixed(6)}`;
          }
        }
      }

      if (cancelledRef.current) return;
      if (coords) setCurrentCoords(coords);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await api.post('/sos', { location: locationString }, token);
      if (cancelledRef.current) return;

      const contatos = response.contatosEmergencia || [];
      setContatosNotificados(contatos);
      setSemContatos(contatos.length === 0);
    } catch {
      if (!cancelledRef.current) {
        setContatosNotificados([]);
        setSemContatos(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleHoldPressIn = () => {
    setHolding(true);
    setHoldProgress(0);
    const startedAt = Date.now();

    holdIntervalRef.current = setInterval(() => {
      setHoldProgress(Math.min(1, (Date.now() - startedAt) / HOLD_DURATION));
    }, 50);

    holdTimeoutRef.current = setTimeout(() => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
      }
      setHolding(false);
      setHoldProgress(0);
      triggerSOSAlert();
    }, HOLD_DURATION);
  };

  const handleHoldPressOut = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHolding(false);
    setHoldProgress(0);
  };

  // --- Estado "enviando ajuda" ---
  if (phase === 'sending') {
    return (
      <SafeAreaView style={styles.flowContainer} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={styles.flowHeader}>
          <TouchableOpacity style={styles.flowBackButton} onPress={handleCancelAlert}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.flowHeaderTitle}>Suporte a caminho</Text>
        </View>

        <ScrollView contentContainerStyle={styles.flowContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.flowTitle}>Estamos enviando{'\n'}ajuda para você</Text>
          <Text style={styles.flowSubtitle}>
            Não se preocupe — seu círculo de confiança será avisado em instantes.
          </Text>

          <View style={styles.progressRingWrapper}>
            <CircularProgress
              size={200}
              strokeWidth={14}
              progress={elapsedSeconds / SEND_DURATION}
              color={colors.primary}
              trackColor={isDarkMode ? '#3A2530' : '#F9D7DE'}
            >
              <Text style={styles.progressCountdown}>{formatSeconds(elapsedSeconds)}</Text>
              <Text style={styles.progressLabel}>SEGUNDOS</Text>
            </CircularProgress>
          </View>

          <View style={styles.contactsList}>
            {contatosNotificados.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.secondary, fontSize: 13 }}>
                {isLoading ? 'Avisando seu círculo de confiança...' : 'Nenhum contato emergencial cadastrado.'}
              </Text>
            ) : (
              contatosNotificados.map((c: any, index: number) => (
                <View key={c.id} style={styles.contactRow}>
                  <View style={[styles.contactAvatar, { backgroundColor: CONTACT_COLORS[index % CONTACT_COLORS.length] }]}>
                    <Text style={styles.contactAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <View style={styles.contactStatusRow}>
                      <View style={styles.contactStatusDot} />
                      <Text style={styles.contactStatusText}>Notificando...</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.contactCallButton} onPress={() => callContact(c)}>
                    <MaterialIcons name="call" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity style={styles.cancelAlertLink} onPress={handleCancelAlert}>
            <Text style={styles.cancelAlertLinkText}>Cancelar alerta</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Estado ativo de emergência ---
  if (phase === 'active') {
    return (
      <SafeAreaView style={styles.flowContainer} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={styles.flowHeader}>
          <TouchableOpacity style={styles.flowBackButton} onPress={handleCancelAlert}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.flowHeaderTitle}>Acesso de emergência</Text>
        </View>

        <ScrollView contentContainerStyle={styles.flowContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.flowTitle}>Fique calma.{'\n'}A ajuda está a caminho.</Text>

          <View style={styles.activeSosWrapper}>
            <SosGlowButton styles={styles} colors={colors} subtext="ENVIANDO..." />
          </View>

          <View style={styles.activeStatusRow}>
            <View style={styles.activeStatusDot} />
            <Text style={styles.activeStatusText}>Alertando seu círculo de confiança · {formatSeconds(elapsedSeconds)}</Text>
          </View>

          <View style={styles.quickActionsRow}>
            <QuickActionButton
              styles={styles}
              icon="crosshairs-gps"
              label="Compartilhar local"
              color={colors.primary}
              onPress={handleShareLocation}
            />
            <QuickActionButton
              styles={styles}
              icon="microphone-outline"
              label="Gravar áudio"
              color={colors.primary}
              onPress={() => Alert.alert('Em breve', 'A gravação de áudio estará disponível em breve.')}
            />
            <QuickActionButton
              styles={styles}
              icon="video-outline"
              label="Vídeo"
              color={colors.primary}
              onPress={() => Alert.alert('Em breve', 'A gravação de vídeo estará disponível em breve.')}
            />
          </View>

          <View style={styles.contactsList}>
            {semContatos ? (
              <Text style={{ textAlign: 'center', color: colors.secondary, fontSize: 13 }}>
                Nenhum contato emergencial cadastrado. Adicione contatos na aba Contatos.
              </Text>
            ) : (
              contatosNotificados.map((c: any, index: number) => (
                <View key={c.id} style={styles.contactRow}>
                  <View style={[styles.contactAvatar, { backgroundColor: CONTACT_COLORS[index % CONTACT_COLORS.length] }]}>
                    <Text style={styles.contactAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <View style={styles.contactStatusRow}>
                      <View style={styles.contactStatusDot} />
                      <Text style={styles.contactStatusText}>{index === 0 ? 'Notificada agora' : 'Ligando...'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.contactCallButton} onPress={() => callContact(c)}>
                    <MaterialIcons name="call" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}
            activeOpacity={0.8}
            onPress={() => setEmergencyVisible(true)}
          >
            <MaterialCommunityIcons name="phone-alert" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 15, marginLeft: 6 }}>Ligar para emergência</Text>
          </TouchableOpacity>
        </ScrollView>

        <EmergencyCallSheet visible={emergencyVisible} onClose={() => setEmergencyVisible(false)} />
      </SafeAreaView>
    );
  }

  // --- Estado inicial: pedido de ajuda ---
  const userInitial = (userName || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.promptContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? colors.background : '#FFECF4'} />

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={styles.promptHeader}>
          <View style={styles.promptHeaderLeft}>
            <BackHomeButton />
          </View>

          <View style={styles.promptHeaderActions}>
            <TouchableOpacity style={styles.promptBellButton} onPress={() => router.push('/alertas' as any)} activeOpacity={0.8}>
              <MaterialCommunityIcons name="bell-outline" size={20} color={colors.primary} />
              {alertsCount > 0 && (
                <View style={styles.promptBellBadge}>
                  <Text style={styles.promptBellBadgeText}>{alertsCount > 9 ? '9+' : alertsCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.promptAvatar} onPress={() => router.push('/perfil')} activeOpacity={0.8}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={{ width: 42, height: 42, borderRadius: 21 }} />
              ) : (
                <Text style={styles.promptAvatarText}>{userInitial}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.promptTitleWrap}>
          <Text style={styles.promptTitle}>Precisa de ajuda agora?</Text>
          <Text style={styles.promptSubtitle}>
            Segure o botão por 3 segundos para acionar o SOS. Seu círculo de confiança será avisado na hora.
          </Text>
        </View>

        <View style={styles.holdWrapper}>
          <View style={styles.sosGlowOuter} />
          <View style={styles.sosGlowInner} />
          {holding && (
            <View style={styles.holdRing}>
              <CircularProgress size={172} strokeWidth={6} progress={holdProgress} color="#FFFFFF" trackColor="rgba(255,255,255,0.25)" />
            </View>
          )}
          <TouchableOpacity
            activeOpacity={1}
            onPressIn={handleHoldPressIn}
            onPressOut={handleHoldPressOut}
          >
            <LinearGradient
              colors={[colors.primary, '#C2185B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sosGradientButton}
            >
              <Text style={styles.holdButtonText}>SOS</Text>
              <Text style={styles.holdButtonSubtext}>SEGURE 3S</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.promptQuickRow}>
          <TouchableOpacity style={styles.promptQuickButton} activeOpacity={0.8} onPress={() => router.push('/mapa')}>
            <MaterialCommunityIcons name="navigation-variant-outline" size={18} color={colors.primary} />
            <Text style={styles.promptQuickButtonText}>Rota segura</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.promptQuickButton} activeOpacity={0.8} onPress={() => setFakeCallVisible(true)}>
            <MaterialIcons name="call" size={18} color={colors.primary} />
            <Text style={styles.promptQuickButtonText}>Chamada falsa</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.promptEmergencyLink} activeOpacity={0.8} onPress={() => setEmergencyVisible(true)}>
          <MaterialCommunityIcons name="phone-alert" size={16} color={colors.primary} />
          <Text style={styles.promptEmergencyLinkText}>Ligar para emergência</Text>
        </TouchableOpacity>

        <View style={styles.promptLocationCard}>
          <View style={styles.promptLocationIconBox}>
            <MaterialIcons name="location-on" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.promptLocationLabel}>Sua localização atual</Text>
            <Text style={styles.promptLocationValue}>{addressText}</Text>
          </View>
        </View>
      </ScrollView>

      <FakeCallModal visible={fakeCallVisible} onClose={() => setFakeCallVisible(false)} />
      <EmergencyCallSheet visible={emergencyVisible} onClose={() => setEmergencyVisible(false)} />
    </SafeAreaView>
  );
};

const SosGlowButton = ({ styles, colors, onPress, subtext }: any) => (
  <View style={styles.sosGlowWrapper}>
    <View style={styles.sosGlowOuter} />
    <View style={styles.sosGlowInner} />
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress}>
      <LinearGradient
        colors={[colors.primary, '#C2185B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sosGradientButton}
      >
        <MaterialCommunityIcons name="shield-alert" size={38} color="#FFFFFF" />
        <Text style={styles.activeSosButtonText}>SOS</Text>
        <Text style={styles.activeSosButtonSubtext}>{subtext}</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const QuickActionButton = ({ icon, label, color, onPress, styles }: any) => (
  <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.8} onPress={onPress}>
    <View style={styles.quickActionIconBox}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

export default SOSScreen;
