# Vehicle Analytics Platform - API Reference

> **Base URLs**
> - **Development:** `http://localhost:5000/api`

**Authentication:** All endpoints require a Bearer JWT token except `/auth/register` and `/auth/login`.

---

## Table of Contents

- [1. Authentication Endpoints](#1-authentication-endpoints)
  - [1.1 Register User](#11-register-user-uc01)
  - [1.2 User Login](#12-user-login-uc02)
  - [1.3 Logout](#13-logout-uc02)
- [2. Admin Endpoints](#2-admin-endpoints)
  - [2.1 Get All Users](#21-get-all-users-uc03)
  - [2.2 Update User Role](#22-update-user-role-uc03)
  - [2.3 Deactivate User](#23-deactivate-user-uc03)
- [3. Vehicle Endpoints](#3-vehicle-endpoints)
  - [3.1 Get Live Vehicle Locations](#31-get-live-vehicle-locations-uc04)
  - [3.2 Get Vehicle by ID](#32-get-vehicle-by-id-uc04)
- [4. Dashboard Endpoints](#4-dashboard-endpoints)
  - [4.1 Get Fleet KPIs](#41-get-fleet-kpis-uc06)
  - [4.2 Get Active Alerts](#42-get-active-alerts-uc06)
- [5. Common Error Responses](#5-common-error-responses)
- [6. Endpoint Summary Table](#6-endpoint-summary-table)
- [7. Example cURL Requests](#7-example-curl-requests)

---

## 1. Authentication Endpoints

### 1.1 Register User `(UC01)`

`POST` `/auth/register`

**Auth Required:** No | **Role:** Public

Creates a new user account with **Viewer** role by default.

#### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Validation Rules

| Field | Rule |
|-------|------|
| `name` | Required, min 2 characters, max 100 |
| `email` | Required, valid email format, must be unique |
| `password` | Required, min 8 characters |

#### Responses

| Status | Description | Body |
|--------|-------------|------|
| `201` | Created successfully | `{ "message": "User registered successfully", "userId": 1 }` |
| `400` | Validation error | `{ "error": "Invalid email format" }` |
| `409` | Email already exists | `{ "error": "Email already registered" }` |

---

### 1.2 User Login `(UC02)`

`POST` `/auth/login`

**Auth Required:** No | **Role:** Public

Authenticates a user and returns a JWT token with role.

#### Request Body

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Responses

| Status | Description | Body |
|--------|-------------|------|
| `200` | Login successful | `{ "token": "eyJhbGciOiJIUzI1NiIs...", "role": "viewer", "name": "John Doe" }` |
| `401` | Invalid credentials | `{ "error": "Invalid email or password" }` |
| `403` | Account deactivated | `{ "error": "Account deactivated. Contact administrator." }` |

> **Role Values:** `admin` , `fleet_manager` , `viewer`

---

### 1.3 Logout `(UC02)`

`POST` `/auth/logout`

**Auth Required:** Yes | **Role:** Any authenticated user

Invalidates the user session.

#### Headers

```
Authorization: Bearer <jwt_token>
```

#### Responses

| Status | Description | Body |
|--------|-------------|------|
| `200` | Logout successful | `{ "message": "Logged out successfully" }` |
| `401` | Invalid or missing token | `{ "error": "Unauthorized" }` |

---

## 2. Admin Endpoints

### 2.1 Get All Users `(UC03)`

`GET` `/admin/users`

**Auth Required:** Yes | **Role Required:** `admin`

Retrieves a list of all registered users.

#### Headers

```
Authorization: Bearer <jwt_token>
```

#### Query Parameters _(optional)_

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: `1`) |
| `limit` | integer | Items per page (default: `20`) |

#### Response

```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "viewer",
      "isActive": true
    }
  ],
  "total": 5
}
```

#### Error Responses

| Status | Description | Body |
|--------|-------------|------|
| `401` | Unauthorized | `{ "error": "Authentication required" }` |
| `403` | Forbidden | `{ "error": "Admin access required" }` |

---

### 2.2 Update User Role `(UC03)`

`PATCH` `/admin/users/{userId}/role`

**Auth Required:** Yes | **Role Required:** `admin`

Updates **only** the role of a user (partial update).

#### Headers

```
Authorization: Bearer <jwt_token>
```

#### Request Body

```json
{
  "role": "fleet_manager"
}
```

> **Valid Roles:** `admin` , `fleet_manager` , `viewer`

#### Response

```json
{
  "message": "User role updated successfully",
  "user": {
    "id": 5,
    "name": "John Doe",
    "role": "fleet_manager"
  }
}
```

#### Error Responses

| Status | Description | Body |
|--------|-------------|------|
| `400` | Invalid role | `{ "error": "Invalid role value" }` |
| `403` | Self role change | `{ "error": "Cannot change your own admin role" }` |
| `404` | User not found | `{ "error": "User not found" }` |

---

### 2.3 Deactivate User `(UC03)`

`DELETE` `/admin/users/{userId}`

**Auth Required:** Yes | **Role Required:** `admin`

Deactivates a user account.

#### Headers

```
Authorization: Bearer <jwt_token>
```

#### Response

```json
{
  "message": "User deactivated successfully"
}
```

#### Error Responses

| Status | Description | Body |
|--------|-------------|------|
| `403` | Self deactivation | `{ "error": "Cannot deactivate your own account" }` |
| `404` | User not found | `{ "error": "User not found" }` |

---

## 3. Vehicle Endpoints

### 3.1 Get Live Vehicle Locations `(UC04)`

`GET` `/vehicles/locations`

**Auth Required:** Yes | **Role Required:** `fleet_manager` or `viewer`

Retrieves current positions of all active vehicles for the map. Updates every **5–10 seconds**.

#### Headers

```
Authorization: Bearer <jwt_token>
```

#### Response

```json
{
  "timestamp": "2026-05-03T14:30:05Z",
  "vehicles": [
    {
      "id": "1000",
      "lat": -27.98763,
      "lng": 28.3746649,
      "speed": 65,
      "status": "active"
    },
    {
      "id": "1001",
      "lat": -28.12345,
      "lng": 28.56789,
      "speed": 42,
      "status": "active"
    }
  ]
}
```

#### Error Responses

| Status | Description | Body |
|--------|-------------|------|
| `401` | Unauthorized | `{ "error": "Authentication required" }` |
| `403` | Forbidden | `{ "error": "Insufficient permissions" }` |

---

### 3.2 Get Vehicle by ID `(UC04)`

`GET` `/vehicles/{vehicleId}`

**Auth Required:** Yes | **Role Required:** `fleet_manager` or `viewer`

Retrieves detailed information for a specific vehicle.

#### Headers

```
Authorization: Bearer <jwt_token>
```

#### Response

```json
{
  "id": "1000",
  "deviceId": "CAPSTONE-001",
  "name": "Truck A12",
  "status": "active",
  "currentSpeed": 65,
  "lastLat": -27.98763,
  "lastLng": 28.3746649,
  "lastUpdate": "2026-05-03T14:30:00Z"
}
```

#### Error Responses

| Status | Description | Body |
|--------|-------------|------|
| `401` | Unauthorized | `{ "error": "Authentication required" }` |
| `404` | Not found | `{ "error": "Vehicle not found" }` |

---

## 4. Dashboard Endpoints

### 4.1 Get Fleet KPIs `(UC06)`

`GET` `/dashboard/kpis`

**Auth Required:** Yes | **Role Required:** `fleet_manager` or `viewer`

Retrieves key performance indicators for the dashboard.

#### Headers

```
Authorization: Bearer <jwt_token>
```

#### Response

```json
{
  "totalVehicles": 50,
  "activeVehicles": 42,
  "averageSpeed": 54,
  "alertsToday": 7,
  "lastUpdated": "2026-05-03T14:30:00Z"
}
```

#### Error Responses

| Status | Description | Body |
|--------|-------------|------|
| `401` | Unauthorized | `{ "error": "Authentication required" }` |
| `403` | Forbidden | `{ "error": "Insufficient permissions" }` |

---

### 4.2 Get Active Alerts `(UC06)`

`GET` `/dashboard/alerts`

**Auth Required:** Yes | **Role Required:** `fleet_manager` or `viewer`

Retrieves current active alerts for the fleet.

#### Headers

```
Authorization: Bearer <jwt_token>
```

#### Response

```json
{
  "total": 7,
  "alerts": [
    {
      "id": "alert_001",
      "vehicleId": "1000",
      "type": "speeding",
      "severity": "high",
      "message": "Vehicle exceeded speed limit: 95 km/h in 80 zone",
      "timestamp": "2026-05-03T14:25:00Z"
    }
  ]
}
```

---

## 5. Common Error Responses

All error responses follow this format:

```json
{
  "error": "Human readable error message",
  "timestamp": "2026-05-03T14:30:00Z"
}
```

### HTTP Status Code Reference

| Code | Description |
|------|-------------|
| `200` | **OK** - Request successful |
| `201` | **Created** - Resource created |
| `400` | **Bad Request** - Validation error |
| `401` | **Unauthorized** - Missing or invalid token |
| `403` | **Forbidden** - Authenticated but insufficient permissions |
| `404` | **Not Found** - Resource does not exist |
| `409` | **Conflict** - Resource already exists |
| `500` | **Internal Server Error** |

---

## 6. Endpoint Summary Table

| Method | Endpoint | Auth | Role | Use Case |
|--------|----------|------|------|----------|
| `POST` | `/auth/register` | No | Public | UC01 |
| `POST` | `/auth/login` | No | Public | UC02 |
| `POST` | `/auth/logout` | Yes | Any | UC02 |
| `GET` | `/admin/users` | Yes | Admin | UC03 |
| `PATCH` | `/admin/users/{userId}/role` | Yes | Admin | UC03 |
| `DELETE` | `/admin/users/{userId}` | Yes | Admin | UC03 |
| `GET` | `/vehicles/locations` | Yes | Fleet Manager, Viewer | UC04 |
| `GET` | `/vehicles/{vehicleId}` | Yes | Fleet Manager, Viewer | UC04 |
| `GET` | `/dashboard/kpis` | Yes | Fleet Manager, Viewer | UC06 |
| `GET` | `/dashboard/alerts` | Yes | Fleet Manager, Viewer | UC06 |

---

## 7. Example cURL Requests

### Register User

```bash
curl -X POST "http://localhost:5000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### Login

```bash
curl -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### Get Live Vehicle Locations

```bash
curl -X GET "http://localhost:5000/api/vehicles/locations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Fleet KPIs

```bash
curl -X GET "http://localhost:5000/api/dashboard/kpis" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get All Users _(Admin only)_

```bash
curl -X GET "http://localhost:5000/api/admin/users" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update User Role _(Admin only)_

```bash
curl -X PATCH "http://localhost:5000/api/admin/users/5/role" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "fleet_manager"}'
```

### Deactivate User _(Admin only)_

```bash
curl -X DELETE "http://localhost:5000/api/admin/users/5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

_Vehicle Analytics Platform - API Reference (Demo 1)_

---
*Updated: May 2026*
