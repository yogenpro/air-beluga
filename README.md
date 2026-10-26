# Air Beluga

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yogenpro/air-beluga)

Milestones 1–3 of the [implementation handoff](air-beluga-implementation-handoff.md): a deterministic TypeScript puzzle engine, source-reviewed Canadian cases, and a versioned daily challenge with local result history. The browser UI presents a cozy airport terminal, a readable document desk, and an end-of-shift report. Inspect documents, search the reference, request evidence or run a simulated document check, then commit a decision. Progress resumes after reload.

There are **24 source-reviewed SFO–Vancouver cases** plus eight explicitly illustrative tutorial fixtures, for 32 cases total. The twelve newer cases cover Green Cards versus U.S. visas, refugee/re-entry travel documents, expired status evidence, and temporary/diplomatic/official passports. The Canadian snapshots were checked against official IRCC publications on **2026-10-25 and 2026-10-26 UTC**; all passengers and document numbers are fictional. This is a Codex source cross-check, not independent human or immigration-authority approval. The original practice desk uses eight Canadian cases. **SFO–Vancouver: document curveballs** offers twelve harder cases, weighted toward denial and escalation. The daily shift selects six; the harder pool begins on **2026-10-27 at 00:00 UTC**, while earlier days keep their original answers. The separate illustrative SFO–LHR tutorial remains available and is excluded from daily play.

See the [original review ledger](docs/content-review-2026-10-25.md), [document-curveball review and sources](docs/content-review-2026-10-26.md) and [case-authoring / verification / release workflow](docs/content-authoring.md).

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

Open the local URL printed by Vite. The terminal makes **Today’s shift** the main action, offering its briefing, continuing saved progress, or reopening the completed report. **Practice shifts** offers the original source-reviewed SFO–YVR desk and the harder document-curveball shift; **Training** opens the explicitly illustrative tutorial. **Shift history** reviews locally saved first daily completions. Each daily shift selects six unique reviewed cases using the chosen UTC day and its scheduled content release. The daily boundary is 00:00 UTC. Crossing midnight does not replace a queue already in progress; choose today's challenge explicitly to switch. Browser Back/Forward and existing `?mode=stage&stage=...`, `?mode=daily&date=...`, and `?mode=results` links work.

The desktop desk places passenger documents beside the searchable travel reference; mobile offers Passenger and Travel reference controls. Inspection and rule lookup use ordinary buttons and expandable text; all actions work by keyboard. Decisions commit immediately. **Restart** asks before clearing an unfinished run; **Play again** opens a fresh desk after completion. Daily replays preserve the original completed result. The case travel date and rule snapshot remain fixed even when the daily selection date is later.

The static build goes to `dist/`. The browser fetches validated static JSON at startup; subsequent gameplay makes no network requests. CI runs the full check, and `npm run build` validates content before compiling. Unit tests use Node without requiring a browser or network API.

For the browser acceptance test, install Chromium once, then build and run:

```sh
npx playwright install chromium
npm run build
npm run test:browser
```

The browser script briefly starts a production preview on a free port at `127.0.0.1` and closes it on exit. It also covers the terminal, briefing, completed report, browser Back/Forward, saved-state menu actions, mobile reference switching, self-hosted assets, and a 320px terminal layout. It covers the original tutorial, both reviewed stages, the document metadata and new daily release boundary, and the complete daily flow at desktop and 390px mobile widths. Checks include matching daily IDs/order across clients, keyboard/mouse input, source links, inquiries, feedback, reload/resume, offline play/history, immutable first results, a simulated later content/scoring deployment, unavailable archives, UTC midnight, corrupt saves, blocked storage, and failed-load retry. Screenshots go to ignored `test-results/`. CI installs browser system dependencies with `npx playwright install --with-deps chromium`.

## Deploy to Cloudflare Workers

Use the **Deploy to Cloudflare** button above for a guided deployment into your own account, or deploy this checkout with the pinned Wrangler CLI:

```sh
npm ci
npx wrangler login
npm run build
npm run deploy
```

The included `wrangler.jsonc` serves all of `dist/` with SPA routing. It has no account ID, domain, credentials, Worker script, database, or runtime API. Optional `npm run deploy:dev` and `npm run deploy:prod` commands create separate `air-beluga-dev` and `air-beluga-prod` Workers. Build first; deployment commands upload the existing build.

