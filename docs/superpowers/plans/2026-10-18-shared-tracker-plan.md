# Shared PUC5 Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the existing PUC5 research tracker as an invited-member website with shared task progress.

**Architecture:** Static HTML/CSS/JavaScript on GitHub Pages. Supabase provides email/password authentication, a membership table and versioned task records. Database policies enforce member access independently of the interface.

**Tech Stack:** Browser ES modules, Supabase JavaScript client pinned to an exact version verified at implementation, Postgres, Node built-in test runner, GitHub Actions.

**Spec:** ../specs/2026-10-18-shared-tracker-design.md

## Global Constraints
- Preserve all nine phases and all original research task wording.
- The existing HTML remains intact as a source backup.
- One research team and one tracker initially.
- Only invited members can read or edit shared progress.
- Never include database passwords, service-role keys or GitHub credentials in website files.
- Original browser progress is not silently published or cleared.
- Show saved status only after server confirmation.
- Prevent overlapping refreshes and preserve unsaved form text.
- Do not upload the surrounding research folder.
- Local files alone do not count as deployed or shared functionality.

## Review Focus
1. A signed-in outsider or removed member must be denied reads and writes by the database.
2. A second member saving an old version must receive a conflict, without losing their draft.
3. An import containing one invalid record must change zero records.
4. A refresh or failed network request must preserve unsaved editor values.
5. An expired or invalid invitation/recovery link must show a recoverable error without exposing records.

## Task 1: Preserve the catalog and implement validated data helpers

**Files:** Create catalog.js, validation.js, package.json, tests/validation.test.js, tests/catalog.test.js.

**Interfaces:** catalog.js exports PHASES and TASKS, with IDs `phaseIndex-taskIndex`. validation.js exports summarize(tasks), filterTasks(tasks, filters), validateImport(value, allowedIds), migrateLegacy(value, allowedIds), and toCsv(tasks). A task contains id, title, phaseId, status, priority, dueDate, notes, assigneeId, version, updatedAt and updatedBy. Status is pending, in-progress or completed. Priority is low, normal or high. Filters contain query, phaseId, status and priority. Backup envelope is {format: 'puc5-tracker', version: 1, tasks: [...]}.

