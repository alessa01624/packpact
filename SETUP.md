# PackPact — Setup Guide

## 1. Installa Node.js
Scarica e installa da: https://nodejs.org (versione LTS)

## 2. Installa dipendenze
```bash
cd Desktop/packpact
npm install
```

## 3. Crea il progetto Supabase
1. Vai su https://supabase.com → New project
2. Copia **Project URL** e **anon key** dalle Settings → API
3. Copia il file `.env.local.example` in `.env.local` e incolla le chiavi

## 4. Esegui il database
1. Vai su Supabase → SQL Editor
2. Copia e incolla tutto il contenuto di `supabase/migrations/001_initial.sql`
3. Clicca **Run**

## 5. Configura Google OAuth
1. Supabase → Authentication → Providers → Google → Enable
2. Crea credenziali su https://console.cloud.google.com
3. Aggiungi redirect URL: `https://[tuo-progetto].supabase.co/auth/v1/callback`

## 6. (Opzionale) Configura Apple OAuth
1. Supabase → Authentication → Providers → Apple → Enable
2. Serve Apple Developer account

## 7. Avvia il dev server
```bash
npm run dev
```
Apri http://localhost:3000

## 8. Deploy su Vercel
```bash
npm install -g vercel
vercel
```
Imposta le env vars su Vercel dashboard.

---

## Struttura app

| Route | Descrizione |
|-------|-------------|
| `/login` | Login con Google/Apple |
| `/create` | Crea nuovo viaggio |
| `/join/[token]` | Landing per invite link |
| `/trip/[id]` | Home viaggio — profilo gruppo, stato questionari |
| `/trip/[id]/questionnaire` | Questionario privato (budget, vibes, date, destinazioni) |
| `/trip/[id]/proposals` | Proposte alloggio + voto anonimo |
| `/trip/[id]/reveal` | Podio finale dopo deadline |

## Come funziona il reveal
- Il creatore del viaggio o un cron job chiama `POST /api/trips/[id]/reveal`
- La `phase` passa da `proposals` → `revealed`
- I voti diventano visibili a tutti (RLS si apre)
- La pagina `/reveal` mostra il podio animato 🥇🥈🥉

## Attivare il reveal automatico
Aggiungi un Vercel Cron in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/check-deadlines",
    "schedule": "0 * * * *"
  }]
}
```
E crea `app/api/cron/check-deadlines/route.ts` che interroga Supabase per trip con deadline scaduta e phase != 'revealed'.
