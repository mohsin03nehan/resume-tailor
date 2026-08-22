# Resume Tailor

An AI-powered tool that helps job seekers write tailored cover letters and identify which resume bullets to emphasize, based on a specific job description.

**Live demo:** https://resume-tailor.vercel.app *(update once the Vercel project is renamed — see note below)*

---

## The problem

Tailoring a resume and cover letter to every job application is repetitive and easy to get wrong — most people either send a generic cover letter that doesn't mention the role at all, or spend an hour manually rewriting the same content for every application. Resume Tailor takes a short description of your background and the job you're targeting, and generates a tailored cover letter paragraph plus a live analysis of which of your skills actually match the role — in seconds, streamed live rather than a single blocking request.

## What it does

- **Streaming AI chat** — paste your background and the job description, get a tailored cover letter paragraph streamed back token by token, not a spinner-then-dump
- **Live job match analysis** — a structured "Job Match" card shows skill overlap between your background and the job description, rendered as data (percentage, matched/missing skills, suggested bullets), not just prose
- **Resilient by design** — network failures, mid-stream errors, and rate limits all show a designed error state with a working retry, not a broken UI
- **Interactive 3D model viewer** — a separate drag-and-drop GLB viewer with live material/lighting controls, demonstrating 3D-on-the-web patterns
- **A shader-driven hero** — a custom particle field on the homepage that reacts to cursor position

## Screenshots

| Home | Tailor (streaming chat) | Job match card |
|---|---|---|
| Particle field hero, static at rest, scatters on cursor hover | Streaming AI response with a thinking indicator and a stop button | Structured tool-result card with skill overlap and suggested bullets |

*(See the live demo above — screenshots go stale faster than a link.)*

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS
- **AI:** Google Gemini (`gemini-3.6-flash`) via the Vercel AI SDK
- **3D:** Three.js (a hand-built particle system, no scene-graph abstraction library)
- **Testing:** Vitest + React Testing Library (component tests), Playwright (end-to-end)
- **CI:** GitHub Actions — runs the test suite on every push
- **Deployment:** Vercel

## Run it locally

**Prerequisites:** Node.js 20+, a free Google AI Studio API key.

```bash
git clone https://github.com/mohsin03nehan/resume-tailor.git
cd resume-tailor
npm install
cp .env.example .env.local   # then fill in your key, see table below
npm run dev
```

Open `http://localhost:3000`.

### Environment variables

| Variable | Required | Where to get it | Notes |
|---|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | [Google AI Studio](https://aistudio.google.com/apikey) — free tier, no credit card | Server-side only; never exposed to the client. Used by `src/app/api/chat/route.ts`. |

### Tests

```bash
npm run test          # Vitest component tests
npm run test:watch    # same, in watch mode
npm run test:e2e      # Playwright end-to-end (needs a running dev server + a real API key)
```

CI runs `npm run test` automatically on every push via `.github/workflows/test.yml`. The e2e suite intentionally isn't run in CI since it needs a live API key — it's run locally before merging.

## Architecture overview

```
src/app/
├── api/chat/route.ts     # Streaming AI route: rate limiting, input caps, Gemini call
├── tailor/                 # Main chat interface (streaming, error states, empty state)
├── viewer/                 # 3D GLB model viewer (React Three Fiber + drei + leva)
├── components/
│   ├── Nav.jsx              # Responsive nav (hamburger menu on mobile)
│   └── ShaderHero.jsx       # Particle hero (Three.js, cursor-reactive)
└── page.js                  # Homepage
e2e/                          # Playwright tests
.github/workflows/test.yml    # CI
```

The API route (`route.ts`) is the only file that talks to Gemini. It reads the incoming message history, applies a length cap and a rate limit, calls `streamText()` with a system prompt describing the assistant's role, and returns a stream the client's `useChat` hook consumes directly. Model config (model name, system prompt, generation settings) lives in this one file so it's easy to find and change.

## AI integration — how and why

The core feature (tailored cover letter generation + job match scoring) is powered by Google Gemini via the Vercel AI SDK's `streamText()`, using a system prompt that scopes the assistant specifically to resume/cover-letter tailoring rather than general chat. Responses stream token-by-token to the client rather than blocking, and a separate structured tool call (`analyzeJobMatch`) returns typed, schema-validated output (skill overlap, matched/missing skills, suggested bullet edits) that renders as a distinct UI card — not just more chat text — because a percentage score and a skill list are more useful as data than as a paragraph.

Gemini was chosen over Claude/OpenAI specifically because it has a genuinely ongoing free tier with no credit card required, which mattered for a self-funded student project. The prompt, streaming pattern, and structured-output tool call would transfer to another provider (Claude, GPT) with a provider swap in one file — the AI SDK abstracts the transport layer.

## Production hygiene

- **Rate limiting:** in-memory, per-IP, 10 requests/minute, in the route handler itself — documented as a deliberate trade-off appropriate to this project's traffic (a single-instance deployment with no meaningful load), not a claim it would hold up under real abuse. A production app at scale would use Redis-backed rate limiting instead.
- **Input caps:** messages over 4000 characters are rejected before they reach the model.
- **`maxDuration`:** capped at 30 seconds on the streaming route.
- **API key:** server-side only, read from `process.env`, never referenced client-side.

## Notable decisions

- **A static-until-hover particle hero, not constant ambient animation.** An earlier version had the particle field drifting continuously. It was removed — it competed with the headline for attention and read as noisy rather than deliberate. Particles now stay still and only react to cursor position.
- **A hand-built focus trap, tabs pattern, and disclosure component exist in an earlier phase of this project** (before being consolidated into this app) as a deliberate exercise in understanding the W3C ARIA Authoring Practices before reaching for a component library — compared afterward against shadcn/ui's Radix-based implementation to identify what a from-scratch version misses (portal rendering, animated state transitions, a more battle-tested focus trap).

## Known limitations & what I'd add next

- Authentication is currently a placeholder route — real auth (Firebase or similar) would let the history page persist real saved cover letters per user.
- The 3D viewer's default model isn't DRACO-compressed; a compressed default and a static-image fallback for low-power devices would improve load time.
- Rate limiting is in-memory and per-instance — fine at current scale, but would need a shared store (Redis, or a platform's built-in rate limiting) to hold up under real traffic.

---

Built by Muhammad Mohsin Nehan.
