# LitXusDevHub — Version 2.0

**Released:** 2026-06-13  
**Last Updated:** 2026-06-21  
**Supersedes:** RELEASE_v1.md

---

## What's New in v2

### 1. Tenant Website Group — Per-Subdomain Links
A new group **"Litxus Travel Tenant Websites"** appears in the Systems panel. Each registered tenant has its own read-only entry with a direct OPEN link to their subdomain URL.

| Entry | URL |
|---|---|
| Tenant-TravelPro | http://travelpro.lvh.me:3001 |
| Tenant-Wanderlust | http://wanderlust.lvh.me:3001 |
| Tenant-AdventureSeek | http://adventureseek.lvh.me:3001 |

These are `isReadOnly: true` — no START/STOP/BUILD buttons. Static gray dot in group header.

### 2. PublicSite and AgentDash Fully Managed; AdminPortal merged into LitXusTravel
AdminPortal is launched automatically when LitXusTravel is started (via `frontendStartCommand`).
PublicSite and AgentDash remain as separate managed systems.

| System | Working Directory | Port | Start Command |
|---|---|---|---|
| LitXusTravel (API) | `src/LitXusTravel.API` | 5085 | `dotnet run --launch-profile http` |
| LitXusTravel (frontend) | `web/admin-portal` | 3000 | started automatically via `frontendStartCommand` |
| LitXusTravel-PublicSite | `web/public-website` | 3001 | `npm run dev` |
| LitXusTravel-AgentDash | `web/tenant-dashboard` | 3002 | `npm run dev` |

### 3. TIMD Portal Added
| System | Group | API Port | Frontend Port |
|---|---|---|---|
| TIMD-Portal | TIMD Portal | 5118 | 5173 (Vite) |

### 4. BUILD No Longer Shows False RUNNING Status
**Commit:** `f2f3be8` — BUILD keeps status as STOPPED after compile. Click START separately to run.

### 5. AgentDash Renamed from TenantDash
**Commit:** `59d469b` — Port 3002 is correctly labelled `LitXusTravel-AgentDash`.

### 6. isReadOnly System Support
**Commit:** `c0c849a` — Read-only entries show no control buttons, static gray dot, OPEN link only.

---

## Registered Systems (Current)

| System | Group | Port | Type | Purpose |
|---|---|---|---|---|
| LitXusDevHub | — | 5000 | Read-only | Main orchestrator |
| LitXusTravel | LitXusTravel | 5085 | Managed | .NET 8 API + Admin portal (auto-starts on port 3000) |
| LitXusTravel-PublicSite | LitXusTravel | 3001 | Managed | Public website (Next.js) |
| LitXusTravel-AgentDash | LitXusTravel | 3002 | Managed | Agent dashboard (Next.js) |
| Tenant-TravelPro | Litxus Travel Tenant Websites | 3001 | Read-only | travelpro.lvh.me:3001 |
| Tenant-Wanderlust | Litxus Travel Tenant Websites | 3001 | Read-only | wanderlust.lvh.me:3001 |
| Tenant-AdventureSeek | Litxus Travel Tenant Websites | 3001 | Read-only | adventureseek.lvh.me:3001 |
| LitXusCount | LitXusCount | 5280 | Managed | ERP System (.NET 8) |
| TIMD-Portal | TIMD Portal | 5118 | Managed | TIMD Portal API + Frontend (5173) |

---

## systems-registry.json — Canonical Reference

`systems-registry.json` is **gitignored** and runtime-only. Restore from this reference if the `systems` array is ever cleared:

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
      "urls": {
        "swagger": "http://localhost:5085/swagger",
        "backend": "http://localhost:5085"
      }
    },
    {
      "name": "LitXusTravel-AdminPortal",
      "port": 3000,
      "group": "LitXusTravel",
      "status": "stopped",
      "description": "Admin portal (Next.js)",
      "startCommand": "npm run dev",
      "workingDirectory": "C:\\LitXus Systems\\LitXusTravel\\web\\admin-portal",
      "urls": { "frontend": "http://localhost:3000" }
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
  ],
  "notifications": [],
  "uatTracker": []
}
```

> **Note:** Preserve existing `notifications` and `uatTracker` when restoring — only replace the `systems` array.

---

## Known Issue: systems-registry.json Resets to Empty on Restart

The server resets `systems` to `[]` as the default when the file is missing or when startup fails to read it. Manually restore from the canonical reference above.

**Planned for v3:** Auto-seed from `systems-defaults.json` on startup if `systems` is empty.

---

## Port Reference

| System | API Port | Frontend Port |
|---|---|---|
| LitXusDevHub | 5000 | — |
| LitXusTravel API | 5085 | — |
| LitXusTravel Admin Portal | — | 3000 |
| LitXusTravel Public Site | — | 3001 |
| LitXusTravel Agent Dash | — | 3002 |
| LitXusCount | 5280 | — |
| TIMD Portal | 5118 | 5173 |

---

## Planned for v3
- Auto-seed `systems` from `systems-defaults.json` (permanent fix for empty registry)
- Health-check polling (auto-detect running vs stopped)
- Log viewer per system
