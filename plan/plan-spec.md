# AI Business English Coach — Plan & Specification

## 1. Product Overview

AI Business English Coach adalah aplikasi untuk latihan **English conversation dalam konteks kerja dan bisnis** menggunakan AI.

Produk memiliki dua platform:

1. **Web App** — berjalan di browser dan di-deploy ke Cloudflare.
2. **Desktop App** — aplikasi Windows, macOS, dan Ubuntu/Linux dengan dukungan local STT/TTS.

Keduanya menggunakan **core conversation engine yang sama**, sehingga logic utama tidak perlu dibuat dua kali.

### Core Value

> Practice real-world professional English conversations with an AI coach.

Contoh use case:

- Daily standup
- Team meeting
- 1-on-1 dengan manager
- Client meeting
- Negotiation
- Presentation
- Job interview
- Salary negotiation
- Giving feedback
- Disagreeing politely
- Explaining technical problems
- Project status update
- Small talk with coworkers
- Asking for clarification

---

# 2. Product Goals

## Primary Goals

- Melatih speaking English untuk situasi profesional.
- Membuat conversation terasa seperti percakapan nyata.
- Memberikan feedback setelah conversation.
- Menilai grammar, vocabulary, fluency, clarity, dan professionalism.
- Mendukung voice conversation.
- Mendukung BYOK (Bring Your Own Key).
- Desktop mendukung local STT/TTS.
- Meminimalkan biaya AI infrastructure dari sisi developer.

## Non-Goals untuk MVP

- Social/community features.
- Marketplace tutor.
- Full language-learning curriculum seperti Duolingo.
- Custom LLM training.
- Complex gamification.
- Mobile native application.

---

# 3. Platform Strategy

## Platform A — Web App

Target:

> User yang ingin langsung menggunakan aplikasi tanpa install.

Architecture:

```text
Browser
   |
   v
React + Tailwind CSS
   |
   v
Cloudflare Worker
   |
   +---- Authentication / User Data
   +---- Scenario
   +---- Progress
   +---- History
   |
   +---- AI Providers
          |
          +---- DeepSeek (BYOK)
          +---- GLM (BYOK)
          +---- Deepgram STT
          +---- TTS Provider
```

### Web Characteristics

- No installation.
- Windows/macOS/Linux/mobile browser.
- Internet required.
- BYOK.
- Cloud STT/TTS.
- Cloudflare sebagai backend/orchestration dan persistence.

---

# 4. Platform B — Desktop App

Target:

> Power users yang membutuhkan local/private AI speech processing.

Target OS:

- Windows
- macOS
- Ubuntu/Linux

Recommended stack:

```text
Tauri 2
React
Tailwind CSS
Rust
```

Architecture:

```text
Desktop App
|
+-- React UI
|
+-- Tauri / Rust
|
+-- Local AI Runtime
|     |
|     +-- faster-whisper (STT)
|     +-- Kokoro (TTS)
|
+-- Cloud AI
      |
      +-- DeepSeek (BYOK)
      +-- GLM (BYOK)
```

Desktop mendukung dua mode speech:

### Cloud Mode

```text
Microphone
   |
   v
Deepgram STT
   |
   v
DeepSeek / GLM
   |
   v
Cloud TTS
   |
   v
Speaker
```

### Local Mode

```text
Microphone
   |
   v
faster-whisper
   |
   v
DeepSeek / GLM
   |
   v
Kokoro
   |
   v
Speaker
```

Jika LLM juga tersedia secara lokal di masa depan:

```text
Microphone
   |
   v
Whisper
   |
   v
Local LLM
   |
   v
Kokoro
   |
   v
Speaker
```

---

# 5. BYOK Strategy

User memasukkan API key miliknya sendiri.

Supported initial providers:

- DeepSeek
- GLM
- Deepgram
- TTS provider

Contoh settings:

```text
AI Providers

LLM
-------------------------
DeepSeek
API Key: **************

GLM
API Key: **************

Speech-to-Text
-------------------------
Cloud: Deepgram
Local: Whisper

Text-to-Speech
-------------------------
Cloud: Provider
Local: Kokoro
```

