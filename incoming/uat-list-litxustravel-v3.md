# LitXusTravel UAT List — v3
<!-- STATUS: READY FOR DEVHUB — 2026-06-11 | Features: Role Hierarchy, Agent Models, Commission System -->

## Info
- **Version:** v3
- **Date:** 2026-06-11
- **Prepared By:** LitXusTravel Development Team
- **Build Upon:** v1-v2 (core platform + multi-tenancy)
- **Focus:** Role Hierarchy, Agent Models, Commission System (10 Safeguards)
- **Commits:** phase1-core-entities + phase2-use-cases-api

---

## Overview

Phase 3 introduces complete role hierarchy management, two agent models (staff & freelancers), and a comprehensive commission system with 10 critical fraud prevention safeguards.

**Key Features:**
- ✅ Admin user roles (SuperAdmin, Platform Admin, Tenant Admin)
- ✅ Staff Agent creation with unique referral codes
- ✅ Independent Agent white-label support
- ✅ Commission rules configuration (fixed, %, tiered)
- ✅ Commission accrual → finalization → payout workflow
- ✅ 10 fraud prevention safeguards
- ✅ Dispute resolution workflow (not force override)
- ✅ Complete audit trail for all SuperAdmin actions

---

## Test Scenarios

### Feature 1: Admin User Roles & Hierarchy
**Purpose:** Verify role hierarchy enforcement; only authorized admins can perform actions.

**Test Case 1.1 - Create Platform Admin (SuperAdmin Only)**
- Pre-condition: Logged in as SuperAdmin
- Steps:
  1. Navigate to Admin Management → Create Admin
  2. Set Name: "Alice Johnson", Email: "alice@platform.com", Role: Admin, Scope: Platform
  3. Submit form
  4. Verify admin created in database
  5. Check audit log for CreateAdmin action
- Expected: ✅ Platform Admin created; audit trail recorded
- Test Data: SuperAdmin credentials

**Test Case 1.2 - Create Tenant Admin (Platform Admin Can Assign)**
- Pre-condition: Platform Admin (Alice) logged in; Tenant A exists
- Steps:
  1. Navigate to Tenant A → Admin Management
  2. Create Tenant Admin: "Bob Smith", "bob@tenanta.com", Scope: Tenant, AssignedTenant: Tenant A
  3. Submit form
  4. Verify Tenant Admin created and scoped to Tenant A only
  5. Verify Bob cannot see Tenant B data
- Expected: ✅ Tenant Admin created with scope enforcement
- Test Data: Tenant A with distinct data

**Test Case 1.3 - Authorization Verification**
- Pre-condition: Tenant Admin (Bob) for Tenant A logged in
- Steps:
  1. Attempt to access /api/v1/admin/users (SuperAdmin endpoint)
  2. Verify 403 Forbidden returned
  3. Attempt to access /api/v1/tenants/{TenantA}/staff-agents (allowed)
  4. Verify 200 OK returned
  5. Attempt to access /api/v1/tenants/{TenantB}/staff-agents (different tenant)
  6. Verify 403 Forbidden returned
- Expected: ✅ Authorization properly enforced per role & scope
- Test Data: Bob's JWT token for Tenant A

---

### Feature 2: Staff Agent Management & Code System
**Purpose:** Verify staff agent creation, unique code generation, and code rotation.

**Test Case 2.1 - Create Staff Agent with Unique Code**
- Pre-condition: Tenant Admin (Bob) for Tenant A logged in
- Steps:
  1. Navigate to Staff Management → Create Agent
  2. Enter Name: "John Smith", Email: "john.smith@tenanta.com"
  3. Submit form
  4. Verify agent created in database
  5. Inspect agent record - verify UniqueCode generated (format: STAFF-JOHN-{seq})
  6. Verify CodeIssuedAt = current timestamp
  7. Verify CodeExpiresAt = 1 month from CodeIssuedAt
  8. Check audit trail
- Expected: ✅ Agent created with unique code, 1-month expiry
- Test Data: Tenant A admin credentials

