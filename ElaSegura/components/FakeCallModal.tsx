import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useI18n } from '../context/I18nContext';
import { haptics } from '../lib/haptics';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Quando não informado, usa o nome traduzido padrão. */
  callerName?: string;
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const FakeCallModal = ({ visible, onClose, callerName }: Props) => {
  const { t } = useI18n();
  const nomeExibido = callerName ?? t('chamadaFalsa.nomePadrao');
  const [status, setStatus] = useState<'ringing' | 'active'>('ringing');
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setStatus('ringing');
      setDuration(0);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [visible]);

  useEffect(() => {
    if (status === 'active') {
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status]);

  const handleAccept = () => {
    haptics.toque();
    setStatus('active');
  };

  const handleEnd = () => {
    haptics.toque();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleEnd}>
      <View style={styles.container}>
        <View style={styles.top}>
          <Text style={styles.callStatus}>
            {status === 'ringing' ? t('chamadaFalsa.recebendo') : formatDuration(duration)}
          </Text>
          <Text style={styles.callerName}>{nomeExibido}</Text>
          <Text style={styles.callerSub}>{t('chamadaFalsa.celular')}</Text>
        </View>

        <View style={styles.avatarCircle}>
          <MaterialIcons name="person" size={64} color="#FFFFFF" />
        </View>

        {status === 'ringing' ? (
          <View style={styles.actionsRow}>
            <View style={styles.actionColumn}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                activeOpacity={0.85}
                onPress={handleEnd}
                accessibilityRole="button"
                accessibilityLabel={t('chamadaFalsa.recusar')}
              >
                <MaterialIcons name="call-end" size={30} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>{t('chamadaFalsa.recusar')}</Text>
            </View>
            <View style={styles.actionColumn}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                activeOpacity={0.85}
                onPress={handleAccept}
                accessibilityRole="button"
                accessibilityLabel={t('chamadaFalsa.atender')}
              >
                <MaterialIcons name="call" size={30} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>{t('chamadaFalsa.atender')}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <View style={styles.actionColumn}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                activeOpacity={0.85}
                onPress={handleEnd}
                accessibilityRole="button"
                accessibilityLabel={t('chamadaFalsa.encerrar')}
              >
                <MaterialIcons name="call-end" size={30} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>{t('chamadaFalsa.encerrar')}</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
  },
  top: {
    alignItems: 'center',
  },
  callStatus: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    marginBottom: 10,
  },
  callerName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
  },
  callerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    marginTop: 4,
  },
  avatarCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
  },
  actionColumn: {
    alignItems: 'center',
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
});
