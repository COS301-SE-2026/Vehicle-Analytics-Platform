

# CI/CD Pipeline - V.A.P.O.R.




## Overview



The CI/CD pipeline automates building,testing,and deploying the Vehicle Analytics Platform.Every pull request triggers checks before code can be merged



## Pipeline Flow


![alt text](<Screenshot 2026-07-30 014235.png>)

![alt text](<Screenshot 2026-07-30 014247.png>)

---





## Pipeline Stages



**Lint**


Runs ESLint on backend and frontend code.Catches style issues early.Pipeline stops if linting fails



**Build**


Compiles TypeScript,bundles frontend assets,and packages the Lambda deployment zip.Produces backend_lambda.zip and frontend static files



**Test**


Runs unit tests (Jest),integration tests(Supertest),and E2E tests(Cypress).Requires 80% coverage.Pipeline stops if any tests fail or coverage drops



**Deploy**


Deploys to AWS Lambda.Staging deploys automatically on merge to develop.Production requires manual approval(4 reviews) before deploying to main



---



## Branch Strategy



**main** - Production code.Protected.PR only with 4 approvals



**develop** - Integration branch.Protected.PR only with 4 approvals



**feature/*** - Feature development.PR to develop when ready



---



## Environments



**Development** - Local Docker Compose.No approval needed



**Staging** - AWS Lambda.Auto-deploys when code merges to develop.Used for testing



**Production** - AWS Lambda.Manual approval required (4 reviews).Real user traffic



---



## Quality Gates



- Lint: Zero ESLint errors

- Build: Must compile successfully

- Tests: All passing with 80% coverage

- Code Review: 4 approvals required



---



## Rollback



If deployment fails,rollback to previous Lambda version:



```

aws lambda update-function-code \

  --function-name capstone-analytics-backend \

  --zip-file fileb://previous_lambda.zip \

  --region af-south-1




