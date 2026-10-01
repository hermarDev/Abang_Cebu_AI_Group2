# 📚 AbangCebu AI — Engineering Documentation Hub

**Project:** AbangCebu AI (AI-Powered Map-Centric Rental Discovery Platform for Metro Cebu)  
**Engineering Team:** Group 2  
**Lead / Scrum Master:** Hermar Centillas  
**Frontend Framework:** Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS v4  
**Backend & Database:** Supabase BaaS (PostgreSQL 15+ with PostGIS, GoTrue Auth, Row Level Security)  

---

## 1. Documentation Architecture

The `docs/` repository is organized into modular engineering domains aligned with enterprise software architecture and quality standards:

```
docs/
├── README.md                                # Master Documentation Map (This Document)
│
├── templates/                               # Standard Engineering Templates
│   ├── Database_Specification_Template.xlsx # Data Dictionary & Database Spec Template
│   ├── Function_Specification_Document.docx # Functional Specification Document (FSD) Template
│   └── Test_Specification_Template.xlsx     # QA Test Plan & Test Execution Template
│
├── specifications/                          # Functional Specification Documents (FSD Modules)
│   └── auth/                                # Module 1: Authentication & Identity Lifecycle
│       ├── auth-registration-spec.md        # SCRUM-56: Registration contracts & PKCE verification
│       ├── auth-session-lifecycle.md        # SCRUM-57: Login, JWT, RTR, and middleware token flow
│       ├── auth-logout-spec.md              # SCRUM-58: Sign-out, cookie chunk zeroing & multi-tab sync
│       ├── auth-password-reset-spec.md      # SCRUM-59: Recovery flow, anti-enumeration & global revocation
│       └── auth-error-handling.md           # SCRUM-60: Failure taxonomy, JSON contracts & UX matrix
│
├── database/                                # Relational Schema, PostGIS & Data Dictionary
│   ├── database-erd.md                      # SCRUM-53: 11-entity relational data model in 3NF
│   ├── users-and-profiles-schema.md         # SCRUM-54: Profiles, roles, KYC verifications DDL
│   └── supabase-architecture.md             # Supabase BaaS infrastructure & extensions
│
├── security/                                # Authorization, Tenant Isolation & Secrets
│   ├── rbac-matrix.md                       # SCRUM-63: Role-Based Access Control matrix
│   ├── rls-policies.md                      # SCRUM-55: PostgreSQL Row Level Security policies
│   └── environment-variables.md             # SCRUM-51: Secrets governance & validation
│
├── design/                                  # UI Design System, Tokens & Personas
│   ├── styling-guidelines.md                # SCRUM-50: Tailwind v4 tokens & Cebu coastal palette
│   ├── renter-persona.md                    # SCRUM-61: Renter persona ("Mika") & journey map
│   ├── landing-page-wireframe.md            # SCRUM-64: Landing page wireframe & desktop/mobile layout
│   ├── mobile-map-wireframes.md             # SCRUM-64: Mobile map viewport & 3-snap bottom sheet spec
│   ├── login-page-wireframe.md              # SCRUM-65: Login page wireframe & desktop/mobile layout
│   └── registration-page-wireframe.md       # SCRUM-66: Registration page wireframe & role-conditional layout
│
├── architecture/                            # System Boundaries & Framework Standards
│   ├── what-is-abangcebu-ai.md              # Official product vision & platform boundaries
│   ├── client-server-boundaries.md          # Next.js Server vs Client Components governance
│   ├── next15-guidelines.md                 # Modern App Router conventions & caching
│   ├── project-structure.md                 # Monorepo directory structure & conventions
│   └── git-workflow.md                      # SCRUM-49: Branching, PRs, and commit guidelines
│
├── testing/                                 # Quality Assurance & Verification Test Plans
│   ├── auth-test-plan.md                    # SCRUM-69: Comprehensive QA test plan & matrix (Sprint 1)
│   ├── AbangCebu_Auth_Test_Specification.xlsx # SCRUM-69: Populated QA test workbook (Sprint 1)
│   ├── rbac-test-cases.md                   # SCRUM-70: Role & access permission verification test cases
│   ├── middleware-test-scenarios.md         # SCRUM-71: Protected route & middleware test scenarios
│   ├── auth-performance-baseline.md         # SCRUM-72: Authentication baseline latency & load strategy
│   ├── sprint-2-master-test-plan.md         # SCRUM-88: Sprint 2 Master QA Test Plan (16 Modules, 77 Tests)
│   └── AbangCebu_Sprint2_Master_Test_Specification.xlsx # SCRUM-90: Sprint 2 Multi-Sheet Master Test Workbook
│
├── pdf/                                     # Formal Architecture & Governance PDFs
│   ├── AbangCebu_Auth_Registration_Specification.pdf
│   ├── AbangCebu_Auth_Session_Lifecycle_Specification.pdf
│   ├── AbangCebu_Auth_Logout_Specification.pdf
│   ├── AbangCebu_Auth_Password_Reset_Specification.pdf
│   ├── AbangCebu_Auth_Error_Handling_Specification.pdf
│   ├── AbangCebu_Auth_Test_Plan_Specification.pdf
│   ├── AbangCebu_Database_ERD_Architecture.pdf
│   ├── AbangCebu_Users_And_Profiles_Schema.pdf
│   ├── AbangCebu_Renter_Persona_and_Access_Rights.pdf
│   ├── AbangCebu_UI_Styling_Guidelines.pdf
│   ├── AbangCebu_Landing_Page_Wireframe_Specification.pdf
│   ├── AbangCebu_Login_Page_Wireframe_Specification.pdf
│   ├── AbangCebu_Registration_Page_Wireframe_Specification.pdf
│   ├── AbangCebu_User_Dashboard_Wireframe_Specification.pdf
│   ├── AbangCebu_Profile_Page_Wireframe_Specification.pdf
│   ├── AbangCebu_Admin_Dashboard_Wireframe_Specification.pdf
│   ├── AbangCebu_RBAC_Test_Verification_Matrix.pdf
│   ├── AbangCebu_Middleware_Test_Scenarios.pdf
│   ├── AbangCebu_Auth_Performance_Baseline.pdf
│   ├── AbangCebu_Sprint2_Master_Plan.pdf
│   ├── AbangCebu_Auth_And_User_Management_Flowcharts.pdf
│   ├── AbangCebu_Property_Listing_Flowcharts.pdf
│   ├── AbangCebu_Map_And_Search_Flowcharts.pdf
│   ├── AbangCebu_AI_And_Inquiry_Flowcharts.pdf
│   ├── AbangCebu_Trust_And_Messaging_Flowcharts.pdf
│   ├── AbangCebu_Governance_And_Notification_Flowcharts.pdf
│   └── AbangCebu_Sprint2_Master_Test_Plan.pdf
│
├── flowcharts/                               # Sprint 2 System Module Flowcharts (.drawio)
│   ├── user-registration.drawio             # Module 01: Registration, validation & PKCE activation
│   ├── user-login.drawio                    # Module 02: Login, session token lifecycle & role routing
│   ├── password-reset.drawio                # Module 03: Self-service recovery & global session revocation
│   ├── user-profile-management.drawio       # Module 04: Profile details, phone validation & avatar upload
│   ├── property-listing-creation.drawio     # Module 05: Landlord multi-unit property creation wizard
│   ├── unit-availability.drawio             # Module 06: Real-time room/bedspace occupancy toggle
│   ├── interactive-map.drawio               # Module 07: MapLibre GL viewport bounds & spatial query
│   ├── property-search.drawio               # Module 08: Parametric filter drawer & landmark radius
│   ├── ai-rental-assistant.drawio           # Module 09: Natural language parser & recommendation engine
│   ├── inquiry-reservation.drawio           # Module 10: Ocular viewing scheduling & inquiry state machine
│   ├── landlord-verification.drawio         # Module 11: Government ID & title document verification (KYC)
│   ├── messaging-contact.drawio             # Module 12: Direct inquiry messaging & verified contact
│   ├── review-rating.drawio                 # Module 13: Verified tenant rating & reviews workflow
│   ├── report-moderation.drawio             # Module 14: Fraud reporting & listing moderation flag
│   ├── admin-management.drawio              # Module 15: Admin command center, moderation & audit logs
│   └── notification.drawio                  # Module 16: Transactional email & in-app badge alerts
│
└── assets/                                  # Visual Diagrams & Architecture Assets
    ├── abangcebu_database_erd.png           # High-resolution ERD rendering
    ├── abangcebu_database_erd.svg           # Vector source ERD
    ├── flowcharts/                          # 16 High-Resolution PNG & SVG Flowcharts (150 DPI)
    │   ├── AbangCebu_User_Registration_Flowchart.png
    │   ├── AbangCebu_User_Login_Flowchart.png
    │   ├── AbangCebu_Password_Reset_Flowchart.png
    │   ├── AbangCebu_User_Profile_Management_Flowchart.png
    │   ├── AbangCebu_Property_Listing_Creation_Flowchart.png
    │   ├── AbangCebu_Unit_Availability_Flowchart.png
    │   ├── AbangCebu_Interactive_Map_Discovery_Flowchart.png
    │   ├── AbangCebu_Property_Search_Filter_Flowchart.png
    │   ├── AbangCebu_AI_Rental_Assistant_Flowchart.png
    │   ├── AbangCebu_Inquiry_Viewing_Reservation_Flowchart.png
    │   ├── AbangCebu_Landlord_KYC_Verification_Flowchart.png
    │   ├── AbangCebu_Messaging_Contact_Flowchart.png
    │   ├── AbangCebu_Review_Rating_Flowchart.png
    │   ├── AbangCebu_Report_Moderation_Flowchart.png
    │   ├── AbangCebu_Admin_Management_Flowchart.png
    │   └── AbangCebu_Notification_Flowchart.png
    └── wireframes/                          # Visual wireframe blueprints
        ├── landing-page-desktop.svg         # 1440x900 desktop Google Maps wireframe blueprint
        ├── landing-page-mobile.svg          # 390x844 mobile 100dvh wireframe blueprint
        ├── login-page-desktop.svg           # 1440x900 desktop login split-screen wireframe blueprint
        ├── login-page-mobile.svg            # 393x852 mobile 4-state login wireframe blueprint
        ├── registration-page-desktop.svg    # 1440x900 desktop registration wireframe blueprint
        ├── registration-page-mobile.svg     # 393x852 mobile 4-state registration wireframe blueprint
        ├── user-dashboard-desktop.svg       # 1440x900 desktop user dashboard wireframe blueprint
        ├── user-dashboard-mobile.svg        # 393x852 mobile 4-state dashboard wireframe blueprint
        ├── profile-page-desktop.svg         # 1440x900 desktop profile & settings wireframe blueprint
        ├── profile-page-mobile.svg          # 393x852 mobile 4-state profile wireframe blueprint
        ├── admin-dashboard-desktop.svg      # 1440x900 desktop admin dashboard wireframe blueprint
        └── admin-dashboard-mobile.svg       # 393x852 mobile 4-state admin dashboard wireframe blueprint
```

