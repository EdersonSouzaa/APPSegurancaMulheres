import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getStyles } from '../styles/sos.styles';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';

const SOSScreen = () => {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const triggerSOSAlert = async () => {
    if (Platform.OS === 'web') {
      alert("🚨 ALERTA SOS ENVIADO!\nSua localização foi enviada para seus contatos de emergência e autoridades. (Simulação na Web)");
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 ALERTA SOS ENVIADO!",
        body: "Sua localização foi enviada para seus contatos de emergência e autoridades.",
        sound: true,
      },
      trigger: null,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <View style={styles.container}>
        
        {/* Top Icon Section with Glow */}
        <View style={styles.iconWrapper}>
          <View style={styles.iconGlow} />
          <View style={styles.iconInnerGlow} />
          <View style={styles.mainIconCircle}>
            <MaterialCommunityIcons name="shield-alert" size={55} color="#FFFFFF" />
          </View>
        </View>

        {/* Text Section */}
        <Text style={styles.title}>Enviar Alerta SOS?</Text>
        <Text style={styles.description}>
          Seus contatos de confiança serão notificados com sua localização.
        </Text>

        {/* Location Section */}
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={18} color={colors.secondary} />
          <Text style={styles.locationText}>Localização detectada</Text>
        </View>

        {/* Buttons Section */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.sendButton}
            activeOpacity={0.8}
            onPress={triggerSOSAlert}
          >
            <MaterialCommunityIcons name="shield-alert" size={24} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>Enviar Alerta Agora</Text>
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
