# LitXusDevHub — Version 3.0

**Released:** 2026-06-25
**Supersedes:** RELEASE_v2.md

---

## What's New in v3

### 1. Auto-Seed on Startup (Permanent Fix)
`server.js` now calls `seedFromDefaults()` on startup. If `systems` is empty, it reads from `systems-defaults.json` and restores all systems automatically. No more manual registry restoration.

**Log output when triggered:**
```
[INIT] systems array was empty — seeded 10 systems from systems-defaults.json
```

### 2. AdminPortal Merged Back into LitXusTravel
`LitXusTravel-AdminPortal` is no longer a separate entry. The admin portal (port 3000) now auto-starts via `frontendStartCommand` when LitXusTravel is started. One START button launches both API and frontend.

| Before (v2) | After (v3) |
|---|---|
| LitXusTravel (API only) | LitXusTravel (API + Admin Portal) |
| LitXusTravel-AdminPortal (separate) | *(removed)* |

### 3. systems-defaults.json Created
New permanent file at `C:\LitXus Systems\LitXusDevHub\systems-defaults.json`. This is the source of truth for system definitions. Edit this file when adding or changing systems — the registry will be restored from it on next restart if empty.

---

## Registered Systems (Current)

| System | Group | Port | Type | Purpose |
|---|---|---|---|---|
| LitXusDevHub | — | 5000 | Read-only | Main orchestrator |
| LitXusTravel | LitXusTravel | 5085 | Managed | .NET 8 API + Admin Portal (port 3000 auto-starts) |
| LitXusTravel-PublicSite | LitXusTravel | 3001 | Managed | Public website (Next.js) |
| LitXusTravel-AgentDash | LitXusTravel | 3002 | Managed | Agent dashboard (Next.js) |
| Tenant-TravelPro | Litxus Travel Tenant Websites | 3001 | Read-only | travelpro.lvh.me:3001 |
| Tenant-Wanderlust | Litxus Travel Tenant Websites | 3001 | Read-only | wanderlust.lvh.me:3001 |
| Tenant-AdventureSeek | Litxus Travel Tenant Websites | 3001 | Read-only | adventureseek.lvh.me:3001 |
| LitXusCount | LitXusCount | 5280 | Managed | ERP System (.NET 8) |
| TIMD-Portal | TIMD Portal | 5118 | Managed | TIMD Portal API + Frontend (5173) |

---

## systems-defaults.json — Canonical Reference

> **Note:** `systems-registry.json` is gitignored and runtime-only. `systems-defaults.json` is the permanent reference. Restore or update `systems-defaults.json` when system definitions change.

