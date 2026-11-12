# Air Beluga contributor guidance

When creating or expanding stages, follow [content-authoring.md](docs/content-authoring.md), especially its stage-design guidance. Explore rule/document combinations systematically before inventing passengers, and maintain a coverage matrix of the distinctions being tested.

Challenge stages should favor DENY and ESCALATE outcomes over CHECK_IN. Puzzle variety and reasoning difficulty take priority over realistic airport passenger frequencies. Keep each outcome justified: a confirmed rule failure supports denial; an unresolved material conflict after available checks supports escalation. Preserve useful positive exceptions so unfamiliar documents do not become an automatic rejection cue.

Source-review travel requirements, expose the evidence needed to solve every case, and label fictional airline procedures explicitly. Preserve published archives and past daily answers when adding content.

Historical themes must use the rules in force on their explicit travel date, with a separate present-day source-review date. Explore time zones, collection-versus-issue timestamps, test methods and provider constraints without importing current rules into old shifts or changing archived daily answers. See the historical-shift guidance in the authoring document.

Passenger documents must use country- and document-specific pixel-art layouts, following the user-approved UK biometric residence permit (BRP) reference as the visual standard. Keep them unmistakably fictional, with reusable artwork separate from passenger names, numbers and dates. Follow the document-art guidance in [content-authoring.md](docs/content-authoring.md#country-specific-pixel-art-documents): coordinate a renderer registry keyed by document type, issuing country and `attributes.documentCode`; review the correct issuer-era visual profile for every document in future authored shifts; preserve archived bundles and answers; and cover profile selection, readable evidence and archive compatibility in tests. Unfamiliar appearance alone never justifies denial or escalation.
