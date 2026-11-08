import { supabase } from './supabase.js';
import { languagePrompt, t, type Lang } from './messages.js';

const TZ = 'Africa/Johannesburg';
const LANGS: Lang[] = ['en', 'zu', 'af'];
const LANES = ['general', 'chronic', 'baby'] as const;
const GREETINGS = ['HI', 'HELLO', 'HALLO', 'MENU', 'START', 'SAWUBONA', 'HELO'];

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const clock = (d: Date) =>
  d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

async function getSession(phone: string) {
  const { data } = await supabase.from('sessions').select('*').eq('phone', phone).maybeSingle();
  return data;
}

async function saveSession(phone: string, patch: Record<string, unknown>) {
  const { error } = await supabase
    .from('sessions')
    .upsert({ phone, ...patch, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function getClinics() {
  const { data, error } = await supabase
    .from('clinics')
    .select('id, code, name')
    .neq('status', 'closed')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

async function activeTicket(phone: string) {
  const { data } = await supabase
    .from('tickets')
    .select('*, clinics(code, name, avg_consult_minutes)')
    .eq('phone', phone)
    .eq('ticket_date', today())
    .in('status', ['waiting', 'alerted'])
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function aheadOf(ticket: { clinic_id: string; ticket_date: string; joined_at: string }) {
  const { count } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', ticket.clinic_id)
    .eq('ticket_date', ticket.ticket_date)
    .in('status', ['waiting', 'alerted'])
    .lt('joined_at', ticket.joined_at);
  return count ?? 0;
}

function timeWindow(ahead: number, avgMinutes: number) {
  const start = new Date(Date.now() + ahead * avgMinutes * 60_000);
  const end = new Date(start.getTime() + 15 * 60_000);
  return { from: clock(start), to: clock(end) };
}

async function createTicket(phone: string, clinicId: string, name: string, lang: Lang, lane: string) {
  const { data: clinic, error: clinicError } = await supabase
    .from('clinics')
    .select('code, avg_consult_minutes')
    .eq('id', clinicId)
    .single();
  if (clinicError) throw clinicError;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: last } = await supabase
      .from('tickets')
      .select('seq')
      .eq('clinic_id', clinicId)
      .eq('ticket_date', today())
      .order('seq', { ascending: false })
      .limit(1)
      .maybeSingle();

    const seq = (last?.seq ?? 0) + 1;
    const code = `${clinic.code}-${String(seq).padStart(3, '0')}`;

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        clinic_id: clinicId,
        ticket_date: today(),
        seq,
        code,
        patient_name: name,
        phone,
        lane,
        language: lang,
      })
      .select()
      .single();

    if (!error) return { ticket, avg: clinic.avg_consult_minutes as number };
    if (error.code !== '23505') throw error; // 23505 = two people got the same number, so retry
  }
  throw new Error('Could not create ticket');
}

export async function handleMessage(phone: string, raw: string): Promise<string> {
  const text = raw.trim();
  const cmd = text.toUpperCase();
  const session = await getSession(phone);
  const lang = (session?.language ?? 'en') as Lang;
  const m = t(lang);

  // Commands that work at any time
  if (cmd === 'STATUS' || cmd === 'CANCEL') {
    const ticket = await activeTicket(phone);
    if (!ticket) return m.noTicket;

    if (cmd === 'CANCEL') {
      await supabase.from('tickets').update({ status: 'cancelled' }).eq('id', ticket.id);
      await saveSession(phone, { step: 'done' });
      return m.cancelled;
    }
    const ahead = await aheadOf(ticket);
    const w = timeWindow(ahead, ticket.clinics.avg_consult_minutes);
    return m.status(ticket.code, ahead, w.from, w.to);
  }

  // Greeting: show status if already queued, otherwise start over
  if (!session || GREETINGS.includes(cmd)) {
    const ticket = await activeTicket(phone);
    if (ticket) {
      const ahead = await aheadOf(ticket);
      const w = timeWindow(ahead, ticket.clinics.avg_consult_minutes);
      return m.status(ticket.code, ahead, w.from, w.to);
    }
    await saveSession(phone, {
      step: 'language',
      clinic_id: null,
      patient_name: null,
      language: 'en',
    });
    return languagePrompt;
  }

  switch (session.step) {
    case 'language': {
      const pick = LANGS[Number(text) - 1];
      if (!pick) return languagePrompt;
      await saveSession(phone, { language: pick, step: 'clinic' });
      const clinics = await getClinics();
      const list = clinics.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
      return `${t(pick).chooseClinic}\n${list}\n\n${t(pick).consent}`;
    }

    case 'clinic': {
      const clinics = await getClinics();
      const pick = clinics[Number(text) - 1];
      if (!pick) return m.invalid;
      await saveSession(phone, { clinic_id: pick.id, step: 'name' });
      return m.askName;
    }

    case 'name': {
      const name = text.replace(/\s+/g, ' ').slice(0, 40);
      if (name.length < 2) return m.askName;
      await saveSession(phone, { patient_name: name, step: 'reason' });
      return m.askReason;
    }

    case 'reason': {
      const lane = LANES[Number(text) - 1];
      if (!lane) return m.invalid;
      const { ticket, avg } = await createTicket(
        phone,
        session.clinic_id,
        session.patient_name,
        lang,
        lane
      );
      await saveSession(phone, { step: 'done' });
      const ahead = await aheadOf(ticket);
      const w = timeWindow(ahead, avg);
      return m.ticket(session.patient_name, ticket.code, ahead, w.from, w.to);
    }

    default:
      return m.noTicket;
  }
}