# Architectural Requirements 

## Vehicle Analytics Platform - V.A.P.O.R

**Prepared By:** Kilimanjaro StoneCap
**Demo:** Demo 2


---


## 1. Architectural Design Strategy 

We worked closely with the client to understand what they needed from the system. Our main focus was on making it fast, reliable and easy to maintain.


**Why we did it this way**

- Client First - put their needs at the center of every decision.
- Saves Time and Money - proper planning avoided rework.
- Better Technical Choices - knowing requirements helped pick the right tools.


---



## 1. Architectural Patterns

**2.1 Event-Driven Architecture**

Vehicles send telemetry to AWS Kinesis, which triggers Lambda functions to process and store the data.
- Handles large amounts of data well.
- Keeps vehicles decoupled from the backend.
- Easy to extend later.


**2.2 Medallion Architecture**

Data is stored in three layers using TimescaleDB:
- Bronze - 'raw_telemetry' - raw data kept as-is.
- Silver - 'clean_telemetry', 'vehicle_events' - cleaned and organized.
- Gold - 'current_vehicle_position' - ready for fast dashboard queries.


**2.3 Client-Server Architecture**

React frontend talks to an Express API, which queries the database.
- Frontend and backend worked on independently.
- Clear separation of responsibilities.


---



## 3. Design Patterns


**Observer Pattern** - used for alerts. When a safety event happens, all relevant parts are notified. Alert handling stays separate from detection.


**Strategy - Have to look into this**


**Factory Method - Have to look into this**


**Memento - trip replay and trip history - Have to look into this**


---



## 4. Architecture Diagram


STILL NEEDS TO BE UPDATED FOR DEMO 2



---



## 5. Quality Requirements

**5.1 Performance**

- API response time - under 2s - gold layer pre-aggregates; DB indexes; connection pooling.
- Telemetry processing - under 2s - Lambda auto-scales; TimescaleDB hypertables.
- Dashboard load - under 5s - React + Zustand; API Gateway caching.
- Map updates - under 10s - Kinesis stream; continuous aggregate.


**5.1 Scalability**

- Vehicles: 15 now, scalable to 50 - Lambda + Kinesis shards.
- Records/min: 48 now, scalable to 160 - TimescaleDB hypertables.
- Users: 50 now, scalable to 500 - serverless architecture.
- DB connections: 100 - PgBouncer.


**5.3 Security**

- Data at rest: AES-256 via AWS KMS.
- Data in transit: TLS 1.2+ via API Gateway and HTTPS.
- Authentication: JWT tokens via AWS Cognito.
- Authorization: role-based middleware.
- Rate limiting: 100 requests per 15 minutes via express-rate-limit.


**5.4 Reliability**

- Uptime: 99.5% - serverless AWS.
- Data durability: 11 nines - S3 storage.
- Failure recovery: within 5 minutes - Cloudwatch + auto-retry.
- Data loss: Kinesis at-least-once + dead letter queues.


**5.5 Maintainability**

- Test coverage: 80%+ - Jest + Codecov.
- Code quality: zero ESLint errors - ESLint.
- Deployment: under 2 hours - Github Actions CI/CD.
- Local setup: under 30 minutes - Docker Compose.


**5.6 Usability**

- Learnability: under 5 minutes - simple UI, clear labels.
- Error messages: clear and helpful.


---



## 6. Contraints

**Technical**   

- Cloud provider: AWS only.
- No Personally Identifiable Information stored:  we do not store anything that can identify a person - we only keep vehicle data.
- Must handle 15 vehicles at 5-10 second intervals.
- Browser support: latest Chrome, Safari, Edge.

**Development**

- Minimum 80% test coverage.
- Minimum 4 PR approvals before merge.
- No direct pushes - all changes via PR to develop.
- Docker Compose for local dev.

**Business**

- 4 fixed demo milestones (May, July, September, October).
- Must meet all COS301 capstone specifications.
- FuseIT branding on all deliverables.
- Code must be publicly accessible.


**Budget**

- AWS cost limit: R5000 - R15 000.
- Cloudwatch budget alerts.
- Serverless-first to minimize cost.



---



## 7. Technology Stack

**Frontend**

- React.js - UI Framework.
- Vite - build tool.
- Tailwind CSS - styling.
- Mapbox GL JS - vehicle tracking maps.
- Recharts - charts and analytics.
- Zustand - state management.


**Backend**

- Node.js + Express.js - REST API.
- JWT - authentication.
- Helmet - security headers.
- express-rate-limit - rate limiting.
- pg - PostgreSQL client.
- serverless-http - Lambda wrapper.

**Database**

- PostgreSQL + TimescaleDB - relational + time-series.
- PgBouncer - connection pooling.


**Cloud (AWS)**

- Kinesis - telemetry ingestion.
- Lambda - serverless processing.
- API Gateway - HTTP routing + JWT validation.
- Cognito - user authentication.
- EC2 - database hosting.
- S3 - data archive.
- CloudWatch - logging and monitoring.


**DevOps and Testing**

- Docker - local development.
- Github Actions - CI/CD.
- Jest + Supertest - unit and API testing.
- Codecov - coverage tracking.
- Cypress - end-to-end testing.


---



## 8. Quality to Architecture Mapping

- Performance (under 2s) - Gold Layer pre-aggregation; PgBouncer; DB indexes.
- Scalability - Lambda auto-scaling; kinesis shards; TimescaleDB.
- Security (AES-256) - AWS KMS; TLS 1.2+.
- Reliability (99.5% uptime) - Serverless AWS; Cloudwatch; auto-retry.
- Maintainability (80% cov) - CI/CD; Jest; Codecov, ESLint.



---



## Document Approval

- Backend and Testing - Christoper Adolph - July 2026.
- Frontend and Integration - Kwanele Phakathi - July 2026.
- Cloud and Data Eng - Warona Moleboge - July 2026.
- Frontend and UX - Ziphozinhle Maduna - July 2026.
- Data Eng and Integration - Marchant Grootboom - July 2026.
























































