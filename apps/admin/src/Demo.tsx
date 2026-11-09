import { useEffect, useRef, useState } from 'react';

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

type Msg = { from: 'me' | 'bot'; text: string };

export default function Demo() {
  const [phone] = useState(() => 'sim-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const lastId = useRef(0);
  const started = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(message: string) {
    const m = message.trim();
    if (!m || busy) return;
    setMsgs((x) => [...x, { from: 'me', text: m }]);
    setText('');
    setBusy(true);
    try {
      const res = await fetch(`${API}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: m }),
      });
      const data = await res.json();
      setMsgs((x) => [...x, { from: 'bot', text: data.reply ?? data.error ?? 'No reply.' }]);
    } catch {
      setMsgs((x) => [
        ...x,
        { from: 'bot', text: 'The server is waking up. Please wait a minute and send again.' },
      ]);
    }
    setBusy(false);
  }

  // Say hello automatically once
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    send('Hi');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick up alerts sent by the notifier
  useEffect(() => {
    const i = setInterval(async () => {
      try {
        const res = await fetch(`${API}/simulate/messages?phone=${phone}&after=${lastId.current}`);
        const data = await res.json();
        const fresh = (data.messages ?? []) as { id: number; body: string }[];
        if (fresh.length) {
          lastId.current = fresh[fresh.length - 1].id;
          setMsgs((x) => [...x, ...fresh.map((f) => ({ from: 'bot' as const, text: f.body }))]);
        }
      } catch {
        /* try again on the next tick */
      }
    }, 4000);
    return () => clearInterval(i);
  }, [phone]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  return (
    <div className="sim">
      <div className="sim-head">
        <div className="sim-av">Q</div>
        <div>
          <strong>Qup demo</strong>
          <small>Simulated WhatsApp chat</small>
        </div>
      </div>
      <div className="sim-chat">
        {msgs.map((m, i) => (
          <div key={i} className={m.from === 'me' ? 'sim-u' : 'sim-b'}>{m.text}</div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="sim-chips">
        {['1', '2', '3', 'STATUS', 'CANCEL'].map((c) => (
          <button key={c} onClick={() => send(c)} disabled={busy}>{c}</button>
        ))}
      </div>
      <div className="sim-input">
        <input
          value={text}
          placeholder="Type a message"
          maxLength={200}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(text)}
        />
        <button onClick={() => send(text)} disabled={busy}>Send</button>
      </div>
    </div>
  );
}