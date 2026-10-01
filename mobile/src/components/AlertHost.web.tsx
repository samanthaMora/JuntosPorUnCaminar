import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/ui';
import { setAlertHandler, type AlertRequest } from '@/lib/alert';
import { fonts } from '@/lib/webFonts';

/** Ventana de avisos con el diseño de la app (reemplaza la del navegador). */
export function AlertHost() {
  const [queue, setQueue] = useState<AlertRequest[]>([]);

  useEffect(() => {
    setAlertHandler((request) => setQueue((q) => [...q, request]));
    return () => setAlertHandler(null);
  }, []);

  const current = queue[0];
  if (!current) return null;

  const buttons = current.buttons?.length ? current.buttons : [{ text: 'Entendido' }];
  const destructive = buttons.some((b) => b.style === 'destructive');
  const failed = /^no |error|límite|no coincide|no encontramos|no corresponde/i.test(`${current.title} ${current.message ?? ''}`);
  const tone = destructive ? 'danger' : failed ? 'warning' : 'success';
  const icon = { danger: 'alert-triangle', warning: 'alert-circle', success: 'check' } as const;
  const tint = { danger: [colors.danger, '#FDECEA'], warning: ['#B7791F', '#FEF3D7'], success: ['#2F6B45', '#E3F1E7'] }[tone];

  function close(button?: (typeof buttons)[number]) {
    setQueue((q) => q.slice(1));
    button?.onPress?.();
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => close(buttons.find((b) => b.style === 'cancel'))}>
      <View style={styles.backdrop}>
        <View style={styles.card} role="alertdialog" aria-label={current.title}>
          <View style={[styles.icon, { backgroundColor: tint[1] }]}>
            <Feather name={icon[tone]} size={24} color={tint[0]} />
          </View>
          <Text style={styles.title}>{current.title}</Text>
          {!!current.message && <Text style={styles.message}>{current.message}</Text>}
          <View style={[styles.buttons, buttons.length > 2 && { flexDirection: 'column' }]}>
            {buttons.map((b, i) => {
              const cancel = b.style === 'cancel';
              const danger = b.style === 'destructive';
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  onPress={() => close(b)}
                  style={(state) => [
                    styles.button,
                    cancel ? styles.buttonCancel : { backgroundColor: danger ? colors.danger : colors.primary },
                    ((state as { hovered?: boolean }).hovered || state.pressed) && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.buttonText, { color: cancel ? colors.text : '#fff' }]}>{b.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,29,22,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    ...({ backdropFilter: 'blur(6px)' } as object),
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#2B1D16',
    shadowOpacity: 0.25,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
  },
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center', fontFamily: fonts.serif, letterSpacing: -0.3 },
  message: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', fontFamily: fonts.sans },
  buttons: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 12 },
  button: { flex: 1, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  buttonCancel: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontSize: 15, fontWeight: '700', fontFamily: fonts.sans },
});
