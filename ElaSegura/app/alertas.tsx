import React, { useMemo } from 'react';
import { View, Text, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getStyles } from '../styles/alertas.styles';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';

const AlertasScreen = () => {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Alertas</Text>
        </View>
        <Text style={styles.subtitle}>Alertas e ocorrências recentes</Text>
      </View>

      {/* Empty State */}
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateIconBox}>
          <MaterialCommunityIcons name="bell-off-outline" size={60} color={colors.primary} />
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
