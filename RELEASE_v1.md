# LitXusDevHub — Version 1.0

**Released:** 2026-06-13

## Overview
LitXusDevHub is the orchestration dashboard for all LitXus systems. It provides a single interface to start, stop, build, and monitor every project, track UAT cycles, and receive notifications from sender systems.

## Features in v1.0

### Dashboard Overview (stat cards)
- Total Systems, Running count, Notifications, Active UAT

### System Status Panel
- Systems grouped by project (⬡ group header with aggregate status dot)
- Per-system status badge (RUNNING / STOPPED)
- Controls: Start, Stop, Build, Restart per system
- Quick-link buttons per system (Swagger, API, Frontend)

### Notifications Panel
- Receives UAT list files from sender systems
- Shows sender, filename, date/time
- Process / Dismiss actions per notification

### UAT Tracker
- Table ready for UAT cycles (empty at v1 launch)

### Controls
- Refresh button with last-sync timestamp
- GIT button (top-right)

---

## Registered Systems

| System | Group | Port | Purpose | Links |
|---|---|---|---|---|
| LitXusTravel | LitXusTravel | 5085 | .NET 8 API backend + Admin Portal | Swagger · API · ADMIN PORTAL |
| LitXusTravel-PublicSite | LitXusTravel | 3001 | Public website (Next.js) | OPEN |
| LitXusTravel-TenantDash | LitXusTravel | 3002 | Tenant dashboard (Next.js) | OPEN |
| LitXusCount | LitXusCount | 5254 | ERP system (.NET 8 API) | API |

> `LitXusTravel-AdminPortal` was removed — LitXusTravel already covers it via `frontendStartCommand` + ADMIN PORTAL button.

---

## Configuration
- `systems-registry.json` — gitignored, runtime-only, manually maintained
- Each system entry: `name`, `group`, `port`, `workingDirectory`, `startCommand`, `buildCommand`, `urls`, optional `frontendStartCommand` / `frontendLabel`

---

## Known Constraints
- `systems-registry.json` is not version-controlled (intentional — it is runtime state, not source)
- LitXusCount is registered in the dashboard but excluded from LitXusTravel debugging sessions

## Build Command (Critical)
The solution file is `LitXusTravel.slnx` (not `.sln`). Paths with spaces **must be quoted** in `buildCommand` or the shell will split the path on the space.

| Field | Correct Value |
|---|---|
| `systems-registry.json` → LitXusTravel → `buildCommand` | `dotnet build "C:\LitXus Systems\LitXusTravel\LitXusTravel.slnx"` |

If DevHub Build shows `Command failed` — check that the path is quoted and uses `.slnx`.

---

## Port Alignment (Critical)
DevHub starts LitXusTravel with `dotnet run --launch-profile http`. The `http` profile in `launchSettings.json` **must** point to port **5085** to match the frontend and DevHub registry.

| File | Setting | Correct Value |
|---|---|---|
| `launchSettings.json` → `http` profile | `applicationUrl` | `http://localhost:5085` |
| `systems-registry.json` → LitXusTravel | `port` | `5085` |
| `admin-portal/src/lib/api.ts` | `NEXT_PUBLIC_API_URL` default | `http://localhost:5085/api/v1` |

If login shows "Server unavailable" even when DevHub shows RUNNING — check that all three point to the same port.

---

## Button Behaviour Reference

| Button | What it does | Status after |
|--------|-------------|--------------|
| **START** | Runs `startCommand` (API) + `frontendStartCommand` (frontend) | RUNNING |
| **STOP** | Kills both API and frontend processes | STOPPED |
| **BUILD** | Runs `buildCommand` (compile only — no servers started) | STOPPED |
| **ADMIN PORTAL** | Opens `urls.frontend` in browser | — |

> **Important:** BUILD does not start any server. After a successful build, status stays STOPPED. Click START to run.

---

## Planned for v2
- Health-check polling (auto-detect running vs stopped without manual status)
- Log viewer panel per system
- UAT Tracker auto-populate on notification process
