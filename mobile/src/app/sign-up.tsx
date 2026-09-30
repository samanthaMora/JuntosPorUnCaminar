import { useLocalSearchParams } from 'expo-router';

import { AuthCard } from '@/components/AuthCard';

export default function SignUp() {
  const { next, rol } = useLocalSearchParams<{ next?: string; rol?: string }>();
  return <AuthCard initialMode="signup" initialRole={rol === 'doctor' ? 'doctor' : 'patient'} next={next} />;
}
