# Architectural Requirements — Addendum

> **Project:** Vehicle Analytics Platform
> **Client:** Fuse IT | **Team:** Kilimanjaro StoneCap
> **Version:** 1.0 | **Last Updated:** May 2026

---

## Table of Contents

1. [Additional Quality Requirements](#1-additional-quality-requirements)
   - 1.1 [Flexibility](#11-flexibility)
   - 1.2 [Maintainability](#12-maintainability)
   - 1.3 [Usability](#13-usability)
   - 1.4 [Integrability](#14-integrability)
2. [Additional Constraints](#2-additional-constraints)
   - 2.1 [Development Constraints](#21-development-constraints)
   - 2.2 [Business Constraints](#22-business-constraints)
   - 2.3 [Budget Constraints](#23-budget-constraints)
   - 2.4 [Documentation Constraints](#24-documentation-constraints)
   - 2.5 [Testing Constraints](#25-testing-constraints)
3. [Document Approval](#3-document-approval)

---

> **Note:** Scalability, Performance, Reliability, Security, Auditability, Testability, and the core Architectural Patterns (Event-Driven, Medallion, Client-Server) are covered in the primary System Architecture document. This addendum covers supplementary requirements and constraints only.

---

## 1. Additional Quality Requirements

### 1.1 Flexibility

| Requirement | Target | Justification |
|---|---|---|
| Modular components | Each layer (ingestion, storage, API) independently deployable | Allows updating one component without redeploying the entire system |
| Configuration-driven | Environment variables control behaviour | Same codebase runs in development, staging, and production without modification |
| Pluggable auth | Authentication provider can be swapped | Cognito can be replaced with another OAuth2 provider if needed |

**How We Achieve It**

- Separation of concerns with Lambda functions for each pipeline stage
- Environment variables managed via `.env` files and AWS Lambda configuration
- Auth middleware abstracts authentication logic from business logic

---

### 1.2 Maintainability

| Requirement | Target | Justification |
|---|---|---|
| Code documentation | JSDoc comments for all exported functions | New developers can understand code without reverse-engineering |
| API documentation | OpenAPI/Swagger specification | Frontend team knows available endpoints without reading backend code |
| Consistent code style | ESLint enforcement across all files | Reduces cognitive load when reading code from different team members |
| Modular architecture | Separation of routes, controllers, middleware | Changes to auth logic do not affect database queries |

**How We Achieve It**

- ESLint configuration with the Airbnb style guide
- Express.js modular routing
- Centralised utility functions (`utils/response.js`)
- Descriptive function and variable naming conventions

---

### 1.3 Usability

| Requirement | Target | Justification |
|---|---|---|
| Responsive design | Desktop, tablet, and mobile viewports | Fleet managers may access the dashboard from office desktops, tablets in vehicles, or phones during off-hours |
| Loading states | Visual feedback during data fetch | Blank screens cause confusion and trigger repeat requests |
| Error messages | User-friendly, actionable language | Technical errors such as `500 Internal Server Error` are not meaningful to fleet managers |
| Real-time indicators | Live status badges with timestamps | Users need to know whether data is current or stale |

**How We Achieve It**

- Tailwind CSS responsive breakpoints
- Loading spinners in all dashboard components
- Data Feed Status Card displaying live/offline status
- Timestamps on all data displays

---

### 1.4 Integrability

| Requirement | Target | Justification |
|---|---|---|
| REST API | Standard HTTP methods (GET, POST, PATCH, DELETE) | Frontend team can consume the API without learning custom protocols |
| JWT authentication | Standard token format | Compatible with any OAuth2 client |
| PostgreSQL compatibility | Standard SQL queries | Allows connection of external BI tools |
| AWS SDK | Standard AWS SDK v3 | Follows AWS best practices for service integration |

**How We Achieve It**

- RESTful API design with standard HTTP status codes
- JWT tokens compatible with Cognito and any OAuth2 client
- Standard PostgreSQL queries (no proprietary extensions beyond TimescaleDB)
- AWS SDK v3 for all service interactions

---

## 2. Additional Constraints

### 2.1 Development Constraints

| Constraint | Description | Justification |
|---|---|---|
| 80% code coverage | Minimum test coverage required | COS301 explicitly requires 80% coverage — the team currently exceeds this at **97.95%** |
| 4 PR approvals | Minimum 4 approvals before merge | Ensures majority team approval before code reaches production; prevents single-person decisions |
| No direct pushes to `main`/`develop` | All changes must go through a Pull Request | Enforces code review for every change and prevents unreviewed code from reaching production |
| Docker Compose local dev | Local environment must be fully reproducible | Eliminates "works on my machine" issues and ensures all team members share identical environments |

---

### 2.2 Business Constraints

| Constraint | Description | Justification |
|---|---|---|
| Demo milestones | Four demos (May, June, August, October) | COS301 capstone has fixed demo dates — missing a demo results in grade penalties |
| COS301 requirements | Must meet all capstone specifications | The project must satisfy academic requirements for documentation, testing, and presentation |
| Fuse IT branding | Use Fuse IT logo on all deliverables | Contract requirement providing a professional appearance for client deliverables |
| Public GitHub repository | Code must be publicly accessible | COS301 requires a public repository for evaluation by both the university and the client |

---

### 2.3 Budget Constraints

| Constraint | Description | Justification |
|---|---|---|
| AWS cost limit | R5,000 – R15,000 in credits provided by Fuse IT | Exceeding this budget would require additional client payment |
| Cost monitoring | CloudWatch budget alerts configured | Prevents unexpected charges from runaway Lambda functions |
| Serverless-first | Pay-per-use services preferred over 24/7 provisioned services | Reduces costs during development and outside peak hours |

**How We Achieve It**

- AWS Budgets alarms set at 70%, 90%, and 100% of allocated credits
- Lambda provisioned concurrency limited to the minimum required
- Kinesis on-demand mode used only when needed
- CloudWatch Cost Explorer monitored weekly

---

### 2.4 Documentation Constraints

| Constraint | Description | Justification |
|---|---|---|
| SRS document | Complete Software Requirements Specification | COS301 requirement for Demo 1 |
| API documentation | All endpoints documented | Required by the frontend team and future maintainers |
| Architecture diagram | Current system architecture visualized | Required for communicating system design |
| Meeting minutes | Two stand-ups per week logged on ClickUp | COS301 requirement for tracking team progress |

**How We Achieve It**

- API reference Markdown file maintained in the repository
- Mermaid architecture diagrams embedded in documentation
- ClickUp meeting minutes logged weekly
- Technology requirements document maintained throughout development

---

### 2.5 Testing Constraints

| Constraint | Description | Justification |
|---|---|---|
| Unit tests | Jest coverage for all controllers | Catches bugs before integration |
| Integration tests | API endpoint tests with Supertest | Verifies that components work together correctly |
| CI enforcement | Tests run on every Pull Request | Prevents broken code from being merged |
| Codecov tracking | Coverage reported on every PR | Visualises coverage trends over time |

**How We Achieve It**

- Jest test suites for all controllers
- Supertest for HTTP endpoint testing
- GitHub Actions workflow with a dedicated test stage
- Codecov badge displayed in the repository README

---

## 3. Document Approval

| Role | Name | Date |  
|---|---|---|
| Backend & Testing | Christopher Adolph | May 2026 |
| Frontend & Integration | Kwanele Phakathi | May 2026 |
| Cloud & Data Eng | Warona Moleboge | May 2026 |
| Frontend & UX | Ziphozinhle Maduna | May 2026 |
| Data Eng & Integration | Marchant Grootboom | May 2026 |