- [ ] Write failing tests for original catalog equality, totals, phase counts, local-calendar overdue calculations, combined filters, invalid status/priority/date, unknown or duplicate IDs, invalid assignee types and malformed backups. Reject dates such as February 30 by round-tripping year/month/day. Limit notes to 10,000 characters and imports to 1 MB. Add CSV tests for commas, quotes, newlines and spreadsheet formula prefixes.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateImport} from '../validation.js';
test('unknown task IDs are rejected', () => {
  assert.throws(() => validateImport({format:'puc5-tracker',version:1,
    tasks:[{id:'unknown',status:'completed'}]}, new Set(['0-0'])));
});
```

- [ ] Run `node --test` and confirm failure before implementing the helpers.
- [ ] Extract P from the original HTML as data, retaining exact text/order. Implement pure helpers with explicit field allowlists. Legacy import accepts only known IDs mapped to booleans; absent IDs remain unchanged. JSON export contains a full snapshot of editable fields. CSV escapes quotes and prefixes formula-like cells with an apostrophe.
- [ ] Run `node --test`, confirm all tests pass and commit catalog/helpers/tests.

## Task 2: Enforce invited membership and atomic shared edits

**Files:** Create supabase/schema.sql, store.js, config.example.js, tests/access-control.sql, tests/store.test.js.

**Interfaces:** store.js exports createStore(config), returning signIn(email,password), signOut(), requestRecovery(email,redirectUrl), setPassword(password), getSession(), loadTracker(), saveTask(id, expectedVersion, fields), restoreTasks(records), and onAuthChange(callback). loadTracker returns {tasks, members}. saveTask returns the saved record or throws a typed ConflictError. restoreTasks returns only after a successful atomic transaction.

- [ ] Write failing store tests using an injected fake Supabase client: signed-out load denied; database errors propagated; version conflicts distinguished from network failures; save resolves only after a confirmed database response. SQL tests use distinct owner/member/outsider identities and verify anonymous denial, member access, outsider denial, self-enrollment denial, removed-member denial, and inability to spoof updater identity.
- [ ] Run the Node tests and record the failures.
- [ ] Create members(user_id, display_name) and task_state(id, status, priority, due_date, notes, assignee_id, version, updated_at, updated_by). Constrain IDs to the catalog and assignees to members. Seed one row for each task. Use row-level security on both tables. Provide a membership-check function with a fixed search_path and restricted privileges, avoiding recursive policies. Clients can read as members; membership writes are restricted to database administration.
- [ ] Implement save_task as a database transaction that checks auth.uid(), membership and expected version, locks the row, validates fields, writes authenticated updater/time and increments version. Restrict direct table writes. Implement restore_tasks with equivalent validation and version checks for every row before any update; rollback everything on error. Revoke default function execution from public/anonymous roles and grant only intended authenticated calls. Ensure authenticated users cannot invoke privileged membership changes.
- [ ] Implement store methods using these functions and browser-safe configuration. Do not log passwords or tokens. Disable public signup in documented setup. Test invitation/password recovery using the SDK session handling and explicit expired-link feedback.
- [ ] Run Node tests and run SQL authorization tests against a disposable configured project if available. Mark live checks pending if no database is connected. Commit the storage and schema changes.

## Task 3: Build the responsive research dashboard and shared editor

**Files:** Create index.html, styles.css, app.js, tests/ui-checklist.md; extend tests/validation.test.js for filters and metrics.

**Interfaces:** app.js consumes TASKS, pure helpers and createStore. Only one editor draft is active at a time. Store reads populate a saved-state map; editor draft values live separately. Refresh never replaces an open draft. Store output is merged with catalog content by stable ID.

- [ ] Add failing helper tests for partial shared state, missing due dates, completed overdue tasks and combined phase/status/query/priority filters. Add UI verification steps for hostile notes, keyboard navigation, 360px layout, edit conflicts, network failures and expired recovery links.

```js
import {summarize} from '../validation.js';
test('completed tasks are not overdue', () => {
  const result = summarize([{id:'0-0',status:'completed',dueDate:'2000-01-01'}]);
  assert.equal(result.overdue, 0);
});
```

- [ ] Run tests and confirm the new assertions fail before implementing their behavior.
- [ ] Build sign-in, recovery and password setup forms; show configuration instructions when no project is configured. Never simulate shared saves in an unconfigured application.
- [ ] Build dashboard totals, phase progress bars, search, filters, collapsible sections, gate badges and task editor. Use textContent for all user content. Associate every input with a label, use semantic buttons and dialog focus management, and expose save/error messages via a live region. Respect reduced motion and theme preference.
- [ ] Add JSON/CSV downloads, validated confirmed restore and explicit legacy JSON import. Explain how to export the original browser state without clearing it. Preserve imported expected versions and reject stale backup conflicts without partial writes.
- [ ] Refresh every 30 seconds while visible, skip overlapping requests, refresh on return to the tab and after saves, and preserve drafts. On a version conflict show the latest saved state next to the retained draft; require a deliberate retry using the new version. Clear cached shared state on sign-out or revoked membership.
- [ ] Run Node tests and browser checks, record results, fix issues and commit the dashboard.

## Task 4: Package, review and publish the website

**Files:** Create README.md, .gitignore, .github/workflows/pages.yml and deployment configuration; keep production browser files in a dedicated site/ directory at packaging time, updating relative test imports accordingly. Copy config.example.js to site/config.js with empty public values until configured.

**Interfaces:** GitHub Pages deployment artifact contains only site/. Supabase URL and publishable key are public browser configuration; no privileged secrets enter this artifact. Pages URL is also the configured auth site/redirect URL.

- [ ] Document exact setup: create Supabase project; run schema.sql; disable public signup; configure site URL/redirect allowlist; invite owner/member; insert auth user IDs and display names through the SQL editor; fill public project URL/key; test sign-in, recovery and membership. Explain public catalog versus private shared records and JSON backup restore conflicts.
- [ ] Add workflow using checkout, configure-pages, upload-pages-artifact and deploy-pages. Grant contents:read, pages:write and id-token:write; use the github-pages environment and deployment concurrency. Verify current official action versions before pinning. Upload only site/.
- [ ] Verify package contents contain no unrelated research files or credentials; run `node --test`; inspect browser at desktop and mobile widths; review authorization rules, stored/user input handling and deployment paths. Record all unrun live checks honestly.
- [ ] Renew GitHub authentication through the user's secure login. Confirm account and intended repository name `puc5-research-tracker`; if it already exists, inspect it before any change. Create a public repository only for the approved website/catalog. Push the dedicated repository, enable Pages and inspect the workflow result.
- [ ] Verify the deployed URL loads and test configured member access with the user. Report the URL only once deployment succeeds. If account setup is unavailable, deliver the reviewed local files and list the exact remaining setup without claiming deployment.
- [ ] Commit verified changes and report test evidence and any unresolved external setup.

## Execution handoff
The tasks share a small set of interfaces, so native execution in this chat is recommended. Review the plan before execution. A fresh final reviewer checks the whole implementation. No external publication or database account creation has occurred during planning.
