# Functional Requirements 
** Vehicle Analytics Platform - V.A.P.O.R **
** Prepared By:** Kilimanjaro StoneCap
** Demo:** Demo 2

***

### FR1: Telemetry Data Ingestion & Processing

* **FR1.1:** The system must consume real-time vehicle telemetry data, including GPS coordinates, speed, and driver behavior metrics, directly from an AWS Kinesis stream.  
* **FR1.2:** The system must implement data transformation and enrichment pipelines for the raw vehicle data prior to storage.  
* **FR1.3:** The system must efficiently store time-series data to facilitate both real-time and historical data access.

### FR2: Real-Time Tracking & Visualization

* **FR2.1:** The system must display the real-time positions of vehicles on an interactive map.  
* **FR2.2:** The dashboard must update visualization in near real-time, rendering updates within 5 to 10 seconds of telemetry events.

### FR3: Trip Detection & Data Management

* **FR3.1:** The system shall detect the start of a trip when a vehicle's speed rises above 5 km/h following a stationary period, ignition is on and movement in on.
<!-- * **FR3.2:** The system shall detect the end of a trip when vehicle's speed drop below 5 km/h for 10 or more consecutive minutes and the vehicle's ignition is switched off and movement is off. 
* **FR3.3:** The system shall treat a stationary period (where the ignition is off, movement is off and speed is below 5 km/h) that ends a trip as a rest break for fatigue-detection purposes. -->
* **FR3.4:** The system shall support the detection of multiple distinct trips within a single day of vehicle operation.
* **FR3.5:** The system must store completed trip records for all vehicles managed within the fleet.
* **FR3.6:** The system shall exclude active or currently incomplete trips from any trip history list.
* **FR3.7:** The system must support vehicle groupings using defined fleet or organization tags.

### FR4: Driver Safety Scoring & Behaviour Analytics

* **FR4.1:** The system shall calculate a real-time safety score for an ongoing trip based on the count of `harsh_braking`, `harsh_acceleration`, `harsh_cornering`, and `crash_detection` events recorded since the trip started.
* **FR4.2:** The system shall flag a speeding condition in real time when a vehicle's current speed exceeds a configured threshold.
* **FR4.3:** The system shall calculate a trip safety score for each completed trip based on its recorded unsafe events.
* **FR4.4:** The system shall calculate a vehicle's overall average safety score across all of its recorded trips.
* **FR4.5:** The system must compute a safety score aggregated per day, per vehicle, over a selectable time period.
* **FR4.6:** The system shall provide a "green driving" breakdown per trip showing counts of `harsh_braking`, `harsh_acceleration`, and `harsh_cornering` events.


### FR5: Vehicle Safety Profile

* **FR5.1:** The system must display a list of all registered vehicles, showing vehicle ID, current status, and current safety score.
* **FR5.2:** The system must provide a dedicated vehicle profile page, accessible by selecting a vehicle from the vehicle list.
* **FR5.3:** The vehicle profile page shall provide a "Current Trip" tab and a "History" tab.
* **FR5.4:** The system shall default to the Current Trip tab when a trip is in progress for the vehicle, and to the History tab when the vehicle is currently inactive.
* **FR5.5:** The Current Trip tab shall retrieve live position data for the ongoing trip.
* **FR5.6:** The Current Trip tab shall display current speed, live GPS position on the map, elapsed trip time, a live unsafe-event feed, and the real-time trip safety score.
* **FR5.7:** The History tab shall display a "no trip history available" message when no completed trips exist for the vehicle.
* **FR5.8:** The system shall mark a vehicle's profile page as inactive/maintenance when set to that status by an Admin, while keeping it accessible for historical review.
* **FR5.9:** The system shall allow the fleet manager to toggle between per-trip and per-day aggregated safety score views on the History tab.


### FR6 : Trip History and Route Visualization

