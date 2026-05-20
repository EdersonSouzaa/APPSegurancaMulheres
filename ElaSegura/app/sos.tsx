import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Colors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { getStyles } from '../styles/sos.styles';

const SOSScreen = () => {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);
  const [sending, setSending] = useState(false);

  const triggerSOSAlert = async () => {
    try {
      setSending(true);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      await api.post('/sos', { location: 'Localizacao detectada' }, token);

      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Alerta SOS enviado',
            body: 'Seu alerta foi registrado e ja aparece na tela de alertas.',
            sound: true,
          },
          trigger: null,
        });
      }

      Alert.alert('SOS enviado', 'Seu alerta foi registrado com sucesso.', [
        {
          text: 'Ver alertas',
          onPress: () => router.push('/alertas' as any),
        },
        {
          text: 'Fechar',
          style: 'cancel',
        },
      ]);
    } catch (error) {
      console.error('Error sending SOS:', error);
      Alert.alert('Erro', 'Nao foi possivel enviar o alerta SOS.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <View style={styles.iconGlow} />
          <View style={styles.iconInnerGlow} />
          <View style={styles.mainIconCircle}>
            <MaterialCommunityIcons name="shield-alert" size={55} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.title}>Enviar Alerta SOS?</Text>
        <Text style={styles.description}>
          Seus contatos de confianca serao notificados com sua localizacao.
        </Text>

        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={18} color={colors.secondary} />
          <Text style={styles.locationText}>Localizacao detectada</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            activeOpacity={0.8}
            onPress={triggerSOSAlert}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="shield-alert" size={24} color="#FFFFFF" />
            )}
            <Text style={styles.sendButtonText}>
              {sending ? 'Enviando alerta...' : 'Enviar Alerta Agora'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SOSScreen;
