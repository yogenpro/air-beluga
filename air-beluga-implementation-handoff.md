# Air Beluga — Implementation Handoff

**Status:** MVP technical specification / coding-agent handoff  
**Date:** 2026-10-24  
**Project:** Air Beluga  
**Concept:** A lightweight, primarily text-based browser puzzle game in which the player works as a check-in agent for the fictional airline **Air Beluga**, stationed at real airports, and decides whether passengers can be accepted for travel based on their itineraries, passports, visas, residence permits, transit conditions, and other travel documents.

## 1. Executive summary

Build a **static-first web game** with a deterministic, client-side gameplay engine. A player processes a queue of passengers, examines their initially presented documents, consults an in-game travel-requirements reference, optionally asks for additional documents, and decides to **check in**, **deny**, or **escalate**. Results explain the supporting rules and the correct reasoning. Content comes from curated, verified scenarios rather than a general-purpose immigration rules engine or an LLM.

The prototype must be **primarily text-only**. Do not invest in art, animation, elaborate airport simulation, or visual design. Deploy as static assets on Cloudflare, preferably **Workers Static Assets** (Cloudflare Pages is an acceptable alternative). **No runtime backend, accounts, AI, or database are required for MVP.** Preset stages and deterministic daily challenges must work client-side.

## 2. Product principles and scope

### Agreed principles

1. **Real rules, puzzle-oriented play.** Cases should be grounded in actual requirements applicable to air travel on specified dates. The game is about applying and discovering rules, not detecting forgeries, baggage management, or running an airport.
2. **Fictional airline, real airports.** The player's employer is Air Beluga. Airport codes and travel geography can be real; do not imply that a real airline endorses the game.
3. **Agent determines airline acceptance, not border admission.** A successful check-in is not a guarantee of admission by immigration authorities. The game must not conflate these decisions.
4. **Discoverable solutions.** Every passenger has a fair evidence path. The player should not have to guess from an unlimited set of obscure hidden documents.
5. **Rules are referenced, not fabricated.** A searchable in-game rules reference accompanies the cases. Each production scenario must cite sources and their effective/verified dates.
6. **Static-first and offline-capable in principle.** Play must not require per-action server requests. Browser caching is sufficient for initial deployment; a service worker/PWA install flow is optional, not MVP-critical.
7. **Separation of concerns.** UI, core game engine, scenario content, rule reference, and persistence are independent modules.
8. **Design for future extension, not speculative infrastructure.** Preserve the possibility of machine-evaluable rules and server-backed features without implementing them now.

### In scope for first playable MVP

- A real-airport stage setting and fictional Air Beluga flight/check-in counter.
- A queue of passengers with nationality, itinerary, travel date and relevant documents.
- Document inspection in readable text.
- A small number of specific requests for additional documents (e.g., visa, residence permit, second passport, onward ticket), with passenger responses and potentially newly revealed documents.
- A local, searchable text rules reference tailored to the small curated case set.
- Check in / deny / escalate decisions, correctness feedback, explanation, and deterministic scoring.
- One complete preset stage, progress saved locally, and a deterministic daily challenge selected from validated content.
- Automated validation and tests for scenario consistency and engine state transitions.

### Out of scope for MVP

- Graphical polish, character portraits, animations, sound, or airport-management gameplay.
- Real passport scanning, OCR, forged-document recognition, ticketing, baggage or seat allocation.
- User authentication, cross-device sync, multiplayer, competitive/cheat-resistant leaderboards.
- Live IATA/Timatic or Sherpa integration, automatic live regulatory updates, global coverage.
- LLMs at runtime, unconstrained AI-generated cases, generic immigration eligibility computation.
- Cloudflare Workers APIs, KV, R2, D1, or other persistent cloud storage for normal play.
- Any promise that game content is real-world travel advice for an actual journey.

## 3. Player experience and mechanics

### Stage framing

