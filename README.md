# Vehicle Analytics Platform - Fleet Telemetry & Driver Safety

## Demo Videos
- Demo 1 Video

## Table of Contents
- Project Badges
- Setup Guide
- Developer Guide & Architecture

## Project Badges

[![CI Pipeline](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/actions/workflows/ci.yml)
[![Coverage](https://coveralls.io/repos/github/COS301-SE-2026/Vehicle-Analytics-Platform/badge.svg)](https://coveralls.io/github/COS301-SE-2026/Vehicle-Analytics-Platform)
[![Open Issues](https://img.shields.io/github/issues/COS301-SE-2026/Vehicle-Analytics-Platform)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/issues)
[![Closed Issues](https://img.shields.io/github/issues-closed/COS301-SE-2026/Vehicle-Analytics-Platform)](https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform/issues?q=is%3Aissue+is%3Aclosed)

### Technology Stack

**Frontend:** React.js, Mapbox GL JS, Recharts, D3.js
**Data Pipeline:** AWS Kinesis Data Streams, AWS Lambda, Amazon S3
**API Layer:** AWS API Gateway, JWT
**Database:** PostgreSQL, TimescaleDB
**Authentication:** AWS Cognito or JWT
**Infrastructure:** AWS CDK (TypeScript), Docker, Docker Compose
**Testing:** Jest, React Testing Library, Cypress
**CI/CD:** GitHub Actions
**Monitoring:** AWS CloudWatch

## Setup Guide

### Step 1: Install Prerequisites
- Node.js (v20 or higher)
- Docker Desktop (running)
- npm

### Step 2: Clone and Install

git clone https://github.com/COS301-SE-2026/Vehicle-Analytics-Platform.git
cd Vehicle-Analytics-Platform
npm install

### Step 3: Add .env Files

cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

### Step 4: Run the Application

docker-compose up postgres timescaledb -d
npm run dev:backend
npm run dev:frontend

### Shutdown

docker-compose down

## Developer Guide

### Git Strategy
- main - Production
- develop - Integration
- backend - Backend team branch
- frontend - Frontend team branch
- data - Data pipeline team branch
- feature/* - Feature branches

### Feature Workflow

git checkout backend
git pull origin backend
git checkout -b feature/your-feature
git push origin feature/your-feature

## Team Members

| Name | Role | GitHub | LinkedIn |
|------|------|--------|----------|
| Warona Moleboge | Cloud/DB Lead | [@u23770912](https://github.com/u23770912) | [LinkedIn](https://linkedin.com/in/warona-moleboge-6855161b8) |
| Kwanele Phakathi | DevOps Lead | [@Kwanele-P](https://github.com/Kwanele-P) | [LinkedIn](https://linkedin.com/in/kwanele-phakathi-77028b231) |
| Ziphozinhle Maduna | Frontend Lead | [@Ziphoz](https://github.com/Ziphoz) | [LinkedIn](https://linkedin.com/in/ziphozinhle-maduna) |
| Marchant Grootboom | Data Lead | [@Boompie3](https://github.com/Boompie3) | [LinkedIn](https://linkedin.com/in/marchant-grootboom-246513234) |
| Christopher Adolph | Backend Lead | [@Chriscoding19](https://github.com/Chriscoding19) | [LinkedIn](https://linkedin.com/in/christopher-adolph-aa2069402) |

Built for COS 301 Capstone Project 2026 | Fuse IT
