import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { Colors } from '../constants/theme';
import { getStyles } from '../styles/mapa.styles';
import { useLocation } from '../hooks/use-location';
import { useMarkedZones } from '../hooks/use-marked-zones';
import { haptics } from '../lib/haptics';
import {
  LeafletMap,
  type RiskZone,
  type IncidentMarker,
  type ZoneLevel,
  type LatLngBounds,
  type HeatPoint,
  type SafePlaceMarker,
} from '../components/LeafletMap';
import { ToastNotification } from '../components/ToastNotification';
import { BackHomeButton } from '../components/BackHomeButton';
import {
  listarOcorrencias,
  listarOcorrenciasProximas,
  criarOcorrencia,
  type OcorrenciaApp,
  type PeriodoFiltro,
} from '../services/ocorrencias';
import { acionarSos } from '../services/sos';
import { listarPontosSeguros } from '../services/pontosSeguros';
import { estaContestado } from '../services/validacoes';
import type { PontoSeguro } from '../constants/pontosSeguros';

const FORTALEZA_BOUNDS: LatLngBounds = [
  [-3.9, -38.65],
  [-3.65, -38.35],
];
const FORTALEZA_CENTER: [number, number] = [-3.766, -38.483];

/**
 * Zonas de demonstração desenhadas no mapa. Sem `label`: o rótulo sai do
 * nível (Segura / Alerta / Perigo) já traduzido, montado no componente.
 */
const SAMPLE_RISK_ZONES: Omit<RiskZone, 'label'>[] = [
  { id: 1, lat: -3.771, lng: -38.479, radius: 800, level: 'safe' },
  { id: 2, lat: -3.754, lng: -38.490, radius: 1000, level: 'safe' },
  { id: 3, lat: -3.760, lng: -38.470, radius: 600, level: 'alert' },
  { id: 4, lat: -3.768, lng: -38.500, radius: 900, level: 'danger' },
];

const RADIUS_OPTIONS = [500, 1000, 2000, 5000];

type ChipKey = 'todos' | 'risco' | 'meus';

const CHIPS: { key: ChipKey; chave: 'mapa.chipTodos' | 'mapa.chipRisco' | 'mapa.chipMeus' }[] = [
  { key: 'todos', chave: 'mapa.chipTodos' },
  { key: 'risco', chave: 'mapa.chipRisco' },
  { key: 'meus', chave: 'mapa.chipMeus' },
];

const PERIODOS: { valor: PeriodoFiltro; chave: 'mapa.periodo7' | 'mapa.periodo30' | 'mapa.periodo90' | 'mapa.periodoTudo' }[] = [
  { valor: '7d', chave: 'mapa.periodo7' },
  { valor: '30d', chave: 'mapa.periodo30' },
  { valor: '90d', chave: 'mapa.periodo90' },
  { valor: 'tudo', chave: 'mapa.periodoTudo' },
];

const CATEGORIAS_RELATO = ['catAssedio', 'catRoubo', 'catSuspeita', 'catOutro'] as const;

/**
 * Peso de cada relato no mapa de calor.
 *
 * Duas coisas somam: gravidade e recência. Um assalto de ontem deve pesar mais
 * que um aviso de dois meses atrás — sem esse decaimento, uma região que teve
 * problemas há muito tempo continuaria vermelha para sempre, e o mapa perderia
 * a capacidade de dizer onde o risco está agora.
 *
 * Relato contestado pela comunidade entra com peso bem baixo em vez de
 * desaparecer: ainda é um sinal, só não é um sinal confiável.
 */
function pesoNoCalor(o: OcorrenciaApp): number {
  const base = o.type === 'error' ? 1 : 0.55;

  const dias = o.created_at
    ? (Date.now() - new Date(o.created_at).getTime()) / (24 * 60 * 60 * 1000)
    : 45;
  const recencia = dias <= 7 ? 1 : dias <= 30 ? 0.7 : dias <= 90 ? 0.45 : 0.25;

  const credibilidade = estaContestado(o) ? 0.2 : 1 + Math.min(0.5, o.confirmacoes * 0.12);

  return Math.min(1, base * recencia * credibilidade);
}

