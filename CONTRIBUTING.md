# Contributing Guide

## Branching Strategy
- main        — production only, merge at demo time
- development — integration branch, all PRs merge here
- feature/task_name — one branch per task, branched from development

## Branch Naming
Use snake_case: feature/db_schema_setup, feature/auth_lambda

## Commit Messages
feat:     new feature
fix:      bug fix
chore:    setup or config
docs:     documentation only
test:     adding or fixing tests
refactor: code change, no new feature

## Pull Request Rules
- Always branch from development
- At least 1 approval required before merging
- Never push directly to main or development
