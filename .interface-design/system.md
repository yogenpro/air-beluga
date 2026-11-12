# Air Beluga document UI

The user-approved UK BRP pixel redraw in `docs/design/uk-brp-approved-reference.png` establishes the style. Reference approval: user conversation, 2026-11-11. Make each issuer/form recognizable through composition and decoration; do not share a universal ID-card layout.

- Registry: `src/ui/documentDesigns.ts`. Renderer: `DocumentArtwork.tsx`. Styles: `document-art.css`.
- Pixel typography: bundled Silkscreen. Latin-localized headings only until additional script fonts are bundled. Explanatory text uses DM Sans.
- Country texture atlas: `public/art/documents/issuer-patterns-v1.png`, generated with built-in imagegen using the prompt in `docs/design/document-art-prompt.txt`. Columns 4, rows 3; GB, US, CA, IN / CN, FR, ID, RO / TH, JP, SG, HK. Crop with percentage background positioning and a small overscan to exclude faint atlas seams. Keep crisp image rendering. No passenger data in art.
- Depth: 2px document edge and 3px/4px offset shadow; booklet binding 7px; cards have 9px corners; paper forms and notices have square edges.
- Spacing: 8–16px internal gaps, 12–18px page padding. Fields use a two-column grid when the form supports it; narrow card data columns and paper reports have their own structures.
- Hierarchy: issuer at about .7em, document title 1.2em, field label .65em, value 1em. Responsive base 9–12px; enlarged viewer uses 16px values at 760px width with horizontal scrolling on mobile.
- Passport: booklet strip, issuer title, portrait at left, data page, decorative deliberately invalid reading band. Temporary/diplomatic/official classification remains actual authored evidence.
- Residence cards: UK low-left portrait, narrow center text, rose decoration right; US left portrait and wider two-column text; Canada bilingual heading and maple decoration. Each has a reverse. Do not add an electronic contact chip to US/Canadian cards.
- Visas: Canadian and US portrait at left; UK vignette portrait left; Japanese portrait right. Canadian PRTD remains distinct by its own title/entries, never a resident card.
- Papers: tall Canadian study permit, laboratory report with collection/report timestamps and no expiry, itinerary with reservation stub and no invented boarding data.
- Records: eTA simulated carrier screen, UK digital status screen, Hong Kong notification paper, Japan issuance notice or presented saved image, Singapore eVisa sheet and distinct declaration receipt. Never suggest real live verification.
- Values are selectable semantic HTML from original document data. Do not invent nationality, birth/issue date, serial, chip, seat, signature or legal status to fill layout space. Comparison badges belong in the separate inspection notes, not baked into the art.
- Every document says FICTIONAL GAME PROP / NOT VALID FOR TRAVEL. Decorative beluga emblems replace official seals. Avoid real security-feature replicas and valid machine-readable codes.
- Enlarge uses a native modal dialog; Escape and Close restore focus. Residence reverse is a button. Both work offline. Atlas preload in index.html preserves offline shifts.
- `npm run validate:content` gates source and archive profile coverage. New country/type/form combinations need a registry entry, layout/reference review and browser coverage before publication. See `docs/document-art-sources.md` and `docs/content-authoring.md`.
