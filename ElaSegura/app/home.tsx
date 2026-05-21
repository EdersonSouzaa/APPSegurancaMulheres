import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStyles } from '../styles/home.styles';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LeafletMap } from '../components/LeafletMap';
import { useLocation } from '../hooks/use-location';
import { api } from '../services/api';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

const Contatos_image = require('../assets/images/contatos.png');
const Alerta_image = require('../assets/images/alerta.png');
const Areas_image = require('../assets/images/areas.png');

const Home = () => {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [locationPopupVisible, setLocationPopupVisible] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [userName, setUserName] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const { coords } = useLocation();

  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  // --- FUNÇÕES DE CARREGAMENTO (Definidas no escopo do componente) ---

  const loadUserData = useCallback(async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        const firstName = user.name.split(' ')[0];
        setUserName(firstName);
        setProfilePicture(user.profile_picture || null);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }, []);

  const loadLocationPreference = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const userData = await api.get('/user/me', token);
        if (userData) {
          setLocationEnabled(userData.location_enabled || false);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar preferência de localização:', error);
    }
  }, []);

  const loadOccurrences = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const data = await api.get('/ocorrencias', token);
        setOccurrences(data);
      }
    } catch (error) {
      console.error('Erro ao carregar ocorrências:', error);
    }
  }, []);

  // --- EFEITO DE FOCO (Unificado em um único hook) ---

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadLocationPreference();
      loadOccurrences();
    }, [loadUserData, loadLocationPreference, loadOccurrences])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? colors.cardBackground : "#FFF"} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerContent}>
              <Text style={styles.headerGreeting}>Olá, {userName || 'Usuária'} 👋</Text>
              <Text style={styles.headerStatus}>Você está segura aqui 💜</Text>
            </View>

            <TouchableOpacity
              style={styles.headerAvatar}
              onPress={() => router.push('/perfil')}
              activeOpacity={0.8}
            >
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={{ width: 45, height: 45, borderRadius: 22.5 }} />
              ) : (
                <MaterialIcons name="person" size={28} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Mapa em tempo real (preview) */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.mapCard}
            onPress={() => {
              if (locationEnabled) {
                router.push('/mapa');
              } else {
                setLocationPopupVisible(true);
              }
            }}
          >
            <LeafletMap
              userCoords={coords}
              riskZones={[]}
              incidents={[]}
              showIncidents={false}
              isDarkMode={isDarkMode}
              interactive={false}
            />
            <View style={styles.mapCardBadge}>
              <MaterialCommunityIcons name="map-outline" size={14} color="#fff" />
              <Text style={styles.mapCardBadgeText}>Ver mapa em tempo real</Text>
            </View>
          </TouchableOpacity>

          {/* Acesso rápido */}
          <Text style={styles.sectionTitle}>Acesso rápido</Text>
          <View style={styles.quickAccessGrid}>
            <QuickAccessCard
              styles={styles}
              icon={<MaterialCommunityIcons name="file-alert-outline" size={28} color={colors.primary} />}
              label="Ocorrências"
              onPress={() => router.push('/ocorrencias')}
            />

            <QuickAccessCard
              styles={styles}
              icon={<Image source={Contatos_image} style={[styles.quickAccessIconImage, { tintColor: colors.primary }]} resizeMode="contain" />}
              label="Contatos SOS"
              onPress={() => router.push('/contatos')}
            />

            <QuickAccessCard
              styles={styles}
              icon={<Image source={Alerta_image} style={[styles.quickAccessIconImage, { tintColor: colors.primary }]} resizeMode="contain" />}
              label="Alertas Recentes"
              onPress={() => router.push('/alertas' as any)}
            />

            <QuickAccessCard
              styles={styles}
              icon={<Image source={Areas_image} style={[styles.quickAccessIconImage, { tintColor: colors.primary }]} resizeMode="contain" />}
              label="Áreas de risco"
              onPress={() => router.push('/mapa' as any)}
            />
          </View>

          {/* Botão SOS */}
          <View style={styles.sosWrapper}>
            <TouchableOpacity
              style={styles.sosButton}
              activeOpacity={0.8}
              onPress={() => router.push('/sos' as any)}
            >
              <MaterialCommunityIcons name="shield-alert" size={45} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Ocorrências Recentes */}
          <View style={styles.recentSectionHeader}>
            <Text style={styles.sectionTitle}>Ocorrências Recentes</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Ver todas ❯</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 15 }}>
            <OccurrenceCard
              styles={styles}
              colors={colors}
              title="Roubo"
              description="pegaram meu celular na esquina"
              time="10 Abril, 10:59"
            />
            <OccurrenceCard
              styles={styles}
              colors={colors}
              title="Assédio"
              description="assoviaram para mim"
              time="15 Abril, 11:30"
            />
          </View>
        </View>
      </ScrollView>

      {/* Barra de Navegação Inferior */}
      <View style={styles.bottomNav}>
        <NavItem active icon={<MaterialIcons name="home" size={28} color={colors.primary} />} label="Início" styles={styles} />
        <NavItem icon={<MaterialCommunityIcons name="alert-outline" size={28} color={colors.secondary} />} label="Ocorrencias" onPress={() => router.push('/ocorrencias')} styles={styles} />
        <NavItem icon={<MaterialCommunityIcons name="account-plus-outline" size={28} color={colors.secondary} />} label="Contatos" onPress={() => router.push('/contatos')} styles={styles} />
        <NavItem icon={<MaterialCommunityIcons name="bell-outline" size={28} color={colors.secondary} />} label="Alertas" onPress={() => router.push('/alertas' as any)} styles={styles} />
        <NavItem icon={<MaterialCommunityIcons name="account-circle-outline" size={28} color={colors.secondary} />} label="Perfil" onPress={() => router.push('/perfil')} styles={styles} />
        <NavItem icon={<MaterialCommunityIcons name="cog-outline" size={28} color={colors.secondary} />} label="Ajustes" onPress={() => router.push('/settings')} styles={styles} />
      </View>

      {/* POPUP DE ATIVAÇÃO DE LOCALIZAÇÃO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={locationPopupVisible}
        onRequestClose={() => setLocationPopupVisible(false)}
      >
        <View style={styles.locationPopupOverlay}>
          <View style={styles.locationPopupContent}>
            <View style={styles.locationPopupIconBox}>
              <MaterialCommunityIcons name="map-marker-radius" size={48} color={colors.primary} />
            </View>
            <Text style={styles.locationPopupTitle}>Ativar Localização?</Text>
            <Text style={styles.locationPopupDescription}>
              Para acessar o mapa e compartilhar sua localização em tempo real com seus contatos SOS, ative a permissão de localização.
            </Text>
            <TouchableOpacity
              style={[styles.locationPopupButton, { backgroundColor: colors.primary }]}
              onPress={async () => {
                setLocationLoading(true);
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();

                  if (status !== 'granted') {
                    setLocationLoading(false);
                    Alert.alert(
                      'Permissão Necessária',
                      'Você negou o acesso à localização. Para usar o mapa, ative a permissão de localização nas configurações do seu celular.',
                      [{ text: 'OK' }]
                    );
                    return;
                  }

                  const token = await AsyncStorage.getItem('userToken');
                  if (token) {
                    await api.put('/user/preferences', {
                      notifications_enabled: true,
                      location_enabled: true
                    }, token);
                    setLocationEnabled(true);
                  }

                  setLocationLoading(false);
                  setLocationPopupVisible(false);

                  const { status: notifStatus } = await Notifications.getPermissionsAsync();
                  if (notifStatus !== 'granted') {
                    await Notifications.requestPermissionsAsync();
                  }

                  if (Constants.appOwnership !== 'expo') {
                    await Notifications.scheduleNotificationAsync({
                      content: {
                        title: 'Localização Ativada',
                        body: 'Sua localização está habilitada e o mapa será aberto.',
                        sound: true,
                      },
                      trigger: null,
                    });
                  }
                  router.push('/mapa');
                } catch (error) {
                  setLocationLoading(false);
                  Alert.alert('Erro', 'Não foi possível ativar a localização. Tente novamente.');
                }
              }}
              activeOpacity={0.8}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.locationPopupButtonText}>Ativar Localização</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locationPopupCancelButton}
              onPress={() => setLocationPopupVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.locationPopupCancelText}>Agora não</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* POPUP DE OCORRÊNCIAS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.sectionTitle}>Últimas Ocorrências</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {occurrences.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, color: colors.secondary }}>Nenhuma ocorrência encontrada.</Text>
              ) : (
                occurrences.map((item) => (
                  <View key={item.id || item._id} style={styles.occurrenceCard}>
                    <View style={styles.occurrenceIconBox}>
                      <MaterialIcons name={item.type === 'error' ? "error" : "warning"} size={30} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.occurrenceTitle}>{item.title}</Text>
                      <Text style={styles.occurrenceDescription}>{item.description || item.desc}</Text>
                      <Text style={styles.occurrenceTime}>{item.time}</Text>
                    </View>
                  </View>
                ))
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// --- COMPONENTES AUXILIARES ---

const QuickAccessCard = ({ icon, label, onPress, styles }: any) => (
  <TouchableOpacity style={styles.quickAccessCard} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.quickAccessIconBox}>
      {icon}
    </View>
    <Text style={styles.quickAccessLabel}>{label}</Text>
  </TouchableOpacity>
);

const OccurrenceCard = ({ title, description, time, styles, colors }: any) => (
  <View style={styles.occurrenceCard}>
    <View style={styles.occurrenceIconBox}>
      <MaterialCommunityIcons name="alert-circle" size={30} color={colors.primary} />
    </View>
    <View style={styles.occurrenceInfo}>
      <Text style={styles.occurrenceTitle}>{title}</Text>
      <Text style={styles.occurrenceDescription}>{description}</Text>
      <View style={styles.occurrenceTimeRow}>
        <MaterialCommunityIcons name="clock-outline" size={12} color={colors.secondary} />
        <Text style={styles.occurrenceTime}>{time}</Text>
      </View>
    </View>
  </View>
);

const NavItem = ({ active, icon, label, onPress, styles }: any) => (
  <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onPress}>
    <View style={active ? styles.navIconActive : undefined}>
      {icon}
    </View>
    <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

export default Home;