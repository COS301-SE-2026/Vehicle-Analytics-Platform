# Vehicle Analytics Platform - Fleet Telemetry & Driver Safety

<!-- Build & Coverage -->
[![CI Pipeline](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/actions/workflows/ci_pipeline.yml/badge.svg)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/actions/workflows/ci_pipeline.yml)
[![Coverage](https://codecov.io/gh/COS301-SE-2026/Vehicle-Analytics-Platform/badge.svg)](https://codecov.io/gh/COS301-SE-2026/Vehicle-Analytics-Platform)

<!-- Issues -->
[![Open Issues](https://img.shields.io/github/issues/COS301-SE-2026/Vehicle-Analytics-Platform)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/issues)
[![Closed Issues](https://img.shields.io/github/issues-closed/COS301-SE-2026/Vehicle-Analytics-Platform)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/issues?q=is%3Aissue+is%3Aclosed)

<!-- Requirements -->
[![Node](https://img.shields.io/badge/node-v20-green)](https://nodejs.org)

<!-- Monitoring -->
[![Uptime](https://uptime.betterstack.com/status-badges/v1/monitor/2kyk4.svg)](https://uptime.betterstack.com/?utm_source=status_badge)

---

## Table of Contents
- [Demo Videos](#demo-videos)
- [Technology Stack](#technology-stack)
- [Setup Guide](#setup-guide)
- [Developer Guide](#developer-guide)
- [Team Members](#team-members)

---

## Demo Videos

| Demo | Link |
|------|------|
| Demo 1 | [Watch Video](#) |

---

## Technology Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | React.js, Mapbox GL JS, Recharts, D3.js |
| **Data Pipeline** | AWS Kinesis Data Streams, AWS Lambda, Amazon S3 |
| **API Layer** | AWS API Gateway, JWT |
| **Database** | PostgreSQL, TimescaleDB |
| **Authentication** | AWS Cognito or JWT |
| **Infrastructure** | AWS CDK (TypeScript), Docker, Docker Compose |
| **Testing** | Jest, React Testing Library, Cypress |
| **CI/CD** | GitHub Actions |
| **Monitoring** | AWS CloudWatch |

---

## Setup Guide

### Step 1: Install Prerequisites
- Node.js (v20 or higher)
- Docker Desktop (running)
- npm

### Step 2: Clone and Install

```bash
git clone https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform.git
cd Vehicle-Analytics-Platform
npm install
```


### Step 3: Add .env Files
```bash
cp .env.example .env
```

### Step 4: Run the Application
```bash
docker-compose up -d
npm run dev
```

### Shutdown
```bash
docker-compose down
```

## Developer Guide

### Git Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production - stable, release-ready code |
| `develop` | Integration - latest development changes |
| `feature/*` | Feature branches - branch from develop, merge back to develop |

**Note:** All development work is done on `feature/*` branches. No direct commits to `main` or `develop`.

---

### Feature Workflow

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Commit changes
git add .
git commit -m "feat: description of your feature"

# 4. Push to remote
git push origin feature/your-feature-name

# 5. Create Pull Request from feature/* to develop

# 6. After approval, merge to develop

# 7. Release: Create PR from develop to main
```

## Team Members

| Name | Role | LinkedIn |
|------|------|----------|
| Christopher Adolph | Backend/API | [LinkedIn](link) |
| Zipho Maduna | Frontend/UX | [LinkedIn](link) |
| Warona Moleboge | Data Engineer  | [LinkedIn](link) |
| Kwanele Phakathi | Fullstack | [LinkedIn](link) |
| Marchant Grootboom | Data Engineer| [LinkedIn](link) |


## Project Structure
```plaintext
.
├── backend
│   ├── __mocks__
│   ├── __tests__
│   ├── src
│   │   ├── controllers
│   │   ├── db
│   │   ├── middleware
│   │   ├── routes
│   │   └── utils
│   └── tests
├── database
│   ├── __tests__
│   └── migrations
├── docs
│   ├── api
│   ├── architecture
│   ├── design
│   ├── meeting-minutes
│   └── srs
│       └── images
├── frontend
│   ├── public
│   └── src
│       ├── __tests__
│       ├── assets
│       ├── components
│       │   ├── auth
│       │   ├── dashboard
│       │   ├── layout
│       │   ├── map
│       │   ├── shared
│       │   └── ui
│       ├── hooks
│       ├── pages
│       │   ├── auth
│       │   ├── dashboard
│       │   │   └── lib
│       │   ├── map
│       │   └── settings
│       ├── services
│       └── store
└── lambdas
    └── kinesis_telemetry_ingestion
        └── tests
```
