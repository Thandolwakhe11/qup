import './env.js';
import twilio from 'twilio';
import { supabase } from './supabase.js';
import { t, type Lang } from './messages.js';

const SOON_AHEAD = 2; 
const TZ = 'Africa/Johannesburg';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);


const wa = (num: string) => 'whatsapp:+' + num.replace(/\D/g, '');


async function sendOnce(
  ticket: { id: string; phone: string | null },
  type: string,
  body: string
) {
  if (!ticket.phone) return false;

  const { error } = await supabase
    .from('message_log')
    .insert({ ticket_id: ticket.id, type });
  if (error) {
    if (error.code !== '23505') console.error('Log error:', error.message);
    return false;
  }

  
  if (process.env.ALERT_MODE === 'log') {
    console.log(`[DRY RUN] "${type}" alert for ${ticket.phone}: ${body}`);
    return true;
  }

  const from = wa(process.env.TWILIO_WHATSAPP_NUMBER ?? '');
  const to = wa(ticket.phone);
  try {
    await client.messages.create({ from, to, body });
    console.log(`Sent "${type}" alert from ${from} to ${to}`);
    return true;
  } catch (err) {
    const e = err as { message?: string; code?: number };
    console.error(`WhatsApp send failed (from ${from} to ${to}) code ${e.code}: ${e.message}`);
    // Release the claim so a later check can try again
    await supabase.from('message_log').delete().eq('ticket_id', ticket.id).eq('type', type);
    return false;
  }
}

async function checkClinic(clinicId: string) {
  const { data: clinic } = await supabase
    .from('clinics')
    .select('status')
    .eq('id', clinicId)
    .single();

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, code, patient_name, phone, status, language, joined_at')
    .eq('clinic_id', clinicId)
    .eq('ticket_date', today())
    .in('status', ['waiting', 'alerted', 'called'])
    .order('priority', { ascending: false })
    .order('joined_at', { ascending: true });

  if (!clinic || !tickets) return;

  
  for (const tk of tickets.filter((x) => x.status === 'called')) {
    const m = t(tk.language as Lang);
    await sendOnce(tk, 'called', m.called(tk.patient_name, tk.code));
  }

  
  if (clinic.status !== 'open') return;
  const waiting = tickets.filter((x) => x.status !== 'called');

  for (let i = 0; i < waiting.length && i <= SOON_AHEAD; i++) {
    const tk = waiting[i];

    
   
    const isNew = Date.now() - new Date(tk.joined_at).getTime() < 120_000;
    if (isNew) continue;

    const m = t(tk.language as Lang);
    const sent = await sendOnce(tk, 'soon', m.soon(tk.patient_name, tk.code, i));
    if (sent && tk.status === 'waiting') {
      await supabase.from('tickets').update({ status: 'alerted' }).eq('id', tk.id);
    }
  }
}

const timers = new Map<string, NodeJS.Timeout>();

function schedule(clinicId: string) {
  clearTimeout(timers.get(clinicId));
  timers.set(
    clinicId,
    setTimeout(() => {
      checkClinic(clinicId).catch((e) => console.error('Notifier error:', e));
    }, 800)
  );
}

export function startNotifier() {
  console.log(`Alert mode: ${process.env.ALERT_MODE === 'log' ? 'DRY RUN (log only)' : 'LIVE (Twilio)'}`);

  supabase
    .channel('notifier')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
      const row = payload.new as { clinic_id?: string };
      if (row?.clinic_id) schedule(row.clinic_id);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clinics' }, (payload) => {
      const row = payload.new as { id?: string };
      if (row?.id) schedule(row.id);
    })
    .subscribe((status) => console.log('Notifier realtime:', status));

  
  setInterval(async () => {
    const { data } = await supabase.from('clinics').select('id').eq('status', 'open');
    data?.forEach((c) => schedule(c.id));
  }, 30_000);
}