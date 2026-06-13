# LitXus Port Allocations

## Active Ports

| System | Port | Status | Notes |
|--------|------|--------|-------|
| LitXusDevHub | 5000 | Running | Orchestrator |
| LitXusTravel API | 5085 | Managed | .NET 8, Swagger at /swagger |
| NexusTravel-AdminPortal | 3000 | Managed | web/admin-portal (Next.js) |
| NexusTravel-PublicSite | 3001 | Managed | web/public-website (Next.js) |
| LitXusTravel-AgentDash | 3002 | Managed | web/tenant-dashboard (Next.js) — Agent dashboard |
| LitXusCount | 3001 | Managed | ERP System |

## Reserved Ranges
- 5000–5010: DevHub & utilities
- 5085: LitXusTravel API
- 3000–3010: Frontend apps
- 8000–8010: Testing & monitoring

## Port Conflict Resolution
- Always check systems-registry.json before starting any service
- If port is in use, kill with: `FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :<PORT>') DO taskkill /PID %P /F`
- Update this file AND systems-registry.json simultaneously
