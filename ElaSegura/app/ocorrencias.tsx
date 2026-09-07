import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { api } from '../services/api';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { getStyles } from '../styles/ocorrencias.styles';
import { ToastNotification } from '../components/ToastNotification';
import { BackHomeButton } from '../components/BackHomeButton';
import { SuccessPopup } from '../components/SuccessPopup';

type OccurrenceType = 'error' | 'warning';
type TabType = 'gerais' | 'proximas';

type Occurrence = {
  /**
   * String quando o registro veio do Firestore (id do documento) e número
   * negativo quando é só local, ainda não sincronizado.
   */
  id: string | number;
  title: string;
  desc: string;
  time: string;
  type: OccurrenceType;
  distance: number;
  /** true quando o registro existe no servidor (foi criado com sucesso via API) */
  synced?: boolean;
};

const initialOccurrences: Occurrence[] = [];

const occurrenceTypes: { label: string; value: OccurrenceType; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { label: 'Emergencia', value: 'error', icon: 'error' },
  { label: 'Atencao', value: 'warning', icon: 'warning' },
];

export default function Ocorrencias() {
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [occurrences, setOccurrences] = useState(initialOccurrences);
  const userIdRef = useRef<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('proximas');
  const [radiusFilter, setRadiusFilter] = useState(1000);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<OccurrenceType>('error');
  const [distance, setDistance] = useState<number>(500);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [saving, setSaving] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger'>('success');

  const [editSuccessVisible, setEditSuccessVisible] = useState(false);

  const showToast = async (message: string, type: 'success' | 'danger') => {
    try {
      const isEnabledVal = await AsyncStorage.getItem('@notifications_enabled');
      const notificationsEnabled = isEnabledVal === null ? true : isEnabledVal === 'true';
      if (notificationsEnabled) {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        let activeUserId: string | number | null = null;
        if (savedUser) {
          const user = JSON.parse(savedUser);
          activeUserId = user.id;
          userIdRef.current = user.id;
        }
        
        const key = activeUserId ? `@occurrences_data_${activeUserId}` : '@occurrences_data';
        const storedData = await AsyncStorage.getItem(key);
        if (storedData) {
          setOccurrences(JSON.parse(storedData));
        } else {
          setOccurrences([]);
        }
      } catch (e) {
        console.error('Failed to load occurrences', e);
      }
    };
    loadData();
  }, []);

  const saveOccurrences = async (newOccurrences: Occurrence[], activeUserId?: string | number | null) => {
    try {
      const idToUse = activeUserId !== undefined ? activeUserId : userIdRef.current;
      const key = idToUse ? `@occurrences_data_${idToUse}` : '@occurrences_data';
      await AsyncStorage.setItem(key, JSON.stringify(newOccurrences));
    } catch (e) {
      console.error('Failed to save occurrences', e);
    }
  };

  const canSave = title.trim().length > 0 && description.trim().length > 0;

