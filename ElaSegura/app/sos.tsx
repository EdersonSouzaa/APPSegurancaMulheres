import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Linking, Alert, ScrollView, Platform, Share, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { getStyles } from '../styles/sos.styles';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { Colors } from '../constants/theme';
import { haptics } from '../lib/haptics';
import { acionarSos } from '../services/sos';
import type { ContatoApp } from '../services/contatos';
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
  const { t } = useI18n();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [phase, setPhase] = useState<Phase>('confirm');
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [contatosNotificados, setContatosNotificados] = useState<ContatoApp[]>([]);
  const [semContatos, setSemContatos] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [emergencyVisible, setEmergencyVisible] = useState(false);

  const [addressText, setAddressText] = useState('');

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
    setAddressText(t('sos.obtendoLocalizacao'));

    (async () => {
      try {
        if (Platform.OS === 'web') {
          setAddressText(t('sos.somenteMobile'));
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setAddressText(t('sos.ativeLocalizacao'));
          return;
        }

        const loc = (await Location.getLastKnownPositionAsync({})) ||
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));

        if (!loc) {
          setAddressText(t('sos.naoObteveLocalizacao'));
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
          setAddressText(label || t('sos.enderecoNaoEncontrado'));
        } else {
          setAddressText(t('sos.enderecoNaoEncontrado'));
        }
      } catch {
        setAddressText(t('sos.naoObteveEndereco'));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callContact = async (contact: ContatoApp) => {
    haptics.acao();
    try {
      await Linking.openURL(`tel:${contact.phone}`);
    } catch {
      haptics.erro();
      Alert.alert(
        t('sos.naoFoiPossivelLigar'),
        t('sos.ligueManualmente', { nome: contact.name, telefone: contact.phone })
      );
    }
  };

  const handleShareLocation = async () => {
    if (!currentCoords) {
      haptics.aviso();
      Alert.alert(t('sos.localizacaoIndisponivel'), t('sos.aindaObtendo'));
      return;
    }
    haptics.acao();
    const url = `https://maps.google.com/?q=${currentCoords.latitude},${currentCoords.longitude}`;
    try {
      await Share.share({ message: t('sos.mensagemLocalizacao', { url }) });
    } catch {
      haptics.erro();
      Alert.alert(t('comum.erro'), t('sos.erroCompartilhar'));
    }
  };

  const handleCancelAlert = () => {
    haptics.aviso();
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
    // Três batidas fortes: a confirmação de que o alerta saiu, sentida com o
    // telefone no bolso ou na mão fechada, quando olhar a tela não é opção.
    haptics.emergencia();
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
      let locationString: string | null = null;

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

      const response = await acionarSos(locationString);
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
          <Text style={styles.flowHeaderTitle} accessibilityRole="header">
            {t('sos.suporteACaminho')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.flowContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.flowTitle} accessibilityLiveRegion="assertive">
            {t('sos.enviandoAjuda')}
          </Text>
          <Text style={styles.flowSubtitle}>{t('sos.enviandoSubtitulo')}</Text>

          <SendingRing
            styles={styles}
            colors={colors}
            isDarkMode={isDarkMode}
            remaining={Math.max(1, SEND_DURATION - elapsedSeconds)}
            rotuloSegundo={t('sos.segundo')}
            rotuloSegundos={t('sos.segundos')}
          />

          <View style={styles.contactsList}>
            {contatosNotificados.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.secondary, fontSize: 13 }}>
                {isLoading ? t('sos.avisandoCirculo') : t('sos.semContatoCadastrado')}
              </Text>
            ) : (
              contatosNotificados.map((c, index) => (
                <View key={c.id} style={styles.contactRow}>
                  <View style={[styles.contactAvatar, { backgroundColor: CONTACT_COLORS[index % CONTACT_COLORS.length] }]}>
                    <Text style={styles.contactAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <View style={styles.contactStatusRow}>
                      <View style={styles.contactStatusDot} />
                      <Text style={styles.contactStatusText}>{t('sos.notificando')}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.contactCallButton}
                    onPress={() => callContact(c)}
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.ligarPara', { nome: c.name })}
                  >
                    <MaterialIcons name="call" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            style={[styles.cancelSosButton, { marginTop: 24 }]}
            activeOpacity={0.85}
            onPress={handleCancelAlert}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.cancelarSos')}
          >
            <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.cancelSosButtonText}>{t('sos.cancelarAlerta')}</Text>
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
          <Text style={styles.flowHeaderTitle} accessibilityRole="header">
            {t('sos.acessoEmergencia')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.flowContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.flowTitle} accessibilityLiveRegion="polite">
            {t('sos.fiqueCalma')}
          </Text>

          <View style={styles.activeSosWrapper}>
            <SosGlowButton styles={styles} colors={colors} subtext={t('sos.enviando')} />
          </View>

          <View style={styles.activeStatusRow}>
            <View style={styles.activeStatusDot} />
            <Text style={styles.activeStatusText} accessibilityLiveRegion="polite">
              {t('sos.alertandoCirculo', { tempo: formatSeconds(elapsedSeconds) })}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.activeActionCard}
            activeOpacity={0.85}
            onPress={handleShareLocation}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.compartilharLocal')}
          >
            <View style={styles.activeActionIconBox}>
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeActionLabel}>{t('sos.compartilharLocalizacao')}</Text>
              <Text style={styles.activeActionHint}>{t('sos.envieSuaPosicao')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.secondary} />
          </TouchableOpacity>

          <View style={styles.contactsList}>
            {semContatos ? (
              <Text style={{ textAlign: 'center', color: colors.secondary, fontSize: 13 }}>
                {t('sos.semContatoAba')}
              </Text>
            ) : (
              contatosNotificados.map((c, index) => (
                <View key={c.id} style={styles.contactRow}>
                  <View style={[styles.contactAvatar, { backgroundColor: CONTACT_COLORS[index % CONTACT_COLORS.length] }]}>
                    <Text style={styles.contactAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <View style={styles.contactStatusRow}>
                      <View style={styles.contactStatusDot} />
                      <Text style={styles.contactStatusText}>
                        {index === 0 ? t('sos.notificadaAgora') : t('sos.ligando')}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.contactCallButton}
                    onPress={() => callContact(c)}
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.ligarPara', { nome: c.name })}
                  >
                    <MaterialIcons name="call" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            style={styles.activeEmergencyWrapper}
            activeOpacity={0.85}
            onPress={() => {
              haptics.toque();
              setEmergencyVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.ligarEmergencia')}
          >
            <LinearGradient
              colors={['#E53935', '#B71C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeEmergencyButton}
            >
              <View style={styles.activeEmergencyIconBox}>
                <MaterialCommunityIcons name="phone-alert" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeEmergencyText}>{t('sos.ligarEmergencia')}</Text>
                <Text style={styles.activeEmergencySubtext}>{t('sos.policiaSamu')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelSosButton}
            activeOpacity={0.85}
            onPress={handleCancelAlert}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.cancelarSos')}
          >
            <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.cancelSosButtonText}>{t('sos.cancelarAlerta')}</Text>
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
          <Text style={styles.promptTitle} accessibilityRole="header">
            {t('sos.precisaAjuda')}
          </Text>
          <Text style={styles.promptSubtitle}>{t('sos.toqueParaAcionar')}</Text>
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
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={triggerSOSAlert}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.acionarSos')}
            accessibilityHint={t('a11y.acionarSosDica')}
          >
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

        <TouchableOpacity
          style={styles.emergencyCallButtonWrapper}
          activeOpacity={0.85}
          onPress={() => {
            haptics.toque();
            setEmergencyVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.ligarEmergencia')}
        >
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
              <Text style={styles.emergencyCallButtonText}>{t('sos.ligarEmergencia')}</Text>
              <Text style={styles.emergencyCallButtonSubtext}>{t('sos.policiaSamu')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.promptLocationCard}>
          <View style={styles.promptLocationIconBox}>
            <MaterialIcons name="location-on" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.promptLocationLabel}>{t('sos.suaLocalizacao')}</Text>
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
const SendingRing = ({ styles, colors, isDarkMode, remaining, rotuloSegundo, rotuloSegundos }: any) => {
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
        <Text style={styles.progressLabel}>{remaining === 1 ? rotuloSegundo : rotuloSegundos}</Text>
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

export default SOSScreen;
