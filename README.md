<div align="center">

![V.A.P.O.R. logo](./docs/design/assets/logo.png)

**Kilimanjaro StoneCap &nbsp;·&nbsp; COS301 Capstone 2026 &nbsp;·&nbsp; University of Pretoria**

<!-- Logos -->
<p align="center">
  <img src="./docs/design/assets/KM_logo.png" alt="KM logo" height="80" style="margin-right: 30px;" />
  <img src="./docs/design/assets/FuseIT_logo.png" alt="FUSEIT logo" height="80" style="margin-right: 30px;" />
  <img src="./docs/design/assets/University_of_Pretoria_logo.png" alt="UP logo" height="80" />
</p>


*Built for [FuseIT](https://gofuseit.com) - transforming raw fleet telemetry into proactive safety intelligence.*

<br/>

[![CI Pipeline](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/actions/workflows/ci_pipeline.yml/badge.svg)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/actions)
[![codecov](https://codecov.io/gh/COS301-SE-2026/Vehicle-Analytics-Platform/branch/main/graph/badge.svg)](https://codecov.io/gh/COS301-SE-2026/Vehicle-Analytics-Platform)
[![Issues Open](https://img.shields.io/github/issues/COS301-SE-2026/Vehicle-Analytics-Platform)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/issues)
[![Issues Closed](https://img.shields.io/github/issues-closed/COS301-SE-2026/Vehicle-Analytics-Platform)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/issues?q=is%3Aissue+is%3Aclosed)
[![Node](https://img.shields.io/badge/node-v20-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

---

## Table of Contents

- [Project Description](#project-description)
- [Links](#links)
- [Demo Videos](#demo-videos)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Technology Stack](#technology-stack)
- [Setup Guide](#setup-guide)
- [Developer Guide](#developer-guide)
- [Team Members](#team-members)

---

## Project Description

**Kilimanjaro StoneCap - V.A.P.O.R. (Vehicle Analytics, Processing and Operations in Real-time)**

V.A.P.O.R. is a real-time fleet analytics platform built for FuseIT. It ingests live telemetry data from 50+ vehicles via AWS Kinesis, processes it through serverless Lambda functions, and delivers actionable safety insights to fleet managers through role-based dashboards while detecting speeding, harsh braking, and crash events as they happen.

---

## Links

| Resource | Link |
|---|---|
| <img src="https://cdn.simpleicons.org/googledocs/4285F4" width="14"/> Functional Requirements (SRS) | [View Document](#) |
| <img src="https://cdn.simpleicons.org/github/181717" width="14"/> GitHub Project Board | [View Board](https://github.com/orgs/COS301-SE-2026/projects) |
| <img src="https://cdn.simpleicons.org/gmail/EA4335" width="14"/> Team Email | kilimanjaro.capstone@gmail.com |

---

## Demo Videos

| Demo | Link |
|---|---|
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="14"/> Demo 1 | [Watch Video](#) |

---

## The Problem

Modern fleet operators collect massive amounts of raw vehicle telemetry such as GPS coordinates, speed readings, braking eventsThe problem is how can we take these and turn them into actionable insights? Without real-time analysis, unsafe driver behaviour goes undetected and managers are left reacting to incidents after they happen rather than preventing them.

| <img src="https://cdn.simpleicons.org/googleanalytics/E37400" width="14"/> No Real-Time Insights | <img src="https://cdn.simpleicons.org/statuspage/26A35E" width="14"/> Reactive Management | <img src="https://cdn.simpleicons.org/databricks/FF3621" width="14"/> Underutilised Data |
|---|---|---|
| Raw GPS and speed data provide no actionable intelligence on their own | Safety issues are only addressed after an incident has already occurred | Continuous telemetry streams go unanalysed, wasting valuable operational data |

---

## The Solution

V.A.P.O.R. transforms raw vehicle telemetry into a proactive fleet management platform. By processing live data from AWS Kinesis streams, the platform delivers real-time driver safety scores, interactive fleet maps and analytics dashboards.

<br/>

| Feature | Description |
|---|---|
| **UC01 - User Registration** | Self-registration with email verification, password validation and automatic Viewer role assignment |
| **UC02 - User Login** | Secure login via AWS Cognito with role-based redirect to Admin, Fleet Manager or Viewer dashboard |
| **UC03 - Admin Role Management** | Admins can view all users, promote/demote roles and deactivate accounts |
| **UC04 - Live Vehicle Map** | Real-time interactive map showing 50+ vehicle positions updating every 5–10 seconds via Mapbox GL JS |
| **UC05 - Fleet Dashboard & KPIs** | Live dashboard showing active vehicles, safety scores, alerts today and fleet performance metrics |

---

## Technology Stack

### <img src="https://cdn.simpleicons.org/react/61DAFB" width="16"/> Frontend

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-FF6384?style=for-the-badge&logo=react&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-F9A03C?style=for-the-badge&logo=d3.js&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-000000?style=for-the-badge&logo=react&logoColor=white)

### <img src="https://cdn.simpleicons.org/amazonwebservices/FF9900" width="16"/> Data Pipeline (AWS)

![AWS Kinesis](https://img.shields.io/badge/AWS_Kinesis-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)
![AWS Lambda](https://img.shields.io/badge/AWS_Lambda-FF9900?style=for-the-badge&logo=awslambda&logoColor=white)
![Amazon S3](https://img.shields.io/badge/Amazon_S3-569A31?style=for-the-badge&logo=amazons3&logoColor=white)
![API Gateway](https://img.shields.io/badge/API_Gateway-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)

### <img src="https://cdn.simpleicons.org/postgresql/316192" width="16"/> Database & Auth

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![TimescaleDB](https://img.shields.io/badge/TimescaleDB-FDB515?style=for-the-badge&logo=timescale&logoColor=white)
![AWS Cognito](https://img.shields.io/badge/AWS_Cognito-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

### <img src="https://cdn.simpleicons.org/docker/2496ED" width="16"/> Infrastructure & DevOps

![AWS CDK](https://img.shields.io/badge/AWS_CDK-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![CloudWatch](https://img.shields.io/badge/CloudWatch-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)

### <img src="https://cdn.simpleicons.org/jest/C21325" width="16"/> Testing

![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![Cypress](https://img.shields.io/badge/Cypress-17202C?style=for-the-badge&logo=cypress&logoColor=white)

---

## Setup Guide

### Prerequisites

- Node.js v20 or higher
- npm
- Git

### Step 1 - Clone the Repository

```bash
git clone https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform.git
cd Vehicle-Analytics-Platform
```

### Step 2 - Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 3 - Configure Environment Variables

```bash
cp .env.example .env
```

Fill in `frontend/.env`:

```env
VITE_API_URL=https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

Fill in `backend/.env`:

```env
DB_HOST=your_db_host
DB_PORT=6432
DB_NAME=fleet_analytics
DB_USER=your_db_user
DB_PASSWORD=your_db_password
COGNITO_USER_POOL_ID=your_cognito_user_pool_id
COGNITO_CLIENT_ID=your_cognito_client_id
AWS_REGION=af-south-1
```

### Step 4 - Run the Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`

### Step 5 - Run the Backend (Local Development Only)

```bash
cd backend
npm install
npm run dev
```

## Developer Guide

### Git Strategy

| Branch | Purpose |
|---|---|
| <img src="https://cdn.simpleicons.org/git/F05032" width="14"/> `main` | Production - stable, release-ready code |
| <img src="https://cdn.simpleicons.org/git/F05032" width="14"/> `develop` | Integration - latest development changes |
| <img src="https://cdn.simpleicons.org/git/F05032" width="14"/> `feature/*` | Feature branches - branch from develop, merge back to develop |

> All development work is done on `feature/*` branches. No direct commits to `main` or `develop`.

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
```

### Running Tests

```bash
# Frontend tests
cd frontend && npm run test

# Backend tests
cd backend && npm run test
```

---
 
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
│       │   ├── map
│       │   └── settings
│       ├── services
│       └── store
└── lambdas
    └── kinesis_telemetry_ingestion
        └── tests
```
 
---

## Team Members

<table>
<tr>
<td align="center" width="200">
<br/>
<b>Warona Moleboge</b>
<br/><br/>
<img src="https://cdn.simpleicons.org/amazonaws/FF9900" width="14"/> Cloud / DevOps / DB Lead
<br/><br/>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/warona-moleboge-6855161b8)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/u23770912)

</td>
<td align="center" width="200">
<br/>
<b>Ziphozinhle Maduna</b>
<br/><br/>
<img src="https://cdn.simpleicons.org/react/61DAFB" width="14"/> Frontend / UX Lead
<br/><br/>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ziphozinhle-maduna)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/ZiphoZ)

</td>
<td align="center" width="200">
<br/>
<b>Kwanele Phakathi</b>
<br/><br/>
<img src="https://cdn.simpleicons.org/docker/2496ED" width="14"/> Cloud, DevOps & Infrastructure Lead
<br/><br/>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/kwanele-phakathi-77028b231/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/Kwanele-P)

</td>
<td align="center" width="200">
<br/>
<b>Marchant Grootboom</b>
<br/><br/>
<img src="https://cdn.simpleicons.org/amazonkinesis/FF9900" width="14"/> Data / Real-Time Systems Lead
<br/><br/>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/marchant-grootboom-246513234)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/Boompie3)

</td>
<td align="center" width="200">
<br/>
<b>Christopher Adolph</b>
<br/><br/>
<img src="https://cdn.simpleicons.org/nodedotjs/339933" width="14"/> Backend / API Lead
<br/><br/>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/christopher-adolph-aa2069402/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/Chriscoding19)

</td>
</tr>
</table>

---

<div align="center">

<img src="https://cdn.simpleicons.org/github/181717" width="14"/> Built with dedication by **Kilimanjaro StoneCap** &nbsp;·&nbsp; University of Pretoria &nbsp;·&nbsp; COS301 2026

</div>