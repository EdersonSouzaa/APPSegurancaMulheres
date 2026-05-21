import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import { getStyles } from '../styles/mapa.styles';
import { useLocation } from '../hooks/use-location';
import {
  LeafletMap,
  type RiskZone,
  type IncidentMarker,
  type ZoneLevel,
  type LatLngBounds,
} from '../components/LeafletMap';
import { api } from '../services/api';

const FORTALEZA_BOUNDS: LatLngBounds = [
  [-3.9, -38.65],
  [-3.65, -38.35],
];
const FORTALEZA_CENTER: [number, number] = [-3.766, -38.483];

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

export default function MapaScreen() {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const { coords, errorMsg, loading } = useLocation();
  const [activeZone, setActiveZone] = useState<ZoneLevel | null>(null);
  const [incidents, setIncidents] = useState<IncidentMarker[]>([]);
  const [sharing, setSharing] = useState(false);
  const mapRef = useRef<{ recenter: () => void }>(null);

  const toggleZone = (zone: ZoneLevel) => {
    setActiveZone((prev) => (prev === zone ? null : zone));
  };

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const data = await api.get(
          `/ocorrencias/proximas?lat=${coords.latitude}&lng=${coords.longitude}&radius=5000`,
          token
        );
        if (cancelled || !Array.isArray(data)) return;
        setIncidents(
          data
            .filter((o: any) => o.latitude != null && o.longitude != null)
            .map((o: any) => ({
              id: o.id,
              lat: Number(o.latitude),
              lng: Number(o.longitude),
              type: o.type === 'warning' ? 'warning' : 'error',
              title: o.title,
            }))
        );
      } catch {
        // silent — sem conexão ainda mostra mapa
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coords?.latitude, coords?.longitude]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mapa de Risco</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.mapContainer}>
        <LeafletMap
          ref={mapRef}
          userCoords={coords}
          riskZones={SAMPLE_RISK_ZONES}
          incidents={incidents}
          showIncidents
          activeZoneFilter={activeZone}
          maxBounds={FORTALEZA_BOUNDS}
          initialCenter={FORTALEZA_CENTER}
          initialZoom={14}
          isDarkMode={isDarkMode}
        />

        {/* Status overlay (loading / error) */}
        {(loading || errorMsg) && (
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

        {/* Legenda interativa (Seguras / Alerta / Perigo) */}
        <View style={styles.legendaContainer}>
          <Text style={styles.legendaTitle}>Zonas</Text>
          {ZONES.map((z, i) => {
            const inactive = activeZone !== null && activeZone !== z.level;
            const isLast = i === ZONES.length - 1;
            return (
              <TouchableOpacity
                key={z.level}
                style={[
                  styles.legendaItem,
                  isLast && { marginBottom: 0 },
                  inactive && styles.legendaItemInactive,
                ]}
                onPress={() => toggleZone(z.level)}
                activeOpacity={0.7}
              >
                <View style={[styles.legendaColorBox, { backgroundColor: z.color }]} />
                <Text style={styles.legendaItemText}>{z.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FABs: recenter + share location */}
        <View style={styles.fabColumn}>
          <TouchableOpacity style={styles.fab} onPress={() => mapRef.current?.recenter()}>
            <MaterialCommunityIcons name="crosshairs-gps" size={24} color={colors.primary ?? '#4285F4'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fab, styles.fabPrimary]} onPress={shareLocation} disabled={sharing}>
            {sharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MaterialCommunityIcons name="share-variant" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
