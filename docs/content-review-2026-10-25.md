# Canadian content source review — 2026-10-25 UTC

Scope: adult passengers on a direct commercial SFO–YVR flight with an authored travel date of 2026-10-25. Identities and document values are fictional. Routine identity, authenticity, booking, US departure, and other non-disputed checks are explicitly stipulated satisfied in the player-visible case facts. Cases concern airline travel-document acceptance, not a promise of admission to Canada.

Reviewer: **Codex, official-source cross-check**. Each cited publication was read during this implementation. This is not independent human, legal-professional, government, or airline endorsement. `VERIFIED` is the game's source-reviewed content status, not certification for real journeys.

## Primary publications

- S1: [IRCC country/territory requirements](https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html). Checked the named nationality lists and applicable status exceptions.
- S2: [IRCC eTA eligibility](https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta/eligibility.html). Page update displayed as 2026-08-06; explicit US permanent-resident eTA exemption date is 2022-04-26.
- S3: [IRCC eTA facts](https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta/facts.html). Page update displayed as 2024-04-23. Checked electronic passport linkage and the airline's status check; an approval printout is not the travel evidence being requested.
- S4: [IRCC visitor visa document](https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/about-visitor-visa.html). Checked valid visitor permission and the distinction between document validity and border admission.
- S5: [IRCC permanent residents travelling outside Canada](https://www.canada.ca/en/immigration-refugees-citizenship/services/permanent-residents/travel-outside-canada.html). Page update displayed as 2025-08-07. Review limited to the commercial-air return, not the separate private-vehicle rules.
- S6: [IRCC permanent resident travel document](https://www.canada.ca/en/immigration-refugees-citizenship/services/permanent-residents/travel-document.html). Checked the already-issued, unused PRTD scenario; no case treats an application as an approval.
- S7: [IRCC students returning after travel](https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/travel-outside-canada.html). Page update displayed as 2026-08-28. Checked the restricted US-only return circumstances and authorized-stay deadline, including their absence after visiting Japan.
- S8: [IRCC study-permit travel FAQ](https://www.ircc.canada.ca/english/helpcentre/answer.asp?qnum=494&top=22). Cross-check of the ordinary distinction between a study permit and travel permission.

Access/verification date for every source: **2026-10-25 UTC**. Publication update dates are stored separately from legal effective dates. Unknown general effective dates are omitted; the snapshot asserts only the rules checked for its authored date. Summaries are original paraphrases with direct links, not a reproduced travel database.

## Reviewed solutions

| Case   | Expected disposition | Required evidence/inquiry and review finding                                                                                                                                                            | Sources    |
| ------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| ca-001 | CHECK_IN             | Presented US passport; no outstanding inquiry.                                                                                                                                                          | S2         |
| ca-002 | CHECK_IN             | British-citizen passport and already-confirmed matching electronic record.                                                                                                                              | S1–S3      |
| ca-003 | CHECK_IN             | Run the offered carrier check; accept only after its matching approved record is revealed. The optional residence question is unnecessary.                                                              | S1–S3      |
| ca-004 | DENY                 | Check the replacement passport. The result resolves the outstanding inquiry and establishes that the previous approval cannot support this passport; no alternative is available.                       | S1–S3      |
| ca-005 | CHECK_IN             | Indian passport with current visitor permission presented initially.                                                                                                                                    | S1, S4     |
| ca-006 | CHECK_IN             | Request and receive the current visa for the mainland Chinese passport. Premature check-in is incorrect.                                                                                                | S1, S4     |
| ca-007 | DENY                 | Ask about Canadian travel permission first. No status exception, extra nationality, or obtainable permission remains.                                                                                   | S1, S4     |
| ca-008 | DENY                 | Clarify the trip and missing replacement permission. Japan was visited as well as the US, so the narrow US-only circumstances are absent.                                                               | S1, S7, S8 |
| ca-009 | CHECK_IN             | Request the current US resident card and inspect it alongside the nationality passport.                                                                                                                 | S1, S2     |
| ca-010 | CHECK_IN             | Request the Canadian PR card; visitor permission is not substituted for the declared resident status.                                                                                                   | S2, S5     |
| ca-011 | CHECK_IN             | Request the actual issued PRTD, with its unused entry, alongside the passport.                                                                                                                          | S5, S6     |
| ca-012 | CHECK_IN             | Clarify that only the US was visited, with the study permit issued before departure and return before the authorized stay ends. The expired visa is deliberate context, not required positive evidence. | S7, S8     |

Each case has one reachable resolution path. Inquiries that establish absence or trip history are required even when they reveal no additional document. The engine tests exercise all twelve solutions and premature decisions. There is no source-reviewed escalation case in this release: the authored facts are resolvable, so escalation must not become a generic fallback. The illustrative tutorial retains its explicitly invented escalation exercise.

Any change to an exception, document condition, itinerary, or reviewed outcome requires a new case version and a new content release. Preserve `canada-rules-2026-10-25-v1` and the frozen release bundle for historical results.
