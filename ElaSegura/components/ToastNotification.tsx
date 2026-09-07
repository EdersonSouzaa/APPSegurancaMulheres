import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ToastNotificationProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'danger' | 'info';
  onClose: () => void;
}

export const ToastNotification = ({
  visible,
  message,
  type = 'success',
  onClose,
}: ToastNotificationProps) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 50, // 50px de distância do topo para evitar notch/statusBar
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide após 3 segundos
      const timer = setTimeout(() => {
        hideToast();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  const getThemeProps = () => {
    switch (type) {
      case 'danger':
        return {
          bg: '#FFEBEF',
          border: '#FFD2DC',
          iconColor: '#FF5252',
          iconName: 'trash-can-outline' as const,
        };
      case 'info':
        return {
          bg: '#E3F2FD',
          border: '#BBDEFB',
          iconColor: '#2196F3',
          iconName: 'information-outline' as const,
        };
      case 'success':
      default:
        return {
          bg: '#E8F5E9',
          border: '#C8E6C9',
          iconColor: '#4CAF50',
          iconName: 'check-circle-outline' as const,
        };
    }
  };

  const theme = getThemeProps();

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor: theme.bg,
          borderColor: theme.border,
        },
      ]}
    >
      <MaterialCommunityIcons name={theme.iconName} size={24} color={theme.iconColor} style={styles.icon} />
      <Text style={styles.messageText} accessibilityLiveRegion="polite" accessibilityRole="alert">
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  icon: {
    marginRight: 12,
  },
  messageText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});
