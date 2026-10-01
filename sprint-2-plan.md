# AbangCebu AI — Sprint 2 Master Plan & Execution Specification (Granular Module Breakdown)

**Document Version:** 2.0.0  
**Status:** Approved for Sprint 2 Execution  
**Project:** AbangCebu AI (`abang-cebu-ai`)  
**Target Sprint:** Sprint 2 (Sprint ID: `70` / Board ID: `1`)  
**Architecture Granularity:** Option B (Granular Feature/Screen-Level Modules)  
**Author:** Hermar Centillas (Lead / Scrum Master)  
**Co-Authors:** Engineering Team & QA Lead (Jenny Villamor)  
**Created Date:** October 1, 2026  

---

## 1. Executive Summary & Granularity Rationale

In response to academic and project review requirements specifying a **strict per-module breakdown**, the system architecture is decomposed into **16 granular, self-contained functional modules** (Option B). 

Under this model:
- Sub-processes previously grouped under parent umbrellas (such as Login, Registration, and Password Reset) are formalized as **independent system modules** with their own workflows, actors, database interactions, error states, and dedicated `.drawio` flowchart specifications.
- Features with dual interfaces (such as Interactive Map Discovery vs Structured Attribute Filter Search) are cleanly decoupled to provide modular clarity for developers, testers, and academic evaluators.

---

## 2. Section A: Final Granular Module List (16 Modules)

