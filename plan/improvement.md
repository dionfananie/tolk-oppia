# TOLK — Improvements

Decision log for UI and practice-page improvements. Order follows the session in which each was agreed.

## 1. HyperUI component conversion

Adopt HyperUI (https://hyperui.dev) component patterns across the app and landing page.

### Decisions
- **Pattern:** use HyperUI's copy-paste Tailwind markup (no library to install).
- **Palette:** map HyperUI defaults onto the TOLK token system (paper/ink/accent), not HyperUI's gray/indigo.
- **Scope:** all app pages + the marketing landing (`/`).
- **Dark mode:** ship a working light/dark toggle and carry over HyperUI `dark:` variants.

### Palette mapping
| HyperUI default | TOLK equivalent |
|---|---|
| `bg-white` / `text-gray-900` | `bg-paper` / `text-ink` |
| `bg-gray-100` / `bg-gray-200` (tracks) | `bg-surface` |
| `text-gray-700` / `-500` / `-400` | `text-ink-2` / `text-muted` / `text-meta` |
| `border-gray-100/200/300` | `border-line-soft` / `border-line` |
| `bg-indigo-600`, `bg-blue-600`, `focus:ring-blue-500` | `bg-accent`, `text-accent`, `focus:ring-accent` |
| `bg-green-*` / `bg-red-*` | `success` / `danger` tints |

Buttons switch from `rounded-full` pills to HyperUI `rounded-lg`.

### Dark mode strategy
- `app.css`: `@custom-variant dark (&:where(.dark, .dark *));` + `.dark { ... }` token overrides so token-based utilities flip automatically.
- Explicit `dark:` variants only for intentionally-dark elements (landing hero chapter, orb, mic) and subtle hover/shadow.
- `app/lib/theme.ts`: `useTheme()` hook; persists to `localStorage` (`tolk-oppia.theme`), defaults to `prefers-color-scheme`; toggles `.dark` on `<html>`.
- `root.tsx`: inline script in `<head>` sets the class before first paint (no flash).
- `ThemeToggle` in AppShell header, landing nav, and Settings (Appearance).

### Component mapping
- Rewrite to HyperUI markup + tokens + dark: `Switch` (Toggles), `Segmented` (Button Groups), `ChipGroup` (Filters), `Badge` (Badges), `SkillBar` (Progress Bars, add `role="progressbar"`), `ScoreRing` (Circular progress), `TypingIndicator` (Loaders).
- New shared: `Button.tsx`, `StatCard.tsx` (Stats), `EmptyState.tsx` (Empty States), `ThemeToggle.tsx`.
- `ProviderSetupForm` → Inputs + Selects + Radio Groups + Button Groups.
- Keep custom, restyled + dark: `Orb`, `ChatBubble`, `AuthShell`, `AppShell`, `icons`.
- No `@tailwindcss/forms`; inputs get explicit `border border-line` + focus ring (shared class string).

## 2. Practice conversation — voice + layout

### Voice CTA: "Click to Speak"
- Primary CTA on the conversation page is a labeled button: `Click to Speak` (mic icon + text), the largest control on screen.
- **Behavior:** tap to start listening (STT), tap again to stop and send (toggle). Active label flips to `Listening… tap to stop`; disabled while processing; tap while coach is speaking cancels TTS (barge-in) and starts listening.
- Browser without SpeechRecognition (Firefox): hide the button, show notice, text input remains.
- STT/TTS engine: browser Web Speech API (`SpeechRecognition` + `speechSynthesis`), wrapped in `app/lib/speech.ts` behind an adapter so Deepgram/cloud TTS can be added later.

### Layout: single column
- Header → stage (state label + pulsing AI orb + current caption) → **transcript below the orb** (scrolls, fixed height) → dock (`Click to Speak` / text input) fixed at bottom.
- Orb anchored at top (coach avatar); only the transcript scrolls; captions toggle hides it.

### Animation: Framer Motion speaking pulse
- Add `framer-motion` dependency.
- `Orb.tsx`: when `state === "speaking"`, continuous pulse on the circle core (`animate={{ scale: [1, 1.07, 1] }}`, `repeat: Infinity`), layered over the existing CSS ring-out pulses.
- Wrap in `<MotionConfig reducedMotion="user">` so `prefers-reduced-motion` is honored.

## Verification
- `npx react-router typegen && npx tsc -b`, `npm run build`.
- SSR smoke-test all routes; manual pass in light + dark (toggle persists, no token-inversion surprises, focus rings, contrast AA).
- Voice matrix: tap-to-start, tap-to-stop, barge-in, unsupported browser fallback.
