# Air Beluga

Milestones 1 and 2 of the [implementation handoff](air-beluga-implementation-handoff.md): a deterministic TypeScript puzzle engine and a playable, text-first React desk. Complete the eight-passenger SFO stage in the browser, inspect documents, search the travel reference, request evidence, commit decisions, and review explanations and the stage summary. Progress saves on this device and resumes after reload.

**All eight cases and every rule in this version are illustrative.** They use invented requirements and fictional nationality codes XZ/XY at real airports. They make no claims about actual travel eligibility. No fixture is approved for public verified or daily play.

Educational puzzle; not an authoritative tool for real travel decisions. Verify requirements with official sources and your airline before travel. Airline acceptance does not guarantee border admission.

## Run and verify

Use Node.js 24 LTS (minimum 22.12) and npm. Install dependencies once:

```sh
npm ci
```

The Milestone 1 acceptance commands run locally without a browser, network API, credentials, or Cloudflare account:

```sh
npm test
npm run validate:content
```

Additional commands:

```sh
npm run play:stage              # interactive text desk
npm run play:stage -- --auto    # complete stage using authored answers (spoilers)
npm run check                  # types, lint, format, unit tests, validation, static build
npm run dev                    # playable browser desk
npm run build                  # validated static assets in dist/
npm run preview                # preview the production build
```

The terminal desk supports `inspect <document-id>`, `ask <question-id>`, `rule [id or search text]`, `check-in`, `deny`, `escalate`, `next`, `help`, and `quit`. Decisions commit immediately; use `next` to continue after feedback. `--stage <stage-id>` chooses a stage. Content validation accepts an optional data directory: `npm run validate:content -- /path/to/data`.

Open the local URL printed by Vite and select **Start stage**. Inspection and rule lookup use ordinary buttons and expandable text; all actions work by keyboard. Decisions commit immediately. **Restart** asks before clearing an unfinished run; **Play again** opens a fresh desk after completion.

The static build goes to `dist/`. The browser fetches validated static JSON at startup; subsequent gameplay makes no network requests. CI runs the full check, and `npm run build` validates content before compiling. Unit tests use Node without requiring a browser or network API.

For the browser acceptance test, install Chromium once, then build and run:

```sh
npx playwright install chromium
npm run build
npm run test:browser
```

The browser script briefly starts a production preview on `127.0.0.1:4173` and closes it on exit. It completes the entire stage at desktop and 390px mobile widths, exercises keyboard/mouse input, rule lookup, evidence requests, feedback, reload/resume, completed-stage recovery, and replay. It turns the browser offline during play and asserts that actions send no network requests. It also checks incompatible/corrupt records, blocked storage, and retry after failed content loading. Screenshots are written to ignored `test-results/`. CI installs browser system dependencies with `npx playwright install --with-deps chromium`.

## Deploy static assets to Cloudflare

The included `wrangler.jsonc` points Workers Static Assets at `dist/` and enables single-page application navigation. It contains no Worker script, bindings, database, or runtime API.

After signing into your own Cloudflare account:

```sh
npm ci
npm run check
npx wrangler@4 login
npx wrangler@4 deploy
```

