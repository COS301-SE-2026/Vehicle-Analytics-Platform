

# Vehicle Analytics Platform - API Reference



## Base URLs



- Development: `http://localhost:4000/api`

- Production: `https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod/api`



Auth: All endpoints require a Bearer JWT token except `/auth/register` and `/auth/login`.




## 1. Authentication



### Register


`POST /auth/register`



```

{ "name": "John", "email": "john@example.com", "password": "SecurePass123" }

```



### Login


`POST /auth/login`



```


{ "email": "john@example.com", "password": "SecurePass123" }


```




Response:



```

{ "idToken": "eyJ...", "user": { "id": 1, "name": "John", "role": "viewer" } }

```




### Logout


`POST /auth/logout` - Requires token



## 2. Admin



### Get All Users


`GET /admin/users?page=1&limit=20`



### Update Role

`PATCH /admin/users/{userId}/role`




```


{ "role": "fleet_manager" }

```



### Deactivate User


`DELETE /admin/users/{userId}`



## 3. Vehicles



### List Vehicles


`GET /vehicles?status=moving&min_score=50&alerts=true`


Response includes: id, status, safety_score, has_alert, is_speeding, distance_today



### Live Locations

`GET /vehicles/locations` - Updates every 5–10 seconds



### Vehicle Details


`GET /vehicles/{vehicleId}?date=2026-07-20`


Returns: Vehicle info + recent events (safety events only, no ignition events)



### Vehicle Trips

`GET /vehicles/{vehicleId}/trips?limit=10`



### Safety Trend


`GET /vehicles/{vehicleId}/safety-trend?days=7`




## 4. Dashboard




### KPIs

`GET /dashboard/kpis`



### Alerts

`GET /dashboard/alerts?limit=50` - Safety events only



### Activity History

`GET /dashboard/activity?range=day` - range: day or week


### Total Distance

`GET /dashboard/total-distance`




### Fleet Stats (Footer)

`GET /dashboard/stats`



## 5. Safety Scores



### Fleet Scores

`GET /safety/scores?date=2026-07-20`



### Vehicle Score

`GET /safety/scores/{vehicleId}?date=2026-07-20`



Scoring Rules: Start at 100. Harsh braking = -10, acceleration = -5, cornering = -3, crash = -50.




Classification: 80+ Good, 50-79 Fair, 0-49 Poor.



## 6. Trips



### Trip History

`GET /trips/history/{vehicleId}?limit=50&before=timestamp`



Returns: Trip list with safety_score for each trip.



### Trip Replay

`GET /trips/replay/{tripId}`

Returns: points (GPS with speed color coding) + events (safety events).



Speed Colors: Green (≤60), Amber (60-80), Red (>80).



## 7. Fleet Analytics



### Analytics

`GET /fleet/analytics?period=day` - period: day or week



Returns: Trend, ranked vehicles, event breakdown, vehicle contributions.


### Vehicle Daily Scores

`GET /fleet/vehicle/{vehicleId}/scores?days=7`




## 8. Geofences


### CRUD Operations



Method - POST ; Endpoint - /geofences ; Description - Create zone 

Method - GET ; Endpoint - /geofences ; Description - List zones 

Method - GET ; Endpoint - /geofences/{id} ; Description - Get zone 

Method - PUT ; Endpoint - /geofences/{id} ; Description - Update zone 

Method - DELETE ; Endpoint - /geofences/{id} ; Description - Delete zone |


### Geofence Events

`GET /geofences/events?geofence_id=1&vehicle_id=1006&limit=50`


### Discover Stops

`GET /geofences/discover/stops?vehicle_id=1006&days=7&radius_km=0.5&min_points=3`




### Discover Events (Hotspots)

`GET /geofences/discover/events?event_category=green_driving_type&days=7`



### Create from Cluster

`POST /geofences/discover/create`



```

{ "name": "Zone", "vehicle_id": "1006", "center_lat": -25.0, "center_lng": 28.0, "radius_km": 0.5 }

```


## 9. Common Errors



```

{ "success": false, "error": "Message", "timestamp": "2026-07-20T00:00:00Z" }

```



Status - 401 -> Missing/invalid token 

Status - 403 -> Insufficient permissions 

Status - 404 -> Not found 



