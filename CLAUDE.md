# LitXusDevHub — Orchestrator & UAT Coordinator

**Role:** Central hub for monitoring systems and coordinating UAT between LitXus projects.

---

## 🔄 UAT Workflow (LitXusDevHub ↔ Projects)

**Our role:** REVIEWER — we receive UAT lists from projects, test them, and send structured feedback back.

**Protocol:**
1. Read UAT list from project → `incoming/uat-list-{project}-v{N}.md`
2. Test each scenario
3. Write feedback → `outgoing/test-report-{project}-v{N}.md`
4. Copy feedback to project → `{Project}/uat/incoming/test-report-v{N}.md`
5. Update `uat-tracker.md`

**Full details:** See `UAT-WORKFLOW.md` in project root.

**Status markers we use in reports:**
- ✅ Passed — test passed, no action needed from project
- ❌ Failed — test failed, project must fix and notify us
- 🔄 Re-testing — project submitted fix, we are retesting
- ⏳ Pending — not yet tested

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `systems-registry.json` | Source of truth for all systems and ports |
| `uat-tracker.md` | Live status of all UAT cycles |
| `UAT-WORKFLOW.md` | Full UAT protocol reference |
| `incoming/` | UAT lists received from projects |
| `outgoing/` | Test reports sent back to projects |
| `port-allocations.md` | Port assignments per system |

---

## 🖥️ Systems Managed

| System | Port | Role |
|--------|------|------|
| LitXusDevHub | 5000 | Orchestrator |
| LitXusTravel API | 5085 | Travel SaaS backend |
| LitXusTravel Admin | 3000 | Admin portal frontend |
| LitXusTravel Public | 3001 | Public website |
| LitXusCount | 3001 | ERP System |

---

## 🔁 UAT Cycle Quick Reference

```
Project writes UAT list
    ↓
DevHub reads → tests → writes report
    ↓
Report copied to Project/uat/incoming/
    ↓
Project fixes ❌ items → notifies DevHub
    ↓
DevHub retests → marks ✅ → signs off
```
