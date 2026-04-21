import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from '../styles/home.styles';
import { router } from 'expo-router';

export default function Home() {
    // Estado para controlar se o popup está aberto ou fechado
  const [modalVisible, setModalVisible] = useState(false);

    // MOCK DE DADOS
  const mockOcorrencias = [
    { id: 1, title: 'Roubo', desc: 'Pegaram meu celular na esquina', time: '10 Abril, 10:59', type: 'error' },
    { id: 2, title: 'Assédio', desc: 'Assoviaram para mim', time: '15 Abril, 11:30', type: 'error' },
    { id: 3, title: 'Insegurança', desc: 'Rua muito escura e sem policiamento', time: '16 Abril, 20:15', type: 'warning' },
    { id: 4, title: 'Tentativa de Furto', desc: 'Tentaram puxar minha bolsa', time: '18 Abril, 08:45', type: 'error' },
    { id: 5, title: 'Assédio Verbal', desc: 'Comentários ofensivos no ônibus', time: '20 Abril, 14:20', type: 'error' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header Branco e Reto - 100% igual à imagem */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconBox}>
            <MaterialIcons name="security" size={24} color="#F35F74" />
          </View>
          <View>
            <Text style={styles.headerGreeting}>Olá 🤚</Text>
            <Text style={styles.headerStatus}>Sua segurança é importante 💜</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>

          {/* Card do Mapa */}
          <View style={styles.mapCard}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800' }}
              style={styles.mapImage}
            />
          </View>

          <Text style={styles.sectionTitle}>Acesso rápido</Text>

          {/* Grid de 4 Itens - Corrigido */}
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity style={styles.quickAccessCard}>
              <View style={styles.quickAccessIconBox}>
                <MaterialIcons name="description" size={28} color="#F35F74" />
              </View>
              <Text style={styles.quickAccessLabel}>Ocorrências</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAccessCard}>
              <View style={styles.quickAccessIconBox}>
                <MaterialIcons name="people" size={28} color="#F35F74" />
              </View>
              <Text style={styles.quickAccessLabel}>Contatos SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAccessCard}>
              <View style={styles.quickAccessIconBox}>
                <MaterialIcons name="notifications" size={28} color="#F35F74" />
              </View>
              <Text style={styles.quickAccessLabel}>Alertas</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAccessCard}>
              <View style={styles.quickAccessIconBox}>
                <MaterialIcons name="place" size={28} color="#F35F74" />
              </View>
              <Text style={styles.quickAccessLabel}>Áreas de risco</Text>
            </TouchableOpacity>
          </View>

          {/* Botão SOS Centralizado */}
          <View style={styles.sosWrapper}>
            <TouchableOpacity style={styles.sosButton}>
              <MaterialIcons name="shield" size={40} color="#FFF" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentSectionHeader}>
            <Text style={styles.sectionTitle}>Ocorrências Recentes</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={{ color: '#F35F74', fontWeight: 'bold' }}>Ver todas ❯</Text>
            </TouchableOpacity>
          </View>

          {/* Card de Ocorrência */}
          <View style={styles.occurrenceCard}>
            <View style={styles.occurrenceIconBox}>
              <MaterialIcons name="error" size={30} color="#F35F74" />
            </View>
            <View>
              <Text style={styles.occurrenceTitle}>Roubo</Text>
              <Text style={styles.occurrenceDescription}>pegaram meu celular na esquina</Text>
              <Text style={styles.occurrenceTime}>10 Abril, 10:59</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Barra de Navegação Inferior (Bottom Bar) */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIconActive}>
            <MaterialIcons name="home" size={24} color="#F35F74" />
            <Text style={[styles.navLabel, styles.navLabelActive]}>Início</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/ocorrencias')}>
          <MaterialIcons name="report-problem" size={24} color="#9C97AC" />
          <Text style={styles.navLabel}>Ocorrências</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/contatos')}>
          <MaterialIcons name="person-add" size={24} color="#9C97AC" />
          <Text style={styles.navLabel}>Contatos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="notifications" size={24} color="#9C97AC" />
          <Text style={styles.navLabel}>Alertas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/perfil')}>
          <MaterialIcons name="account-circle" size={24} color="#9C97AC" />
          <Text style={styles.navLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>

      {/* POPUP DE OCORRÊNCIAS (#29) */}
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
              {/* Aqui mapeamos o array mockado para gerar os cards automaticamente */}
              {mockOcorrencias.map((item) => (
                <View key={item.id} style={styles.occurrenceCard}>
                  <View style={styles.occurrenceIconBox}>
                    <MaterialIcons name={item.type === 'error' ? "error" : "warning"} size={30} color="#F35F74" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.occurrenceTitle}>{item.title}</Text>
                    <Text style={styles.occurrenceDescription}>{item.desc}</Text>
                    <Text style={styles.occurrenceTime}>{item.time}</Text>
                  </View>
                </View>
              ))}
              
              {/* Espaçador final do popup */}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}