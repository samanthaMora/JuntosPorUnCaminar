import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/patient';
import { colors } from '@/components/ui';
import { signOut, useAuth } from '@/lib/auth';
import { fonts } from '@/lib/webFonts';

/** Ancho a partir del cual el menú va a un lado en lugar de arriba. */
export const SIDEBAR_BREAKPOINT = 900;

type Props = BottomTabBarProps & { variant: 'sidebar' | 'top' };

/** Menú principal: barra lateral en pantallas grandes y barra superior en el teléfono. */
export function AppNav({ state, descriptors, navigation, variant }: Props) {
  const { profile, session } = useAuth();
  const insets = useSafeAreaInsets();

  const items = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const label = typeof options.title === 'string' ? options.title : route.name;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };
    return { key: route.key, label, focused, onPress, icon: options.tabBarIcon };
  });

  if (variant === 'sidebar') {
    return (
      <View style={styles.sidebar}>
        <View style={{ gap: 32 }}>
          <Wordmark />
          <View style={{ gap: 4 }}>
            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                aria-current={item.focused ? 'page' : undefined}
                style={(state) => [
                  styles.sideItem,
                  (state as { hovered?: boolean }).hovered && !item.focused && { backgroundColor: colors.background },
                  item.focused && styles.sideItemOn,
                ]}
              >
                {item.icon?.({ focused: item.focused, color: item.focused ? colors.primary : colors.muted, size: 20 })}
                <Text style={[styles.sideLabel, item.focused && { color: colors.primary }]}>{item.label}</Text>
                {item.focused && <View style={styles.sideMarker} />}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.userCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={profile?.full_name ?? '?'} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {profile?.full_name}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {session?.user.email}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={signOut}
            style={(state) => [styles.signOut, (state as { hovered?: boolean }).hovered && { backgroundColor: colors.primaryLight }]}
          >
            <Feather name="log-out" size={16} color={colors.primary} />
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
      <View style={styles.topRow}>
        <Wordmark />
        <Pressable onPress={signOut} hitSlop={8} style={styles.topSignOut} aria-label="Cerrar sesión">
          <Feather name="log-out" size={18} color={colors.muted} />
        </Pressable>
      </View>
      <View style={styles.tabs}>
        {items.map((item) => (
          <Pressable key={item.key} onPress={item.onPress} style={[styles.tab, item.focused && styles.tabOn]}>
            {item.icon?.({ focused: item.focused, color: item.focused ? '#fff' : colors.muted, size: 18 })}
            <Text style={[styles.tabLabel, item.focused && { color: '#fff' }]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Wordmark() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={styles.dot} />
      <Text style={styles.wordmark}>
        good<Text style={{ color: colors.primary }}>dates</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 264,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 28,
    justifyContent: 'space-between',
  },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    ...(Platform.OS === 'web' ? ({ transitionDuration: '150ms' } as object) : null),
  },
  sideItemOn: { backgroundColor: colors.primaryLight },
  sideLabel: { fontSize: 16, fontWeight: '600', color: colors.text, fontFamily: fonts.sans, flex: 1 },
  sideMarker: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  userCard: { gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  userName: { fontSize: 15, fontWeight: '700', color: colors.text, fontFamily: fonts.sans },
  userEmail: { fontSize: 12, color: colors.muted, fontFamily: fonts.sans },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  signOutText: { color: colors.primary, fontWeight: '700', fontSize: 14, fontFamily: fonts.sans },
  top: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topSignOut: { padding: 8, borderRadius: 999, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: colors.background, borderRadius: 16, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  tabOn: { backgroundColor: colors.text },
  tabLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, fontFamily: fonts.sans },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  wordmark: { fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: fonts.serif, letterSpacing: -0.5 },
});
