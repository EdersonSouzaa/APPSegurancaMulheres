import React from 'react';
import { View, Text, TouchableOpacity, Modal, Linking, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import { EMERGENCY_NUMBERS, DEFAULT_EMERGENCY_NUMBER } from '../constants/emergencyNumbers';
import { useI18n } from '../context/I18nContext';
import { haptics } from '../lib/haptics';

type Props = {
  visible: boolean;
  onClose: () => void;
};

// Folha de ligação de emergência reutilizada na Home e no SOS 
export const EmergencyCallSheet = ({ visible, onClose }: Props) => {
  const { isDarkMode, theme } = useTheme();
  const { t } = useI18n();
  const colors = Colors[theme];

  const call = async (number: string) => {
    haptics.acao();
    try {
      await Linking.openURL(`tel:${number}`);
      onClose();
    } catch {
      haptics.erro();
      Alert.alert(t('emergencia.naoFoiPossivel'), t('emergencia.disqueManualmente', { numero: number }));
    }
  };

  const others = EMERGENCY_NUMBERS.filter((n) => !n.primary);
  const primary = DEFAULT_EMERGENCY_NUMBER;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 32,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.border,
                marginBottom: 16,
              }}
            />
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }} accessibilityRole="header">
              {t('emergencia.titulo')}
            </Text>
            <Text style={{ fontSize: 14, color: colors.secondary, textAlign: 'center', marginTop: 4 }}>
              {t('emergencia.subtitulo')}
            </Text>
          </View>

          {/* Ação principal (one-tap): 180 - Central da Mulher */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => call(primary.number)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.ligarPara', { nome: `${t(primary.chaveRotulo)}, ${primary.number}` })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: primary.color,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <MaterialCommunityIcons name={primary.icon} size={30} color="#FFFFFF" />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>{t(primary.chaveRotulo)}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                {t('emergencia.ligarPara', { numero: primary.number })}
              </Text>
            </View>
            <MaterialCommunityIcons name="phone" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.secondary, marginBottom: 8 }}>
            {t('emergencia.outrosServicos')}
          </Text>

          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
            {others.map((item) => (
              <TouchableOpacity
                key={item.number}
                activeOpacity={0.7}
                onPress={() => call(item.number)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.ligarPara', { nome: `${t(item.chaveRotulo)}, ${item.number}` })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: item.color + '22',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 14,
                  }}
                >
                  <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>{t(item.chaveRotulo)}</Text>
                  <Text style={{ color: colors.secondary, fontSize: 13 }}>{item.number}</Text>
                </View>
                <MaterialCommunityIcons name="phone-outline" size={22} color={colors.secondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.fecharModal')}
            style={{ marginTop: 20, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: colors.secondary, fontSize: 15, fontWeight: '600' }}>{t('comum.fechar')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default EmergencyCallSheet;
