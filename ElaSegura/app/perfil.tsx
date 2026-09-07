import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStyles } from '../styles/perfil.styles';
import { router } from 'expo-router';
import { BackHomeButton } from '../components/BackHomeButton';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { Colors } from '../constants/theme';
import { haptics } from '../lib/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { obterPerfil, atualizarPerfil, atualizarFoto } from '../services/usuario';
import { listarContatos } from '../services/contatos';
import { obterAlertas } from '../services/alertas';
import { sair } from '../services/auth';
import { limparSessao } from '../services/session';
import { limparCache } from '../services/cacheOffline';
import { auth } from '../services/firebase';

const formatMemberSince = (createdAt: string, locale: string) => {
  const date = new Date(createdAt);
  const label = date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
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
  const { t, locale } = useI18n();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [userData, setUserData] = useState({ name: '', email: '', profile_picture: null as string | null, created_at: null as string | null });
  const [isSaving, setIsSaving] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [contatosCount, setContatosCount] = useState(0);
  const [alertasCount, setAlertasCount] = useState(0);
  const [logoutWidth, setLogoutWidth] = useState(0);
  const logoutShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!logoutWidth) return;
    logoutShift.setValue(0);
    const animation = Animated.loop(
      Animated.timing(logoutShift, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { iterations: -1, resetBeforeIteration: true }
    );
    animation.start();
    return () => animation.stop();
  }, [logoutWidth, logoutShift]);


  const loadUserData = useCallback(async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');

      if (savedUser) {
        const userObj = JSON.parse(savedUser);
        setUserData({
          name: userObj.name,
          email: userObj.email,
          profile_picture: userObj.profile_picture || null,
          created_at: userObj.created_at || null,
        });
      }

      if (auth.currentUser) {
        const me = await obterPerfil();
        if (me) {
          setUserData((prev) => ({ ...prev, created_at: me.created_at || prev.created_at }));
        }

        const [contatos, alertas] = await Promise.all([
          listarContatos().catch(() => []),
          obterAlertas().catch(() => ({ alerts: [], summary: null } as any)),
        ]);
        setContatosCount(contatos.length);
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
        await atualizarFoto(base64Image);
        haptics.sucesso();

        const savedUser = await AsyncStorage.getItem('user');
        if (savedUser) {
          const userObj = JSON.parse(savedUser);
          userObj.profile_picture = base64Image;
          await AsyncStorage.setItem('user', JSON.stringify(userObj));
        }
      } catch (error) {
        console.error('Erro ao salvar foto:', error);
        haptics.erro();
        Alert.alert(t('comum.erro'), t('perfil.erroFoto'));
      }
    }
  };

  const openEditModal = () => {
    haptics.toque();
    setEditName(userData.name);
    setEditEmail(userData.email);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      haptics.aviso();
      Alert.alert(t('comum.atencao'), t('perfil.camposObrigatorios'));
      return;
    }
    haptics.acao();
    setIsSaving(true);
    try {
      const updated = await atualizarPerfil(editName.trim(), editEmail.trim());
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        const userObj = JSON.parse(savedUser);
        await AsyncStorage.setItem('user', JSON.stringify({ ...userObj, name: updated.name, email: updated.email }));
      }
      setUserData((prev) => ({ ...prev, name: updated.name, email: updated.email }));
      setEditModalVisible(false);
      haptics.sucesso();

      // O Firebase não troca o e-mail de login sem confirmação: ele envia um
      // link para o novo endereço e só efetiva depois do clique.
      if (updated.emailPendenteConfirmacao) {
        Alert.alert(
          t('perfil.confirmeNovoEmail'),
          t('perfil.confirmeEmailTexto', { email: editEmail.trim() })
        );
      }
    } catch (error: any) {
      haptics.erro();
      Alert.alert(t('comum.erro'), error.message || t('perfil.erroSalvar'));
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
          <Text style={styles.headerTitle} accessibilityRole="header">
            {t('perfil.titulo')}
          </Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={openEditModal}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.editarPerfil')}
          >
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
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={pickImage}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.trocarFoto')}
            >
              <MaterialCommunityIcons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{userData.name || t('perfil.usuaria')}</Text>
          <Text style={styles.userEmail}>{userData.email || t('perfil.carregando')}</Text>

          {userData.created_at && (
            <View style={styles.memberBadge}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={styles.memberBadgeText}>
                {t('perfil.membroDesde', { data: formatMemberSince(userData.created_at, locale) })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{contatosCount}</Text>
            <Text style={styles.statLabel}>{t('perfil.contatos')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alertasCount}</Text>
            <Text style={styles.statLabel}>{t('perfil.alertas')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.created_at ? formatProtectedDuration(userData.created_at) : '-'}</Text>
            <Text style={styles.statLabel}>{t('perfil.protegida')}</Text>
          </View>
        </View>

        <View style={styles.menuList}>
          <MenuRow
            styles={styles}
            icon="account-outline"
            iconColor="#F35F74"
            iconTint={isDarkMode ? '#F35F7433' : '#FFF0F2'}
            title={t('perfil.infoPessoais')}
            subtitle={t('perfil.infoPessoaisSub')}
            onPress={openEditModal}
          />
          <MenuRow
            styles={styles}
            icon="heart-outline"
            iconColor="#7C4DFF"
            iconTint={isDarkMode ? '#7C4DFF33' : '#EDE7F6'}
            title={t('perfil.contatosEmergencia')}
            subtitle={t('perfil.contatosEmergenciaSub')}
            onPress={() => router.push('/contatos')}
          />
          <MenuRow
            styles={styles}
            icon="history"
            iconColor="#2196F3"
            iconTint={isDarkMode ? '#2196F333' : '#E3F2FD'}
            title={t('perfil.historico')}
            subtitle={t('perfil.historicoSub')}
            onPress={() => router.push('/alertas' as any)}
          />
          <MenuRow
            styles={styles}
            icon="lock-outline"
            iconColor="#4CAF50"
            iconTint={isDarkMode ? '#4CAF5033' : '#E8F5E9'}
            title={t('perfil.privacidade')}
            subtitle={t('perfil.privacidadeSub')}
            onPress={() => router.push('/settings')}
          />
          <MenuRow
            styles={styles}
            icon="help-circle-outline"
            iconColor="#FF9800"
            iconTint={isDarkMode ? '#FF980033' : '#FFF3E0'}
            title={t('perfil.sobreApp')}
            subtitle={t('perfil.sobreAppSub')}
            onPress={() => router.push('/about')}
          />
        </View>

        <TouchableOpacity
          style={styles.logoutButtonWrapper}
          activeOpacity={0.85}
          onPress={async () => {
            haptics.aviso();
            // signOut encerra a sessão no Firebase; limpar só o AsyncStorage
            // deixaria a usuária autenticada por baixo dos panos.
            const uid = auth.currentUser?.uid ?? null;
            try {
              await sair();
            } catch (e) {
              console.error('Erro ao sair:', e);
            }
            await limparSessao();
            // O cache offline guarda contatos e ocorrências desta usuária: ele
            // não pode sobreviver ao logout num aparelho compartilhado.
            await limparCache(uid);
            router.replace('/login');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('perfil.sair')}
        >
          <View
            style={styles.logoutButton}
            onLayout={(e) => setLogoutWidth(e.nativeEvent.layout.width)}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.logoutGradientLayer,
                {
                  width: logoutWidth * 2,
                  transform: [
                    {
                      translateX: logoutShift.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -logoutWidth],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[colors.primary, '#C2185B', colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.logoutGradientFill}
              />
            </Animated.View>
            <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
            <Text style={styles.logoutText}>{t('perfil.sair')}</Text>
          </View>
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
              <Text style={styles.modalTitle} accessibilityRole="header">
                {t('perfil.infoPessoais')}
              </Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.fecharModal')}
              >
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('perfil.nome')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('perfil.nomePlaceholder')}
                placeholderTextColor={colors.secondary}
                value={editName}
                onChangeText={setEditName}
                accessibilityLabel={t('perfil.nome')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('perfil.email')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('perfil.emailPlaceholder')}
                placeholderTextColor={colors.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={editEmail}
                onChangeText={setEditEmail}
                accessibilityLabel={t('perfil.email')}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.8}
              disabled={isSaving}
              onPress={handleSaveEdit}
              accessibilityRole="button"
              accessibilityLabel={t('perfil.salvarAlteracoes')}
              accessibilityState={{ disabled: isSaving, busy: isSaving }}
            >
              {isSaving
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.saveButtonText}>{t('perfil.salvarAlteracoes')}</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const MenuRow = ({ icon, iconColor, iconTint, title, subtitle, onPress, styles }: any) => (
  <TouchableOpacity
    style={styles.menuRow}
    activeOpacity={0.7}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${title}. ${subtitle}`}
  >
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