**Test Case 2.2 - Code Uniqueness per Tenant**
- Pre-condition: Two staff agents in Tenant A, staff agent in Tenant B with same name
- Steps:
  1. Get John Smith's code from Tenant A (e.g., STAFF-JOHN-ABC123)
  2. Get John Smith's code from Tenant B (different code, e.g., STAFF-JOHN-XYZ789)
  3. Query database for code uniqueness per tenant
  4. Verify codes are different across tenants
- Expected: ✅ Codes unique per tenant, not globally
- Test Data: Same-name agents in different tenants

**Test Case 2.3 - Code Rotation (Monthly)**
- Pre-condition: Staff agent John from Test 2.1 exists
- Steps:
  1. Call RotateStaffAgentCode endpoint for John
  2. Retrieve updated agent record
  3. Verify old code differs from new code
  4. Verify new CodeIssuedAt updated
  5. Verify new CodeExpiresAt = 1 month from new issue date
  6. Check audit trail for CodeRotated action
- Expected: ✅ Code rotated successfully, timestamps updated
- Test Data: John's agent ID

**Test Case 2.4 - Email Uniqueness per Tenant (Safeguard)**
- Pre-condition: John Smith (john.smith@tenanta.com) exists in Tenant A
- Steps:
  1. Attempt to create new staff agent with Email: john.smith@tenanta.com
  2. Verify validation error: "Email already exists"
  3. Attempt same email in Tenant B
  4. Verify success (different tenant namespace)
- Expected: ✅ Duplicate email rejected per tenant
- Test Data: John's email, Tenant A & B

---

### Feature 3: Commission Rule Configuration
**Purpose:** Verify commission rules created correctly; percentage cap enforced (Safeguard 9).

**Test Case 3.1 - Create Default Commission Rule (All Agents)**
- Pre-condition: Tenant Admin (Bob) for Tenant A logged in
- Steps:
  1. Navigate to Commission Settings → New Rule
  2. Set: Trigger: TourCompleted, Amount: 10, IsPercentage: true, MinThreshold: 100
  3. Leave AgentId empty (default rule)
  4. Submit form
  5. Verify rule created in database
  6. Verify RuleType = "Default", AgentId = null
  7. Verify EffectiveFrom = today, IsActive = true
- Expected: ✅ Default rule created; applies to all agents
- Test Data: Tenant A admin

**Test Case 3.2 - Safeguard 9: Commission Percentage Cap (Max 30%)**
- Pre-condition: Commission rule creation page open
- Steps:
  1. Attempt to create rule: Amount: 35%, IsPercentage: true
  2. Verify validation error: "Commission percentage cannot exceed 30%"
  3. Attempt to create rule: Amount: 30%, IsPercentage: true
  4. Verify success (at cap)
  5. Verify in database: Amount = 30
- Expected: ✅ 30% cap enforced; values > 30% rejected
- Test Data: None (validation test)

**Test Case 3.3 - Create Agent-Specific Commission Rule**
- Pre-condition: John Smith (Staff Agent) exists in Tenant A; Tenant Admin (Bob) logged in
- Steps:
  1. Navigate to John's commission settings
  2. Set custom rule: Trigger: TourCompleted, Amount: 15%, IsPercentage: true
  3. Submit form
  4. Verify agent-specific rule created in database
  5. Verify AgentId = John's ID, TenantId = Tenant A ID
  6. Verify default rule still exists (separate record)
- Expected: ✅ Agent-specific rule created; does not override default
- Test Data: John's ID, Tenant A admin

**Test Case 3.4 - Applicability Logic (Agent Rule > Default Rule)**
- Pre-condition: Default rule (10%) + John's agent rule (15%) exist
- Steps:
  1. Query GetApplicableRule for John with trigger TourCompleted
  2. Verify returned rule has Amount: 15 (agent-specific)
  3. Query GetApplicableRule for Jane (no specific rule)
  4. Verify returned rule has Amount: 10 (default)
- Expected: ✅ Agent-specific rule takes precedence when exists
- Test Data: John & Jane agent IDs

---

