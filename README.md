# European Election Window

A rolling calendar of European elections: the past six months (collapsed) and the next twelve months.

## How it works

- A scheduled GitHub Action (`.github/workflows/update-data.yml`) reads the Google Sheet every 3 hours and saves the merged data as `data.json`.
- `index.html` loads only `data.json`. The sheet's address is stored as a repository secret and never appears in the site or the repository.
- The date window is worked out from each visitor's current date, so it moves forward on its own.
- To refresh straight away: **Actions → Update election data → Run workflow**.

## Repository secrets

Set under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `SHEET_ID` | The long ID in the sheet's URL, between `/d/` and `/edit` |
| `SHEET_GID` | Optional. The number after `gid=` for the tab to read. Defaults to `0` |

## Sheet requirements

- Sharing: **Anyone with the link → Viewer** (the Action reads it without signing in).
- Keep these headers in row 1: `Country`, `Specification`, `Type`, `Mode`, `Sequence`, `(Expected) Date`, `Date Status`, `Comment`. Column order can change; the names can't.
- Dates as `12 January 2025` (ISO `2025-01-12` and day-first `12/01/2025` also work).
- `Date Status` exactly `Confirmed` for confirmed dates; anything else shows as **tbc**.
- `Comment` values that become tags: `Not Free/Fair`, `Impact on European Council`.

If the sheet can't be read or returns almost no rows, the Action fails without overwriting `data.json`, and GitHub emails you about the failed run.
