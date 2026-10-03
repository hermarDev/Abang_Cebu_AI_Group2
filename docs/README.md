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
│   ├── auth-test-plan.md                    # SCRUM-69: Comprehensive QA test plan & matrix
│   ├── AbangCebu_Auth_Test_Specification.xlsx # SCRUM-69: Populated QA test workbook
│   ├── rbac-test-cases.md                   # SCRUM-70: Role & access permission verification test cases
│   ├── middleware-test-scenarios.md         # SCRUM-71: Protected route & middleware test scenarios
│   └── auth-performance-baseline.md         # SCRUM-72: Authentication baseline latency & load strategy
│
├── flowcharts/                              # Module 1: Authentication Architecture Flowcharts (.drawio)
│   ├── auth-master-orchestration.drawio     # SCRUM-101: Master auth lifecycle & session state engine
│   ├── auth-registration-pkce.drawio        # SCRUM-104: User registration, validation & PKCE email
│   ├── auth-login-session-rtr.drawio        # SCRUM-105: Login, credential verification & token rotation
│   ├── auth-password-reset-recovery.drawio  # SCRUM-106: Self-service recovery & global token revocation
│   ├── auth-signout-multitab.drawio         # SCRUM-107: Sign-out, cookie chunk purging & broadcast sync
│   └── auth-error-handling-suspension.drawio # SCRUM-108: Auth error boundary & suspension enforcement
│
├── pdf/                                     # Formal Architecture & Governance PDFs
│   ├── AbangCebu_Authentication_Method_Module_Flowcharts.pdf # SCRUM-101: Formally compiled 6-page A4 flowcharts
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
│   └── AbangCebu_Auth_Performance_Baseline.pdf
│
└── assets/                                  # Visual Diagrams & Architecture Assets
    ├── abangcebu_database_erd.png           # High-resolution ERD rendering
    ├── abangcebu_database_erd.svg           # Vector source ERD
    ├── flowcharts/                          # Vector SVGs & 150 DPI PNG Flowchart Renderings
    │   ├── auth-master-orchestration.png    # Master auth lifecycle diagram
    │   ├── auth-registration-pkce.png       # Registration & PKCE flow diagram
    │   ├── auth-login-session-rtr.png       # Login & token rotation diagram
    │   ├── auth-password-reset-recovery.png # Password reset & recovery diagram
    │   ├── auth-signout-multitab.png        # Sign-out & multi-tab sync diagram
    │   └── auth-error-handling-suspension.png # Error boundary & suspension diagram
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
| [AbangCebu_Authentication_Method_Module_Flowcharts.pdf](./pdf/AbangCebu_Authentication_Method_Module_Flowcharts.pdf) | Flowcharts (PDF Bundle) | Hermar Centillas | Group 2 Review | [SCRUM-101](https://abangcebuai.atlassian.net/browse/SCRUM-101) | Planned / Ready |
| [auth-master-orchestration.drawio](./flowcharts/auth-master-orchestration.drawio) | Flowchart (Draw.io) | Hermar Centillas | Group 2 Review | [SCRUM-101](https://abangcebuai.atlassian.net/browse/SCRUM-101) | Planned / Ready |
| [auth-registration-pkce.drawio](./flowcharts/auth-registration-pkce.drawio) | Flowchart (Draw.io) | John Lloyd Ando | Hermar Centillas | [SCRUM-104](https://abangcebuai.atlassian.net/browse/SCRUM-104) | Approved / Done |
| [auth-registration-pkce.pdf](./pdf/auth-registration-pkce.pdf) | Flowchart (PDF) | John Lloyd Ando | Hermar Centillas | [SCRUM-104](https://abangcebuai.atlassian.net/browse/SCRUM-104) | Approved / Done |
| [auth-registration-pkce.png](./assets/flowcharts/auth-registration-pkce.png) | Flowchart (PNG) | John Lloyd Ando | Hermar Centillas | [SCRUM-104](https://abangcebuai.atlassian.net/browse/SCRUM-104) | Approved / Done |
| [auth-login-session-rtr.drawio](./flowcharts/auth-login-session-rtr.drawio) | Flowchart (Draw.io) | John Lloyd Ando | Hermar Centillas | [SCRUM-105](https://abangcebuai.atlassian.net/browse/SCRUM-105) | Approved / Done |
| [auth-login-session-rtr.pdf](./pdf/auth-login-session-rtr.pdf) | Flowchart (PDF) | John Lloyd Ando | Hermar Centillas | [SCRUM-105](https://abangcebuai.atlassian.net/browse/SCRUM-105) | Approved / Done |
| [auth-login-session-rtr.png](./assets/flowcharts/auth-login-session-rtr.png) | Flowchart (PNG) | John Lloyd Ando | Hermar Centillas | [SCRUM-105](https://abangcebuai.atlassian.net/browse/SCRUM-105) | Approved / Done |
| [auth-password-reset-recovery.drawio](./flowcharts/auth-password-reset-recovery.drawio) | Flowchart (Draw.io) | Joan Marie Encallado Inting | Hermar Centillas | [SCRUM-106](https://abangcebuai.atlassian.net/browse/SCRUM-106) | Approved / Done |
| [auth-password-reset-recovery.pdf](./pdf/auth-password-reset-recovery.pdf) | Flowchart (PDF) | Joan Marie Encallado Inting | Hermar Centillas | [SCRUM-106](https://abangcebuai.atlassian.net/browse/SCRUM-106) | Approved / Done |
| [auth-password-reset-recovery.png](./assets/flowcharts/auth-password-reset-recovery.png) | Flowchart (PNG) | Joan Marie Encallado Inting | Hermar Centillas | [SCRUM-106](https://abangcebuai.atlassian.net/browse/SCRUM-106) | Approved / Done |
| [auth-signout-multitab.drawio](./flowcharts/auth-signout-multitab.drawio) | Flowchart (Draw.io) | junrilldisoy90 | Hermar Centillas | [SCRUM-107](https://abangcebuai.atlassian.net/browse/SCRUM-107) | Approved / Done |
| [auth-signout-multitab.pdf](./pdf/auth-signout-multitab.pdf) | Flowchart (PDF) | junrilldisoy90 | Hermar Centillas | [SCRUM-107](https://abangcebuai.atlassian.net/browse/SCRUM-107) | Approved / Done |
| [auth-signout-multitab.png](./assets/flowcharts/auth-signout-multitab.png) | Flowchart (PNG) | junrilldisoy90 | Hermar Centillas | [SCRUM-107](https://abangcebuai.atlassian.net/browse/SCRUM-107) | Approved / Done |
| [auth-error-handling-suspension.drawio](./flowcharts/auth-error-handling-suspension.drawio) | Flowchart (Draw.io) | junrilldisoy90 | Hermar Centillas | [SCRUM-108](https://abangcebuai.atlassian.net/browse/SCRUM-108) | Approved / Done |
| [auth-error-handling-suspension.pdf](./pdf/auth-error-handling-suspension.pdf) | Flowchart (PDF) | junrilldisoy90 | Hermar Centillas | [SCRUM-108](https://abangcebuai.atlassian.net/browse/SCRUM-108) | Approved / Done |
| [auth-error-handling-suspension.png](./assets/flowcharts/auth-error-handling-suspension.png) | Flowchart (PNG) | junrilldisoy90 | Hermar Centillas | [SCRUM-108](https://abangcebuai.atlassian.net/browse/SCRUM-108) | Approved / Done |
| [auth-test-plan.md](./testing/auth-test-plan.md) | QA Master Test Plan (100 Scenarios) | Jenny Villamor | Hermar Centillas | [SCRUM-109](https://abangcebuai.atlassian.net/browse/SCRUM-109) | Approved / Done |
| [AbangCebu_Auth_Test_Specification.xlsx](./testing/AbangCebu_Auth_Test_Specification.xlsx) | QA Master Matrix (100 Scenarios) | Jenny Villamor | Hermar Centillas | [SCRUM-109](https://abangcebuai.atlassian.net/browse/SCRUM-109) | Approved / Done |
| [AbangCebu_Auth_Test_Plan_Specification.pdf](./pdf/AbangCebu_Auth_Test_Plan_Specification.pdf) | QA Master Plan (PDF) | Jenny Villamor | Hermar Centillas | [SCRUM-109](https://abangcebuai.atlassian.net/browse/SCRUM-109) | Approved / Done |
| [auth-test-plan.md#suite-1-user-registration--pkce-verification-25-scenarios](./testing/auth-test-plan.md) | QA Registration Suite (TC-REG-01..25) | Jenny Villamor | Hermar Centillas | [SCRUM-110](https://abangcebuai.atlassian.net/browse/SCRUM-110) | Approved / Done |
| [auth-test-plan.md#suite-2-user-login--session-token-lifecycle-25-scenarios](./testing/auth-test-plan.md) | QA Login Suite (TC-LOG-01..25) | Karla Hiyas | Hermar Centillas | [SCRUM-111](https://abangcebuai.atlassian.net/browse/SCRUM-111) | Approved / Done |
| [auth-test-plan.md#suite-3-self-service-password-recovery-15-scenarios](./testing/auth-test-plan.md) | QA Reset & Sign-Out Suite (30 Cases) | Anne KC M. Casinay | Hermar Centillas | [SCRUM-112](https://abangcebuai.atlassian.net/browse/SCRUM-112) | Approved / Done |
| [middleware-test-scenarios.md](./testing/middleware-test-scenarios.md) | QA Route Guard & Middleware Security | Karla Hiyas | Hermar Centillas | [SCRUM-113](https://abangcebuai.atlassian.net/browse/SCRUM-113) | Approved / Done |
| [AbangCebu_Middleware_Test_Scenarios.pdf](./pdf/AbangCebu_Middleware_Test_Scenarios.pdf) | QA Middleware Security (PDF) | Karla Hiyas | Hermar Centillas | [SCRUM-113](https://abangcebuai.atlassian.net/browse/SCRUM-113) | Approved / Done |
| [auth-performance-baseline.md](./testing/auth-performance-baseline.md) | QA Latency Benchmarks & Load Strategy | Ryza Albiso | Hermar Centillas | [SCRUM-114](https://abangcebuai.atlassian.net/browse/SCRUM-114) | Approved / Done |
| [AbangCebu_Auth_Performance_Baseline.pdf](./pdf/AbangCebu_Auth_Performance_Baseline.pdf) | QA Performance Baseline (PDF) | Ryza Albiso | Hermar Centillas | [SCRUM-114](https://abangcebuai.atlassian.net/browse/SCRUM-114) | Approved / Done |

---

## 4. Engineering Standards & Governance

1. **Sprint 1 Guardrail:** All deliverables in Sprint 1 are strictly architectural specifications, data dictionaries, schema migrations, and contracts. **Zero premature React/JSX UI components or demo cards**.
2. **Attribution Policy:** All documents and compiled PDFs maintain authentic human engineering attribution by real team member name and role.
3. **Traceability:** Every architectural specification must trace directly to its corresponding Jira issue key and acceptance criteria.
