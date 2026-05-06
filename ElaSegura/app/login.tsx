import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { SuccessPopup } from '../components/SuccessPopup';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';

const MULHER_IMAGE = require('../assets/images/mulher.png');

export default function Login() {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const handleLogin = async () => {
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Preencha todos os campos');
      return;
    }

    try {
      const response = await api.post('/auth/login', { email, password });
      
      // Salva os dados do usuário para serem usados no perfil
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      await AsyncStorage.setItem('userPassword', password); // Salvando a senha localmente para exibir no perfil conforme pedido
      
      console.log('Login realizado:', response);
      router.replace('/home');
    } catch (error: any) {
      setErrorMessage('email ou senha incorretos');
    }
  };

  const handleRecoverPassword = async () => {
    if (!email) {
      Alert.alert('Erro', 'Por favor, digite seu e-mail no formulário de login primeiro.');
      return;
    }
    if (newPassword !== confirmNewPassword || newPassword === '') {
      Alert.alert('Erro', 'As senhas não coincidem ou estão vazias.');
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <SuccessPopup 
        visible={isSuccessVisible} 
        title="Senha Alterada!"
        message="Sua nova senha já está valendo. Agora é só entrar!"
        onContinue={() => setIsSuccessVisible(false)} 
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image source={MULHER_IMAGE} style={[styles.brandImage, isDarkMode && { tintColor: colors.primary }]} resizeMode="contain" />
            <Text style={styles.brandTitle}>ElaSegura</Text>
            <Text style={styles.brandSubtitle}>Sua segurança é importante 💜</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={24} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor={colors.secondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={24} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor={colors.secondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color={colors.secondary} 
                />
              </TouchableOpacity>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <TouchableOpacity 
              style={styles.forgotPassword} 
              onPress={() => setIsModalVisible(true)}
            >
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.8}>
              <Text style={styles.loginButtonText}>Entrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ainda não tem uma conta? </Text>
            <TouchableOpacity onPress={() => router.push('/')}>
              <Text style={styles.footerLink}>Registre-se</Text>
            </TouchableOpacity>
          </View>
        </View>
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
              <MaterialCommunityIcons name="lock-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
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
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.secondary} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputContainer}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.modalInput}
                placeholder="Confirmar Nova Senha"
                placeholderTextColor={colors.secondary}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry={!showNewPassword}
              />
            </View>

            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={handleRecoverPassword}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Redefinir Senha</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (isDarkMode: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandImage: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: isDarkMode ? colors.primary : '#FF1493',
    marginBottom: 5,
  },
  brandSubtitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  form: {
    backgroundColor: colors.cardBackground,
    padding: 24,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#252525' : '#F8F8F8',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: colors.secondary,
    fontSize: 15,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 15,
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
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
});
