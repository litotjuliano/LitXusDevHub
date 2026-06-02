# LitXusDevHub - OpenSpecs

**Project:** LitXusDevHub — Development Orchestrator  
**Version:** 1.0.0  
**Date:** 2026-06-02  
**Repository:** https://github.com/litotjuliano/LitXusDevHub

---

## Overview

LitXusDevHub is the central orchestrator for all LitXus development systems. It provides a live web dashboard to start, stop, build, and monitor every system in the LitXus ecosystem from a single browser tab.

It is not a framework — it is a lightweight Node.js HTTP server (`server.js`) that manages child processes, reads/writes a single source-of-truth JSON registry, and serves a self-contained HTML dashboard.

---

## Architecture

```
LitXusDevHub (Port 5000)
├── server.js           — HTTP server + process manager
├── dashboard.html      — Live dashboard (served at /)
├── systems-registry.json — Source of truth for all systems
├── port-allocations.md — Port reservation reference
├── incoming/           — Files dropped here trigger notifications
├── outgoing/           — Reports and outputs to other systems
└── dashboards/         — Per-system dashboard templates
```

### How It Works

1. `START-DevHub.bat` clears port 5000, starts `node server.js`, opens browser
2. Server reads `systems-registry.json` on every API call (no in-memory cache)
3. Dashboard fetches `/api/registry` on load and every 15 seconds
4. All system controls (start/stop/build) call POST endpoints on the server
5. Server spawns child processes via `cmd /c` with optional env var injection
6. Status changes are written back to `systems-registry.json` immediately

---

## Systems Registry

**File:** `systems-registry.json`  
**Rule:** Always the source of truth. Never edit system state anywhere else.

### System Object Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Unique system identifier, shown in dashboard |
| `port` | ✅ | Primary port, used for port-clearing on startup |
| `status` | ✅ | `running` / `stopped` / `building` |
| `description` | ✅ | Short label shown under the system name |
| `startCommand` | — | Command to start the system |
| `startEnv` | — | Object of env vars injected at spawn time |
| `buildCommand` | — | Command to build the system |
| `workingDirectory` | — | Working directory for start/build commands |
| `frontendStartCommand` | — | Deprecated — use a separate system entry instead |
| `frontendWorkingDirectory` | — | Deprecated — use a separate system entry instead |
| `frontendLabel` | — | Custom label for the frontend link button |
| `group` | — | Group name — systems with the same group render under a shared header |
| `urls` | — | Object: `swagger`, `backend`, `frontend`, `publicWebsite` |
| `lastUpdated` | — | ISO date string, updated on every status change |
| `notes` | — | Human notes for future reference |

### Grouping

Systems with the same `group` value are rendered under a collapsible group header in the dashboard. The group status dot reflects: all running = green, mixed = amber, all stopped = red.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Serves dashboard.html |
| GET | `/api/registry` | Returns full registry JSON, scans incoming/ |
| POST | `/api/systems/:name/start` | Spawns system process |
| POST | `/api/systems/:name/stop` | Kills process + clears port |
| POST | `/api/systems/:name/build` | Runs buildCommand synchronously |
| POST | `/api/systems/:name/refresh` | Sets status to running without spawning |
| POST | `/api/systems/:name/start-frontend` | Spawns frontendStartCommand (legacy) |
| POST | `/api/notifications/:id/process` | Marks notification as processed |
| POST | `/api/notifications/:id/dismiss` | Removes notification from registry |
| POST | `/api/registry` | Overwrites full registry JSON |

---

## Managed Systems (v1.0.0)

| System | Port | Type | Working Directory |
|--------|------|------|-------------------|
| LitXusDevHub | 5000 | Node.js | C:\LitXus Systems\LitXusDevHub |
| LitXusCount | 3001 | Node.js | C:\LitXus Systems\LitXusCount |
| LitXusTravel | 5085 | .NET 8 API | C:\LitXus Systems\LitXusTravel |
| LitXusTravel-PublicSite | 3001 | Next.js | …\LitXusTravel\web\public-website |
| LitXusTravel-TenantDash | 3002 | Next.js | …\LitXusTravel\web\tenant-dashboard |

---

## v1.0.0 — What Was Fixed (2026-06-02)

This section documents every issue resolved during the first working session. Refer here before debugging similar problems.

---

### 1. Dashboard Was Static (Not Live)

**Problem:** `litxusdevhub-dashboard.html` had all system data hardcoded. Buttons simulated actions in memory only — nothing called the server.

**Fix:** `dashboard.html` (the file actually served at `/`) was already wired to the live API. `litxusdevhub-dashboard.html` is an old static copy — it is not served and can be ignored.

**Rule:** Always edit `dashboard.html`. Never touch `litxusdevhub-dashboard.html`.

---

### 2. LitXusTravel Wrong Port and Start Command

**Problem:** Registry had `port: 5084` and `startCommand: dotnet run --launch-profile https`. Port 5084 had a conflict (PID 8320). The launch profile set up HTTPS on 7196 which Swagger gated behind `IsDevelopment()`.

**Fix:**
- Port changed to `5085`
- Start command changed to: `dotnet run --project src/NexusTravel.API --no-launch-profile --urls http://localhost:5085`
- `startEnv: { "ASPNETCORE_ENVIRONMENT": "Development" }` added so Swagger registers

**Critical:** Serilog suppresses all startup console output. The API is running even when the terminal looks frozen. Wait 10–15 seconds after clicking START before checking Swagger.

---

### 3. startEnv Not Supported in server.js

**Problem:** `spawnProcess` had no way to inject environment variables per system. The only option was to embed `set VAR=VALUE &&` inside the command string, which is fragile.

