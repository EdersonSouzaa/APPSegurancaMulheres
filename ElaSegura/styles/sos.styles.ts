import { StyleSheet, Platform } from 'react-native';
import { Fonts } from '../constants/globalFont';

export const getStyles = (isDarkMode: boolean, colors: any) => StyleSheet.create({
  // Botão SOS grande com brilho (usado na confirmação e no estado ativo)
  // O tamanho aqui precisa ser explicito. O maior filho e o sosGlowOuter, de
  // 230x230, mas ele e position:absolute e nao entra no calculo de layout —
  // sem width/height o wrapper media so os 160 do botao e o brilho vazava 35px
  // para cada lado, colidindo com o titulo acima e o status abaixo.
  sosGlowWrapper: {
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosGlowOuter: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: isDarkMode ? '#2D1619' : '#FCE4E8',
  },
  sosGlowInner: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: isDarkMode ? '#3D1A20' : '#F9D0D7',
  },
  sosGradientButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  sosPulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },

  // --- Tela inicial (pedido de ajuda) ---
  promptContainer: {
    flex: 1,
    backgroundColor: isDarkMode ? colors.background : '#FFECF4',
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 15 : 10,
    paddingBottom: 20,
  },
  promptHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promptTitleWrap: {
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 36,
  },
  promptTitle: {
    fontFamily: Fonts.display,
    fontSize: 25,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  promptSubtitle: {
    fontSize: 14,
    color: colors.secondary,
    lineHeight: 23,
  },
  // Mesmo caso do sosGlowWrapper: sem altura explicita o brilho de 230 vazava
  // para fora. As margens caem porque o proprio box agora reserva esse espaco.
  holdWrapper: {
    width: 230,
    height: 230,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  holdButtonText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  emergencyCallButtonWrapper: {
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#B71C1C',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  emergencyCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  emergencyCallIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyCallButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emergencyCallButtonSubtext: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  promptLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 28,
    gap: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  promptLocationIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: isDarkMode ? colors.accent : '#FFF0F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptLocationLabel: {
    fontSize: 12,
    color: colors.secondary,
    marginBottom: 5,
  },
  promptLocationValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },

  // --- Estados "sending" e "active" ---
  flowContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 15 : 10,
    paddingBottom: 10,
  },
  flowBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDarkMode ? colors.accent : '#FFF0F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flowHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  flowContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 24,
    paddingBottom: 36,
  },
  flowTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  flowSubtitle: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 36,
    paddingHorizontal: 12,
  },
  progressRingWrapper: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Halo que respira atrás do anel enquanto o alerta e enviado.
  sendingHalo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  progressCountdown: {
    fontSize: 44,
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 5,
  },

  // Lista de contatos notificados
  contactsList: {
    width: '100%',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  contactStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 5,
  },
  contactStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  contactStatusText: {
    fontSize: 12,
    color: colors.secondary,
  },
  contactCallButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Estado ativo: botão SOS grande
  activeSosWrapper: {
    marginTop: 4,
    marginBottom: 24,
  },
  activeSosButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  activeSosButtonSubtext: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  activeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  activeStatusText: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '600',
  },
  // Acao principal da tela ativa: card largo, em vez de um bloco de 1/3.
  activeActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  activeActionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: isDarkMode ? colors.accent : '#FFF0F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activeActionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  activeActionHint: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 3,
  },

  // Ligar para emergencia: mesmo peso visual do botao da tela inicial.
  activeEmergencyWrapper: {
    width: '100%',
    borderRadius: 20,
    marginTop: 4,
    marginBottom: 14,
    elevation: 6,
    shadowColor: '#B71C1C',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  activeEmergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
  },
  activeEmergencyIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activeEmergencyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  activeEmergencySubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 3,
  },

  // Cancelar o SOS. Era um link de texto cinza; virou botao de largura cheia,
  // porque alarme falso e comum e a saida precisa estar visivel.
  cancelSosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 20,
    paddingVertical: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  cancelSosButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
