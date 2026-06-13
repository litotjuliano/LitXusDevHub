# LitXus Port Allocations

## Active Ports

| System | Port | Status | Notes |
|--------|------|--------|-------|
| LitXusDevHub | 5000 | Running | Orchestrator |
| LitXusTravel API | 5085 | Managed | .NET 8, Swagger at /swagger |
| LitXusTravel-AdminPortal | 3000 | Managed | web/admin-portal (Next.js) |
| LitXusTravel-PublicSite | 3001 | Managed | web/public-website (Next.js) |
| LitXusTravel-TenantDash | 3002 | Managed | web/tenant-dashboard (Next.js) |
| LitXusCount | 3001 | Managed | ERP System |

## Reserved Ranges
- 5000–5010: DevHub & utilities
- 5085: LitXusTravel API
- 3000–3010: Frontend apps
- 8000–8010: Testing & monitoring

## Tenant Dev URLs (lvh.me Subdomains)

`*.lvh.me` resolves to `127.0.0.1` via public DNS — no hosts file changes needed.

| Tenant | URL | Port | App |
|--------|-----|------|-----|
| Travel Pro | http://travelpro.lvh.me:3001 | 3001 | LitXusTravel-PublicSite |
| Wanderlust Tours | http://wanderlust.lvh.me:3001 | 3001 | LitXusTravel-PublicSite |
| Adventure Seekers | http://adventure.lvh.me:3002 | 3002 | LitXusTravel-TenantDash |
| Admin Portal | http://localhost:3000 | 3000 | LitXusTravel-AdminPortal |

> Subdomains are seeded on DB reset. Both Next.js servers bind to `0.0.0.0` (not `localhost`) so subdomain requests reach them.

## Port Conflict Resolution
- Always check systems-registry.json before starting any service
- If port is in use, kill with: `FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :<PORT>') DO taskkill /PID %P /F`
- Update this file AND systems-registry.json simultaneously
