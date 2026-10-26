# Authoring and publishing cases

Air Beluga grades authored, finite evidence paths. It does not calculate general immigration eligibility. Keep each case narrow enough to check against primary government publications and expose every fact needed to resolve it.

## Design a challenging stage

This is standing guidance for future stage generation. Curate a puzzle queue rather than simulate the frequency of eligible passengers at a real airport. The owner explicitly prefers more DENY and ESCALATE decisions than straightforward check-ins.

1. Build a rule/document coverage matrix before writing passengers. Enumerate relevant citizenships, ordinary and special passport categories, substitute travel documents, residence statuses, permission types, validity dates, document links, entry counts, destinations, transit modes and ticket arrangements. Follow exceptions to the baseline rules. Record why inapplicable or unsupported combinations are excluded; exhaustive exploration means an auditable search of the stage's scope, not a claim to model every traveller worldwide.
2. Seek interactions, not just more nationalities. Cover meaningful pairs and higher-order combinations where they change the result: identity versus status, U.S. visa versus U.S. permanent residence, expired card versus qualifying extension, electronic versus temporary passport, visa expiry versus passport validity, accreditation versus official-business fee relief, and route-dependent return/transit exceptions. Prefer near-neighbour cases that differ in one decisive fact. Avoid passengers that repeat the same reasoning with only names changed.
3. Give every candidate a learning objective, relevant rules, initially visible evidence, obtainable evidence, decisive question/check and justified outcome. Keep a few positive exceptions among the traps. Shuffle order so document category, nationality or position cannot substitute for reading the evidence. Clues should prompt investigation without announcing the answer.
4. For challenge shifts, aim for roughly one third CHECK_IN, with the remainder divided meaningfully between DENY and ESCALATE. This ratio is an editorial starting point, not an owner-mandated exact quota; tutorials may be easier. Review outcome balance for the actual queue and daily sampler, not just the entire library. Avoid making escalation a universal safe answer or revealing outcome quotas in the player briefing.
5. Distinguish outcomes precisely. CHECK_IN requires complete sufficient evidence. DENY requires a determinate failure after all relevant obtainable alternatives are resolved. ESCALATE requires a specific material conflict or verification gap that remains after the available checks; mere unfamiliarity, rarity or a missing question is insufficient. Explain fictional airline escalation procedures separately from government travel requirements. Do not invent legal restrictions to increase the rejection rate.
6. Audit coverage and balance before freezing. Exercise every authored resolution path, premature and wrong decisions, unnecessary inquiries and plausible alternative evidence. Check the daily generator across representative dates and verify that old archived puzzles retain their answers. Record coverage, outcome counts, source limits and deliberate omissions in the review ledger.

The document-curveball shift illustrates this approach with four CHECK_IN, five DENY and three ESCALATE cases. Its six-passenger daily pool includes only two CHECK_IN candidates, so every selection contains at least four DENY/ESCALATE outcomes without changing the existing selection algorithm. Two additional positive document-role examples remain available in the full practice shift.

## Review before marking VERIFIED

1. Fix the travel date, full itinerary, transport mode, ordinary/special passport category, citizenships, and relevant residence status. Explain which routine checks are stipulated satisfied. Do not conceal an exemption in an unbounded set of possible documents.
2. Read current official publications, including exceptions and cross-linked guidance. Record exact HTTPS URLs, publisher, UTC verification date, and known effective dates. `pageUpdatedDate` records publication metadata; it is **not** a legal effective date. Leave unknown effective dates unspecified.
3. Author your own brief rule summary. Link the source instead of copying its database or whole page. Every cited rule needs departure/destination/transit scope. A source-backed negative outcome needs exception checks as carefully as a positive one.
4. Use fictional identities and synthetic document numbers. Specify validity and relevant attributes: visa entries, resident status, eTA approval and linked passport, or an issued PRTD's unused entry. Do not turn an application receipt into travel authorization.
5. Separate documents held from documents presented. Offer at most five targeted inquiries/checks. Each resolution path lists both required presented evidence and required questions. A fact-only answer can be necessary even when no document is revealed.
6. Record `review.reviewer`, `review.reviewedDate`, `review.method`, and `review.notes`. Identify an agent source review honestly; never imply independent human or government approval. List case assumptions in player-visible text. Review ledgers cover the [original Canadian set](content-review-2026-10-25.md) and [document curveballs](content-review-2026-10-26.md).
7. Test every reachable solution and premature/wrong actions. Check passport/electronic-record matching, document dates, negative outcomes with outstanding obtainable evidence, and all exceptions used by the case. Exercise candidate cases with unit tests while authoring.
8. After source review and solution tests, mark the case and its rule snapshot `VERIFIED`, then follow the freeze/index workflow below. Publication still requires `npm run check` and the browser acceptance test against the frozen static build. Illustrative cases remain explicitly labeled and excluded from scheduled daily pools. If authoritative evidence is ambiguous, retain illustrative status and keep the case out of public daily play.

