import React from 'react';
import { View, Text, SafeAreaView, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from '../styles/alertas.styles';

const AlertasScreen = () => {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Alertas</Text>
        </View>
        <Text style={styles.subtitle}>Alertas e ocorrências recentes</Text>
      </View>

      {/* Empty State */}
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateIconBox}>
          <MaterialCommunityIcons name="bell-off-outline" size={60} color="#f25e75" />
        </View>
        <Text style={styles.emptyStateTitle}>Tudo tranquilo por aqui</Text>
        <Text style={styles.emptyStateDescription}>
          Nenhum alerta SOS foi emitido até o momento.
        </Text>
      </View>

    </SafeAreaView>
  );
};

export default AlertasScreen;
