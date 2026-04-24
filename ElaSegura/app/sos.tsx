import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from '../styles/sos.styles';

const SOSScreen = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDF7F9' }}>
      <StatusBar barStyle="dark-content" />
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
          <MaterialIcons name="location-on" size={18} color="#9C97AC" />
          <Text style={styles.locationText}>Localização detectada</Text>
        </View>

        {/* Buttons Section */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.sendButton}
            activeOpacity={0.8}
            onPress={() => {
              // Action to send alert
              console.log('Alerta SOS enviado');
            }}
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
