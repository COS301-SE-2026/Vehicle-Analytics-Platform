# Service Contracts - V.A.P.O.R.


**Prepared By:** Kilimanjaro StoneCap
**Demo:** Demo 4
**Date:** September 2026


## Overview


This document defines the API service contracts for the V.A.P.O.R. platform. These contracts serve as the formal agreement between the frontend and backend teams, specifying exact endpoint definitions, request and response schemas, and error handling behaviour.


**Contract File:** `docs/Demo3/api/openapi.yaml`


## Contract Philosophy


### Design-First Approach


All API contracts were designed before implementation. This ensures:


* Frontend and backend teams can work in parallel
* Clear expectations for both sides
* No integration surprises at the last minute


### Single Source of Truth


The OpenAPI specification (`openapi.yaml`) is the authoritative source for all API interactions. Any changes require team agreement.


## Contract Format


* **Specification:** OpenAPI 3.0.3
* **Format:** YAML
* **Location:** `docs/Demo3/api/openapi.yaml`


## Available Endpoints

* **Authentication:** `/auth/register`, `/auth/login`, `/auth/logout`
* **Admin:** `/admin/users`, `/admin/users/{userId}/role`, `/admin/users/{userId}`
* **Vehicles:** `/vehicles`, `/vehicles/locations`, `/vehicles/{vehicleId}`, `/vehicles/{vehicleId}/trips`
* **Dashboard:** `/dashboard/kpis`, `/dashboard/alerts`, `/dashboard/activity`, `/dashboard/total-distance`, `/dashboard/stats`
* **Safety:** `/safety/scores`, `/safety/scores/{vehicleId}`, `/safety/trend/{vehicleId}`
* **Trips:** `/trips/history/{vehicleId}`, `/trips/replay/{tripId}`
* **Fleet Analytics:** `/fleet/analytics`, `/fleet/vehicle/{vehicleId}/scores`
* **Geofences:** CRUD, GeoJSON, events and discovery endpoints
* **Fuel Efficiency:** `/fuel/vehicle/{vehicleId}/history`, `/fuel/vehicle/{vehicleId}/trend`, `/fuel/fleet/history`, `/fuel/vehicle/{vehicleId}/calculate`
* **Fleet Groups:** CRUD, assignments, vehicles and leaderboard
* **Custom Alerts:** Rules, triggered alerts, acknowledge and resolve
* **Alert Backtesting:** `/custom-alerts/backtest`
* **Reports:** `/reports/scopes`, `/reports/generate`, `/reports/weather`
* **Predictive Risk:** `/risk/fleet`, `/risk/vehicle/{id}`, `/risk/vehicle/{id}/coaching`, `/risk/vehicle/{id}/similar`, `/risk/notifications`, `/risk/run`
* **System:** `/health`


## Authentication


**Method:** Bearer JWT Token (AWS Cognito)


**Header:**


Authorization: Bearer <idToken>
```


### Role-Based Access Control


* **Admin:** Full access to all endpoints, including predictive risk across all vehicles
* **Fleet Manager:** Access to all non-admin endpoints, scoped to assigned fleet groups
* **Viewer:** Read-only access, scoped to assigned fleet groups

## Response Standards

### Success Response


{
  "success": true,
  "data": {},
  "timestamp": "2026-09-03T10:00:00.000Z"
}

```

### Error Response



{
  "success": false,
  "error": "Human-readable message",
  "timestamp": "2026-09-03T10:00:00.000Z"
}
```

### HTTP Status Codes

* `200` Success
* `201` Created
* `400` Bad Request
* `401` Unauthorized
* `403` Forbidden
* `404` Not Found
* `409` Conflict
* `429` Too Many Requests
* `500` Internal Server Error
* `503` Service Unavailable

## Versioning Strategy

**Current Version:** `v1.0.0`

* Breaking changes require a new version
* All versions are maintained for backward compatibility
* Version is indicated by the stage in the URL, such as `/prod/` and `/staging/`

## Contract Maintenance

### Change Process

1. Propose the change in a team meeting
2. Update the OpenAPI specification
3. Get team approval with a minimum of 4 approvals
4. Update both frontend and backend
5. Test integration before merging

### Breaking Changes

Breaking changes require:

* New version number
* Deprecation notice
* Migration guide for consumers

## Tools

* **Swagger UI:** Interactive API documentation
* **OpenAPI Generator:** Client SDK generation
* **Postman:** API testing and validation

## Related Documentation

* **OpenAPI Specification:** `docs/Demo3/api/openapi.yaml`
* **SAS - Service Contracts:** Section 3.1.2
* **API Reference:** `docs/Demo3/api/service-contracts.md`

# Predictive Risk Engine (Wow Factor)

The predictive risk engine is the platform's flagship machine learning feature. It forecasts which vehicles are likely to have an unsafe day tomorrow using logistic regression trained on 90 days of historical telemetry.

Every score is explainable. The top 3 contributing factors are computed exactly as the absolute value of coefficient times z-score, not approximated with SHAP.

When a vehicle is flagged HIGH or CRITICAL, the system writes a coaching recommendation and measures whether it actually reduced risk seven days later.

This section documents the six endpoints that power the feature. All endpoints are scoped to the caller's assigned fleet groups. A fleet manager sees only vehicles in their groups, while an admin sees every vehicle.

## GET /api/risk/fleet

Returns the current risk predictions for every vehicle in the caller's scope. Used by the Fleet Risk page to render the triage table and the RiskBadge column.

### Authentication and Access

* **Header:** `Authorization: Bearer <token>`
* **Roles:** `admin`, `fleet_manager`, `viewer`
* **Scope:** Filtered by the caller's `fleet_manager_assignments` unless the caller is an admin

### Path Parameters

None.

### Query Parameters

* **`tier`**: Optional string. Filters by `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`
* **`fleet_group_id`**: Optional integer. Filters to a specific fleet group the caller is assigned to

### Response 200 OK

* **`data.prediction_date`**: String in `YYYY-MM-DD` format. The date the predictions are for
* **`data.vehicles`**: Array containing one entry per vehicle in scope
* **`data.vehicles[].vehicle_id`**: String containing the vehicle identifier
* **`data.vehicles[].risk_score`**: Number from 0 to 100
* **`data.vehicles[].risk_tier`**: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`
* **`data.vehicles[].top_factors`**: Array containing the top 3 contributing factors. Each factor contains `feature`, `label`, `weight`, and `contribution`