Choose a different `name` in `wrangler.jsonc` if `air-beluga` is already used in your account. Deployment uploads the static build and prints its URL. Deploy only when you intend to publish the illustrative training game; no Cloudflare account is needed to develop or play locally. See the official [static assets deployment guide](https://developers.cloudflare.com/workers/static-assets/get-started/) and [SPA configuration](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/).

Cloudflare Pages is also supported: connect the repository, use `npm run build` as the build command, `dist` as the output directory, and Node 24 for the build environment. The app uses a single page and relative static data paths through Vite's base URL; no Functions directory or server configuration is needed.

## Modules and contracts

- `src/content/schemas.ts`: strict Zod contracts and inferred TypeScript types, including manifests, snapshots, cases, stages, pools, and session records.
- `src/content/loader.ts`: reader-injected JSON loader. Terminal and browser adapters read disk files or static JSON assets. Manifest paths are relative to the data root.
- `src/content/validate.ts`: reference integrity, dates, document conditions, itinerary scope, evidence reachability, verification metadata, and daily pool feasibility.
- `src/core/engine.ts`: pure session creation, player-facing evidence projection, and reducer. No browser, clock, storage, network, or React dependency.
- `src/core/scoring.ts`: configurable deterministic scoring.
- `src/core/daily.ts`: versioned deterministic selection and explicit fixture opt-in.
- `src/storage/progress.ts`: versioned localStorage adapter and recovery through deterministic engine replay.
- `src/ui/`: browser desk, readable document views, scoped/searchable reference, feedback, and stage summary.
- `public/data/`: independently editable JSON fixtures. `scripts/` contains validation and terminal adapters; `tests/` contains acceptance and regression coverage.

Each passenger has possessed documents, initially presented IDs, offered deterministic questions, and one or more evidence-backed resolution paths. A correct disposition requires the expected decision **and** a fulfilled path. Required questions can record facts even when they reveal no document. Inspection and reference lookup are recorded but do not impose extra grading requirements.

The reducer rejects unknown actions, hidden-document inspection, premature progression, and changes after submission. Repeated inquiries, inspections, and reference opens are idempotent. Feedback records the case version, rule snapshot, submitted and expected decisions, missing evidence/inquiries, rationale, rule IDs, and score breakdown. The player-facing projection omits unrevealed documents and solution details; static files remain inspectable, as accepted in the handoff.

Session state is JSON serializable and stamped with schema/content versions. Browser records use `air-beluga:progress:<stage-id>` with `storageVersion: 1`. Recovery validates the record shape and stage order, then replays decisions, inquiries, inspections, and rule opens through the engine. It recomputes evidence and scores instead of trusting inconsistent saved values. Unknown storage/session/content versions are invalidated with a visible explanation and a fresh-start option; no automatic migration is defined yet. Failed reads/writes or blocked storage leave the current in-memory game playable and report that progress cannot be saved. Restart overwrites the current stage record. Completion remains saved until replay.

## Fixture coverage

| Case                      | Mechanic                                          |
| ------------------------- | ------------------------------------------------- |
| `fixture-01-ready`        | Accept complete initial evidence                  |
| `fixture-02-hidden-visa`  | Request a hidden visa; premature acceptance fails |
| `fixture-03-expired`      | Deny an expired sole passport                     |
| `fixture-04-no-visa`      | Confirm missing permission before denial          |
| `fixture-05-resident`     | Request a qualifying residence permit             |
| `fixture-06-referral`     | Clarify status before authorized escalation       |
| `fixture-07-onward`       | Request evidence for an onward connection         |
| `fixture-08-alternatives` | Accept either of two discoverable evidence paths  |

The manifest config awards 100 for a correct disposition, 15 for appropriate inquiry behavior, and up to 10 for efficiency per passenger: 1,000 for an ideal eight-passenger stage. A correct evidence-backed path earns inquiry credit, including when no inquiry was needed. Justified questions cost nothing; each distinct unnecessary question reduces efficiency by 2, down to zero. An incorrect or premature decision earns zero. Scores change only when a decision is committed.

## Daily selection contract

The fixture pool exercises the selector in tests; the normal selector refuses illustrative pools/cases. Development callers must explicitly pass `{ allowIllustrative: true }`. This does not mark content as verified or publish a daily mode. Selected fixtures retain their authored travel date, independent of the challenge's UTC selection date.

Algorithm version: `fnv1a32-mulberry32-v1`.

1. Validate the explicit `YYYY-MM-DD` UTC date and pool constraints.
2. Encode `JSON.stringify([dailyAlgorithmVersion, contentVersion, poolId, utcDate])` as UTF-8 and hash it with unsigned 32-bit FNV-1a (`0x811c9dc5` offset, `0x01000193` multiplier).
3. Use that seed for Mulberry32. Sort case IDs by JavaScript code-unit order before each initial shuffle. Use Fisher–Yates with `floor(random * (index + 1))`.
4. Visit EASY, MEDIUM, HARD in that order, shuffle each bucket, and take its minimum count. Shuffle remaining candidates, filling to the daily count without exceeding bucket maxima. Finally shuffle the chosen cases.
5. Return the ordered IDs and a challenge ID containing algorithm version, content version, pool ID, and UTC date. Impossible constraints and duplicate IDs throw; no random fallback exists.

Callers derive the day with `utcDate(new Date())`; the selector itself never reads the clock. Changing file order or local timezone cannot change a selection. A daily session recomputes the expected selection before accepting it.

## Content changes

Edit static JSON and run validation/tests. Each new asset must have a matching manifest ID/path. Keep document IDs unique within a case and rule IDs unique within a snapshot. Required evidence must be initially presented or revealed by the path's required questions. Check-in paths may not depend on expired, not-yet-valid, or exhausted evidence. Invalid documents are allowed as deliberate evidence in denial cases.

Illustrative records must carry `ILLUSTRATIVE_ONLY` and the exact fixture notice. A verified case requires a recorded review and a verified snapshot with HTTPS source URLs, publishers, verification dates, and applicable effective dates when known. Rules carry explicit departure, destination, and transit scope. These checks enforce metadata and consistency; authoritative-source review remains a human editorial responsibility. Do not promote fixtures by merely changing their status fields.

Bump `contentVersion` whenever published content or scoring changes, bump a case's `version` when it changes, and assign a new snapshot ID to changed rules. Preserve old content snapshots in version control for historical replay; never edit a published snapshot in place. Bump `dailyAlgorithmVersion` for any selection behavior change. Publishing verified content, historical asset hosting, and browser daily mode belong to Milestone 3 or later.

Tool documentation: [Vite](https://vite.dev/guide/), [Vitest](https://vitest.dev/guide/), [Zod](https://zod.dev/basics).