The current Canadian set was cross-checked by Codex against IRCC publications; no independent human or professional immigration review is claimed. A later editor should recheck sources and the ledger before extending the scope.

## Evidence model

`ELECTRONIC_AUTHORIZATION` is a simulated carrier status record. A Canadian eTA is not a paper document that the passenger must print. Set an inquiry's `kind` to `DOCUMENT_CHECK` for the simulated lookup; its result can reveal the record. No real carrier or immigration API is called. A successful eTA path must include the matching numbered passport and an approved record that does not outlive it.

`STUDY_PERMIT` and `PERMANENT_RESIDENT_TRAVEL_DOCUMENT` are explicit evidence types. Do not treat every residence or study document as a visa substitute. The authored conditions and cited exception decide the solution; the engine still checks only the declared evidence path.

`TRAVEL_DOCUMENT` represents a passport substitute, such as an I-571 refugee travel document or I-327 re-entry permit. It is distinct from both a national `PASSPORT` and `PERMANENT_RESIDENT_TRAVEL_DOCUMENT` (a Canadian PRTD). Verified identity documents need synthetic numbers, and travel documents need a descriptive category. `documentCode` exposes a form identifier. Passport-only `passportKind` and optional `biometric` metadata make non-ordinary classifications inspectable without claiming automatic eligibility.

Every check-in evidence path must require a passport or travel document; visa/residence evidence alone cannot silently replace identity. A single document can fill multiple authored roles (the I-327 case), and an I-571 does not by itself prove U.S. LPR status. The validator checks structural completeness and dates, not general legal eligibility; verify each role against the cited rules. Do not require an unnecessary separate Green Card when an accepted equivalent already proves status.

Document holder names normally match the passenger. A deliberate mismatch is allowed only in an ESCALATE case, with the discrepancy visible and the failed attempt to resolve it included in the evidence path. Do not silently normalize a mismatch into a check-in or presume fraud from a spelling difference.

## Freeze and release

The authoring source is `public/data/manifest.json` plus its referenced JSON files. A release is a complete immutable `releases/<contentVersion>/bundle.json`, carrying its rule snapshots, cases, scoring, stages, and pools. `releases.json` records its SHA-256 digest and the UTC dates on which scheduled daily content changes.

For a content change:

1. Bump `manifest.contentVersion`. Bump each changed case's version and use a **new rule snapshot ID** for changed rules. Do not mutate an already-published bundle or overwrite its digest to hide an edit.
2. Update the authoring JSON and review ledger, run the unit tests, then run `npm run content:freeze`. The command creates a new bundle and prints its path/hash. It accepts an identical existing bundle but refuses to overwrite different bytes at the same version.
3. Add the printed entry to `public/data/releases.json`, set its current version, and append the new daily boundary. Use a future 00:00 UTC boundary for an update to an existing daily series. Keep earlier boundaries and all earlier bundles intact. The first series starts on 2026-10-25 UTC.
4. Run `npm run check`. Validation parses every archive, verifies hashes, compares the current authoring source with its frozen bundle, and tests scheduled pools without illustrative opt-ins. Do not format frozen bundle bytes; they are excluded from Prettier.
5. Run `npm run test:browser`, review the changed JSON and ledger, and publish the entire static data tree with the application. Preserve archive paths when deploying later versions.

The browser selects the last editorial boundary on or before a chosen UTC date, then applies the unchanged deterministic selector to that release. A later release cannot replace yesterday's answers just because it is now current. The daily selection date is distinct from each case's authored travel date, which always remains visible.

## Saved daily results

Daily progress uses a key containing the entire versioned challenge ID. Completed results are kept separately at `air-beluga:daily-results:v1`, including completion time and the complete session: content version, UTC day, pool, algorithm version, case versions, rule snapshot IDs, dispositions, explanations, and score breakdowns.

The first completion of an ID is retained; replaying does not overwrite it. History resolves the matching archived content and replays the recorded actions before showing the frozen result. It never grades an old result using the current rules or score configuration. Missing archives, unreadable/future records, or blocked storage produce a visible recovery message and preserve the original record. Results are local to this browser and can be inspected/edited; this is not a competitive leaderboard.
