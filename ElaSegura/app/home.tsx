import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStyles } from '../styles/home.styles';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAPA_IMAGE = require('../assets/images/mapa.png');
const Ocorrencia_image = require('../assets/images/ocorrencia.png');
const Contatos_image = require('../assets/images/contatos.png');
const Alerta_image = require('../assets/images/alerta.png');
const Areas_image = require('../assets/images/areas.png');

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const Home = () => {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  
   const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUserName = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          // Pega apenas o primeiro nome para ficar mais amigável
          const firstName = user.name.split(' ')[0];
          setUserName(firstName);
        }
      } catch (error) {
        console.error('Erro ao carregar nome:', error);
      }
    };
    loadUserName();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permissão para notificações negada');
      }
    })();
  }, []);

  const triggerDangerZoneAlert = async () => {
    if (Platform.OS === 'web') {
      alert("⚠️ Atenção: Área de Risco\nVocê está se aproximando de uma região com alto índice de ocorrências. (Simulação na Web)");
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Atenção: Área de Risco",
        body: "Você está se aproximando de uma região com alto índice de ocorrências. Mantenha a atenção ao seu redor.",
        sound: true,
      },
      trigger: null,
    });
  };

  const mockOcorrencias = [
    { id: 1, title: 'Roubo', desc: 'pegaram meu celular na esquina', time: '10 Abril, 10:59', type: 'error' },
    { id: 2, title: 'Assédio', desc: 'assoviaram para mim', time: '15 Abril, 11:30', type: 'error' },
    { id: 3, title: 'Insegurança', desc: 'Rua muito escura e sem policiamento', time: '16 Abril, 20:15', type: 'warning' },
    { id: 4, title: 'Tentativa de Furto', desc: 'Tentaram puxar minha bolsa', time: '18 Abril, 08:45', type: 'error' },
    { id: 5, title: 'Assédio Verbal', desc: 'Comentários ofensivos no ônibus', time: '20 Abril, 14:20', type: 'error' },
  ];
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? colors.cardBackground : "#FFF"} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho esticado até as bordas */}
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
              <MaterialIcons name="person" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Mapa com bordas bem arredondadas */}
          <TouchableOpacity activeOpacity={0.9} style={styles.mapCard}>
            <Image
              source={MAPA_IMAGE}
              style={styles.mapImage}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* Acesso rápido */}
          <Text style={styles.sectionTitle}>Acesso rápido</Text>
          <View style={styles.quickAccessGrid}>
            {/* 1. Ocorrências */}
            <QuickAccessCard
              styles={styles}
              icon={<MaterialCommunityIcons name="file-alert-outline" size={28} color={colors.primary} />}
              label="Ocorrências"
              onPress={() => router.push('/ocorrencias')}
            />

            {/* 2. Contatos SOS */}
            <QuickAccessCard
              styles={styles}
              icon={<Image source={Contatos_image} style={[styles.quickAccessIconImage, { tintColor: colors.primary }]} resizeMode="contain" />}
              label="Contatos SOS"
              onPress={() => router.push('/contatos')}
            />

            {/* 3. Alertas Recentes */}
            <QuickAccessCard
              styles={styles}
              icon={<Image source={Alerta_image} style={[styles.quickAccessIconImage, { tintColor: colors.primary }]} resizeMode="contain" />}
              label="Alertas Recentes"
              onPress={() => router.push('/alertas' as any)}
            />

            {/* 4. Áreas de Risco */}
            <QuickAccessCard
            styles={styles}
        icon={<Image source={Areas_image} style={[styles.quickAccessIconImage, { tintColor: colors.primary }]} resizeMode="contain" />}
        label="Áreas de risco"
        onPress={() => router.push('/mapa' as any)}
        />
          </View>

          {/* Botão SOS centralizado */}
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
        <NavItem 
          icon={<MaterialCommunityIcons name="bell-outline" size={28} color={colors.secondary} />} 
          label="Alertas" 
          onPress={() => router.push('/alertas' as any)}
          styles={styles}
        />
        <NavItem 
          icon={<MaterialCommunityIcons name="account-circle-outline" size={28} color={colors.secondary} />} 
          label="Perfil" 
          onPress={() => router.push('/perfil')}
          styles={styles}
        />
        <NavItem 
          icon={<MaterialCommunityIcons name="cog-outline" size={28} color={colors.secondary} />} 
          label="Ajustes" 
          onPress={() => router.push('/settings')}
          styles={styles}
        />
      </View>

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
              {mockOcorrencias.map((item) => (
                <View key={item.id} style={styles.occurrenceCard}>
                  <View style={styles.occurrenceIconBox}>
                    <MaterialIcons name={item.type === 'error' ? "error" : "warning"} size={30} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.occurrenceTitle}>{item.title}</Text>
                    <Text style={styles.occurrenceDescription}>{item.desc}</Text>
                    <Text style={styles.occurrenceTime}>{item.time}</Text>
                  </View>
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