See the [Cloudflare deployment guide](docs/deployment.md) for connecting an existing repository directly, dev/prod branch settings, local Workers preview, credential-free deployment checks, and infrastructure ownership. CI validates all three deployment configurations. No Cloudflare account is needed for local development or these checks.

## Dependency updates

[Dependabot](.github/dependabot.yml) checks npm dependencies and GitHub Actions every weekday. Minor and patch updates are grouped per ecosystem; major upgrades get separate PRs. npm updates raise manifest requirements and update the lockfile, including packages pinned to exact versions.

Version-update PRs target `dev` and run the existing application, deployment dry-run, and browser checks. The [automated review workflow](.github/workflows/dependabot-auto-merge.yml) verifies Dependabot commits, checks dependency advisories, and limits automatic approval to minor/patch updates confined to dependency manifests or Actions workflows. New high/critical vulnerabilities block approval. Major upgrades, maintainer changes, and other file changes need manual review.

Eligible updates are squash-merged into `dev` after its required up-to-date `check` passes. Test the development deployment, then release through a PR into `main`. This is a dependency policy and CI review; it does not provide an AI review of application behavior.

To activate auto-merge in another repository, enable **Allow auto-merge** and **Allow GitHub Actions to create and approve pull requests** in its settings. Import the [development ruleset](.github/rulesets/dev.json) to require the GitHub Actions `check` status and an up-to-date branch before merging. The workflow verifies that ruleset before enabling auto-merge. It reads GitHub metadata without checking out or executing PR code and uses the built-in `GITHUB_TOKEN`.

GitHub reads this configuration from the default branch (`main`). Publish it there and keep `dev` current with the application changes to activate updates. See the [Dependabot configuration reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).

## Modules and contracts

- `src/content/schemas.ts`: strict Zod contracts and inferred TypeScript types, including manifests, snapshots, cases, stages, pools, and session records.
- `src/content/loader.ts`: reader-injected JSON loader. Terminal and browser adapters read disk files or static JSON assets. Manifest paths are relative to the data root.
- `src/content/validate.ts`: reference integrity, dates, document conditions, itinerary scope, evidence reachability, verification metadata, and daily pool feasibility.
- `src/content/library.ts`: frozen release index, archived content loading, and UTC daily release boundaries.
- `src/core/engine.ts`: pure session creation, player-facing evidence projection, and reducer. No browser, clock, storage, network, or React dependency.
- `src/core/scoring.ts`: configurable deterministic scoring.
- `src/core/daily.ts`: versioned deterministic selection and explicit fixture opt-in.
- `src/storage/progress.ts`: versioned localStorage adapter and recovery through deterministic engine replay.
- `src/storage/daily-results.ts`: first-completion history, matching-release review, and retention when archives are unavailable.
- `src/ui/`: terminal navigation, shift briefings, readable document cards, mobile desk panels, scoped/searchable reference, feedback, and shift reports.
- `public/art/`: original generated terminal backdrop and its [generation prompt/provenance](public/art/terminal-sunset.provenance.json). `public/fonts/` contains locally served DM Sans and Silkscreen plus their OFL licenses; play needs no third-party asset requests.
- `public/data/`: independently editable JSON fixtures. `scripts/` contains validation and terminal adapters; `tests/` contains acceptance and regression coverage.

Each passenger has possessed documents, initially presented IDs, offered deterministic questions, and one or more evidence-backed resolution paths. A correct disposition requires the expected decision **and** a fulfilled path. Required questions can record facts even when they reveal no document. Inspection and reference lookup are recorded but do not impose extra grading requirements.

The reducer rejects unknown actions, hidden-document inspection, premature progression, and changes after submission. Repeated inquiries, inspections, and reference opens are idempotent. Feedback records the case version, rule snapshot, submitted and expected decisions, missing evidence/inquiries, rationale, rule IDs, and score breakdown. The player-facing projection omits unrevealed documents and solution details; static files remain inspectable, as accepted in the handoff.

Sessions carry schema/content versions. Stage progress uses `air-beluga:progress:<stage-id>`; daily progress uses `air-beluga:daily-progress:<full-challenge-id>`, both with `storageVersion: 1`. Recovery validates the record and replays decisions, inquiries, inspections, and rule opens through the matching engine/content. It recomputes evidence and scores instead of trusting inconsistent saved values. Unknown progress versions produce a visible fresh-start option; no migration is defined yet. Blocked storage leaves the in-memory game playable.

