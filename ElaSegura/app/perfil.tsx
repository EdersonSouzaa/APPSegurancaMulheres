import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStyles } from '../styles/perfil.styles';
import { router } from 'expo-router';
import { BackHomeButton } from '../components/BackHomeButton';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const formatMemberSince = (createdAt: string) => {
  const date = new Date(createdAt);
  const label = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  return label.replace('.', '');
};

const formatProtectedDuration = (createdAt: string) => {
  const start = new Date(createdAt).getTime();
  const days = Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)));
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}m`;
  return `${Math.floor(months / 12)}a`;
};

export default function Perfil() {
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [userData, setUserData] = useState({ name: '', email: '', profile_picture: null as string | null, created_at: null as string | null });
  const [token, setToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [contatosCount, setContatosCount] = useState(0);
  const [alertasCount, setAlertasCount] = useState(0);

  const loadUserData = useCallback(async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      const savedToken = await AsyncStorage.getItem('userToken');
      if (savedToken) setToken(savedToken);

      if (savedUser) {
        const userObj = JSON.parse(savedUser);
        setUserData({
          name: userObj.name,
          email: userObj.email,
          profile_picture: userObj.profile_picture || null,
          created_at: userObj.created_at || null,
        });
      }

      if (savedToken) {
        const me = await api.get('/user/me', savedToken);
        if (me) {
          setUserData((prev) => ({ ...prev, created_at: me.created_at || prev.created_at }));
        }

        const [contatos, alertas] = await Promise.all([
          api.get('/contatos', savedToken).catch(() => []),
          api.get('/alertas', savedToken).catch(() => ({ alerts: [] })),
        ]);
        setContatosCount(Array.isArray(contatos) ? contatos.length : 0);
        setAlertasCount(alertas?.alerts?.length || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setUserData({ ...userData, profile_picture: base64Image });

      try {
        await api.put('/user/profile-picture', { profile_picture: base64Image }, token);

        const savedUser = await AsyncStorage.getItem('user');
        if (savedUser) {
          const userObj = JSON.parse(savedUser);
          userObj.profile_picture = base64Image;
          await AsyncStorage.setItem('user', JSON.stringify(userObj));
        }
      } catch (error) {
        console.error('Erro ao salvar foto:', error);
        Alert.alert('Erro', 'Não foi possível atualizar a foto.');
      }
    }
  };

  const openEditModal = () => {
    setEditName(userData.name);
    setEditEmail(userData.email);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert('Aviso', 'Nome e e-mail são obrigatórios.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await api.put('/user/update', { name: editName.trim(), email: editEmail.trim() }, token);
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        const userObj = JSON.parse(savedUser);
        await AsyncStorage.setItem('user', JSON.stringify({ ...userObj, name: updated.name, email: updated.email }));
      }
      setUserData((prev) => ({ ...prev, name: updated.name, email: updated.email }));
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const userInitial = (userData.name || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackHomeButton />
          <Text style={styles.headerTitle}>Perfil</Text>
          <TouchableOpacity style={styles.headerButton} onPress={openEditModal}>
            <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.avatarContainer}>
          <View>
            <View style={styles.avatarBox}>
              {userData.profile_picture ? (
                <Image source={{ uri: userData.profile_picture }} style={{ width: 96, height: 96, borderRadius: 48 }} />
              ) : (
                <Text style={styles.avatarInitial}>{userInitial}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.cameraBadge} onPress={pickImage} activeOpacity={0.8}>
              <MaterialCommunityIcons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{userData.name || 'Usuária'}</Text>
          <Text style={styles.userEmail}>{userData.email || 'carregando...'}</Text>

          {userData.created_at && (
            <View style={styles.memberBadge}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={styles.memberBadgeText}>Membro desde {formatMemberSince(userData.created_at)}</Text>
            </View>
          )}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{contatosCount}</Text>
            <Text style={styles.statLabel}>Contatos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alertasCount}</Text>
            <Text style={styles.statLabel}>Alertas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.created_at ? formatProtectedDuration(userData.created_at) : '-'}</Text>
            <Text style={styles.statLabel}>Protegida</Text>
          </View>
        </View>

        <View style={styles.menuList}>
          <MenuRow
            styles={styles}
            icon="account-outline"
            iconColor="#F35F74"
            iconTint={isDarkMode ? '#F35F7433' : '#FFF0F2'}
            title="Informações pessoais"
            subtitle="Nome e e-mail"
            onPress={openEditModal}
          />
          <MenuRow
            styles={styles}
            icon="heart-outline"
            iconColor="#7C4DFF"
            iconTint={isDarkMode ? '#7C4DFF33' : '#EDE7F6'}
            title="Contatos de emergência"
            subtitle="Gerencie sua rede de confiança"
            onPress={() => router.push('/contatos')}
          />
          <MenuRow
            styles={styles}
            icon="history"
            iconColor="#2196F3"
            iconTint={isDarkMode ? '#2196F333' : '#E3F2FD'}
            title="Histórico de atividade"
            subtitle="Alertas e registros"
            onPress={() => router.push('/alertas' as any)}
          />
          <MenuRow
            styles={styles}
            icon="lock-outline"
            iconColor="#4CAF50"
            iconTint={isDarkMode ? '#4CAF5033' : '#E8F5E9'}
            title="Privacidade e segurança"
            subtitle="Senha e controle de dados"
            onPress={() => router.push('/settings')}
          />
          <MenuRow
            styles={styles}
            icon="help-circle-outline"
            iconColor="#FF9800"
            iconTint={isDarkMode ? '#FF980033' : '#FFF3E0'}
            title="Ajuda e suporte"
            subtitle="Central de dúvidas e contato"
            onPress={() => router.push('/about')}
          />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={async () => {
            await AsyncStorage.multiRemove(['userToken', 'user']);
            router.replace('/login');
          }}
        >
          <MaterialCommunityIcons name="logout" size={20} color={colors.primary} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Informações pessoais</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Seu Nome"
                placeholderTextColor={colors.secondary}
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={colors.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={editEmail}
                onChangeText={setEditEmail}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.8}
              disabled={isSaving}
              onPress={handleSaveEdit}
            >
              {isSaving
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.saveButtonText}>Salvar Alterações</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const MenuRow = ({ icon, iconColor, iconTint, title, subtitle, onPress, styles }: any) => (
  <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={onPress}>
    <View style={[styles.menuIconBox, { backgroundColor: iconTint }]}>
      <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
    </View>
    <View style={styles.menuTextWrap}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuSubtitle}>{subtitle}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={22} color={styles.menuSubtitle.color} />
  </TouchableOpacity>
);
