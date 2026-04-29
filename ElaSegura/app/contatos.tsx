import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getStyles } from '../styles/contatos.styles';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';

export default function Contatos() {
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Contatos de Confiança</Text>
          <Text style={styles.headerSubtitle}>Escolha contatos de confiança 💜</Text>
        </View>
      </View>   
      {/* Botão Adicionar */}
      <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
        <Text style={styles.addButtonText}>+ Adicionar contatos</Text>
      </TouchableOpacity>

      {/* Estado Vazio (Nenhum contato) */}
      <View style={styles.emptyStateContainer}>
        <MaterialIcons name="account-circle" size={100} color={isDarkMode ? colors.secondary : "#1A1A1A"} />
        <Text style={styles.emptyStateTitle}>Nenhum contato adicionado</Text>
        <Text style={styles.emptyStateText}>
          Adicione contatos de confiança para enviar alertas
        </Text>
      </View>
    </View>
  );
}