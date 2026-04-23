import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { styles } from '../styles/ocorrencias.styles';

export default function Ocorrencias() {
  // O mesmo mock de dados, pronto para receber mais itens no futuro
  const mockOcorrencias = [
    { id: 1, title: 'Roubo', desc: 'Pegaram meu celular na esquina', time: '10 Abril, 10:59', type: 'error' },
    { id: 2, title: 'Assédio', desc: 'Assoviaram para mim', time: '15 Abril, 11:30', type: 'error' },
    { id: 3, title: 'Insegurança', desc: 'Rua muito escura e sem policiamento', time: '16 Abril, 20:15', type: 'warning' },
    { id: 4, title: 'Tentativa de Furto', desc: 'Tentaram puxar minha bolsa', time: '18 Abril, 08:45', type: 'error' },
    { id: 5, title: 'Assédio Verbal', desc: 'Comentários ofensivos no ônibus', time: '20 Abril, 14:20', type: 'error' },
    { id: 6, title: 'Suspeita', desc: 'Carro seguindo lentamente', time: '21 Abril, 19:00', type: 'warning' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Cabeçalho com botão de voltar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={{ marginRight: 15 }} 
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Ocorrências Gerais</Text>
          <Text style={styles.headerSubtitle}>Histórico de alertas na região</Text>
        </View>
      </View>

      {/* Botão Registrar Ocorrência */}
      <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
        <Text style={styles.addButtonText}>+ Registrar ocorrência</Text>
      </TouchableOpacity>

      {/* Lista de Ocorrências */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
        {mockOcorrencias.map((item) => (
          <View key={item.id} style={styles.occurrenceCard}>
            <View style={styles.occurrenceIconBox}>
              <MaterialIcons name={item.type === 'error' ? "error" : "warning"} size={30} color="#F35F74" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.occurrenceTitle}>{item.title}</Text>
              <Text style={styles.occurrenceDescription}>{item.desc}</Text>
              <Text style={styles.occurrenceTime}>{item.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}