The check-in counter opens at a **real airport** for an Air Beluga flight. A defined queue of passengers presents itself one at a time. Stage metadata can include departure airport, flight ID, scheduled departure, and a small tutorial/difficulty label. For the prototype, use simple text rather than simulation time or a ticking clock.

### Passenger loop

1. **Present passenger:** show booking itinerary, nationality, and initially supplied documents.
2. **Inspect:** player can read document details and consult the built-in rulebook. No server requests.
3. **Ask targeted question (optional):** player chooses from a small, scenario-defined set of document categories or context-sensitive questions. The passenger may reveal a document they have, deny having it, or clarify a condition. Each question has deterministic behavior.
4. **Decide:** `CHECK_IN`, `DENY`, or `ESCALATE`.
5. **Resolve:** reveal correctness, relevant rule citations, a brief reasoning explanation, and score contribution.
6. **Continue:** move to next passenger; stage completion produces a summary.

**Important:** asking about a missing visa/residence document is part of the puzzle. The player must not be punished for making a justified inquiry, but indiscriminate questions may carry a *small* efficiency cost. Do not force a universal question-everything strategy. In initial content, cap offered question options to a manageable set and ensure clues support relevant options.

### Decision semantics

- `CHECK_IN`: the passenger has presented enough valid evidence, under the authored case and referenced rules, to be accepted for the specified itinerary.
- `DENY`: the available/resolved case facts establish that boarding should not be authorized and there is no outstanding relevant obtainable documentation to consider.
- `ESCALATE`: an authorized handoff is necessary because the situation cannot be resolved from the available evidence/rules. **Do not make this a generic safe button:** in curated content, it is correct only when specifically warranted.
- Keep **eligibility** separate from **evidence revealed**: a person might possess a valid permit but not initially show it. The player's correct action may be to request that permit before checking in.
- A case must specify what actions/observations count as a valid resolution; checking in prematurely should not become correct just because a hidden qualifying document exists.

### Scoring (configurable draft, not finalized balancing)

Prioritize correct dispositions, then appropriate inquiries, then efficiency. An initial daily format might total **1,000 points**: 800 for correct decisions, 120 for justified document requests, 80 for efficiency. These numbers are placeholders and should live in configuration, not be hardcoded into UI. Wrong decisions have larger penalties than harmless extra questions. The prototype should not impose time pressure.

### Feedback

After each committed decision, display:
- Correct/incorrect and expected disposition;
- Which additional document or inquiry was required, if relevant;
- Plain-language reasoning;
- References to the applicable rule IDs and linked sources;
- Score delta.

Do not reveal the hidden answer during normal play, though a curious user can inspect static JSON in developer tools. That is an accepted MVP limitation.

## 4. Stages and daily challenges

### Preset stages

Start with one real-airport stage (e.g., SFO), approximately **8–10 passengers** and **10–20 total curated cases** available across the prototype. Later curriculum examples: direct-entry basics at SFO; exemptions/residency at LHR; airside vs landside transit at FRA; complex itineraries at SIN. These are proposed stage themes, not verified regulatory content. Increase complexity rather than arbitrarily changing rules.

### Daily challenge: initial specification

- Choose **5–10 passengers** from a validated scenario pool.
- For any given **UTC date + content version**, every player must get identical case IDs and order.
- Use a documented deterministic PRNG and stable seed derivation (avoid `Math.random()` and implementation-dependent hash behavior). Include `dailyAlgorithmVersion` and `contentVersion` in identifiers and result records.
- Apply constraints to avoid duplicate cases and ensure a sane difficulty mix. If pool constraints cannot be met, fail validation or fall back to a known static selection; do not silently generate invalid cases.
- No API calls are necessary. The current UTC day can be derived client-side; clock tampering and advance answer inspection are accepted until competitive features exist.
- **Later option:** CI-generated static `/data/daily/YYYY-MM-DD.json` challenge files for editorial control and archival replay; not required for initial MVP.

