/**
 * Help Menu Content Data
 *
 * Schema:
 * category: {id, title, icon, roles: [], articles: [] }
 * articles: { id, title, preview, roles: [], content: [] }
 *
 * Content block types:
 * { type: 'text', text }
 * { type: 'list', items: [] }
 * { type: 'image', src, alt }
 * { type: 'table', headers: [], rows: [[...]] }
 * { type: 'callout', text }
 * { type: 'glossary', terms: [{ term, definition }] }
 */
export const ROLES = {
    VIEWER: "viewer",
    FLEET_MANAGER: "fleet_manager",
    ADMIN: "admin",
};

const ALL_ROLES = [ROLES.VIEWER, ROLES.FLEET_MANAGER, ROLES.ADMIN];
const MANAGER_AND_ADMIN = [ROLES.FLEET_MANAGER, ROLES.ADMIN];

const ADMIN_ONLY = [ROLES.ADMIN];

const text = (value) => ({ type: "text", text: value });
const list = (items) => ({ type: "list", items });
const table = (headers, rows) => ({ type: "table", headers, rows });
const callout = (value) => ({ type: "callout", text: value });
const glossary = (terms) => ({ type: "glossary", terms });

export const helpMenuData = [
    {
        id: "getting-started",
        title: "Getting Started",
        icon: "rocket",
        roles: ALL_ROLES,
        articles: [
            {
                id: "welcome-role-overview",
                title: "Welcome & Role overview",
                preview: "Understand the core functionality for your role",
                roles: ALL_ROLES,
                content: [
                    text(
                        "Welcome to V.A.P.O.R. To ensure your organisation operates efficiently, access is partitioned into 3 distinct roles. Each role is designed to provide the specific tools needed for your daily tasks without unnecessary complexity."
                    ),
                    table(
                        ["Features", "Viewer", "Fleet Manager", "Admin"],
                        [
                            ["Data visualisation", true, true, true],
                            ["User Management", false, false, true],
                            ["Geofencing", false, true, false],
                        ]
                    ),
                    text(
                        "If something you expected to see is missing from a menu, it's usually tied to a role above yours. Ask your Admin if you think you need access."
                    ),
                ],
            },
            {
                id: "dashboard-tour",
                title: "Dashboard Tour",
                preview: "A visual walkthrough of the main sections",
                roles: ALL_ROLES,
                content: [
                    list([
                        "Vehicles - a live list of all vehicles, with status and safety score.",
                        "Analytics - fleet-wide trends, rankings, and event breakdowns over daily or weekly periods.",
                        "Geofencing - the interactive map where you define zones and monitor entry/exit activity.",
                    ]),
                    text(
                        "Start with Vehicles if you want to check on a specific vehicle or Dashboard if you want a bigger picture."
                    ),
                ],
            },
            {
                id: "logging-in-sessions",
                title: "Logging In & Sessions",
                preview: "Secure authentication practices and session handling",
                roles: ALL_ROLES,
                content: [
                    text(
                        "Log in with the email and password you registered with. If your credentials are incorrect, you'll see an error message and stay on the login page. Double check for typos and try again."
                    ),
                    callout(
                        "If you see a message saying your account has been deactivated, contact your organisation's Admin to have it reactivated."
                    ),
                    text(
                        "You can log out at any time from the account menu at the top of the Navigation Bar."
                    ),
                ],
            },
        ],
    },
    {
        id: "understanding-your-data",
        title: "Understanding Your Data",
        icon: "bar-chart",
        roles: ALL_ROLES,
        articles: [
            {
                id: "safety-score",
                title: "Safety Score",
                preview: "How it's calculated",
                roles: ALL_ROLES,
                content: [
                    text(
                        "Our telemetry data captures hundreds of data points every second. This glossary helps you understand the core metrics used throughout the V.A.P.O.R system."
                    ),
                    glossary([
                        {
                            term: "Safety Score",
                            definition:
                                "Every vehicle starts each day at a score of 100. Each unsafe event detected - harsh braking, harsh acceleration, etc. - deducts points based on that event's severity. The score resets to 100 every 24 hours, so it reflects the vehicle's behavior for the current day rather than an all-time average.",
                        },
                    ]),
                    list([
                        "Harsh braking events",
                        "Harsh acceleration events",
                        "Harsh cornering events",
                        "Crash detection events",
                        "Speeding threshold breaches",
                    ]),
                    text(
                        "More of these events in a day means a bigger drop from 100. The score updates automatically as new telemetry comes in, and resets fresh at the start of each 24-hour period."
                    ),
                ],
            },
            {
                id: "what-counts-as-a-trip",
                title: "What counts as a trip",
                preview: "Why one vehicle can show multiple trips",
                roles: ALL_ROLES,
                content: [
                    text(
                        "A trip starts the moment a vehicle's speed goes above 5 km/h, the movement metric is on, and the ignition is also on. It ends once the vehicle stays at or below 5 km/h for 10 minutes with the ignition off."
                    ),
                    callout(
                        "One long drive with a big stop in the middle will show up as two separate trips. That's expected, not a bug."
                    ),
                    text(
                        "The same stationary period is also used to track rest breaks for fatigue detection."
                    ),
                ],
            },
            {
                id: "green-driving-breakdown",
                title: "Green Driving Breakdown",
                preview: "Per-trip counts of harsh events",
                roles: ALL_ROLES,
                content: [
                    text(
                        "Under each trip, you will see a simple breakdown of three counts: harsh braking, harsh acceleration, and harsh cornering. This tells you not just that a trip scored low, but which specific behaviour caused the drop."
                    ),
                ],
            },
            {
                id: "daily-vs-per-trip-scores",
                title: "Daily vs. Per-Trip Scores",
                preview: "Toggling between aggregation views",
                roles: ALL_ROLES,
                content: [
                    list([
                        "Per-trip view - a score for each individual trip.",
                        "Daily view - scores aggregated across a full day.",
                    ]),
                    text(
                        "Daily view is better for spotting patterns rather than reacting to a single rough trip."
                    ),
                ],
            },
        ],
    },
    {
        id: "vehicle-profiles",
        title: "Vehicle Profiles",
        icon: "car",
        roles: ALL_ROLES,
        articles: [
            {
                id: "current-trip-vs-history",
                title: "Current Trip vs History Tabs",
                preview: "What's live vs. historical",
                roles: ALL_ROLES,
                content: [
                    table(
                        ["Current Trip", "History"],
                        [
                            [
                                "Live GPS position, elapsed time, live event feed, real-time score.",
                                "Every past trip with its score, plus the vehicle's overall average.",
                            ],
                        ]
                    ),
                    callout("No active trip? The profile automatically shows History instead."),
                    callout("No trip history available yet for this vehicle."),
                ],
            },
            {
                id: "expanding-a-past-trip",
                title: "Expanding a Past Trip",
                preview: "View the event timeline and route",
                roles: ALL_ROLES,
                content: [
                    text(
                        "Click any trip in the History tab to expand it. You'll see the full event timeline - each unsafe event with its type, timestamp, and location - plus the trip's replay drawn on the map with event locations marked along it."
                    ),
                ],
            },
            {
                id: "reading-the-vehicle-list",
                title: "Reading the Vehicle List",
                preview: "What each column means",
                roles: ALL_ROLES,
                content: [
                    list([
                        "Vehicle ID",
                        "Current status (active, idle, offline)",
                        "Current safety score",
                    ]),
                ],
            },
            {
                id: "vehicle-status-changes",
                title: "Vehicle Status Changes",
                preview: "Active, Idle, and Offline explained",
                roles: MANAGER_AND_ADMIN,
                content: [
                    glossary([
                        { term: "Active", definition: "The vehicle is currently moving." },
                        {
                            term: "Idle",
                            definition: "The vehicle's engine is on, but the vehicle is not moving.",
                        },
                        {
                            term: "Offline",
                            definition:
                                "The engine is off, or the vehicle is powered down and not transmitting.",
                        },
                    ]),
                ],
            },
        ],
    },
    {
        id: "fleet-groups",
        title: "Fleet Groups",
        icon: "groups",
        roles: ADMIN_ONLY,
        articles: [
            {
                id: "what-are-fleet-groups",
                title: "What Fleet Groups Are",
                preview: "How vehicles are organised and scoped",
                roles: ADMIN_ONLY,
                content: [
                    text(
                        "A fleet group is a named collection of vehicles. Admins create the groups and decide which vehicles belong to each one, then assign Fleet Managers to the groups they're responsible for."
                    ),
                    text(
                        "Once you're assigned, your dashboard, map, vehicle list, and safety scores are scoped to your groups only. Admins always see every group, assigned or not."
                    ),
                    callout(
                        "Access is checked on every request, not stored when you log in. If your access changes, you'll see it on the next refresh - no need to log out and back in."
                    ),
                ],
            },
            {
                id: "switching-between-groups",
                title: "Switching Between Groups",
                preview: "Working across more than one fleet",
                roles: ADMIN_ONLY,
                content: [
                    text(
                        "If you're assigned to more than one fleet group, go back to the group cards and pick a different one. The dashboard, map, vehicle list, and safety scores all update to the newly selected group."
                    ),
                    callout("Switching groups doesn't reload the page - the views update in place."),
                ],
            }
       ],
    },
    {
        id: "geofencing",
        title: "Geofencing",
        icon: "map-pin",
        roles: ALL_ROLES,
        articles: [
            {
                id: "creating-a-geofence-zone",
                title: "Creating a Geofence Zone",
                preview: "Step-by-step zone setup",
                roles: ALL_ROLES,
                content: [
                    list([
                        "Go to the Geofencing section",
                        "Click the draw icon on the top left of the map",
                        "Click points on the map to draw your zone's boundary",
                        'Name the zone (e.g. "Durban Port," "Pretoria Depot")',
                        "Choose a trigger type: entry, exit, or both",
                        "Save - monitoring starts immediately",
                    ]),
                    callout(
                        "If a vehicle is already inside the zone when you create it, no entry alert fires for that vehicle - monitoring only applies going forward."
                    ),
                ],
            },
            {
                id: "entry-exit-triggers",
                title: "Entry & Exit Triggers",
                preview: "How breach alerts work",
                roles: ALL_ROLES,
                content: [
                    text(
                        "When a vehicle crosses a zone boundary, you will get an alert showing the vehicle ID, zone name, whether it entered or exited, and the timestamp. Click the alert to acknowledge it."
                    ),
                ],
            },
            {
                id: "editing-deleting-zones",
                title: "Editing & Deleting Zones",
                preview: "Adjust boundaries and settings",
                roles: ALL_ROLES,
                content: [
                    text(
                        "Select any existing zone to adjust its boundary or trigger settings. Deleting a zone stops monitoring immediately - vehicles inside it at the time won't trigger an exit alert."
                    ),
                ],
            },
            {
                id: "zone-level-event-tallies",
                title: "Zone-Level Event Tallies",
                preview: "Spotting high-risk locations",
                roles: ALL_ROLES,
                content: [
                    text(
                        "Every unsafe event that happens inside a zone gets added to that zone's own event count. Over time, this lets you compare zones side by side and spot which locations produce the most risky driving."
                    ),
                ],
            },
        ],
    },
    {
        id: "trip-replay",
        title: "Trip Replay",
        icon: "play-circle",
        roles: ALL_ROLES,
        articles: [
            {
                id: "understanding-speed-overlay",
                title: "Understanding Speed Overlay",
                preview: "What green, amber, and red mean",
                roles: MANAGER_AND_ADMIN,
                content: [
                    glossary([
                        { term: "Green", definition: "Safe speed" },
                        { term: "Amber", definition: "Elevated speed" },
                        { term: "Red", definition: "Speeding" },
                    ]),
                    text(
                        "Markers appear along the route whenever an unsafe event was recorded, and clicking Play animates the vehicle moving along its actual path."
                    ),
                ],
            },
            {
                id: "using-playback-controls",
                title: "Using Playback Controls",
                preview: "Play, pause, and scrub",
                roles: ALL_ROLES,
                content: [
                    text(
                        "Use Play, Pause, and the scrubber bar to move to any point in the trip. When playback reaches an event marker, the event's details appear in a panel next to the map."
                    ),
                ],
            },
            {
                id: "why-replay-may-be-unavailable",
                title: "Why Replay May Be Unavailable",
                preview: "Static map fallback for short trips",
                roles: MANAGER_AND_ADMIN,
                content: [
                    callout("Replay isn't available for this trip - showing a static route map instead."),
                    text(
                        "Very short trips sometimes do not have enough recorded telemetry points for smooth animated playback."
                    ),
                ],
            },
        ],
    },
    {
        id: "predictive-risk",
        title: "Predictive Risk",
        icon: "trending-up",
        roles: MANAGER_AND_ADMIN,
        articles: [
        {
            id: "what-is-predictive-risk",
            title: "What Predictive Risk Is",
            preview: "A forecast of tomorrow, not a report on today",
            roles: MANAGER_AND_ADMIN,
            content: [
                text(
                    "Predictive Risk estimates how likely each vehicle is to have an unsafe day tomorrow. Every vehicle gets a score from 0 to 100, where a higher number means a higher chance of unsafe driving ahead. Scores refresh automatically once a day at 03:00."
                ),
                text(
                    "The forecast is built from how the vehicle has actually been driven over the past 7 days, compared against 90 days of fleet history. It deliberately ignores today's Safety Score, so it is making a genuine prediction rather than repeating what you can already see."
                ),
                callout(
                    "A vehicle can have a clean day today and still be flagged as high risk for tomorrow. That is the system working as intended, not a mistake."
                ),
            ],
        },
        {
            id: "risk-score-vs-safety-score",
            title: "Risk Score vs Safety Score",
            preview: "Two different numbers, two different jobs",
            roles: MANAGER_AND_ADMIN,
            content: [
                text(
                    "These two scores are easy to confuse because they both run from 0 to 100. They measure opposite things and move in opposite directions."
                ),
                table(
                    ["Safety Score", "Risk Score"],
                    [
                        [
                            "Looks backwards at what already happened today. Starts at 100 and drops as unsafe events are detected. Higher is better. Resets every 24 hours.",
                            "Looks forwards at what is likely to happen tomorrow. Built from the last 7 days of behaviour. Higher is worse. Recalculated daily at 03:00.",
                        ],
                    ]
                ),
                callout(
                    "If a vehicle shows a good Safety Score and a high Risk Score at the same time, nothing is broken. Today went well, but the recent pattern suggests tomorrow may not."
                ),
            ],
        },
        {
            id: "risk-tiers-explained",
            title: "Risk Tiers Explained",
            preview: "What Low, Medium, High and Critical mean for you",
            roles: MANAGER_AND_ADMIN,
            content: [
                text(
                    "Every risk score is grouped into one of four tiers so you can triage the fleet at a glance instead of comparing raw numbers."
                ),
                glossary([
                    {
                        term: "Low",
                        definition:
                            "Recent driving looks steady. No action needed. Check in on these vehicles during your normal weekly review.",
                    },
                    {
                        term: "Medium",
                        definition:
                            "Some early warning signs in the last 7 days, but nothing urgent. Worth a glance at the top reasons to see what is drifting.",
                    },
                    {
                        term: "High",
                        definition:
                            "The pattern of recent driving closely resembles vehicles that went on to have an unsafe day. A coaching recommendation is created automatically for these vehicles.",
                    },
                    {
                        term: "Critical",
                        definition:
                            "The strongest warning the system gives. These should be your first stop each morning. A coaching recommendation is created automatically and an alert is sent to your notification feed.",
                    },
                ]),
                text(
                    "The tier is shown as a coloured badge on the vehicle's Predictive Risk tab and as a small badge in the fleet table, so you can scan the whole list without opening each profile."
                ),
            ],
        },
        {
            id: "reading-the-top-reasons",
            title: "Reading the Top 3 Reasons",
            preview: "Why a vehicle scored the way it did",
            roles: MANAGER_AND_ADMIN,
            content: [
                text(
                    "A score on its own does not tell you what to do about it. Under every prediction you will find the three factors that pushed the score up the most, ranked by how much each one mattered."
                ),
                text("The factors the model looks at are:"),
                list([
                    "Average safety score over the recent period",
                    "Harsh events per trip, covering braking, acceleration and cornering",
                    "Speeding ratio, meaning how much of the driving was above the threshold",
                    "Distance driven over the week",
                    "Days since the last recorded trip",
                ]),
                text(
                    "Each reason is written in plain language, for example \"Frequent harsh events\" or \"High weekly distance,\" so you can go straight to the conversation you need to have with the driver."
                ),
            ],
        },
        {
            id: "unexpected-risk-scores",
            title: "When a Score Looks Wrong",
            preview: "Quiet vehicles, new vehicles and missing data",
            roles: MANAGER_AND_ADMIN,
            content: [
                text(
                    "A few situations produce scores that look surprising at first but are working correctly."
                ),
                list([
                    "A vehicle that has not moved recently scores low. With no recent trips there is no risky behaviour to learn from, so the system treats it as inactive rather than dangerous.",
                    "A brand new vehicle with little history will also sit low until it has built up enough recent driving to score against.",
                    "A vehicle with no completed trips in the last 30 days is treated as inactive, and its trip based factors fall back to neutral values.",
                ]),
                callout(
                    "A low risk score on a parked vehicle is not a clean bill of health. It only means the system has nothing recent to go on."
                ),
            ],
        },
        {
            id: "how-accurate-is-the-forecast",
            title: "How Accurate Is the Forecast?",
            preview: "What the model gets right and where to be careful",
            roles: MANAGER_AND_ADMIN,
            content: [
                text(
                    "On data the model had never seen during training, it correctly ranks a genuinely unsafe vehicle above a genuinely safe one about 90.6 percent of the time. For comparison, simply assuming tomorrow will look like today gets this right 88.2 percent of the time."
                ),
                text(
                    "That makes the forecast a useful way to order your attention across the fleet, but it is not a guarantee about any single vehicle. Treat a High or Critical score as a prompt to look closer, not as proof that something will go wrong."
                ),
                callout(
                    "Use the risk score to decide who to check on first. Use the top reasons and the vehicle's trip history to decide what to actually say."
                ),
            ],
        },
        {
            id: "recalculating-risk",
            title: "Recalculating Risk Manually",
            preview: "Refreshing predictions outside the daily run",
            roles: ADMIN_ONLY,
            content: [
                text(
                    "Predictions normally refresh once a day at 03:00. Admins can trigger a fresh run at any time using the Recalculate Risk button on the Fleet Risk page."
                ),
                text(
                    "This is useful after the model has been retrained, after a change to the underlying data, or when you need current numbers for a review straight away. When the run finishes you will see a summary of how many vehicles were scored and how many alerts were raised, and the page refreshes with the new predictions."
                ),
                list([
                    "Running it more than once in a day updates the existing predictions rather than creating duplicates.",
                    "If a run is already in progress, the system tells you instead of starting a second one.",
                    "Fleet Managers and Viewers do not see this button and cannot trigger a run.",
                ]),
                callout(
                    "If you see an error saying no trained model is available, the model needs to be trained before predictions can run. Contact whoever maintains your deployment."
                ),
            ],
        },
      ],
    },
    {
        id: "custom-alerts",
        title: "Custom Alerts",
        icon: "bell",
        roles: MANAGER_AND_ADMIN,
        articles: [
        {
            id: "creating-a-custom-alert",
            title: "Creating an Alert",
            preview: "Set a rule and start monitoring",
            roles: MANAGER_AND_ADMIN,
            content: [
                text(
                    "Go to the Custom Alerts tab, click Create Alert, pick one condition type, set its values, choose the fleet group it applies to, and give it a name. Monitoring starts as soon as you save."
                ),
                list([
                    "Speed threshold - a vehicle goes above a set speed",
                    "Time restriction - a vehicle runs outside your allowed hours or days",
                    "Repeated unsafe events - a set number of harsh events within a rolling time window",
                    "Safety score drop - a vehicle's score falls below a set value",
                    "Trip duration - a single trip or a day's total driving runs too long",
                ]),
                callout(
                    "You can only scope an alert to a fleet group you manage, and it will only ever fire for vehicles in that group."
                ),
            ],
        },
        {
            id: "when-an-alert-fires",
            title: "When an Alert Fires",
            preview: "Acknowledging and resolving",
            roles: MANAGER_AND_ADMIN,
            content: [
                text(
                    "A triggered alert shows the vehicle, what was breached, the recorded value against your threshold, and the time. Acknowledge it to mark it as seen, then open Details for the location, the rule that fired, and a link to the vehicle. Mark it Resolved once you have acted."
                ),
                callout(
                    "Resolved alerts stay in the feed in a muted state rather than disappearing, so you keep the history."
                ),
                text(
                    "If the same vehicle breaches the same rule repeatedly in a few minutes, you get one alert rather than a stream of them." 
                ),
            ],
        },
        {
            id: "managing-your-alerts",
            title: "Editing, Pausing & Deleting",
            preview: "Changing a rule after you have made it",
            roles: MANAGER_AND_ADMIN,
            content: [
                list([
                    "Edit - opens the rule pre-filled. Changes apply to data received after you save, not backwards.",
                    "Deactivate - stops monitoring but keeps the rule in your list to switch back on later.",
                    "Delete - removes the rule permanently. Alerts it already triggered stay in your history.",
                ]),
                callout(
                    "If a save is rejected, check for a missing threshold, an end time earlier than the start time, or no fleet group selected."
                ),
            ],
        },
      ],
    },
];

export function getHelpMenuForRole(role) {
    return helpMenuData
        .filter((category) => category.roles.includes(role))
        .map((category) => ({
            ...category,
            articles: category.articles.filter((article) => article.roles.includes(role)),
        }));
}