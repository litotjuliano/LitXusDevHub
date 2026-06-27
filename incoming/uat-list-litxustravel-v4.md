# LitXusTravel UAT List — v4
<!-- STATUS: READY FOR DEVHUB — 2026-06-12 | Supersedes v3 | New: Tours, Bookings, E2E Commission Flow -->

## Info
- **Version:** v4
- **Date:** 2026-06-12
- **Prepared By:** LitXusTravel Development Team
- **Supersedes:** v3 (API was inaccessible during v3 test cycle — now fixed)
- **Focus:** Tour Management, Booking Management, End-to-End Commission Flow

---

## Changes to Test

| # | Feature / Module | Change Description | Priority |
|---|------------------|--------------------|----------|
| 1 | Admin User Roles & Hierarchy | Regression from v3 — API now accessible (ERR_CONNECTION_REFUSED fixed) | High |
| 2 | Staff Agent Management & Code System | Regression from v3 — John & Jane pre-seeded in DB | High |
| 3 | Commission Rule Configuration | Regression from v3 — default (10%) and John-specific (15%) rules pre-seeded | High |
| 4 | Commission Accrual Workflow | Unblocked — Booking/Tour system now built; accruals pre-seeded | High |
| 5 | Refund & Cancellation Reversal | Unblocked — cancel booking endpoint now wired to commission reversal | High |
| 6 | Monthly Commission Payout Processing | Regression from v3 | Medium |
| 7 | Safeguard 2 — Self-Booking Prevention | Unblocked — requestingAgentId param on POST /bookings | High |
| 8 | Safeguard 3 — Code Sharing Detection | Regression from v3 | Medium |
| 9 | Safeguard 6 — Duplicate Booking Prevention | Unblocked — IsDuplicateBookingAsync enforced in CreateBookingHandler | High |
| 10 | Dispute Resolution Workflow | Regression from v3 | Medium |
| 11 | Audit Trail & SuperAdmin Oversight | Regression from v3 | Medium |
| 12 | Tour Management | NEW — GET/POST tours, POST complete (triggers Safeguard 1 finalization) | High |
| 13 | Booking Management | NEW — GET/POST bookings, POST cancel (auto-reverses commission) | High |
| 14 | End-to-End Commission Flow | NEW — full lifecycle: Book → Tour Complete → Finalize → Payout-ready | High |

---

## Pre-Seeded Test Data

### Credentials
| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | superadmin@litxustravel.com | SuperAdmin@123 |
| Platform Admin | admin@litxustravel.com | Admin@123 |
| Travel Pro Admin | admin@travelpro.com | TravelPro@123 |
| Wanderlust Admin | admin@wanderlust.com | Wanderlust@123 |
| Adventure Admin | admin@adventureseek.com | Adventure@123 |

### Staff Agents (Travel Pro tenant)
| Name | Email | Commission |
|------|-------|------------|
| John Smith | john.smith@travelpro.com | 15% (agent-specific rule) |
| Jane Doe | jane.doe@travelpro.com | 10% (default rule) |

> Get referral codes: `GET /api/v1/tenants/{travelProId}/staff-agents`

### Tours (Travel Pro tenant)
| Tour | Status | Price | Dates |
|------|--------|-------|-------|
| Bali Cultural Experience | **Scheduled** | MYR 1,000 | 15–22 Jul 2026 |
| Tokyo Cherry Blossom | **Scheduled** | MYR 1,500 | 1–8 Sep 2026 |
| Langkawi Beach Retreat | **Completed** | MYR 800 | 1–7 Dec 2025 |

### Bookings & Commission Accruals (Travel Pro tenant)
| Customer | Tour | Agent | Booking | Commission | Accrual |
|----------|------|-------|---------|------------|---------|
| Alice Johnson | Bali Cultural | John (15%) | Confirmed | MYR 150 | **Accrued** |
| Bob Chen | Tokyo Cherry Blossom | Jane (10%) | Confirmed | MYR 150 | **Accrued** |
| Carol Williams | Langkawi Beach Retreat | John (15%) | Completed | MYR 120 | **Finalized** |

