/**
 * Help Menu Content Data 
 * 
 * Schema:
 * category: {id, title, icon, roles: [], articles: [] }
 * articles: { id, title, preview, roles: [], content: [] }
 * 
 * Content block types:
 * { type: 'text', 'text' }
 * { type: 'list', items: [] }
 * { type: 'image', src, alt }
 * { type: 'table', headers: [], rows: [[...]] }
 */

export const ROLES = {
    VIEWER: "viewer",
    FLEET_MANAGER: "fleet_manager",
    ADMIN: "admin",
}

export const helpMenuData = [
    {
        id: "getting-started",
        title: "Getting Started",
        icon: "compass",
        roles: [ROLES.VIEWER, ROLES.FLEET_MANAGER, ROLES.ADMIN],
        articles: [
            {
                id: "welcome-role-overview",
                title: "Welcome & Role overview",
                preview: "Understand the core functionality for your role",
                roles: [ROLES.VIEWER, ROLES.FLEET_MANAGER, ROLES.ADMIN],
                content: [
                    {
                        type: "text",
                        text: "Welcome to V.A.P.O.R. To ensure your organisation operates efficiently, access is partitioned into 3 distinct roles. Each role is designed to provide the specific tools needed for your daily task without unnecessary complexity",
                    },
                    {
                        type: "table",
                        headers: ["features", "Viewer", "Fleet Manager", "Admin"],
                        rows: [
                            ["Data visualisation", true, true, true],
                            ["User Management", false, false, true],
                            ["Geofencing", false, true, false],
                        ],
                    },
                    {
                        type: "text",
                        text: "If something you expected to see is missing from a menu, it's usually tied to a role above yours. Ask your Admin if you think you need access.",
                    },
                ],
            },
            {
                id: "dashboard-tour",
                title: "Dashboard Tour",
                preview: "A visul walkthrough of the main sections",
                roles: [ROLES.VIEWER, ROLES.FLEET_MANAGER, ROLES.ADMIN],
                content: [
                    {
                        type: "list",
                        items: [
                            "Vehicles - a live list of all vehicles, with status and safety score.",
                            "Analytics - fleet-wide trends, rankings, and event breakdowns over daily or weekly periods.",
                            "Geofencing - the interactive map where you define zones and monitor entry/exit activity.",
                        ],
                    },
                    {
                        type: "text",
                        text: "Start with Vehicles if you want to check on a specific vehicle or Dashboard if you want a bigger picture.",
                    },
                ],
            },
            {
                id: "logging-in-sessions",
                title: "Logging In & Sessions",
                preview: "Secure authentication practices and session handling",
                roles: [ROLES.VIEWER, ROLES.FLEET_MANAGER, ROLES.ADMIN],
                content: [
                    {
                        type: "text",
                        text: "Log in with the email and password you registered with. If your credentials are incorrect, you'll see an error message and stay on the login page. Double check for typos and try again.",
                    },
                    {
                        type: "callout",
                        text: "If you see a message saying your account has been deactivated, contact your organisation's Admin to have it reactivated.",
                    },
                    {
                        type: "text",
                        text: "You can Log out at anytime from the account menu at the of the Navigation Bar",
                    },
                ],
            },
        ],
    },
    {
        id: "understanding-your-data",
        title: "Understanding Your Data",
        icon: "bar-chart",
        roles: [ROLES.VIEWER, ROLES.FLEET_MANAGER, ROLES.ADMIN],
        articles: [
            {
                id: "safety-score",
                title: "Safety Score",
                preview: "How it's calculated",
                roles: [ROLES.VIEWER, ROLES.FLEET_MANAGER, ROLES.ADMIN],
                content: [
                    {
                        type: "text",
                        text: "Our Telementary Data captures hunderds of data points every second. This glossary helps you understand the core metrics used throughout the V.A.P.O.R system."
                    },
                    {
                        type: "glossary",
                        terms: [
                            {
                                term: "Safety Score",
                                definition: "Every vehicle starts each day at a score of 100. Each unsafe event detected - harsh braking, harsh acceleration ect - deduct points on that event's severity. The score resets to 100 every 24 hours, so it refelect the vehicles behavior for the current day rather than an all-time average.",
                            },
                        ],
                    },
                    {
                        type: "list",
                        items: [
                            "Harsh braking events",
                            "Harsh acceleration events",
                            "Harsh conering events",
                            "Crash detection events",
                            "Speeding threshold breaches"
                        ],
                    },
                    {
                        type: "text",
                        text: "More of these events in a day means a bigger drop from 100. The score updates automatically as new telemetry comes in, and resets fresh at the start of each 24-hour period."
                    },
                ],
            },
            {
                id: "what-counts-as-a-trip",
                title: "What counts as a trip",
                preview: "Why one vehicle can show multiple trips",
                roles: [ROLES.VIEWER, ROLES.FLEET_MANAGER, ROLES.ADMIN],
                content: [
                    {
                        type: "text",
                        text: "A trip starts the moment a vehicle's speed goes about 5 km/h, the movement metric is on, and the ignition is also on. It ends once the vehicle stay at or is below 5 km/h for 10 minutes and with the ignition off.",
                    },
                    {
                        type: "callout",
                        text: "One long drive with a big stop in the middle will show up as two seperate trips.That's expected, not a bug.",
                    },
                    {
                        type: "text",
                        text: "The same stationary period is also used to track rest breaks for fatigue detection"
                    },
                ],  
            },
            {
                id: "green-driving-breakdown",
                title: "Green Driving Breakdown",
                preview: "Per-trip counts of harsh events",
                roles: [ROLES.VIEWER, ROLES.FLEET_MANAGER, ROLES.ADMIN],
                content: [
                    {
                        type: "text",
                        text: "Under each trip, you will see a simple breakdown of three counts: harsh braking, hard acceleration, and harsh cornering. This tells you not just that a trip scored low, but which specific behaviour cause the drop.",
                    },
                ],
            },
            {
                id: "daily-vs-per-trip-scores",
                title: "Daily vs. Per-Trip Scores",
                preview: "Toggling between aggregation views",
                roles: [ROLES.FLEET_MANAGER,ROLES.ADMIN],
                content: [
                    {
                        type: "list",
                        items: [
                            "Per-trip view - a score for each individual trip.",
                            "Daily view - scores aggregated across a full day.",
                        ],
                    },
                    {
                        type: "text",
                        text: "Daily view is better for spotting patterns rather than reacting to a single rough trip.",
                    },
                ],
            },
            {
                id: "vehicle-profiles",
                title: "Vehicle Profiles",
                icon: "car",
                roles: [ROLES.FLEET_MANAGER, ROLES.ADMIN],
                articles: [
                    {
                        id: "current-trip-vs-history",
                        title: "Current Trip vs History Tabs",
                        preview: "What's live vs. historical",
                        roles: [ROLES.FLEET_MANAGER, ROLES.ADMIN],
                        content: [
                            {
                                type: "table",
                                headers: ["Current Trip", "History"],
                                rows: [
                                    [
                                        "Live GPS position, elapsed time, live event feed, real-time score.",
                                        "Every past trip with its score, plus the vehicle's overall average.",
                                    ],
                                ],
                            },
                            {
                                type: "callout",
                                text: "No active trip? The profile automatically shows History instead.",
                            },
                            {
                                type: "callout",
                                text: "No trip history available yet for this vehicle.",
                            },
                        ],
                    },
                    {
                        id: "expanding-a-past-trip",
                        title: "Expanding a Past Trip",
                        preview: "View the event timeline and route",
                        roles: [ROLES.FLEET_MANAGER, ROLES.ADMIN],
                        content: [
                            {
                                type: "text",
                                text: "Click any trip in the History tab to expand it. You'll see the full event timeline - each unsafe event with its type, timestamp, and location - plus the trip's replay drawn on the map with event locations marked along it.",
                            },
                        ],
                    },
                    {
                        id: "reading-the-vehicle-list",
                        title: "Reading the vehicle List",
                        preview: "What each column means",
                        roles: [ROLES.FLEET_MANAGER, ROLES.ADMIN],
                        content: [
                            {
                                type: "list",
                                items: [
                                    "Vehicle ID",
                                    "Current status (active, idle, offline)",
                                    "Current safety score",
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: "vehicle-status-changes",
                title: "Vehicle Status Changes",
                preview: "Active, Inactive, and Maintenance explained",
                roles: [ROLES.FLEET_MANAGER, ROLES.ADMIN],
                content: [
                    {
                        type: "glossary",
                        terms: [
                            {
                                term: "Active",
                                definition: "The vehicle is currently moving.",
                            },
                            {
                                term: "Idle",
                                definition: "The vehicle's engine is on, but the vehicle is not moving.",
                            },
                            {
                                term: "Offline",
                                definition: "The engine is off, or a vehicle is powered down and not transmitting.",
                            },
                        ],
                    },
                ],
            },
            {
                id: "geofencing",
                title: "Geofencing",
                icon: "map-pin",
                roles: [ROLES.FLEET_MANAGER, ROLES.ADMIN],
                articles: [
                    {
                        id: "creating-a-geofence-zone",
                        title: "Creating a Geofence Zone",
                        preview: "Step-by-step zone setup",
                        roles: [ROLES.FLEET_MANAGER, ROLES.ADMIN],
                        content: [
                            {
                                type: "list",
                                items: [    
                                    "Go to the Geofencing section",
                                    "Click the draw icon on the top left of the map",
                                    "Click points on the map to draw your zone's boundary",
                                    "Name the zone (e.g. \"Durban Port,\" \"Pretoria Depot\")",
                                    "Choose a trigger type: entry, exit, or both",
                                    "Save - monitoring starts immediately",
                                ],
                            },
                            {
                                type: "callout",
                                text: "If a vehicle is already inside the zone when you create it, no entry alerts fires for that vehicle - monitoring only applies going foward.",
                            },
                        ],
                    },
                    {
                        id: "entry-exit-triggers",
                        title: "Entry & Exit Triggers",
                        preview: "How breach alerts work",
                        roles: [ROLES.ADMIN, ROLES.FLEET_MANAGER],
                        content: [
                            {
                                type: "text",
                                text: "When a vehicle crosses a zone boundary, you will get an aler showing the vehicle ID, zone name, whether it entered or exited, and the timestamp. Click the alert to acknowledge it.",
                            },
                        ],
                    },
                    {
                        id: "editing-deleting-zones",
                        title: 'Editing & Deleting Zones',
                        preview: "Adjust boundaries and settings",
                        roles: [ROLES.ADMIN, ROLES.FLEET_MANAGER],
                        content: [
                            {
                                type: "text",
                                text: "Select any existing zone to adjust its boundary or trigger settings. Deleting a zone stops monitiring immediately - vehicles inside it at the time won't trigger an exit alert.",
                            },
                        ],
                    },
                    {
                        id: "zone-level-event-tallies",
                        title: "Zone-Level Event Tallies",
                        preview: "Spotting hight-risk locations",
                        roles: [ROLES.ADMIN, ROLES.FLEET_MANAGER],
                        content: [
                            {
                                type: "text",
                                text: "Every unsafe event that happens inside a zone gets added to that zone's own event count. Over time, this lets you compare zones side by side and spot which locations produce the most risky driving.",
                            },
                        ],
                    },
                ],
            },
            {
                id: "trip-replay",
                title: "Trip Replay",
                icon: "play-circle",
                roles: [ROLES.ADMIN, ROLES.FLEET_MANAGER],
                articles: [
                    {
                        id: "Understanding-speed-overlay",
                        title: "Understanding speed overlay",
                        preview: "What green, amber, and red mean",
                        roles: [ROLES.FLEET_MANAGER, ROLES.ADMIN],
                        content: [
                            {
                                id: "glossary",
                                terms: [
                                    { term: "Green", definition: "Safe speed"},
                                    { term: "Amber", definition: "Elevated speed"},
                                    { term:"Red", definition: "Speeding"},
                                ],
                            },
                            {
                                type: "text",
                                text: "Markers apper along the route whenever an unsafe event was recorder, and clicking Play animated the vehicle moving along its actual path.",
                            },
                        ],
                    },
                    {
                        id: "using-playback-controls",
                        title: "Using playback controls",
                        preview: "Play, pause, and scrub",
                        roles: [ROLES.FLEET_MANAGER,ROLES.ADMIN],
                        content: [
                            {
                                type: "text",
                                text: "Use, Play, Pause, and scrubber bar to move any point in the trip, When playback reached an event marker, the event's details appear in a panel next to the map.",
                            },
                        ],
                    },
                    {
                        id: "why-replay-may-be-unavailable",
                        title: "Why Replay May Be Unavailable",
                        preview: "Static map fallback for short trips",
                        roles: [ROLES.FLEET_MANAGER, ROLES.ADMIN],
                        content: [
                            {
                                type: "callout",
                                text: "Replay isn;t available for this trip - showing a static route map instead.",
                            },
                            {
                                type: "text",
                                text: "Very short trips sometimes do not have enough recorded telemetry points for smooth animated playback.",
                            },
                        ],
                    },
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