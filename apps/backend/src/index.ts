import './env.js';
import express from 'express';
import type { Request } from 'express';
import crypto from 'node:crypto';
import twilio from 'twilio';
import { handleMessage } from './bot.js';
import { startNotifier } from './notifier.js';
   import { mountSimulator } from './simulator.js';

type RawBodyRequest = Request & { rawBody?: Buffer };

const app = express();
   app.set('trust proxy', 1);

// Twilio sends form data
app.use(express.urlencoded({ extended: false }));

// Meta sends JSON; keep the raw body to verify its signature
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as RawBodyRequest).rawBody = buf;
    },
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'qup-backend' });
});


app.post('/twilio', async (req, res) => {
  const phone = String(req.body.From ?? '').replace('whatsapp:', '');
  const body = String(req.body.Body ?? '');
  const reply = new twilio.twiml.MessagingResponse();

  try {
    reply.message(await handleMessage(phone, body));
  } catch (err) {
    console.error('Bot error:', err);
    reply.message('Sorry, something went wrong. Please try again.');
  }

  res.type('text/xml').send(reply.toString());
});


app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(String(challenge));
    return;
  }
  res.sendStatus(403);
});

app.post('/webhook', (req, res) => {
  const secret = process.env.WHATSAPP_APP_SECRET;

  if (secret) {
    const signature = req.get('x-hub-signature-256') ?? '';
    const rawBody = (req as RawBodyRequest).rawBody ?? Buffer.alloc(0);
    const expected =
      'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.sendStatus(401);
      return;
    }
  }

  console.log('Incoming Meta webhook:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

   mountSimulator(app);
   
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Qup backend running on http://localhost:${port}`);
  startNotifier();
});