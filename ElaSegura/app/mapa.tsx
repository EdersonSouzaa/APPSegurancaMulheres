import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import { getStyles } from '../styles/mapa.styles';
import { useLocation } from '../hooks/use-location';
import { useMarkedZones } from '../hooks/use-marked-zones';
import {
  LeafletMap,
  type RiskZone,
  type IncidentMarker,
  type ZoneLevel,
  type LatLngBounds,
} from '../components/LeafletMap';
import { ToastNotification } from '../components/ToastNotification';
import { BackHomeButton } from '../components/BackHomeButton';
import { api } from '../services/api';

const FORTALEZA_BOUNDS: LatLngBounds = [
  [-3.9, -38.65],
  [-3.65, -38.35],
];
const FORTALEZA_CENTER: [number, number] = [-3.766, -38.483];

/** Raio (em metros) das áreas marcadas pelo usuário (feat #71). */
const MARK_RADIUS = 250;

const SAMPLE_RISK_ZONES: RiskZone[] = [
  { id: 1, lat: -3.771, lng: -38.479, radius: 800, level: 'safe', label: 'Área segura' },
  { id: 2, lat: -3.754, lng: -38.490, radius: 1000, level: 'safe', label: 'Área segura' },
  { id: 3, lat: -3.760, lng: -38.470, radius: 600, level: 'alert', label: 'Atenção' },
  { id: 4, lat: -3.768, lng: -38.500, radius: 900, level: 'danger', label: 'Área de perigo' },
];

const ZONES: { level: ZoneLevel; label: string; color: string }[] = [
  { level: 'safe', label: 'Seguras', color: '#34C759' },
  { level: 'alert', label: 'Alerta', color: '#FFCC00' },
  { level: 'danger', label: 'Perigo', color: '#FF3B30' },
];

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'risco', label: 'Risco alto' },
  { key: 'meus', label: 'Meus' },
];

const RADIUS_OPTIONS = [
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '2km', value: 2000 },
  { label: '5km', value: 5000 },
];

const REPORT_CATEGORIES = ['Assédio', 'Roubo', 'Suspeita', 'Outro'];

type ChipKey = 'todos' | 'risco' | 'meus';

type OccurrenceRow = {
  id: number | string;
  title: string;
  description?: string;
  location?: string | null;
  type: 'error' | 'warning';
  latitude: number;
  longitude: number;
  created_at?: string;
};