## Security Requirements

API key:

- Jangan disimpan plaintext di `localStorage`.
- Desktop gunakan OS credential storage / secure keychain.
- Web sebisa mungkin melakukan request langsung ke provider jika provider mendukung pola tersebut.
- Untuk provider yang membutuhkan server-side protection, gunakan Cloudflare Worker sebagai proxy.
- Jangan menyimpan API key user di database secara default.

---

# 6. Core Conversation Engine

Core engine harus platform-independent.

```text
Scenario
   |
   v
Conversation Context
   |
   v
Conversation Agent
   |
   v
AI Response
   |
   v
Conversation History
```

Conversation Agent memiliki:

```json
{
  "role": "Engineering Manager",
  "personality": "direct",
  "difficulty": "intermediate",
  "objective": "challenge the user's proposal",
  "rules": [
    "Stay in character",
    "Speak naturally",
    "Do not correct grammar during conversation",
    "Ask follow-up questions",
    "Adapt difficulty to user's English level"
  ]
}
```

AI harus tetap menjadi lawan bicara selama conversation.

Grammar correction tidak dilakukan setiap turn kecuali user meminta.

---

# 7. Scenario System

Scenario memiliki:

```text
id
title
category
difficulty
userRole
aiRole
objective
context
constraints
targetVocabulary
```

Contoh:

```json
{
  "title": "Weekly Engineering Meeting",
  "category": "workplace",
  "difficulty": "intermediate",
  "userRole": "Software Engineer",
  "aiRole": "Engineering Manager",
  "objective": "Explain why the project is delayed",
  "targetVocabulary": [
    "blocker",
    "deadline",
    "scope"
  ]
}
```

## Initial Categories

### Workplace

- Daily standup
- Weekly meeting
- 1-on-1
- Status update
- Asking clarification
- Giving feedback

### Business

- Negotiation
- Sales meeting
- Client meeting
- Budget discussion
- Partnership

### Career

- Job interview
- Salary negotiation
- Self introduction
- Explaining experience
- Discussing projects

### Professional Communication

- Small talk
- Disagreeing politely
- Saying no
- Handling conflict
- Asking for help

---

# 8. Conversation Session

Session flow:

```text
Choose Scenario
      |
      v
Start Session
      |
      v
AI opens conversation
      |
      v
User responds
      |
      v
AI responds
      |
      v
Repeat
      |
      v
End Session
      |
      v
Feedback Analysis
```

Session data:

```text
session_id
user_id
scenario_id
started_at
ended_at
duration
messages
score
feedback
```

---

# 9. Voice Architecture

## STT

Primary local engine:

> faster-whisper

Recommended initial model:

> Whisper Small

Benchmark against:

- Base
- Small
- Medium

Metrics:

- Word Error Rate (WER)
- Real-time factor
- Latency
- VRAM usage
- CPU usage

## Cloud STT

Primary candidate:

> Deepgram

Reasons:

- Streaming STT.
- Low latency.
- Designed for conversational use.
- Easy fallback when local inference is unavailable.

---

# 10. TTS Architecture

## Local TTS

Primary:

> Kokoro

Reasons:

- Small model.
- Open-weight.
- Good English voice quality.
- Suitable for local inference.
- Works well with GPU/CPU depending on runtime.

Fallback:

> Piper

Use Piper when:

- Hardware is weak.
- Very low resource usage is required.
- Voice quality requirements are lower.

## Cloud TTS

Primary candidate:

> Deepgram Aura / other low-cost TTS provider.

Provider must be abstracted so the implementation can change without changing conversation logic.

---

# 11. Provider Abstraction

Do not couple the core application to a specific AI provider.

## LLM

```typescript
interface LLMProvider {
  chat(input: ChatInput): Promise<ChatResponse>;
}
```

Implementations:

```text
DeepSeekProvider
GLMProvider
FutureProvider
```

## STT

```typescript
interface STTProvider {
  transcribe(
    audio: AudioStream
  ): AsyncIterable<Transcript>;
}
```

