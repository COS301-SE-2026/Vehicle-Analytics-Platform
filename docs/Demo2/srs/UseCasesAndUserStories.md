## 1. User Stories (US)

### US06: View Driver Safety Profile

**As a** fleet manager  
**I want to** view a detailed safety profile for any vehicle in my fleet 
**So that** I can monitor that vehicle's current trip performance in real time and review its full safety history to identify patterns and take corrective action

**Acceptance Criteria:**
* Fleet manager can navigate to the Vehicles tab and see all registered vehicles with their current status and safety score.
* Clicking a vehicle opens its profile page.
* If the vehicle is currently on a trip, the current trip tab is shown by default with a live-updating safety score.
* The current trip tab shows current speed, live GPS location, elapsed trip time, and a live feed of unsafe events for this trip.
* The History Tab shows a list of all the past completed trips with the date, start time, end time, distance, and trip safety score.
* The vehicle's overall average safety score is displayed at the bottom of the History Tab.
* Any trip in the History list can be expanded to show a detailed event timeline and route map.
* If the vehicle has no active trip, the Current Trip tab shows "vehicle not currently active" message.
* The History tab displays a daily safety score chart showing the vehicle's average score per day over a scalable time period
* Each trip in the History list shows a green driving summary with event counts for harsh braking, acceleration and cornering.

---

### US07: View Trip History and Routes

**As a** fleet manager  
**I want to** view complete trip history for a specific vehicle
**So that** I can review past routes and safety performances as well as investigate incidents, and track improvement overtime.

**Acceptance Criteria:**
* History tab on the vehicle profile page lists all completed trips for that vehicle in the order of most recent to oldest trip.
* Each trip entry shows date, start time, end time, distance and safety score.
* The vehicle's overall average safety score is displayed at the bottom to reference for comparison purposes.
* Clicking a trip expands it to show a detailed event timeline and route map.
* A trip is only listed as complete if the vehicle's speed remained at or below 5km/h and the ignition is off, both for 10 or more consecutive minutes.
* If no trips exist yet, a "no trip history available" message is shown.
* Results paginate at 10 trips per page if the list is long.
* The system automaticall creates a new trip when a vehicle resumes movement after the trip is classified as complete and therefore multiple trips per day are possible.
* Each trip entry shows a green driving summary including counts of harsh braking, acceleration, and harsh cornering events.

---

### US08: View Aggregated Fleet Analytics

**As a** Fleet manager  
**I want to** view daily and weekly summaries of driver behaviour and fleet safety performance
**So that** I can identify trends, track imrovement overtime, and prioritise which vehicles and drivers need attention.

**Acceptance Criteria:**
* Fleet manager can select a daily or weekly period for the analytics view.
* System displays a fleet-wide safety score trend chart for the selected period.
* System displays a ranked list of vehicles/drivers by safety score for the period, lowest to highest.
* System displays a breakdown of total unsafe events by type across the fleet: harsh braking, harsh acceleration, harsh cornering, crash detection, and speeding.
* System displays each vehicle's contribution to the fleet totals for the period.
* Fleet manager can click on any vehicle in the list to navigate to its profile page.
* If no data exists for the selected period, a "no data available" message is shown.
* Analytics reflec the latest processed telemetry without requiring a manual refresh.

---

### US09: Monitor Geofence Zones and Event Hotspots

**As a** fleet manager
**I want to** define geographic zones on the map and be alerted when vehicles enter or exit them, and see a breakdown of unsafe events that occur within each zone.
**So that** I can enforce operational boundaries, detect unauthorised route deviations and identify high risk locations across my fleet's routes.

**Acceptance Criteria:**
* Fleet manager can draw a polygon geofence zone on the interactive map and give it a name.
* Fleet manager can set the zone to trigger on entry, exit, or both.
* System monitors all active vehicles against all defined zones in real time.
* Alert fires within 10 seconds when a vehicle crosses a boundary.
* Alert shows vehicle ID, zone name, breach type, and timestamp.
* System tallies unsafe driving events that occur within each zone's boundary
* Fleet manager can view a breakdown of event counts by type for each zone to identify zones with the highest concentration of unsafe events.
* Fleet manager can view, edit and delete existing zones.
* If no zones are defined, an empty state propmts the fleet manager to create one.