export default function MapaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, theme } = useTheme();
  const { t, tp } = useI18n();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const { coords, errorMsg, loading } = useLocation();
  const [occurrences, setOccurrences] = useState<OcorrenciaApp[]>([]);
  const [sharing, setSharing] = useState(false);
  const mapRef = useRef<{ recenter: () => void }>(null);

  const [searchText, setSearchText] = useState('');
  const [activeChip, setActiveChip] = useState<ChipKey>('todos');
  const [radius, setRadius] = useState(5000);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('30d');
  const [showIncidents, setShowIncidents] = useState(true);
  const [showHeat, setShowHeat] = useState(true);
  const [showSafePlaces, setShowSafePlaces] = useState(true);
  const [showZonasComunidade, setShowZonasComunidade] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [markColor, setMarkColor] = useState<ZoneLevel | null>(null);
  const { markedZones, adicionarZona, removerZona, ehMinha } = useMarkedZones(coords, radius);

  const [pontosSeguros, setPontosSeguros] = useState<PontoSeguro[]>([]);

  const [reportVisible, setReportVisible] = useState(false);
  const [reportType, setReportType] = useState<'error' | 'warning'>('error');
  const [reportCategory, setReportCategory] = useState('');
  const [reportTitleCustom, setReportTitleCustom] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSaving, setReportSaving] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger' | 'info'>('success');

  const showToast = useCallback((message: string, type: 'success' | 'danger' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  const ZONAS_LEGENDA: { level: ZoneLevel; rotulo: string; cor: string }[] = useMemo(
    () => [
      { level: 'safe', rotulo: t('mapa.zonasSeguras'), cor: '#34C759' },
      { level: 'alert', rotulo: t('mapa.zonasAlerta'), cor: '#FFCC00' },
      { level: 'danger', rotulo: t('mapa.zonasPerigo'), cor: '#FF3B30' },
    ],
    [t]
  );

  const selectMarkColor = (level: ZoneLevel) => {
    haptics.selecao();
    setMarkColor((prev) => (prev === level ? null : level));
  };

  const handleMapPress = async (lat: number, lng: number) => {
    if (!markColor) return;
    haptics.acao();
    try {
      await adicionarZona(lat, lng, markColor);
      showToast(t('mapa.zonaCriada'), 'success');
    } catch {
      haptics.erro();
      showToast(t('mapa.zonaErro'), 'danger');
    }
  };

  const handleMarkPress = (id: string) => {
    if (markColor) return; // marcando: não remove
    if (!ehMinha(id)) {
      showToast(t('mapa.removerMarcacaoOutra'), 'info');
      return;
    }
    haptics.toque();
    Alert.alert(t('mapa.removerMarcacao'), t('mapa.removerMarcacaoPergunta'), [
      { text: t('comum.cancelar'), style: 'cancel' },
      {
        text: t('comum.remover'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removerZona(id);
            haptics.sucesso();
            showToast(t('mapa.zonaRemovida'), 'success');
          } catch {
            haptics.erro();
            showToast(t('mapa.zonaErro'), 'danger');
          }
        },
      },
    ]);
  };

  // Pontos de apoio mudam raramente: uma carga por sessão basta.
  useEffect(() => {
    let cancelado = false;
    listarPontosSeguros()
      .then((lista) => {
        if (!cancelado) setPontosSeguros(lista);
      })
      .catch((e) => console.warn('[mapa] pontos de apoio indisponíveis:', e));
    return () => {
      cancelado = true;
    };
  }, []);

  /**
   * Carrega os relatos conforme o filtro ativo.
   *
   * "Meus" lê só o que a usuária registrou; os outros usam a busca por raio
   * via geohash. O período é aplicado nos dois casos pelo próprio serviço.
   */
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (activeChip !== 'meus' && !coords) return;
      try {
        const busca = searchText.trim() || undefined;

        const dados =
          activeChip === 'meus'
            ? await listarOcorrencias(busca, periodo)
            : await listarOcorrenciasProximas(
                coords!.latitude,
                coords!.longitude,
                radius,
                busca,
                periodo
              );

        if (cancelled) return;

        const comCoordenada = dados.filter((o) => o.latitude != null && o.longitude != null);
        setOccurrences(activeChip === 'risco' ? comCoordenada.filter((o) => o.type === 'error') : comCoordenada);
      } catch (e) {
        // silent — sem conexão ainda mostra mapa
        console.warn('[mapa] não foi possível carregar ocorrências:', e);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // As dependências usam coords?.latitude/longitude de propósito: o objeto
    // coords muda de identidade a cada leitura do GPS, e depender dele
    // refaria a consulta a cada poucos segundos sem que nada tenha mudado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.latitude, coords?.longitude, activeChip, radius, searchText, periodo, refreshTick]);

  const incidentMarkers: IncidentMarker[] = useMemo(
    () =>
      occurrences.map((o) => ({
        id: o.id,
        lat: o.latitude as number,
        lng: o.longitude as number,
        type: o.type,
        title: o.title,
        disputed: estaContestado(o),
        confirmations: o.confirmacoes,
      })),
    [occurrences]
  );

  const heatPoints: HeatPoint[] = useMemo(
    () =>
      occurrences.map((o) => ({
        lat: o.latitude as number,
        lng: o.longitude as number,
        weight: pesoNoCalor(o),
      })),
    [occurrences]
  );

  const safePlaceMarkers: SafePlaceMarker[] = useMemo(
    () =>
      pontosSeguros.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        name: p.nome,
        category: p.categoria,
        phone: p.telefone,
        address: p.endereco,
        open24h: p.aberto24h,
        verified: p.verificado,
      })),
    [pontosSeguros]
  );

  const rotulosMapa = useMemo(
    () => ({
      youAreHere: t('mapa.voceEstaAqui'),
      markedArea: t('mapa.areaMarcada'),
      // O {nome} é substituído dentro do LeafletMap, quando cada zona é
      // montada — por isso a chave vai crua, sem interpolar aqui.
      markedBy: t('mapa.marcadaPor'),
      disputed: t('validacao.contestado'),
      reports: t('validacao.confirmadoPor'),
      unverified: t('pontosSeguros.naoVerificado'),
      call: t('pontosSeguros.ligar'),
      route: t('pontosSeguros.comoChegar'),
      open24h: t('pontosSeguros.aberto24h'),
      categories: {
        delegacia: t('pontosSeguros.delegacia'),
        policia: t('pontosSeguros.policia'),
        saude: t('pontosSeguros.saude'),
        acolhimento: t('pontosSeguros.acolhimento'),
      },
    }),
    [t]
  );

  const handleSafePlaceAction = useCallback(
    async (id: string, acao: 'ligar' | 'rota') => {
      const ponto = pontosSeguros.find((p) => p.id === id);
      if (!ponto) return;
      haptics.acao();

      const url =
        acao === 'ligar' && ponto.telefone
          ? `tel:${ponto.telefone}`
          : `https://maps.google.com/?q=${ponto.lat},${ponto.lng}`;

      try {
        await Linking.openURL(url);
      } catch {
        haptics.erro();
        showToast(t('comum.erro'), 'danger');
      }
    },
    [pontosSeguros, showToast, t]
  );

  const timeAgo = useCallback(
    (iso?: string | null): string => {
      if (!iso) return t('comum.agoraMesmo');
      const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
      if (min < 1) return t('comum.agoraMesmo');
      if (min < 60) return t('comum.haMinutos', { min });
      const h = Math.floor(min / 60);
      if (h < 24) return t('comum.haHoras', { h });
      return t('comum.haDias', { d: Math.floor(h / 24) });
    },
    [t]
  );

  const latestOccurrence = useMemo(() => {
    if (!occurrences.length) return null;
    return [...occurrences].sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )[0];
  }, [occurrences]);

  const riskZones: RiskZone[] = useMemo(() => {
    if (activeChip === 'meus') return [];
    const rotulos = Object.fromEntries(ZONAS_LEGENDA.map((z) => [z.level, z.rotulo]));
    return SAMPLE_RISK_ZONES.map((z) => ({ ...z, label: rotulos[z.level] }));
  }, [activeChip, ZONAS_LEGENDA]);
  const activeZoneFilter: ZoneLevel | null = activeChip === 'risco' ? 'danger' : null;

  const shareLocation = async () => {
    if (!coords) {
      Alert.alert(t('nav.mapa'), t('mapa.aguardandoGps'));
      return;
    }
    haptics.acao();
    setSharing(true);
    try {
      const locationStr = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
      const res = await acionarSos(locationStr);
      const num = res?.contatosEmergencia?.length ?? 0;
      haptics.sucesso();
      Alert.alert(
        t('mapa.localizacaoCompartilhada'),
        num > 0 ? t('mapa.enviadaParaContatos', { n: num }) : t('mapa.semContatosEmergencia')
      );
    } catch (e: any) {
      haptics.erro();
      Alert.alert(t('comum.erro'), e?.message ?? t('mapa.erroCompartilhar'));
    } finally {
      setSharing(false);
    }
  };

  const resetReportForm = () => {
    setReportType('error');
    setReportCategory('');
    setReportTitleCustom('');
    setReportDescription('');
  };

  const closeReportModal = () => {
    setReportVisible(false);
    resetReportForm();
  };

  const reportTitle =
    reportCategory === t('mapa.catOutro') ? reportTitleCustom.trim() : reportCategory;
  const canSubmitReport = reportTitle.length > 0 && reportDescription.trim().length > 0;

  const submitReport = async () => {
    if (!canSubmitReport) return;
    if (!coords) {
      Alert.alert(t('nav.mapa'), t('mapa.aguardandoGpsRelato'));
      return;
    }
    haptics.acao();
    setReportSaving(true);
    try {
      await criarOcorrencia({
        title: reportTitle,
        description: reportDescription.trim(),
        type: reportType,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      haptics.sucesso();
      showToast(t('mapa.ocorrenciaRegistrada'), 'success');
      closeReportModal();
      setRefreshTick((tick) => tick + 1);
    } catch (e: any) {
      haptics.erro();
      Alert.alert(t('comum.erro'), e?.message ?? t('mapa.erroRegistrar'));
    } finally {
      setReportSaving(false);
    }
  };

  const subtitle = errorMsg
    ? t('mapa.subtituloSemGps')
    : loading
      ? t('mapa.subtituloLocalizando')
      : t('mapa.subtituloTempoReal');

  const fabBaseBottom = 24 + insets.bottom;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BackHomeButton />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.headerTitle} accessibilityRole="header">
              {t('mapa.titulo')}
            </Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            haptics.toque();
            setSettingsVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.filtrosMapa')}
        >
          <MaterialCommunityIcons name="tune-variant" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('mapa.buscar')}
          placeholderTextColor={colors.secondary}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
          accessibilityLabel={t('a11y.buscarLocal')}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchText('')}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.limparBusca')}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chipsRow} accessibilityRole="tablist">
        {CHIPS.map((c) => {
          const active = activeChip === c.key;
          const rotulo = t(c.chave);
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                haptics.selecao();
                setActiveChip(c.key);
              }}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t('a11y.filtro', { nome: rotulo })}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{rotulo}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.mapContainer}>
        <LeafletMap
          ref={mapRef}
          userCoords={coords}
          riskZones={riskZones}
          incidents={incidentMarkers}
          showIncidents={showIncidents}
          activeZoneFilter={activeZoneFilter}
          markedZones={showZonasComunidade ? markedZones : []}
          drawColor={markColor}
          heatPoints={heatPoints}
          showHeat={showHeat}
          safePlaces={safePlaceMarkers}
          showSafePlaces={showSafePlaces}
          onMapPress={handleMapPress}
          onMarkPress={handleMarkPress}
          onSafePlacePress={handleSafePlaceAction}
          maxBounds={FORTALEZA_BOUNDS}
          initialCenter={FORTALEZA_CENTER}
          initialZoom={14}
          isDarkMode={isDarkMode}
          labels={rotulosMapa}
          accessibilityLabel={tp('mapa.relatos', 'mapa.relatosPlural', occurrences.length)}
        />

        {(loading || errorMsg) && !markColor && (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.statusBanner,
              { backgroundColor: errorMsg ? 'rgba(255,59,48,0.92)' : 'rgba(0,122,255,0.92)' },
            ]}
          >
            {loading && !errorMsg ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="alert-circle" size={18} color="#FFF" />
            )}
            <Text style={styles.statusText}>{errorMsg ?? t('mapa.obtendoLocalizacao')}</Text>
          </View>
        )}

        {markColor && (
          <View style={styles.markHint} accessibilityLiveRegion="polite">
            <MaterialCommunityIcons name="map-marker-plus" size={18} color="#FFF" />
            <Text style={styles.statusText}>{t('mapa.dicaMarcacao')}</Text>
          </View>
        )}

        {latestOccurrence ? (
          <TouchableOpacity
            style={[styles.incidentCard, { bottom: fabBaseBottom, right: 92 }]}
            activeOpacity={0.85}
            onPress={() => router.push('/ocorrencias')}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.verOcorrencias')}
          >
            <View
              style={[
                styles.incidentIconBox,
                { backgroundColor: latestOccurrence.type === 'error' ? 'rgba(229,57,53,0.12)' : 'rgba(251,140,0,0.12)' },
              ]}
            >
              <MaterialCommunityIcons
                name={latestOccurrence.type === 'error' ? 'alert-decagram' : 'alert'}
                size={22}
                color={latestOccurrence.type === 'error' ? '#E53935' : '#FB8C00'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.incidentTitle} numberOfLines={1}>
                {latestOccurrence.title}
              </Text>
              <Text style={styles.incidentSubtitle} numberOfLines={1}>
                {(latestOccurrence.location || t('mapa.pertoDeVoce')) +
                  ' · ' +
                  timeAgo(latestOccurrence.created_at) +
                  ' · ' +
                  tp('mapa.relatos', 'mapa.relatosPlural', occurrences.length)}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.incidentCard, { bottom: fabBaseBottom, right: 92 }]}>
            <View style={[styles.incidentIconBox, { backgroundColor: 'rgba(52,199,89,0.12)' }]}>
              <MaterialCommunityIcons name="shield-check-outline" size={22} color="#34C759" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyCardText}>{t('mapa.semAlertas')}</Text>
            </View>
          </View>
        )}

        <View style={[styles.fabColumn, { bottom: fabBaseBottom + 60 + 12 }]}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              haptics.toque();
              mapRef.current?.recenter();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.recentralizarMapa')}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary ?? '#4285F4'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fab}
            onPress={shareLocation}
            disabled={sharing}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.compartilharLocal')}
            accessibilityState={{ disabled: sharing, busy: sharing }}
          >
            {sharing ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <MaterialCommunityIcons name="share-variant" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.reportFab, { bottom: fabBaseBottom + 8 }]}
          activeOpacity={0.85}
          onPress={() => {
            haptics.toque();
            setReportVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.reportarOcorrencia')}
        >
          <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Sheet de configurações do mapa */}
      <Modal animationType="slide" transparent visible={settingsVisible} onRequestClose={() => setSettingsVisible(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setSettingsVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheetContent} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} accessibilityRole="header">
                {t('mapa.configuracoes')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSettingsVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.fecharModal')}
              >
                <MaterialCommunityIcons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>{t('mapa.marcarArea')}</Text>
              <Text style={[styles.toggleLabel, { fontSize: 12, marginBottom: 8, opacity: 0.75 }]}>
                {t('mapa.marcarAreaAjuda')}
              </Text>
              {ZONAS_LEGENDA.map((z) => {
                const selected = markColor === z.level;
                const inactive = markColor !== null && !selected;
                return (
                  <TouchableOpacity
                    key={z.level}
                    style={[styles.legendaItem, inactive && styles.legendaItemInactive]}
                    onPress={() => selectMarkColor(z.level)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t('a11y.filtro', { nome: z.rotulo })}
                  >
                    <View style={[styles.legendaColorBox, { backgroundColor: z.cor }]} />
                    <Text style={styles.legendaItemText}>{z.rotulo}</Text>
                    {selected && <MaterialCommunityIcons name="check-circle" size={18} color={z.cor} />}
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.sectionLabel}>{t('mapa.raioBusca')}</Text>
              <View style={styles.radiusRow}>
                {RADIUS_OPTIONS.map((valor) => {
                  const rotulo = valor >= 1000 ? `${valor / 1000}km` : `${valor}m`;
                  const ativo = radius === valor;
                  return (
                    <TouchableOpacity
                      key={valor}
                      style={[styles.chip, ativo && styles.chipActive]}
                      onPress={() => {
                        haptics.selecao();
                        setRadius(valor);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: ativo }}
                      accessibilityLabel={t('a11y.filtro', { nome: rotulo })}
                    >
                      <Text style={[styles.chipText, ativo && styles.chipTextActive]}>{rotulo}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>{t('mapa.periodo')}</Text>
              <View style={styles.radiusRow}>
                {PERIODOS.map((p) => {
                  const rotulo = t(p.chave);
                  const ativo = periodo === p.valor;
                  return (
                    <TouchableOpacity
                      key={p.valor}
                      style={[styles.chip, ativo && styles.chipActive]}
                      onPress={() => {
                        haptics.selecao();
                        setPeriodo(p.valor);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: ativo }}
                      accessibilityLabel={t('a11y.filtro', { nome: rotulo })}
                    >
                      <Text style={[styles.chipText, ativo && styles.chipTextActive]}>{rotulo}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>{t('mapa.exibicao')}</Text>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{t('mapa.mostrarIncidentes')}</Text>
                <Switch
                  value={showIncidents}
                  onValueChange={(v) => {
                    haptics.selecao();
                    setShowIncidents(v);
                  }}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel={t('mapa.mostrarIncidentes')}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.toggleLabel}>{t('mapa.mostrarCalor')}</Text>
                  <Text style={[styles.toggleLabel, { fontSize: 11, opacity: 0.7 }]}>
                    {t('mapa.mostrarCalorAjuda')}
                  </Text>
                </View>
                <Switch
                  value={showHeat}
                  onValueChange={(v) => {
                    haptics.selecao();
                    setShowHeat(v);
                  }}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel={t('mapa.mostrarCalor')}
                />
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{t('mapa.mostrarPontosSeguros')}</Text>
                <Switch
                  value={showSafePlaces}
                  onValueChange={(v) => {
                    haptics.selecao();
                    setShowSafePlaces(v);
                  }}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel={t('mapa.mostrarPontosSeguros')}
                />
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{t('mapa.mostrarZonasComunidade')}</Text>
                <Switch
                  value={showZonasComunidade}
                  onValueChange={(v) => {
                    haptics.selecao();
                    setShowZonasComunidade(v);
                  }}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel={t('mapa.mostrarZonasComunidade')}
                />
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal de report rápido de ocorrência */}
      <Modal animationType="slide" transparent visible={reportVisible} onRequestClose={closeReportModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle} accessibilityRole="header">
                  {t('mapa.reportar')}
                </Text>
                <Text style={styles.modalSubtitle}>{t('mapa.reportarSubtitulo')}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeReportModal}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.fecharModal')}
              >
                <MaterialCommunityIcons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('mapa.gravidade')}</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeChip, reportType === 'error' && { borderColor: '#E53935', backgroundColor: 'rgba(229,57,53,0.08)' }]}
                onPress={() => {
                  haptics.selecao();
                  setReportType('error');
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: reportType === 'error' }}
                accessibilityLabel={t('mapa.emergencia')}
              >
                <MaterialCommunityIcons name="alert-decagram" size={18} color="#E53935" />
                <Text style={styles.typeChipText}>{t('mapa.emergencia')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeChip, reportType === 'warning' && { borderColor: '#FB8C00', backgroundColor: 'rgba(251,140,0,0.08)' }]}
                onPress={() => {
                  haptics.selecao();
                  setReportType('warning');
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: reportType === 'warning' }}
                accessibilityLabel={t('mapa.atencaoTipo')}
              >
                <MaterialCommunityIcons name="alert" size={18} color="#FB8C00" />
                <Text style={styles.typeChipText}>{t('mapa.atencaoTipo')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('mapa.categoria')}</Text>
            <View style={[styles.radiusRow, { flexWrap: 'wrap', marginBottom: 4 }]}>
              {CATEGORIAS_RELATO.map((chave) => {
                const rotulo = t(`mapa.${chave}` as const);
                const ativo = reportCategory === rotulo;
                return (
                  <TouchableOpacity
                    key={chave}
                    style={[styles.chip, ativo && styles.chipActive]}
                    onPress={() => {
                      haptics.selecao();
                      setReportCategory(rotulo);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                    accessibilityLabel={rotulo}
                  >
                    <Text style={[styles.chipText, ativo && styles.chipTextActive]}>{rotulo}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {reportCategory === t('mapa.catOutro') && (
              <TextInput
                style={[styles.input, { marginTop: 14 }]}
                value={reportTitleCustom}
                onChangeText={setReportTitleCustom}
                placeholder={t('mapa.qualOcorrencia')}
                placeholderTextColor={colors.secondary}
                maxLength={40}
                accessibilityLabel={t('mapa.qualOcorrencia')}
              />
            )}

            <Text style={[styles.inputLabel, { marginTop: 18 }]}>{t('mapa.descricao')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reportDescription}
              onChangeText={setReportDescription}
              placeholder={t('mapa.descrevaOqueAconteceu')}
              placeholderTextColor={colors.secondary}
              multiline
              textAlignVertical="top"
              maxLength={160}
              accessibilityLabel={t('mapa.descricao')}
            />

            <TouchableOpacity
              style={[styles.saveButton, (!canSubmitReport || reportSaving) && styles.saveButtonDisabled]}
              activeOpacity={0.85}
              onPress={submitReport}
              disabled={!canSubmitReport || reportSaving}
              accessibilityRole="button"
              accessibilityLabel={t('mapa.registrarOcorrencia')}
              accessibilityState={{ disabled: !canSubmitReport || reportSaving, busy: reportSaving }}
            >
              {reportSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>{t('mapa.registrarOcorrencia')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}
