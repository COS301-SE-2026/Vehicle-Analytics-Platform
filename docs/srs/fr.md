# Functional Requirements 
** Vehicle Analytics Platform - V.A.P.O.R **
** Prepared By:** Kilimanjaro StoneCap
** Demo:**Demo 2

***

### FR1: Telemetry Data Ingestion & Processing
* **FR1.1:** The system must consume real-time vehicle telemetry data, including GPS coordinates, speed, and driver behavior metrics, directly from an AWS Kinesis stream.  
* **FR1.2:** The system must implement data transformation and enrichment pipelines for the raw vehicle data prior to storage.  
* **FR1.3:** The system must efficiently store time-series data to facilitate both real-time and historical data access.

### FR2: Real-Time Tracking & Visualization
* **FR2.1:** The system must display the real-time positions of vehicles on an interactive map.  
***FR2.2:** The dashboard must update visualization in near real-time, rendering updates within 5 to 10 seconds of telemetry events.

### FR3: Analytics & Driver Behavior
* **FR3.1:** The system must calculate basic driver safety scores by evaluating speeding, harsh braking, and rapid acceleration events.  
* **FR3.2:** The system must implement analytics dashboards to visualize vehicle data, time-series data, and relevant KPIs.  
* **FR3.3:** The system must compute aggregated analytics, such as daily and weekly summaries, focusing on driver behavior and fleet performance.  

### FR4: Trip History & Management
* **FR4.1:** The system must store the trip history for all vehicles managed within the fleet.  
* **FR4.2:** The system must allow users to query and view past routes taken by specific vehicles.  
* **FR4.3:** The system must support vehicle groupings using defined fleet or organization tags.
