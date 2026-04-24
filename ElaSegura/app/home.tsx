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
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal } from 'react-native';

const MAPA_IMAGE = require('../assets/images/mapa.png');
const Ocorrencia_image = require('../assets/images/ocorrencia.png');
const Contatos_image = require('../assets/images/contatos.png');
const Alerta_image = require('../assets/images/alerta.png');
const Areas_image = require('../assets/images/areas.png');

const Home = () => {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const mockOcorrencias = [
    { id: 1, title: 'Roubo', desc: 'pegaram meu celular na esquina', time: '10 Abril, 10:59', type: 'error' },
    { id: 2, title: 'Assédio', desc: 'assoviaram para mim', time: '15 Abril, 11:30', type: 'error' },
    { id: 3, title: 'Insegurança', desc: 'Rua muito escura e sem policiamento', time: '16 Abril, 20:15', type: 'warning' },
    { id: 4, title: 'Tentativa de Furto', desc: 'Tentaram puxar minha bolsa', time: '18 Abril, 08:45', type: 'error' },
    { id: 5, title: 'Assédio Verbal', desc: 'Comentários ofensivos no ônibus', time: '20 Abril, 14:20', type: 'error' },
  ];
  
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
              icon={<MaterialCommunityIcons name="file-alert-outline" size={28} color="#f25e75" />}
              label="Ocorrências"
              onPress={() => router.push('/ocorrencias')}
            />

            {/* 2. Contatos SOS */}
            <QuickAccessCard
              icon={<Image source={Contatos_image} style={[styles.quickAccessIconImage, { tintColor: '#F35F74' }]} resizeMode="contain" />}
              label="Contatos SOS"
              onPress={() => router.push('/contatos')}
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
            <TouchableOpacity style={styles.sosButton} activeOpacity={0.8}>
              <MaterialCommunityIcons name="shield-alert" size={45} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Ocorrências Recentes */}
          <View style={styles.recentSectionHeader}>
            <Text style={styles.sectionTitle}>Ocorrências Recentes</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={{ color: '#F35F74', fontWeight: 'bold' }}>Ver todas ❯</Text>
            </TouchableOpacity>
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
        <NavItem active icon={<MaterialIcons name="home" size={28} color="#F35F74" />} label="Início" />
        <NavItem icon={<MaterialCommunityIcons name="alert-outline" size={28} color="#9C97AC" />} label="Ocorrencias" onPress={() => router.push('/ocorrencias')} />
        <NavItem icon={<MaterialCommunityIcons name="account-plus-outline" size={28} color="#9C97AC" />} label="Contatos" onPress={() => router.push('/contatos')} />
        <NavItem icon={<MaterialCommunityIcons name="bell-outline" size={28} color="#9C97AC" />} label="Alertas" />
        <NavItem 
          icon={<MaterialCommunityIcons name="account-circle-outline" size={28} color="#9C97AC" />} 
          label="Perfil" 
          onPress={() => router.push('/perfil')}
        />
        <NavItem 
          icon={<MaterialCommunityIcons name="cog-outline" size={28} color="#9C97AC" />} 
          label="Ajustes" 
          onPress={() => router.push('/settings')}
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
                <MaterialIcons name="close" size={28} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {mockOcorrencias.map((item) => (
                <View key={item.id} style={styles.occurrenceCard}>
                  <View style={styles.occurrenceIconBox}>
                    <MaterialIcons name={item.type === 'error' ? "error" : "warning"} size={30} color="#f25e75" />
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
      <MaterialCommunityIcons name="alert-circle" size={30} color="#f25e75" />
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