export type Role = 'doctor' | 'patient';

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  phone: string | null;
};

export type Doctor = {
  id: string;
  public_code: string;
  specialty: string;
  city: string;
  address: string;
  bio: string;
  price_cents: number;
  currency: string;
  slot_minutes: number;
  change_cutoff_hours: number;
  timezone: string;
  is_published: boolean;
  license_number: string;
  license_verified_at: string | null;
};

export type AppointmentStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'expired';

export type Appointment = {
  id: string;
  doctor_id: string;
  patient_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price_cents: number;
  currency: string;
  refunded_at: string | null;
};

export type Slot = { starts_at: string; ends_at: string };

export type AvailabilityRule = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type PayoutStatus = { details_submitted: boolean; ready: boolean };
