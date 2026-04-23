import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from '../styles/contatos.styles';
import { router } from 'expo-router';

export default function Contatos() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Cabeçalho */}
     <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity 
          style={{ marginRight: 15 }} 
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <View>
            <Text style={styles.headerTitle}>Contatos de Confiança</Text>
            <Text style={styles.headerSubtitle}>Escolha contatos de confiança 💜</Text>
        </View>
     </View>   
      {/* Botão Adicionar */}
      <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
        <Text style={styles.addButtonText}>+ Adicionar contatos</Text>
      </TouchableOpacity>

      {/* Estado Vazio (Nenhum contato) */}
      <View style={styles.emptyStateContainer}>
        <MaterialIcons name="account-circle" size={100} color="#1A1A1A" />
        <Text style={styles.emptyStateTitle}>Nenhum contato adicionado</Text>
        <Text style={styles.emptyStateText}>
          Adicione contatos de confiança para enviar alertas
        </Text>
      </View>
    </View>
  );
}