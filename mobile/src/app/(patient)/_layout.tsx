import { Redirect, Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { AppNav, SIDEBAR_BREAKPOINT } from '@/components/AppNav';
import { TabIcon } from '@/components/TabIcon';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function PatientLayout() {
  const { session, profile, loading } = useAuth();
  const { width } = useWindowDimensions();
  if (loading || (session && !profile)) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (profile!.role !== 'patient') return <Redirect href="/" />;

  const wide = width >= SIDEBAR_BREAKPOINT;
  return (
    <Tabs
      tabBar={(props) => <AppNav {...props} variant={wide ? 'sidebar' : 'top'} />}
      screenOptions={{ headerShown: false, tabBarPosition: wide ? 'left' : 'top' }}
    >
      <Tabs.Screen name="search" options={{ title: 'Buscar', tabBarIcon: ({ color }) => <TabIcon name="search" color={color} /> }} />
      <Tabs.Screen name="appointments" options={{ title: 'Mis citas', tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Mi perfil', tabBarIcon: ({ color }) => <TabIcon name="user" color={color} /> }} />
    </Tabs>
  );
}
