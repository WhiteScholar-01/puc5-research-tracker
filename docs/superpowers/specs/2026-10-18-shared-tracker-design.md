# PUC5 shared research tracker design

Date: 2026-10-18

## Intended outcome
Upgrade the existing PUC5 research checklist into a mobile-friendly website where the owner and invited research members update the same progress. Publish the application on GitHub Pages. Preserve all nine phases and all original research task wording. The existing HTML remains intact as a source backup.

## Architecture
Use a static HTML, CSS and JavaScript application hosted on GitHub Pages, with Supabase Auth and Postgres for shared storage. This adds authentication and storage to the original browser-only application. Use a browser-safe publishable key, with database row-level security enforcing membership. Never include database passwords, service-role keys or GitHub credentials in website files.

## Member access
One research team and one tracker initially. Only invited members can read or edit shared progress. The owner invites members through the Supabase dashboard and adds their authenticated user IDs to the membership table. Disable public signup. Use email/password sign-in, recovery and password setup for invited accounts, with redirects configured for the deployed website. Membership administration remains outside the website for this version.

## Features
- Dashboard: completed, in-progress, pending and overdue totals; overall progress and per-phase counts.
- Search task text and notes; filter by phase, status and priority.
- Collapsible phases; retain the original week ranges and distinguish Gate A and Gate B.
- Task editing: pending/in-progress/completed status, notes, priority, due date and optional assignee from team members.
- Show last update time and member identity for each task.
- Light/dark theme, keyboard-accessible controls and responsive layout.
- Export shared task state as JSON and CSV. JSON restore validates the complete file before updating shared tasks, requires confirmation, and reports failures without claiming success.
- An explicit import action can migrate an exported original checklist using its existing phase/task index mapping. Original browser progress is not silently published or cleared.

## Data and updates
Ship the unchanged research task catalog with stable phase/task IDs. Store mutable fields per task in Postgres. Store memberships separately; clients cannot add or promote themselves. Use row-level security on every exposed table. Members may read the member display names and task state for their team and edit task state; they cannot change membership. Database functions/triggers record authenticated updater and timestamps rather than trusting client-provided identity.

Use a version number per task and conditional updates to detect simultaneous edits. If a version has changed, show the current saved version and ask the user to reconcile their edit. Refresh shared data periodically while the page is visible and after successful updates. Prevent overlapping refreshes and preserve unsaved form text. Do not promise offline edits: connection failures retain unsaved form values and show a retry message. Show saved status only after server confirmation.

## Project layout
index.html: accessible application shell.
styles.css: responsive layout and themes.
catalog.js: original task catalog.
app.js: rendering, filters and task editor.
store.js: authentication, authorized reads and conditional writes.
validation.js: import validation and pure data helpers.
supabase/schema.sql: tables, policies and update logic.
.github/workflows/pages.yml: publish the static website only.
README.md: database setup, invitations, configuration, recovery and publishing.
tests/: validation and authorization test procedures.

## Verification
Test task counts against the source, progress calculations, filtering, hostile note rendering, malformed imports, unknown task IDs and CSV escaping. Verify keyboard use and narrow-screen layout in a browser. Exercise signed-out denial, invited-member access, outsider denial, self-enrollment denial, conflicting edits and failed-network saves against a configured database. Verify published site and sign-in redirect only after deployment. Report database-dependent checks as unrun if no project is connected.

## Deployment requirements
Create an isolated tracker repository containing only website files and setup materials; do not upload the surrounding research folder. GitHub Pages hosts application files and the research catalog publicly; shared notes and task state require membership. Restore GitHub authentication before pushing. Obtain a Supabase project URL and browser publishable key, apply the schema, configure the owner and invitations, then set the deployed site URL for auth redirects. Never request private keys in chat.

## Acceptance
Original research content is preserved; invited members see one saved task state; outsiders cannot access shared records; edits and errors are clearly reported; backup/restore works; the website is usable on mobile and published with a verified URL. Local files alone do not count as deployed or shared functionality.
