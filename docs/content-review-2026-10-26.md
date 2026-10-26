# Document curveballs — source review, 2026-10-26 UTC

Scope: twelve fictional adults on a direct commercial SFO–YVR flight, with an authored travel date of 2026-10-26. Authenticity, booking and unrelated carrier checks are stipulated satisfied. Identity linkage is deliberately unresolved in ca-017. These are finite airline-document puzzles; they do not calculate general immigration eligibility or guarantee border admission.

Reviewer: **Codex, official-source cross-check**. Publications below were read for this change. `VERIFIED` records that source review and the authored tests; it does not imply independent human, government or professional approval.

## Primary sources

- [IRCC country/document requirements](https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html): Indian/Chinese visitor requirements, Romanian non-electronic passports, status and accreditation exceptions. Page update: 2026-07-31.
- [IRCC eTA eligibility and U.S. LPR evidence](https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta/eligibility.html): identity plus status evidence; Green Cards, supported expired cards and I-327. Page update: 2026-08-06. The stated eTA exemption begins 2022-04-26.
- [IRCC accepted passports and travel documents](https://www.canada.ca/en/immigration-refugees-citizenship/services/passport-travel-document.html): document validity and recognition. Page update: 2025-01-14.
- [IRCC visitor-visa document list](https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/apply-visitor-visa.html): recognition of official/diplomatic passports, I-571 and I-327. Application guidance is used for document recognition, not to invent an additional boarding-validity period.
- [IRCC passport substitutes for U.S. LPRs](https://www.ircc.canada.ca/english/helpcentre/answer.asp?qnum=1117&top=23): I-571/I-327 identity substitutes and the separate list of accepted status proof. Page modified: 2026-09-28.
- [IRCC refugee-document eTA question](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1180&top=16): refugee travel documents generally require visas, with specified Canadian-document and U.S. LPR exceptions. Page modified: 2026-09-28.
- [IRCC diplomatic/official/service passports](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1019&top=16): passport category and official-business fee relief do not themselves remove visa requirements. Page modified: 2026-09-28.
- [IRCC diplomats and eTA](https://www.ircc.canada.ca/english/helpcentre/answer.asp?qnum=1119&top=16): Canadian accreditation is a separate exception.
- [CBSA Guide for Transporters](https://www.cbsa-asfc.gc.ca/trans/guide-eng.html): independently cross-checked refugee-document acceptance, I-327 as status proof and accreditation evidence. IRCC links are used in the in-game snapshot.

Verification date is 2026-10-26 throughout. Publication-update dates are metadata, not legal effective dates. Unknown effective dates remain unspecified.

## Authored dispositions

| Case   | Distinction                                                     | Resolution                                                                 |
| ------ | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ca-013 | Indian passport, initially hidden valid Green Card              | Request status proof; check in                                             |
| ca-014 | Chinese passport and current Green Card already presented       | Check in; no extra Canadian visa/eTA request                               |
| ca-015 | Indian passport and U.S. H-1B visa                              | Clarify LPR status and Canadian visa; deny on the authored negative facts  |
| ca-016 | Expired Green Card plus unreadable extension notice             | Verify notice and alternatives; escalate unresolved extension evidence     |
| ca-017 | I-571 and hidden Green Card with different holder names         | Request proof and check identity link; escalate unresolved discrepancy     |
| ca-018 | Non-LPR I-571 holder with expired Canadian visa                 | Request visa and rule out alternatives; deny                               |
| ca-019 | Non-LPR I-571 holder without Canadian visa                      | Resolve both inquiries; deny                                               |
| ca-020 | Valid I-327, no ordinary passport or separate Green Card        | Check in using its two documented evidence roles                           |
| ca-021 | Romanian non-electronic temporary passport with Canadian visa   | Check in                                                                   |
| ca-022 | Same passport category without visa or another exemption        | Clarify alternatives; deny                                                 |
| ca-023 | Indian diplomatic passport without visa/accreditation/exemption | Resolve both inquiries; deny                                               |
| ca-024 | Chinese official passport and unconfirmed accreditation claim   | Check visa, claim and accreditation records; escalate unresolved exemption |

## Interpretation limits

For ca-020, using I-327 for both identity and status is a combined reading of IRCC's accepted-substitute and status-proof lists, corroborated by CBSA. No extra Green Card requirement is invented. The passport-free LPR cases explicitly stipulate inability to obtain a national passport; they do not assert a general Syrian issuance policy.

The expired-card case does not claim that card expiry ends LPR status. Its unreadable notice cannot be matched to a qualifying petition/extension by the available check. It therefore leaves a material verification gap rather than establishing a definite refusal. Non-ordinary passports are neither universally rejected nor universally exempted. The Canadian-refugee-document exception is outside the U.S.-issued-document cases.

## Publication and regression scope

The original twelve reviewed cases, their source snapshot, and both earlier frozen bundles remain unchanged. The new practice shift contains all twelve additions. The new six-person daily pool contains ten of these additions, with at least three HARD cases and no more than two CHECK_IN candidates, beginning **2026-10-27 at 00:00 UTC**. Earlier days retain the original release and answers.

Unit tests exercise every correct disposition, wrong dispositions, premature action, hidden proof, document roles, dates, structural validation and the daily boundary. Browser acceptance covers the full harder shift, document metadata, offline play, reload, and the new daily selection. The freeze/index process retains original results and archives.

## Stage design and coverage audit

The owner requested a standing approach to future stages: systematically explore interesting rule/document interactions, and emphasize DENY/ESCALATE rather than realistic airport outcome frequencies. The authoring guide and repository AGENTS.md carry that direction forward. This shift has **4 CHECK_IN, 5 DENY and 3 ESCALATE** outcomes. The daily pool omits the two additional positive examples ca-020/021, which remain in practice, so every six-person daily has at least four DENY/ESCALATE decisions. The selector and historical daily outputs are unchanged.

| Dimension               | Combinations covered                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Identity versus status  | Indian/Chinese passport + Green Card; U.S. visa without LPR; I-571 with separate status claim; I-327 serving both roles |
| Status validity         | Current I-551; expired I-551 with an unreadable I-797 claim; attempted extension verification                           |
| Travel permission       | Exemption proved; no exemption; expired visa with alternatives ruled out; valid visa in a temporary passport            |
| Document classification | Ordinary, temporary non-electronic, diplomatic and official passports; I-571 and I-327 substitutes                      |
| Identity linkage        | Matching evidence versus differing holder names with no established link after inquiry                                  |
| Official status         | Diplomatic passport without accreditation; official passport with a claimed but unconfirmed accreditation               |
| Available evidence      | Sufficient initially presented proof; hidden proof revealed by a question; verification that remains inconclusive       |

Air Beluga's escalation procedure is **fictional carrier training policy**, stated in case assumptions and the reference. IRCC publications support the underlying document/permission distinctions; they do not prescribe the game's escalation outcomes. No fraud, status cancellation or inadmissibility is inferred from an unresolved check. Every escalation path includes the check that establishes why this desk cannot resolve it.

Deliberate exclusions: this release does not model connecting flights, landside transit, separate tickets, minors, emergency/service passports, Canadian-issued refugee documents, every nation's special-passport agreements, or every accepted extension/ADIT proof. These are future matrix dimensions requiring their own source review; no exhaustive worldwide coverage is claimed. Positive examples are retained to prevent unfamiliar documents from becoming a reliable refusal cue.
