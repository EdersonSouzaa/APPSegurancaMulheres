import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ChaveTraducao } from '../i18n';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type EmergencyNumber = {
  /**
   * Chave do nome do serviço, não o nome em si: a folha de emergência
   * acompanha o idioma do app como qualquer outra tela.
   */
  chaveRotulo: ChaveTraducao;
  number: string;
  icon: IconName;
  color: string;
  primary?: boolean;
};

export const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  { chaveRotulo: 'emergencia.numeros.centralMulher', number: '180', icon: 'human-female', color: '#9C27B0', primary: true },
  { chaveRotulo: 'emergencia.numeros.policiaMilitar', number: '190', icon: 'police-badge', color: '#1565C0' },
  { chaveRotulo: 'emergencia.numeros.policiaFederal', number: '194', icon: 'shield-star', color: '#2E7D32' },
  { chaveRotulo: 'emergencia.numeros.samu', number: '192', icon: 'ambulance', color: '#C62828' },
  { chaveRotulo: 'emergencia.numeros.bombeiros', number: '193', icon: 'fire-truck', color: '#EF6C00' },
];

// Número discado quando a usuária aciona a ação direta (one-tap).
export const DEFAULT_EMERGENCY_NUMBER =
  EMERGENCY_NUMBERS.find((n) => n.primary) ?? EMERGENCY_NUMBERS[0];
