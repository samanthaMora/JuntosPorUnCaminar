import { Redirect, Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { AppNav, SIDEBAR_BREAKPOINT } from '@/components/AppNav';
import { TabIcon } from '@/components/TabIcon';
import { colors, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fonts } from '@/lib/webFonts';

export default function PracticeLayout() {
  const { session, profile, loading } = useAuth();
  const { width } = useWindowDimensions();
  if (loading || (session && !profile)) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (profile!.role !== 'doctor') return <Redirect href="/" />;

  const wide = width >= SIDEBAR_BREAKPOINT;
  return (
    <Tabs
      tabBar={(props) => <AppNav {...props} variant={wide ? 'sidebar' : 'top'} />}
      screenOptions={{
        tabBarPosition: wide ? 'left' : 'top',
        // En el teléfono las pestañas de arriba ya dicen dónde estás.
        headerShown: wide,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.serif, fontSize: 24, fontWeight: '700', color: colors.text },
      }}
    >
      <Tabs.Screen name="agenda" options={{ title: 'Mi agenda', tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} /> }} />
      <Tabs.Screen name="schedule" options={{ title: 'Horarios', tabBarIcon: ({ color }) => <TabIcon name="clock" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} /> }} />
    </Tabs>
  );
}
