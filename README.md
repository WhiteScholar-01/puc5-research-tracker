# PUC5 Research Workspace

A research tracker for the PUC5 digital twin project. Preserves all **74 tasks across nine phases** from the original checklist.

**Website:** https://whitescholar-01.github.io/puc5-research-tracker/

## Current setup

The website is a **read-only roadmap preview** until a Supabase project is connected. The original checklist remains available unchanged in `reference/original.html`. No team progress is fabricated or uploaded from your browser.

## Features

- Responsive dashboard, light/dark themes and per-phase progress.
- Search task titles and notes; filter by phase, status and priority.
- Collapsible phases and highlighted Gate A/Gate B milestones.
- When connected: invited-member sign-in and one shared tracker.
- Task status, priority, due date, assignee and research notes.
- Updated time/member, conflict detection, 30-second visible-page refresh.
- JSON backup, CSV export, atomic validated JSON restore and original-checklist import.

## Connect the shared workspace

1. Create a dedicated project at https://supabase.com/dashboard. Use the free plan if suitable. Choose and keep your database password privately; it is never needed by the website.
2. Open **SQL Editor**, create a query, paste the entire `supabase/schema.sql` file, and run it. This creates the memberships, 74 task records, access policies and checked update functions. The script can be rerun without resetting progress.
3. In **Authentication → Sign In / Providers**, disable **Allow new users to sign up**. Keep email/password sign-in enabled. In password security, require at least 12 characters. Dashboard labels may change.
4. In **Authentication → URL Configuration**, set **Site URL** to `https://whitescholar-01.github.io/puc5-research-tracker/` and add that exact URL to the allowed redirect URLs. Invitation and password recovery emails must return to this website. For local testing you may also explicitly allow `http://127.0.0.1:4173/`.
5. Open the project's **Connect** dialog or API settings. Copy the project URL and its **publishable** key (begins `sb_publishable_`). Never use the secret key, service-role key, database password or a GitHub token.
6. Edit `site/config.js`:

```js
export const CONFIG = {
  url: 'https://YOUR-PROJECT-REFERENCE.supabase.co',
  publishableKey: 'sb_publishable_YOUR_BROWSER_KEY'
};
```

7. Invite yourself and each member from **Authentication → Users → Invite user**. Copy each invited user's ID. In **Table Editor → members → Insert**, add their user ID as `user_id` and their chosen name as `display_name`. Invitation alone does not grant tracker membership. If invitation delivery is rate-limited, configure your own email provider following Supabase's documentation.
8. Commit and push the public configuration changes. Open the invitation link, set a password, and verify sign-in and task editing. Test with a second invited member and a signed-in account that is absent from `members`.

The publishable key is intended for browsers. Database row-level policies and restricted update functions enforce access; hiding the key is not the access control. The database setup is designed for this single research team.

### Invitations, recovery and membership

- Invited members set a password from the email link. Existing members can use **Forgot your password?** in the sign-in dialog.
- Sessions are kept in memory rather than persistent browser storage. Reloading the page requires sign-in again; this is intentional. Theme preference alone is stored locally.
- To remove a member, delete their row from `members`. The database immediately denies future reads/writes for that user. A page already showing previously downloaded data clears it on the next membership check (normally within 30 seconds). You can also revoke the user's sessions in Supabase Auth.
- Membership administration stays in the Supabase dashboard. Members cannot add or promote themselves through the website.
- Data is not saved offline. Failed saves retain the draft. A conflicting edit displays the latest saved values while keeping your draft; explicitly reconcile before saving again.

## Backups and original progress

**Backup** downloads the complete editable task state. **CSV** downloads a spreadsheet-friendly report. Keep backups private if they contain private research notes.

**Import → Website JSON backup** validates the file before a database write and asks for confirmation. A single invalid record or version conflict cancels the entire transaction. Backups retain versions: an older backup will intentionally conflict with subsequent changes. Do not edit version numbers to force an overwrite without comparing current records.

To migrate original browser-only progress, open the original HTML in the browser/profile where you used it. Open Developer Tools → Console and run this export command:

```js
const progress = localStorage.getItem('puc5tracker.v3') || '{}';
const url = URL.createObjectURL(new Blob([progress], {type:'application/json'}));
const link = document.createElement('a');
link.href = url; link.download = 'puc5-original-progress.json'; link.click();
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

Then sign in to the new website, choose **Import → Original checklist JSON**, select the file, and confirm. Only tasks recorded in that file are migrated; notes and priorities are preserved. This does not clear the original local progress.

## Local preview and checks

Requires Node.js 20 or newer. No build step or runtime package install is needed for production. The Supabase browser SDK is pinned to version 2.118.0 and loaded only after configuration.

```sh
npm ci
npm test
npm run preview
```

Open http://127.0.0.1:4173/ while the preview command is running.

Optional browser checks (keep the preview running in a second terminal):

```sh
npx playwright install chromium
npm run test:browser
```

Set `BROWSER_PATH` to an installed Chrome/Edge executable to use it instead of Playwright Chromium. `PREVIEW_URL` can target another test server; browser fixtures intercept the SDK so these checks do not modify real shared records.

`npm test` runs pure data tests, storage boundary tests and actual PostgreSQL schema/policy/transaction checks through PGlite. Browser tests cover desktop/mobile overflow, search, collapse, themes, invalid recovery links, sign-in, failed saves, conflicts, safe text rendering, JSON backup, bad imports and sign-out. PGlite does not replace final hosted Supabase/Auth testing.

## GitHub Pages publishing

This repository contains only the tracker and its setup materials. The surrounding research directory is not uploaded. The Pages deployment artifact contains only `site/`.

1. Push to the repository's `main` branch.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. The Pages workflow runs Node/PostgreSQL tests, then publishes the static site.
4. Verify the Actions run succeeds and open the website above. Feature branches are not automatically published.

GitHub Pages publishes the website files and original research catalog publicly. Task notes, assignments and shared progress stay in Supabase behind member access once configured. The preview does not demonstrate live member synchronization until that project is connected.

## Reference documentation

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase API keys: https://supabase.com/docs/guides/api/api-keys
- Database access policies: https://supabase.com/docs/guides/database/postgres/row-level-security
- GitHub Pages workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
