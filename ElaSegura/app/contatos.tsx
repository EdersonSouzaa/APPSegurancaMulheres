import React, { useMemo, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar, 
  FlatList, 
  Modal, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  Switch,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getStyles } from '../styles/contatos.styles';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Contato {
  id: number;
  name: string;
  phone: string;
  emergencial: boolean;
}

export default function Contatos() {
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContato, setEditingContato] = useState<Contato | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencial, setEmergencial] = useState(false);

  const contatosEmergenciais = contatos.filter(c => c.emergencial);
  const contatosNormais = contatos.filter(c => !c.emergencial);

  useEffect(() => {
    fetchContatos();
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

  const renderContato = ({ item }: { item: Contato }) => (
    <View style={styles.contactItem}>
      <MaterialIcons name="person" size={40} color={item.emergencial ? '#FF5252' : colors.primary} />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
          <MaterialIcons name="edit" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item.id)}>
          <MaterialIcons name="delete" size={24} color="#FF5252" />
        </TouchableOpacity>
      </View>
    </View>
  );

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
      <TouchableOpacity 
        style={styles.addButton} 
        activeOpacity={0.8}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Text style={styles.addButtonText}>+ Adicionar contato</Text>
      </TouchableOpacity>

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
          
          {/* Seção Emergenciais */}
          {contatosEmergenciais.length > 0 && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 12 }}>
                <MaterialIcons name="warning" size={24} color="#FF5252" />
                <Text style={{ color: '#FF5252', fontWeight: 'bold', marginLeft: 8, fontSize: 18 }}>
                  Contatos Emergenciais
                </Text>
              </View>
              {contatosEmergenciais.map(item => (
                <View key={item.id}>
                  {renderContato({ item })}
                </View>
              ))}
            </View>
          )}

          {/* Seção Contatos Normais */}
          {contatosNormais.length > 0 && (
            <View>
              {contatosEmergenciais.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 20 }}>
                  <MaterialIcons name="people" size={24} color={colors.text} />
                  <Text style={{ color: colors.text, fontWeight: 'bold', marginLeft: 8, fontSize: 18 }}>
                    Outros Contatos
                  </Text>
                </View>
              )}
              {contatosNormais.map(item => (
                <View key={item.id}>
                  {renderContato({ item })}
                </View>
              ))}
            </View>
          )}

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
            
            <TextInput
              style={styles.input}
              placeholder="Nome do contato"
              placeholderTextColor={colors.secondary}
              value={name}
              onChangeText={setName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              placeholderTextColor={colors.secondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>Contato emergencial</Text>
              <Switch
                value={emergencial}
                onValueChange={setEmergencial}
                trackColor={{ false: '#ccc', true: '#FF5252' }}
                thumbColor={emergencial ? '#fff' : '#fff'}
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
          </View>
        </View>
      </Modal>
    </View>
  );
}