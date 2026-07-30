# Non Functional Requirements 

## Vehicle Analytics Platform - V.A.P.O.R

**Prepared By:** Kilimanjaro StoneCap
**Demo:** Demo 2


---


**NFR1: Performance**

NFR1.1: API requests must execute with a response time of of <80ms under steady loads,with a hard maximum cap 2s for 95% of complex spatial reports under peak concurrency.

NFR1.2: Ingestion gateway must acknowledge telemetry inputs <50ms by offloading incoming payloads asynchronously to the stream buffer.

NFR1.3: The dashboard must load and become interactive within 5 seconds.

NFR1.4: Vehicle positions on the map must update within 10 seconds of receiving telemetry.

NFR1.5: System must fully parse telemetry data, spatially index data via PostGIS, and commit to timeseries hypertables within <2.0s of arriving at the ingestion stream edge.


**NFR2: Scalability**

NFR2.1: System shall handle 15 concurrent vehicles at steady state, scalable to 50 vehicles.

NFR2.2: System shall ingest 48 records per minute at steady state, scalable to 160 records per minute.

NFR2.3: System  must maintain linear write speeds and experience zero write degradation up to 100M+ rows of historical telemetry.

NFR2.4: System shall support 15 concurrent users minimum, scalable to 500 users.


**NFR3: Security**

NFR3.1: All data stored shall be encrypted using AES-256 encryption.

NFR3.2: All network communication shall use TLS 1.2+ encryption.

NFR3.3: All protected endpoints shall require valid JWT tokens.

NFR3.4: Access to resources shall be restricted based on user role (Admin, Fleet Manager, Viewer).

NFR3.5: API requests shall be limited to 100 requests per 15 minutes per IP address.


**NFR4: Reliability**

NFR4.1: System shall have 99.5% uptime .

NFR4.2: Data stored in S3 shall be highly durable and not lost.

NFR4.3: System shall recover from critical failures within 5 minutes of detection.

NFR4.4: No telemetry data shall be lost during normal operation.


**NFR5: Maintainability**

NFR5.1: Codebase shall have at least 80% automated test coverage.

NFR5.2: Codebase shall have zero ESLint errors across all JS files.

NFR5.3: New features and fixes shall be deployable within 2 hours of merge approval.

NFR5.4: All public APIs shall be documented and maintained in repo.

NFR5.5: Development environments shall be reproducible using Docker Compose in under 30 minutes.

NFR5.6: All schema modifications must be managed via structured database migration files and applied deterministically through the automated deployment pipeline.