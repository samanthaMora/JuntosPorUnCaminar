import { useLocalSearchParams } from 'expo-router';

import { AuthCard } from '@/components/AuthCard';

export default function SignIn() {
  const { next, rol } = useLocalSearchParams<{ next?: string; rol?: string }>();
  return <AuthCard initialMode="signin" initialRole={rol === 'doctor' ? 'doctor' : 'patient'} next={next} />;
}
