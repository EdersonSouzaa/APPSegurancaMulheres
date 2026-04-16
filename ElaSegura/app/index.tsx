import React from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from '../styles/home.styles';

export default function Home() {
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

          <Text style={styles.sectionTitle}>Ocorrências Recentes</Text>

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

        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="report-problem" size={24} color="#9C97AC" />
          <Text style={styles.navLabel}>Ocorrências</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="person-add" size={24} color="#9C97AC" />
          <Text style={styles.navLabel}>Contatos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="notifications" size={24} color="#9C97AC" />
          <Text style={styles.navLabel}>Alertas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="account-circle" size={24} color="#9C97AC" />
          <Text style={styles.navLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}