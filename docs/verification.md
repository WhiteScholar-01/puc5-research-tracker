# SDD ledger — plan: docs/superpowers/plans/2026-10-18-shared-tracker-plan.md
Pre-flight: Task 1 -> Tasks 2/3: catalog IDs and editable fields align.
Pre-flight: Task 2 -> Task 3: store conflict and session contracts align.
Pre-flight: Tasks 1/2/3 -> Task 4: site packaging changes imports. Use site/ from the outset to avoid a gratuitous move.
Ruling: Use the already isolated, newly created tracker repository on feature/shared-tracker; no additional checkout — no existing product work is present — cost if wrong: branch isolation only, no second checkout.
Ruling: Use PowerShell ledger and Node test commands in place of POSIX bookkeeping scripts — Windows host — same commit/test evidence retained.
Ruling: Use memory-only auth storage to avoid persistent bearer tokens in browser storage — static hosting has no secure cookie backend — members must sign in again after reload.
Task 1: in progress.
Task 1: complete (9 tests passed; original 74 tasks in 9 phases preserved; missing-module RED then 9/9 GREEN). Ruling: Node 20 does not expand test wildcards; use node --test discovery.
Task 2: storage/schema implemented; 15/15 Node tests pass after store missing-module RED. Live Supabase checks pending project setup; adding local database execution checks before final review.
Task 2: complete (actual PostgreSQL tests via PGlite: signed-out/outsider denial, member reads/writes, no self-enrollment, conflict checks, invalid dates, spoofed identity, atomic restore, removed-member denial).
Task 3: complete (29/29 Node/Postgres checks; automated browser checks pass for preview, filters, collapse, theme, mobile overflow, recovery errors, sign-in, failed save/draft retention, conflict reconciliation, XSS safe text, export, malformed import, sign-out). Desktop/mobile screenshots visually inspected.
Task 4: packaging ready; final review and publication pending.
Ruling: Build and test locally; publish a read-only preview now, connect Supabase later — user's explicit steering — cost: live team editing remains unavailable until account setup.
Ruling: Keep research plan/catalog public as approved; database task notes remain member-only when configured. All 74 original tasks preserved.
Ruling: Test imports and role rules in real embedded PostgreSQL, using an auth.uid stub — no live project exists yet — cost: Supabase Auth/email and multi-connection behavior still need hosted validation.
Ruling: Test search using a specific Gate A phrase — generic gate also correctly matches gate drivers and gate drive. Browser test navigation for expired links uses a fresh document rather than an in-page fragment jump.
Ruling: Use fileURLToPath for screenshot artifacts — URL pathname encoded spaces on Windows — no product behavior changed.
Final review: independent fresh-context reviewer found three connected-mode issues; preview safe to publish.
Final: fixed transient auth failure clearing drafts — temporary-auth-outage and server-outage tests RED→GREEN; full suite 32/32.
Final: fixed conflict rebase overwriting unseen newer edits — displayed-version regression RED→GREEN; full suite 32/32.
Final: fixed editing/closing during pending save — delayed-save browser regression RED→GREEN; full browser suite passes.
Final: minor (deferred): Sign-out leaves previous generic sync timestamp in footer. No task content remains.
Final: minor (deferred): Preview status/priority filters use default pending/normal state and can yield empty results. Preview banner states shared progress is unavailable.
Final: Ruling: Hosted Auth/email, redirects and real multi-connection concurrency require a configured project — keep unverified as the user chose preview-first — cost: shared operation cannot be claimed until those checks run.
Final: Ruling: No full-page-reload draft persistence; sessions and drafts stay in memory — static hosting avoids persistent auth tokens — cost: reloading requires sign-in and discards unsaved drafts; normal background refresh preserves them.
Final: Ruling: GitHub publishing is already explicitly authorized; use main as the new isolated repository's deployment branch without another integration-choice prompt — cost: website/catalog become public as approved.
