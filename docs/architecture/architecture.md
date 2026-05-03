# System Architecture

## Overview
The Vehicle Analytics Platform uses a serverless AWS architecture.

## Components
- Frontend: React.js with Mapbox GL
- API Layer: AWS API Gateway + Lambda
- Data Ingestion: AWS Kinesis
- Processing: AWS Lambda
- Storage: S3 + PostgreSQL/TimescaleDB
- Authentication: JWT/AWS Cognito

## Data Flow
1. Vehicle telemetry -> Kinesis stream
2. Lambda processing -> safety scoring
3. Data stored in TimescaleDB and S3
4. Frontend queries via REST API