```json
{
  "systems": [
    {
      "name": "LitXusDevHub",
      "port": 5000,
      "status": "running",
      "description": "Main orchestrator",
      "isReadOnly": true
    },
    {
      "name": "LitXusTravel",
      "port": 5085,
      "group": "LitXusTravel",
      "status": "stopped",
      "description": "Travel SaaS — .NET 8 API",
      "startCommand": "dotnet run --project src/LitXusTravel.API --launch-profile http",
      "startEnv": { "ASPNETCORE_ENVIRONMENT": "Development" },
      "buildCommand": "dotnet build \"C:\\LitXus Systems\\LitXusTravel\\LitXusTravel.slnx\"",
      "workingDirectory": "C:\\LitXus Systems\\LitXusTravel",
      "frontendStartCommand": "npm run dev",
      "frontendWorkingDirectory": "C:\\LitXus Systems\\LitXusTravel\\web\\admin-portal",
      "frontendLabel": "OPEN ADMIN PORTAL",
      "urls": {
        "swagger": "http://localhost:5085/swagger",
        "backend": "http://localhost:5085",
        "frontend": "http://localhost:3000"
      }
    },
    {
      "name": "LitXusTravel-PublicSite",
      "port": 3001,
      "group": "LitXusTravel",
      "status": "stopped",
      "description": "Public website (Next.js)",
      "startCommand": "npm run dev",
      "startEnv": { "TURBOPACK": "0" },
      "workingDirectory": "C:\\LitXus Systems\\LitXusTravel\\web\\public-website",
      "urls": { "frontend": "http://localhost:3001" }
    },
    {
      "name": "LitXusTravel-AgentDash",
      "port": 3002,
      "group": "LitXusTravel",
      "status": "stopped",
      "description": "Agent dashboard (Next.js)",
      "startCommand": "npm run dev",
      "startEnv": { "TURBOPACK": "0" },
      "workingDirectory": "C:\\LitXus Systems\\LitXusTravel\\web\\tenant-dashboard",
      "urls": { "frontend": "http://localhost:3002" }
    },
    {
      "name": "Tenant-TravelPro",
      "port": 3001,
      "group": "Litxus Travel Tenant Websites",
      "status": "stopped",
      "description": "travelpro.lvh.me:3001",
      "isReadOnly": true,
      "urls": { "frontend": "http://travelpro.lvh.me:3001" }
    },
    {
      "name": "Tenant-Wanderlust",
      "port": 3001,
      "group": "Litxus Travel Tenant Websites",
      "status": "stopped",
      "description": "wanderlust.lvh.me:3001",
      "isReadOnly": true,
      "urls": { "frontend": "http://wanderlust.lvh.me:3001" }
    },
    {
      "name": "Tenant-AdventureSeek",
      "port": 3001,
      "group": "Litxus Travel Tenant Websites",
      "status": "stopped",
      "description": "adventureseek.lvh.me:3001",
      "isReadOnly": true,
      "urls": { "frontend": "http://adventureseek.lvh.me:3001" }
    },
    {
      "name": "LitXusCount",
      "port": 5280,
      "group": "LitXusCount",
      "status": "stopped",
      "description": "ERP System — .NET 8 API",
      "startCommand": "dotnet run --project src/LitXusCount.API --launch-profile http",
      "startEnv": { "ASPNETCORE_ENVIRONMENT": "Development" },
      "buildCommand": "dotnet build \"C:\\LitXus Systems\\LitXusCount\\LitXusCount.slnx\"",
      "workingDirectory": "C:\\LitXus Systems\\LitXusCount",
      "urls": { "backend": "http://localhost:5280" }
    },
    {
      "name": "TIMD-Portal",
      "port": 5118,
      "group": "TIMD Portal",
      "status": "stopped",
      "description": "TIMD Portal — .NET 8 API",
      "startCommand": "dotnet run --project TongilMooDo.API --launch-profile http",
      "startEnv": { "ASPNETCORE_ENVIRONMENT": "Development" },
      "buildCommand": "dotnet build \"C:\\LitXus Systems\\TIMD Portal\\TongilMooDo.slnx\"",
      "workingDirectory": "C:\\LitXus Systems\\TIMD Portal",
      "frontendStartCommand": "npm run dev",
      "frontendWorkingDirectory": "C:\\LitXus Systems\\TIMD Portal\\timd-portal-frontend",
      "frontendLabel": "OPEN FRONTEND",
      "urls": {
        "backend": "http://localhost:5118",
        "frontend": "http://localhost:5173"
      }
    }
  ]
}
```

---

## Port Reference

| System | API Port | Frontend Port |
|---|---|---|
| LitXusDevHub | 5000 | — |
| LitXusTravel API | 5085 | 3000 (Admin Portal, auto-starts) |
| LitXusTravel Public Site | — | 3001 |
| LitXusTravel Agent Dash | — | 3002 |
| LitXusCount | 5280 | — |
| TIMD Portal | 5118 | 5173 |

---

## How to Add a New System

1. Add the entry to `systems-defaults.json`
2. Restart DevHub — it will auto-seed on next startup if registry is empty
3. Or manually add to live `systems-registry.json` for immediate effect
4. Update this file and `port-allocations.md`
