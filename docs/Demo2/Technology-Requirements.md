# Technology Requirements


## Vehicle Analytics Platform - V.A.P.O.R


**Prepared By:** Kilimanjaro StoneCap  
**Demo:** Demo 2



---



## Frontend



### React.js



**Purpose:** UI framework for dashboards and maps.



**Why we chose it:**

- Mapbox GL JS has better React integration than Vue or Angular
- Recharts works natively with React components
- Our team has experience with React, which speeds up development


**What we considered:**
- **Vue.js** - Simpler to learn but Mapbox integration is not as smooth
- **Angular** - More opinionated and heavier, would slow us down



---



### Vite


**Purpose:** Build tool and development server.


**Why we chose it:**

- Faster hot reload than Webpack, which saves time during development
- Less configuration needed than Webpack or CRA


**What we considered:**

- **Webpack** - Slower and more complex to configure
- **Create React App (CRA)** - Slower and harder to customize


---



### Tailwind CSS


**Purpose:** Styling and UI components.


**Why we chose it:**

- Matches our brand colours easily
- Keeps styles consistent across all components
- No need to write custom CSS for every component


**What we considered:**

- **Plain CSS** - Harder to keep consistent across the team
- **Sass** - More setup and configuration required



---



### Mapbox GL JS


**Purpose:** Interactive vehicle tracking maps.


**Why we chose it:**

- Handles 15+ vehicle markers updating every 5-10 seconds without lag
- Supports custom vehicle icons and colour-coded statuses
- Good documentation and examples


**What we considered:**

- **Leaflet** - Lighter but doesn't handle real-time updates as well
- **Google Maps API** - More expensive for commercial use



---



### Recharts


**Purpose:** Charts and graphs for analytics.


**Why we chose it:**

- Built specifically for React, so it integrates seamlessly
- Supports all chart types we need (line, bar, donut)
- Lightweight and responsive


**What we considered:**

- **Chart.js** - Not React-native, requires wrapper libraries


---


### Zustand



**Purpose:** State management.


**Why we chose it:**

- Lightweight and simple to use for auth state and vehicle data
- Less boilerplate than Redux
- Works well with React


**What we considered:**

- **Redux** - More powerful but adds unnecessary complexity for our needs
- **Context API** - Can cause unnecessary re-renders



---


## Backend


### Node.js


**Purpose:** JavaScript runtime.


**Why we chose it:**

- Allows us to use JavaScript across the entire stack
- Handles I/O operations well for API requests and database queries
- Large ecosystem for backend libraries


**What we considered:**

- **Python** - Better for data science but slower for API requests
- **Go** - Faster but would require learning a new language



---



### Express.js


**Purpose:** REST API framework.


**Why we chose it:**

- Simple and flexible enough for our needs
- Good middleware support for JWT validation, rate limiting, and CORS
- Well documented and widely used


**What we considered:**

- **Fastify** - Faster but less mature ecosystem
- **NestJS** - More structured but adds unnecessary complexity


---


### JWT


**Purpose:** Authentication tokens.


**Why we chose it:**

- Stateless, which works well with serverless architecture
- Integrates with Cognito
- Standard format that works with any OAuth2 client


**What we considered:**

- **Session-based auth** - Requires server-side storage, not suitable for serverless



---



### Helmet


**Purpose:** Security headers.


**Why we chose it:**

- Adds security headers with minimal configuration
- Protects against common web vulnerabilities


**What we considered:**

- **Custom headers** - Would take more time to implement correctly



---



### express-rate-limit


**Purpose:** API rate limiting.


**Why we chose it:**

- Prevents brute-force attacks
- Easy to configure
- Works with Express


**What we considered:**

- **API Gateway throttling** - Already used, but this adds an extra layer



---



### pg


**Purpose:** PostgreSQL client.


**Why we chose it:**

- Connection pooling reduces latency for repeated queries
- Works with TimescaleDB extensions
- Lightweight and direct SQL control


**What we considered:**

- **Sequelize** - Adds ORM overhead for our use case
- **TypeORM** - More complex and slower



---



### serverless-http


**Purpose:** Express to Lambda wrapper.


**Why we chose it:**

- Runs Express on Lambda without code changes
- Keeps the code consistent between local and cloud environments


**What we considered:**

- **Custom Lambda handler** - Would require rewriting the entire API



---



## Database


### PostgreSQL


**Purpose:** Relational database.


**Why we chose it:**

- Supports TimescaleDB extension for time-series data
- ACID compliant for vehicle and user data
- Good performance for complex queries


**What we considered:**

- **MySQL** - Doesn't support TimescaleDB as well



---



### TimescaleDB


**Purpose:** Time-series extension.


**Why we chose it:**

- Keeps relational and time-series data in one database
- Continuous aggregates make dashboard queries fast
- Full SQL support



**What we considered:**