---

### US10: Replay Trip with Speed Visualisation

**As a** fleet manager  
**I want to** replay a completed trip as an animated playback on the map with speed visualisation
**So that** I can understand the full context of unsafe events and identify exactly where and how they occurred.

**Acceptance Criteria:**
* Fleet manager can initiate a replay from any extended trip in the vehicle History tab.
* System renders the full trip route with a colour-coded speed overlay: green for safe speed, amber for elevated speed, red for speeding.
* Unsafe event markers are placed on the route at the locaions where they occurred.
* Fleet manager can play, pause, rewind, and scrub through  the playback timeline.
* The vehicle moves along the route in sequence during playback
* When playback reaches an unsafe event, its details are displayed alonside the map.
* If insufficient telemetry data exists for a replay, a static route map is shown explaining the replay is unavailable.
* If a trip has no unsafe events, the rout displays without event markers and a confirmation message is shown.

---

## 2. Use Cases (UC)

### UC06: View Vehicle Safety Profile

**Actor:** Fleet Manager

**Description:** A fleet manager selects a vehicle from the Vehicles section on the dashboard and views that vehicle's dedicated profile page. Since each vehicle is operator by a single assigned driver, the vehicle profile serves as the safety profile for that driver. The dedicated profile page has 2 tabs: a Current Trip showing the live ongoing trip with a safety score updating in real time, and a History tab showing all past trips with individual scores and the vehicle's overall average score. This gives the fleet manager a complete picture of that vehicle's operational performance and safety record.

**Pre-conditions:**
* The fleet manager is logged in with a valid session.
* At least one vehicle is registered in the system.
* At least one telemetry event has been received and processed for the selected vehicle.

**Main Flow:**
1. Fleet manager clicks on the vehicles tab in the sidebar.
2. System retrieves and displays a list of all registered vehicles showing each vehicle's ID, current status and current safety score.
3. Fleet manager clicks on a specific vehicle.
4. System navigates to that vehicle's profile page, defaulting to the Current Trip tab if a trip is in progress, or the History tab if the vehicle is currently inactive.

**Current Trip Tab Flow:**
5. System retrieves live position data for the ongoing trip from the current_vehicle_position table materialized view.
6. System retrieves all vehicle_events records for this vehicle since the trip start timestamp to build the live event feed.
7. System calculates the current trip safety score in real time based on the count of harsh_braking, harsh_acceleration, harsh_cornering, and crash_detection events recorded since the trip started and flags speeding when the vehicle's current speed exceeds the configured threshold.
8. System displays: current speed, live GPS position on the map, elapsed trip time, live unsafe event feed, and the current trip safety score updating in real time.

**History Tab Flow:**
5. System retrieves all completed trips for this vehicle from the database.
6. System displays a list of past trips ordered from the most recent to oldest, each showing: trip date, start time, end time, total distance, and trip safety score.
7. System displays the vehicle's overall average safety score calculated acreoss all trips at the bottom of the list.
8. Fleet manager can click on any trip to expand it and view detailed event timeline and route map for that trip.
9. System displays a daily safety score chart showing the vehicles average safety score aggregated per day over a selectable time period.
10. System displays a green driving breakdown per trip showing counts of harsh_braking, harsh_acceleration and harsh_cornering events.

**Alternate Flows:**
* **No Active Trip:** If the vehicle is not currently on a trip, the Current Trip defaults to showing the History tab.
* **No Trip History:** If the vehicle has no completed trips yet, the History tab displays a "no trip history available" message.
* **Vehicle Inactive:** If the vehicle has been set to inactive or maintenance by an Admin, the profile page is still accessible for historical review but is marked accordingly.
* **Daily Score View:** Fleet manager can toggle between viewing scores per week or aggregated by day to identify patterns in driving behaviour.

**Post-conditions:** The fleet manager has a complete view of the selected vehicle's current trip performance and historical safety record.

**Diagram:**

![Vehicle Safety Profile Use Case](./images/uc_vehicle_profile.svg)

---

### UC07: View Vehicle Trip History and Routes

**Actor:** Fleet Manager

