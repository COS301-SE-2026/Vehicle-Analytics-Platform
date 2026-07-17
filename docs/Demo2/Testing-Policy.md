# Testing Policy

## Vehicle Analytics Platform - V.A.P.O.R

**Prepared By:** Kilimanjaro StoneCap
**Demo:** Demo 2


---
<!-- ADD TABLE OF CONTENT - WILL BE DONE IN THE  OFFICIAL PDF -->

## 1. Introduction
Vehicle Analytics Platform(V.A.P.O.R) is a system designed to process and display vehicle telemetry data, providing real-time insights through a dashboard. It receives data from client sources 
using AWS Lambda functions, processes the data, stores it neatly, and then brings it to life with an interactive interface - including a map view powered by MapBox.

This document outlines the testing policy for V.A.P.O.R. It covers the tools the team uses, the methods they follow, and the steps to ensure that the platform performs efficiently and fulfills the quality criteria during development.
The objective is to assist the team in writing, running and maintaining tests for the entire system - and make sure every team member understands how and why specific testing decisions take place.


## 1.1 Purpose

Testing is carried out to: 
- Identify bugs early before they cause problems.
- Ensure new features don't break existing features
- Maintain system speed and reliability
- Ensure the dashboards display accurate data.



---

## 2. Scope / Out of Scope

**2.1 Scope**

This policy covers testing of the V.A.P.O.R application, including the frontend, backend, database layer, and the AWS Lambda functions used to process incoming
vehicle telemetry data.

**2.2 Out of Scope**

This policy does not cover the internal reliability of third-party services consumed by the platform, including the MapBox mapping service
and the client's telemetry data source. These are treated as external dependencies. Testing focuses on ensuring V.A.P.O.R correctly integrates with and processes
the data received from them, not validating the third-party services themselves. 

---

## 3. Testing Methodology and Approach 

Testing for V.A.P.O.R follows an Agile Methodology, with testing activities integrated into every sprint rather than treated as a separate phase
at the end of development. As new features and requirements were incrementally added throughout the project, each sprint's additions are tested as they are built, allowing defects to be identified and resolved early
rather than accumulating across a larger, more complex system.

This approach is reflected in the project's continuos integration pipeline(see Section 7), 
where automated test run on every pull request, and in the layered test levels(unit, integration, and 
end-to-end) described in section 5, which together support fast, frequent feedback throughout each sprint cycle.


## 4. Testing Tools

- **Jest**: unit and integration tests for backend and frontend.
-> Jest supports both frontend and backend testing within a single framework, offering fast execution and reliable results

- **React Testing Library**: testing React components.
-> React tests components in a way that reflects how users usually interact with them

- **Supertest**: testing API endpoints.
-> Supertest allows HTTP requests to be simulated without requiring a live server

- **Cypress**: end-to-end testing of user workflows.
-> Cypress validates complete user workflow within a real browser environment

- **Codecov**: tracking test coverage.
-> Codecov identifies which parts of the codebase require additional test coverage

- **GitHub Actions**: running tests automatically on every pull request.
-> GitHub Actions automates test execution on every pull request


---



## 5. Testing Levels

**5.1 Unit testing**

Tests individual functions and components in isolation.

What the platform tests:
- Backend: controllers, middleware, utility functions.
- Frontend: React components, helper functions, state management.
- Database: Migration functions, query helpers.
- Lambda: Event processing functions.

How the platform tests:
- Mock external dependencies like databases and APIs.
- Cover normal cases, edge cases and error handling.
- Tests run automatically on every pull request.

Coverage Target: 80% across the codebase.


**5.2 Integration Testing**

Tests how different parts of the system work together.

What the platform tests:
- API endpoints return correct responses with proper status codes.
- Database queries work correctly.
- Authentication and authorization work properly.
- Error handling returns meaningful messages.
- Lambda functions process events correctly.