Implementations:

```text
FasterWhisperProvider
DeepgramProvider
```

## TTS

```typescript
interface TTSProvider {
  synthesize(
    text: string
  ): Promise<AudioStream>;
}
```

Implementations:

```text
KokoroProvider
PiperProvider
DeepgramTTSProvider
```

---

# 12. Feedback Engine

Feedback dilakukan setelah session.

Pipeline:

```text
Conversation History
       |
       v
Feedback Agent
       |
       +-- Grammar
       +-- Vocabulary
       +-- Fluency
       +-- Clarity
       +-- Professionalism
       +-- Naturalness
       |
       v
Structured Feedback
```

Example:

```json
{
  "overall": 78,
  "grammar": 72,
  "vocabulary": 80,
  "fluency": 82,
  "clarity": 81,
  "professionalism": 76,
  "corrections": [
    {
      "original": "we have some problem in API",
      "correction": "we're having some issues with the API",
      "explanation": "More natural business English."
    }
  ]
}
```

---

# 13. Feedback UX

Contoh:

```text
Overall Score
78 / 100

Fluency          82
Grammar          72
Vocabulary       80
Clarity          81
Professional     76
```

Kemudian:

```text
Your sentence

"I want to say that maybe this solution is not good."

Natural:

"I don't think this solution is ideal."

Professional:

"I have some concerns about this approach."
```

---

# 14. Pronunciation — Phase 2

Pronunciation tidak dianggap sama dengan STT.

STT hanya menjawab:

> Apa yang kemungkinan diucapkan user?

Pronunciation analysis menjawab:

> Seberapa baik user mengucapkannya?

Future metrics:

- Pronunciation accuracy.
- Mispronounced words.
- Speaking speed.
- Pauses.
- Filler words.
- Intonation.
- Stress.

Example:

```text
Pronunciation

development     82%
architecture    91%
repository      67%
environment     88%
```

---

# 15. Progress System

User memiliki profile:

```text
English Level: B1

Fluency       72
Grammar       81
Vocabulary    68
Listening     75
Pronunciation 70
Business      64
```

AI kemudian merekomendasikan practice berikutnya.

Example:

```text
Recommended Practice

1. Disagreeing politely
2. Giving project status
3. Explaining blockers
```

---

# 16. Daily Challenge

Setiap hari user mendapatkan satu challenge.

Example:

```text
Today's Challenge

Situation:
Your manager disagrees with your proposal.

Goal:
Defend your idea without sounding aggressive.

Duration:
5 minutes
```

Session menghasilkan score dan progress.

---

# 17. Vocabulary System

Vocabulary harus contextual.

Contoh untuk Software Engineer:

```text
blocker
deadline
deployment
rollback
technical debt
scalability
trade-off
stakeholder
requirement
scope
```

User dapat diberikan target vocabulary:

```text
Use these words in your response:

- blocker
- deadline
- scope
```

---

# 18. Suggested Tech Stack

## Web

```text
React
React Router
TypeScript
Tailwind CSS
Cloudflare Workers
Cloudflare D1
Cloudflare R2
```

## Desktop

```text
Tauri 2
React
TypeScript
Tailwind CSS
Rust
```

## AI

```text
LLM:
DeepSeek
GLM

Cloud STT:
Deepgram

Local STT:
faster-whisper

Cloud TTS:
Deepgram Aura / alternative

Local TTS:
Kokoro
Piper
```

## Monorepo

Recommended:

```text
pnpm
Turborepo
```

Structure:

```text
english-coach/
|
├── apps/
│   ├── web/
│   │   ├── React
│   │   └── Cloudflare Worker
│   │
│   └── desktop/
│       ├── React
│       └── Tauri
│
├── packages/
│   ├── core/
│   ├── ai/
│   ├── speech/
│   ├── scenarios/
│   ├── shared/
│   └── ui/
│
└── package.json
```

---

# 19. Web Infrastructure

Recommended Cloudflare architecture:

```text
                    Internet
                       |
                       v
              Cloudflare Edge
                       |
              ┌────────┴────────┐
              |                 |
              v                 v
           React UI       Cloudflare Worker
                                |
             ┌──────────────────┼──────────────────┐
             |                  |                  |
             v                  v                  v
             D1                 R2             AI Providers
          User data           Assets       DeepSeek / GLM /
          Sessions                          Deepgram
```

D1 stores:

- User profile.
- Scenario metadata.
- Sessions.
- Messages.
- Feedback.
- Progress.
- Vocabulary.

R2 stores:

- Audio assets if persistence is needed.
- Static learning assets.
- Future downloadable resources.

Avoid storing raw user audio permanently unless explicitly needed.

---

# 20. Desktop Local Runtime

Desktop target:

```text
Windows
Ubuntu/Linux
macOS
```

Local inference:

```text
                    Tauri
                      |
              ┌───────┴────────┐
              |                |
              v                v
       faster-whisper        Kokoro
            STT                 TTS
              |                |
              └───────┬────────┘
                      |
                      v
               DeepSeek / GLM
```

Hardware acceleration should be abstracted.

```text
NVIDIA
→ CUDA

Apple Silicon
→ Metal / compatible backend

CPU
→ fallback
```

Do not make CUDA a hard requirement for desktop.

---

# 21. Desktop Hardware Strategy

Initial development machine:

```text
RAM: 16 GB
GPU: RTX 3070 8 GB
```

Benchmark:

### STT

- faster-whisper base
- faster-whisper small
- faster-whisper medium

### TTS

- Kokoro GPU
- Kokoro CPU fallback

Record:

```text
VRAM
RAM
CPU
Latency
Real-time factor
Audio generation speed
```

Goal:

> Conversation response should feel close to realtime.

---

# 22. Cost Strategy

## Web

Developer cost is minimized through BYOK.

User supplies:

```text
DeepSeek key
GLM key
Deepgram key
```

Developer does not pay user AI consumption when requests are made using user-owned keys.

Cloudflare mainly handles:

```text
Auth
Data
Session
Progress
Scenario
Sync
```

## Desktop

Best low-cost configuration:

```text
STT → local faster-whisper
TTS → local Kokoro
LLM → user BYOK DeepSeek / GLM
```

Approximate API cost from developer perspective:

```text
STT = $0
TTS = $0
LLM = user pays
```

---

# 23. Development Phases

## Phase 1 — Core MVP

Goal:

> Prove that users enjoy AI Business English roleplay.

Build:

- React web UI.
- Cloudflare Worker.
- Scenario system.
- BYOK DeepSeek.
- BYOK GLM.
- Text conversation.
- Session history.
- Basic feedback.
- Basic scoring.

No voice yet.

---

## Phase 2 — Web Voice

Build:

- Microphone capture.
- Streaming STT.
- Deepgram integration.
- Cloud TTS.
- Voice conversation.
- Push-to-talk.
- Conversation interruption handling.
- Audio playback.

Goal:

> Natural voice conversation in browser.

---

## Phase 3 — Desktop (Optional / Future)

Desktop is an **optional phase**, not a mandatory part of the initial product roadmap.

The project should be prepared for desktop development through the repository structure and shared abstractions, but **no desktop stack should be installed during the initial development phases**.

### Initial repository preparation

Create only the placeholder directory:

```text
apps/
├── web/
│   └── React + Tailwind CSS + Cloudflare Worker
│
└── desktop/
    └── README.md
```

Do **not** install initially:

- Tauri.
- Rust toolchain.
- Tauri plugins.
- Desktop-specific dependencies.
- Local Whisper runtime.
- Local Kokoro runtime.

### When Desktop Phase is activated

Only when there is a clear product reason to build the desktop version:

- Install Tauri 2.
- Add Rust toolchain.
- Build Windows version.
- Build Linux/Ubuntu version.
- Build macOS version.
- Add secure OS-level API key storage.
- Add local faster-whisper.
- Add local Kokoro.
- Add cloud/local provider selector.

The desktop application should consume the same shared core packages as the web application.

Goal:

