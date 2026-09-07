import React, { useState, useMemo } from 'react';
import { Fonts } from '../constants/globalFont';
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
import { entrar, registrar, recuperarSenha, mensagemErroAuth } from '../services/auth';
import { sincronizarSessao } from '../services/session';
import { onboardingConcluido } from '../lib/preferencias';
import { haptics } from '../lib/haptics';
import { useI18n } from '../context/I18nContext';
import { SuccessPopup } from '../components/SuccessPopup';
import { Colors } from '../constants/theme';

const LOGO_IMAGE = require('../assets/images/logo.png');

// A tela de login/cadastro fica SEMPRE no tema claro, mesmo que a pessoa ja
// tenha escolhido o tema escuro nas configuracoes. Por isso aqui nao usamos o
// useTheme() — as cores vem fixas de Colors.light.
const LIGHT_COLORS = Colors.light;

type AuthTab = 'login' | 'cadastro';

export default function Login() {
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ tab?: string }>();

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
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);

  const colors = LIGHT_COLORS;
  const { width } = useWindowDimensions();
  const logoSize = Math.min(width * 0.32, 140);
  const styles = useMemo(() => getStyles(colors, logoSize), [colors, logoSize]);

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setLoginError('');
    setRegisterError('');
  };

  const handleLogin = async () => {
    setLoginError('');

    if (!email || !password) {
      setLoginError(t('login.preenchaCampos'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError(t('login.emailInvalido'));
      return;
    }

    try {
      const { user } = await entrar(email, password);

      // Aguarda o espelho no AsyncStorage antes de navegar: a home lê 'user'
      // e 'userToken' já no primeiro render.
      await sincronizarSessao(user);
      haptics.sucesso();

      // Primeiro acesso neste aparelho vai para o onboarding: é lá que a
      // localização é liberada e o primeiro contato de emergência é
      // cadastrado, sem os quais o SOS não funciona de verdade.
      const jaConfigurou = await onboardingConcluido();
      router.replace(jaConfigurou ? '/home' : '/onboarding');
    } catch (error: any) {
      haptics.erro();
      setLoginError(mensagemErroAuth(error));
    }
  };

  const handleRegister = async () => {
    setRegisterError('');

    if (!name || !registerEmail || !registerPassword || !confirmPassword) {
      setRegisterError(t('login.preenchaCampos'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      setRegisterError(t('login.emailInvalido'));
      return;
    }

    if (registerPassword.length < 6 || registerPassword.length > 20) {
      setRegisterError(t('login.senhaTamanho'));
      return;
    }

    if (registerPassword !== confirmPassword) {
      setRegisterError(t('login.senhasNaoCoincidem'));
      return;
    }

    try {
      await registrar(name, registerEmail, registerPassword);
      haptics.sucesso();
      setIsPopupVisible(true);
    } catch (error: any) {
      haptics.erro();
      Alert.alert(t('login.erroCadastro'), mensagemErroAuth(error));
    }
  };

  const handleRecoverPassword = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!resetEmail) {
      Alert.alert(t('comum.erro'), t('login.digiteEmailConta'));
      return;
    }
    if (!emailRegex.test(resetEmail)) {
      Alert.alert(t('comum.erro'), t('login.formatoEmailInvalido'));
      return;
    }

    setIsSendingReset(true);
    try {
      await recuperarSenha(resetEmail);
      haptics.sucesso();
      setIsModalVisible(false);
      setIsSuccessVisible(true);
    } catch (error: any) {
      haptics.erro();
      Alert.alert(t('comum.erro'), mensagemErroAuth(error));
    } finally {
      setIsSendingReset(false);
    }
  };

  const isLogin = activeTab === 'login';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <SuccessPopup
        visible={isSuccessVisible}
        title={t('login.emailEnviadoTitulo')}
        message={t('login.emailEnviadoTexto')}
        continueLabel={t('comum.continuar')}
        onContinue={() => setIsSuccessVisible(false)}
      />

      <SuccessPopup
        visible={isPopupVisible}
        title={t('login.cadastroTitulo')}
        message={t('login.cadastroTexto')}
        continueLabel={t('comum.continuar')}
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
            <Text style={styles.title} accessibilityRole="header">
              {isLogin ? t('login.tituloLogin') : t('login.tituloCadastro')}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? t('login.subtituloLogin') : t('login.subtituloCadastro')}
            </Text>
          </View>

          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tabButton, isLogin && styles.tabButtonActive]}
              onPress={() => {
                haptics.selecao();
                switchTab('login');
              }}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: isLogin }}
              accessibilityLabel={t('login.abaEntrar')}
            >
              <Text style={[styles.tabButtonText, isLogin && styles.tabButtonTextActive]}>{t('login.abaEntrar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, !isLogin && styles.tabButtonActive]}
              onPress={() => {
                haptics.selecao();
                switchTab('cadastro');
              }}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: !isLogin }}
              accessibilityLabel={t('login.abaCadastrar')}
            >
              <Text style={[styles.tabButtonText, !isLogin && styles.tabButtonTextActive]}>{t('login.abaCadastrar')}</Text>
            </TouchableOpacity>
          </View>

          {isLogin ? (
            <View style={styles.form}>
              <Text style={styles.label}>{t('login.email')}</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('login.emailPlaceholder')}
                  placeholderTextColor={colors.secondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accessibilityLabel={t('login.email')}
                />
              </View>

              <Text style={styles.label}>{t('login.senha')}</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.secondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  accessibilityLabel={t('login.senha')}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? t('a11y.ocultarSenha') : t('a11y.mostrarSenha')}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.secondary}
                  />
                </TouchableOpacity>
              </View>

              {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => {
                  haptics.toque();
                  setResetEmail(email);
                  setIsModalVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('login.esqueciSenha')}
              >
                <Text style={styles.forgotPasswordText}>{t('login.esqueciSenha')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButtonWrapper}
                onPress={handleLogin}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('login.abaEntrar')}
              >
                <LinearGradient
                  colors={[colors.primary, '#C2185B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>{t('login.entrarBotao')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>{t('login.nomeCompleto')}</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('login.nomePlaceholder')}
                  placeholderTextColor={colors.secondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  accessibilityLabel={t('login.nomeCompleto')}
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

              <TouchableOpacity
                style={[styles.primaryButtonWrapper, { marginTop: 8 }]}
                onPress={handleRegister}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('login.abaCadastrar')}
              >
                <LinearGradient
                  colors={[colors.primary, '#C2185B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>{t('login.cadastrarBotao')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>{isLogin ? t('login.naoTemConta') : t('login.jaTemConta')}</Text>
            <TouchableOpacity
              onPress={() => switchTab(isLogin ? 'cadastro' : 'login')}
              accessibilityRole="button"
              accessibilityLabel={isLogin ? t('login.cadastreSe') : t('login.entrar')}
            >
              <Text style={styles.footerLink}>{isLogin ? t('login.cadastreSe') : t('login.entrar')}</Text>
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
              <Text style={styles.modalTitle} accessibilityRole="header">
                {t('login.redefinirSenha')}
              </Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.fecharModal')}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>{t('login.redefinirDescricao')}</Text>

            <View style={styles.modalInputContainer}>
              <MaterialCommunityIcons name="email-outline" size={24} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.modalInput}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={colors.secondary}
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel={t('login.email')}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalButton, isSendingReset && { opacity: 0.6 }]}
              onPress={handleRecoverPassword}
              activeOpacity={0.8}
              disabled={isSendingReset}
              accessibilityRole="button"
              accessibilityLabel={t('login.enviarLink')}
              accessibilityState={{ disabled: isSendingReset, busy: isSendingReset }}
            >
              <Text style={styles.modalButtonText}>
                {isSendingReset ? t('login.enviando') : t('login.enviarLink')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, logoSize: number) => StyleSheet.create({
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
    fontFamily: Fonts.display,
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
    backgroundColor: '#F2E3EA',
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
    backgroundColor: '#F8F8F8',
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
    fontFamily: Fonts.display,
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
    backgroundColor: '#F8F8F8',
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