How the platform tests:
- Supertest simulates HTTP requests.
- Tests are connected to a real database.
- Each test is responsible for cleaning up its own data after execution.

Example:

``` js
test('should return JWT for valid credentials', async () => {

    const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@example.com', password: 'Test123!'});


    expect(response.status).toBe(200);

    expect(response.body.data).toHaveProperty('idToken');

});

```


**5.3 End-To-End Testing**

Tests complete user workflows from start to finish.

What the platform tests:
- Login flow.
- Dashboard loading.
- Vehicle map display.
- Alert viewing.
- Admin user management.

How the platform tests:
- Cypress simulates real browser interactions.
- Tests run against the deployed staging environment.


---



## 6. Non-Functional Testing

**6.1 Performance Testing**

- API response times.
- Dashboard load times.
- Map update speed.


**6.2 Security Testing**

- JWT authentication works correctly.
- Role-based access control prevents unauthorized access.
- Rate limiting prevents abuse.
- Data is encrypted in transit and at rest.

**6.3 Reliability Testing**

- System recovers from failure.
- No data loss.
- Auto-retry works as expected.



---



## 7. Test Automation

**7.1 CI/CD Pipeline (GitHub Actions)**

Every pull request triggers:

1. Install - dependencies for backend and frontend.
2. Lint - code style check.
3. Unit tests - Jest on backend and frontend.
4. Integration Tests - API endpoints.
5. Build - frontend and backend.
6. E2E Tests - Cypress (where applicable).


Rules:

- A PR cannot be merged if any tests fail.
- Coverage must not drop below 80%.

**7.2 Local Development Testing**

```bash
# Backend
cd backend
npm test
npm test -- --coverage
npm run lint

# Frontend
cd frontend
npm test
npm test -- --coverage
npm run lint

# Database
cd database
npm test

```


**7.3 Coverage Tracking**

Current coverage via Codecov:
- Backend: 97.95% (target 80%+).
- Frontend: 86% (target 80%+).
- Database: 85%+ (target 80%+).


---



## 8. Test Data Management

- Development: local test database with seed data.
- Staging:  deployed test database.
- Production: real data is used, with read-only access granted for testing purposes.

Each test creates its own data and cleans up after itself to prevent interference.


---


## 9. Defect Management

- **Critical** (system crash, data loss) - Fix immediately and block deployment.
- **High** (major feature broken) - Fix within 24 hours.
- **Medium** (non-critical feature broken) - Fix within the current sprint.
- **Low** (cosmetic issue) - Fix when time permits.



---



## 10. Quality Gates

Before code can be merged:

- All tests pass - no failing tests in CI.
- Coverage - 80%+ test coverage.
- Code review - minimum 4 approvals.
- Linting - zero ESLint errors.
- Build - must succeed.

---

## 11. Entry/Exit criteria

**11.1 Entry criteria**

Testing for a feature begins once the relevant code is functionally complete and a pull request
has been opened against the test branch. Automated tests and coverage checks (via GitHub Actions and Codecov)
must pass before the pull request can be merged, meaning testing occurs as a precondition for merging rather than after it.

**11.2 Exit criteria**

Testing for a sprint or release is considered complete when all planned test
cases have been executed, no critical or high-severity defects remain unresolved, and 
code coverage meets the 80% target across the increment.

---


## 12. Contribution Workflow

1. Create a feature branch from 'develop'.
2. Write code and tests.
3. Run tests locally.
4. Create a pull request.
5. CI runs all tests automatically.
6. 4 approvals required.
7. Merge to 'develop'


---


## Document Approval

- Backend and Testing - Christoper Adolph - July 2026.
- Frontend and Integration - Kwanele Phakathi - July 2026.
- Cloud and Data Eng - Warona Moleboge - July 2026.
- Frontend and UX - Ziphozinhle Maduna - July 2026.
- Data Eng and Integration - Marchant Grootboom - July 2026.






