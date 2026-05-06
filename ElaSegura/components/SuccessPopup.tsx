import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // Para um efeito mais premium se disponível

interface SuccessPopupProps {
  visible: boolean;
  onContinue: () => void;
  title?: string;
  message?: string;
}

export const SuccessPopup = ({ 
  visible, 
  onContinue, 
  title = "Sucesso!", 
  message = "Ação realizada com sucesso!" 
}: SuccessPopupProps) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onContinue}
    >
      <BlurView intensity={20} style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="check" size={50} color="#FFF" />
            </View>
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={onContinue} 
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 35,
    paddingVertical: 40,
    paddingHorizontal: 30,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#F35F74',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  iconContainer: {
    marginBottom: 25,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F35F74',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#F35F74',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#6A6A75',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#1A1A1A', // Preto para contraste premium ou o Rosa padrão
    paddingVertical: 18,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
