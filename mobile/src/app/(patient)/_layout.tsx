import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { TabIcon } from '@/components/TabIcon';
import { colors, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fonts } from '@/lib/webFonts';

export default function PatientLayout() {
  const { session, profile, loading } = useAuth();
  if (loading || (session && !profile)) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (profile!.role !== 'patient') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: Platform.OS === 'web' ? 68 : undefined,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 12, fontFamily: fonts.sans },
      }}
    >
      <Tabs.Screen name="search" options={{ title: 'Buscar', tabBarIcon: ({ color }) => <TabIcon name="search" color={color} /> }} />
      <Tabs.Screen name="appointments" options={{ title: 'Mis citas', tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Mi perfil', tabBarIcon: ({ color }) => <TabIcon name="user" color={color} /> }} />
    </Tabs>
  );
}