const filteredOccurrences = useMemo(() => {
    let result = [...occurrences];

    if (activeTab === 'proximas') {
      result = result
        .filter((item) => item.distance === radiusFilter)
        .sort((a, b) => a.distance - b.distance);
    }

    if (activeTab === 'gerais' && categoryFilter !== 'Todos') {
      const normalize = (str: string) => 
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const termo = normalize(categoryFilter);
      
      result = result.filter((item) => {
        return normalize(item.title).includes(termo) || normalize(item.desc).includes(termo);
      });
    }

    return result;
  }, [activeTab, occurrences, radiusFilter, categoryFilter]);

    const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('error');
    setDistance(500);
    setSelectedCategory('');
    setEditingId(null);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: Occurrence) => {
    const knownCategories = ['Assédio', 'Roubo', 'Suspeita'];
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.desc);
    setType(item.type);
    setDistance(item.distance);
    setSelectedCategory(knownCategories.includes(item.title) ? item.title : 'Outro');
    setModalVisible(true);
  };

  const formatOccurrenceTime = () => {
    const now = new Date();
    const date = now
      .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
      .replace(' de ', ' ');
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `${date}, ${time}`;
  };

  const handleSubmitOccurrence = async () => {
    if (!canSave || saving) return;
    setSaving(true);

    try {
      const token = await AsyncStorage.getItem('userToken');

      if (editingId != null) {
        // --- Editar ocorrência existente ---
        const current = occurrences.find((o) => o.id === editingId);
        if (!current) return;

        if (current.synced && token) {
          await api.put(
            `/ocorrencias/${editingId}`,
            { title: title.trim(), description: description.trim(), type },
            token
          );
        }

        const updated = occurrences.map((o) =>
          o.id === editingId
            ? { ...o, title: title.trim(), desc: description.trim(), type, distance }
            : o
        );
        setOccurrences(updated);
        saveOccurrences(updated);
        closeModal();
        setEditSuccessVisible(true);
      } else {
        // --- Registrar nova ocorrência ---
        let lat: number | null = null;
        let lng: number | null = null;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const lastKnown = await Location.getLastKnownPositionAsync({});
            const loc = lastKnown ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
        } catch {}

        let serverId: string | null = null;
        if (token) {
          try {
            const created = await api.post(
              '/ocorrencias',
              { title: title.trim(), description: description.trim(), type, latitude: lat, longitude: lng },
              token
            );
            serverId = created?.id ?? null;
          } catch (err) {
            console.error('Erro ao salvar ocorrência na API:', err);
          }
        }

        const newOccurrence: Occurrence = {
          id: serverId ?? -Date.now(),
          title: title.trim(),
          desc: description.trim(),
          time: formatOccurrenceTime(),
          type,
          distance,
          synced: serverId != null,
        };

        const updatedOccurrences = [newOccurrence, ...occurrences];
        setOccurrences(updatedOccurrences);
        saveOccurrences(updatedOccurrences);
        showToast('Ocorrência registrada com sucesso! ⚠️', 'success');

        setCategoryFilter('Todos');
        setActiveTab('gerais');
        closeModal();
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar a ocorrência.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOccurrence = (item: Occurrence) => {
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
              if (item.synced) {
                const token = await AsyncStorage.getItem('userToken');
                if (token) await api.delete(`/ocorrencias/${item.id}`, token);
              }
              const updated = occurrences.filter((o) => o.id !== item.id);
              setOccurrences(updated);
              saveOccurrences(updated);
              showToast('Ocorrência excluída com sucesso!', 'success');
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível excluir a ocorrência.');
            }
          },
        },
      ]
    );
  };

  const FilterChip = ({ label, value }: { label: string; value: number }) => (
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <BackHomeButton style={{ marginRight: 15 }} />

        <View>
          <Text style={styles.headerTitle}>Ocorrencias</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === 'proximas' ? 'Alertas perto de voce' : 'Historico da regiao'}
          </Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'proximas' && styles.activeTab]}
          onPress={() => setActiveTab('proximas')}
        >
          <Text style={[styles.tabText, activeTab === 'proximas' && styles.activeTabText]}>
            Proximas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'gerais' && styles.activeTab]}
          onPress={() => setActiveTab('gerais')}
        >
          <Text style={[styles.tabText, activeTab === 'gerais' && styles.activeTabText]}>
            Gerais
          </Text>
        </TouchableOpacity>
      </View>

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

      {activeTab === 'gerais' && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {['Todos', 'Assédio', 'Roubo', 'Suspeita'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, categoryFilter === cat && styles.activeFilterChip]}
                onPress={() => setCategoryFilter(cat)}
              >
                <Text style={[styles.filterChipText, categoryFilter === cat && styles.activeFilterChipText]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.registerButton}
          activeOpacity={0.8}
          onPress={openCreateModal}
        >
          <MaterialIcons name="add-alert" size={24} color="#FFF" />
          <Text style={styles.registerButtonText}>Nova ocorrencia</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
        {filteredOccurrences.length > 0 ? (
          filteredOccurrences.map((item) => (
            <View key={item.id} style={styles.occurrenceCard}>
              <View style={styles.occurrenceIconBox}>
                <MaterialIcons
                  name={item.type === 'error' ? 'error' : 'warning'}
                  size={30}
                  color={colors.primary}
                />
              </View>

              <View style={styles.occurrenceInfo}>
                <Text style={styles.occurrenceTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <Text style={styles.occurrenceDescription} numberOfLines={2}>
                  {item.desc}
                </Text>

                <View style={styles.distanceBadge}>
                  <MaterialCommunityIcons
                    name="map-marker-distance"
                    size={12}
                    color={colors.primary}
                  />
                  <Text style={styles.distanceText} numberOfLines={1}>
                    {item.distance >= 1000
                      ? `${(item.distance / 1000).toFixed(1)}km`
                      : `${item.distance}m`}{' '}
                    de distancia
                  </Text>
                </View>

                <View style={styles.occurrenceTimeRow}>
                  <MaterialCommunityIcons name="clock-outline" size={12} color={colors.secondary} />
                  <Text style={styles.occurrenceTime} numberOfLines={1}>
                    {item.time}
                  </Text>
                </View>
              </View>

              <View style={styles.occurrenceActionsRow}>
                <TouchableOpacity
                  style={styles.cardActionButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  onPress={() => openEditModal(item)}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cardActionButton, styles.cardActionButtonDanger]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  onPress={() => handleDeleteOccurrence(item)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#E53935" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={50}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma ocorrência encontrada</Text>
            <Text style={styles.emptyText}>
              Nenhum alerta bate com o seu filtro atual.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingId != null ? 'Editar ocorrência' : 'Registrar ocorrencia'}</Text>
                <Text style={styles.modalSubtitle}>
                  {editingId != null ? 'Atualize as informações abaixo' : 'Informe o que aconteceu'}
                </Text>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Categoria da Ocorrência</Text>
            <View style={{ marginBottom: 16 }}>
              {['Assédio', 'Roubo', 'Suspeita', 'Outro'].map((cat) => {
                const isChecked = selectedCategory === cat;

                return (
                  <TouchableOpacity
                    key={cat}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedCategory(cat);
                      if (cat !== 'Outro') {
                        setTitle(cat); // Se for as 3 principais, preenche o título sozinho
                      } else {
                        setTitle(''); // Se for 'Outro', limpa o título pra pessoa digitar
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name={isChecked ? "checkbox-marked" : "checkbox-blank-outline"}
                      size={24}
                      color={isChecked ? colors.primary : "#A39EAE"}
                    />
                    <Text style={{ marginLeft: 10, fontSize: 16, color: colors.text }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Mágica: Mostra o campo de digitar SÓ SE a caixinha "Outro" for marcada */}
              {selectedCategory === 'Outro' && (
                <TextInput
                  style={[styles.input, { marginTop: 4 }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Qual foi a ocorrência?"
                  placeholderTextColor="#A39EAE"
                  maxLength={40}
                />
              )}
            </View>

            <Text style={styles.inputLabel}>Distancia estimada</Text>
            <View style={{ marginBottom: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {[
                  { label: '500m', value: 500 },
                  { label: '1km', value: 1000 },
                  { label: '2km', value: 2000 },
                  { label: '5km', value: 5000 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.filterChip, distance === item.value && styles.activeFilterChip]}
                    onPress={() => setDistance(item.value)}
                  >
                    <Text style={[styles.filterChipText, distance === item.value && styles.activeFilterChipText]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.inputLabel}>Categoria da Ocorrência (Título)</Text>
            <View style={{ marginBottom: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {['Assédio', 'Roubo', 'Suspeita', 'Outro'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterChip, title === cat && styles.activeFilterChip]}
                    onPress={() => setTitle(cat)}
                  >
                    <Text style={[styles.filterChipText, title === cat && styles.activeFilterChipText]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.inputLabel}>Descricao</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva a ocorrencia"
              placeholderTextColor="#A39EAE"
              multiline
              textAlignVertical="top"
              maxLength={160}
            />

            <TouchableOpacity
              style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
              activeOpacity={0.85}
              onPress={handleSubmitOccurrence}
              disabled={!canSave || saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={24} color="#FFF" />
                  <Text style={styles.saveButtonText}>
                    {editingId != null ? 'Salvar alterações' : 'Salvar ocorrencia'}
                  </Text>
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

      <SuccessPopup
        visible={editSuccessVisible}
        onContinue={() => setEditSuccessVisible(false)}
        title="Ocorrência atualizada!"
        message="As alterações foram salvas com sucesso."
      />
    </SafeAreaView>
  );
}
