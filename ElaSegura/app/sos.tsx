import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getStyles } from '../styles/sos.styles';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const SOSScreen = () => {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [contatosNotificados, setContatosNotificados] = useState<any[]>([]);
  const [semContatos, setSemContatos] = useState(false);

  const triggerSOSAlert = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await api.post('/sos', { location: 'Localização detectada' }, token);
      const contatos = response.contatosEmergencia;

      setContatosNotificados(contatos);
      setSemContatos(contatos.length === 0);
      setResultModalVisible(true);
    } catch (error: any) {
      setContatosNotificados([]);
      setSemContatos(true);
      setResultModalVisible(true);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <View style={styles.container}>

        {/* Ícone */}
        <View style={styles.iconWrapper}>
          <View style={styles.iconGlow} />
          <View style={styles.iconInnerGlow} />
          <View style={styles.mainIconCircle}>
            <MaterialCommunityIcons name="shield-alert" size={55} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.title}>Enviar Alerta SOS?</Text>
        <Text style={styles.description}>
          Seus contatos emergenciais serão notificados com sua localização.
        </Text>

        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={18} color={colors.secondary} />
          <Text style={styles.locationText}>Localização detectada</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.sendButton} activeOpacity={0.8} onPress={triggerSOSAlert}>
            <MaterialCommunityIcons name="shield-alert" size={24} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>Enviar Alerta Agora</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} activeOpacity={0.7} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de resultado */}
      <Modal
        visible={resultModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setResultModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 24, padding: 28, width: '100%', alignItems: 'center' }}>
            
            {/* Ícone */}
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: semContatos ? '#FFF3E0' : '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <MaterialCommunityIcons name={semContatos ? 'alert-circle' : 'shield-check'} size={44} color={semContatos ? '#FF9800' : '#FF5252'} />
            </View>

            <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' }}>
              {semContatos ? '⚠️ Nenhum contato emergencial' : '🚨 SOS Enviado!'}
            </Text>

            <Text style={{ fontSize: 14, color: colors.secondary, textAlign: 'center', marginBottom: 20 }}>
              {semContatos 
                ? 'Você não possui contatos emergenciais cadastrados. Adicione contatos e marque-os como emergenciais.'
                : 'Os seguintes contatos foram notificados:'
              }
            </Text>

            {/* Lista de contatos notificados */}
            {!semContatos && contatosNotificados.map((c: any) => (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <MaterialIcons name="person" size={22} color="#FF5252" />
                </View>
                <View>
                  <Text style={{ fontWeight: 'bold', color: colors.text, fontSize: 15 }}>{c.name}</Text>
                  <Text style={{ color: colors.secondary, fontSize: 13 }}>{c.phone}</Text>
                </View>
                <MaterialIcons name="check-circle" size={20} color="#4CAF50" style={{ marginLeft: 'auto' }} />
              </View>
            ))}

            <TouchableOpacity
              style={{ marginTop: 24, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, width: '100%', alignItems: 'center' }}
              onPress={() => setResultModalVisible(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>OK</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SOSScreen;