---

## 2. Standard Specification Templates Alignment

Located in [`docs/templates/`](./templates/):

| Template File | Standard & Industry Role | How AbangCebu AI Implements It |
|---|---|---|
| **`Function_Specification_Document.docx`** | Official **Functional Specification Document (FSD)** template defining user stories, acceptance criteria, preconditions, 4-column data movements, UI wireframes, and error handling. | Implemented modularly in `docs/specifications/` (e.g. Module 1: Auth, Module 2: Map & Search, Module 3: Landlord Listing). |
| **`Database_Specification_Template.xlsx`** | Official **Data Dictionary** workbook defining table indexes, column datatypes, size/length, nullability, primary/foreign keys, and constraints. | Populated by `docs/database/database-erd.md` and `docs/database/users-and-profiles-schema.md` covering all 11 relational entities. |
| **`Test_Specification_Template.xlsx`** | Official **QA Test Plan & Test Execution Matrix** recording test classifications, test steps, confirmation criteria, and OK/NG results. | Populated by `docs/testing/` suites (starting with `SCRUM-69` Auth Test Plan). |

---

## 3. Master Document Index & Traceability Matrix

| Document | Domain | Author | Reviewer | Jira Reference | Status |
|---|---|---|---|---|---|
| [auth-registration-spec.md](./specifications/auth/auth-registration-spec.md) | Auth FSD | John Lloyd Ando | Hermar Centillas | [SCRUM-56](https://abangcebuai.atlassian.net/browse/SCRUM-56) | Approved / Done |
| [auth-session-lifecycle.md](./specifications/auth/auth-session-lifecycle.md) | Auth FSD | John Lloyd Ando | Hermar Centillas | [SCRUM-57](https://abangcebuai.atlassian.net/browse/SCRUM-57) | Approved / Done |
| [auth-logout-spec.md](./specifications/auth/auth-logout-spec.md) | Auth FSD | junrilldisoy90 | Hermar Centillas | [SCRUM-58](https://abangcebuai.atlassian.net/browse/SCRUM-58) | Approved / Done |
| [auth-password-reset-spec.md](./specifications/auth/auth-password-reset-spec.md) | Auth FSD | Joan Marie Encallado Inting | Hermar Centillas | [SCRUM-59](https://abangcebuai.atlassian.net/browse/SCRUM-59) | Approved / Done |
| [auth-error-handling.md](./specifications/auth/auth-error-handling.md) | Auth FSD | junrilldisoy90 | Hermar Centillas | [SCRUM-60](https://abangcebuai.atlassian.net/browse/SCRUM-60) | Approved / Done |
| [database-erd.md](./database/database-erd.md) | Database | Dency Marie Bosque | Hermar Centillas | [SCRUM-53](https://abangcebuai.atlassian.net/browse/SCRUM-53) | Approved / Done |
| [users-and-profiles-schema.md](./database/users-and-profiles-schema.md) | Database | Dency Marie Bosque | Hermar Centillas | [SCRUM-54](https://abangcebuai.atlassian.net/browse/SCRUM-54) | Approved / Done |
| [supabase-architecture.md](./database/supabase-architecture.md) | Database | Dency Marie Bosque | Hermar Centillas | [SCRUM-52](https://abangcebuai.atlassian.net/browse/SCRUM-52) | Approved / Done |
| [rbac-matrix.md](./security/rbac-matrix.md) | Security | Joan Marie Encallado Inting | Hermar Centillas | [SCRUM-63](https://abangcebuai.atlassian.net/browse/SCRUM-63) | Approved / Done |
| [rls-policies.md](./security/rls-policies.md) | Security | Michelle Estoy | Hermar Centillas | [SCRUM-55](https://abangcebuai.atlassian.net/browse/SCRUM-55) | Approved / Done |
| [environment-variables.md](./security/environment-variables.md) | Security | Edrich Bardilas | Hermar Centillas | [SCRUM-51](https://abangcebuai.atlassian.net/browse/SCRUM-51) | Approved / Done |
| [styling-guidelines.md](./design/styling-guidelines.md) | Design | Angel Crushein Yaun | Hermar Centillas | [SCRUM-50](https://abangcebuai.atlassian.net/browse/SCRUM-50) | Approved / Done |
| [renter-persona.md](./design/renter-persona.md) | Design | Joan Marie Encallado Inting | Hermar Centillas | [SCRUM-61](https://abangcebuai.atlassian.net/browse/SCRUM-61) | Approved / Done |
| [landing-page-wireframe.md](./design/landing-page-wireframe.md) | Design | Angel Crushein Yaun | Hermar Centillas | [SCRUM-64](https://abangcebuai.atlassian.net/browse/SCRUM-64) | Approved / Done |
| [mobile-map-wireframes.md](./design/mobile-map-wireframes.md) | Design | Angel Crushein Yaun | Hermar Centillas | [SCRUM-64](https://abangcebuai.atlassian.net/browse/SCRUM-64) | Approved / Done |
| [AbangCebu_Landing_Page_Wireframe_Specification.pdf](./pdf/AbangCebu_Landing_Page_Wireframe_Specification.pdf) | Design (PDF) | Angel Crushein Yaun | Hermar Centillas | [SCRUM-64](https://abangcebuai.atlassian.net/browse/SCRUM-64) | Approved / Done |
| [login-page-wireframe.md](./design/login-page-wireframe.md) | Design | Neah Moneva | Hermar Centillas | [SCRUM-65](https://abangcebuai.atlassian.net/browse/SCRUM-65) | Approved / Done |
| [AbangCebu_Login_Page_Wireframe_Specification.pdf](./pdf/AbangCebu_Login_Page_Wireframe_Specification.pdf) | Design (PDF) | Neah Moneva | Hermar Centillas | [SCRUM-65](https://abangcebuai.atlassian.net/browse/SCRUM-65) | Approved / Done |
| [registration-page-wireframe.md](./design/registration-page-wireframe.md) | Design | Angel Crushein Yaun | Hermar Centillas | [SCRUM-66](https://abangcebuai.atlassian.net/browse/SCRUM-66) | Approved / Done |
| [AbangCebu_Registration_Page_Wireframe_Specification.pdf](./pdf/AbangCebu_Registration_Page_Wireframe_Specification.pdf) | Design (PDF) | Angel Crushein Yaun | Hermar Centillas | [SCRUM-66](https://abangcebuai.atlassian.net/browse/SCRUM-66) | Approved / Done |
| [user-dashboard-wireframe.md](./design/user-dashboard-wireframe.md) | Design | Neah Moneva | Hermar Centillas | [SCRUM-67](https://abangcebuai.atlassian.net/browse/SCRUM-67) | Approved / Done |
| [AbangCebu_User_Dashboard_Wireframe_Specification.pdf](./pdf/AbangCebu_User_Dashboard_Wireframe_Specification.pdf) | Design (PDF) | Neah Moneva | Hermar Centillas | [SCRUM-67](https://abangcebuai.atlassian.net/browse/SCRUM-67) | Approved / Done |
| [profile-page-wireframe.md](./design/profile-page-wireframe.md) | Design | Angel Crushein Yaun | Hermar Centillas | [SCRUM-68](https://abangcebuai.atlassian.net/browse/SCRUM-68) | Approved / Done |
| [AbangCebu_Profile_Page_Wireframe_Specification.pdf](./pdf/AbangCebu_Profile_Page_Wireframe_Specification.pdf) | Design (PDF) | Angel Crushein Yaun | Hermar Centillas | [SCRUM-68](https://abangcebuai.atlassian.net/browse/SCRUM-68) | Approved / Done |
| [admin-dashboard-wireframe.md](./design/admin-dashboard-wireframe.md) | Design | Neah Moneva | Hermar Centillas | [SCRUM-74](https://abangcebuai.atlassian.net/browse/SCRUM-74) | Approved / Done |
| [AbangCebu_Admin_Dashboard_Wireframe_Specification.pdf](./pdf/AbangCebu_Admin_Dashboard_Wireframe_Specification.pdf) | Design (PDF) | Neah Moneva | Hermar Centillas | [SCRUM-74](https://abangcebuai.atlassian.net/browse/SCRUM-74) | Approved / Done |
| [what-is-abangcebu-ai.md](./architecture/what-is-abangcebu-ai.md) | Architecture | Hermar Centillas | Team Lead | Product Vision | Approved |
| [client-server-boundaries.md](./architecture/client-server-boundaries.md) | Architecture | Hermar Centillas | Team Lead | Architecture | Approved |
| [next15-guidelines.md](./architecture/next15-guidelines.md) | Architecture | Hermar Centillas | Team Lead | [SCRUM-48](https://abangcebuai.atlassian.net/browse/SCRUM-48) | Approved |
| [project-structure.md](./architecture/project-structure.md) | Architecture | Hermar Centillas | Team Lead | Architecture | Approved |
| [git-workflow.md](./architecture/git-workflow.md) | Governance | Hermar Centillas | Team Lead | [SCRUM-49](https://abangcebuai.atlassian.net/browse/SCRUM-49) | Approved |
| [auth-test-plan.md](./testing/auth-test-plan.md) | QA Testing | Jenny Villamor | Hermar Centillas | [SCRUM-69](https://abangcebuai.atlassian.net/browse/SCRUM-69) | Approved / Done |
| [AbangCebu_Auth_Test_Specification.xlsx](./testing/AbangCebu_Auth_Test_Specification.xlsx) | QA Testing (Excel) | Jenny Villamor | Hermar Centillas | [SCRUM-69](https://abangcebuai.atlassian.net/browse/SCRUM-69) | Approved / Done |
| [AbangCebu_Auth_Test_Plan_Specification.pdf](./pdf/AbangCebu_Auth_Test_Plan_Specification.pdf) | QA Testing (PDF) | Jenny Villamor | Hermar Centillas | [SCRUM-69](https://abangcebuai.atlassian.net/browse/SCRUM-69) | Approved / Done |
| [rbac-test-cases.md](./testing/rbac-test-cases.md) | QA Testing | Anne KC M. Casinay | Hermar Centillas | [SCRUM-70](https://abangcebuai.atlassian.net/browse/SCRUM-70) | Approved / Done |
| [AbangCebu_RBAC_Test_Verification_Matrix.pdf](./pdf/AbangCebu_RBAC_Test_Verification_Matrix.pdf) | QA Testing (PDF) | Anne KC M. Casinay | Hermar Centillas | [SCRUM-70](https://abangcebuai.atlassian.net/browse/SCRUM-70) | Approved / Done |
| [middleware-test-scenarios.md](./testing/middleware-test-scenarios.md) | QA Testing | Karla Hiyas | Hermar Centillas | [SCRUM-71](https://abangcebuai.atlassian.net/browse/SCRUM-71) | Approved / Done |
| [AbangCebu_Middleware_Test_Scenarios.pdf](./pdf/AbangCebu_Middleware_Test_Scenarios.pdf) | QA Testing (PDF) | Karla Hiyas | Hermar Centillas | [SCRUM-71](https://abangcebuai.atlassian.net/browse/SCRUM-71) | Approved / Done |
| [auth-performance-baseline.md](./testing/auth-performance-baseline.md) | QA Testing | Ryza Albiso | Hermar Centillas | [SCRUM-72](https://abangcebuai.atlassian.net/browse/SCRUM-72) | Approved / Done |
| [AbangCebu_Auth_Performance_Baseline.pdf](./pdf/AbangCebu_Auth_Performance_Baseline.pdf) | QA Testing (PDF) | Ryza Albiso | Hermar Centillas | [SCRUM-72](https://abangcebuai.atlassian.net/browse/SCRUM-72) | Approved / Done |
| [sprint-2-plan.md](../sprint-2-plan.md) | Sprint 2 Master Plan | Hermar Centillas | Team Lead | [SCRUM-75](https://abangcebuai.atlassian.net/browse/SCRUM-75) | Approved / Done |
| [AbangCebu_Sprint2_Master_Plan.pdf](./pdf/AbangCebu_Sprint2_Master_Plan.pdf) | Sprint 2 Plan (PDF) | Hermar Centillas | Team Lead | [SCRUM-75](https://abangcebuai.atlassian.net/browse/SCRUM-75) | Approved / Done |
| [user-registration.drawio](./flowcharts/user-registration.drawio) | Auth Flowcharts | John Lloyd Ando | Hermar Centillas | [SCRUM-76](https://abangcebuai.atlassian.net/browse/SCRUM-76) | Approved / Done |
| [user-login.drawio](./flowcharts/user-login.drawio) | Auth Flowcharts | John Lloyd Ando | Hermar Centillas | [SCRUM-76](https://abangcebuai.atlassian.net/browse/SCRUM-76) | Approved / Done |
| [password-reset.drawio](./flowcharts/password-reset.drawio) | Auth Flowcharts | Joan Marie Encallado Inting | Hermar Centillas | [SCRUM-76](https://abangcebuai.atlassian.net/browse/SCRUM-76) | Approved / Done |
| [user-profile-management.drawio](./flowcharts/user-profile-management.drawio) | Auth Flowcharts | junrilldisoy90 | Hermar Centillas | [SCRUM-76](https://abangcebuai.atlassian.net/browse/SCRUM-76) | Approved / Done |
| [AbangCebu_Auth_And_User_Management_Flowcharts.pdf](./pdf/AbangCebu_Auth_And_User_Management_Flowcharts.pdf) | Auth Flowcharts (PDF) | Group 2 | Hermar Centillas | [SCRUM-76](https://abangcebuai.atlassian.net/browse/SCRUM-76) | Approved / Done |
| [property-listing-creation.drawio](./flowcharts/property-listing-creation.drawio) | Property Flowcharts | Dency Marie Bosque | Hermar Centillas | [SCRUM-77](https://abangcebuai.atlassian.net/browse/SCRUM-77) | Approved / Done |
| [unit-availability.drawio](./flowcharts/unit-availability.drawio) | Property Flowcharts | Dency Marie Bosque | Hermar Centillas | [SCRUM-77](https://abangcebuai.atlassian.net/browse/SCRUM-77) | Approved / Done |
| [AbangCebu_Property_Listing_Flowcharts.pdf](./pdf/AbangCebu_Property_Listing_Flowcharts.pdf) | Property Flowcharts (PDF) | Group 2 | Hermar Centillas | [SCRUM-77](https://abangcebuai.atlassian.net/browse/SCRUM-77) | Approved / Done |
| [interactive-map.drawio](./flowcharts/interactive-map.drawio) | Map Flowcharts | Angel Crushein Yaun | Hermar Centillas | [SCRUM-78](https://abangcebuai.atlassian.net/browse/SCRUM-78) | Approved / Done |
| [property-search.drawio](./flowcharts/property-search.drawio) | Search Flowcharts | Neah Moneva | Hermar Centillas | [SCRUM-78](https://abangcebuai.atlassian.net/browse/SCRUM-78) | Approved / Done |
| [AbangCebu_Map_And_Search_Flowcharts.pdf](./pdf/AbangCebu_Map_And_Search_Flowcharts.pdf) | Map/Search Flowcharts (PDF) | Group 2 | Hermar Centillas | [SCRUM-78](https://abangcebuai.atlassian.net/browse/SCRUM-78) | Approved / Done |
| [ai-rental-assistant.drawio](./flowcharts/ai-rental-assistant.drawio) | AI Flowcharts | Michelle Estoy | Hermar Centillas | [SCRUM-79](https://abangcebuai.atlassian.net/browse/SCRUM-79) | Approved / Done |
| [inquiry-reservation.drawio](./flowcharts/inquiry-reservation.drawio) | Inquiry Flowcharts | Edrich Bardilas | Hermar Centillas | [SCRUM-79](https://abangcebuai.atlassian.net/browse/SCRUM-79) | Approved / Done |
| [AbangCebu_AI_And_Inquiry_Flowcharts.pdf](./pdf/AbangCebu_AI_And_Inquiry_Flowcharts.pdf) | AI/Inquiry Flowcharts (PDF) | Group 2 | Hermar Centillas | [SCRUM-79](https://abangcebuai.atlassian.net/browse/SCRUM-79) | Approved / Done |
| [landlord-verification.drawio](./flowcharts/landlord-verification.drawio) | Trust Flowcharts | Michelle Estoy | Hermar Centillas | [SCRUM-80](https://abangcebuai.atlassian.net/browse/SCRUM-80) | Approved / Done |
| [messaging-contact.drawio](./flowcharts/messaging-contact.drawio) | Messaging Flowcharts | Edrich Bardilas | Hermar Centillas | [SCRUM-80](https://abangcebuai.atlassian.net/browse/SCRUM-80) | Approved / Done |
| [AbangCebu_Trust_And_Messaging_Flowcharts.pdf](./pdf/AbangCebu_Trust_And_Messaging_Flowcharts.pdf) | Trust/Messaging Flowcharts (PDF) | Group 2 | Hermar Centillas | [SCRUM-80](https://abangcebuai.atlassian.net/browse/SCRUM-80) | Approved / Done |
| [review-rating.drawio](./flowcharts/review-rating.drawio) | Governance Flowcharts | Anne KC M. Casinay | Hermar Centillas | [SCRUM-81](https://abangcebuai.atlassian.net/browse/SCRUM-81) | Approved / Done |
| [report-moderation.drawio](./flowcharts/report-moderation.drawio) | Governance Flowcharts | Karla Hiyas | Hermar Centillas | [SCRUM-81](https://abangcebuai.atlassian.net/browse/SCRUM-81) | Approved / Done |
| [admin-management.drawio](./flowcharts/admin-management.drawio) | Admin Flowcharts | Ryza Albiso | Hermar Centillas | [SCRUM-81](https://abangcebuai.atlassian.net/browse/SCRUM-81) | Approved / Done |
| [notification.drawio](./flowcharts/notification.drawio) | Notification Flowcharts | Jenny Villamor | Hermar Centillas | [SCRUM-81](https://abangcebuai.atlassian.net/browse/SCRUM-81) | Approved / Done |
| [AbangCebu_Governance_And_Notification_Flowcharts.pdf](./pdf/AbangCebu_Governance_And_Notification_Flowcharts.pdf) | Governance Flowcharts (PDF) | Group 2 | Hermar Centillas | [SCRUM-81](https://abangcebuai.atlassian.net/browse/SCRUM-81) | Approved / Done |
| [sprint-2-master-test-plan.md](./testing/sprint-2-master-test-plan.md) | QA Testing (Auth/Identity) | Jenny Villamor | Hermar Centillas | [SCRUM-82](https://abangcebuai.atlassian.net/browse/SCRUM-82) | Approved / Active |
| [sprint-2-master-test-plan.md](./testing/sprint-2-master-test-plan.md) | QA Testing (Property/Units) | Dency Marie Bosque | Hermar Centillas | [SCRUM-83](https://abangcebuai.atlassian.net/browse/SCRUM-83) | Approved / Active |
| [sprint-2-master-test-plan.md](./testing/sprint-2-master-test-plan.md) | QA Testing (Map/Search) | Angel Crushein / Neah | Hermar Centillas | [SCRUM-84](https://abangcebuai.atlassian.net/browse/SCRUM-84) | Approved / Active |
| [sprint-2-master-test-plan.md](./testing/sprint-2-master-test-plan.md) | QA Testing (AI/Inquiries) | Michelle / Edrich | Hermar Centillas | [SCRUM-85](https://abangcebuai.atlassian.net/browse/SCRUM-85) | Approved / Active |
| [sprint-2-master-test-plan.md](./testing/sprint-2-master-test-plan.md) | QA Testing (Trust/KYC) | Michelle / Edrich | Hermar Centillas | [SCRUM-86](https://abangcebuai.atlassian.net/browse/SCRUM-86) | Approved / Active |
| [sprint-2-master-test-plan.md](./testing/sprint-2-master-test-plan.md) | QA Testing (Governance) | Anne KC / Karla / Ryza | Hermar Centillas | [SCRUM-87](https://abangcebuai.atlassian.net/browse/SCRUM-87) | Approved / Active |
| [sprint-2-master-test-plan.md](./testing/sprint-2-master-test-plan.md) | QA Testing (Master Plan) | Jenny Villamor | Hermar Centillas | [SCRUM-88](https://abangcebuai.atlassian.net/browse/SCRUM-88) | Approved / Active |
| [auth-performance-baseline.md](./testing/auth-performance-baseline.md) | QA Testing (Performance) | Ryza Albiso | Hermar Centillas | [SCRUM-89](https://abangcebuai.atlassian.net/browse/SCRUM-89) | Approved / Active |
| [AbangCebu_Sprint2_Master_Test_Specification.xlsx](./testing/AbangCebu_Sprint2_Master_Test_Specification.xlsx) | QA Testing (Excel Workbook) | Jenny Villamor | Hermar Centillas | [SCRUM-90](https://abangcebuai.atlassian.net/browse/SCRUM-90) | Approved / Active |
| [AbangCebu_Sprint2_Master_Test_Plan.pdf](./pdf/AbangCebu_Sprint2_Master_Test_Plan.pdf) | QA Testing (PDF Plan) | Jenny Villamor | Hermar Centillas | [SCRUM-91](https://abangcebuai.atlassian.net/browse/SCRUM-91) | Approved / Active |

---

## 4. Engineering Standards & Governance

1. **Sprint 1 Guardrail:** All deliverables in Sprint 1 are strictly architectural specifications, data dictionaries, schema migrations, and contracts. **Zero premature React/JSX UI components or demo cards**.
2. **Attribution Policy:** All documents and compiled PDFs maintain authentic human engineering attribution by real team member name and role.
3. **Traceability:** Every architectural specification must trace directly to its corresponding Jira issue key and acceptance criteria.