When regulations change, **freeze existing daily challenges to their verified rule snapshot** rather than quietly modifying historical answers.

## 5. Technical decisions

| Area | Agreed choice |
|---|---|
| Language | TypeScript |
| Frontend | React + Vite |
| UI styling | Basic CSS, text/tables/buttons; no component library required |
| Game engine | Pure deterministic TypeScript, framework-agnostic |
| Game content | Versioned static JSON, with runtime schema checks |
| Schema validation | Zod suggested |
| Testing | Vitest (unit, contract and content validation) |
| Local persistence | Versioned localStorage records |
| Hosting | Cloudflare Workers Static Assets preferred; Pages acceptable |
| Runtime backend | None |
| Authentication | None |
| AI at runtime | None |
| Content update workflow | Edit/verify JSON in Git, run CI tests, redeploy |

**Cloudflare:** Serve only static assets for MVP. Keep routing/paths compatible with a future optional Worker, but do not deploy KV, R2 or D1 until a genuine requirement appears. Potential later uses: D1 for synced user state or leaderboards; KV for seldom-changing config; R2 for substantially larger datasets. Do not use KV as an authoritative leaderboard ledger.

## 6. Suggested repository layout

```text
air-beluga/
├── public/
│   └── data/
│       ├── manifest.json
│       ├── rules/
│       │   └── snapshot-v1.json
│       ├── stages/
│       │   └── 001-sfo.json
│       ├── scenarios/
│       │   └── *.json
│       └── daily/
│           └── pool-v1.json
├── src/
│   ├── core/
│   │   ├── types.ts
│   │   ├── engine.ts
│   │   ├── actions.ts
│   │   ├── scoring.ts
│   │   └── daily.ts
│   ├── content/
│   │   ├── schemas.ts
│   │   ├── loader.ts
│   │   └── validate.ts
│   ├── storage/
│   │   └── progress.ts
│   ├── ui/
│   │   ├── App.tsx
│   │   ├── PassengerDesk.tsx
│   │   ├── DocumentView.tsx
│   │   ├── Rulebook.tsx
│   │   └── ResultView.tsx
│   └── main.tsx
├── tests/
│   ├── engine.test.ts
│   ├── scenarios.test.ts
│   ├── daily.test.ts
│   └── persistence.test.ts
├── scripts/
│   └── validate-content.ts
├── package.json
├── vite.config.ts
└── README.md
```

This tree is guidance rather than a rigid file contract. Prefer maintainability over unnecessary abstractions.

## 7. Data contracts (proposed, refine while implementing)

Implement validated TypeScript/Zod types for at least:

- **RuleSnapshot:** `id`, `asOfDate`, `rules[]`; each rule includes `id`, `title`, `body`, `scope`, `sources[]` (official URL, publisher, accessed/verified date, applicable/effective date when known). Scope must be explicit enough to avoid displaying misleading rules for unrelated itineraries.
- **TravelDocument:** `id`, `type`, `issuingCountry`, `holder`, `validFrom`, `validUntil`, and structured attributes relevant to the case (visa category, permitted entries, residence status, etc.). Avoid over-generalizing every possible document type.
- **PassengerCase:** stable `id`, `version`, `ruleSnapshotId`, itinerary legs and travel date, passenger details, possessed documents, initially presented document IDs, allowed inquiries/responses, case clues, accepted resolution paths / decision preconditions, expected result, rationale, `ruleIds`, `verificationStatus`.
- **Stage:** stable `id`, title, departure airport, airline/flight label, ordered case IDs, and optional tutorial metadata.
- **GameSession:** content version, stage/daily identifier, passenger index, revealed document IDs, asked-question IDs, inspection events if needed, submitted dispositions, scores, and completion status.
- **ContentManifest:** global `contentVersion`, supported rule snapshot IDs, stage IDs, daily pool IDs, and optional file hashes.

**State transition API sketch:**

