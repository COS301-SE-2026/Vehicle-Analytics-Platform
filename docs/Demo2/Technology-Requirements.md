# Technology Requirements 

## Vehicle Analytics Platform - V.A.P.O.R

**Prepared by:** Kilimanjaro StoneCap
**Demo:** Demo 2


---



## Frontend

| Technology | Purpose | Why we chose it |
|------------|---------|-----------------|
| React.js | UI Framework for dashboards and maps | We know React well and it works fast |
| Vite | Build Tool | Makes development quicker with hot reload |
| Tailwind CSS | Styling | Easy to keep designs consistent |
| Mapbox GL JS | Interactive vehicle tracking maps | Good for showing real-time vehicle positions |
| Recharts | Charts and graphs | Simple to use with REact |
| Zustand | State management | Light and does what we need |



---




## Backend

| Technology | Purpose | Why we chose it |
|------------|---------|-----------------|
| Node.js | JavaScript runtime | Stable version with good support |
| Express.js | REST API framework | Simple and flexible enough |
| JWT | Authentication tokens | Works well with Cognito |
| Helmet | Security headers | Adds basic protection |
| express-rate-limit | API rate limiting | Stops people from spamming API |
| pg | PostgreSQL client | Handles database connections well |
| serverless-http | Lambda wrapper | Lets us run Express on Lambda easily |



---




## Database

| Technology | Purpose | Why we chose it |
|------------|---------|-----------------|
| PostgreSQL | Relational database | Solid and reliable |
| TimescaleDB | Time-series extension | Makes telemetry queries fast |
| PgBouncer | Connection pooling | Handles many connections without issues |




---



## Cloud Infrastructure

| Technology | Purpose | Why we chose it |
|------------|---------|-----------------|
| Kinesis | Real-time telemetry  ingestion | Good for streaming data |
| Lambda | Serverless processing | Scales auto, pay for what you use |
| API Gateway | HTTP routing and JWT validation | Has security features built in |
| Cognito | User authentication | We did not want to build auth from scratch |
| EC2 | Database hosting | Gives us full control |
| S3 | Data archive | Cheap and keeps data safe |
| Cloudwatch | Logging and monitoring | Helps us track issues |




---




## DevOps and testing

| Technology | Purpose | Why we chose it |
|------------|---------|-----------------|
| Docker | Local development | Works the same on every machine |
| Github actions |CI/CD pipeline | Runs test auto |
| Jest | Testing | Works for both frontend and backend |
| Supertest | API testing | Good for testing API endpoints |
| Codecov | Coverage tracking | Shows which parts of code need more tests |
| Cypress | End-to-end testing | Tests real user flows |





---




## Architecture patterns

| Pattern | Purpose | Why we chose it |
|------------|---------|-----------------|
| Event-Driven | Kinesis + lambda for telemetry ingestion | Keeps things separate and handles load well |
| Medallion | Bronze - Silver - Gold in TimescaleDB | Keeps raw, clean and aggregated data separate|
| Client-Server | React frontend - Express API | Simple to manage and deploy |
































