### Feature 4: Commission Accrual Workflow (Safeguard 1: Completion-Based)
**Purpose:** Verify commissions only finalize on tour completion, not booking.

**Test Case 4.1 - Commission Accrues on Booking (Status: Accrued)**
- Pre-condition: John (Staff Agent, 10% rule) has made a booking
- Steps:
  1. Customer books tour for $500 using John's code
  2. Query CommissionAccrual for this booking
  3. Verify AccrualStatus = "Accrued" (NOT Finalized)
  4. Verify CommissionAmount = $50 (10% of $500)
  5. Verify SourceId = booking ID
- Expected: ✅ Commission accrued but NOT finalized
- Test Data: Booking with referral code

**Test Case 4.2 - Commission Finalizes on Tour Completion (Safeguard 1)**
- Pre-condition: Booking with accrued commission from 4.1 exists
- Steps:
  1. Mark tour as "Completed" in system
  2. Trigger finalization process (via command/scheduler)
  3. Query CommissionAccrual record
  4. Verify Status changed from "Accrued" → "Finalized"
  5. Verify CommissionAmount unchanged ($50)
  6. Check audit trail for CommissionFinalized event
- Expected: ✅ Commission finalized ONLY on completion
- Test Data: Completed tour

**Test Case 4.3 - Commission Remains Accrued if Tour Not Completed**
- Pre-condition: Booking with accrued commission exists
- Steps:
  1. Tour status = "Pending" or "Cancelled" (NOT Completed)
  2. Run finalization process
  3. Query CommissionAccrual
  4. Verify Status still = "Accrued" (NOT finalized)
- Expected: ✅ Commission NOT finalized until completion
- Test Data: Non-completed tour

---

### Feature 5: Refund/Cancellation Reversal (Safeguard 1)
**Purpose:** Verify commissions reversed on cancellation/refund; audited.

**Test Case 5.1 - Cancel Booking → Commission Reversed**
- Pre-condition: Completed tour with finalized commission ($50) exists
- Steps:
  1. Customer cancels booking
  2. Booking status changed to "Cancelled"
  3. Trigger commission reversal process
  4. Query original CommissionAccrual
  5. Verify Status = "Reversed"
  6. Query related reversals/journal entries
  7. Verify audit trail shows reversal with reason "Booking Cancelled"
- Expected: ✅ Commission reversed; audit trail complete
- Test Data: Completed booking, cancellation trigger

**Test Case 5.2 - Refund After Payout → Deducted from Next Month (Safeguard 8)**
- Pre-condition: Payout processed for June ($500 total paid); then July refund occurs
- Steps:
  1. July refund issued ($50 from previous booking)
  2. System creates reversal accrual for $50 (negative amount)
  3. Process July payout
  4. Verify July payout calculation: (July finalized) - $50 (refund reversal)
  5. Check audit trail: original commission → reversed → next payout adjusted
- Expected: ✅ Refund automatically deducted from next payout
- Test Data: Payout cycle + subsequent refund

---

### Feature 6: Monthly Commission Payout Processing
**Purpose:** Verify payout creation, aggregation, and status transitions.

**Test Case 6.1 - Process June Payout (All Finalized Commissions)**
- Pre-condition: June finalized commissions exist
  - John: $195 (3 completed tours)
  - Jane: $104 (2 completed tours)
  - Mike: $30 (1 completed tour)
- Steps:
  1. Call ProcessCommissionPayout for Tenant A, period June 1-30
  2. Verify payout record created in database
  3. Verify PayoutPeriodStart = 2026-06-01, PayoutPeriodEnd = 2026-06-30
  4. Verify TotalAmount = $329 (195 + 104 + 30)
  5. Verify Status = "Pending"
  6. Verify all associated CommissionAccruals marked as "PendingPayout"
  7. Check audit trail: ProcessCommissionPayout action logged
- Expected: ✅ Payout created; commissions aggregated; status updated
- Test Data: June finalized commissions for 3 agents

