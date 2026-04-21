import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from '../styles/perfil.styles';
import { router } from 'expo-router';

export default function Perfil() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={{ position: 'absolute', left: 20, top: 40, zIndex: 1 }} 
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={28} color="#1A1A1A" />
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
              placeholderTextColor="#9C97AC"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput 
              style={styles.input}
              placeholder="85999999999"
              placeholderTextColor="#9C97AC"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endereço</Text>
            <TextInput 
              style={styles.input}
              placeholder="Seu Endereço"
              placeholderTextColor="#9C97AC"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} activeOpacity={0.8}>
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7}>
            <MaterialCommunityIcons name="logout" size={20} color="#F35F74" />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
        
        {/* Espaçador para a barra de navegação não cobrir o final da tela */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}