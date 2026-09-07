import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '../context/I18nContext';
import { haptics } from '../lib/haptics';
import { lerDisfarce } from '../lib/preferencias';
import { auth } from '../services/firebase';

type Operador = '+' | '-' | '×' | '÷';

const TECLAS: { rotulo: string; tipo: 'digito' | 'operador' | 'acao' }[] = [
  { rotulo: 'C', tipo: 'acao' },
  { rotulo: '±', tipo: 'acao' },
  { rotulo: '%', tipo: 'acao' },
  { rotulo: '÷', tipo: 'operador' },
  { rotulo: '7', tipo: 'digito' },
  { rotulo: '8', tipo: 'digito' },
  { rotulo: '9', tipo: 'digito' },
  { rotulo: '×', tipo: 'operador' },
  { rotulo: '4', tipo: 'digito' },
  { rotulo: '5', tipo: 'digito' },
  { rotulo: '6', tipo: 'digito' },
  { rotulo: '-', tipo: 'operador' },
  { rotulo: '1', tipo: 'digito' },
  { rotulo: '2', tipo: 'digito' },
  { rotulo: '3', tipo: 'digito' },
  { rotulo: '+', tipo: 'operador' },
  { rotulo: '0', tipo: 'digito' },
  { rotulo: ',', tipo: 'digito' },
  { rotulo: '⌫', tipo: 'acao' },
  { rotulo: '=', tipo: 'operador' },
];

function calcular(a: number, b: number, operador: Operador): number {
  switch (operador) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? NaN : a / b;
  }
}

/**
 * Tela de disfarce: uma calculadora que funciona de verdade.
 *
 * Quando o modo disfarce está ligado, é isto que o app abre. Alguém que pegue
 * o telefone destravado vê uma calculadora comum, usa, e não encontra pista de
 * que existe um app de segurança embaixo. Digitar o PIN e tocar em = abre o
 * ElaSegura.
 *
 * A calculadora precisava ser real, não uma casca: uma que não calcula
 * denuncia o disfarce no primeiro toque de quem estiver desconfiado. Por isso
 * ela tem as operações completas, porcentagem, troca de sinal e apagar.
 *
 * Nada aqui indica erro quando o PIN está errado. O visor apenas mostra o
 * resultado da conta, como faria com qualquer outro número — reagir ao PIN
 * errado seria justamente revelar que existe um PIN.
 */
