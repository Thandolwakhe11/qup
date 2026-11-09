import type { Express } from 'express';
import { handleMessage } from './bot.js';
import { supabase } from './supabase.js';

const SIM_PHONE = /^sim-[a-z0-9]{6,20}$/;
const hits = new Map<string, { count: number; reset: number }>();

// 30 messages per minute per visitor
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  h.count++;
  return h.count > 30;
}

export function mountSimulator(app: Express) {
  app.use('/simulate', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.post('/simulate', async (req, res) => {
    if (limited(req.ip ?? 'unknown')) {
      res.status(429).json({ error: 'Too many messages. Please wait a minute.' });
      return;
    }
    const phone = String(req.body?.phone ?? '');
    const message = String(req.body?.message ?? '').slice(0, 200);
    if (!SIM_PHONE.test(phone) || !message.trim()) {
      res.status(400).json({ error: 'Bad request' });
      return;
    }
    try {
      res.json({ reply: await handleMessage(phone, message) });
    } catch (err) {
      console.error('Simulator error:', err);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  });

  app.get('/simulate/messages', async (req, res) => {
    const phone = String(req.query.phone ?? '');
    const after = Number(req.query.after ?? 0) || 0;
    if (!SIM_PHONE.test(phone)) {
      res.status(400).json({ error: 'Bad request' });
      return;
    }
    const { data } = await supabase
      .from('sim_outbox')
      .select('id, body')
      .eq('phone', phone)
      .gt('id', after)
      .order('id')
      .limit(20);
    res.json({ messages: data ?? [] });
  });
}