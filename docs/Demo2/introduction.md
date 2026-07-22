
# 3.1.1 Introduction


## Vehicle Analytics Platform - V.A.P.O.R.


---


## Business Need


Modern fleet operators collect massive amounts of raw vehicle telemetry - GPS coordinates, speed readings, braking events, and more. But collecting data is not the same as understanding it. Without proper analysis, fleet managers are left reacting to incidents after they happen rather than preventing them.



**The problem is simple:** Raw location data alone is not enough. Fleet managers need actionable insights to run efficient, safe, and cost-effective operations. They need to know:


- Which drivers are driving safely and which ones need coaching
- Where vehicles are in real-time
- What incidents occurred and where
- How the fleet is performing overall



**The gap:** Most fleet operators don't have a unified way to collect, analyze, and interpret vehicle telemetry data. Unsafe driving behaviour goes undetected. Valuable data goes unused. Fleet performance cannot be systematically measured or improved.


---



## Project Scope


V.A.P.O.R. (Vehicle Analytics, Processing and Operations in Real-time) solves this problem by transforming raw vehicle telemetry into actionable intelligence.



### What the platform does:


- Ingests real-time telemetry from 50+ vehicles via AWS Kinesis streams
- Processes data through serverless Lambda functions
- Calculates driver safety scores based on harsh braking, acceleration, cornering, and crash events
- Stores time-series data in PostgreSQL with TimescaleDB
- Provides real-time dashboards with live vehicle tracking and safety monitoring



### Who it's for:


- **Fleet Managers:** Monitor fleet performance, view safety scores, track vehicles, and identify issues
- **Administrators:** Manage users, configure system settings, and oversee the platform
- **Viewers:** Read-only access to dashboards and reports



### What it delivers:


- Real-time vehicle positions on an interactive map
- Driver safety scores updated daily
- Trip history with route playback
- Fleet analytics and performance reports
- Geo-fencing with entry/exit alerts
- Secure REST API for integration



**The bottom line:** The platform turns raw telemetry into meaningful operational intelligence that helps fleet operators run safer, more efficient operations.


---


*July 2026*