```ts
type Action =
  | { type: 'INSPECT_DOCUMENT'; documentId: string }
  | { type: 'OPEN_RULE'; ruleId: string }
  | { type: 'ASK_QUESTION'; questionId: string }
  | { type: 'SUBMIT_DECISION'; decision: 'CHECK_IN' | 'DENY' | 'ESCALATE' }
  | { type: 'NEXT_PASSENGER' };

function reduceSession(state: GameSession, action: Action, content: ContentBundle): GameSession;
```

Prefer pure functions for transitions, eligibility-to-evidence checks, daily selection, and scoring. Validate action preconditions (e.g., cannot ask a nonexistent question, reveal an unpossessed document, resubmit after resolution, or skip a passenger inadvertently). Keep score calculations separately testable.

### Example *fictional / unverified* case fragment

```json
{
  "id": "sfo-example-001",
  "version": 1,
  "verificationStatus": "ILLUSTRATIVE_ONLY",
  "ruleSnapshotId": "rules-v1",
  "travelDate": "2026-10-22",
  "itinerary": [{ "from": "SFO", "to": "LHR" }],
  "passenger": { "displayName": "Alex Chen", "nationality": "CN" },
  "documents": [
    { "id": "passport", "type": "PASSPORT", "initiallyPresented": true },
    { "id": "visa", "type": "VISA", "initiallyPresented": false }
  ],
  "questions": [
    { "id": "ask-visa", "label": "Do you have a valid destination visa?", "reveals": ["visa"] }
  ],
  "resolution": {
    "requiredEvidence": ["passport", "visa"],
    "correctDecision": "CHECK_IN"
  },
  "ruleIds": [],
  "rationale": "Illustration only; does not determine actual travel eligibility."
}
```

This example intentionally omits complete document conditions and must **not** be represented as a verified real-world puzzle. The implementation's production schema should be stricter and reject insufficiently specified cases.

### Avoid a premature universal rule evaluator

The MVP engine checks scenario-authored conditions and solutions; it does **not** attempt to derive arbitrary passenger eligibility from a global travel-law model. Do not mistake `expectedDecision` alone for sufficient grading: cases that require a document inquiry should specify the evidence/preconditions required before acceptance. Preserve the option to swap in a real rules evaluator later without changing UI action semantics.

## 8. Travel-regulation sourcing and safety of claims

IATA Timatic is the inspiration for the in-game requirement lookup. Live Timatic and comparable commercial travel-document services may require paid access and licensing, so **do not assume scraping or redistribution rights**. During MVP, curate a small set of scenarios using authoritative government/airport/airline-publication sources where permitted; record exact links and verification dates. Where authoritative evidence is unavailable, mark a case `ILLUSTRATIVE_ONLY` and exclude it from public 'verified real rules' modes and daily challenges.

For each production case, require:

1. A documented travel date and applicable rules snapshot.
2. Explicit itinerary legs (including transit points and, where material, airside/landside or separate-ticket details).
3. Complete relevant document conditions and time validity.
4. A source-backed explanation for positive/negative/escalation outcomes.
5. A discoverable solution path through player-visible data and available questions.
6. A reviewed verification status, not merely generated plausibility.

Display a short disclaimer: *Educational puzzle; not an authoritative tool for real travel decisions. Verify requirements with official sources and your airline before travel.*

## 9. Content validation and tests

Create a `validate-content` script and run it in CI before deployment. Fail the build for invalid verified content.

**Schema/integrity tests**
- Unique stable IDs; existing cross-references for stages, cases, documents, questions and rules.
- Proper date formats and valid ranges; travel date compatible with document validity and rule snapshot.
- Initially presented and question-revealed documents are actually possessed.
- References for production/verified cases are populated; illustrative cases are labeled.
- Every scenario has at least one valid, reachable resolution route.
- No contradictory reveal or decision logic.

