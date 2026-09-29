import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { Alert } from '@/lib/alert';
import { AccountActions } from '@/components/AccountActions';
import { PayoutsCard } from '@/components/PayoutsCard';
import { Button, Card, colors, Field, Loading, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Doctor } from '@/lib/types';

type Form = {
  full_name: string;
  phone: string;
  public_code: string;
  specialty: string;
  city: string;
  address: string;
  bio: string;
  price: string;
  saved_price_cents: number;
  slot_minutes: string;
  change_cutoff_hours: string;
  is_published: boolean;
  license_number: string;
  license_verified: boolean;
};

export default function Settings() {
  const { session, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from('doctors')
      .select('*')
      .eq('id', session!.user.id)
      .single()
      .then(({ data }) => {
        const d = data as Doctor;
        setForm({
          full_name: profile?.full_name ?? '',
          phone: profile?.phone ?? '',
          public_code: d.public_code,
          specialty: d.specialty,
          city: d.city,
          address: d.address,
          bio: d.bio,
          price: String(d.price_cents / 100),
          saved_price_cents: d.price_cents,
          slot_minutes: String(d.slot_minutes),
          change_cutoff_hours: String(d.change_cutoff_hours),
          is_published: d.is_published,
          license_number: d.license_number,
          license_verified: !!d.license_verified_at,
        });
      });
  }, [session, profile]);

  if (!form) return <Loading />;
  const set = (key: keyof Form) => (value: string | boolean) => setForm({ ...form, [key]: value });

  async function save() {
    const price = Number(form!.price);
    const slot = Number(form!.slot_minutes);
    const cutoff = Number(form!.change_cutoff_hours);
    const code = form!.public_code.trim().toUpperCase();
    if (!(price >= 10)) return Alert.alert('El precio mínimo es $10 MXN');
    if (!Number.isInteger(slot) || slot < 10 || slot > 240) return Alert.alert('La duración debe ser de 10 a 240 minutos');
    if (!Number.isInteger(cutoff) || cutoff < 0 || cutoff > 720)
      return Alert.alert('El límite para cambios debe ser de 0 a 720 horas');
    if (!/^[A-Z0-9]{4,12}$/.test(code)) return Alert.alert('El código debe tener de 4 a 12 letras o números, sin espacios');
    const license = form!.license_number.trim();
    if (!/^(\d{7,8})?$/.test(license)) return Alert.alert('La cédula profesional debe tener 7 u 8 dígitos');

    setBusy(true);
    const [p, d] = await Promise.all([
      supabase.from('profiles').update({ full_name: form!.full_name.trim(), phone: form!.phone.trim() || null }).eq('id', session!.user.id),
      supabase
        .from('doctors')
        .update({
          public_code: code,
          specialty: form!.specialty.trim(),
          city: form!.city.trim(),
          address: form!.address.trim(),
          bio: form!.bio.trim(),
          price_cents: Math.round(price * 100),
          slot_minutes: slot,
          change_cutoff_hours: cutoff,
          is_published: form!.is_published,
          license_number: license,
        })
        .eq('id', session!.user.id),
    ]);
    setBusy(false);
    const error = p.error ?? d.error;
    if (error) {
      return Alert.alert('No se pudo guardar', error.code === '23505' ? 'Ese código ya lo usa otro doctor.' : error.message);
    }
    await refreshProfile();
    Alert.alert('Guardado');
  }

  return (
    <Screen>
      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Perfil público</Text>
        <Field label="Nombre" value={form.full_name} onChangeText={set('full_name')} />
        <Field label="Especialidad" value={form.specialty} onChangeText={set('specialty')} placeholder="Pediatría" />
        <Field label="Ciudad" value={form.city} onChangeText={set('city')} placeholder="Guadalajara" />
        <Field label="Dirección del consultorio" value={form.address} onChangeText={set('address')} />
        <Field label="Teléfono" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <Field label="Sobre mí" value={form.bio} onChangeText={set('bio')} multiline />
        <Field
          label="Código para que te encuentren"
          value={form.public_code}
          onChangeText={set('public_code')}
          autoCapitalize="characters"
        />
      </Card>

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Citas y pagos</Text>
        <Field label="Precio de la consulta (MXN)" value={form.price} onChangeText={set('price')} keyboardType="decimal-pad" />
        <Field
          label="Duración de cada cita (minutos)"
          value={form.slot_minutes}
          onChangeText={set('slot_minutes')}
          keyboardType="number-pad"
        />
        <Field
          label="Horas antes de la cita en que ya no se puede cambiar ni cancelar"
          value={form.change_cutoff_hours}
          onChangeText={set('change_cutoff_hours')}
          keyboardType="number-pad"
        />
        <Muted>
          Ejemplo: con 24, un paciente con cita el viernes a las 10:00 puede cambiarla o cancelarla (con reembolso) hasta el
          jueves a las 10:00. Después de eso la cita queda fija.
        </Muted>
      </Card>

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Cédula profesional</Text>
        <Field
          label="Número de cédula (SEP)"
          value={form.license_number}
          onChangeText={set('license_number')}
          keyboardType="number-pad"
          maxLength={8}
        />
        {form.license_verified ? (
          <Text style={{ color: colors.primary, fontWeight: '600' }}>✓ Cédula verificada</Text>
        ) : (
          <Muted>
            {form.license_number
              ? 'En revisión: la validamos en el Registro Nacional de Profesionistas. Si la cambias, se vuelve a revisar.'
              : 'Obligatoria para aparecer en búsquedas. La validamos en el Registro Nacional de Profesionistas.'}
          </Muted>
        )}
      </Card>

      <PayoutsCard priceCents={form.saved_price_cents} />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '700', fontSize: 16 }}>Aparecer en búsquedas</Text>
          <Switch
            value={form.is_published}
            onValueChange={set('is_published')}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <Muted>Los pacientes solo pueden encontrarte y agendar si esto está encendido, tu cédula está verificada y tus cobros están configurados.</Muted>
      </Card>

      <Button title="Guardar" onPress={save} loading={busy} />

      <AccountActions />
    </Screen>
  );
}