**Description:** A fleet manager views the complete trip history for a specific vehicle from the History tab on that vehicle's profile page. Each past trip is listed with its summary statistics and safety score, ordered from most recent to oldest, and can be expanded to show a detailed event timeline and the trip route on a map. The vehicle's overall average safety score across all trips is displayed at the bottom. This allows the fleet manager to identify patterns in the vehicle's operational history and investigate specific past incidents.

**Pre-conditions:**
* The fleet manager is logged in with a valid session.
* The fleet manager has navigated to a specific vehicle's profile page.
* At least one completed trip exists in the database for the selected vehicle.

**Main Flow:**
1. Fleet manager selects the History tab on the vehicle profile page.
2. System queries the database for all completed trips for this vehicle, ordered by date with the most recent first.
3. System displays the trip list, each entry showing: trip date, start time, end time, total distance covered, and trip safety score.
4. System displays the vehicle's overall average safety score calculated across all recorded trips at the bottom of the list.
5. Fleet manager clicks on a specific trip to expand it.
6. System displays the detailed event timeline for that trip: each unsafe event listed in chronological order with its type, timestamp, and GPS coordinates.
7. System displays the full trip route on an interactive map using clean_telemetry position records between the trip start and end timestamps, with event locations marked along the route.
8. Fleet manager reviews the trip detail and collapses the expanded view when done.

**Alternate Flows:**
* **No Trip History:** If no completed trips exist for this vehicle yet, the History tab displays a "no trip history available" message.
* **Trip Detection and Splitting:** A trip starts when speed rises above 5 km/h after a stationary period, and ends when speed drops to or below 5 km/h for 10 or more consecutive minutes and the ignition is off. This stationary period also counts as a rest break for fatigue detection. A single day of driving may produce multiple trips. Active or currently incomplete trips are excluded from the history list.
* **Large Trip History:** If more than 10 trips are returned, the system paginates the results and shows 10 trips per page.

**Post-conditions:** The fleet manager has reviewed the trip history for the selected vehicle and has a complete record of events and routes for each past trip.

**Diagram:**

![Trip History Use Case](./images/uc_trip_history.svg)

---

### UC08: View Aggregated Fleet Analytics

**Actor:** Fleet Manager

**Description:** A fleet manager views aggregated analytics summaries showing driver behaviour and fleet performance trends over daily and weekly periods. The system aggregates safety event data across the fleet and presents it as trend charts according to their selected time period(day, week, month or year), ranked vehicle lists, and event breakdowns, letting the fleet manager identify longer-term patterns beyond real-time monitoring.

**Pre-conditions:**
* The Fleet Manager is logged in with a valid session.
* At least one full day of telemetry data has been processed and stored.

**Main Flow:**
1. Fleet Manager navigates to the Analytics section of the dashboard.
2. Fleet Manager selects a time period: daily, weekly, monthly or yearly.
3. System aggregates safety event data for the selected period.
4. System displays a fleet-wide safety score trend chart for the selected period.
5. System displays a ranked list of vehicles/drivers by safety score, lowest to highest for the period.
6. System displays a breakdown of total unsafe events by type across the fleet: harsh_braking, harsh_acceleration, harsh_cornering, crash_detection, and speeding.
7. System displays each vehicle's contribution to the fleet totals for the period.
8. Fleet manager can click on any vehicle in the ranked list to navigate directly to that vehicle's profile page 

**Alternate Flows:**
* **No Data for the period:** If no telemetry data exists for the selected period, the system displays a "no data available for this time period" message.

**Post-conditions:** The fleet manager has a clear understanding of the fleet-wide safety performance and driver behaviour trends over the selected time period.

**Diagram:**

![Vehicle Management Use Case](./images/uc_fleet_analytics.svg)

---

### UC09: Monitor Geofence Zone Breaches

**Actor:** Fleet Manager

**Description:** A fleet manager defines named geographic boundary zones on the interactive map such as depots, warehouses, customer sites, or restricted areas. The system continuously monitors all active vehicles against these zones in real time using GPS coordinates from the Kinesis stream. When a vehicle crosses a boundary, an alert is triggered immediately. Beyond simple alerts, the system tallies every unsafe event that occurs within each zone's boundary. Geofencing is used as an analytical tool: fleet manager can see which zones produce the highest concentration of unsafe events and use that to identify high risk locations across the fleet's operating area.

