# LitXusTravel UAT List — v2
<!-- STATUS: READY TO SEND — 2026-06-08 | Awaiting: uat/incoming/test-report-v2.md -->

## Info
- **Version:** v2
- **Date:** 2026-06-08
- **Prepared By:** LitXusTravel Team
- **Send To:** LitXusDevHub
- **Build upon:** v1 (booking form, FPX payment, pricing display)

---

## Changes to Test

| # | Feature / Module | Change Description | Priority |
|---|------------------|--------------------|----------|
| 1 | Multi-Tenant Data Isolation | Implemented tenant context middleware; automatic query filtering per tenant | Critical |
| 2 | Package Synchronization Engine | Master packages sync to tenants with override capability | High |
| 3 | Automatic Website Provisioning | Tenant signup triggers website generation from template | High |
| 4 | Admin Dashboard | Tenant management, package management, sync status | High |
| 5 | Inquiry & Quotation System | Tenants receive and manage travel inquiries with quote generation | Medium |
| 6 | API Versioning (v1/v2) | REST API endpoints versioned; backward compatibility maintained | Medium |

---

## Test Scenarios

### Feature 1: Multi-Tenant Data Isolation (CRITICAL)
**Purpose:** Verify no cross-tenant data leaks; each tenant sees only their data.

- **Test Case 1.1 - Tenant A Cannot See Tenant B Data**
  1. Login as Tenant A admin.
  2. Query packages, inquiries, bookings via API/UI.
  3. Logout and login as Tenant B admin.
  4. Verify Tenant B sees no Tenant A data and vice versa.
  5. Test both direct API calls and UI endpoints.
  - **Expected Result:** Complete data isolation; no cross-tenant data visible.
  - **Test Data:** 2+ tenants with distinct packages and bookings.

- **Test Case 1.2 - Tenant ID in JWT Token**
  1. Authenticate as Tenant A, inspect JWT token claims.
  2. Extract and verify TenantId claim is present and correct.
  3. Use token to access API endpoints; verify TenantId context is applied.
  4. Attempt to modify JWT to inject different TenantId; verify request is rejected.
  - **Expected Result:** JWT contains correct TenantId; tampering is detected and rejected.
  - **Test Data:** Admin user for Tenant A with JWT inspection tools.

- **Test Case 1.3 - Global Query Filters Applied**
  1. Run raw database queries on Inquiries, TenantPackages tables.
  2. Verify all WHERE clauses include TenantId filter.
  3. Check application logs for any queries missing tenant filter.
  4. Audit code for missed query locations.
  - **Expected Result:** All queries include TenantId filter; no unfiltered queries in logs.
  - **Test Data:** Access to database and application logs.

---

### Feature 2: Package Synchronization Engine
**Purpose:** Verify master packages sync to tenants; overrides preserved; idempotent behavior.

- **Test Case 2.1 - Sync New Master Package to Tenant**
  1. Admin creates a new master package (e.g., "Bali Beach Getaway").
  2. Tenant admin initiates sync via UI or API endpoint.
  3. Verify TenantPackage record created in database.
  4. Check sync status marked as "Synced".
  5. Verify tenant can view package in their portal.
  - **Expected Result:** Package synced successfully; visible to tenant; sync status logged.
  - **Test Data:** New master package; tenant with sync permission.

- **Test Case 2.2 - Preserve Tenant Overrides on Re-Sync**
  1. Sync package to tenant (from 2.1).
  2. Tenant overrides title: "Bali Beach → Bali Luxury Escape"; price +10%.
  3. Admin updates master package title and price.
  4. Re-sync the package to tenant.
  5. Verify tenant overrides are preserved; not overwritten by master updates.
  6. Verify final displayed package = master + overrides.
  - **Expected Result:** Overrides preserved; re-sync doesn't erase customizations.
  - **Test Data:** Existing synced package; pre-configured overrides.

- **Test Case 2.3 - Sync is Idempotent**
  1. Sync a package to tenant.
  2. Call sync endpoint 3 more times with same package/tenant.
  3. Verify TenantPackage record is not duplicated; still only 1 record.
  4. Verify sync status remains consistent.
  5. Check database for no orphaned records.
  - **Expected Result:** Multiple syncs create no duplicates; operation is safe to retry.
  - **Test Data:** Master package; tenant account.

- **Test Case 2.4 - Sync Multiple Packages in Bulk**
  1. Create 5+ master packages.
  2. Tenant initiates bulk sync of all packages.
  3. Verify all packages synced to tenant within reasonable time.
  4. Check performance metrics (time to sync, memory usage).
  5. Verify no timeout or partial sync errors.
  - **Expected Result:** Bulk sync completes; all packages synced; no performance degradation.
  - **Test Data:** 5+ master packages; tenant with sync permission.

