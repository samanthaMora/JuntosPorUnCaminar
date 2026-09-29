import { Text, View } from 'react-native';

import { colors } from './ui';

const toInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Selector de fecha del navegador. */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{label}</Text>
      <input
        type="date"
        value={toInput(value)}
        min={minimumDate ? toInput(minimumDate) : undefined}
        onChange={(e) => {
          const [y, m, d] = e.target.value.split('-').map(Number);
          if (y && m && d) onChange(new Date(y, m - 1, d));
        }}
        style={{
          alignSelf: 'flex-start',
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: 12,
          fontSize: 16,
          backgroundColor: colors.card,
          fontFamily: 'inherit',
        }}
      />
    </View>
  );
}
