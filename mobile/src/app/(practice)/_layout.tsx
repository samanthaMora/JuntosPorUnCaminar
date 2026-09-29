import { Redirect, Tabs } from 'expo-router';
import { SignOutButton } from '@/components/SignOutButton';
import { TabIcon } from '@/components/TabIcon';
import { colors, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function PracticeLayout() {
  const { session, profile, loading } = useAuth();
  if (loading || (session && !profile)) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (profile!.role !== 'doctor') return <Redirect href="/" />;

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerRight: SignOutButton }}>
      <Tabs.Screen name="agenda" options={{ title: 'Mi agenda', tabBarIcon: () => <TabIcon emoji="📅" /> }} />
      <Tabs.Screen name="schedule" options={{ title: 'Horarios', tabBarIcon: () => <TabIcon emoji="⏰" /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Configuración', tabBarIcon: () => <TabIcon emoji="⚙️" /> }} />
    </Tabs>
  );
}
