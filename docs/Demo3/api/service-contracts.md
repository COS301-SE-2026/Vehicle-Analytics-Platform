
# Service Contracts - V.A.P.O.R.


**Prepared By:** Kilimanjaro StoneCap
**Demo:** Demo 3
**Date:** September 2026


---


## Overview


This document defines the API service contracts for the V.A.P.O.R. platform. These contracts serve as the formal agreement between the frontend and backend teams, specifying exact endpoint definitions, request/response schemas, and error handling behavior.


**Contract File:** `docs/api/openapi.yaml`


---


## Contract Philosophy


### Design-First Approach


All API contracts were designed before implementation. This ensures:


- Frontend and backend teams can work in parallel
- Clear expectations for both sides
- No integration surprises at the last minute


### Single Source of Truth


The OpenAPI specification (`openapi.yaml`) is the authoritative source for all API interactions. Any changes require team agreement.


---


## Contract Format


| | |
|---|---|
| **Specification** | OpenAPI 3.0.3 |
| **Format** | YAML |
| **Location** | `docs/api/openapi.yaml` |


---


## Available Endpoints


| Category | Endpoints |
|---|---|
| Authentication | `/auth/register`, `/auth/login`, `/auth/logout` |
| Admin | `/admin/users`, `/admin/users/{userId}/role`, `/admin/users/{userId}` |
| Vehicles | `/vehicles`, `/vehicles/locations`, `/vehicles/{vehicleId}`, `/vehicles/{vehicleId}/trips` |
| Dashboard | `/dashboard/kpis`, `/dashboard/alerts`, `/dashboard/activity`, `/dashboard/total-distance`, `/dashboard/stats` |
| Safety | `/safety/scores`, `/safety/scores/{vehicleId}`, `/safety/trend/{vehicleId}` |
| Trips | `/trips/history/{vehicleId}`, `/trips/replay/{tripId}` |
| Fleet Analytics | `/fleet/analytics`, `/fleet/vehicle/{vehicleId}/scores` |
| Geofences | CRUD + GeoJSON + events + discovery endpoints |
| Fuel Efficiency | `/fuel/vehicle/{vehicleId}/history`, `/fuel/vehicle/{vehicleId}/trend`, `/fuel/fleet/history`, `/fuel/vehicle/{vehicleId}/calculate` |
| Fleet Groups | CRUD + assignments + vehicles + leaderboard |
| Custom Alerts | Rules + triggered alerts + acknowledge + resolve |
| Reports | `/reports/scopes`, `/reports/generate` |
| System | `/health` |


---


## Authentication


**Method:** Bearer JWT Token (AWS Cognito)


**Header:**


```

Authorization: Bearer <idToken>

```


### Role-Based Access Control


| Role | Permissions |
|---|---|
| Admin | Full access to all endpoints |
| Fleet Manager | Access to all non-admin endpoints |
| Viewer | Read-only access |


---


## Response Standards


### Success Response


```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-09-03T10:00:00.000Z"

}

```


### Error Response


```json
{
  "success": false,
  "error": "Human-readable message",
  "timestamp": "2026-09-03T10:00:00.000Z"
}

```


### HTTP Status Codes


| Code | Description |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |


---


## Versioning Strategy


**Current Version:** v1.0.0


- Breaking changes require a new version
- All versions are maintained for backward compatibility
- Version is indicated by the stage in the URL (`/prod/`, `/staging/`)


---


## Contract Maintenance


### Change Process


1. Propose change in team meeting
2. Update OpenAPI specification
3. Get team approval (minimum 4 approvals)
4. Update both frontend and backend
5. Test integration before merging


### Breaking Changes


Breaking changes require:


- New version number
- Deprecation notice
- Migration guide for consumers


---


## Tools


| Tool | Purpose |
|---|---|
| Swagger UI | Interactive API documentation |
| OpenAPI Generator | Client SDK generation |
| Postman | API testing and validation |


---


## Related Documentation


- **OpenAPI Specification:** `docs/api/openapi.yaml`
- **SAS - Service Contracts:** Section 3.1.2
- **API Reference:** `docs/api/api-contracts.md`


---


## Document Approval


| Role | Name | Date |
|---|---|---|
| Backend and Testing | Christopher Adolph | September 2026 |
| Frontend and Integration | Kwanele Phakathi | September 2026 |
| Cloud and Data Eng | Warona Moleboge | September 2026 |
| Frontend and UX | Ziphozinhle Maduna | September 2026 |
| Data Eng and Integration | Marchant Grootboom | September 2026 |

