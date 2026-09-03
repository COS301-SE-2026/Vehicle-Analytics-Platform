
# NFR Testing Documentation


**Vehicle Analytics Platform - V.A.P.O.R**


| | |
|---|---|
| **Prepared By** | Kilimanjaro StoneCap |
| **Demo** | Demo 3 |
| **Date** | September 2026 |


---


## Table of Contents


1. [Introduction](#1-introduction)
2. [NFR Traceability Matrix](#2-nfr-traceability-matrix)
3. [Test Tools](#3-test-tools)
4. [Test Environment](#4-test-environment)
5. [Test Execution Guide](#5-test-execution-guide)
6. [Evidence Capture](#6-evidence-capture)
7. [Test Results Summary](#7-test-results-summary)
8. [Conclusion](#8-conclusion)


---


## 1. Introduction


This document outlines the Non-Functional Requirement (NFR) testing strategy for V.A.P.O.R, as required for Demo 3. Every quality requirement in the SRS has at least one executable, repeatable test that produces evidence.


### 1.1 Purpose


The purpose of NFR testing is to:


- Verify that the system meets its quality requirements
- Validate the architectural tactics claimed in the SAS
- Provide quantifiable evidence of system performance
- Identify areas for improvement before production


### 1.2 Scope


This document covers NFR testing for:


- **Performance** - API response times, load handling
- **Scalability** - vehicle count, user concurrency
- **Security** - JWT validation, RBAC, rate limiting
- **Reliability** - uptime, failure recovery
- **Maintainability** - code coverage, code quality


### 1.3 Key Principle


> **Unquantified (0 marks):** "The system must be fast and handle many users."
>
> **Quantified (testable):** "95% of GET /api/vehicles/locations requests must complete within 80ms, while 100 virtual users request concurrently for 5 minutes against production."


---


## 2. NFR Traceability Matrix


# NFR / QR Requirements Traceability

| ID | Quantified Requirement | Tactic in SAS | Test / Tool | Target / Actual |
|---|---|---|---|---|
| NFR1.1 (QR-01) | 95% of API requests complete within 80ms, max <2s at 100 concurrent users | TimescaleDB Continuous Aggregates + Gold Layer views + Database indexing | k6 | <80ms avg / 7.02s |
| NFR1.2 (QR-02) | 95% of telemetry requests acknowledge within 50ms | Kinesis stream + Lambda auto-scaling | k6 | <50ms avg / 27.98ms |
| NFR1.3 (QR-03) | Dashboard loads within 5s, FCP <2s, TTI <5s, Score >80 | React + Zustand + API Gateway caching | Lighthouse CI | Score 85, FCP 1.8s, TTI 3.2s |
| NFR1.4 (QR-04) | Map navigates within 10s of telemetry | Kinesis -> Lambda -> WebSocket push | Cypress | <10s / 2.2s |
| NFR2.1 (QR-05) | System scales from 15 to 50 vehicles with <10% degradation | Lambda concurrent executions + Kinesis shards + PgBouncer | Artillery | <10% degradation / 100% 401 errors |
| NFR3.3 (QR-06) | Invalid token returns 401, valid returns 200 | API Gateway Cognito authorizer | Jest | 401/200 / PASS |
| NFR3.4 (QR-07) | Viewer returns 403, Admin returns 200 | Role-based middleware | Jest | 403/200 / PASS |
| NFR3.5 (QR-08) | 100 requests allowed, 101st returns 429 | express-rate-limit middleware | Jest | 100 allowed, 101st -> 429 |
| NFR4.1 (QR-09) | 99.5% uptime over 30 days | Serverless AWS + CloudWatch | CloudWatch + UptimeRobot | >=99.5% / 99.925% |
| NFR5.1 (QR-10) | Code coverage >=80% across codebase | Jest + Codecov | npm run test:coverage | >=80% / 91.3% |

---


## 3. Test Tools


| Tool | Purpose | Installation |
|---|---|---|
| **k6** | Load and performance testing | See [5.1 Prerequisites](#51-prerequisites) |
| **Artillery** | Scalability testing | `sudo npm install -g artillery` |
| **Jest** | Unit and integration testing | `npm install --save-dev jest` |
| **Cypress** | E2E navigation testing | `npm install --save-dev cypress` |
| **Lighthouse CI** | Frontend performance | `npm install -g @lhci/cli` |
| **CloudWatch** | Uptime monitoring | AWS Console |



---


## 4. Test Environment


| Environment | URL | Purpose |
|---|---|---|
| **Production API** | `https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod` | All NFR tests |
| **Frontend App** | `https://d25bouomowr0it.cloudfront.net` | UI navigation tests |
| **Database** | `13.247.176.17:6432` | Production database |


---


## 5. Test Execution Guide


### 5.1 Prerequisites


**Get a JWT Token:**


```bash
TOKEN=$(curl -s -X POST https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kmj-manager@kmj.com","password":"Capstone@2026"}' \
  | grep -o '"idToken":"[^"]*' | cut -d'"' -f4)

export JWT_TOKEN="$TOKEN"


```

**Install Required Tools:**


```bash
# k6
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update && sudo apt install k6


# Artillery

sudo npm install -g artillery

# Lighthouse CI

npm install -g @lhci/cli

```


### 5.2 Run All Tests


| NFR | Command |
|---|---|
| NFR1.1 | `JWT_TOKEN="$TOKEN" k6 run backend/tests/nfr/load/api-load-test.js` |
| NFR1.2 | `k6 run backend/tests/nfr/load/telemetry-load-test.js` |
| NFR1.3 | `lhci autorun --collect.url=https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod --collect.numberOfRuns=1` |
| NFR1.4 | `npx cypress run --spec cypress/e2e/map-timing.cy.js` |
| NFR2.1 | `JWT_TOKEN="$TOKEN" artillery run backend/tests/nfr/load/scalability-test.yml` |
| NFR3.3 | `npm test -- backend/tests/nfr/security/jwt.test.js` |
| NFR3.4 | `npm test -- backend/tests/nfr/security/rbac.test.js` |
| NFR3.5 | `npm test -- backend/tests/nfr/security/rate-limit.test.js` |
| NFR4.1 | Check CloudWatch Dashboard |
| NFR5.1 | `npm run test:coverage` |


---


## 6. Evidence Capture


### 6.1 Required Evidence


| NFR | Evidence Type | File Name |
|---|---|---|
| NFR1.1 | k6 test results | `docs/nfr-results/nfr1.1-api-load-test.txt` |
| NFR1.2 | k6 telemetry results | `docs/nfr-results/nfr1.2-telemetry-load-test.txt` |
| NFR1.3 | Lighthouse report | `docs/nfr-results/nfr1.3-lighthouse-report.txt` |
| NFR1.4 | Cypress test results | `docs/nfr-results/nfr1.4-map-timing-report.txt` |
| NFR2.1 | Artillery results | `docs/nfr-results/nfr2.1-scalability-test.txt` |
| NFR3.3 | Jest test results | `docs/nfr-results/nfr3.3-jwt-test.txt` |
| NFR3.4 | Jest test results | `docs/nfr-results/nfr3.4-rbac-test.txt` |
| NFR3.5 | Jest test results | `docs/nfr-results/nfr3.5-rate-limit-test.txt` |
| NFR4.1 | CloudWatch dashboard | `docs/nfr-results/nfr4.1-uptime-report.txt` |
| NFR5.1 | Codecov report | `docs/nfr-results/nfr5.1-coverage.txt` |



---



## 7. Test Results Summary



| NFR | Target | Actual | Status |
|---|---|---|---|
| NFR1.1 | avg < 80ms, max < 2s | avg 7.02s, max 16.21s | FAIL |
| NFR1.2 | avg < 50ms, max < 100ms | avg 27.98ms, max 177.89ms | FAIL |
| NFR1.3 | FCP < 2s, TTI < 5s | FCP 1.8s, TTI 3.2s | PASS |
| NFR1.4 | < 10s | 2.2s | PASS |
| NFR2.1 | < 10% degradation | 100% 401 errors | FAIL |
| NFR3.3 | 401/200 | 401/200 | PASS |
| NFR3.4 | 403/200 | 403/200 | PASS |
| NFR3.5 | 429 on 101st | 429 on 101st | PASS |
| NFR4.1 | ≥ 99.5% | 99.85% | PASS |
| NFR5.1 | ≥ 80% | 91.3% | PASS |


---


## 8. Conclusion


### 8.1 Summary


| Aspect | Result |
|---|---|
| Total NFRs Tested | 10 |
| Passed | 7 |
| Failed | 3 |
| **Pass Rate** | **70%** |


### 8.2 Failed NFRs - Action Items


| NFR | Issue | Action Required |
|---|---|---|
| NFR1.1 | API response time too slow (avg 7.02s vs target 80ms) | Optimize Lambda, add PgBouncer, increase memory |
| NFR1.2 | Telemetry endpoint returns 100% errors | Fix `/api/vehicles/telemetry` endpoint |
| NFR2.1 | Artillery returns 100% 401 errors | Fix JWT token passing in Artillery |


### 8.3 Passed NFRs - Confirmed


| NFR | Achievement |
|---|---|
| NFR1.3 | Dashboard loads within target times |
| NFR1.4 | Map navigates within 2.2s |
| NFR3.3 | JWT validation works correctly |
| NFR3.4 | RBAC enforced correctly |
| NFR3.5 | Rate limiting works correctly |
| NFR4.1 | 99.85% uptime achieved |
| NFR5.1 | 91.3% code coverage achieved |


---


## Document Approval


| Role | Name | Date |
|---|---|---|
| Backend and Testing | Christopher Adolph | September 2026 |
| Frontend and Integration | Kwanele Phakathi | September 2026 |
| Cloud and Data Eng | Warona Moleboge | September 2026 |
| Frontend and UX | Ziphozinhle Maduna | September 2026 |
| Data Eng and Integration | Marchant Grootboom | September 2026 |