**Fix:** `spawnProcess(key, cmd, cwd, extraEnv)` now accepts an optional env object. It calls `Object.assign({}, process.env, extraEnv)` before spawning. Systems declare their env vars in `startEnv` in the registry.

---

### 4. Frontend Directory Did Not Exist

**Problem:** Registry had `frontendWorkingDirectory: C:\LitXus Systems\LitXusTravel\frontend` which does not exist. This caused `spawn cmd ENOENT` — a crash that bubbled to the global uncaught exception handler and printed `[UNCAUGHT] spawn cmd ENOENT`.

**Actual paths:**
```
C:\LitXus Systems\LitXusTravel\web\admin-portal     → port 3000
C:\LitXus Systems\LitXusTravel\web\public-website   → port 3001
C:\LitXus Systems\LitXusTravel\web\tenant-dashboard → port 3002
```

**Fix:**
- `frontendWorkingDirectory` updated to `web\admin-portal`
- `LitXusTravel-PublicSite` and `LitXusTravel-TenantDash` added as separate system entries
- `spawnProcess` now checks `fs.existsSync(cwd)` and logs `[SKIP]` instead of crashing
- Per-process `proc.on('error')` handler added so errors no longer reach the global handler

---

### 5. Browse Buttons Blocked by Browser

**Problem:** Browse buttons used `onclick="window.open(url, '_blank')"`. Browsers block `window.open` called from JS as a popup unless it is a direct user gesture on a trusted element.

**Fix:** All browse/link buttons converted to `<a href="..." target="_blank" rel="noopener">` anchor tags. Browsers never block direct anchor clicks.

**CSS added:**
```css
a.action-btn { text-decoration: none; display: inline-flex; align-items: center; }
```

---

### 6. Browser Cached Old Dashboard

**Problem:** Server had no cache headers. After editing `dashboard.html`, the browser continued serving the old cached version. Hard-refresh (`Ctrl+Shift+R`) was required every time.

**Fix:** `sendHTML()` now sets:
```
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
```

---

### 7. .git Config Lock Issues

**Problem:** Git operations from the Linux sandbox left `.git/config.lock` and `.git/index.lock` files behind due to NTFS permission constraints. This blocked all subsequent git operations on Windows.

**Workaround used:**
- `GIT_INDEX_FILE=/tmp/git-index-litxus` bypasses the index lock
- Config written directly via file append rather than `git remote add`
- Lock files must be deleted from Windows: `del ".git\config.lock"`

**Rule:** Always run `git push` from a Windows terminal, not through the Linux sandbox. The sandbox can commit (with `GIT_INDEX_FILE` workaround) but cannot push due to interactive auth requirements.

---

### 8. Next.js Frontend Blinking / Constant Browser Refresh

**Problem:** LitXusTravel-PublicSite (and TenantDash) frontend kept blinking — the browser was reloading on its own in a loop. Root cause was a Turbopack panic:

```
FATAL: Turbopack Error — Failed to write app endpoint /page
Caused by: Next.js package not found
```

Turbopack detected an orphaned `package-lock.json` at `C:\LitXus Systems\LitXusTravel\package-lock.json` (monorepo root, no matching `package.json`). It treated this as the workspace root, looked for `next` there, found nothing, panicked, dropped the HMR websocket, and triggered a full page reload — which then repeated in a loop.

**Fix (two steps, both required):**

1. Delete the orphaned root lockfile from Windows PowerShell:
```powershell
del "C:\LitXus Systems\LitXusTravel\package-lock.json"
```

2. Clear the stale `.next` cache (corrupted during the bad Turbopack runs):
```powershell
Remove-Item -Recurse -Force "C:\LitXus Systems\LitXusTravel\web\public-website\.next"
Remove-Item -Recurse -Force "C:\LitXus Systems\LitXusTravel\web\tenant-dashboard\.next"
```

Then stop and start the frontend from the dashboard. Next.js rebuilds `.next` clean on the next start.

**When to run the cache clear again:** Only if the same panic + blinking returns (usually after a hard kill or power loss corrupts the cache again). It is not needed on normal restarts.

**Note:** `turbopack.root: __dirname` is already set in `next.config.ts` for both apps. This is correct and should be left in place.

---

## Dashboard UI Reference

| Button | Behaviour |
|--------|-----------|
| ▶ START | POST `/start` — spawns process with `startEnv` |
| ■ STOP | POST `/stop` — kills process + clears port via `netstat`/`taskkill` |
| ⚙ BUILD | POST `/build` — runs `buildCommand`, status → building → running |
| ↻ | POST `/refresh` — marks status running without spawning |
| ⬡ SWAGGER | Opens `urls.swagger` in new tab |
| 🌐 OPEN [label] | Opens `urls.frontend` in new tab |
| ⬡ BROWSE | Opens `http://localhost:{port}` in new tab |

**Group header dot:** green = all running, amber = mixed, red = all stopped.

---

## Startup Sequence

```
START-DevHub.bat
  → kills anything on port 5000
  → node server.js
      → reads registry
      → kills all registered ports
      → server.listen(5000)
      → watches incoming/ for new .md files
      → serves dashboard.html at /
  → opens http://localhost:5000 in browser
```

---

## Known Issues / Watch Points

- **Serilog silent start:** LitXusTravel API shows no output after "Building..." — it IS running. Check Swagger at http://localhost:5085/swagger after ~15 seconds.
- **NTFS lock files:** If git operations fail on Windows with "config locked", delete `.git\config.lock` and retry.
- **LitXusCount:** Start command is `npm start` but the project has not been verified to run. Confirm `workingDirectory` and script before relying on the dashboard START button.
- **Port 3001 conflict:** Both LitXusCount and LitXusTravel-PublicSite are assigned port 3001. Resolve before running both simultaneously.
