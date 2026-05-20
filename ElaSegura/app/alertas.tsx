import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { getStyles } from '../styles/alertas.styles';

type AlertSummary = {
  ocorrencias_last_24h: number;
  ocorrencias_total: number;
  sos_last_24h: number;
  sos_total: number;
};

type AlertItem = {
  created_at: string;
  description: string;
  id: number;
  location: string | null;
  source: 'sos' | 'ocorrencia';
  title: string;
  user_id: number;
  user_name: string;
};

const AlertasScreen = () => {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAlerts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        router.replace('/login');
        return;
      }

      const data = await api.get('/alertas', token);
      setSummary(data.summary ?? null);
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setErrorMessage('');
    } catch (error) {
      console.error('Error fetching alertas:', error);
      setErrorMessage('Nao foi possivel carregar os alertas agora.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
    });

  const getAlertIcon = (source: AlertItem['source']) =>
    source === 'sos' ? 'shield-alert' : 'alert-circle';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Alertas</Text>
        </View>
        <Text style={styles.subtitle}>Alertas e ocorrencias recentes</Text>
      </View>

      {loading ? (
        <View style={styles.feedbackContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.feedbackText}>Carregando alertas...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.feedbackContainer}>
          <View style={styles.emptyStateIconBox}>
            <MaterialCommunityIcons name="cloud-alert-outline" size={60} color={colors.primary} />
          </View>
          <Text style={styles.emptyStateTitle}>Nao foi possivel carregar</Text>
          <Text style={styles.emptyStateDescription}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAlerts}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary?.sos_last_24h ?? 0}</Text>
              <Text style={styles.summaryLabel}>SOS nas ultimas 24h</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary?.ocorrencias_last_24h ?? 0}</Text>
              <Text style={styles.summaryLabel}>Ocorrencias nas ultimas 24h</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary?.sos_total ?? 0}</Text>
              <Text style={styles.summaryLabel}>SOS acumulados</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary?.ocorrencias_total ?? 0}</Text>
              <Text style={styles.summaryLabel}>Ocorrencias acumuladas</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Feed recente</Text>
            <TouchableOpacity onPress={loadAlerts}>
              <Text style={styles.refreshText}>Atualizar</Text>
            </TouchableOpacity>
          </View>

          {alerts.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateIconBox}>
                <MaterialCommunityIcons name="bell-off-outline" size={60} color={colors.primary} />
              </View>
              <Text style={styles.emptyStateTitle}>Tudo tranquilo por aqui</Text>
              <Text style={styles.emptyStateDescription}>
                Nenhum alerta ou ocorrencia recente foi encontrado.
              </Text>
            </View>
          ) : (
            alerts.map((item) => (
              <View key={`${item.source}-${item.id}`} style={styles.alertCard}>
                <View style={styles.alertIconBox}>
                  <MaterialCommunityIcons
                    name={getAlertIcon(item.source)}
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.alertBody}>
                  <View style={styles.alertTopRow}>
                    <Text style={styles.alertTitle}>{item.title}</Text>
                    <View
                      style={[
                        styles.sourceBadge,
                        item.source === 'sos' ? styles.sosBadge : styles.ocorrenciaBadge,
                      ]}
                    >
                      <Text style={styles.sourceBadgeText}>
                        {item.source === 'sos' ? 'SOS' : 'Ocorrencia'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.alertDescription}>{item.description}</Text>

                  <View style={styles.metaRow}>
                    <MaterialIcons name="person-outline" size={16} color={colors.secondary} />
                    <Text style={styles.metaText}>{item.user_name}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <MaterialIcons name="location-on" size={16} color={colors.secondary} />
                    <Text style={styles.metaText}>
                      {item.location || 'Localizacao nao informada'}
                    </Text>
                  </View>

                  <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default AlertasScreen;