function timeAgo(iso?: string): string {
  if (!iso) return 'agora';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export default function MapaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const { coords, errorMsg, loading } = useLocation();
  const [occurrences, setOccurrences] = useState<OccurrenceRow[]>([]);
  const [sharing, setSharing] = useState(false);
  const mapRef = useRef<{ recenter: () => void }>(null);

  // Busca, filtros e configurações (feat: redesign do mapa)
  const [searchText, setSearchText] = useState('');
  const [activeChip, setActiveChip] = useState<ChipKey>('todos');
  const [radius, setRadius] = useState(5000);
  const [showIncidents, setShowIncidents] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // feat #71 — marcação de áreas: cor "armada" na legenda + áreas marcadas (persistidas no device)
  const [markColor, setMarkColor] = useState<ZoneLevel | null>(null);
  const { markedZones, setMarkedZones } = useMarkedZones();

  // Reportar ocorrência rápida direto do mapa
  const [reportVisible, setReportVisible] = useState(false);
  const [reportType, setReportType] = useState<'error' | 'warning'>('error');
  const [reportCategory, setReportCategory] = useState('');
  const [reportTitleCustom, setReportTitleCustom] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSaving, setReportSaving] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger' | 'info'>('success');

  const showToast = (message: string, type: 'success' | 'danger' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const selectMarkColor = (level: ZoneLevel) => {
    setMarkColor((prev) => (prev === level ? null : level));
  };

  // Toque no mapa em modo de marcação: adiciona uma área da cor armada
  const handleMapPress = (lat: number, lng: number) => {
    if (!markColor) return;
    setMarkedZones((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        lat,
        lng,
        level: markColor,
        radius: MARK_RADIUS,
      },
    ]);
  };

  // Toque numa área marcada (fora do modo de marcação): oferece remover
  const handleMarkPress = (id: string) => {
    if (markColor) return; // marcando: não remove
    Alert.alert('Remover marcação', 'Deseja remover esta área marcada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => setMarkedZones((prev) => prev.filter((z) => z.id !== id)),
      },
    ]);
  };

  // Busca ocorrências reais da API: "Todos"/"Risco alto" usam /ocorrencias/proximas (raio + busca
  // textual), "Meus" usa /ocorrencias (só os relatos do usuário logado). Ambos os endpoints já
  // suportam o parâmetro `filter`, então a busca por texto é resolvida no servidor.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (activeChip !== 'meus' && !coords) return;
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          if (!cancelled) setOccurrences([]);
          return;
        }

        let data: any;
        if (activeChip === 'meus') {
          const qs = searchText.trim() ? `?filter=${encodeURIComponent(searchText.trim())}` : '';
          data = await api.get(`/ocorrencias${qs}`, token);
        } else {
          const params = new URLSearchParams({
            lat: String(coords!.latitude),
            lng: String(coords!.longitude),
            radius: String(radius),
          });
          if (searchText.trim()) params.set('filter', searchText.trim());
          data = await api.get(`/ocorrencias/proximas?${params.toString()}`, token);
        }

        if (cancelled || !Array.isArray(data)) return;

        let rows: OccurrenceRow[] = data
          .filter((o: any) => o.latitude != null && o.longitude != null)
          .map((o: any) => ({
            id: o.id,
            title: o.title,
            description: o.description,
            location: o.location,
            type: o.type === 'warning' ? 'warning' : 'error',
            latitude: Number(o.latitude),
            longitude: Number(o.longitude),
            created_at: o.created_at,
          }));

        if (activeChip === 'risco') {
          rows = rows.filter((r) => r.type === 'error');
        }

        setOccurrences(rows);
      } catch {
        // silent — sem conexão ainda mostra mapa
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [coords?.latitude, coords?.longitude, activeChip, radius, searchText, refreshTick]);

  const incidentMarkers: IncidentMarker[] = useMemo(
    () => occurrences.map((o) => ({ id: o.id, lat: o.latitude, lng: o.longitude, type: o.type, title: o.title })),
    [occurrences]
  );

  const latestOccurrence = useMemo(() => {
    if (!occurrences.length) return null;
    return [...occurrences].sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )[0];
  }, [occurrences]);

  const riskZones = activeChip === 'meus' ? [] : SAMPLE_RISK_ZONES;
  const activeZoneFilter: ZoneLevel | null = activeChip === 'risco' ? 'danger' : null;

  const shareLocation = async () => {
    if (!coords) {
      Alert.alert('Localização', 'Aguardando GPS...');
      return;
    }
    setSharing(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Atenção', 'Faça login para compartilhar sua localização.');
        return;
      }
      const locationStr = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
      const res = await api.post('/sos', { location: locationStr }, token);
      const num = res?.contatosEmergencia?.length ?? 0;
      Alert.alert(
        'Localização compartilhada',
        num > 0
          ? `Sua localização foi enviada para ${num} contato(s) de emergência.`
          : 'SOS registrado, mas você não tem contatos emergenciais cadastrados.'
      );
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível compartilhar a localização.');
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

  const reportTitle = reportCategory === 'Outro' ? reportTitleCustom.trim() : reportCategory;
  const canSubmitReport = reportTitle.length > 0 && reportDescription.trim().length > 0;

  const submitReport = async () => {
    if (!canSubmitReport) return;
    if (!coords) {
      Alert.alert('Localização', 'Aguardando GPS para anexar sua posição ao relato.');
      return;
    }
    setReportSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Atenção', 'Faça login para registrar uma ocorrência.');
        return;
      }
      await api.post(
        '/ocorrencias',
        {
          title: reportTitle,
          description: reportDescription.trim(),
          type: reportType,
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        token
      );
      showToast('Ocorrência registrada com sucesso!', 'success');
      closeReportModal();
      setRefreshTick((t) => t + 1);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível registrar a ocorrência.');
    } finally {
      setReportSaving(false);
    }
  };

  const subtitle = errorMsg ? 'Fortaleza · sem GPS' : loading ? 'Fortaleza · localizando...' : 'Fortaleza · tempo real';

  const fabBaseBottom = 24 + insets.bottom;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BackHomeButton />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.headerTitle}>Mapa de segurança</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setSettingsVisible(true)}>
          <MaterialCommunityIcons name="tune-variant" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar local ou bairro"
          placeholderTextColor={colors.secondary}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chipsRow}>
        {CHIPS.map((c) => {
          const active = activeChip === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setActiveChip(c.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
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
          markedZones={markedZones}
          drawColor={markColor}
          onMapPress={handleMapPress}
          onMarkPress={handleMarkPress}
          maxBounds={FORTALEZA_BOUNDS}
          initialCenter={FORTALEZA_CENTER}
          initialZoom={14}
          isDarkMode={isDarkMode}
        />

        {/* Status overlay (loading / error) — some quando não há dica de marcação ativa */}
        {(loading || errorMsg) && !markColor && (
          <View
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
            <Text style={styles.statusText}>{errorMsg ?? 'Obtendo localização...'}</Text>
          </View>
        )}

        {/* Dica do modo de marcação (feat #71) */}
        {markColor && (
          <View style={styles.markHint}>
            <MaterialCommunityIcons name="map-marker-plus" size={18} color="#FFF" />
            <Text style={styles.statusText}>
              Toque no mapa para marcar uma área. Toque na cor de novo para sair.
            </Text>
          </View>
        )}

        {/* Card com a ocorrência mais recente por perto */}
        {latestOccurrence ? (
          <TouchableOpacity
            style={[styles.incidentCard, { bottom: fabBaseBottom, right: 92 }]}
            activeOpacity={0.85}
            onPress={() => router.push('/ocorrencias')}
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
                {(latestOccurrence.location || 'Perto de você') + ' · ' + timeAgo(latestOccurrence.created_at) + ' · ' + occurrences.length + ' relato' + (occurrences.length === 1 ? '' : 's')}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.incidentCard, { bottom: fabBaseBottom, right: 92 }]}>
            <View style={[styles.incidentIconBox, { backgroundColor: 'rgba(52,199,89,0.12)' }]}>
              <MaterialCommunityIcons name="shield-check-outline" size={22} color="#34C759" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyCardText}>Nenhum alerta por perto agora</Text>
            </View>
          </View>
        )}

        {/* FABs secundárias: recentralizar + compartilhar localização */}
        <View style={[styles.fabColumn, { bottom: fabBaseBottom + 60 + 12 }]}>
          <TouchableOpacity style={styles.fab} onPress={() => mapRef.current?.recenter()}>
            <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary ?? '#4285F4'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={shareLocation} disabled={sharing}>
            {sharing ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <MaterialCommunityIcons name="share-variant" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* FAB grande: reportar ocorrência agora */}
        <TouchableOpacity
          style={[styles.reportFab, { bottom: fabBaseBottom + 8 }]}
          activeOpacity={0.85}
          onPress={() => setReportVisible(true)}
        >
          <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Sheet de configurações: marcar áreas, raio de busca, exibir incidentes */}
      <Modal animationType="slide" transparent visible={settingsVisible} onRequestClose={() => setSettingsVisible(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setSettingsVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheetContent} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Configurações do mapa</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSettingsVisible(false)}>
                <MaterialCommunityIcons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>Marcar área no mapa</Text>
              {ZONES.map((z) => {
                const selected = markColor === z.level;
                const inactive = markColor !== null && !selected;
                return (
                  <TouchableOpacity
                    key={z.level}
                    style={[styles.legendaItem, inactive && styles.legendaItemInactive]}
                    onPress={() => selectMarkColor(z.level)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.legendaColorBox, { backgroundColor: z.color }]} />
                    <Text style={styles.legendaItemText}>{z.label}</Text>
                    {selected && <MaterialCommunityIcons name="check-circle" size={18} color={z.color} />}
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.sectionLabel}>Raio de busca (Todos / Risco alto)</Text>
              <View style={styles.radiusRow}>
                {RADIUS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, radius === opt.value && styles.chipActive]}
                    onPress={() => setRadius(opt.value)}
                  >
                    <Text style={[styles.chipText, radius === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Exibição</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Mostrar incidentes no mapa</Text>
                <Switch
                  value={showIncidents}
                  onValueChange={setShowIncidents}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#FFFFFF"
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
                <Text style={styles.modalTitle}>Reportar ocorrência</Text>
                <Text style={styles.modalSubtitle}>Sua localização atual será anexada</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={closeReportModal}>
                <MaterialCommunityIcons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Gravidade</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeChip, reportType === 'error' && { borderColor: '#E53935', backgroundColor: 'rgba(229,57,53,0.08)' }]}
                onPress={() => setReportType('error')}
              >
                <MaterialCommunityIcons name="alert-decagram" size={18} color="#E53935" />
                <Text style={styles.typeChipText}>Emergência</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeChip, reportType === 'warning' && { borderColor: '#FB8C00', backgroundColor: 'rgba(251,140,0,0.08)' }]}
                onPress={() => setReportType('warning')}
              >
                <MaterialCommunityIcons name="alert" size={18} color="#FB8C00" />
                <Text style={styles.typeChipText}>Atenção</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Categoria</Text>
            <View style={[styles.radiusRow, { flexWrap: 'wrap', marginBottom: 4 }]}>
              {REPORT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, reportCategory === cat && styles.chipActive]}
                  onPress={() => setReportCategory(cat)}
                >
                  <Text style={[styles.chipText, reportCategory === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {reportCategory === 'Outro' && (
              <TextInput
                style={[styles.input, { marginTop: 14 }]}
                value={reportTitleCustom}
                onChangeText={setReportTitleCustom}
                placeholder="Qual foi a ocorrência?"
                placeholderTextColor={colors.secondary}
                maxLength={40}
              />
            )}

            <Text style={[styles.inputLabel, { marginTop: 18 }]}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reportDescription}
              onChangeText={setReportDescription}
              placeholder="Descreva o que aconteceu"
              placeholderTextColor={colors.secondary}
              multiline
              textAlignVertical="top"
              maxLength={160}
            />

            <TouchableOpacity
              style={[styles.saveButton, (!canSubmitReport || reportSaving) && styles.saveButtonDisabled]}
              activeOpacity={0.85}
              onPress={submitReport}
              disabled={!canSubmitReport || reportSaving}
            >
              {reportSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>Registrar ocorrência</Text>
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
