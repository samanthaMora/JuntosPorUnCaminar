import { Pressable, Text } from 'react-native';

import { signOut } from '@/lib/auth';

import { colors } from './ui';

export function SignOutButton() {
  return (
    <Pressable onPress={signOut} style={{ paddingHorizontal: 16 }}>
      <Text style={{ color: colors.primary }}>Salir</Text>
    </Pressable>
  );
}
