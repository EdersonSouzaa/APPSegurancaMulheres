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

export default function Perfil() {
  const { isDarkMode, theme } = useTheme();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={{ position: 'absolute', left: 20, top: 40, zIndex: 1 }} 
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBox}>
              <MaterialIcons name="person" size={50} color="#FFF" />
            </View>
            <Text style={styles.userName}>Nome</Text>
            <Text style={styles.userEmail}>seu@email.com</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Informações de perfil</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput 
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={colors.secondary}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput 
              style={styles.input}
              placeholder="85999999999"
              placeholderTextColor={colors.secondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endereço</Text>
            <TextInput 
              style={styles.input}
              placeholder="Seu Endereço"
              placeholderTextColor={colors.secondary}
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