export default function Calculadora() {
  const router = useRouter();
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();

  const [visor, setVisor] = useState('0');
  const [acumulado, setAcumulado] = useState<number | null>(null);
  const [operador, setOperador] = useState<Operador | null>(null);
  const [aguardandoNovo, setAguardandoNovo] = useState(false);
  const [pinConfigurado, setPinConfigurado] = useState<string>('');

  // Guarda o que foi digitado desde o último "=" ou "C", sem os separadores:
  // é essa sequência que comparamos com o PIN.
  const digitadoRef = useRef('');
  const tremor = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    lerDisfarce().then((config) => setPinConfigurado(config.pin));
  }, []);

  const metricas = useMemo(() => {
    const lado = Math.min(width, height);
    return {
      tamanhoTecla: Math.max(58, Math.min((width - 24 * 2 - 12 * 3) / 4, 84)),
      fonteVisor: Math.max(44, Math.min(lado * 0.17, 76)),
    };
  }, [width, height]);

  const styles = useMemo(() => getStyles(metricas), [metricas]);

  const abrirApp = () => {
    haptics.sucesso();
    // Sem sessão ativa, a rota certa é a de login, não a home — que devolveria
    // a pessoa para uma tela sem dados.
    router.replace(auth.currentUser ? '/home' : '/login');
  };

  const limpar = () => {
    setVisor('0');
    setAcumulado(null);
    setOperador(null);
    setAguardandoNovo(false);
    digitadoRef.current = '';
  };

  const digitar = (rotulo: string) => {
    digitadoRef.current += rotulo === ',' ? '' : rotulo;

    if (rotulo === ',') {
      if (visor.includes(',')) return;
      setVisor(aguardandoNovo ? '0,' : visor + ',');
      setAguardandoNovo(false);
      return;
    }

    if (aguardandoNovo || visor === '0') {
      setVisor(rotulo);
      setAguardandoNovo(false);
      return;
    }

    if (visor.replace(/\D/g, '').length >= 12) return;
    setVisor(visor + rotulo);
  };

  const numeroDoVisor = () => Number(visor.replace(/\./g, '').replace(',', '.'));

  const formatar = (n: number) => {
    if (!Number.isFinite(n)) return '0';
    const texto = String(Math.round(n * 1e10) / 1e10);
    return texto.replace('.', ',');
  };

  const aplicarOperador = (novo: Operador) => {
    const atual = numeroDoVisor();

    if (operador != null && acumulado != null && !aguardandoNovo) {
      const resultado = calcular(acumulado, atual, operador);
      setAcumulado(resultado);
      setVisor(formatar(resultado));
    } else {
      setAcumulado(atual);
    }

    setOperador(novo);
    setAguardandoNovo(true);
  };

  const resolverIgual = () => {
    // A verificação do PIN acontece aqui, antes da conta: é o gesto que a
    // usuária conhece — digitar o código e apertar =.
    if (pinConfigurado && digitadoRef.current === pinConfigurado) {
      digitadoRef.current = '';
      abrirApp();
      return;
    }

    digitadoRef.current = '';

    if (operador == null || acumulado == null) return;

    const resultado = calcular(acumulado, numeroDoVisor(), operador);
    setVisor(formatar(resultado));
    setAcumulado(null);
    setOperador(null);
    setAguardandoNovo(true);
  };

  const apagarUm = () => {
    digitadoRef.current = digitadoRef.current.slice(0, -1);
    setVisor((atual) => (atual.length <= 1 ? '0' : atual.slice(0, -1)));
  };

  const trocarSinal = () => {
    setVisor((atual) => (atual.startsWith('-') ? atual.slice(1) : atual === '0' ? atual : '-' + atual));
  };

  const porcentagem = () => {
    setVisor(formatar(numeroDoVisor() / 100));
    setAguardandoNovo(true);
  };

  const aoTocar = (tecla: (typeof TECLAS)[number]) => {
    haptics.selecao();

    // Pequeno pulso no visor a cada toque: dá a resposta física que uma
    // calculadora de sistema tem, e reforça que a tela é o que aparenta ser.
    Animated.sequence([
      Animated.timing(tremor, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(tremor, { toValue: 0, duration: 90, useNativeDriver: true }),
    ]).start();

    switch (tecla.rotulo) {
      case 'C':
        limpar();
        return;
      case '⌫':
        apagarUm();
        return;
      case '±':
        trocarSinal();
        return;
      case '%':
        porcentagem();
        return;
      case '=':
        resolverIgual();
        return;
      case '+':
      case '-':
      case '×':
      case '÷':
        aplicarOperador(tecla.rotulo as Operador);
        return;
      default:
        digitar(tecla.rotulo);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.visorArea}>
        <Animated.Text
          style={[
            styles.visor,
            { transform: [{ scale: tremor.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }] },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={t('a11y.calculadoraVisor')}
          accessibilityLiveRegion="polite"
        >
          {visor}
        </Animated.Text>
      </View>

      <View style={styles.teclado}>
        {TECLAS.map((tecla) => {
          const ehOperador = tecla.tipo === 'operador';
          const ehAcao = tecla.tipo === 'acao';
          return (
            <TouchableOpacity
              key={tecla.rotulo}
              style={[
                styles.tecla,
                ehOperador && styles.teclaOperador,
                ehAcao && styles.teclaAcao,
              ]}
              activeOpacity={0.6}
              onPress={() => aoTocar(tecla)}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.calculadoraTecla', { tecla: tecla.rotulo })}
            >
              <Text
                style={[
                  styles.teclaTexto,
                  ehOperador && styles.teclaTextoOperador,
                  ehAcao && styles.teclaTextoAcao,
                ]}
              >
                {tecla.rotulo}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (metricas: { tamanhoTecla: number; fonteVisor: number }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000', justifyContent: 'flex-end' },
    visorArea: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      paddingHorizontal: 28,
      paddingBottom: 18,
    },
    visor: {
      color: '#FFFFFF',
      fontSize: metricas.fonteVisor,
      fontWeight: '300',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
    },
    teclado: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    tecla: {
      width: metricas.tamanhoTecla,
      height: metricas.tamanhoTecla,
      borderRadius: metricas.tamanhoTecla / 2,
      backgroundColor: '#333333',
      alignItems: 'center',
      justifyContent: 'center',
    },
    teclaOperador: { backgroundColor: '#FF9F0A' },
    teclaAcao: { backgroundColor: '#A5A5A5' },
    teclaTexto: {
      color: '#FFFFFF',
      fontSize: Math.round(metricas.tamanhoTecla * 0.42),
      fontWeight: '500',
    },
    teclaTextoOperador: { color: '#FFFFFF' },
    teclaTextoAcao: { color: '#000000' },
  });
