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
| LitXusTravel | LitXusTravel | 5085 | .NET 8 API backend | Swagger · API · ADMIN PORTAL |
| LitXusTravel-AdminPortal | LitXusTravel | 3000 | Admin portal (Next.js) | OPEN |
| LitXusTravel-PublicSite | LitXusTravel | 3001 | Public website (Next.js) | OPEN |
| LitXusTravel-TenantDash | LitXusTravel | 3002 | Tenant dashboard (Next.js) | OPEN |
| LitXusCount | LitXusCount | 5254 | ERP system (.NET 8 API) | API |

---

## Configuration
- `systems-registry.json` — gitignored, runtime-only, manually maintained
- Each system entry: `name`, `group`, `port`, `workingDirectory`, `startCommand`, `buildCommand`, `urls`, optional `frontendStartCommand` / `frontendLabel`

---

## Known Constraints
- `systems-registry.json` is not version-controlled (intentional — it is runtime state, not source)
- LitXusCount is registered in the dashboard but excluded from LitXusTravel debugging sessions

---

## Planned for v2
- Health-check polling (auto-detect running vs stopped without manual status)
- Log viewer panel per system
- UAT Tracker auto-populate on notification process
