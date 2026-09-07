import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStyles } from '../styles/contatos.styles';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { Colors } from '../constants/theme';
import { haptics } from '../lib/haptics';
import { listarContatos, criarContato, atualizarContato, excluirContato } from '../services/contatos';
import { auth } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastNotification } from '../components/ToastNotification';
import { BackHomeButton } from '../components/BackHomeButton';

interface Contato {
  /** Id do documento no Firestore — string, não número. */
  id: string;
  name: string;
  phone: string;
  emergencial: boolean;
}

const CONTACT_COLORS = ['#F5A623', '#7C4DFF', '#2196F3', '#26A69A', '#EC407A', '#5C6BC0'];

/** Formato de referência mostrado no campo vazio. */
const TELEFONE_PLACEHOLDER = '(85) 99999-9999';

/** Tamanho de '(XX) XXXXX-XXXX' — o teto de caracteres do campo. */
const TELEFONE_MAX = TELEFONE_PLACEHOLDER.length;

/**
 * Aplica a máscara de telefone brasileiro: (XX) XXXXX-XXXX.
 *
 * Descarta tudo que não é dígito e para em 11 — DDD + celular com o nono
 * dígito. Antes o campo aceitava caracteres sem limite nenhum.
 *
 * Números já salvos com mais de 11 dígitos (com +55 na frente, por exemplo)
 * passam intactos: mascarar cortaria o começo e corromperia o contato ao
 * abrir a edição.
 */
const formatarTelefone = (texto: string) => {
  const digitos = texto.replace(/\D/g, '');

  if (digitos.length > 11) return texto;
  if (digitos.length === 0) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
};

/** Linha fixa de emergência pública — não é um contato da usuária. */
const DELEGACIA_TELEFONE = '180';

