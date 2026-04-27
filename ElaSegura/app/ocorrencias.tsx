import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getStyles } from '../styles/ocorrencias.styles';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';

export default function Ocorrencias() {
  const { isDarkMode, theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'gerais' | 'proximas'>('proximas');
  const [radiusFilter, setRadiusFilter] = useState<number>(1000); // em metros

  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const mockOcorrencias = [
    { id: 1, title: 'Roubo', desc: 'Pegaram meu celular na esquina', time: '10 Abril, 10:59', type: 'error', distance: 250 },
    { id: 2, title: 'Assédio', desc: 'Assoviaram para mim', time: '15 Abril, 11:30', type: 'error', distance: 800 },
    { id: 3, title: 'Insegurança', desc: 'Rua muito escura e sem policiamento', time: '16 Abril, 20:15', type: 'warning', distance: 1500 },
    { id: 4, title: 'Tentativa de Furto', desc: 'Tentaram puxar minha bolsa', time: '18 Abril, 08:45', type: 'error', distance: 450 },
    { id: 5, title: 'Assédio Verbal', desc: 'Comentários ofensivos no ônibus', time: '20 Abril, 14:20', type: 'error', distance: 3000 },
    { id: 6, title: 'Suspeita', desc: 'Carro seguindo lentamente', time: '21 Abril, 19:00', type: 'warning', distance: 120 },
  ];

  const filteredOcorrencias = useMemo(() => {
    if (activeTab === 'gerais') return mockOcorrencias;
    return mockOcorrencias
      .filter(item => item.distance <= radiusFilter)
      .sort((a, b) => a.distance - b.distance);
  }, [activeTab, radiusFilter]);

  const FilterChip = ({ label, value }: { label: string, value: number }) => (
    <TouchableOpacity 
      style={[styles.filterChip, radiusFilter === value && styles.activeFilterChip]}
      onPress={() => setRadiusFilter(value)}
    >
      <Text style={[styles.filterChipText, radiusFilter === value && styles.activeFilterChipText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? colors.background : colors.background} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={{ marginRight: 15 }} 
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Ocorrências</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === 'proximas' ? 'Alertas perto de você' : 'Histórico na região'}
          </Text>
        </View>
      </View>

      {/* Seletor de Abas */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'proximas' && styles.activeTab]}
          onPress={() => setActiveTab('proximas')}
        >
          <Text style={[styles.tabText, activeTab === 'proximas' && styles.activeTabText]}>Próximas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'gerais' && styles.activeTab]}
          onPress={() => setActiveTab('gerais')}
        >
          <Text style={[styles.tabText, activeTab === 'gerais' && styles.activeTabText]}>Gerais</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros de Raio (apenas na aba Próximas) */}
      {activeTab === 'proximas' && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Raio de busca</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            <FilterChip label="500m" value={500} />
            <FilterChip label="1km" value={1000} />
            <FilterChip label="2km" value={2000} />
            <FilterChip label="5km" value={5000} />
          </ScrollView>
        </View>
      )}

      {/* Botão Registrar Ocorrência */}
      <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
        <Text style={styles.addButtonText}>+ Registrar ocorrência</Text>
      </TouchableOpacity>

      {/* Lista de Ocorrências */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
        {filteredOcorrencias.length > 0 ? (
          filteredOcorrencias.map((item) => (
            <View key={item.id} style={styles.occurrenceCard}>
              <View style={styles.occurrenceIconBox}>
                <MaterialIcons name={item.type === 'error' ? "error" : "warning"} size={30} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={styles.occurrenceTitle}>{item.title}</Text>
                  <Text style={styles.occurrenceTime}>{item.time.split(',')[0]}</Text>
                </View>
                <Text style={styles.occurrenceDescription} numberOfLines={2}>{item.desc}</Text>
                
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>
                    <MaterialCommunityIcons name="map-marker-distance" size={12} color={colors.primary} /> {item.distance >= 1000 ? `${(item.distance/1000).toFixed(1)}km` : `${item.distance}m`} de distância
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="map-marker-off-outline" size={60} color={isDarkMode ? "#333" : "#EFEFEF"} />
            <Text style={styles.emptyText}>Nenhuma ocorrência neste raio.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}