# 📚 AbangCebu AI — Engineering Documentation Hub

**Project:** AbangCebu AI (AI-Powered Map-Centric Rental Discovery Platform for Metro Cebu)  
**Course / Track:** Capstone Project (Group 2)  
**Lead / Scrum Master:** Hermar Centillas  
**Frontend Framework:** Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS v4  
**Backend & Database:** Supabase BaaS (PostgreSQL 15+ with PostGIS, GoTrue Auth, Row Level Security)  

---

## 1. Documentation Architecture

The `docs/` repository is organized into modular engineering domains aligned with our Capstone submission rubrics and enterprise software standards:

```
docs/
├── README.md                                # Master Documentation Map (This Document)
│
├── templates/                               # Official Instructor Capstone Templates
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
│   └── renter-persona.md                    # SCRUM-61: Renter persona ("Mika") & journey map
│
├── architecture/                            # System Boundaries & Framework Standards
│   ├── what-is-abangcebu-ai.md              # Official product vision & platform boundaries
│   ├── client-server-boundaries.md          # Next.js Server vs Client Components governance
│   ├── next15-guidelines.md                 # Modern App Router conventions & caching
│   ├── project-structure.md                 # Monorepo directory structure & conventions
│   └── git-workflow.md                      # SCRUM-49: Branching, PRs, and commit guidelines
│
├── testing/                                 # Quality Assurance & Verification Test Plans
│   └── (In Progress: SCRUM-69 to 72)        # Test suites, scenarios, and execution matrices
│
├── pdf/                                     # Formal Architecture & Governance PDFs
│   ├── AbangCebu_Auth_Registration_Specification.pdf
│   ├── AbangCebu_Auth_Session_Lifecycle_Specification.pdf
│   ├── AbangCebu_Auth_Logout_Specification.pdf
│   ├── AbangCebu_Auth_Password_Reset_Specification.pdf
│   ├── AbangCebu_Auth_Error_Handling_Specification.pdf
│   ├── AbangCebu_Database_ERD_Architecture.pdf
│   ├── AbangCebu_Users_And_Profiles_Schema.pdf
│   ├── AbangCebu_Renter_Persona_and_Access_Rights.pdf
│   └── AbangCebu_UI_Styling_Guidelines.pdf
│
└── assets/                                  # Visual Diagrams & Architecture Assets
    ├── abangcebu_database_erd.png           # High-resolution ERD rendering
    └── abangcebu_database_erd.svg           # Vector source ERD
```

---

## 2. Capstone Instructor Templates Alignment

Located in [`docs/templates/`](./templates/):

| Template File | Academic & Industry Role | How AbangCebu AI Implements It |
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
| [what-is-abangcebu-ai.md](./architecture/what-is-abangcebu-ai.md) | Architecture | Hermar Centillas | Team Lead | Product Vision | Approved |
| [client-server-boundaries.md](./architecture/client-server-boundaries.md) | Architecture | Hermar Centillas | Team Lead | Architecture | Approved |
| [next15-guidelines.md](./architecture/next15-guidelines.md) | Architecture | Hermar Centillas | Team Lead | [SCRUM-48](https://abangcebuai.atlassian.net/browse/SCRUM-48) | Approved |
| [project-structure.md](./architecture/project-structure.md) | Architecture | Hermar Centillas | Team Lead | Architecture | Approved |
| [git-workflow.md](./architecture/git-workflow.md) | Governance | Hermar Centillas | Team Lead | [SCRUM-49](https://abangcebuai.atlassian.net/browse/SCRUM-49) | Approved |

---

## 4. Engineering Standards & Governance

1. **Sprint 1 Guardrail:** All deliverables in Sprint 1 are strictly architectural specifications, data dictionaries, schema migrations, and contracts. **Zero premature React/JSX UI components or demo cards**.
2. **Attribution Policy:** All documents and compiled PDFs maintain authentic human engineering attribution by real team member name and role.
3. **Traceability:** Every architectural specification must trace directly to its corresponding Jira issue key and acceptance criteria.
