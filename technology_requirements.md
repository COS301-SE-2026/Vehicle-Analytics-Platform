# Technology Stack Justification

> **Project:** Vehicle Analytics Platform
> **Client:** Fuse IT | **Team:** Kilimanjaro StoneCap
> **Version:** 1.1 | **Last Updated:** May 2026 | **Next Review:** June 2026

---

## Table of Contents

1. [Frontend Technologies](#1-frontend-technologies)
2. [Backend Technologies](#2-backend-technologies)
3. [Database Technologies](#3-database-technologies)
4. [Cloud & Infrastructure](#4-cloud--infrastructure)
5. [Architecture Patterns](#5-architecture-patterns)
6. [Testing & DevOps](#6-testing--devops)
7. [Quality Requirements Summary](#7-quality-requirements-summary)
8. [Frontend Testing Issues & Justifications](#8-frontend-testing-issues--justifications)
9. [Why This Stack Works](#9-why-this-stack-works)
10. [Coverage Improvement Plan](#10-coverage-improvement-plan)

---

## 1. Frontend Technologies

### React.js (v18.2.0)

**Purpose:** UI framework for dashboards and vehicle maps.

| Factor | Detail |
|---|---|
| Stability | LTS version avoids breaking changes in production |
| Ecosystem | Rich library support (Recharts for charts, Mapbox for maps) |
| Performance | Optimised for real-time updates, critical for vehicle position tracking |
| Community | Large talent pool and extensive documentation |

---

### Vite (v5.1.0)

**Purpose:** Build tool and development server.

| Factor | Detail |
|---|---|
| Speed | Faster HMR than Webpack/CRA, critical for rapid development |
| Modern | Uses ES modules by default, aligning with current JavaScript standards |
| Lightweight | Minimal configuration overhead, reducing build complexity |
| Integration | Works seamlessly with React, TypeScript, and CSS modules |

---

### Mapbox GL JS (Latest)

**Purpose:** Interactive map for real-time vehicle positions.

| Factor | Detail |
|---|---|
| Real-Time Capabilities | Handles dynamic vehicle tracking with smooth transitions and custom markers |
| Customisation | Supports custom icons for vehicles (e.g. truck symbols, status colours) |
| React Integration | Works seamlessly with React via `react-map-gl` or direct DOM manipulation |
| Performance | Optimised for rendering thousands of moving points without lag |

---

### Recharts (Latest)

**Purpose:** Chart library for KPIs and analytics.

| Factor | Detail |
|---|---|
| Declarative | Easy to integrate with React components |
| Flexible | Supports line, bar, and donut charts for fleet analytics |
| Lightweight | No heavy dependencies, keeping bundle size small |
| Responsive | Automatically adapts to container sizes, critical for dashboards |

---

## 2. Backend Technologies

### Node.js (v20.x)

**Purpose:** JavaScript runtime.

| Factor | Detail |
|---|---|
| LTS Support | Stable, widely adopted version with long-term support |
| Performance | Improved ES module support and faster execution than older versions |
| Ecosystem | Access to the largest npm registry for backend libraries |
| Concurrency | Handles I/O-bound tasks (DB queries, API calls) efficiently |

---

### Express.js (v4.x)

**Purpose:** REST API framework.

| Factor | Detail |
|---|---|
| Minimalist | Lightweight and unopinionated, allowing flexibility in architecture |
| Middleware Support | Easy to integrate JWT validation, rate limiting, CORS, and logging |
| Scalability | Handles concurrent requests efficiently with connection pooling |
| Maturity | Battle-tested in production environments |

---

### JWT — jsonwebtoken (v9.x)

**Purpose:** Authentication tokens.

| Factor | Detail |
|---|---|
| Stateless | No server-side session storage required, reducing memory usage |
| Security | Signed tokens prevent tampering; integrates with AWS Cognito |
| Compatibility | Works with standard HTTP headers for API authentication |
| Flexibility | Supports custom claims (e.g. user roles for RBAC) |

---

### Helmet (v7.x)

**Purpose:** Security headers.

| Factor | Detail |
|---|---|
| Protection | Mitigates OWASP Top 10 vulnerabilities (XSS, clickjacking, etc.) |
| Easy Integration | Simple middleware for Express |
| Compliance | Helps meet security audit requirements for enterprise clients |
| Performance | Minimal overhead on requests |

---

### express-rate-limit (v7.x)

**Purpose:** Rate limiting (100 requests per 15 minutes).

| Factor | Detail |
|---|---|
| DDoS Protection | Prevents abuse of API endpoints (e.g. brute-force attacks) |
| Configurable | Adjustable limits per endpoint or user |
| Lightweight | Minimal impact on request latency |
| Monitoring | Logs rate-limited requests for analysis |

---

### pg — node-postgres (v8.x)

**Purpose:** PostgreSQL client with connection pooling.

| Factor | Detail |
|---|---|
| Performance | Connection pooling reduces latency for repeated DB queries |
| TimescaleDB Support | Fully compatible with TimescaleDB extensions |
| Promises | Native async/await support for clean code |
| Connection Management | Handles connection leaks and timeouts gracefully |

---

### serverless-http (v3.x)

**Purpose:** Express to Lambda wrapper.

| Factor | Detail |
|---|---|
| AWS Integration | Enables deploying Express apps on AWS Lambda without modification |
| Cost-Effective | Pay-per-use model for API Gateway and Lambda |
| Scalability | Auto-scales with request volume |
| Compatibility | Works with existing Express middleware |

---

## 3. Database Technologies

### PostgreSQL (v16.x)

**Purpose:** Relational database core.

| Factor | Detail |
|---|---|
| ACID Compliance | Ensures data integrity for vehicle records and user data |
| Extensible | Supports custom functions, triggers, and extensions (e.g. TimescaleDB) |
| Community | Large ecosystem with tools for backup, monitoring, and optimisation |
| Performance | Optimised for complex queries (e.g. joining vehicle data with user roles) |

---

### TimescaleDB (v2.15.x)

**Purpose:** Time-series extension for PostgreSQL.

| Factor | Detail |
|---|---|
| Time-Series Optimised | Efficient storage and querying of high-frequency telemetry data |
| Hypertables | Auto-partitions data by time, avoiding table bloat |
| Continuous Aggregates | Pre-computes metrics (e.g. `vehicle_position_5s` refreshes every 5 seconds) |
| Full SQL Support | Retains all PostgreSQL features (joins, triggers, etc.) |

**Key Features:**

- **Hypertables** — Auto-partition `raw_telemetry` by time to handle 160+ records per minute
- **Continuous Aggregates** — Pre-aggregate data (e.g. `vehicle_position_5s`) for real-time dashboards
- **PostgreSQL Triggers** — Auto-parse raw telemetry into `clean_telemetry` and `vehicle_events`
- **Compression Policies** — Reduce storage costs for historical data while maintaining query performance

---

### PgBouncer (Latest)

**Purpose:** Connection pooling (up to 100 connections).

| Factor | Detail |
|---|---|
| Scalability | Handles spikes in concurrent connections during peak usage |
| Resource Efficiency | Reduces memory usage per connection |
| Performance | Lowers latency for repeated queries |
| Compatibility | Works seamlessly with TimescaleDB |

---

## 4. Cloud & Infrastructure

### AWS Kinesis

**Purpose:** Real-time telemetry ingestion.

| Factor | Detail |
|---|---|
| Scalability | Handles 160+ records per minute without throttling |
| Durability | Retains data for 24 hours, allowing reprocessing if needed |
| Decoupling | Producers (vehicles) are isolated from consumers (Lambda) |
| Integration | Native triggers for Lambda functions |

---

### AWS Lambda

**Purpose:** Serverless stream processing and API.

| Factor | Detail |
|---|---|
| Cost-Effective | Pay-per-use model for sporadic telemetry processing |
| Auto-Scaling | Handles variable workloads (e.g. spikes in vehicle activity) |
| Integration | Native triggers from Kinesis, API Gateway, and other AWS services |
| Maintenance | No server management required |

---

### AWS API Gateway

**Purpose:** HTTP routing and JWT validation.

| Factor | Detail |
|---|---|
| Security | Validates JWT tokens from Cognito before forwarding requests |
| Flexibility | Routes requests to Lambda or EC2 based on path |
| Monitoring | Built-in CloudWatch integration for logging and metrics |
| Performance | Low-latency routing with caching support |

---

### AWS Cognito

**Purpose:** User authentication and JWT issuance.

| Factor | Detail |
|---|---|
| Managed Auth | No need to build custom authentication logic |
| Scalability | Handles thousands of users without performance degradation |
| Integration | Works natively with React (frontend) and Express (backend) |
| Security | Supports MFA, social logins, and custom attributes (e.g. user roles) |

---

### AWS EC2 — af-south-1

**Purpose:** TimescaleDB hosting (`13.246.7.45`).

| Factor | Detail |
|---|---|
| Control | Full access to database configuration (tuning, backups, etc.) |
| Performance | Dedicated resources for time-series queries, critical for dashboards |
| Cost | Predictable pricing for steady workloads |
| Reliability | High availability with multi-AZ deployments |

---

### AWS S3

**Purpose:** Raw telemetry archive.

| Factor | Detail |
|---|---|
| Durability | 11 nines of durability for historical data |
| Cost-Effective | Cheap storage for raw telemetry older than 30 days |
| Integration | Easy to load into TimescaleDB for reprocessing or analytics |
| Lifecycle Policies | Auto-archive or delete old data to manage costs |

---

### AWS CloudWatch

**Purpose:** Logging and monitoring.

| Factor | Detail |
|---|---|
| Observability | Tracks API latency, Lambda errors, and DB performance |
| Alerts | Configurable for anomalies (e.g. failed telemetry ingestion, high error rates) |
| Retention | Stores logs for compliance and debugging |
| Integration | Native support for Lambda, API Gateway, and EC2 metrics |

---

## 5. Architecture Patterns

### Event-Driven Architecture — Kinesis + Lambda

**Application:** Real-time telemetry ingestion and processing.

| Factor | Detail |
|---|---|
| Decoupling | Vehicles (producers) are isolated from the backend (consumers) |
| Scalability | Handles variable telemetry rates (e.g. 160 records per minute) |
| Fault Tolerance | Failed events are retried automatically |
| Flexibility | Easy to add new consumers (e.g. analytics, alerts) |

---

### Medallion Architecture — TimescaleDB

**Application:** Data pipeline for telemetry (Bronze → Silver → Gold).

| Factor | Detail |
|---|---|
| Separation of Concerns | Raw data (Bronze) is isolated from cleaned and aggregated data (Silver/Gold) |
| Performance | Queries run faster on pre-aggregated tables (Gold layer) |
| Data Quality | Each layer enforces validation and transformations |
| Cost Efficiency | Raw data can be compressed or archived; Gold layer is optimised for queries |

**Medallion Layers:**

| Layer | Table(s) | Description |
|---|---|---|
| **Bronze** | `raw_telemetry` | Raw JSON payloads — immutable, preserved for auditing and reprocessing |
| **Silver** | `clean_telemetry`, `vehicle_events` | Parsed, validated data with consistent coordinates and timestamps |
| **Gold** | `vehicle_position_5s` | Business-ready aggregated views pre-computed for dashboards |

---

### Client-Server Architecture — API + Frontend

**Application:** Request-response model for dashboard queries.

| Factor | Detail |
|---|---|
| Simplicity | Clear separation between UI (React) and data (Express API) |
| Security | JWT validation happens at the API layer, not the client |
| Performance | Optimised for read-heavy workloads (dashboards) |
| Maintainability | Frontend and backend can be developed and deployed independently |

---

## 6. Testing & DevOps

### Jest + Supertest

**Purpose:** Unit and HTTP endpoint testing.

| Factor | Detail |
|---|---|
| Jest | Fast, parallelisable test runner for React components and utility functions |
| Supertest | Simulates HTTP requests for API endpoint testing |
| Coverage | Built-in support for coverage reports (integrates with Codecov) |
| Mocking | Easy to mock external dependencies (e.g. AWS services, databases) |

---

### GitHub Actions

**Purpose:** Automated tests on every PR.

| Factor | Detail |
|---|---|
| Integration | Native GitHub support with minimal setup |
| Flexibility | Custom workflows for backend, frontend, and database tests |
| Speed | Runs tests in parallel across multiple runners |
| Visibility | Clear pass/fail status on PRs with detailed logs |

---

### Codecov

**Purpose:** Coverage tracking and badges.

| Factor | Detail |
|---|---|
| Visibility | Tracks coverage trends over time with visual reports |
| Enforcement | Fails PRs if coverage drops below thresholds (80%+) |
| Badges | Displays coverage status in README for transparency |
| Integration | Works seamlessly with Jest and GitHub Actions |

---

### Docker + Docker Compose

**Purpose:** Reproducible local environment.

| Factor | Detail |
|---|---|
| Consistency | Same environment for development, testing, and production |
| Isolation | Avoids dependency conflicts between projects |
| Portability | Works on any machine (Linux, macOS, Windows) |
| Ease of Use | Simple commands to spin up the entire stack |

---

### GitHub

**Purpose:** Version control and collaboration.

| Factor | Detail |
|---|---|
| Collaboration | Pull requests, code reviews, and issue tracking |
| Security | Branch protection rules (e.g. require PR approvals) |
| Integration | Works natively with GitHub Actions for CI/CD |
| Auditability | Full history of changes with commit messages and PR discussions |

---

## 7. Quality Requirements Summary

| Requirement | Target | How Achieved |
|---|---|---|
| **Scalability** | 15+ vehicles, 160 records/minute | Kinesis, Lambda auto-scaling, TimescaleDB hypertables, PgBouncer |
| **Performance** | API < 500ms, telemetry < 2s | Express + Lambda, continuous aggregates, API Gateway caching |
| **Reliability** | No data loss, auto-restart on failure | Kinesis retry, Lambda dead-letter queues, WAL, CloudWatch alerts |
| **Security** | JWT + Cognito + TLS | Signed tokens, managed auth with MFA, Helmet security headers |
| **Auditability** | CloudWatch + PostgreSQL logs | CloudWatch retention policies, DB change tracking, S3 archiving |
| **Testability** | 80%+ code coverage | Backend at 97.95%; frontend target 80%+ via Jest, Supertest, Codecov |

---

## 8. Frontend Testing Issues & Justifications

### Recharts Missing

**Error:** Objects are not valid as a React child in `FleetActivityChart` tests.

**Root Cause:** The `recharts` library is not installed, causing components to render as null or invalid objects.

**Justification for Recharts:**

- Standard for React charts — widely adopted in the React ecosystem
- Declarative syntax matches React's component-based approach
- Optimised for rendering dynamic data (e.g. vehicle activity over time)
- Supports all chart types needed for dashboards (line, bar, donut)

---

### PropTypes Errors

**Error:** `TypeError: _propTypes.default.shape is not a function`

**Root Cause:** The `prop-types` package is either missing or not properly mocked.

**Justification for PropTypes:**

- Runtime validation catches prop errors during development
- Serves as inline documentation for component APIs
- Compatible with all React versions (including v18.2.0)
- Improves code reliability and maintainability

---

### Text Matching Failures

**Error:** Unable to find an element with the text `/Admin Dashboard/i`

**Root Cause:** Tests expect text that does not match the actual UI (e.g. "Dashboard" vs "Admin Dashboard").

**Justification for Fixing:**

- Tests should accurately reflect the real user experience
- Reduces flakiness in test suites
- Clear assertions make tests easier to debug

---

### Coverage Below 80%

| Metric | Current | Target |
|---|---|---|
| Backend Coverage | 97.95% | 80%+ |
| Frontend Coverage | ~70% | 80%+ |

**Justification for 80% Threshold:**

- 80% is the widely accepted industry minimum for production code
- Reduces the chance of undetected bugs in critical paths
- Ensures most code paths are exercised during development
- Aligns frontend standards with the backend's high coverage

---

### Recommended Actions

**1. Install missing frontend dependencies:**
```bash
npm install recharts prop-types
```

**2. Fix test assertions** — Update text matchers in `AdminDashboard.test.jsx` to match the actual rendered text (e.g. `"Dashboard"` instead of `"Admin Dashboard"`).

**3. Improve frontend coverage** — Add tests for untested components and use `data-testid` attributes for stable selectors:
```jsx
<div data-testid="admin-dashboard">...</div>
```

**4. Enforce coverage in CI** — Update GitHub Actions to fail if frontend coverage drops below 80%.

---

## 9. Why This Stack Works

| Use Case | Technologies | Rationale |
|---|---|---|
| **Real-Time Vehicle Tracking** | Kinesis + Lambda + Mapbox | Low-latency ingestion with high-scalability map rendering |
| **Dashboard Analytics** | TimescaleDB + Recharts | Pre-aggregated Gold layer powers fast, responsive charts |
| **Role-Based Access Control** | Cognito + JWT + React Router | Secure routing to admin/manager/viewer dashboards by role |
| **Scalability** | Lambda + Kinesis | Serverless auto-scaling handles variable telemetry loads cost-effectively |
| **Data Integrity** | PostgreSQL + TimescaleDB | ACID compliance with time-series optimisations guarantees no data loss |
| **Testability** | Jest + Supertest + Codecov | Enforces 80%+ coverage, reducing production bugs |
| **Cost Efficiency** | Lambda + EC2 | Pay-per-use for processing; predictable costs for the database |

---

## 10. Coverage Improvement Plan

### Current State

| Layer | Coverage | Status |
|---|---|---|
| Backend | 97.95% | Exceeds target |
| Frontend | ~70% | Needs improvement |

### Action Plan

| Component | Tests to Add | Expected Coverage |
|---|---|---|
| **FleetActivityChart** | Chart rendering, data updates, edge cases (empty data, zero values) | 80%+ |
| **EditUserModal** | Modal open/close, role selection, save/cancel actions | 80%+ |
| **AdminDashboard** | User table rendering, role changes, error handling (failed API calls) | 80%+ |
| **DropdownMenu** | Menu open/close, item selection, keyboard navigation (accessibility) | 80%+ |

### Tools

- `@testing-library/react` for component testing
- `jest.mock` for mocking external dependencies (e.g. API calls)
- `data-testid` attributes for stable, reliable selectors

---

*Document maintained by Kilimanjaro StoneCap · Version 1.1 · Last updated May 2026*
