import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading || (session && !profile)) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  return <Redirect href={profile!.role === 'doctor' ? '/agenda' : '/search'} />;
}
