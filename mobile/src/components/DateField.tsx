import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';

import { colors } from './ui';

/** Selector de fecha nativo (compacto en iOS, diálogo en Android). */
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
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          locale="es-MX"
          minimumDate={minimumDate}
          onChange={(_, date) => date && onChange(date)}
          style={{ alignSelf: 'flex-start' }}
        />
      ) : (
        <Pressable
          onPress={() =>
            DateTimePickerAndroid.open({
              value,
              mode: 'date',
              minimumDate,
              onChange: (event, date) => event.type === 'set' && date && onChange(date),
            })
          }
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.card }}
        >
          <Text style={{ fontSize: 16 }}>
            {new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(value)}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