- **InfluxDB** - Better for pure time-series but less SQL support
- **Amazon Timestream** - Fully managed but less flexible



---



### PgBouncer


**Purpose:** Connection pooling.


**Why we chose it:**

- Handles many connections without putting load on the database
- Lightweight and easy to configure


**What we considered:**

- **RDS Proxy** - AWS managed but more expensive


---



## Cloud Infrastructure (AWS)


### Kinesis


**Purpose:** Real-time telemetry ingestion.


**Why we chose it:**

- Handles streaming data well
- Integrates with Lambda natively
- At-least-once delivery


**What we considered:**
- **Kafka** - More powerful but requires more setup and management


---


### Lambda


**Purpose:** Serverless processing.


**Why we chose it:**

- Scales automatically
- Pay only for what you use
- No server management


**What we considered:**

- **EC2** - More control but requires server management and always-on costs



---



### API Gateway



**Purpose:** HTTP routing and JWT validation.


**Why we chose it:**

- Built-in JWT validation with Cognito
- Rate limiting and throttling
- Managed API with CloudWatch integration


**What we considered:**

- **Custom Express server** - Would require managing servers and scaling



---



### Cognito


**Purpose:** User authentication.


**Why we chose it:**

- Managed user auth with JWT tokens
- Integrates with API Gateway
- Supports MFA and role-based access


**What we considered:**

- **Auth0** - Third-party service, more expensive
- **Firebase Auth** - Different ecosystem, less AWS integration



---



### EC2


**Purpose:** Database hosting.



**Why we chose it:**

- Full control over database configuration
- Allows installing TimescaleDB extensions
- Predictable cost for steady workloads



**What we considered:**

- **RDS** - Managed but doesn't support TimescaleDB as well



---



### S3



**Purpose:** Data archive.


**Why we chose it:**

- Cheap storage with 11 nines durability
- Automatic lifecycle policies
- Integrates with other AWS services



**What we considered:**

- **EBS** - More expensive for long-term storage



---



### CloudWatch


**Purpose:** Logging and monitoring.


**Why we chose it:**

- Native integration with Lambda, API Gateway, and EC2
- Logs and metrics in one place
- Alerts for anomalies



**What we considered:**


- **DataDog** - More features but expensive
- **Prometheus** - Open-source but requires setup



---



## DevOps and Testing


### Docker


**Purpose:** Local development.


**Why we chose it:**

- Works the same on every machine
- No "works on my machine" issues
- Easy for new developers to set up


**What we considered:**

- **Podman** - Similar but less mature ecosystem



---



### GitHub Actions


**Purpose:** CI/CD pipeline.


**Why we chose it:**

- Runs tests on every pull request automatically
- Built into GitHub
- Free for public repositories


**What we considered:**

- **Jenkins** - More powerful but requires setup and maintenance
- **CircleCI** - Paid for private repos



---



### Jest


**Purpose:** Testing.



**Why we chose it:**

- Works for both frontend and backend
- Built-in coverage reports
- Fast parallel test execution



**What we considered:**
- **Mocha** - More flexible but requires more setup
- **Vitest** - Newer but less mature ecosystem



---



### Supertest



**Purpose:** API testing.


**Why we chose it:**

- Simulates HTTP requests without a real server
- Works with Express
- Good for testing API endpoints


**What we considered:**

- **Postman** - Manual testing tool, not suitable for CI/CD



---



### Codecov


**Purpose:** Coverage tracking.



**Why we chose it:**

- Shows coverage trends over time
- Blocks PRs if coverage drops below 80%
- Integrated with GitHub


**What we considered:**

- **Coveralls** - Similar but less integration with GitHub Actions



---



### Cypress


**Purpose:** End-to-end testing.


**Why we chose it:**

- Tests real user flows in a browser
- Faster and easier than Selenium
- Good debugging tools


**What we considered:**

- **Selenium** - Slower and harder to set up
- **Playwright** - Newer but less mature ecosystem



---



## Architecture Patterns


### Event-Driven Architecture


**Where:** Kinesis + Lambda for telemetry ingestion.



**Why we chose it:**

- Keeps vehicles decoupled from the backend
- Handles variable telemetry loads
- Easy to add new consumers later


**What we considered:**

- **Polling** - Less efficient and more latency



---



### Medallion Architecture



**Where:** Bronze → Silver → Gold in TimescaleDB.


**Why we chose it:**

- Keeps raw, clean, and aggregated data separate
- Makes dashboard queries faster
- Preserves raw data for auditing



**What we considered:**

- **Single table** - Would get too large and slow



---



### Client-Server Architecture


**Where:** React frontend + Express API.


**Why we chose it:**

- Frontend and backend can be developed independently
- Clear separation of responsibilities
- Easy to manage and deploy


**What we considered:**

- **Microservices** - Adds unnecessary complexity for our scale
- **Monolithic** - Less flexible for independent development



---