### Example Response


{
  "success": true,
  "data": {
    "prediction_date": "2026-09-29",
    "vehicles": [
      {
        "vehicle_id": "1015",
        "risk_score": 91.47,
        "risk_tier": "CRITICAL",
        "top_factors": [
          {
            "feature": "harsh_events_per_trip",
            "label": "Frequent harsh events",
            "weight": 0.82,
            "contribution": 0.54
          },
          {
            "feature": "avg_safety_score",
            "label": "Low recent safety score",
            "weight": -0.61,
            "contribution": 0.32
          },
          {
            "feature": "days_since_last_trip",
            "label": "Long idle period",
            "weight": 0.18,
            "contribution": 0.09
          }
        ]
      }
    ]
  },
  "timestamp": "2026-09-29T10:15:00.000Z"
}
```

## GET /api/risk/vehicle/{id}

Returns the full predictive risk profile for a single vehicle. This includes the latest score, the 30 day trend, the feature snapshot used by the model, and the top contributing factors.

### Authentication and Access

* **Header:** `Authorization: Bearer <token>`
* **Roles:** `admin`, `fleet_manager`, `viewer`
* **Scope:** Caller must have access to the vehicle's fleet group

### Path Parameters

* **`id`**: String containing the vehicle ID

### Response 200 OK

* **`data.vehicle_id`**: String containing the vehicle ID
* **`data.latest`**: Object containing the most recent prediction
* **`data.latest.risk_score`**: Number from 0 to 100
* **`data.latest.risk_tier`**: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`
* **`data.latest.top_factors`**: Array containing the top 3 contributing factors
* **`data.latest.features`**: Object containing the standardised feature values used by the model
* **`data.trend`**: Array containing up to 30 days of historical predictions

### Errors

* `403`: Vehicle is outside the caller's fleet groups
* `404`: Vehicle does not exist

## GET /api/risk/vehicle/{id}/similar

Returns vehicles with the most similar risk feature profiles to the given vehicle. It uses the standardised feature vector as the distance metric. This endpoint is used by the Similar Vehicles panel on the Predictive Risk tab.

### Path Parameters

* **`id`**: String containing the vehicle ID

### Response 200 OK

* **`data.vehicle_id`**: Source vehicle
* **`data.similar`**: Array containing up to 5 nearest neighbours. Each entry contains `vehicle_id`, `distance`, and `risk_tier`

## GET /api/risk/vehicle/{id}/coaching

Returns the coaching history for a vehicle. This includes every intervention written by the risk engine, its outcome where measurable, and the overall effectiveness rate.

### Response 200 OK

* **`data.vehicle_id`**: Vehicle ID
* **`data.effectiveness_rate`**: Number or null. Percentage of measured interventions that reduced risk, or null if none have been measured
* **`data.interventions`**: Array of coaching interventions, most recent first
* **`data.interventions[].date`**: Date the intervention was created in `YYYY-MM-DD` format
* **`data.interventions[].reason`**: Top feature that triggered the intervention
* **`data.interventions[].recommendation`**: Coaching text shown to the fleet manager
* **`data.interventions[].outcome`**: `risk_fell`, `risk_rose`, `risk_unchanged`, or null when pending
* **`data.interventions[].delta`**: Change in risk score from before to after the intervention

### Notes

* Interventions less than 7 days old have `outcome: null` and the UI renders "Outcome pending"
* Interventions missing pre or post data are flagged for manual review and excluded from the effectiveness rate

## GET /api/risk/notifications

Returns HIGH and CRITICAL risk alerts for the caller's fleet groups. These are polled by the frontend NotificationBell feed alongside the existing custom alert notifications.

### Query Parameters

* **`since`**: Optional ISO 8601 string. Only returns notifications created after this timestamp

### Response 200 OK

