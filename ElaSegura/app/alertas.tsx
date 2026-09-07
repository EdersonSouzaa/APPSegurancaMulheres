import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getStyles } from '../styles/alertas.styles';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { Colors } from '../constants/theme';
import { obterAlertas, type AlertaFeed } from '../services/alertas';
import { BackHomeButton } from '../components/BackHomeButton';

const AlertasScreen = () => {
  const { isDarkMode, theme } = useTheme();
  const { t, locale } = useI18n();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [alerts, setAlerts] = useState<AlertaFeed[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await obterAlertas();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAlerts();
    }, [fetchAlerts])
  );

  const formatAlertTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const day = d.toLocaleDateString(locale, { day: '2-digit', month: 'long' });
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return `${day}, ${time}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <BackHomeButton style={{ marginRight: 15 }} to="/perfil" />
          <Text style={styles.title} accessibilityRole="header">
            {t('alertas.titulo')}
          </Text>
        </View>
        <Text style={styles.subtitle}>{t('alertas.subtitulo')}</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : alerts.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconBox}>
            <MaterialCommunityIcons name="bell-off-outline" size={60} color={colors.primary} />
          </View>
          <Text style={styles.emptyStateTitle}>{t('alertas.vazioTitulo')}</Text>
          <Text style={styles.emptyStateDescription}>{t('alertas.vazioTexto')}</Text>
        </View>
      ) : (
        /* Alerts List */
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.listContainer}>
            {alerts.map((item) => (
              <View key={`${item.source}-${item.id}`} style={styles.alertCard}>
                <View style={styles.alertIconBox}>
                  <MaterialCommunityIcons
                    name={item.source === 'sos' ? 'shield-alert' : 'alert-circle'}
                    size={30}
                    color={item.source === 'sos' ? '#FF5252' : colors.primary}
                  />
                </View>
                <View style={styles.alertContent}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.alertTitle}>{item.title}</Text>
                    {item.user_name && (
                      <Text style={{ fontSize: 11, color: colors.secondary, fontStyle: 'italic' }}>
                        {t('alertas.por', { nome: item.user_name })}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.alertDescription}>{item.description}</Text>
                  <View style={styles.alertTimeRow}>
                    <MaterialCommunityIcons name="clock-outline" size={12} color={colors.secondary} />
                    <Text style={styles.alertTime}>{formatAlertTime(item.created_at)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default AlertasScreen;