---

## Test Scenarios

### Feature 1–11: v3 Regression
All v3 test scenarios remain unchanged. Run them as specified in `uat-list-v3.md`.
- API base: `http://localhost:5085/api/v1`
- Admin portal: `http://localhost:3000/auth/login`
- Swagger: `http://localhost:5085/swagger`

---

### Feature 12: Tour Management

**Test Case 12.1 — List Tours (with Status Filter)**
- Pre-condition: Logged in as Travel Pro admin
- Steps:
  1. `GET /api/v1/tenants/{travelProId}/tours` — expect 3 tours
  2. `GET /api/v1/tenants/{travelProId}/tours?status=Scheduled` — expect 2 (Bali, Tokyo)
  3. `GET /api/v1/tenants/{travelProId}/tours?status=Completed` — expect 1 (Langkawi)
  4. Verify all results are scoped to Travel Pro tenant
- Expected: ✅ Correct tours returned; tenant-scoped

**Test Case 12.2 — Create a New Tour**
- Pre-condition: Travel Pro admin logged in
- Steps:
  1. `POST /api/v1/tenants/{travelProId}/tours`
     ```json
     { "title": "Korea Winter Special", "destination": "Seoul, South Korea",
       "startDate": "2026-12-01", "endDate": "2026-12-08",
       "maxCapacity": 20, "basePrice": 1800, "currency": "MYR" }
     ```
  2. Verify 201 Created; `id` returned
  3. List tours — verify new tour appears with Status = Scheduled
- Expected: ✅ Tour created with correct defaults

**Test Case 12.3 — Complete a Tour (Safeguard 1: Commission Finalization)**
- Pre-condition: Alice's booking on Bali tour is Confirmed; commission is Accrued
- Steps:
  1. `POST /api/v1/tenants/{travelProId}/tours/{baliTourId}/complete`
  2. Verify 200 OK: `"Tour completed. Commissions finalized."`
  3. Verify Bali tour now appears in Completed list
  4. Verify Alice's accrual Status: **Accrued → Finalized**
  5. Verify Carol's Langkawi accrual is unaffected (already Finalized)
- Expected: ✅ Tour completed; only Confirmed booking accruals finalized (Safeguard 1)

**Test Case 12.4 — Cannot Complete Already-Completed Tour**
- Pre-condition: Langkawi tour is already Completed
- Steps:
  1. `POST /api/v1/tenants/{travelProId}/tours/{langkawiTourId}/complete`
  2. Verify 400 Bad Request: `"Tour is already completed"`
- Expected: ✅ Domain invariant enforced

---

### Feature 13: Booking Management

**Test Case 13.1 — List Bookings (with Filters)**
- Pre-condition: Travel Pro admin logged in
- Steps:
  1. `GET /api/v1/tenants/{travelProId}/bookings` — expect 3 bookings
  2. `GET /api/v1/tenants/{travelProId}/bookings?tourId={baliTourId}` — expect 1 (Alice)
  3. `GET /api/v1/tenants/{travelProId}/bookings?agentId={johnId}` — expect 2 (Alice + Carol)
- Expected: ✅ Filtered correctly; no cross-tenant data

**Test Case 13.2 — Create Booking with Commission Accrual**
- Pre-condition: Tokyo tour (Scheduled); John's referral code from staff agent list
- Steps:
  1. Get John's code: `GET /api/v1/tenants/{travelProId}/staff-agents`
  2. `POST /api/v1/tenants/{travelProId}/bookings`
     ```json
     { "tourId": "{tokyoTourId}", "customerName": "David Lim",
       "customerEmail": "david@customer.com", "tourDate": "2026-09-01",
       "referralCode": "{john.UniqueCode}" }
     ```
  3. Verify 201 Created
  4. Verify CommissionAccrual created: Status = **Accrued**, Amount = MYR 225 (15% of 1,500)
- Expected: ✅ Booking created; commission accrued but NOT finalized (Safeguard 1)

