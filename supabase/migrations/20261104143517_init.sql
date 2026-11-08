-- Types
create type lane_type as enum ('general', 'chronic', 'baby');
create type ticket_status as enum
  ('waiting', 'alerted', 'called', 'served', 'no_show', 'cancelled');

-- Clinics
create table clinics (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  status text not null default 'open'
    check (status in ('open', 'paused', 'closed')),
  avg_consult_minutes int not null default 9,
  created_at timestamptz default now()
);

-- Staff (linked to Supabase Auth users)
create table staff (
  user_id uuid primary key references auth.users on delete cascade,
  clinic_id uuid not null references clinics,
  role text not null default 'reception'
);

-- Tickets
create table tickets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics,
  ticket_date date not null default current_date,
  seq int not null,
  code text not null,
  patient_name text not null,
  phone text,
  lane lane_type not null,
  status ticket_status not null default 'waiting',
  priority boolean not null default false,
  language text not null default 'en',
  joined_at timestamptz default now(),
  called_at timestamptz,
  unique (clinic_id, ticket_date, seq)
);
create index on tickets (clinic_id, status, joined_at);

-- WhatsApp conversation state
create table sessions (
  phone text primary key,
  step text not null default 'language',
  clinic_id uuid references clinics,
  patient_name text,
  language text default 'en',
  updated_at timestamptz default now()
);

-- Message log (no message content, for privacy)
create table message_log (
  id bigint generated always as identity primary key,
  ticket_id uuid references tickets,
  type text not null,
  sent_at timestamptz default now()
);

-- Row Level Security: staff only see their own clinic
create function my_clinic_id() returns uuid
language sql stable security definer set search_path = public
as $$ select clinic_id from staff where user_id = auth.uid() $$;

alter table clinics enable row level security;
alter table staff enable row level security;
alter table tickets enable row level security;
alter table sessions enable row level security;
alter table message_log enable row level security;

create policy "staff read own clinic" on clinics
  for select using (id = my_clinic_id());
create policy "staff update own clinic" on clinics
  for update using (id = my_clinic_id());
create policy "staff read self" on staff
  for select using (user_id = auth.uid());
create policy "staff read tickets" on tickets
  for select using (clinic_id = my_clinic_id());
create policy "staff update tickets" on tickets
  for update using (clinic_id = my_clinic_id());
create policy "staff insert walk-ins" on tickets
  for insert with check (clinic_id = my_clinic_id());



alter publication supabase_realtime add table tickets, clinics;


insert into clinics (code, name) values
  ('ADD', 'Addington Hospital'),
  ('RKK', 'RK Khan Hospital');