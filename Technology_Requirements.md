# Technology Requirements
## Vehicle Analytics Platform

---

| | |
|---|---|
| **Document Title** | Technology Requirements |
| **Project** | Vehicle Analytics Platform |
| **Client** | Fuse IT |
| **Team** | Kilimanjaro StoneCap |
| **Last Updated** | May 2026 |

---

## Table of Contents

1. [Frontend Technologies](#1-frontend-technologies)
2. [Backend Technologies](#2-backend-technologies)
3. [Database Technologies](#3-database-technologies)
4. [Cloud & Infrastructure](#4-cloud--infrastructure)
5. [Architecture Patterns](#5-architecture-patterns)
6. [Testing & DevOps](#6-testing--devops)
7. [Quality Requirements Summary](#7-quality-requirements-summary)

---

## 1. Frontend Technologies

| Technology | Version | Status | Purpose |
|---|---|---|---|
| **React.js** | 19.2.5 | Installed | UI framework for dashboards and vehicle maps |
| **Vite** | 8.0.10 | Installed | Build tool and development server |
| **Mapbox GL JS** | Latest | Pending | Interactive map for real-time vehicle positions |
| **Recharts** | Latest | Pending | Chart library for KPIs and analytics |
| **Axios** | Latest | Pending | HTTP client for API calls with JWT |
| **React Router DOM** | Latest | Pending | Navigation between dashboards |

---

## 2. Backend Technologies

| Technology | Version | Status | Purpose |
|---|---|---|---|
| **Node.js** | 20.x | Installed | JavaScript runtime |
| **Express.js** | 4.x | Installed | REST API framework |
| **JWT** | 9.x | Installed | Authentication tokens |
| **Helmet** | 7.x | Installed | Security headers |
| **express-rate-limit** | 7.x | Installed | Rate limiting (100 requests per 15 minutes) |
| **pg (node-postgres)** | 8.x | Installed | PostgreSQL client with connection pooling |
| **serverless-http** | 3.x | Installed | Express to Lambda wrapper |

---

## 3. Database Technologies

| Technology | Version | Status | Purpose |
|---|---|---|---|
| **PostgreSQL** | 16.x | Deployed | Relational database core |
| **TimescaleDB** | 2.15.x | Deployed | Time-series extension |
| **PgBouncer** | Latest | Deployed | Connection pooling (up to 100 connections) |

### TimescaleDB Features

- Hypertables
- Continuous Aggregates (`vehicle_position_5s` refreshes every 5 seconds)
- PostgreSQL triggers
- Compression policies

---

## 4. Cloud & Infrastructure

| Service | Purpose | Status |
|---|---|---|
| **AWS Kinesis** | Real-time telemetry ingestion | Deployed |
| **AWS Lambda** | Serverless stream processing and API | Deployed |
| **AWS API Gateway** | HTTP routing and JWT validation | Deployed |
| **AWS Cognito** | User authentication and JWT issuance | Deployed |
| **AWS EC2** `af-south-1` | TimescaleDB hosting (`13.246.7.45`) | Deployed |
| **AWS S3** | Raw telemetry archive | Deployed |
| **AWS CloudWatch** | Logging and monitoring | Configured |

---

## 5. Architecture Patterns

| Pattern | Application | Purpose |
|---|---|---|
| **Event-Driven Architecture** | Kinesis + Lambda | Decouples producers from consumers |
| **Medallion Architecture** | TimescaleDB | Bronze → Silver → Gold data pipeline |
| **Client-Server Architecture** | API + Frontend | Request-response for dashboard queries |

### Medallion Architecture Layers

| Layer | Table(s) | Description |
|---|---|---|
| **Bronze** | `raw_telemetry` | Raw JSON payloads |
| **Silver** | `clean_telemetry`, `vehicle_events` | Parsed, validated data |
| **Gold** | `vehicle_position_5s` | Business-ready aggregated views |

---

## 6. Testing & DevOps

| Category | Technology | Purpose |
|---|---|---|
| **Testing** | Jest, Supertest | Unit and HTTP endpoint testing |
| **CI/CD** | GitHub Actions | Automated tests on every PR |
| **Coverage** | Codecov | Coverage tracking and badges |
| **Containerization** | Docker, Docker Compose | Reproducible local environment |
| **Version Control** | GitHub | Repository hosting |

### Backend Test Statistics

| Metric | Value |
|---|---|
| **Test Suites** | 9 passing |
| **Individual Tests** | 61 passing |
| **Statement Coverage** | 97.95% |
| **Branch Coverage** | 83.78% |
| **Function Coverage** | 95.00% |
| **Line Coverage** | 97.95% |

### CI Pipeline Steps

```
Backend Tests → Frontend Tests → Database Tests (TimescaleDB container) → Coverage Upload
```

---

## 7. Quality Requirements Summary

| Requirement | Target | Status |
|---|---|---|
| **Scalability** | 15+ vehicles, 160 records/minute | Met |
| **Performance** | API < 500ms, telemetry < 2s | Met |
| **Reliability** | No data loss, auto-restart on failure | Met |
| **Security** | JWT + Cognito + TLS | Met |
| **Auditability** | CloudWatch + PostgreSQL logs | Met |
| **Testability** | 80%+ code coverage | Exceeded (97.95%) |

---

*Document maintained by Kilimanjaro StoneCap · Last updated May 2026*