**Engine tests**
- Asking a relevant question reveals exactly the defined documents/responses.
- Repeated or invalid actions cannot exploit scoring or corrupt state.
- Premature check-in can be scored wrong even if qualifying evidence is hidden.
- `DENY` and `ESCALATE` are not generic loopholes.
- All scoring and state transitions are deterministic.
- Stage progression, resume, and completion work with stable content versions.

**Daily tests**
- Same UTC date/content/algorithm versions -> same ordered selection across runs.
- Different dates may vary; selected cases are unique and belong to validated pool.
- Stable difficulty constraints; explicit behavior for insufficient pool size.

**UI smoke tests**
- End-to-end complete a stage with keyboard/mouse in a desktop browser and narrow mobile viewport.
- Look up a rule, ask a question, inspect revealed evidence, submit a decision, receive feedback, proceed.
- Reload and restore a session appropriately; incompatible saved versions fail gracefully.

## 10. Milestones and agent deliverables

### Milestone 1 — Core and fixtures

- Scaffold Vite/React/TypeScript, Vitest, lint/format defaults.
- Define schemas/types, content loader, deterministic reducer, scoring and daily selector.
- Provide **5–10 plainly labeled illustrative cases** sufficient to exercise acceptance, denial, valid requests, premature decisions, and escalation.
- Build a CLI/unit-test harness for scenario playback and content validation.

**Acceptance:** `npm test` and `npm run validate:content` pass without requiring a browser, network API, or Cloudflare account.

### Milestone 2 — Text-first playable experience

- Implement plain-text panel UI: stage/flight header; passenger/itinerary/documents; rule lookup; question actions; decision actions; feedback; stage summary.
- Save progress with versioned localStorage state.
- Produce a static Vite build and deployment README for Cloudflare.

**Acceptance:** one complete stage can be finished in the browser, with **zero runtime game API calls**. Static JSON fetches are fine. No visual design work beyond usability/accessibility basics.

### Milestone 3 — Real content and daily mode

- Introduce verified, cited scenario content and a curated rule snapshot; aim for **10–20 cases** total across the prototype.
- Add deterministic daily pool and results.
- Document case-authoring workflow, verification checklist, and content updates/versioning.

**Acceptance:** daily selection matches across clients given the same UTC date and versions; verified cases have traceable source URLs and a reviewed solution; old results retain their historical content version.

## 11. Definition of done for prototype

The MVP is done when a new player can load a statically hosted Air Beluga site, select a stage or daily challenge, work through a queue of realistic text-based passengers, inspect travel documents, look up rules, request additional documents, submit a reasoned check-in/deny/escalate decision, get useful feedback, and see locally saved progress. The entire flow works without a login, backend, paid regulatory API, or runtime AI service; tests validate case integrity and deterministic results.

## 12. Open items / defaults for the coding agent

These are **implementation defaults or follow-up design questions, not product decisions requiring a blocker**:

- **First airport:** SFO as the default tutorial stage.
- **Flight scope:** one fictional Air Beluga departure per stage; passengers may have onward connections.
- **Question UX:** predefined buttons with deterministic answers rather than free-form chat.
- **Rulebook:** simple text search plus jurisdiction/itinerary filters; no full-text search service.
- **Daily UTC boundary:** 00:00 UTC; display this clearly.
- **Storage:** localStorage with safe migrations/invalidation; use IndexedDB only if data volumes justify it.
- **Content packaging:** separate static JSON assets vs compile-time imports; choose based on simplicity and caching, maintain deterministic version identification.
- **No timer:** correctness first, speed scoring later.
- **Accessibility:** semantic controls, keyboard navigation, visible focus states, readable plain text even before visual design.
- **License/source review:** separately verify rights to reproduce travel-requirements text before publishing a broad content database.

**Instruction to implementation agent:** Deliver the smallest working vertical slice first. Treat example scenarios as illustrative until verified; do not improvise legal eligibility answers. Keep the game engine and content contracts isolated from the UI and Cloudflare. Avoid overengineering features explicitly listed out of scope.
