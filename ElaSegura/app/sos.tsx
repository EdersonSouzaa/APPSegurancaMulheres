import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Linking, Alert, ScrollView, Platform, Share, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { getStyles } from '../styles/sos.styles';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { EmergencyCallSheet } from '../components/EmergencyCallSheet';
import { CircularProgress } from '../components/CircularProgress';
import { BackHomeButton } from '../components/BackHomeButton';

const SEND_DURATION = 5; // segundos de animação de envio antes de entrar no estado ativo
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

  const [addressText, setAddressText] = useState('Obtendo localização...');

  const cancelledRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulsação sutil no botão SOS principal
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

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === 'sending' && elapsedSeconds >= SEND_DURATION) {
      setPhase('active');
    }
  }, [phase, elapsedSeconds]);

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

          <SendingRing
            styles={styles}
            colors={colors}
            isDarkMode={isDarkMode}
            remaining={Math.max(1, SEND_DURATION - elapsedSeconds)}
          />

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
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingVertical: 6 }}
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
  return (
    <SafeAreaView style={styles.promptContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? colors.background : '#FFECF4'} />

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={styles.promptHeader}>
          <View style={styles.promptHeaderLeft}>
            <BackHomeButton />
          </View>
        </View>

        <View style={styles.promptTitleWrap}>
          <Text style={styles.promptTitle}>Precisa de ajuda agora?</Text>
          <Text style={styles.promptSubtitle}>
            Toque no botão para acionar o SOS. Seu círculo de confiança será avisado na hora.
          </Text>
        </View>

        <View style={styles.holdWrapper}>
          <View style={styles.sosGlowOuter} />
          <View style={styles.sosGlowInner} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sosPulseRing,
              {
                backgroundColor: colors.primary,
                opacity: sosPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
                transform: [{ scale: sosPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
              },
            ]}
          />
          <TouchableOpacity activeOpacity={0.85} onPress={triggerSOSAlert}>
            <LinearGradient
              colors={[colors.primary, '#C2185B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sosGradientButton}
            >
              <Text style={styles.holdButtonText}>SOS</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.emergencyCallButtonWrapper} activeOpacity={0.85} onPress={() => setEmergencyVisible(true)}>
          <LinearGradient
            colors={['#E53935', '#B71C1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emergencyCallButton}
          >
            <View style={styles.emergencyCallIconBox}>
              <MaterialCommunityIcons name="phone-alert" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyCallButtonText}>Ligar para emergência</Text>
              <Text style={styles.emergencyCallButtonSubtext}>Polícia, SAMU e mais</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#FFFFFF" />
          </LinearGradient>
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

      <EmergencyCallSheet visible={emergencyVisible} onClose={() => setEmergencyVisible(false)} />
    </SafeAreaView>
  );
};

/**
 * O carregamento dos 5 segundos entre tocar no SOS e o alerta ficar ativo.
 *
 * São três animações somadas: o anel deslizando do zero ao fim em SEND_DURATION,
 * um halo que respira atrás dele e o número que dá uma batidinha a cada segundo
 * em vez de trocar seco.
 */
const SendingRing = ({ styles, colors, isDarkMode, remaining }: any) => {
  const entrada = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const digito = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(entrada, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(halo, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [entrada, halo]);

  useEffect(() => {
    digito.setValue(0.72);
    Animated.spring(digito, {
      toValue: 1,
      friction: 4.5,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [remaining, digito]);

  return (
    <Animated.View
      style={[
        styles.progressRingWrapper,
        {
          opacity: entrada,
          transform: [
            { scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
          ],
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sendingHalo,
          {
            backgroundColor: colors.primary,
            opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0] }),
            transform: [
              { scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.28] }) },
            ],
          },
        ]}
      />

      <CircularProgress
        size={200}
        strokeWidth={14}
        progress={1}
        duration={SEND_DURATION * 1000}
        color={colors.primary}
        colorEnd="#C2185B"
        trackColor={isDarkMode ? '#3A2530' : '#F9D7DE'}
      >
        <Animated.Text style={[styles.progressCountdown, { transform: [{ scale: digito }] }]}>
          {remaining}
        </Animated.Text>
        <Text style={styles.progressLabel}>{remaining === 1 ? 'SEGUNDO' : 'SEGUNDOS'}</Text>
      </CircularProgress>
    </Animated.View>
  );
};

const SosGlowButton = ({ styles, colors, onPress, subtext }: any) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.sosGlowWrapper}>
      <View style={styles.sosGlowOuter} />
      <View style={styles.sosGlowInner} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sosPulseRing,
          {
            backgroundColor: colors.primary,
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
          },
        ]}
      />
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
};

const QuickActionButton = ({ icon, label, color, onPress, styles }: any) => (
  <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.8} onPress={onPress}>
    <View style={styles.quickActionIconBox}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

export default SOSScreen;
