# Qup

A WhatsApp virtual queue for clinics. Patients join a queue by chatting with a
WhatsApp number, get a ticket and estimated time, and are alerted when their
turn is close. Clinic staff run the queue from a live dashboard.

## Stack
- Backend: Node.js, Express, TypeScript
- Database, auth and realtime: Supabase (Postgres)
- Staff dashboard: React + Vite
- WhatsApp: Twilio sandbox (Meta Cloud API support planned)

## Run locally
1. Copy `.env.example` to `.env` and fill in the values.
2. Copy `apps/admin/.env.example` to `apps/admin/.env.local`.
3. Backend: `cd apps/backend && npm install && npm run dev`
4. Dashboard: `cd apps/admin && npm install && npm run dev`
5. For WhatsApp testing, expose the backend with `ngrok http 3000`.

## Privacy
Qup stores only a name, a phone number and a general reason for the visit.
No medical details are collected in chat.