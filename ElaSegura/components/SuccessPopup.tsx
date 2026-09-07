import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // Para um efeito mais premium se disponível
import { useI18n } from '../context/I18nContext';

interface SuccessPopupProps {
  visible: boolean;
  onContinue: () => void;
  title?: string;
  message?: string;
  /** Nome do ícone do MaterialIcons exibido no círculo. Padrão: "check". */
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Cor do círculo do ícone e da sombra. Padrão: rosa da marca. */
  accentColor?: string;
  continueLabel?: string;
}

export const SuccessPopup = ({
  visible,
  onContinue,
  title,
  message,
  icon = "check",
  accentColor = "#F35F74",
  continueLabel,
}: SuccessPopupProps) => {
  // Os padrões vêm do dicionário, e não de literais nos parâmetros: assim
  // um popup aberto sem título não volta a falar português num app em inglês.
  const { t } = useI18n();
  const tituloExibido = title ?? t('popup.sucessoTitulo');
  const mensagemExibida = message ?? t('popup.sucessoTexto');
  const rotuloBotao = continueLabel ?? t('comum.continuar');

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
            <View style={[styles.iconCircle, { backgroundColor: accentColor, shadowColor: accentColor }]}>
              <MaterialIcons name={icon} size={50} color="#FFF" />
            </View>
          </View>

          <Text style={styles.title} accessibilityRole="header">
            {tituloExibido}
          </Text>
          <Text style={styles.message}>{mensagemExibida}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel={rotuloBotao}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{rotuloBotao}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
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
