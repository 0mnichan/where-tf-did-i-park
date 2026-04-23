# where tf did i park

A mobile-first PWA that helps you find your parked bike/scooter in a massive open parking ground using GPS + compass + camera AR.

## Setup

### 1. Clone

```bash
git clone https://github.com/0mnichan/where-tf-did-i-park.git
cd where-tf-did-i-park
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the SQL editor, paste and run the entire contents of `supabase/schema.sql`.
3. In **Storage**, create a new bucket called `parking-photos`. Set it to **Public**.
4. In **Authentication → Providers**, enable:
   - **Email** with "OTP" / "Magic Link" (disable email confirmation or use OTP flow)
   - **Google** (optional — requires Google OAuth credentials)

### 3. Set environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in **Supabase → Settings → API**.

### 4. Install and run

```bash
npm install
npm run dev
```

Open on your phone at the local network URL (e.g. `http://192.168.x.x:5173`).

### 5. Deploy to Render

1. Push to GitHub.
2. Create a new **Static Site** on [render.com](https://render.com).
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Render settings.

## How it works

- **Save**: GPS locks your exact coordinates + compass heading. Optional photo capture for visual reference.
- **Find**: Live camera feed with an AR beacon drawn over it. The acid-green laser beam points directly at your vehicle. When you're within 10m it turns gold and says "YOU'RE HERE".
- **Auth**: Magic link OTP to your email — no passwords. Your spot lives in the cloud, survives phone wipes.

## Tech stack

React 18 + Vite + TypeScript + Tailwind CSS v3 + Supabase + vite-plugin-pwa + Framer Motion + Lucide React
