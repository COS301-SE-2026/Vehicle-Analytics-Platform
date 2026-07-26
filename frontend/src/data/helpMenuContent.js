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