Daily first completions are stored independently at `air-beluga:daily-results:v1`. They retain their original content/algorithm versions, case versions, rule snapshots, explanations, timestamp, and scores. Replays do not replace them. History loads the corresponding immutable release rather than using today's rules. Missing archives or unreadable history keep the original records and display a recovery message. This is local browser history, not cross-device storage or a competitive leaderboard.

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

The manifest config awards 100 for a correct disposition, 15 for appropriate inquiry behavior, and up to 10 for efficiency per passenger: 1,000 for an ideal eight-passenger stage, or 750 for a six-passenger daily. A correct evidence-backed path earns inquiry credit, including when no inquiry was needed. The twelve-passenger document-curveball practice shift has a maximum of 1,500 points. Justified questions/checks cost nothing; each distinct unnecessary question reduces efficiency by 2, down to zero. An incorrect or premature decision earns zero. Scores change only when a decision is committed.

## Daily selection contract

The original daily pool contains twelve reviewed Canadian cases. From 2026-10-27 UTC, the document-curveball pool selects six from ten harder cases, including at least three HARD cases and at least four DENY/ESCALATE outcomes. Both pools exclude illustrative content; historical dates retain their original pool and content release. The illustrative pool remains test-only and requires `{ allowIllustrative: true }`; no browser mode opts into it. Legacy regression tests stay pinned to the original frozen fixture release. The selection date never changes a case's authored travel date.

Algorithm version: `fnv1a32-mulberry32-v1`.

1. Validate the explicit `YYYY-MM-DD` UTC date and pool constraints.
2. Encode `JSON.stringify([dailyAlgorithmVersion, contentVersion, poolId, utcDate])` as UTF-8 and hash it with unsigned 32-bit FNV-1a (`0x811c9dc5` offset, `0x01000193` multiplier).
3. Use that seed for Mulberry32. Sort case IDs by JavaScript code-unit order before each initial shuffle. Use Fisher–Yates with `floor(random * (index + 1))`.
4. Visit EASY, MEDIUM, HARD in that order, shuffle each bucket, and take its minimum count. Shuffle remaining candidates, filling to the daily count without exceeding bucket maxima. Finally shuffle the chosen cases.
5. Return the ordered IDs and a challenge ID containing algorithm version, content version, pool ID, and UTC date. Impossible constraints and duplicate IDs throw; no random fallback exists.

Callers derive the day with `utcDate(new Date())`; the selector itself never reads the clock. Changing file order or local timezone cannot change a selection. A daily session recomputes the expected selection before accepting it. `releases.json` assigns each UTC day to a frozen release using ordered publication boundaries, beginning 2026-10-25. Earlier dates have no public daily; no illustrative fallback is generated.

## Content changes

Edit static JSON and run validation/tests. Each new asset must have a matching manifest ID/path. Keep document IDs unique within a case and rule IDs unique within a snapshot. Required evidence must be initially presented or revealed by the path's required questions. Check-in paths may not depend on expired, not-yet-valid, or exhausted evidence. Invalid documents are allowed as deliberate evidence in denial cases.

Illustrative records must carry `ILLUSTRATIVE_ONLY` and the exact fixture notice. A `VERIFIED` case requires explicit assumptions, a recorded reviewer/method/notes, and a source-reviewed snapshot with HTTPS source URLs, publishers, verification dates, and effective dates when known. Rules carry explicit departure, destination, and transit scope. Metadata checks cannot prove a legal interpretation; read and document the sources, identify agent reviews honestly, and do not imply independent human approval or promote fixtures by changing status fields alone.

Bump `contentVersion` whenever published content or scoring changes, bump changed case versions, and assign a new snapshot ID to changed rules. Run `npm run content:freeze`, add its immutable bundle/hash to the release index, and schedule updates at a future UTC boundary. Validation checks every release hash and the current source/bundle match. Never edit a published bundle or earlier daily boundary in place. Bump `dailyAlgorithmVersion` for selection behavior changes. Follow the complete [authoring workflow](docs/content-authoring.md) when adding jurisdictions or updating requirements.

Tool documentation: [Vite](https://vite.dev/guide/), [Vitest](https://vitest.dev/guide/), [Zod](https://zod.dev/basics).
