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
import { LeafletMap, type RiskZone, type IncidentMarker } from '../components/LeafletMap';
import { api } from '../services/api';

const SAMPLE_RISK_ZONES: RiskZone[] = [
  { id: 1, lat: -3.7327, lng: -38.5270, radius: 250, level: 'high', label: 'Área de alto risco' },
  { id: 2, lat: -3.7280, lng: -38.5310, radius: 180, level: 'medium', label: 'Atenção redobrada' },
  { id: 3, lat: -3.7360, lng: -38.5200, radius: 220, level: 'low', label: 'Risco baixo' },
];

export default function MapaScreen() {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const { coords, errorMsg, loading } = useLocation();
  const [showRisk, setShowRisk] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [incidents, setIncidents] = useState<IncidentMarker[]>([]);
  const [sharing, setSharing] = useState(false);
  const mapRef = useRef<{ recenter: () => void }>(null);

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
    return () => { cancelled = true; };
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
        <Text style={styles.title}>Mapa em Tempo Real</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.mapContainer}>
        <LeafletMap
          ref={mapRef}
          userCoords={coords}
          riskZones={SAMPLE_RISK_ZONES}
          incidents={incidents}
          showRiskZones={showRisk}
          showIncidents={showIncidents}
          isDarkMode={isDarkMode}
        />

        {/* Filtro simplificado */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterChip, showRisk && styles.filterChipActive]}
            onPress={() => setShowRisk((v) => !v)}
          >
            <MaterialCommunityIcons name="alert-circle" size={16} color={showRisk ? '#fff' : colors.text} />
            <Text style={[styles.filterChipText, showRisk && styles.filterChipTextActive]}>Áreas de risco</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, showIncidents && styles.filterChipActive]}
            onPress={() => setShowIncidents((v) => !v)}
          >
            <MaterialCommunityIcons name="map-marker" size={16} color={showIncidents ? '#fff' : colors.text} />
            <Text style={[styles.filterChipText, showIncidents && styles.filterChipTextActive]}>Ocorrências</Text>
          </TouchableOpacity>
        </View>

        {/* Botões flutuantes */}
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

        {/* Status overlay */}
        {(loading || errorMsg) && (
          <View style={styles.statusBanner}>
            {loading && !errorMsg && <ActivityIndicator color="#fff" />}
            <Text style={styles.statusText}>
              {errorMsg ?? 'Obtendo localização...'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