export default function Contatos() {
  const { isDarkMode, theme } = useTheme();
  const { t } = useI18n();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContato, setEditingContato] = useState<Contato | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencial, setEmergencial] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger'>('success');

  const showToast = async (message: string, type: 'success' | 'danger') => {
    try {
      const isEnabledVal = await AsyncStorage.getItem('@notifications_enabled');
      const notificationsEnabled = isEnabledVal === null ? true : isEnabledVal === 'true';
      if (notificationsEnabled) {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchContatos = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        router.replace('/login');
        return;
      }
      setContatos(await listarContatos());
    } catch (error: any) {
      console.error('Error fetching contatos:', error);
      Alert.alert(t('comum.erro'), error?.message ?? t('contatos.erroCarregar'));
    } finally {
      setLoading(false);
    }
    // t é estável dentro de um idioma; recriar o callback a cada render
    // dispararia o useFocusEffect em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarrega toda vez que a tela ganha foco, não só na montagem: ao voltar
  // da home o usuário precisa ver o que foi alterado em outro lugar.
  useFocusEffect(
    useCallback(() => {
      fetchContatos();
    }, [fetchContatos])
  );

  const handleSave = async () => {
    if (!name || !phone) {
      haptics.aviso();
      Alert.alert(t('comum.atencao'), t('contatos.preenchaCampos'));
      return;
    }
    haptics.acao();
    try {
      if (editingContato) {
        await atualizarContato(editingContato.id, { name, phone, emergencial });
        showToast(t('contatos.salvo'), 'success');
      } else {
        await criarContato(name, phone, emergencial);
        showToast(t('contatos.adicionado'), 'success');
      }
      haptics.sucesso();
      setModalVisible(false);
      resetForm();
      fetchContatos();
    } catch (error: any) {
      haptics.erro();
      Alert.alert(t('comum.erro'), error?.message ?? t('contatos.erroSalvar'));
    }
  };

  const handleDelete = (id: string) => {
    haptics.aviso();
    Alert.alert(t('contatos.confirmar'), t('contatos.excluirPergunta'), [
      { text: t('comum.cancelar'), style: 'cancel' },
      {
        text: t('comum.excluir'),
        style: 'destructive',
        onPress: async () => {
          try {
            await excluirContato(id);
            setModalVisible(false);
            haptics.sucesso();
            showToast(t('contatos.excluido'), 'danger');
            fetchContatos();
          } catch (error: any) {
            haptics.erro();
            Alert.alert(t('comum.erro'), error?.message ?? t('contatos.erroExcluir'));
          }
        },
      },
    ]);
  };

  const openEditModal = (contato: Contato) => {
    haptics.toque();
    setEditingContato(contato);
    setName(contato.name);
    // Contatos salvos antes da máscara aparecem já formatados na edição.
    setPhone(formatarTelefone(contato.phone));
    setEmergencial(contato.emergencial);
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingContato(null);
    setName('');
    setPhone('');
    setEmergencial(false);
  };

  const callContact = async (phoneNumber: string, contactName: string) => {
    haptics.acao();
    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch {
      haptics.erro();
      Alert.alert(
        t('contatos.naoFoiPossivelLigar'),
        t('contatos.ligueManualmente', { nome: contactName, telefone: phoneNumber })
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <BackHomeButton />
        <Text style={styles.headerTitle} accessibilityRole="header">
          {t('contatos.titulo')}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => {
            haptics.toque();
            resetForm();
            setModalVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.adicionarContato')}
        >
          <MaterialIcons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.headerSubtitle}>{t('contatos.subtitulo')}</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : contatos.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <MaterialIcons name="account-circle" size={100} color={isDarkMode ? colors.secondary : "#1A1A1A"} />
          <Text style={styles.emptyStateTitle}>{t('contatos.vazioTitulo')}</Text>
          <Text style={styles.emptyStateText}>{t('contatos.vazioTexto')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {contatos.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={styles.contactItem}
              activeOpacity={0.8}
              onPress={() => openEditModal(item)}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.editarContato', { nome: item.name })}
            >
              <View style={[styles.contactAvatar, { backgroundColor: CONTACT_COLORS[index % CONTACT_COLORS.length] }]}>
                <Text style={styles.contactAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.contactPhone}>{item.phone}</Text>
              </View>
              {item.emergencial && (
                <View style={styles.principalBadge}>
                  <Text style={styles.principalBadgeText}>{t('contatos.principal')}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.callButton}
                onPress={(e) => { e.stopPropagation(); callContact(item.phone, item.name); }}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.ligarPara', { nome: item.name })}
              >
                <MaterialIcons name="call" size={18} color="#2E7D32" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {/* Contato fixo de emergência pública */}
          <View style={styles.contactItem}>
            <View style={[styles.contactAvatar, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="shield-alert" size={20} color="#FFF" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName} numberOfLines={1}>{t('contatos.delegacia')}</Text>
              <Text style={styles.contactPhone}>{t('contatos.delegaciaSub')}</Text>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => callContact(DELEGACIA_TELEFONE, t('contatos.delegacia'))}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.ligarPara', { nome: t('contatos.delegacia') })}
            >
              <MaterialIcons name="call" size={18} color="#2E7D32" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle} accessibilityRole="header">
              {editingContato ? t('contatos.editarContato') : t('contatos.novoContato')}
            </Text>

            <View style={styles.inputField}>
              <MaterialCommunityIcons name="account-outline" size={18} color={colors.primary} style={styles.inputFieldIcon} />
              <TextInput
                style={styles.inputFieldText}
                placeholder={t('contatos.nomeContato')}
                placeholderTextColor={colors.secondary}
                value={name}
                onChangeText={setName}
                accessibilityLabel={t('contatos.nomeContato')}
              />
            </View>

            <View style={styles.inputField}>
              <MaterialCommunityIcons name="phone-outline" size={18} color={colors.primary} style={styles.inputFieldIcon} />
              <TextInput
                style={styles.inputFieldText}
                placeholder={TELEFONE_PLACEHOLDER}
                placeholderTextColor={colors.secondary}
                value={phone}
                onChangeText={(texto) => setPhone(formatarTelefone(texto))}
                keyboardType="phone-pad"
                maxLength={TELEFONE_MAX}
                accessibilityLabel={t('contatos.telefone')}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('contatos.contatoPrincipal')}</Text>
              <Switch
                value={emergencial}
                onValueChange={(v) => {
                  haptics.selecao();
                  setEmergencial(v);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFF'}
                accessibilityLabel={t('contatos.contatoPrincipal')}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('comum.cancelar')}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>{t('comum.cancelar')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                accessibilityRole="button"
                accessibilityLabel={t('comum.salvar')}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>{t('comum.salvar')}</Text>
              </TouchableOpacity>
            </View>

            {editingContato && (
              <TouchableOpacity
                style={styles.deleteLink}
                onPress={() => handleDelete(editingContato.id)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.excluirContato', { nome: editingContato.name })}
              >
                <MaterialIcons name="delete-outline" size={18} color="#E53935" />
                <Text style={styles.deleteLinkText}>{t('contatos.excluirContato')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}
