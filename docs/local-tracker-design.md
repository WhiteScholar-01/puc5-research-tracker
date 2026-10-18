# Simplified local tracker design

The owner requested removal of invited access and Supabase, with immediate access for anyone holding the link. The existing website remains at the same GitHub Pages URL.

- Keep the nine-phase, 74-task catalog and the responsive dashboard.
- Remove sign-in, invitations, password forms, external SDK imports, database configuration and database setup files.
- Store task changes in localStorage under puc5tracker.local.v1; store theme separately.
- Use one validated JSON write for each save or restore. Read latest saved versions before mutations. Modern browsers serialize same-origin writes with Web Locks; other tabs receive storage events and update the saved view without replacing editor drafts.
- Retain notes, deadlines, priorities, a free-text assignee name, JSON backup/import and CSV downloads. Completion circles support a single click.
- A backup import explicitly replaces selected local task values, including when the backup predates later changes. Validate every record before writing.
- Do not silently erase malformed saved data. Allow recovery backup download; leave failed saves open with the draft retained.
- Display clearly that each browser has its own progress. No automatic team/device synchronization is claimed.

The previous shared-database setup documents were removed because they no longer describe the application. Their history remains in Git.
