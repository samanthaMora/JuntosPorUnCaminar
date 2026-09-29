import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../ui';

// En web, Animated no tiene driver nativo.
export const nativeDriver = Platform.OS !== 'web';

/** Aparece deslizándose hacia arriba, con un retraso opcional. */
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 600,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start();
  }, [progress, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Palabra que va cambiando con un fundido. */
export function RotatingWord({ words, style }: { words: string[]; style: object }) {
  const [index, setIndex] = useState(0);
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: nativeDriver }).start(() => {
        setIndex((i) => (i + 1) % words.length);
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: nativeDriver }).start();
      });
    }, 2200);
    return () => clearInterval(timer);
  }, [opacity, words.length]);
  return <Animated.Text style={[style, { opacity }]}>{words[index]}</Animated.Text>;
}

/** Tarjeta que se eleva al pasar el mouse (web) o al tocarla. */
export function LiftCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      style={(state) => {
        const active = state.pressed || (state as { hovered?: boolean }).hovered;
        return [
          style,
          {
            transform: [{ translateY: active ? -6 : 0 }],
            shadowColor: '#7A3A1C',
            shadowOpacity: active ? 0.14 : 0.04,
            shadowRadius: active ? 24 : 8,
            shadowOffset: { width: 0, height: active ? 14 : 4 },
          },
          Platform.OS === 'web' && ({ transitionDuration: '200ms' } as object),
        ];
      }}
    >
      {children}
    </Pressable>
  );
}

/** Fila de etiquetas que se desplaza sin fin. */
export function Marquee({ items }: { items: string[] }) {
  const [width, setWidth] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!width) return;
    x.setValue(0);
    const loop = Animated.loop(
      Animated.timing(x, { toValue: -width, duration: width * 25, easing: Easing.linear, useNativeDriver: nativeDriver }),
    );
    loop.start();
    return () => loop.stop();
  }, [width, x]);

  const row = (hidden: boolean) => (
    <View
      style={{ flexDirection: 'row', gap: 12, paddingRight: 12 }}
      onLayout={hidden ? undefined : (e) => setWidth(e.nativeEvent.layout.width)}
      aria-hidden={hidden}
    >
      {items.map((item) => (
        <View
          key={item}
          style={{
            backgroundColor: colors.card,
            borderRadius: 999,
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>{item}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
        {row(false)}
        {row(true)}
      </Animated.View>
    </View>
  );
}

/** Pregunta que se abre y se cierra. */
export function Accordion({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const [turn] = useState(() => new Animated.Value(0));
  function toggle() {
    Animated.timing(turn, { toValue: open ? 0 : 1, duration: 200, useNativeDriver: nativeDriver }).start();
    setOpen(!open);
  }
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Pressable
        onPress={toggle}
        aria-expanded={open}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20 }}
      >
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.text }}>{question}</Text>
        <Animated.Text
          style={{
            fontSize: 24,
            color: colors.primary,
            transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
          }}
        >
          +
        </Animated.Text>
      </Pressable>
      {open && (
        <FadeIn>
          <Text style={{ fontSize: 16, lineHeight: 24, color: colors.muted, paddingBottom: 20, paddingRight: 40 }}>
            {answer}
          </Text>
        </FadeIn>
      )}
    </View>
  );
}
