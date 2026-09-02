# TOLK

TOLK is an AI Business English coach. You pick a real work situation, an AI plays the other person, and you practice the conversation out loud or in text. When you finish, a coach-style report shows what you did well and how to say it better next time.

## What you can practice

- **Workplace**: daily standups, status updates, 1-on-1s, asking for clarification, giving feedback.
- **Business**: client negotiations, sales meetings, project updates, budget discussions.
- **Career**: job interviews, salary negotiation, self-introductions, describing past projects.
- **Communication**: small talk, disagreeing politely, saying no, asking a teammate for help.

Each scenario defines your role, the AI's role, an objective, and target vocabulary. The AI stays in character and never corrects you mid-conversation; feedback comes at the end.

## Features

- **Voice or text practice** with push-to-talk, live captions, and replay of any AI response. Uses the browser's built-in speech engine or Deepgram STT/TTS.
- **Session feedback** scored across five dimensions: fluency, grammar, vocabulary, clarity, and professionalism, with concrete corrections that explain why the rewrite is better.
- **Dashboard and progress tracking** with skill trends, streaks, and a recommended next scenario based on your weakest skill.
- **Vocabulary bank** with definitions and real examples for every target word, plus a daily challenge to keep your streak going.
- **Bring your own key (BYOK)**: connect DeepSeek, OpenAI, Anthropic, Gemini, OpenRouter, Groq, or Together AI. Keys are validated and stored encrypted (AES-GCM) on the server and are never sent to or kept in the browser.
- **Google sign-in** so your keys and setup follow you across devices. Guest mode works without an account.

## Tech stack

- [React Router 7](https://reactrouter.com/) with server-side rendering
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) with a [D1](https://developers.cloudflare.com/d1/) database
- [Hono](https://hono.dev/) for the API layer (`/api/chat` relay, auth, key management)
- [Tailwind CSS 4](https://tailwindcss.com/) and [daisyUI 5](https://daisyui.com/)
- [Framer Motion](https://motion.dev/) for animation

## Getting started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

### Typegen

Generate types for your Cloudflare bindings in `wrangler.json`:

```bash
npm run typegen
```

### Building for production

```bash
npm run build
```

### Previewing the production build

```bash
npm run preview
```

## Configuration

The worker expects the following Cloudflare resources and secrets:

1. A D1 database bound as `tolk_db` (see `wrangler.json`).
2. Google OAuth credentials for sign-in:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
3. `KEY_STORE_MASTER`, the encryption master key used to encrypt stored provider API keys.

Apply the database migrations in `migrations/`:

```bash
npx wrangler d1 migrations apply tolk-db --local   # local development
npx wrangler d1 migrations apply tolk-db --remote  # production
```

## Deployment

```bash
npm run deploy
```

To upload a preview version and promote it after verification:

```bash
npx wrangler versions upload
npx wrangler versions deploy
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Create a production build |
| `npm run preview` | Build and preview locally |
| `npm run typegen` | Generate React Router and Cloudflare binding types |
| `npm run typecheck` | Typegen plus `tsc` across all configs |
| `npm run check` | Typecheck, build, and dry-run `wrangler deploy` |
| `npm run deploy` | Deploy to Cloudflare Workers |