**Test Case 6.2 - Payout Status Transitions (Pending → Approved → Processed)**
- Pre-condition: Payout from 6.1 in "Pending" status
- Steps:
  1. Approve payout → Status = "Approved"
  2. Process payout (mark as paid) → Status = "Processed"
  3. Verify ProcessedAt timestamp set
  4. Verify TransactionId assigned
  5. Verify all linked commissions → Status = "Paid"
  6. Check audit trail for each transition
- Expected: ✅ Status transitions correct; timestamps & links updated
- Test Data: Pending payout ID

**Test Case 6.3 - Cannot Create Duplicate Payout for Same Period**
- Pre-condition: June payout already processed
- Steps:
  1. Attempt to create another payout for June 1-30
  2. Verify error: "Payout already exists for this period"
  3. Verify no duplicate payout in database
- Expected: ✅ Duplicate prevented; validation enforced
- Test Data: Existing payout

---

### Feature 7: Safeguard 2 - Self-Booking Prevention
**Purpose:** Verify staff cannot use own referral code.

**Test Case 7.1 - Prevent Self-Booking via Own Code**
- Pre-condition: John (Staff Agent) has code STAFF-JOHN-ABC123
- Steps:
  1. John attempts to book tour using his own code
  2. System checks: CodeOwner == CurrentUser
  3. Verify validation error: "Cannot use own referral code"
  4. Booking rejected
- Expected: ✅ Self-booking blocked; error message clear
- Test Data: John's code, John's user session

---

### Feature 8: Safeguard 3 - Code Sharing Prevention
**Purpose:** Detect anomalous code usage (IP changes, geographic impossibilities).

**Test Case 8.1 - Track Code Usage with IP/Location**
- Pre-condition: John's code STAFF-JOHN-ABC123; booking system logs IP/location
- Steps:
  1. Customer A uses John's code from IP 192.168.1.1, Location: Kuala Lumpur
  2. 2 minutes later, Customer B uses same code from IP 10.0.0.1, Location: Singapore
  3. Query CodeUsageAudit table
  4. Verify both records exist with different IPs and locations
  5. Generate anomaly report
  6. Verify system flags as suspicious: "Different locations < 5 min apart"
- Expected: ✅ Code usage tracked; anomalies detected
- Test Data: Two rapid bookings from different locations

---

### Feature 9: Safeguard 6 - Duplicate Booking Prevention
**Purpose:** Prevent same customer from booking same tour on same date twice.

**Test Case 9.1 - Reject Duplicate Booking**
- Pre-condition: Customer A booked Tour X on 2026-07-15
- Steps:
  1. Customer A attempts to book Tour X again on 2026-07-15
  2. System checks: Customer + Tour + Date combination
  3. Verify validation error: "Customer already has booking for this tour on this date"
  4. Booking rejected
- Expected: ✅ Duplicate rejected with clear message
- Test Data: Existing booking

**Test Case 9.2 - Allow Same Customer on Different Date**
- Pre-condition: Customer A booked Tour X on 2026-07-15
- Steps:
  1. Customer A books Tour X on 2026-07-20 (different date)
  2. Verify success
  3. Two separate bookings exist in database
- Expected: ✅ Different dates allowed; no duplicate detected
- Test Data: Two dates for same customer/tour

---

### Feature 10: Safeguard 10 - Dispute Resolution Workflow
**Purpose:** Verify disputes created, reviewed, and resolved without direct override.

**Test Case 10.1 - SuperAdmin Creates Dispute Ticket**
- Pre-condition: Commission ($195 John) disputed; SuperAdmin logged in
- Steps:
  1. SuperAdmin navigates to Create Dispute
  2. Select CommissionAccrual ID, enter reason: "Incorrect calculation"
  3. Propose fix: "Commission should be $185, not $195"
  4. Submit
  5. Verify ticket created in DisputeResolutionTicket table
  6. Verify Status = "Open"
  7. Verify audit log: CreateDisputeTicket action
- Expected: ✅ Ticket created; status Open; audit logged
- Test Data: Commission ID to dispute

