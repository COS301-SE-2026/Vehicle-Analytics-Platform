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




## 2. Architectural Patterns


**2.1 Layered Architecture**


We split the system into four layers, each with its own job. This keeps things organized and makes it easier to change stuff without breaking everything.

The Layers:
- Presentation Layer (Frontend) - React application that users interact with. Communicates with the backend via REST API. Never touches the database directly.
- Business Logic Layer (Backend) - Express API that handles all business rules. Processes telemetry, calculates safety scores, manages trips.
- Data Access Layer - abstracts all database operations. Keeps database logic separate from business logic.
- Database Layer - PostgreSQL with TimescaleDB extension. Stores telemetry, safety scores, trips, and user data.

Why we chose it: clear boundaries between concerns. When we change safety score calculations, we only touch the business layer. When we change the database, we only touch the data access layer.


**2.2 Event-Driven Architecture**


Vehicles send telemetry to AWS Kinesis, which triggers Lambda functions to process and store the data.

How it works:
- Vehicle sends telemetry to Kinesis.
- Kinesis triggers Lambda.
- Lambda processes and stores data.
- Dashboard updates automatically.

- Handles large amounts of data well.
- Keeps vehicles decoupled from the backend.
- Easy to extend later.
- No polling needed - events are pushed.


**2.3 Medallion Architecture**


Data is stored in three layers using TimescaleDB:
- Bronze - 'raw_telemetry' - raw data kept as-is. Never modified. Good for debugging.
- Silver - 'clean_telemetry', 'vehicle_events' - cleaned and organized. GPS parsed, speeds validated.
- Gold - 'current_vehicle_position', 'driver_daily_safety_scores' - ready for fast dashboard queries. Pre-computed so queries are fast.

Why we chose it: we keep the raw data if something goes wrong. The gold layer makes dashboard queries instant because the heavy work is already done.


**2.4 Client-Server Architecture**


React frontend talks to an Express API, which queries the database.
- Frontend and backend worked on independently.
- Clear separation of responsibilities.



---




## 3. Design Patterns



**3.1 Singleton Pattern**


What it is: ensures only one instance of a class exists and provides a global point of access to it.


Where we use it: database connection pool. We create one pool and reuse it everywhere.


```

const {Pool} = require('pg');


const pool = new Pool({

  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

});


module.exports = { pool };

```

Why we used it:

- Saves resources by reusing connections.
- Prevents connection leaks.
- Manages connection limits efficiently.




**3.2 Factory Pattern**


What it is: creates objects without exposing the creation logic to the client.


Where we use it: API response formatting. The success() and error() functions create consistent response objects.

```

function success(res, data, statusCode = 200) {

  return res.status(statusCode).json({
  
  success: true,
  data,
  timestamp: new Date().toISOString()

  });
}


function error(res, message, statusCode = 500) {

  return res.status(statusCode).json({

    success: false,
    error: message,
    timestamp: new Date().toISOString()

  });
}


module.exports = {success, error};

```


Why we used it:

- Consistent API response format across all endpoints.
- Easy to change response structure in one place.



**3.3 Observer Pattern**


What it is: defines a one-to-many dependency where when one object changes state, all its dependents are notified.


Where we use it: Kinesis to Lambda integration. When new telemetry arrives in Kinesis, it automatically triggers the Lambda function. Alert handling stays separate from detection.


```


exports.handler = async (event) => {


  for(const record of event.Records){
    const data = JSON.parse(Buffer.from(record.kinesis.data, 'base64'));
    await processTelemetry(data);

  }
};

```

Why we used it:
- Decouples data ingestion from processing.
- No polling needed - events are pushed.
- Handles variable telemetry loads.



**3.4 Chain of Responsibility**


What it is: passes a request along a chain of handlers. Each handler decides to process the request or pass it to the next handler.


Where we use it: API middleware chain. Each request passes through multiple middleware handlers.


```

app.use(cors());          
app.use(helmet());         
app.use(limiter);          
app.use('/api/vehicles', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), vehicleRoutes);

```


```


async function authenticate(req, res, next) {

  const token = req.headers.authorization?.split(' ')[1];

  if(!token){
    return error(res, 'No token provided', 401);
  }
  req.user = decodedUser;

  next();

}


```


Why we used it:
- Clean separation of cross-cutting concerns.
- Easy to add new middleware without changing existing code.



**3.5 Strategy Pattern**


What it is: defines a family of algorithms, encapsulates each one, and makes them interchangeable at runtime.


Where we use it: safety score calculation. Different event types have different penalty strategies.


```

SELECT COALESCE(SUM(
    CASE 
        WHEN event_detail = 'harsh_braking' THEN 10
        WHEN event_detail = 'harsh_acceleration' THEN 5
        WHEN event_detail = 'harsh_cornering' THEN 3
        WHEN event_category = 'crash_detection' THEN 50
        ELSE 0
    END

), 0) INTO total_penalty
FROM vehicle_events
WHERE vehicle_id = v_record.vehicle_id
  AND DATE(time) = yesterday;

score := GREATEST(100 - total_penalty, 0);

```


Why we used it:
- Easy to add new event types with different penalties.
- Penalty values can be changed without rewriting logic.



**3.6 Memento Pattern**


Where we use it: trip replay and trip history. Captures and restores a vehicle's past state without exposing internal details, so a trip can be "replayed" step by step.



---




## 4. Architecture Diagram





---




## 5. Quality Requirements


**5.1 Performance**

- API response time - under 2s - gold layer pre-aggregates; DB indexes; connection pooling.
- Telemetry processing - under 2s - Lambda auto-scales; TimescaleDB hypertables.
- Dashboard load - under 5s - React + Zustand; API Gateway caching.
- Map updates - under 10s - Kinesis stream; continuous aggregate.


**5.2 Scalability**

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




## 6. Constraints


**Technical**

- Cloud provider: AWS only.
- No Personally Identifiable Information stored: we do not store anything that can identify a person - we only keep vehicle data.
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
