import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStyles } from '../styles/contatos.styles';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastNotification } from '../components/ToastNotification';
import { BackHomeButton } from '../components/BackHomeButton';

interface Contato {
  id: number;
  name: string;
  phone: string;
  emergencial: boolean;
}

const CONTACT_COLORS = ['#F5A623', '#7C4DFF', '#2196F3', '#26A69A', '#EC407A', '#5C6BC0'];

const DELEGACIA_CONTATO = {
  id: -1,
  name: 'Delegacia da Mulher',
  phone: '180',
  subtitle: '180 · Central de Atendimento',
};

export default function Contatos() {
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [contatos, setContatos] = useState<Contato[]>([
    { id: 1, name: 'Mãe', phone: '+55 11 98888-1020', emergencial: true },
  ]);
  const [loading, setLoading] = useState(false as any);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContato, setEditingContato] = useState<Contato | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencial, setEmergencial] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger'>('success');

  const showToast = async (message: string, type: 'success' | 'danger') => {
    try {
      const isEnabledVal = await AsyncStorage.getItem('@notifications_enabled');
      const notificationsEnabled = isEnabledVal === null ? true : isEnabledVal === 'true';
      if (notificationsEnabled) {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // fetchContatos();
  }, []);

  const fetchContatos = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }
      const data = await api.get('/contatos', token);
      setContatos(data);
    } catch (error: any) {
      console.error('Error fetching contatos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os contatos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !phone) {
      Alert.alert('Aviso', 'Preencha todos os campos.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (editingContato) {
        await api.put(`/contatos/${editingContato.id}`, { name, phone, emergencial }, token || undefined);
      } else {
        await api.post('/contatos', { name, phone, emergencial }, token || undefined);
        showToast('Contato adicionado com sucesso! 💜', 'success');
      }
      setModalVisible(false);
      resetForm();
      fetchContatos();
    } catch (error: any) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar o contato.');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Confirmar',
      'Deseja realmente excluir este contato?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await api.delete(`/contatos/${id}`, token || undefined);
              setModalVisible(false);
              showToast('Contato excluído com sucesso! 🗑️', 'danger');
              fetchContatos();
            } catch (error: any) {
              Alert.alert('Erro', 'Erro ao excluir contato.');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (contato: Contato) => {
    setEditingContato(contato);
    setName(contato.name);
    setPhone(contato.phone);
    setEmergencial(contato.emergencial);
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingContato(null);
    setName('');
    setPhone('');
    setEmergencial(false);
  };

  const callContact = async (phoneNumber: string, contactName: string) => {
    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch {
      Alert.alert('Não foi possível ligar', `Tente ligar manualmente para ${contactName} (${phoneNumber}).`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <BackHomeButton to="/perfil" />
        <Text style={styles.headerTitle}>Contatos</Text>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <MaterialIcons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.headerSubtitle}>
        Essas pessoas serão avisadas na hora quando você acionar o SOS.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : contatos.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <MaterialIcons name="account-circle" size={100} color={isDarkMode ? colors.secondary : "#1A1A1A"} />
          <Text style={styles.emptyStateTitle}>Nenhum contato adicionado</Text>
          <Text style={styles.emptyStateText}>Adicione contatos de confiança para enviar alertas</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {contatos.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={styles.contactItem}
              activeOpacity={0.8}
              onPress={() => openEditModal(item)}
            >
              <View style={[styles.contactAvatar, { backgroundColor: CONTACT_COLORS[index % CONTACT_COLORS.length] }]}>
                <Text style={styles.contactAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.contactPhone}>{item.phone}</Text>
              </View>
              {item.emergencial && (
                <View style={styles.principalBadge}>
                  <Text style={styles.principalBadgeText}>PRINCIPAL</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.callButton}
                onPress={(e) => { e.stopPropagation(); callContact(item.phone, item.name); }}
              >
                <MaterialIcons name="call" size={18} color="#2E7D32" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {/* Contato fixo de emergência pública */}
          <View style={styles.contactItem}>
            <View style={[styles.contactAvatar, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="shield-alert" size={20} color="#FFF" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName} numberOfLines={1}>{DELEGACIA_CONTATO.name}</Text>
              <Text style={styles.contactPhone}>{DELEGACIA_CONTATO.subtitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => callContact(DELEGACIA_CONTATO.phone, DELEGACIA_CONTATO.name)}
            >
              <MaterialIcons name="call" size={18} color="#2E7D32" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingContato ? 'Editar Contato' : 'Novo Contato'}
            </Text>

            <View style={styles.inputField}>
              <MaterialCommunityIcons name="account-outline" size={18} color={colors.primary} style={styles.inputFieldIcon} />
              <TextInput
                style={styles.inputFieldText}
                placeholder="Nome do contato"
                placeholderTextColor={colors.secondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputField}>
              <MaterialCommunityIcons name="phone-outline" size={18} color={colors.primary} style={styles.inputFieldIcon} />
              <TextInput
                style={styles.inputFieldText}
                placeholder="Telefone"
                placeholderTextColor={colors.secondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Contato principal (SOS)</Text>
              <Switch
                value={emergencial}
                onValueChange={setEmergencial}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFF'}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>Salvar</Text>
              </TouchableOpacity>
            </View>

            {editingContato && (
              <TouchableOpacity style={styles.deleteLink} onPress={() => handleDelete(editingContato.id)}>
                <MaterialIcons name="delete-outline" size={18} color="#E53935" />
                <Text style={styles.deleteLinkText}>Excluir contato</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}
