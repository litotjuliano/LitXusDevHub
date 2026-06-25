# LitXusDevHub — UAT Workflow

## Our Role
LitXusDevHub is the **reviewer**. We receive UAT lists from projects, test them, and send structured feedback back.

---

## Folder Structure

```
incoming/    ← We read UAT lists from projects here
outgoing/    ← We write test reports back to projects here
uat-tracker.md ← Central tracker for all active UAT cycles
```

---

## File Naming Convention

| File | Location | Pattern |
|------|----------|---------|
| UAT List received (we read) | `incoming/` | `uat-list-{project}-v{N}.md` |
| Test Report sent (we write) | `outgoing/` | `test-report-{project}-v{N}.md` |
| Project feedback copy | `{Project}/uat/incoming/` | `test-report-v{N}.md` |

---

## Workflow

```
1. Project writes UAT list → their uat/outgoing/uat-list-v{N}.md
2. We copy/receive it → our incoming/uat-list-{project}-v{N}.md
3. We review and test each scenario
4. We write feedback → our outgoing/test-report-{project}-v{N}.md
5. We also write a copy → {Project}/uat/incoming/test-report-v{N}.md
6. Update uat-tracker.md → mark cycle status
7. Project reads feedback → fixes issues → notifies us for re-test
8. Repeat until all items ✅ → sign off cycle
```

---

## Test Report Template

When writing feedback, use this structure:

```markdown
# LitXus Test Report — {Project} v{N}

## Report Info
- **Project:** {Project}
- **Version:** v{N}
- **Date:** YYYY-MM-DD
- **Reviewed By:** LitXusDevHub

---

## UAT Results

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | | ⏳ Pending | |

---

## Error Details

### Feature {N}: {Name}
- **Status:** ❌ Failed
- **What happened:** 
- **Steps to reproduce:** 
- **Expected vs Actual:** 
- **Fix required:** 

---

## Feedback to Project
- **Action Required:** 
- **Re-test by:** YYYY-MM-DD
```

---

## Status Markers

| Marker | Meaning | Action |
|--------|---------|--------|
| ✅ Passed | Test passed | No action |
| ❌ Failed | Test failed | Project must fix and notify |
| 🔄 Re-testing | Fix submitted, retesting | We are retesting |
| ⏳ Pending | Not yet tested | Awaiting our review |

---

## Projects We Coordinate

| Project | UAT List Location | Feedback Destination |
|---------|------------------|---------------------|
| LitXusTravel | `C:\LitXus Systems\LitXusTravel\uat\outgoing\` | `C:\LitXus Systems\LitXusTravel\uat\incoming\` |
| LitXusCount | `C:\LitXus Systems\LitXusCount\uat\outgoing\` | `C:\LitXus Systems\LitXusCount\uat\incoming\` |

---

## Current Cycles

See `uat-tracker.md` for live status of all active UAT cycles.
