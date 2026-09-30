import { Redirect, Tabs } from 'expo-router';
import { SignOutButton } from '@/components/SignOutButton';
import { TabIcon } from '@/components/TabIcon';
import { colors, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function PatientLayout() {
  const { session, profile, loading } = useAuth();
  if (loading || (session && !profile)) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (profile!.role !== 'patient') return <Redirect href="/" />;

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerRight: SignOutButton }}>
      <Tabs.Screen name="search" options={{ title: 'Buscar doctor', tabBarIcon: ({ color }) => <TabIcon name="search" color={color} /> }} />
      <Tabs.Screen name="appointments" options={{ title: 'Mis citas', tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Mi perfil', tabBarIcon: ({ color }) => <TabIcon name="user" color={color} /> }} />
    </Tabs>
  );
}
