# Browser verification

Verified with installed Chrome at 1440 x 1100 and 360 x 900.

- [x] 74 tasks and nine phases; source equality asserted separately.
- [x] Search, clear filters, phase collapse/expand.
- [x] Light/dark theme; desktop/mobile screenshots inspected.
- [x] No horizontal overflow at 360 pixels.
- [x] Dialogs open and Escape closes them; Escape blocked during pending save.
- [x] Expired link presents a recovery message.
- [x] Sign-in path through a test SDK network boundary.
- [x] Failed save preserves notes.
- [x] Conflict displays saved values and retains draft.
- [x] Inputs and close controls freeze during outstanding saves.
- [x] Mark completed updates metrics after confirmed save.
- [x] Hostile notes render as text; no injected image element.
- [x] JSON backup downloads all 74 records.
- [x] Malformed import rejected.
- [x] Sign-out removes private notes and closes the editor.
- [ ] Hosted Supabase invite/recovery emails and redirects (project not connected).
- [ ] Real hosted multi-member synchronization (project not connected).

See docs/verification.md for implementation decisions, review fixes and deferred minor issues.