| # | Module Name | System Description & Scope | Current Status | Primary Evidence / Source |
|---|---|---|---|---|
| **1** | **User Registration Module** | Renter and Landlord account creation, role selection, NIST SP 800-63B password complexity, Philippine mobile format normalization (`+639XXXXXXXXX`), Turnstile bot validation, and PKCE verification email dispatch. | **Foundation Implemented / Pre-UI** | [`src/types/auth.ts`](file:///home/hrmr/abang-cebu-ai/src/types/auth.ts), [`docs/specifications/auth/auth-registration-spec.md`](file:///home/hrmr/abang-cebu-ai/docs/specifications/auth/auth-registration-spec.md), [`docs/design/registration-page-wireframe.md`](file:///home/hrmr/abang-cebu-ai/docs/design/registration-page-wireframe.md) |
| **2** | **User Login & Session Module** | User authentication, Supabase GoTrue JWT exchange, HTTP-only cookie chunking (`sb-*-auth-token`), Refresh Token Rotation (RTR), multi-tab synchronization (`BroadcastChannel`), and role-based route redirects. | **Foundation Implemented / Pre-UI** | [`src/types/auth.ts`](file:///home/hrmr/abang-cebu-ai/src/types/auth.ts), [`middleware.ts`](file:///home/hrmr/abang-cebu-ai/middleware.ts), [`docs/specifications/auth/auth-session-lifecycle.md`](file:///home/hrmr/abang-cebu-ai/docs/specifications/auth/auth-session-lifecycle.md), [`docs/design/login-page-wireframe.md`](file:///home/hrmr/abang-cebu-ai/docs/design/login-page-wireframe.md) |
| **3** | **Password Reset & Recovery Module** | Self-service password recovery, anti-enumeration security timing, single-use PKCE recovery email dispatch, password updates, and mandatory global revocation of older sessions (`scope: 'global'`). | **Foundation Implemented / Pre-UI** | [`docs/specifications/auth/auth-password-reset-spec.md`](file:///home/hrmr/abang-cebu-ai/docs/specifications/auth/auth-password-reset-spec.md), [`docs/testing/auth-test-plan.md`](file:///home/hrmr/abang-cebu-ai/docs/testing/auth-test-plan.md) |
| **4** | **User Profile Management Module** | Management of `public.profiles`, personal information updates (full name, phone number, bio), avatar image uploads to Supabase storage with MIME/size limits, and account preferences. | **Foundation Implemented / In Development** | [`docs/database/users-and-profiles-schema.md`](file:///home/hrmr/abang-cebu-ai/docs/database/users-and-profiles-schema.md), [`src/types/database.ts`](file:///home/hrmr/abang-cebu-ai/src/types/database.ts), [`docs/design/profile-page-wireframe.md`](file:///home/hrmr/abang-cebu-ai/docs/design/profile-page-wireframe.md) |
| **5** | **Property Listing Creation Module** | Landlord property creation wizard: property metadata (building type, address, barangay, city, PostGIS coordinates), multi-unit configurations (rent, deposit, rooms, rules), amenity tagging, and photo uploads. | **Schema Defined / Planned** | [`docs/database/database-erd.md`](file:///home/hrmr/abang-cebu-ai/docs/database/database-erd.md) (`properties`, `rental_units`, `property_photos`, `amenities`), [`docs/architecture/what-is-abangcebu-ai.md`](file:///home/hrmr/abang-cebu-ai/docs/architecture/what-is-abangcebu-ai.md) |
| **6** | **Unit Availability & Management Module** | Landlord listing dashboard: toggling real-time room/bedspace occupancy (`is_available`), adjusting monthly rental rates, archiving units, and reviewing unit-specific views and inquiries. | **Schema Defined / Planned** | [`docs/database/database-erd.md`](file:///home/hrmr/abang-cebu-ai/docs/database/database-erd.md) (`rental_units.is_available`), [`docs/design/user-dashboard-wireframe.md`](file:///home/hrmr/abang-cebu-ai/docs/design/user-dashboard-wireframe.md) |
| **7** | **Interactive Map Discovery Module** | Geospatial rental visualization across Metro Cebu using MapLibre GL: viewport bounding-box synchronization (`&& ST_MakeEnvelope`), interactive price pins, geolocation centering, and pin selection preview drawers. | **Schema Defined / Planned** | [`docs/database/database-erd.md`](file:///home/hrmr/abang-cebu-ai/docs/database/database-erd.md) (PostGIS section), [`docs/design/mobile-map-wireframes.md`](file:///home/hrmr/abang-cebu-ai/docs/design/mobile-map-wireframes.md), [`src/components/map/`](file:///home/hrmr/abang-cebu-ai/src/components/map/) |
| **8** | **Property Search & Filter Module** | Parametric multi-facet search engine: filtering by budget min/max, room category (bedspace, room, condo), gender rules, curfew, visitor policy, utilities, and landmark radius (`ST_DWithin`). | **Schema Defined / Planned** | [`docs/architecture/what-is-abangcebu-ai.md`](file:///home/hrmr/abang-cebu-ai/docs/architecture/what-is-abangcebu-ai.md), [`docs/database/database-erd.md`](file:///home/hrmr/abang-cebu-ai/docs/database/database-erd.md) |
| **9** | **AI Rental Assistant Module** | Natural language conversational finder supporting English and Cebuano/Bisaya; translates prompts into structured query filters; resolves ambiguous landmarks; strictly grounded in approved database listings. | **Behavioral Spec Defined / Planned** | [`docs/architecture/what-is-abangcebu-ai.md`](file:///home/hrmr/abang-cebu-ai/docs/architecture/what-is-abangcebu-ai.md) (Sections: "The Role of AI", "How It Works") |
| **10** | **Inquiry & Viewing Reservation Module** | Manages renter inquiries on properties and schedules in-person ocular viewing visits (`viewing_date`); handles landlord acceptance/rescheduling state machine. Excludes financial payment processing. | **Schema Defined / Planned** | [`docs/database/database-erd.md`](file:///home/hrmr/abang-cebu-ai/docs/database/database-erd.md) (`inquiries` table), [`docs/architecture/what-is-abangcebu-ai.md`](file:///home/hrmr/abang-cebu-ai/docs/architecture/what-is-abangcebu-ai.md) |
| **11** | **Landlord KYC & Verification Module** | Anti-scam trust layer: Landlord government ID upload (PhilSys, Passport, PRC, UMID) and proof of property ownership; private storage RLS; administrative review queue before public listing publishing. | **Schema & Types Defined / Planned** | [`docs/database/database-erd.md`](file:///home/hrmr/abang-cebu-ai/docs/database/database-erd.md) (`kyc_verifications`), [`src/types/database.ts`](file:///home/hrmr/abang-cebu-ai/src/types/database.ts) (`KycStatus`, `KycIdType`) |
| **12** | **Messaging & Contact Module** | Direct communication channel between renters and verified landlords; exposes verified phone numbers, direct contact links, and inquiry conversation threads. | **Architectural Scope Defined / Planned** | [`docs/architecture/what-is-abangcebu-ai.md`](file:///home/hrmr/abang-cebu-ai/docs/architecture/what-is-abangcebu-ai.md), [`docs/database/database-erd.md`](file:///home/hrmr/abang-cebu-ai/docs/database/database-erd.md) |
| **13** | **Review & Rating Module** | Verified tenant evaluation workflow: 1-to-5 star ratings, qualitative feedback, verified tenant badges, and aggregate rating score calculations on properties. | **Schema Defined / Planned** | [`docs/database/database-erd.md`](file:///home/hrmr/abang-cebu-ai/docs/database/database-erd.md) (`reviews` table) |
| **14** | **Reporting & Scam Flagging Module** | Community moderation tool: allows users to flag fraudulent listings, inaccurate pricing, or abusive landlords; triggers immediate administrative alerts in audit queue. | **Schema Defined / Planned** | [`docs/database/database-erd.md`](file:///home/hrmr/abang-cebu-ai/docs/database/database-erd.md) (`audit_logs`), [`docs/architecture/what-is-abangcebu-ai.md`](file:///home/hrmr/abang-cebu-ai/docs/architecture/what-is-abangcebu-ai.md) |
| **15** | **Admin Management & Moderation Module** | Central governance portal for administrators: listing approval/rejection queue, landlord KYC verification review, account suspensions (`is_suspended`), and immutable audit log inspection. | **Wireframe & Schema Defined / Planned** | [`docs/design/admin-dashboard-wireframe.md`](file:///home/hrmr/abang-cebu-ai/docs/design/admin-dashboard-wireframe.md), [`docs/database/database-erd.md`](file:///home/hrmr/abang-cebu-ai/docs/database/database-erd.md) (`audit_logs`), [`src/types/database.ts`](file:///home/hrmr/abang-cebu-ai/src/types/database.ts) (`is_admin`) |
| **16** | **Notification Module** | Transactional alerting system: dispatches email and in-app badge notifications for inquiry status transitions, viewing confirmations, KYC verification outcomes, and security alerts. | **Architectural Scope Defined / Planned** | [`docs/specifications/auth/auth-registration-spec.md`](file:///home/hrmr/abang-cebu-ai/docs/specifications/auth/auth-registration-spec.md), [`docs/database/database-erd.md`](file:///home/hrmr/abang-cebu-ai/docs/database/database-erd.md) |

---

## 3. Section B: Flowchart Deliverables Directory (`docs/flowcharts/`)

Each of the 16 modules receives its own dedicated `.drawio` file, adopting standard uncompressed XML and clean monochrome formatting:

```text
docs/
└── flowcharts/
    ├── user-registration.drawio          # Module 1: Registration, Validation & PKCE Activation
    ├── user-login.drawio                 # Module 2: Login, Session Token & Role Routing
    ├── password-reset.drawio             # Module 3: Self-Service Password Recovery & Invalidation
    ├── user-profile-management.drawio    # Module 4: Profile Details & Avatar Upload
    ├── property-listing-creation.drawio  # Module 5: Landlord Multi-Unit Listing Submission
    ├── unit-availability.drawio          # Module 6: Real-Time Occupancy & Unit Controls
    ├── interactive-map.drawio            # Module 7: MapLibre Viewport Panning & Spatial Query
    ├── property-search.drawio            # Module 8: Multi-Facet Filter & Radius Search
    ├── ai-rental-assistant.drawio        # Module 9: Natural Language Parsing & Recommendations
    ├── inquiry-reservation.drawio        # Module 10: Ocular Viewing Requests & Scheduling State
    ├── landlord-verification.drawio      # Module 11: Government ID Submission & Trust Pipeline
    ├── messaging-contact.drawio          # Module 12: Direct Inquiry Communication & Contact
    ├── review-rating.drawio              # Module 13: Verified Tenant Ratings & Reviews
    ├── report-moderation.drawio          # Module 14: Fraud Reporting & Moderation Flagging
    ├── admin-management.drawio           # Module 15: Admin Governance, Moderation & Audit Logs
    └── notification.drawio               # Module 16: Transactional Alerts & In-App Notices
```

---

## 4. Section C: Revised Sprint 2 Task Breakdown (Sprint 1 Standard Alignment)

```text
SPRINT 2 TASK STRUCTURE (MODULES, FLOWCHARTS & TEST SPECIFICATIONS)
├── STREAM 1: System Module Architecture & Boundaries (SCRUM-75)
├── STREAM 2: System Module Flowchart Authoring & Visual Verification (SCRUM-76 to SCRUM-81)
├── STREAM 3: Modular QA Test Specifications & Test Case Migration (SCRUM-82 to SCRUM-87)
├── STREAM 4: Security RBAC & Middleware Route Test Matrices (SCRUM-88)
├── STREAM 5: Spatial & AI Performance Baseline Strategy (SCRUM-89)
└── STREAM 6: Master QA Workbook & Deliverable Sign-Off (SCRUM-90 to SCRUM-91)
```

### Stream 1: System Module Architecture & Boundaries
- **SCRUM-75: Module Architecture Finalization & System Boundary Sign-Off** (Done / Lead)  
  Finalize 16 granular modules across Identity, Marketplace, Discovery, AI, Trust, and Governance; sign off on zero in-app payment / escrow boundary.

### Stream 2: System Module Flowchart Authoring & Visual Verification
- **SCRUM-76: Author Authentication & User Management Flowcharts (4 .drawio files)** (Done / John Lloyd Ando & Lead)  
  Modules 01–04 (`user-registration.drawio`, `user-login.drawio`, `password-reset.drawio`, `user-profile-management.drawio`).
- **SCRUM-77: Author Property Listing & Availability Flowcharts (2 .drawio files)** (Done / Dency Marie Bosque & Lead)  
  Modules 05–06 (`property-listing-creation.drawio`, `unit-availability.drawio`).
- **SCRUM-78: Author Interactive Map & Search Filter Flowcharts (2 .drawio files)** (Done / Angel Crushein Yaun, Neah Moneva & Lead)  
  Modules 07–08 (`interactive-map.drawio`, `property-search.drawio`).
- **SCRUM-79: Author AI Assistant & Viewing Reservation Flowcharts (2 .drawio files)** (Done / Michelle Estoy, Edrich Bardilas & Lead)  
  Modules 09–10 (`ai-rental-assistant.drawio`, `inquiry-reservation.drawio`).
- **SCRUM-80: Author Landlord KYC & Direct Messaging Flowcharts (2 .drawio files)** (Done / Michelle Estoy, Edrich Bardilas & Lead)  
  Modules 11–12 (`landlord-verification.drawio`, `messaging-contact.drawio`).
- **SCRUM-81: Author Review, Moderation & Notification Flowcharts (4 .drawio files)** (Done / Anne KC, Karla, Ryza & Lead)  
  Modules 13–16 (`review-rating.drawio`, `report-moderation.drawio`, `admin-management.drawio`, `notification.drawio`).

### Stream 3: Modular QA Test Specifications & Test Case Migration
- **SCRUM-82: Author Auth & Identity Lifecycle QA Test Specification (Modules 01–04)** (1.5d / Jenny Villamor & John Lloyd)  
  Migrate and expand 24 test cases (`TC-REG-01..07`, `TC-LOG-01..07`, `TC-RST-01..05`, `TC-PROF-01..05`) from Sprint 1 foundations.
- **SCRUM-83: Author Property Listing & Availability QA Test Specification (Modules 05–06)** (1.5d / Dency Marie Bosque & Jenny Villamor)  
  Author 10 test cases (`TC-PROP-01..06`, `TC-AVAIL-01..04`) covering multi-unit wizard, PostGIS coordinate validation, and occupancy toggles.
- **SCRUM-84: Author Interactive Map & Parametric Search QA Test Specification (Modules 07–08)** (1.5d / Angel Crushein & Neah Moneva)  
  Author 11 test cases (`TC-MAP-01..05`, `TC-SRCH-01..06`) covering viewport bounding box (`ST_MakeEnvelope`), clustering, and landmark radius (`ST_DWithin`).
- **SCRUM-85: Author AI Rental Assistant & Viewing Reservation QA Test Specification (Modules 09–10)** (1.5d / Michelle Estoy & Edrich Bardilas)  
  Author 10 test cases (`TC-AI-01..05`, `TC-INQ-01..05`) covering natural language Bisaya/English queries, grounding defenses, and ocular viewing scheduling.
- **SCRUM-86: Author Landlord KYC Verification & Direct Messaging QA Test Specification (Modules 11–12)** (1.5d / Michelle Estoy & Edrich Bardilas)  
  Author 9 test cases (`TC-KYC-01..05`, `TC-MSG-01..04`) covering PhilSys/Passport validation, private storage RLS, and direct verified messaging.
- **SCRUM-87: Author Governance, Moderation & Notification QA Test Specification (Modules 13–16)** (1.5d / Anne KC, Karla & Ryza)  
  Author 14 test cases (`TC-REV-01..04`, `TC-REP-01..04`, `TC-ADM-01..04`, `TC-NOTIF-01..02`) covering reviews, scam reports, admin console, and alerts.

### Stream 4: Security RBAC & Middleware Route Test Matrices
- **SCRUM-88: Author Sprint 2 RBAC & Route Middleware Test Specification (All 16 Modules)** (1.0d / Karla Hiyas & Anne KC)  
  Expand Sprint 1 RBAC and middleware test scenarios to govern route permissions across all 16 granular modules.

### Stream 5: Spatial & AI Performance Baseline Strategy
- **SCRUM-89: Author Sprint 2 Spatial & AI Query Performance Baseline Strategy** (1.0d / Ryza Albiso)  
  Formulate latency SLAs (<200ms PostGIS viewport, <1.5s AI streaming) mirroring Sprint 1 `auth-performance-baseline.md`.

### Stream 6: Master QA Workbook & Deliverable Sign-Off
- **SCRUM-90: Compile Sprint 2 Master QA Test Specification Workbook (Excel .xlsx Companion)** (1.0d / Jenny Villamor)  
  Generate multi-sheet workbook `AbangCebu_Sprint2_Master_Test_Specification.xlsx` adhering to `Test_Specification_Template.xlsx`.
- **SCRUM-91: Compile Sprint 2 Master QA Test Plan & Audit Sign-Off Package (PDF)** (0.5d / Lead & Jenny Villamor)  
  Compile `AbangCebu_Sprint2_Master_Test_Plan.pdf` and synchronize all Jira issues for Sprint 2 defense.

---

## 5. Section D: Master QA Test Plan (Option B Mappings — 77 Test Cases)

All 16 granular modules are mapped to corresponding test suites in `docs/testing/sprint-2-master-test-plan.md` and `docs/testing/AbangCebu_Sprint2_Master_Test_Specification.xlsx`:

```
+-------------------------------------------------------------------------------------------------------------------+
|                                  GRANULAR QA TEST SUITE TRACEABILITY MATRIX (77 CASES)                            |
+---------------------+-----------------------------------+-----------------------------------------+---------------+
| Domain              | Granular Module Name              | Covered QA Suite & Test Case IDs        | Jira Ticket   |
+---------------------+-----------------------------------+-----------------------------------------+---------------+
| **Identity**        | User Registration Module          | Suite 1: Registration (`TC-REG-01..07`) | SCRUM-82      |
| **Identity**        | User Login & Session Module       | Suite 2: Login & Session (`TC-LOG-01..07`)| SCRUM-82    |
| **Identity**        | Password Reset & Recovery Module  | Suite 3: Recovery (`TC-RST-01..05`)     | SCRUM-82      |
| **Identity**        | User Profile Management Module    | Suite 4: Profiles (`TC-PROF-01..05`)    | SCRUM-82      |
| **Marketplace**     | Property Listing Creation Module  | Suite 5: Listing Creation (`TC-PROP-01..06`)| SCRUM-83   |
| **Marketplace**     | Unit Availability Module          | Suite 6: Unit Controls (`TC-AVAIL-01..04`)| SCRUM-83     |
| **Discovery**       | Interactive Map Discovery Module  | Suite 7: Map Spatial (`TC-MAP-01..05`)  | SCRUM-84      |
| **Discovery**       | Property Search & Filter Module   | Suite 8: Filters & Search (`TC-SRCH-01..06`)| SCRUM-84    |
| **Intelligence**    | AI Rental Assistant Module        | Suite 9: AI Grounding (`TC-AI-01..05`)  | SCRUM-85      |
| **Intelligence**    | Inquiry & Viewing Reservation     | Suite 10: Inquiries (`TC-INQ-01..05`)   | SCRUM-85      |
| **Trust**           | Landlord KYC & Verification       | Suite 11: Trust & KYC (`TC-KYC-01..05`) | SCRUM-86      |
| **Trust**           | Messaging & Contact Module        | Suite 12: Communication (`TC-MSG-01..04`)| SCRUM-86     |
| **Governance**      | Review & Rating Module            | Suite 13: Reviews (`TC-REV-01..04`)     | SCRUM-87      |
| **Governance**      | Reporting & Scam Flagging Module  | Suite 14: Moderation Flags (`TC-REP-01..04`)| SCRUM-87   |
| **Governance**      | Admin Management & Moderation     | Suite 15: Admin Controls (`TC-ADM-01..05`)| SCRUM-87     |
| **Governance**      | Notification Module               | Suite 16: System Alerts (`TC-NOTIF-01..04`)| SCRUM-87    |
+---------------------+-----------------------------------+-----------------------------------------+---------------+
```

---

## 6. Section E: Unclear Items & Clarifications

1. **Exclusion of Payment Processing:** Reconfirmed. The platform facilitates inquiries and in-person viewings; payments occur off-platform directly between parties.
2. **Dedicated `.drawio` Files:** 16 separate `.drawio` files will be placed inside `docs/flowcharts/`, giving the instructor a distinct diagram for every module.