* **FR6.1:** The system must retrieve and list all completed trips for a selected vehicle, ordered from most recent to oldest.
* **FR6.2:** Each trip list entry shall display trip date, start time, end time, total distance covered, and trip safety score.
* **FR6.3:** The system must display the vehicle's overall average safety score, calculated across all recorded trips, at the bottom of the trip list.
* **FR6.4:** The system must allow a fleet manager to expand a trip to view a detailed, chronological event timeline showing each unsafe event's type, timestamp, and GPS coordinates.
* **FR6.5:** The system must render the full route of selected trip on an interactive map, with event locations marked along the route.

### FR7: Aggregated Fleet Analytics

* **FR7.1:** The system must allow a fleet manager to select a daily or weekly period for fleet-wide analytics.
* **FR7.2:** The system must display a fleet-wide safety score trend chart for the selected period.
* **FR7.3:** The system must display a ranked list of vehicles/drivers by safety score, from lowest to highest, for the selected period.
* **FR7.4:** The system shall display a breakdown of total unsafe events by type (`harsh_braking`, `harsh_acceleration`, `harsh_cornering`, `crash_detection`, `speeding`) across the fleet.
* **FR7.5:** The system shall display each vehicle's contribution to the fleet-wide event totals for the selected period.
* **FR7.6:** The system shall allow a fleet manager to click on a vehicle in the ranked list to navigate directly to that vehicle's profile page.


### FR8: Geofence Zone Monitoring

* **FR8.1:** The system shall allow a fleet manager to define a named, polygonal geofence zone by drawing a boundary on the interactive map.
* **FR8.2:** The system shall allow a fleet manager to configure a zone's trigger type as entry, exit, or both.
* **FR8.3:** The system shall continuously monitor all active vehicles' GPS coordinates, streamed via Kinesis, against all defined geofence zones in real time.
* **FR8.4:** The system shall detect a zone boundary breach using a Lambda function that evaluates vehicle coordinates against the stored zone polygon.
* **FR8.5:** The system shall trigger an alert containing vehicle ID, zone name, breach type (entered/exited), and timestamp when a zone boundary is breached.
* **FR8.6:** The system shall display triggered alerts in the dashboard in real time and allow a fleet manager to acknowledge them.
* **FR8.7:** The system shall tally each unsafe event that occurs within a zone's boundary against that zone's event breakdown.
* **FR8.8:** The system shall allow a fleet manager to view a per-zone breakdown of unsafe event counts by type.
* **FR8.9:** The system shall allow a fleet manager to edit an existing zone's boundary and trigger settings.
* **FR8.10:** The system shall allow a fleet manager to delete an existing zone.
* **FR8.11:** The system shall not trigger an entry alert for a vehicle already located inside a zone at the time that zone is created; monitoring shall begin from that point forward.
* **FR8.12:** The system shall not trigger an exit alert for a vehicle located inside a zone at the time that zone is deleted.


### FR9: Trip Replay  & Visualization

* **FR9.1:** The system shall allow a fleet manager to initiate an animated replay of a completed trip from the trip history.
* **FR9.2:** The system shall load all `clean_telemetry` position records for the selected trip in chronological order.
<!-- * **FR9.3:** The system shall render the full trip route with a colour-coded speed overlay: green for safe speed, amber for elevated speed, and red for speeding.  remove for now-->
* **FR9.4:** The system shall place markers on the route at every location where a `vehicle_events` record exists for that trip.
* **FR9.5:** The system shall animate a vehicle marker moving along the route in sequence, updating the displayed speed and route segment colour at each position.
* **FR9.6:** The system shall display event details in a panel alongside the map when playback reaches an unsafe event marker.
* **FR9.7:** The system shall provide playback controls allowing the fleet manager to play, pause, rewind, and scrub to any point in the trip.
* **FR9.8:** The system shall display a static route map, with a message indicating replay is unavailable, when a trip has fewer than the minimum number of telemetry records required for smooth playback.
* **FR9.9:** The system shall display the route without event markers, along with a confirming message, when a trip has no recorded unsafe events.