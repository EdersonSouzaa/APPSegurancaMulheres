import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStyles } from '../styles/perfil.styles';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

export default function Perfil() {
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [userData, setUserData] = useState({ name: '', email: '' });
  const [password, setPassword] = useState('');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        const savedPassword = await AsyncStorage.getItem('userPassword');
        
        if (savedUser) {
          setUserData(JSON.parse(savedUser));
        }
        if (savedPassword) {
          setPassword(savedPassword);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    loadUserData();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBox}>
              <MaterialIcons name="person" size={50} color="#FFF" />
            </View>
            <Text style={styles.userName}>{userData.name || 'Usuária'}</Text>
            <Text style={styles.userEmail}>{userData.email || 'carregando...'}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Informações de perfil</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome</Text>
            <TextInput 
              style={styles.input}
              placeholder="Seu Nome"
              placeholderTextColor={colors.secondary}
              value={userData.name}
              onChangeText={(text) => setUserData({...userData, name: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput 
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={colors.secondary}
              keyboardType="email-address"
              value={userData.email}
              onChangeText={(text) => setUserData({...userData, email: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput 
              style={styles.input}
              placeholder="********"
              placeholderTextColor={colors.secondary}
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.saveButton} activeOpacity={0.8}>
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.primary} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
        
        {/* Espaçador para a barra de navegação não cobrir o final da tela */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}