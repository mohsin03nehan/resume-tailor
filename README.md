# Resume Tailor

An AI-powered tool that helps job seekers write tailored cover letters and identify which resume bullets to emphasize, based on a specific job description. Built as a capstone project for FlyRank's Frontend AI Engineering internship track.

**Live URL:** https://flyrank-capstone-ebon.vercel.app

---

## What it does

Paste a short description of your background and the job you're applying for into the chat, and the AI (Google Gemini) streams back:
- A short, tailored cover letter paragraph
- Which resume bullets to emphasize and why
- A live "Job Match" analysis (skill overlap scoring between the job description and your background, rendered as a structured card, not just text)

The rest of the app demonstrates the supporting patterns around that core AI feature: authenticated history, error/empty states, motion design, an interactive 3D viewer, and a tested, CI-covered codebase.

## Screenshots

| Home (particle hero) | Tailor (streaming chat) | Job match card |
|---|---|---|
| Particle field hero, static at rest, scatters on mouse hover | Streaming AI response with thinking indicator and stop button | Structured tool-result card with skill overlap and suggested bullets |

*(See the live URL above for the real thing — screenshots go stale faster than a link.)*

## Tech stack

- **Framework:** Next.js 16 (App Router), JavaScript (not TypeScript, except the API route)
- **Styling:** Tailwind CSS
- **AI:** Google Gemini (`gemini-3.6-flash`) via the Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/react`)
- **3D:** Three.js (custom particle system, no scene-graph library)
- **Testing:** Vitest + React Testing Library (component tests), Playwright (end-to-end)
- **CI:** GitHub Actions — runs the unit test suite on every push
- **Deployment:** Vercel

## Run it locally

**Prerequisites:** Node.js 20+, a free Google AI Studio API key.

```bash
git clone https://github.com/mohsin03nehan/flyrank_capstone.git
cd flyrank_capstone/resume-tailor
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
npm run test:e2e      # Playwright end-to-end (needs a running dev server + real API key)
```

CI runs `npm run test` automatically on every push via `.github/workflows/test.yml`. The e2e suite is intentionally *not* run in CI since it hits the live AI API and needs a real key — it's run locally before merging.

## Architecture overview

```
resume-tailor/
├── src/app/
│   ├── api/chat/route.ts     # Streaming AI route (Gemini + Vercel AI SDK)
│   ├── tailor/                # Main chat interface (streaming, error states, empty state)
│   ├── viewer/                # 3D GLB model viewer (React Three Fiber + drei + leva)
│   ├── auth/, history/        # Placeholder auth/history routes
│   ├── components/
│   │   ├── Nav.jsx            # Responsive nav (client component, hamburger on mobile)
│   │   └── ShaderHero.jsx     # Particle hero (Three.js, mouse-reactive)
│   └── page.js                # Home page
├── e2e/                        # Playwright tests
└── .github/workflows/test.yml  # CI
```

The AI route (`route.ts`) is deliberately the only file that touches the Gemini API. It reads the incoming message history, applies a length cap and rate limit, calls `streamText()` with a system prompt describing the assistant's role, and returns a streamed response the client's `useChat` hook can consume directly. All model config (model name, system prompt, generation settings) lives in this one file so it's easy to find and change.

## Production hygiene

- **Rate limiting:** In-memory, per-IP, 10 requests/minute, implemented directly in the route handler. This resets on cold start and doesn't share state across multiple serverless instances — it's a deliberate, documented trade-off appropriate for this project's scale (a hobby-tier deployment with no real traffic), not a claim that it would hold up under real abuse. A production app at meaningful scale would use Redis-backed rate limiting or Vercel's own rate-limiting middleware instead.
- **Input caps:** Messages over 4000 characters are rejected with a 400 before they ever reach the model, so a malicious or accidental huge paste can't run up API costs.
- **`maxDuration`:** Set to 30 seconds on the streaming route so a hung request can't tie up serverless function time indefinitely.
- **API key:** Server-side only, read from `process.env`, never sent to or referenced by any client-side code.

## Decisions worth explaining

- **Gemini instead of Claude/OpenAI:** No paid API access was available for this internship; Gemini's free tier is genuinely ongoing (not a time-limited trial), which made it the practical choice. The system prompt, model config, and streaming pattern would transfer to Claude or GPT with a provider swap — the AI SDK abstracts most of that.
- **Static particle hero, not constantly animated:** An earlier version had the particle field drifting/rotating continuously via `elapsedTime`. It was removed on purpose — it competed with the headline for attention and read as noisy rather than polished. The particles now stay still and only react to mouse position, which is both calmer and still satisfies the "reacts to a live input" requirement from the shader assignment this came from.
- **JavaScript, not TypeScript, for the app:** Kept consistent with earlier assignments in this track. The one exception is the API route, which is `.ts` because that's what an early Copilot pass generated and it wasn't worth converting back.

## How AI tools built this — specifics, not platitudes

This project was built primarily with **GitHub Copilot in VS Code's Agent mode**, with **Claude** used alongside it for planning, debugging, and reviewing Copilot's output before accepting it. Concretely, not in the abstract:

- **Copilot wrote the majority of component code** from detailed, scoped prompts (e.g. "build a Modal following the W3C ARIA dialog pattern, focus trap implemented manually, no libraries" for an earlier accessibility assignment; "add rate limiting to this route, 10 req/min per IP, in-memory Map" for this one). Prompts were kept narrow and single-purpose after an early lesson that vague prompts caused scope creep — Copilot would add unrequested features (forms, extra components) when given loose instructions.
- **A recurring, real problem:** Copilot's Agent mode repeatedly created files in the wrong location — at the monorepo root instead of inside the `resume-tailor` project folder, and occasionally in an entirely separate git worktree it created without asking. This was diagnosed with `git worktree list` and `Get-ChildItem -Recurse -Filter "<filename>"` after nearly every file-creation prompt, and files were manually moved into place. This is disclosed here because it's a genuine limitation encountered repeatedly, not a one-off.
- **Debugging was iterative and AI-assisted but verified manually at each step**, not trusted blindly. Examples: Copilot's first attempt at Vercel AI SDK integration used an incorrect API (`streamText({ model, input: fullPrompt })` — a manually concatenated prompt string instead of a proper messages array), which was caught by testing in the browser and fixed with a follow-up prompt specifying the correct `streamText({ model, system, messages })` signature. A `convertToModelMessages` helper turned out to be unreliable in this SDK version (returned an empty object instead of an array) and was replaced with a small manual mapping function instead of being forced to work.
- **Claude was used to explain unfamiliar concepts before accepting AI-generated code that used them** — for instance, the roving-tabindex pattern in a hand-built Tabs component, and the focus-trap logic in a hand-built Modal, were both explained turn-by-turn before being accepted, specifically so they could be defended to a mentor rather than just pasted in.
- **Manual corrections beyond bug-fixing:** several design decisions (removing the particle hero's ambient animation, choosing to keep the send button's motion states compositor-friendly by animating only `transform`/`opacity`) were reversals of what AI first produced, made after actually looking at the result rather than accepting the first pass.

## What I'd add with more time

- Real authentication (Firebase Auth, already used elsewhere in this track) instead of a placeholder `/auth` route, so the "History" page could persist real saved cover letters per user.
- DRACO compression for the 3D viewer's default model, and a static-image fallback for low-power devices instead of always loading the full Three.js scene.
- A production-grade rate limiter (Redis-backed or Vercel's built-in) instead of the in-memory per-instance version currently in place.