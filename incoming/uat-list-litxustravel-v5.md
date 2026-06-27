# LitXusTravel UAT List — v5
<!-- STATUS: READY FOR DEVHUB — 2026-06-13 | Supersedes v4 | New: Package Photo (Unsplash), Tenant Public Website Live Data -->

## Info
- **Version:** v5
- **Date:** 2026-06-13
- **Prepared By:** LitXusTravel Development Team
- **Supersedes:** v4
- **Focus:** Package Photo Auto-Generation, Public Website Live Package Display, Override 500 Fix

---

## Changes to Test

| # | Feature / Module | Change Description | Priority |
|---|------------------|--------------------|----------|
| 1 | Package Photo — Unsplash Auto-Fetch | On package CREATE, if no image is provided, a relevant travel photo is auto-fetched from Unsplash API | High |
| 2 | Package Photo — Generate Button | "Generate Photo" button in Package Editor modal fetches a new Unsplash photo on demand | High |
| 3 | Package Override — 500 Fix | PUT /override endpoint no longer returns 500; owned and synced packages save correctly | High |
| 4 | Tenant Public Website — Home Page Live Data | Home page now fetches real packages from the API (not mock data) when accessed via tenant subdomain | High |
| 5 | Tenant Public Website — Packages Page Live Data | `/packages` route already fetched live data; regression check | Medium |

---

## Pre-Seeded Test Data

Same as v4. Use existing credentials:

| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | superadmin@litxustravel.com | SuperAdmin@123 |
| Platform Admin | admin@litxustravel.com | Admin@123 |
| Travel Pro Admin | admin@travelpro.com | TravelPro@123 |

### Packages (Travel Pro tenant)
| Package | Image | Notes |
|---------|-------|-------|
| Palawan Paradise: El Nido & Coron Adventure | Unsplash beach photo | Created today — owned package |

---

## Test Scenarios

### Feature 1: Package Photo — Unsplash Auto-Fetch

**Test Case 1.1 — Create Package Without Image**
- Pre-condition: Logged in as Travel Pro admin
- Steps:
  1. Admin Portal → My Packages → Create New Package
  2. Fill all fields (Title, Destination, Price, Duration) — **leave image blank**
  3. Save package
  4. View package card
- Expected: ✅ Package card shows a relevant Unsplash travel photo (not "No image")

**Test Case 1.2 — Create Package With Image**
- Steps:
  1. Create package and upload a custom image
  2. Save package
- Expected: ✅ Custom image used — Unsplash NOT called

**Test Case 1.3 — Unsplash Fallback (Key Not Set)**
- Steps:
  1. Temporarily clear `Unsplash:AccessKey` in appsettings
  2. Create package without image
- Expected: ✅ Package saves normally, no photo — no 500 error

---

### Feature 2: Generate Photo Button

**Test Case 2.1 — Generate Photo for Existing Package**
- Pre-condition: Package exists with no image (or any image)
- Steps:
  1. Open Package Editor modal for the package
  2. Click "Generate Photo" button
  3. Wait for generation
- Expected: ✅ Image preview updates; save persists the photo

**Test Case 2.2 — Button Disabled During Generation**
- Steps:
  1. Click "Generate Photo"
  2. Click again before it finishes
- Expected: ✅ Button is disabled while generating; no double-fetch

---

### Feature 3: Package Override — 500 Fix

**Test Case 3.1 — Edit Owned Package**
- Pre-condition: Any owned (tenant-created) package exists
- Steps:
  1. Open Package Editor → modify Title, Price, or any field
  2. Click Save
- Expected: ✅ 200 response; changes saved; no 500 error

**Test Case 3.2 — Edit Synced Package**
- Pre-condition: Any package synced from master catalog
- Steps:
  1. Open Package Editor → modify Title or Price
  2. Click Save
- Expected: ✅ 200 response; override saved; master data unaffected

---

### Feature 4: Tenant Public Website — Home Page Live Data

**Test Case 4.1 — Home Page Shows Tenant Packages**
- Pre-condition: Public website running (`npm run dev` on port 3001); API running on 5085
- Steps:
  1. Open `http://travelpro.lvh.me:3001`
  2. View "Featured Packages" section
- Expected: ✅ Real packages from Travel Pro appear (e.g., Palawan Paradise); NOT mock data

**Test Case 4.2 — Home Page Fallback on Localhost**
- Steps:
  1. Open `http://localhost:3001` (no subdomain)
  2. View "Featured Packages" section
- Expected: ✅ Falls back to mock data (no API called without subdomain context)

**Test Case 4.3 — Newly Created Package Appears on Home Page**
- Pre-condition: "Palawan Paradise" package created under Travel Pro
- Steps:
  1. Open `http://travelpro.lvh.me:3001`
  2. Check "Featured Packages" section
- Expected: ✅ Palawan Paradise visible on home page

---

### Feature 5: Tenant Public Website — Packages Page (Regression)

**Test Case 5.1 — Packages Page Shows All Tenant Packages**
- Steps:
  1. Open `http://travelpro.lvh.me:3001/packages`
  2. View package grid
- Expected: ✅ All Travel Pro packages listed (Palawan Paradise and any others)

**Test Case 5.2 — Cross-Tenant Isolation**
- Steps:
  1. Open `http://wanderlust.lvh.me:3001/packages`
  2. Verify Palawan Paradise does NOT appear
- Expected: ✅ Only Wanderlust's own packages shown

---

## Notes to DevHub

1. **Start order:** LitXusTravel API (5085) first → then PublicSite (3001)
2. **Subdomain access:** Use `*.lvh.me` — maps to 127.0.0.1 automatically, no hosts file changes needed
3. **Unsplash key:** Already set in `appsettings.json` — API auto-fetches on package create
4. **Palawan Paradise** was already created; use it for Feature 4/5 tests without re-creating

---

## Sign-Off

- **Prepared By:** Development Team
- **Ready For Testing:** 2026-06-13
- **Target Completion:** 2026-06-20
