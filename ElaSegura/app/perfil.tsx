import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStyles } from '../styles/perfil.styles';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export default function Perfil() {
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [userData, setUserData] = useState({ name: '', email: '', profile_picture: null as string | null });
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        const savedPassword = await AsyncStorage.getItem('userPassword');
        const savedToken = await AsyncStorage.getItem('userToken');
        if (savedToken) setToken(savedToken);
        
        if (savedUser) {
          const userObj = JSON.parse(savedUser);
          setUserData({ name: userObj.name, email: userObj.email, profile_picture: userObj.profile_picture || null });
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
        Alert.alert('Sucesso', 'Foto de perfil atualizada!');
      } catch (error) {
        console.error('Erro ao salvar foto:', error);
        Alert.alert('Erro', 'Não foi possível atualizar a foto.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
            <TouchableOpacity onPress={pickImage} style={styles.avatarBox} activeOpacity={0.8}>
              {userData.profile_picture ? (
                <Image source={{ uri: userData.profile_picture }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              ) : (
                <MaterialIcons name="person" size={50} color="#FFF" />
              )}
            </TouchableOpacity>
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
    </SafeAreaView>
  );
}