---

### Feature 3: Automatic Website Provisioning
**Purpose:** Verify website generated on tenant signup; subdomain assigned; SSL provisioned.

- **Test Case 3.1 - Website Auto-Generated on Tenant Creation**
  1. Admin creates new tenant via API: `POST /api/v2/admin/tenants` with name, email, plan.
  2. Verify `TenantCreatedEvent` is raised and captured.
  3. Verify `TenantWebsiteProvisioningHandler` processes event.
  4. Check database: provisioning_status = "Provisioning" → "Completed".
  5. Verify website is accessible at tenant subdomain.
  - **Expected Result:** Website generated within 10s; accessible; no errors in provisioning logs.
  - **Test Data:** New tenant creation payload.

- **Test Case 3.2 - Subdomain Assignment**
  1. Create tenant with name "Travel Pro".
  2. Verify subdomain created: `travel-pro.nexustravel.com` (or configured suffix).
  3. Verify DNS resolves to tenant website.
  4. Access subdomain; verify tenant website loads.
  - **Expected Result:** Subdomain auto-assigned and functional.
  - **Test Data:** New tenant; DNS verification tools.

- **Test Case 3.3 - SSL Certificate Provisioning**
  1. Access tenant website via HTTPS.
  2. Verify SSL certificate is valid (not expired, correct domain).
  3. Check certificate chain for proper setup.
  4. Test mixed-content warnings; verify none.
  - **Expected Result:** Valid SSL certificate; HTTPS works; no security warnings.
  - **Test Data:** Tenant website; HTTPS client (browser/curl).

- **Test Case 3.4 - Template Seeding & Customization**
  1. Access newly provisioned tenant website.
  2. Verify default pages present: Home, Packages, About, Contact.
  3. Verify branding reflects tenant name/logo (if provided).
  4. Verify template is editable by tenant admin.
  5. Test custom CSS/content changes persist.
  - **Expected Result:** Template seeded correctly; editable; changes persist.
  - **Test Data:** New tenant website; admin credentials.

---

### Feature 4: Admin Dashboard
**Purpose:** Verify admin can manage tenants, packages, and sync status.

- **Test Case 4.1 - Admin Tenant List & Management**
  1. Login as system admin.
  2. Navigate to /admin/tenants dashboard.
  3. Verify list of all tenants with status (Active, Pending Provision, Inactive).
  4. Test pagination, search, filter by status.
  5. Verify admin can view tenant details, billing info, sync status.
  - **Expected Result:** Tenant list loads; filters work; details accessible.
  - **Test Data:** 10+ test tenants with varied statuses.

- **Test Case 4.2 - Admin Package Management**
  1. Navigate to /admin/packages.
  2. Verify all master packages listed with category, destination, price.
  3. Test add new package: fill form, submit, verify in database.
  4. Test edit package: change price/details, verify update propagates to synced tenants.
  5. Test delete package: verify soft-delete (not hard-delete); verify removed from tenant views.
  - **Expected Result:** CRUD operations work; updates propagate; soft-delete safe.
  - **Test Data:** Master packages; edit/delete test cases.

- **Test Case 4.3 - Sync Status Dashboard**
  1. Navigate to /admin/sync-status.
  2. Verify matrix: rows = packages, columns = tenants, cells = sync status.
  3. Test filter by package/tenant.
  4. Test re-sync button; verify sync triggered and status updated.
  5. Check logs for sync timestamps and errors.
  - **Expected Result:** Dashboard shows accurate sync status; re-sync works; logs detailed.
  - **Test Data:** Multiple packages; multiple tenants; varied sync statuses.

---

### Feature 5: Inquiry & Quotation System
**Purpose:** Verify tenants receive inquiries; can generate and send quotes.

- **Test Case 5.1 - Customer Submits Inquiry**
  1. Public user visits tenant website (e.g., travel-pro.nexustravel.com).
  2. Selects a package and clicks "Request Quote" or "Make Inquiry".
  3. Fills inquiry form: name, email, phone, travel dates, special requests.
  4. Submits form.
  5. Verify inquiry saved to database with InquiryStatus = "New".
  6. Verify tenant admin receives notification (email/dashboard).
  - **Expected Result:** Inquiry saved; notification sent; visible to tenant admin.
  - **Test Data:** Tenant website; sample customer details.

