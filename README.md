# Vehicle Analytics Platform - Fleet Telemetry & Driver Safety

[![CI Pipeline](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/actions/workflows/ci.yml)
[![Coverage](https://coveralls.io/repos/github/COS301-SE-2026/Vehicle-Analytics-Platform/badge.svg)](https://coveralls.io/github/COS301-SE-2026/Vehicle-Analytics-Platform)
[![Open Issues](https://img.shields.io/github/issues/COS301-SE-2026/Vehicle-Analytics-Platform)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/issues)
[![Closed Issues](https://img.shields.io/github/issues-closed/COS301-SE-2026/Vehicle-Analytics-Platform)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/issues?q=is%3Aissue+is%3Aclosed)

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
| Name | Cloud/DevOps/DB Lead | [LinkedIn](link) |
| Name | Frontend/UX Lead | [LinkedIn](link) |
| Name | Data Viz/Geospatial Lead | [LinkedIn](link) |
| Name | Backend/API Lead | [LinkedIn](link) |
| Name | Data/Real-Time Lead | [LinkedIn](link) |




