import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

export function TabIcon({ name, color }: { name: ComponentProps<typeof Feather>['name']; color: ColorValue }) {
  return <Feather name={name} size={20} color={color} />;
}
