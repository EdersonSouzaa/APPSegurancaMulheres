import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SuccessPopup } from '../components/SuccessPopup';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';

const LOGO_IMAGE = require('../assets/images/logo.png');

type AuthTab = 'login' | 'cadastro';

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { isDarkMode, theme } = useTheme();

  const [activeTab, setActiveTab] = useState<AuthTab>(params.tab === 'cadastro' ? 'cadastro' : 'login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Cadastro state
  const [name, setName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  // Recuperar senha
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);

  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const logoSize = Math.min(width * 0.32, 140);
  const styles = useMemo(() => getStyles(isDarkMode, colors, logoSize), [isDarkMode, colors, logoSize]);

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setLoginError('');
    setRegisterError('');
  };

  const handleLogin = async () => {
    setLoginError('');

    if (!email || !password) {
      setLoginError('Preencha todos os campos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError('Digite um e-mail válido (ex: seuemail@dominio.com)');
      return;
    }

    try {
      const response = await api.post('/auth/login', { email, password });

      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      await AsyncStorage.setItem('userToken', response.token);
      await AsyncStorage.setItem('userPassword', password);

      router.replace('/home');
    } catch (error: any) {
      setLoginError('E-mail ou senha incorretos');
    }
  };

  const handleRegister = async () => {
    setRegisterError('');

    if (!name || !registerEmail || !registerPassword || !confirmPassword) {
      setRegisterError('Preencha todos os campos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      setRegisterError('Digite um e-mail válido (ex: seuemail@dominio.com)');
      return;
    }

    if (registerPassword.length < 6 || registerPassword.length > 20) {
      setRegisterError('A senha precisa ter entre 6 e 20 caracteres');
      return;
    }

    if (registerPassword !== confirmPassword) {
      setRegisterError('As senhas não coincidem');
      return;
    }

    try {
      await api.post('/auth/register', { name, email: registerEmail, password: registerPassword });
      setIsPopupVisible(true);
    } catch (error: any) {
      Alert.alert('Erro no Cadastro', error.message);
    }
  };

  const handleRecoverPassword = async () => {
    if (!email) {
      Alert.alert('Erro', 'Por favor, digite seu e-mail no formulário de login primeiro.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erro', 'Formato de e-mail inválido.');
      return;
    }

    if (newPassword !== confirmNewPassword || newPassword === '') {
      Alert.alert('Erro', 'As senhas não coincidem ou estão vazias.');
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      Alert.alert('Erro', 'A nova senha precisa ter entre 6 e 20 caracteres.');
      return;
    }

    try {
      await api.post('/auth/reset-password', { email, newPassword });
      setIsSuccessVisible(true);
      setIsModalVisible(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const isLogin = activeTab === 'login';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <SuccessPopup
        visible={isSuccessVisible}
        title="Senha Alterada!"
        message="Sua nova senha já está valendo. Agora é só entrar!"
        onContinue={() => setIsSuccessVisible(false)}
      />

      <SuccessPopup
        visible={isPopupVisible}
        title="Cadastro realizado!"
        message="Sua conta foi criada com sucesso. Agora é só entrar."
        onContinue={() => {
          setIsPopupVisible(false);
          switchTab('login');
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Image source={LOGO_IMAGE} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.title}>{isLogin ? 'Bem-vinda de volta' : 'Crie sua conta'}</Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? 'Entre para manter sua rede de proteção sempre ativa.'
                : 'Cadastre-se para começar a usar sua rede de proteção.'}
            </Text>
          </View>

          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tabButton, isLogin && styles.tabButtonActive]}
              onPress={() => switchTab('login')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, isLogin && styles.tabButtonTextActive]}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, !isLogin && styles.tabButtonActive]}
              onPress={() => switchTab('cadastro')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, !isLogin && styles.tabButtonTextActive]}>Cadastrar</Text>
            </TouchableOpacity>
          </View>

          {isLogin ? (
            <View style={styles.form}>
              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="seuemail@email.com"
                  placeholderTextColor={colors.secondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.secondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.secondary}
                  />
                </TouchableOpacity>
              </View>

              {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

              <TouchableOpacity style={styles.forgotPassword} onPress={() => setIsModalVisible(true)}>
                <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryButtonWrapper} onPress={handleLogin} activeOpacity={0.85}>
                <LinearGradient
                  colors={[colors.primary, '#C2185B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Entrar →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Nome completo</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome completo"
                  placeholderTextColor={colors.secondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="seuemail@email.com"
                  placeholderTextColor={colors.secondary}
                  value={registerEmail}
                  onChangeText={setRegisterEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.secondary}
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  secureTextEntry={!showRegisterPassword}
                />
                <TouchableOpacity onPress={() => setShowRegisterPassword(!showRegisterPassword)}>
                  <MaterialCommunityIcons
                    name={showRegisterPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.secondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirmar senha</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-check-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.secondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showRegisterPassword}
                />
              </View>

              {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}

              <TouchableOpacity style={[styles.primaryButtonWrapper, { marginTop: 8 }]} onPress={handleRegister} activeOpacity={0.85}>
                <LinearGradient
                  colors={[colors.primary, '#C2185B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Cadastrar →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>{isLogin ? 'Não tem conta? ' : 'Já tem conta? '}</Text>
            <TouchableOpacity onPress={() => switchTab(isLogin ? 'cadastro' : 'login')}>
              <Text style={styles.footerLink}>{isLogin ? 'Cadastre-se' : 'Entrar'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Recuperar Senha */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Redefinir Senha</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Digite sua nova senha abaixo para atualizar seu acesso.
            </Text>

            <View style={styles.modalInputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={24} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.modalInput}
                placeholder="Nova Senha"
                placeholderTextColor={colors.secondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <MaterialCommunityIcons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={colors.secondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputContainer}>
              <MaterialCommunityIcons name="lock-check-outline" size={24} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.modalInput}
                placeholder="Confirmar Nova Senha"
                placeholderTextColor={colors.secondary}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry={!showNewPassword}
              />
            </View>

            <TouchableOpacity style={styles.modalButton} onPress={handleRecoverPassword} activeOpacity={0.8}>
              <Text style={styles.modalButtonText}>Redefinir Senha</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (isDarkMode: boolean, colors: any, logoSize: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
    marginTop: 12,
  },
  logoBadge: {
    alignSelf: 'center',
    width: logoSize,
    height: logoSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: logoSize,
    height: logoSize,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondary,
    lineHeight: 20,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? '#252525' : '#F2E3EA',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.cardBackground,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  form: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#252525' : '#F8F8F8',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButton: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: colors.secondary,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    width: '100%',
    borderRadius: 30,
    padding: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalDescription: {
    fontSize: 15,
    color: colors.secondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#252525' : '#F8F8F8',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
});