- **Test Case 5.2 - Tenant Generates & Sends Quote**
  1. Tenant admin views inquiry in dashboard.
  2. Clicks "Generate Quote" → form appears.
  3. Inputs quote details: base price, taxes, discounts, validity date.
  4. System auto-calculates total and includes package details.
  5. Tenant clicks "Send Quote" → email sent to customer.
  6. Verify quote status = "Sent" and timestamp logged.
  7. Customer receives email with quote link.
  - **Expected Result:** Quote generated, priced correctly, sent; email received.
  - **Test Data:** Inquiry with customer email; pricing rules.

- **Test Case 5.3 - Customer Accepts Quote**
  1. Customer opens email link to quote.
  2. Verifies quote details and clicks "Accept & Book".
  3. Proceeds to checkout; completes payment (use existing Payment feature from v1).
  4. Verify booking created; quote status = "Accepted".
  5. Verify confirmation sent to both customer and tenant.
  - **Expected Result:** Quote → Booking workflow complete; confirmations sent.
  - **Test Data:** Quote email; customer, payment method.

- **Test Case 5.4 - Multi-Tenant Inquiry Isolation**
  1. Tenant A customer submits inquiry to Tenant A.
  2. Login as Tenant B admin; verify cannot see Tenant A's inquiries.
  3. Login as Tenant A admin; verify can see only their inquiries.
  - **Expected Result:** Inquiries are tenant-scoped; no cross-tenant visibility.
  - **Test Data:** 2+ tenants; inquiries per tenant.

---

### Feature 6: API Versioning (v1/v2)
**Purpose:** Verify v1 and v2 APIs coexist; backward compatibility maintained.

- **Test Case 6.1 - v1 Endpoints Still Work**
  1. Call v1 booking endpoint: `GET /api/v1/bookings` with v1 auth token.
  2. Verify response returns data in v1 format.
  3. Test v1 create booking endpoint; verify works as before.
  4. Verify v1 endpoints are unaffected by v2 changes.
  - **Expected Result:** v1 endpoints functional; format unchanged.
  - **Test Data:** v1 auth token; v1 request payloads.

- **Test Case 6.2 - v2 Endpoints Available**
  1. Call new v2 endpoint: `GET /api/v2/tenants/{id}/packages` with v2 auth token.
  2. Verify response includes new fields (sync_status, overrides, etc.).
  3. Test v2 sync endpoint: `POST /api/v2/packages/{id}/sync`.
  4. Test v2 inquiry endpoint: `GET /api/v2/inquiries`.
  - **Expected Result:** v2 endpoints available; return new fields/structures.
  - **Test Data:** v2 auth token; v2 request payloads.

- **Test Case 6.3 - Version Routing Works**
  1. Call same resource on v1 and v2 with identical parameters.
  2. Compare response payloads; verify v2 has extended fields.
  3. Verify old v1 clients are unaffected.
  - **Expected Result:** Both versions work; v2 enriched without breaking v1.
  - **Test Data:** Identical request for /api/v1/xxx and /api/v2/xxx.

- **Test Case 6.4 - Deprecated v1 Behavior Not Removed**
  1. Check CHANGELOG for any v1 fields marked deprecated (not removed).
  2. Verify deprecated fields still present in v1 responses.
  3. Verify v2 responses may exclude deprecated fields.
  - **Expected Result:** Deprecation without removal; v1 stable.
  - **Test Data:** CHANGELOG; v1/v2 response comparison.

---

## Notes to DevHub

### Risk Assessment
- **Feature 1 (Data Isolation):** CRITICAL RISK — security-critical. Prioritize this test; flag any tenant-crossing issues immediately.
- **Feature 2 (Package Sync):** HIGH RISK — core business logic. Test idempotency and override preservation thoroughly.
- **Feature 3 (Provisioning):** HIGH RISK — infrastructure. Test DNS/SSL; check for zombie subdomains on test deletions.
- **Feature 4 (Admin Dashboard):** MEDIUM RISK — usability/visibility. Verify all filters and bulk operations.
- **Feature 5 (Inquiries):** MEDIUM RISK — new workflow. Test end-to-end customer→tenant→booking.
- **Feature 6 (API Versioning):** LOW RISK — compatibility. Quick smoke test; v1 clients should be unaffected.

### Testing Priority
1. Feature 1 (isolation) — must pass 100%
2. Feature 2 (sync) — must pass 100%
3. Feature 3 (provisioning) — must pass 100%
4. Features 4, 5, 6 — in order

### Notes
- All tests assume v1 features (booking, payment, pricing) still work — regression test those.
- Database backups recommended before provisioning tests (DNS/subdomain cleanup).
- Coordinate with DevHub on test tenant cleanup after testing.
- Notify immediately if any cross-tenant data observed.