* **`data.notifications`**: Risk notifications, most recent first
* **`data.notifications[].vehicle_id`**: Vehicle that was flagged
* **`data.notifications[].risk_tier`**: `HIGH` or `CRITICAL`
* **`data.notifications[].risk_score`**: Score at the time of the notification
* **`data.notifications[].message`**: Human-readable alert text
* **`data.checked_at`**: Server timestamp for the poll

## POST /api/risk/run

Triggers a manual recalculation of risk predictions outside the scheduled 03:00 SAST run. This is useful after retraining the model, applying a schema migration, or before a demo.

### Authentication and Access

* **Header:** `Authorization: Bearer <token>`
* **Roles:** `admin` only
* **Scope:** Scores every vehicle in the fleet

### Request Body

None.

### Response 200 OK

* **`data.scored`**: Number of vehicles scored in the run
* **`data.alerts`**: Number of HIGH or CRITICAL alerts generated
* **`data.duration_ms`**: Total run time in milliseconds

### Errors

* `403`: Caller is not an admin
* `409`: A prediction run is already in progress
* `500`: No trained model exists in `risk_model_weights`

# Alert Rule Backtest API

Estimates how often a custom alert rule would have fired over a past period, before the rule is saved. It powers the Impact Simulation panel in the Create and Edit Custom Alert modal.

The endpoint is read-only. It never creates rules or alerts.

## POST /api/custom-alerts/backtest

### Authentication and Access

* **Header:** `Authorization: Bearer <token>`
* **Roles:** `fleet_manager` or `manager`. Admins are not allowed on `/api/custom-alerts/*`
* **Scope:** The caller must be assigned to `fleet_group_id` in `fleet_manager_assignments`

### Request Body

`Content-Type: application/json`

* **`condition_type`**: Required string. One of:

  * `speed_threshold`
  * `time_based_restriction`
  * `repeated_unsafe_events`
  * `safety_score_drop`
  * `trip_duration_exceeded`
* **`condition_params`**: Required object. Shape depends on `condition_type`
* **`fleet_group_id`**: Required integer. Fleet group to simulate the rule against
* **`days`**: Optional integer. Must be `7`, `30`, or `90`. Defaults to `30`

### Response 200 OK

* **`data.total_alerts`**: Estimated number of alerts in the window after debouncing
* **`data.vehicles_affected`**: Number of distinct vehicles with at least one alert
* **`data.days`**: Window length used
* **`data.by_day`**: One entry per day in the window, including days with zero alerts
* **`data.samples`**: Up to 50 example breaches, most severe first

### Error Status Codes

* `400`: Validation failed
* `401`: Missing, invalid, or expired token
* `403`: Role is not `fleet_manager` or `manager`, or caller is not assigned to the fleet group
* `500`: Unexpected server error
* `503`: Authentication service temporarily unavailable

# Weather and Area Report API

Generates the Weather and areas report. It provides event rates for a scope of vehicles, how they change in rain, and which areas and vehicles differ from the fleet.

## POST /api/reports/weather

### Authentication and Access

* **Header:** `Authorization: Bearer <Cognito access token>`
* **Roles:** `admin`, `fleet_manager`. Viewers are refused
* **Content type:** `application/json`

### Request Body

Every field is optional. Each can be sent in snake_case or camelCase.

* **`scope_type`**: String. Default is `"fleet"`. Values are `"fleet"`, `"group"`, or `"vehicle"`
* **`scope_id`**: String or integer. Default is `null`. Required for `group` and `vehicle`. Omit for `fleet`
* **`days`**: Integer. Default is `7`. Must be a whole number from 1 to 7
* **`end_date`**: String. Default is the date of the newest telemetry. Format is `YYYY-MM-DD`

### Response 200 OK

* **`report`**: Metadata containing `generatedAt`, `scope`, and `requestedBy.role`
* **`period`**: Contains `fromDate`, `toDate`, and `days`
* **`reference`**: The 28 days before the period
* **`method`**: Constants used in the calculation
* **`events`**: Five event types:

  * `harsh_braking`
  * `harsh_acceleration`
  * `harsh_cornering`
  * `over_speeding`
  * `crash_alerts`
* **`warnings`**: Plain-language data quality notes
* **`coverage`**: Object or null describing how much data the report is based on
* **`fleet`**: One entry per event type containing fleet rates and comparison with the reference period
* **`weatherImpact`**: Object or null containing the wet versus dry comparison
* **`daily`**: One entry per day of the period
* **`areas`**: Areas with at least 25 km of driving, largest first, with a maximum of 200
* **`vehicles`**: One entry per vehicle that drove

### Error Status Codes

* `400`: Invalid `days` or `end_date`
* `401`: Missing, invalid, or expired token
* `403`: Role is not admin or fleet manager
* `500`: Unexpected server error

## Document Approval

* **Backend and Testing:** Christopher Adolph, September 2026
* **Frontend and Integration:** Kwanele Phakathi, September 2026
* **Cloud and Data Eng:** Warona Moleboge, September 2026
* **Frontend and UX:** Ziphozinhle Maduna, September 2026
* **Data Eng and Integration:** Marchant Grootboom, September 2026
