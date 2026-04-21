import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from '../styles/home.styles';
import { router } from 'expo-router';

const MAPA_IMAGE = require('../assets/images/mapa.png');
const Ocorrencia_image = require('../assets/images/ocorrencia.png');
const Contatos_image = require('../assets/images/contatos.png');
const Alerta_image = require('../assets/images/alerta.png');
const Areas_image = require('../assets/images/areas.png');



const Home = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho esticado até as bordas */}
        <View style={styles.header}>
          <Text style={styles.headerGreeting}>Olá 👋</Text>
          <Text style={styles.headerStatus}>Você está segura aqui 💜</Text>
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
              icon={<Image source={Ocorrencia_image} style={[styles.quickAccessIconImage, { tintColor: '#F35F74' }]} resizeMode="contain" />}
              label="Ocorrências"
            />

            {/* 2. Contatos SOS */}
            <QuickAccessCard
              icon={<Image source={Contatos_image} style={[styles.quickAccessIconImage, { tintColor: '#F35F74' }]} resizeMode="contain" />}
              label="Contatos SOS"
            />

            {/* 3. Alertas Recentes */}
            <QuickAccessCard
              icon={<Image source={Alerta_image} style={[styles.quickAccessIconImage, { tintColor: '#F35F74' }]} resizeMode="contain" />}
              label="Alertas Recentes"
            />

            {/* 4. Áreas de Risco */}
            <QuickAccessCard
              icon={<Image source={Areas_image} style={[styles.quickAccessIconImage, { tintColor: '#F35F74' }]} resizeMode="contain" />}
              label="Áreas de risco"
            />
          </View>

          {/* Botão SOS centralizado */}
          <View style={styles.sosWrapper}>
            <View style={styles.sosRipple} />
            <TouchableOpacity style={styles.sosButton} activeOpacity={0.8}>
              <MaterialCommunityIcons name="shield-check-outline" size={35} color="#FFFFFF" />
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>SOS</Text>
            </TouchableOpacity>
          </View>

          {/* Ocorrências Recentes */}
          <View style={styles.recentSectionHeader}>
            <Text style={styles.sectionTitle}>Ocorrências Recentes</Text>
          </View>

          <View style={{ gap: 15 }}>
            <OccurrenceCard
              title="Roubo"
              description="pegaram meu celular na esquina"
              time="10 Abril, 10:59"
            />
            <OccurrenceCard
              title="Assédio"
              description="assoviaram para mim"
              time="15 Abril, 11:30"
            />
          </View>
        </View>
      </ScrollView>

      {/* Barra de Navegação Inferior */}
      <View style={styles.bottomNav}>
        <NavItem active icon={<MaterialIcons name="home" size={28} color="#F35F74" />}
        label="Início" />
        <NavItem icon={<MaterialCommunityIcons name="alert-outline" size={28} color="#9C97AC" />}
        label="Ocorrencias" />
        <NavItem icon={<MaterialCommunityIcons name="account-plus-outline" size={28} color="#9C97AC" />}
        label="Contatos" />
        <NavItem icon={<MaterialCommunityIcons name="bell-outline" size={28} color="#9C97AC" />}
        label="Alertas" />
        <NavItem icon={<MaterialCommunityIcons name="account-circle-outline" size={28} color="#9C97AC" />}
        label="Perfil"
        onPress={() => router.push('/perfil')}/>
      </View>
    </View>
  );
};

const QuickAccessCard = ({ icon, label }: any) => (
  <TouchableOpacity style={styles.quickAccessCard} activeOpacity={0.7}>
    <View style={styles.quickAccessIconBox}>
      {icon}
    </View>
    <Text style={styles.quickAccessLabel}>{label}</Text>
  </TouchableOpacity>
);

const OccurrenceCard = ({ title, description, time }: any) => (
  <View style={styles.occurrenceCard}>
    <View style={styles.occurrenceIconBox}>
      <MaterialCommunityIcons name="alert-circle" size={30} color="#F35F74" />
    </View>
    <View style={styles.occurrenceInfo}>
      <Text style={styles.occurrenceTitle}>{title}</Text>
      <Text style={styles.occurrenceDescription}>{description}</Text>
      <View style={styles.occurrenceTimeRow}>
        <MaterialCommunityIcons name="clock-outline" size={12} color="#AAA" />
        <Text style={styles.occurrenceTime}>{time}</Text>
      </View>
    </View>
  </View>
);

const NavItem = ({ active, icon, label, onPress }: any) => (
  <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onPress}>
    <View style={active ? styles.navIconActive : undefined}>
      {icon}
    </View>
    <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

export default Home;