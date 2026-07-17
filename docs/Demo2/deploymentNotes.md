# Deployment Notes

## Overview

This deployment diagram illustrates the production deployment diagram of the Vehicle Analytics Platform (V.A.P.O.R.) hosted in the AWS Africa (Cape Town) region (`af-south-1`).

The diagram follows a serverless approach for the frontend, backend API, authentication, and telemetry ingestion while using an Amazon EC2 instance to host the TimescaleDB database.

---

# Deployment Environment

**Environment:** Production

**AWS Region:** af-south-1 (Africa, Cape Town)

The deployed solution consists of the following AWS services:

- Amazon S3 Static Website Hosting
- Amazon API Gateway (REST API)
- AWS Lambda
- Amazon Cognito
- Amazon Kinesis
- Amazon EC2
- TimescaleDB (PostgreSQL)

---

# Deployment Nodes

## User

**Stereotype:** <<device>>

Represents the end user's computer and web browser.

No software artifacts are deployed on the client machine. The browser downloads the frontend application from Amazon S3 and communicates with the backend through Amazon API Gateway.

---

## Amazon S3 Static Website Hosting

**Stereotype:** <<managed service>>

Amazon S3 hosts the production build of the React frontend.

### Artifact

- React Production Build
  - index.html
  - JavaScript bundles
  - CSS bundles
  - Images
  - Fonts
  - Static assets

The frontend is produced using the Vite build process (`npm run build`) and the generated contents of the `dist` directory are uploaded to the S3 bucket.

---

## Amazon API Gateway

**Stereotype:** <<managed service>>

API Gateway provides the public REST API used by the frontend.

It exposes HTTPS endpoints for authentication, dashboard data, fleet management, vehicle information, geofencing, safety analytics, and other backend services.

### Artifact

- REST API Configuration

This includes the deployed resources, methods, integrations, stages, and CORS configuration.

---

## AWS Lambda

**Stereotype:** <<execution environment>>

AWS Lambda hosts the Express.js backend application.

### Artifact

- vehicle_analytics_api

The backend contains the application's routing, controllers, business logic, authentication middleware, and database interaction.

Lambda functions are invoked by Amazon API Gateway whenever a client request is received.

---

## Amazon Cognito

**Stereotype:** <<managed service>>

Amazon Cognito manages user authentication and authorization.

### Artifact

- User Pool

The backend validates JSON Web Tokens (JWTs) against the Cognito User Pool before processing protected API requests.

---

## Amazon EC2

**Stereotype:** <<device>>

Amazon EC2 hosts the relational database used by the platform.

### Artifact

- TimescaleDB
- PostgreSQL

The database stores fleet information, telemetry, users, trips, alerts, geofences, and analytical data.

---

## External Vehicle Hardware

**Stereotype:** <<device>>

Represents vehicle telemetry devices installed within fleet vehicles.

These devices continuously generate telemetry such as GPS location, speed, and other operational measurements.

---

## Amazon Kinesis

**Stereotype:** <<managed service>>

Amazon Kinesis receives telemetry data from vehicle devices.

### Artifact

- capstone-analytics-kinesisstream

The stream buffers incoming telemetry before it is processed by the ingestion Lambda function.

---

## Telemetry Ingestion Lambda

**Stereotype:** <<execution environment>>

AWS Lambda processes telemetry received from Amazon Kinesis.

### Artifact

- kinesis_telemetry_ingestion

This function validates, processes, and inserts telemetry records into the TimescaleDB database.

---

# Communication Paths

## Browser to Amazon S3

Protocol:

- HTTP (Static Website Endpoint)

Purpose:

The browser downloads the React application's static files including HTML, JavaScript, CSS, images, and fonts.

---

## Browser to Amazon API Gateway

Protocol:

- HTTPS (REST API)

Purpose:

After the frontend has loaded, API requests are sent directly to Amazon API Gateway.

Examples include:

- User login
- Dashboard KPIs
- Vehicle locations
- Alerts
- Fleet management

---

## API Gateway to Backend Lambda

API Gateway invokes the backend Lambda function whenever an API endpoint is accessed.

---

## Backend Lambda to Amazon Cognito

Protocol:

- HTTPS

Purpose:

Validate JWT access tokens before allowing access to protected resources.

---

## Backend Lambda to TimescaleDB

Protocol:

- PostgreSQL Wire Protocol (Port 5432)

Purpose:

Execute SQL queries to retrieve and update application data.

---

## Vehicle Hardware to Amazon Kinesis

Protocol:

- HTTPS

Purpose:

Vehicle telemetry devices publish streaming telemetry records to Amazon Kinesis.

---

## Amazon Kinesis to Telemetry Lambda

Communication occurs through an Event Source Mapping.

Whenever new telemetry arrives, AWS automatically invokes the telemetry ingestion Lambda function.

---

## Telemetry Lambda to TimescaleDB

Protocol:

- PostgreSQL Wire Protocol (Port 5432)

Purpose:

Store processed telemetry within the database.

---

# Deployment Rationale

The deployment diagram was designed to provide a scalable and maintainable cloud solution.

The frontend is hosted on Amazon S3 because it is a static React application that does not require a dedicated web server.

Amazon API Gateway provides a secure public interface for the backend services.

AWS Lambda executes backend logic without requiring server management.

Amazon Cognito manages authentication and user identities.

Amazon Kinesis enables scalable ingestion of streaming telemetry from vehicle devices.

Amazon EC2 hosts the TimescaleDB database, which stores both transactional and time series fleet data.

---

# Current Deployment Scope

The current deployment represents the production environment.

The frontend is deployed manually by building the React application and uploading the generated files to Amazon S3.

The backend has been deployed as AWS Lambda functions integrated with Amazon API Gateway.

Continuous Integration and Continuous Deployment (CI/CD) pipelines have not yet been implemented and remain future work.