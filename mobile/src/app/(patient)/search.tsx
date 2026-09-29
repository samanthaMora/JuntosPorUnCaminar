import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Card, colors, Field, MAX_WIDTH, Muted } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type Result = {
  id: string;
  full_name: string;
  public_code: string;
  specialty: string;
  city: string;
  price_cents: number;
  currency: string;
};

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc('search_doctors', { p_query: query });
      setResults(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}
      data={results}
      keyExtractor={(d) => d.id}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <Field
            label="Nombre, especialidad, ciudad o código del doctor"
            placeholder="Ej. Pérez, pediatría o DRAPEREZ"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      }
      ListEmptyComponent={<Muted>No encontramos doctores con esa búsqueda.</Muted>}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: '/doctor/[code]', params: { code: item.public_code } })}>
          <Card>
            <Text style={{ fontSize: 17, fontWeight: '700' }}>{item.full_name}</Text>
            <Muted>
              {[item.specialty, item.city].filter(Boolean).join(' · ')}
            </Muted>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              {formatMoney(item.price_cents, item.currency)} por consulta
            </Text>
          </Card>
        </Pressable>
      )}
    />
  );
}
