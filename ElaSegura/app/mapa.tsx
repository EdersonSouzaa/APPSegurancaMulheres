import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors as ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/colors';

const BAIRROS = [
  { name: 'Meireles', risk: 'safe', incidents: 0, lat: -3.7247, lng: -38.5016 },
  { name: 'Aldeota', risk: 'safe', incidents: 1, lat: -3.7389, lng: -38.5024 },
  { name: 'Cocó', risk: 'safe', incidents: 2, lat: -3.7533, lng: -38.4824 },
  { name: 'Centro', risk: 'medium', incidents: 5, lat: -3.7172, lng: -38.5431 },
  { name: 'Papicu', risk: 'medium', incidents: 3, lat: -3.7400, lng: -38.4900 },
  { name: 'Bairro de Fátima', risk: 'safe', incidents: 0, lat: -3.7450, lng: -38.5250 },
  { name: 'Pirambu', risk: 'danger', incidents: 8, lat: -3.7021, lng: -38.5621 },
  { name: 'Damas', risk: 'medium', incidents: 4, lat: -3.7606, lng: -38.5386 },
  { name: 'Siqueira', risk: 'danger', incidents: 6, lat: -3.7986, lng: -38.5997 },
  { name: 'Bom Jardim', risk: 'danger', incidents: 9, lat: -3.8211, lng: -38.5858 },
  { name: 'Messejana', risk: 'medium', incidents: 2, lat: -3.8178, lng: -38.4960 },
  { name: 'Edson Queiroz', risk: 'safe', incidents: 0, lat: -3.7935, lng: -38.4735 },
];

const OCORRENCIAS = [
  { id: 1, tipo: 'Assédio verbal', bairro: 'Centro', hora: 'há 20 min', risco: 'medium' },
  { id: 2, tipo: 'Perseguição', bairro: 'Pirambu', hora: 'há 45 min', risco: 'danger' },
  { id: 3, tipo: 'Iluminação ruim', bairro: 'Bom Jardim', hora: 'há 1h', risco: 'danger' },
  { id: 4, tipo: 'Sensação de perigo', bairro: 'Papicu', hora: 'há 2h', risco: 'medium' },
  { id: 5, tipo: 'Assédio físico', bairro: 'Siqueira', hora: 'há 3h', risco: 'danger' },
  { id: 6, tipo: 'Assédio verbal', bairro: 'Damas', hora: 'há 4h', risco: 'medium' },
  { id: 7, tipo: 'Perseguição', bairro: 'Pirambu', hora: 'há 5h', risco: 'danger' },
  { id: 8, tipo: 'Iluminação ruim', bairro: 'Centro', hora: 'há 6h', risco: 'medium' },
];

const getRiskConfig = (isDarkMode: boolean) => ({
  safe: { 
    bg: isDarkMode ? '#1B2E1D' : '#E8F5E9', 
    border: isDarkMode ? '#2D5131' : '#A5D6A7', 
    text: isDarkMode ? '#81C784' : '#2E7D32', 
    label: 'Seguro', 
    icon: 'checkmark-circle' as const, 
    iconColor: '#43A047' 
  },
  medium: { 
    bg: isDarkMode ? '#332B1A' : '#FFF8E1', 
    border: isDarkMode ? '#5A4A2D' : '#FFD54F', 
    text: isDarkMode ? '#FFD54F' : '#E65100', 
    label: 'Atenção', 
    icon: 'warning' as const, 
    iconColor: '#FF8F00' 
  },
  danger: { 
    bg: isDarkMode ? '#331A1D' : '#FFEBEE', 
    border: isDarkMode ? '#5A2D31' : '#EF9A9A', 
    text: isDarkMode ? '#EF9A9A' : '#B71C1C', 
    label: 'Perigo', 
    icon: 'alert-circle' as const, 
    iconColor: '#E53935' 
  },
});

const FILTERS = ['Todos', 'Assédio verbal', 'Assédio físico', 'Perseguição', 'Iluminação ruim', 'Sensação de perigo'];

const TIPO_ICON: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  'Assédio verbal': { icon: 'megaphone-outline', color: '#FB8C00' },
  'Assédio físico': { icon: 'hand-left-outline', color: '#E53935' },
  'Perseguição': { icon: 'walk-outline', color: '#8E24AA' },
  'Iluminação ruim': { icon: 'bulb-outline', color: '#3949AB' },
  'Sensação de perigo': { icon: 'alert-outline', color: '#F06292' },
};