**Test Case 10.2 - Tenant Admin Reviews & Approves**
- Pre-condition: Dispute ticket from 10.1 created
- Steps:
  1. Tenant Admin (Bob) receives notification
  2. Views ticket details
  3. Reviews proposed fix: "$185"
  4. Clicks "Approve"
  5. Verify Status → "Approved"
  6. Verify AdjustedAmount set to $185
  7. Verify ReviewedByTenantAdminId = Bob's ID
  8. Check audit log: DisputeApproved action
- Expected: ✅ Dispute approved; adjustment recorded; audit trail complete
- Test Data: Open dispute ticket

**Test Case 10.3 - System Recalculates Commission Post-Approval**
- Pre-condition: Dispute approved with AdjustedAmount = $185
- Steps:
  1. Trigger post-approval workflow
  2. System creates adjustment record: Original $195 → Adjusted $185
  3. Next payout includes adjustment ($185, not $195)
  4. Verify audit trail: full adjustment journey visible
- Expected: ✅ Commission adjusted in payout; full trail maintained
- Test Data: Approved dispute

**Test Case 10.4 - Tenant Admin Can Reject Dispute**
- Pre-condition: Different dispute ticket in "Open" status
- Steps:
  1. Tenant Admin clicks "Reject"
  2. Verify Status → "Rejected"
  3. Verify original commission unchanged
  4. Check audit log: DisputeRejected action
- Expected: ✅ Dispute rejected; original amount preserved
- Test Data: Open dispute ticket

---

### Feature 11: Audit Trail & SuperAdmin Oversight
**Purpose:** Verify all SuperAdmin actions logged for accountability.

**Test Case 11.1 - Audit Log for Admin Creation**
- Pre-condition: SuperAdmin created Platform Admin Alice
- Steps:
  1. Query AuditLog table filtering for action: "CreateAdmin"
  2. Verify record exists with:
     - SuperAdminId = Current user
     - AffectedEntityType = "AdminUser"
     - AffectedEntityId = Alice's ID
     - Reason contains action details
     - Timestamp = creation time
- Expected: ✅ Audit trail complete and queryable
- Test Data: Alice admin ID

**Test Case 11.2 - Audit Log for Commission Dispute**
- Pre-condition: SuperAdmin created dispute ticket
- Steps:
  1. Query AuditLog for action: "CreateDisputeTicket"
  2. Verify record contains:
     - SuperAdminId = dispute creator
     - AffectedEntityType = "DisputeResolutionTicket"
     - AffectedEntityId = ticket ID
     - Reason = "Incorrect calculation"
- Expected: ✅ Dispute logged with full context
- Test Data: Dispute ticket ID

---

## Test Data Requirements

**Pre-Loaded Data (from Seed-Data.sql):**
- 1 SuperAdmin: litotjuliano@gmail.com
- 3 Admins: Alice (Platform), Bob (Tenant A), Carol (Tenant B)
- 2 Tenants: Tenant A, Tenant B
- 4 Staff Agents: John (15%), Jane (8%), Mike (10%), Sarah (12%)
- 5 Tours across tenants
- 10 Bookings with various statuses
- 10 Commission Accruals (various states)

**June Commission Results (Expected):**
| Agent | Finalized | Pending | Reversed | Total |
|-------|-----------|---------|----------|-------|
| John | $195 | $45 | $75 | $115 |
| Jane | $104 | - | - | $104 |
| Mike | $30 | - | - | $30 |
| Travel Influencer | $270 | - | - | $270 |
| **TOTAL** | **$599** | **$45** | **$75** | **$519** |

---

## Success Criteria

✅ All role hierarchy tests pass  
✅ All agent model tests pass  
✅ All 10 safeguards verified  
✅ Commission workflow end-to-end functional  
✅ Audit trail complete & auditable  
✅ Dispute resolution workflow operational  
✅ No cross-tenant data visible  
✅ Performance acceptable (all queries < 500ms)  

---

## Sign-Off

- **Prepared By:** Development Team
- **Ready For Testing:** 2026-06-11
- **Target Completion:** 2026-06-15
- **Notes:** All code committed to feature/phase1-core-entities branch. Ready for DevHub testing.

