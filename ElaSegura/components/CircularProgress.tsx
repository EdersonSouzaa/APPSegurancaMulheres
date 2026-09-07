import React, { useEffect, useId, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const clamp = (value: number) => Math.max(0, Math.min(1, value));

type Props = {
  size: number;
  strokeWidth: number;
  /**
   * Alvo de 0 a 1. O anel SEMPRE parte do zero e desliza até aqui ao longo de
   * `duration` — é o que se espera de um carregamento. Antes o progresso vinha
   * cru de um contador de 1 em 1 segundo e o anel saltava em degraus.
   */
  progress: number;
  /** Quanto tempo o anel leva para chegar em `progress`. */
  duration?: number;
  color: string;
  /** Segunda cor do arco. Sem ela o arco sai sólido em `color`. */
  colorEnd?: string;
  trackColor: string;
  children?: React.ReactNode;
};

export const CircularProgress = ({
  size,
  strokeWidth,
  progress,
  duration = 400,
  color,
  colorEnd,
  trackColor,
  children,
}: Props) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // O useId devolve algo como ":r1:", e os dois-pontos quebram o url(#id) do SVG.
  const gradientId = `progressArc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // strokeDashoffset não é uma propriedade que o native driver saiba animar,
  // por isso useNativeDriver fica false aqui. É uma animação só, num valor só,
  // então roda tranquila na thread de JS.
  const arc = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(arc, {
      toValue: clamp(progress),
      duration,
      // Linear de propósito: o anel acompanha um cronômetro, então acelerar ou
      // frear deixaria ele fora de sincronia com os segundos na tela.
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [arc, progress, duration]);

  const strokeDashoffset = arc.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {colorEnd ? (
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={color} />
              <Stop offset="1" stopColor={colorEnd} />
            </LinearGradient>
          </Defs>
        ) : null}

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colorEnd ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      </View>
    </View>
  );
};