> Keep the project desktop-ready without spending development effort or dependency complexity on desktop before it is validated as a useful product.

---

## Phase 4 — Personal Coach

Build:

- User English profile.
- Skill tracking.
- Weakness detection.
- Vocabulary tracking.
- Daily challenge.
- Personalized scenarios.
- Learning recommendations.

---

## Phase 5 — Advanced Speech

Build:

- Pronunciation analysis.
- Speaking speed.
- Filler word detection.
- Pause analysis.
- Intonation.
- Accent feedback.

---

# 24. UX Priorities

Prioritize:

1. Low latency.
2. Natural conversation.
3. Useful feedback.
4. Simple setup.
5. Clear voice controls.
6. Privacy.
7. Reliable fallback.

Avoid overloading the first version with:

- Complex dashboards.
- Too many scores.
- Gamification.
- Social features.
- Large scenario catalog.

---

# 25. Repository Structure

The initial repository should be optimized for the Web MVP while keeping a clear path for a future desktop application.

```text
english-coach/
|
├── apps/
│   ├── web/
│   │   ├── React
│   │   ├── Tailwind CSS
│   │   └── Cloudflare Worker
│   │
│   └── desktop/
│       └── README.md
│
├── packages/
│   ├── core/
│   ├── ai/
│   ├── speech/
│   ├── scenarios/
│   ├── shared/
│   └── ui/
│
├── package.json
└── pnpm-workspace.yaml
```

### Desktop Placeholder

`apps/desktop/` exists only to reserve the application boundary.

It must not contain:

- Tauri configuration.
- Rust source code.
- Tauri dependencies.
- Native build configuration.

When Phase 3 is activated, the desktop app can be initialized independently while reusing the shared packages.

---

# 26. Recommended MVP User Flow

```text
Landing
   |
   v
Choose English Level
   |
   v
Choose Scenario
   |
   v
Choose AI Role
   |
   v
Configure Provider
   |
   v
Start Conversation
   |
   v
🎤 Speak
   |
   v
AI Responds
   |
   v
Repeat
   |
   v
Finish
   |
   v
AI Feedback
   |
   v
Score
   |
   v
Recommended Practice
```

---

# 27. Key Product Principle

The application should not position itself as:

> "Chat with an AI in English."

Instead:

> **"Practice the conversations you actually have at work."**

The AI should behave as a realistic conversation partner with:

- Role.
- Personality.
- Goal.
- Context.
- Difficulty.
- Vocabulary requirements.
- Follow-up questions.

The feedback system should then transform the conversation into an actionable lesson.

---

# 28. Final Architecture

```text
                         AI BUSINESS ENGLISH COACH
                                    |
                    ┌───────────────┴───────────────┐
                    |                               |
                 WEB APP                         DESKTOP
                    |                               |
            React + Tailwind                  Tauri 2 + React
                    |                               |
            Cloudflare Worker                 Local Runtime
                    |                               |
          ┌─────────┼─────────┐            ┌────────┼────────┐
          |         |         |            |        |        |
         D1        R2       AI APIs       STT      LLM      TTS
                              |            |         |        |
                        ┌─────┴─────┐      |         |        |
                        |           |      |         |        |
                     DeepSeek     GLM   Whisper   BYOK    Kokoro
                                      / Deepgram          / Cloud
```

## Core Principle

```text
One Core Engine
       |
       +---- Web Adapter
       |
       +---- Desktop Adapter
```

Platform-specific implementation harus berada di adapter/provider layer, bukan di business logic.

---

# 29. Success Criteria for MVP

MVP dianggap berhasil jika:

- User dapat memulai conversation < 1 menit setelah membuka app.
- Conversation terasa natural.
- AI tetap in-character.
- Feedback menemukan kesalahan yang benar-benar berguna.
- User memahami mengapa sebuah expression lebih natural/professional.
- Voice response memiliki latency yang acceptable.
- Desktop local STT/TTS dapat berjalan pada RTX 3070.
- Web dan desktop menggunakan core scenario/conversation logic yang sama.
- API key user tidak tersimpan plaintext.
