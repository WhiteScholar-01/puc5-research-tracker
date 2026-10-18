# PUC5 Research Tracker

**Open the website:** https://whitescholar-01.github.io/puc5-research-tracker/

Anyone with the link can start using the tracker immediately. **No sign-in, account, database, or setup is required.**

## How to use it

- Click the circle next to a task to mark it complete or pending.
- Click a task title to edit its status, priority, due date, assignee name and notes.
- Search tasks and notes, filter the roadmap, collapse phases or switch between light/dark themes.
- Click **Backup** to download your progress as JSON, or **CSV** for a spreadsheet report.
- On another device, choose **Import → Website JSON backup** to load that progress.

All **74 original tasks and nine research phases** are preserved. The source checklist is kept unchanged in `reference/original.html`.

## Where progress is saved

Progress is stored in **this browser on this device**. It stays after closing and reopening the page. Everyone using the link has their own progress; edits do **not** automatically sync between members or devices. Use Backup/Import to share a snapshot. Clearing this website's browser data removes local progress, so keep a backup before doing that. Private browsing may discard data when its window closes.

The website sends no task notes or progress to a database or external service. GitHub hosts the static website and public research catalog. No backend configuration or API keys are needed.

Two tabs in the same browser share saved progress. The editor keeps its draft if another tab updates a task and asks you to reconcile a conflicting edit. Modern browsers use Web Locks to serialize writes. Browser storage failures show an error and retain the draft rather than claiming a successful save. If saved data is corrupted, Backup downloads the original recovery data without silently resetting it.

## Import the original checklist

Open the original HTML in the browser/profile where you used it. In Developer Tools → Console, run:

```js
const progress = localStorage.getItem('puc5tracker.v3') || '{}';
const url = URL.createObjectURL(new Blob([progress], {type:'application/json'}));
const link = document.createElement('a');
link.href = url; link.download = 'puc5-original-progress.json'; link.click();
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

On the website choose **Import → Original checklist JSON**. Only listed tasks change; notes and priorities are preserved. This does not clear the original browser's data.

## Development

Requires Node.js 20 or newer. Production is plain HTML/CSS/JavaScript with no external runtime dependencies or build step.

```sh
npm ci
npm test
npm run preview
```

Open http://127.0.0.1:4173/ while the preview is running. For browser checks, keep that preview running, then use a second terminal:

```sh
npx playwright install chromium
npm run test:browser
```

Alternatively set `BROWSER_PATH` to an installed Chrome/Edge executable. `PREVIEW_URL` can point to another preview server. Browser checks use isolated test profiles.

## Publishing

Push reviewed changes to `main`. The GitHub Actions workflow runs tests and publishes only `site/` to GitHub Pages. Repository Settings → Pages uses GitHub Actions. Release query strings on JavaScript module imports prevent an older account-based app from being reused from browser cache.