export default function MapaScreen() {
  const { isDarkMode, theme } = useTheme();
  const colors = ThemeColors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);
  const riskConfig = useMemo(() => getRiskConfig(isDarkMode), [isDarkMode]);

  const [filter, setFilter] = useState('Todos');
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bairros' | 'ocorrencias'>('ocorrencias');

  const totalOcorrencias = BAIRROS.reduce((a, b) => a + b.incidents, 0);

  const ocorrenciasFiltradas = [...OCORRENCIAS].reverse().filter(o =>
    filter === 'Todos' || o.tipo === filter
  );

  const bairrosFiltrados = filter === 'Todos'
    ? BAIRROS
    : BAIRROS.filter(b => b.incidents > 0);

  return (
    <SafeAreaView style={styles.safe}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>Mapa de Segurança</Text>
          <Text style={styles.headerSub}>Fortaleza · {totalOcorrencias} ocorrências hoje</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="location" size={14} color={Colors.pinkBtn} />
          <Text style={styles.headerBadgeText}>Meireles</Text>
        </View>
      </View>

      <View style={styles.mapCard}>
        <Image
          source={require('../assets/images/mapa.png')}
          style={styles.mapImage}
          resizeMode="cover"
        />
        <View style={styles.mapOverlay}>
          <View style={styles.mapYouPin}>
            <View style={styles.mapYouDot} />
            <Text style={styles.mapYouLabel}>Você</Text>
          </View>
        </View>
        <View style={styles.mapBadgeRow}>
          {Object.entries(riskConfig).map(([key, val]) => (
            <View key={key} style={[styles.mapBadge, { backgroundColor: val.bg, borderColor: val.border }]}>
              <View style={[styles.mapBadgeDot, { backgroundColor: val.iconColor }]} />
              <Text style={[styles.mapBadgeText, { color: val.text }]}>{val.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Seguro', count: BAIRROS.filter(b => b.risk === 'safe').length, color: '#43A047' },
          { label: 'Atenção', count: BAIRROS.filter(b => b.risk === 'medium').length, color: '#FF8F00' },
          { label: 'Perigo', count: BAIRROS.filter(b => b.risk === 'danger').length, color: '#E53935' },
        ].map(st => (
          <View key={st.label} style={styles.statCard}>
            <Text style={[styles.statNum, { color: st.color }]}>{st.count}</Text>
            <Text style={styles.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'ocorrencias' && styles.tabActive]} onPress={() => setActiveTab('ocorrencias')}>
          <Text style={[styles.tabText, activeTab === 'ocorrencias' && styles.tabTextActive]}>
            Ocorrências recentes
          </Text>
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{ocorrenciasFiltradas.length}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'bairros' && styles.tabActive]} onPress={() => setActiveTab('bairros')}>
          <Text style={[styles.tabText, activeTab === 'bairros' && styles.tabTextActive]}>Bairros</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {activeTab === 'bairros' && (
          <View style={styles.grid}>
            {bairrosFiltrados.map(b => {
              const rc = riskConfig[b.risk as keyof typeof riskConfig];
              const isSel = selectedB === b.name;
              return (
                <TouchableOpacity
                  key={b.name}
                  style={[styles.bCard, { borderColor: isSel ? rc.iconColor : rc.border }, isSel && { borderWidth: 2 }]}
                  onPress={() => setSelectedB(isSel ? null : b.name)}
                  activeOpacity={0.75}
                >
                  <View style={styles.bCardTop}>
                    <View style={[styles.bRiskDot, { backgroundColor: rc.iconColor }]} />
                    <Text style={styles.bName}>{b.name}</Text>
                    {b.incidents > 0 && (
                      <View style={[styles.bBadge, { backgroundColor: rc.bg }]}>
                        <Text style={[styles.bBadgeText, { color: rc.text }]}>{b.incidents}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.bRiskTag, { backgroundColor: rc.bg }]}>
                    <Ionicons name={rc.icon} size={11} color={rc.iconColor} />
                    <Text style={[styles.bRiskLabel, { color: rc.text }]}>{rc.label}</Text>
                  </View>
                  {isSel && (
                    <Text style={[styles.bDetail, { color: rc.text }]}>
                      {b.incidents === 0
                        ? 'Nenhuma ocorrência recente'
                        : `${b.incidents} ocorrência${b.incidents > 1 ? 's' : ''} nas últimas 24h`}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {activeTab === 'ocorrencias' && (
          <View style={styles.oList}>
            {ocorrenciasFiltradas.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={48} color="#A5D6A7" />
                <Text style={styles.emptyText}>Nenhuma ocorrência encontrada</Text>
              </View>
            )}
            {ocorrenciasFiltradas.map(o => {
              const rc = riskConfig[o.risco as keyof typeof riskConfig];
              const ti = TIPO_ICON[o.tipo] || { icon: 'alert-outline' as const, color: Colors.pinkBtn };
              return (
                <View key={o.id} style={styles.oCard}>
                  <View style={[styles.oIconBox, { backgroundColor: ti.color + '18' }]}>
                    <Ionicons name={ti.icon} size={22} color={ti.color} />
                  </View>
                  <View style={styles.oInfo}>
                    <Text style={styles.oTipo}>{o.tipo}</Text>
                    <View style={styles.oMetaRow}>
                      <Ionicons name="location-outline" size={11} color={colors.secondary} />
                      <Text style={styles.oMeta}>{o.bairro}</Text>
                      <Ionicons name="time-outline" size={11} color={colors.secondary} style={{ marginLeft: 8 }} />
                      <Text style={styles.oMeta}>{o.hora}</Text>
                    </View>
                  </View>
                  <View style={[styles.oRiskTag, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                    <Text style={[styles.oRiskText, { color: rc.text }]}>{rc.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.yourLocation}>
          <View style={styles.yourLocationLeft}>
            <Ionicons name="navigate" size={16} color={Colors.pinkBtn} />
            <Text style={styles.yourLocationText}>
              Você está em <Text style={styles.yourLocationBold}>Meireles</Text> — zona segura
            </Text>
          </View>
          <View style={[styles.locationDot, { backgroundColor: '#43A047' }]} />
        </View>

        <TouchableOpacity style={styles.reportBtn} onPress={() => router.push('/ocorrencias')} activeOpacity={0.85}>
          <View style={styles.reportBtnInner}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.reportBtnText}>Reportar ocorrência neste local</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.updateText}>
          <Ionicons name="refresh" size={11} color={colors.secondary} /> Atualiza a cada 15 minutos
        </Text>

      </ScrollView>

    </SafeAreaView>
  );
}

const getStyles = (isDarkMode: boolean, colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: { backgroundColor: colors.headerBg, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 15 : 10, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 13, color: colors.secondary, marginTop: 2 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDarkMode ? '#2D2D2D' : '#FFF0F2', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  headerBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.pinkBtn },

  mapCard: { margin: 16, height: 180, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.cardBackground, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  mapImage: { width: '100%', height: '100%', opacity: isDarkMode ? 0.8 : 1 },
  mapOverlay: { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' },
  mapYouPin: { alignItems: 'center' },
  mapYouDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.pinkBtn, borderWidth: 3, borderColor: colors.cardBackground, elevation: 4 },
  mapYouLabel: { fontSize: 10, fontWeight: '700', color: isDarkMode ? '#FFF' : Colors.pinkD, backgroundColor: colors.cardBackground, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 4, overflow: 'hidden' },
  mapBadgeRow: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', gap: 6 },
  mapBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1 },
  mapBadgeDot: { width: 7, height: 7, borderRadius: 3.5 },
  mapBadgeText: { fontSize: 10, fontWeight: '700' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  statCard: { flex: 1, backgroundColor: colors.cardBackground, borderRadius: 16, padding: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: colors.secondary, marginTop: 2, fontWeight: '500' },

  filtersContainer: { backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border, height: 75 },
  filtersContent: { paddingHorizontal: 12, gap: 10, flexDirection: 'row', alignItems: 'center', height: '100%' },
  chip: { height: 44, paddingHorizontal: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: isDarkMode ? '#2D2D2D' : '#f9f9f9', justifyContent: 'center', alignItems: 'center' },
  chipActive: { backgroundColor: Colors.pinkM, borderColor: Colors.pinkBtn },
  chipText: { fontSize: 14, color: colors.secondary, fontWeight: '500' },
  chipTextActive: { color: Colors.pinkD, fontWeight: '700' },

  tabRow: { flexDirection: 'row', backgroundColor: colors.cardBackground, paddingHorizontal: 16, paddingTop: 8, gap: 4, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 10, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.pinkBtn },
  tabText: { fontSize: 13, color: colors.secondary, fontWeight: '500' },
  tabTextActive: { color: Colors.pinkBtn, fontWeight: '700' },
  tabBadge: { backgroundColor: Colors.pinkM, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeText: { fontSize: 10, color: Colors.pinkD, fontWeight: '700' },

  scroll: { padding: 14, paddingBottom: 32, gap: 12 },

  grid: { gap: 10 },
  bCard: { width: '100%', backgroundColor: colors.cardBackground, borderRadius: 16, padding: 12, gap: 8, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  bCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bRiskDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  bName: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  bBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  bBadgeText: { fontSize: 10, fontWeight: '700' },
  bRiskTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, alignSelf: 'flex-start' },
  bRiskLabel: { fontSize: 10, fontWeight: '600' },
  bDetail: { fontSize: 11, marginTop: 2 },

  oList: { gap: 10 },
  oCard: { backgroundColor: colors.cardBackground, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  oIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  oInfo: { flex: 1 },
  oTipo: { fontSize: 14, fontWeight: '700', color: colors.text },
  oMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  oMeta: { fontSize: 11, color: colors.secondary },
  oRiskTag: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  oRiskText: { fontSize: 10, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: colors.secondary, fontWeight: '500' },

  yourLocation: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  yourLocationLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  yourLocationText: { fontSize: 13, color: colors.text, flex: 1 },
  yourLocationBold: { fontWeight: '700', color: colors.primary },
  locationDot: { width: 10, height: 10, borderRadius: 5 },

  reportBtn: { backgroundColor: Colors.pinkBtn, borderRadius: 20, padding: 16, elevation: 4, shadowColor: '#F06292', shadowOpacity: 0.35, shadowRadius: 8 },
  reportBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  reportBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  updateText: { textAlign: 'center', fontSize: 11, color: colors.secondary, paddingBottom: 4 },
});
