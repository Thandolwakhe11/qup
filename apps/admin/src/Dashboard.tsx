import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

type Ticket = {
  id: string;
  code: string;
  patient_name: string;
  lane: string;
  status: string;
  priority: boolean;
  joined_at: string;
};
type Clinic = { id: string; name: string; status: string };

const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
const minsSince = (iso: string) =>
  Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
const ok = (r: { error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
};

export default function Dashboard() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    const { data: c, error: ce } = await supabase
      .from('clinics')
      .select('id, name, status')
      .maybeSingle();
    if (ce || !c) {
      setError(ce?.message ?? 'No clinic is linked to this account.');
      return;
    }
    setClinic(c);

    const { data: t, error: te } = await supabase
      .from('tickets')
      .select('id, code, patient_name, lane, status, priority, joined_at')
      .eq('clinic_id', c.id)
      .eq('ticket_date', today())
      .in('status', ['waiting', 'alerted', 'called'])
      .order('priority', { ascending: false })
      .order('joined_at', { ascending: true });

    if (te) setError(te.message);
    else {
      setTickets(t ?? []);
      setError('');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clinicId = clinic?.id;
  useEffect(() => {
    if (!clinicId) return;
    const channel = supabase
      .channel('queue-' + clinicId)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `clinic_id=eq.${clinicId}` },
        () => load())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'clinics', filter: `id=eq.${clinicId}` },
        () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId, load]);

  
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  const current = tickets.find((t) => t.status === 'called');
  const waiting = tickets.filter((t) => t.status !== 'called');
  const paused = clinic?.status === 'paused';
  const avgWait = waiting.length
    ? Math.round(waiting.reduce((s, t) => s + minsSince(t.joined_at), 0) / waiting.length)
    : 0;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  const next = () =>
    run(async () => {
      if (current) {
        ok(await supabase.from('tickets').update({ status: 'served' }).eq('id', current.id));
      }
      const upcoming = waiting[0];
      if (upcoming) {
        ok(
          await supabase
            .from('tickets')
            .update({ status: 'called', called_at: new Date().toISOString() })
            .eq('id', upcoming.id)
        );
      }
    });

  const togglePause = () =>
    run(async () => {
      if (!clinic) return;
      ok(
        await supabase
          .from('clinics')
          .update({ status: paused ? 'open' : 'paused' })
          .eq('id', clinic.id)
      );
    });

  const cancelCurrent = () =>
    run(async () => {
      if (!current) return;
      if (!window.confirm(`Cancel ticket ${current.code}?`)) return;
      ok(await supabase.from('tickets').update({ status: 'cancelled' }).eq('id', current.id));
    });

  return (
    <>
      <div className="header">
        <div className="brand">QUp<small>Clinic Admin</small></div>
        <div className="header-right">
          <span className="clinic-name">{clinic?.name ?? ''}</span>
          <button onClick={() => supabase.auth.signOut()}>LOGOUT</button>
        </div>
      </div>

      <div className="wrap">
        {error && <div className="error">{error}</div>}
        {paused && <div className="paused">Queue is paused. Patients are not being called.</div>}

        <div className="now">
          <div className="label">NOW SERVING</div>
          {current ? (
            <div className="serving">
              <span className="code">{current.code}</span>
              <span>{current.patient_name} · {current.lane}</span>
            </div>
          ) : (
            <div className="serving muted">No one called yet</div>
          )}
        </div>

        <div className="actions">
          <button className="next" onClick={next} disabled={busy || paused || (!current && !waiting.length)}>
            NEXT →<small>Call Next Patient</small>
          </button>
          <button className="pause" onClick={togglePause} disabled={busy || !clinic}>
            {paused ? 'RESUME' : 'PAUSE'}<small>{paused ? 'Resume Queue' : 'Pause Queue'}</small>
          </button>
          <button className="cancel" onClick={cancelCurrent} disabled={busy || !current}>
            CANCEL<small>Cancel Current</small>
          </button>
        </div>

        <div className="card">
          <h2>Patient Queue — {waiting.length} Waiting</h2>
          <p className="sub">{clinic?.name} · {today()}</p>
          {waiting.length === 0 && <p className="muted">Nobody is waiting.</p>}
          {waiting.map((t) => (
            <div className="row" key={t.id}>
              <div className="who">
                <strong>{t.code} • {t.patient_name}</strong>
                <span>Waiting {minsSince(t.joined_at)} min</span>
              </div>
              <div className="lane">{t.lane}{t.priority ? ' · priority' : ''}</div>
              <span className="pill">{t.status === 'alerted' ? 'Alerted' : 'Waiting'}</span>
            </div>
          ))}
        </div>

        <div className="footer">
          <span>Total in Queue: {waiting.length} • Avg Wait: {avgWait} min</span>
          <span>Live updates: ON</span>
        </div>
      </div>
    </>
  );
}