**Test Case 13.3 — Cancel Booking → Commission Reversed (Safeguard 1)**
- Pre-condition: Bob's booking on Tokyo is Confirmed; commission is Accrued (MYR 150)
- Steps:
  1. `POST /api/v1/tenants/{travelProId}/bookings/{bobBookingId}/cancel`
     `{ "reason": "Customer requested cancellation" }`
  2. Verify 200 OK: `"Booking cancelled. Commissions reversed."`
  3. Verify Bob's accrual Status: **Accrued → Reversed**
- Expected: ✅ Commission reversed automatically on cancellation (Safeguard 1)

**Test Case 13.4 — Safeguard 8: Post-Payout Refund Creates Negative Accrual**
- Pre-condition: Carol's accrual is Finalized — manually set to Status=Paid in DB (simulate payout)
- Steps:
  1. Set Carol's accrual to Status=Paid via direct DB update
  2. `POST /api/v1/tenants/{travelProId}/bookings/{carolBookingId}/cancel`
     `{ "reason": "Late cancellation refund" }`
  3. Verify original accrual remains **Paid** (unchanged)
  4. Verify NEW accrual created: CommissionAmount = **-120**, Status = **Accrued**
- Expected: ✅ Safeguard 8 — post-payout refund deducted from next cycle

---

### Feature 14: End-to-End Commission Flow

**Test Case 14.1 — Full Lifecycle: Book → Tour Complete → Finalized**
- Pre-condition: Korea Winter Special tour created (Test 12.2); John's code available
- Steps:
  1. `POST /bookings` — customerEmail = "eve@customer.com", John's code, tourDate = 2026-12-01
  2. Verify accrual: Status = Accrued, Amount = MYR 270 (15% of 1,800)
  3. `POST /tours/{koreaWinterTourId}/complete`
  4. Verify accrual Status: **Accrued → Finalized**
  5. Verify Bob's cancelled accrual remains Reversed (unaffected)
- Expected: ✅ Full flow end-to-end; only relevant accruals finalized

**Test Case 14.2 — Safeguard 2: Self-Booking Prevention**
- Pre-condition: John's code and agent ID from staff agent list
- Steps:
  1. `POST /bookings` with John's referral code AND `requestingAgentId` = John's ID
     ```json
     { "tourId": "{tokyoTourId}", "customerName": "John Smith",
       "customerEmail": "john.self@test.com", "tourDate": "2026-09-01",
       "referralCode": "{john.UniqueCode}", "requestingAgentId": "{john.Id}" }
     ```
  2. Verify 400: `"Cannot use own referral code for booking"`
  3. Verify no booking created
- Expected: ✅ Self-booking rejected (Safeguard 2)

**Test Case 14.3 — Safeguard 6: Duplicate Booking Prevention**
- Pre-condition: Alice already has a booking on Bali tour for 2026-07-15
- Steps:
  1. `POST /bookings` — customerEmail = "alice@customer.com", Bali tour, tourDate = 2026-07-15
  2. Verify 400: `"already has a booking for this tour on this date"`
  3. Same customer, same tour, different date (2026-07-22) — verify **201 Created**
- Expected: ✅ Duplicate rejected; different date allowed (Safeguard 6)

---

## Notes to DevHub

1. **Start order:** Start `LitXusTravel` (port 5085) first; allow ~10s for compile + seeding. Then start frontend (port 3000).
2. **Get Tenant IDs:** `GET /api/v1/tenants` after login, or read `tenantId` from JWT claims.
3. **Staff agent codes are random:** Always look up live via `GET /staff-agents` — generated at seed time.
4. **Test execution order:** Run read-only tests (12.1, 13.1) first. Mutating tests (12.3, 13.3) modify shared seed data.
5. **Swagger:** `http://localhost:5085/swagger` — all request/response schemas documented.

---

## Sign-Off

- **Prepared By:** Development Team
- **Ready For Testing:** 2026-06-12
- **Target Completion:** 2026-06-18