**Pre-conditions:**
* The fleet manager is logged in with a valid session.
* Vehicle telemetry is actively streaming via AWS Kinesis.
* At least one geofence zone has been defined.

**Main Flow:**
1. Fleet manager navigates to the Geofencing section of the dashboard.
2. System displays the interactive map with any existing geofence zones drawn on it, each labelled with its name.
3. Fleet manager clicks "Create Zone."
4. Fleet manager draws a polygon boundary on the map by clicking to place points around the desired area.
5. Fleet manager names the zone (e.g. "Durban Port", "Pretoria Depot") and sets the trigger type: entry, exit, or both.
6. System saves the geofence zone and immediately begins monitoring all active vehicles against it.
7. When a vehicle's GPS coordinates cross the zone boundary, Lambda detects the breach by evaluating the coordinates against the stored polygon.
8. System triggers an alert showing: vehicle ID, zone name, breach type (entered or exited), and timestamp.
9. Fleet manager receives the alert in the dashboard in real time.
10. Fleet manager acknowledges the alert.
11. System also tallies each unsafe event that occurs within the zone boundary, adding it to that zone's event breakdown.
12. Fleet manager can view the event breakdown for any zone, showing counts per event type, to identify zones with elevated risk.

**Alternate Flows:**
* **No Zones Defined:** If no zones have been created yet, the system displays an empty state with a prompt to create the first zone.
* **Vehicle Already Inside Zone on Zone Creation:** If a vehicle is already inside the zone boundary when it is first created, no entry alert is triggered. Monitoring begins from that point forward.
* **Edit Zone:** Fleet manager can select an existing zone, adjust its boundary or settings, and save the changes.
* **Delete Zone:** Fleet manager can delete a zone. Active vehicles inside the zone at the time of deletion receive no exit alert.

**Post-conditions:** The geofence zone is active and all vehicles are monitored against it in real time. Zone crossings are recorded as alerts and unsafe events occurring within the zone are tallied to support zone-level risk analysis.

**Diagram:**

![Geofence Monitoring Use Case](./images/uc_geofencing.svg)

---

### UC10: Replay Trip with Speed Visualisation

**Actor:** Fleet Manager

**Description:** A fleet manager selects a completed trip from the trip history and replays it as an animated playback on the interactive map. The vehicle's position moves along the recorded route in sequence, with speed visualised using a colour-coded overlay. Unsafe events are marked on the route and highlighted as the playback reaches them.

**Pre-conditions:**
* The fleet manager is logged in with a valid session.
* The fleet manager has navigated to a specific vehicle's trip history.
* At least one trip exists for the selected vehicle.

**Main Flow:**
1. Fleet manager expands a completed trip in the History tab of the vehicle profile page.
2. Fleet manager clicks "Replay Trip."
3. System loads all clean_telemetry position records for that trip in chronological order.
4. System renders the full trip route on the map with a colour-coded speed overlay: green for safe speed, amber for elevated speed, red for speeding.
5. System places markers on the route at each location where a vehicle_events record exists for that trip.
6. Fleet manager clicks Play to begin the animated playback.
7. The vehicle marker moves along the route in sequence, with the speed display updating at each position and the route segment colour reflecting the speed at that point.
8. When playback reaches an unsafe event marker, the event details are displayed in a panel alongside the map.
9. Fleet manager can pause, rewind, or skip to any point in the trip using a playback scrubber.
10. Fleet manager closes the replay when done.

**Alternate Flows:**
* **Insufficient Data:** If the trip has fewer than the minimum number of telemetry records required for smooth playback, the system displays a static route map instead and informs the fleet manager that replay is unavailable for this trip.
* **No Unsafe Events:** If the trip has no vehicle_events records, the route is displayed without event markers and a message confirms the trip had no unsafe events.

**Post-conditions:** The fleet manager has reviewed the full animated playback of the trip and has a contextual understanding of where and how unsafe events occurred.

**Diagram:**

![Trip Replay Use Case](./images/uc_trip_replay.svg)