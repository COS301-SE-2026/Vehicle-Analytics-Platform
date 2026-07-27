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

import { preview } from "vite";

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