# V.A.P.O.R - User Manual

<!-- NOTE : this is just a working draft on the current wireframes and we MUST update this when all the pages are completed and working-->
<!-- Based off of the current pages -->
**Version:** 1.1 (Temporary)

## Welcome to the user manual for the Vehicle Analytics Platform (V.A.P.O.R), a cloud-based fleet management and analytics system.

# Contents

1. Introduction
2. Getting Started
   - 2.1 Creating an Account
   - 2.2 Verifying Your Email
   - 2.3 Logging In
3. Viewer Guide
   - 3.1 Viewer Dashboard
   - 3.2 Live Fleet Map
4. Manager Guide
5. Administrator Guide
   - 5.1 User Management
   - 5.2 Editing User Roles
6. Live Fleet Tracking
7. Troubleshooting
8. Frequently Asked Questions
9. Contact Information


---
# 1. Introduction

## Purpose

V.A.P.O.R is a web-based fleet monitoring system designed to provide organizations with real-time visibility into their vehicle fleets. The platform enables users to monitor live vehicle locations, view fleet analytics, manage users, and oversee operational performance through an intuitive dashboard interface.

The platform implements role-based access control, ensuring that users only have access to features relevant to their responsibilities.

The system supports three user roles:

- **Viewer** - Monitors fleet information through read-only dashboards.
- **Manager** - Monitors fleet operations and analytics.
- **Administrator** - Manages users, permissions, and system administration.

---

# 2. Getting Started

## 2.1 Creating an Account

New users can create an account using their email address or Google Sign-In.

### Steps

1. Open the **Registration** page.
2. Enter the following information:
    - Full Name
    - Email Address 
    - Password 
    - Confirm Password
3. Accept the Terms and Privacy Policy.
4. Click **Create Account**.

The system validates the password strength before creating the account.

<!-- **Figure 1: Registration Page** //placeholder until all the pages are completed to be able to screenshot -->

---
## 2.2 Verifying Your Email

After registration, a six-digit One-Time Password (OTP) is sent to the registered email address.

### Steps
1. Enter the six-digit verification code.
2. Click `Verify Account`.
3. If the code expires, click `Resend the code`.

Once verification is successful, the account is activated and can be used to log into the system.

<!-- **Figure 2: Email verification Page** //placeholder until all the pages are completed to be able to screenshot -->

---

### 2.3 Logging In

Existing users can log into the system using either :
- Email and password
- Google authentication

### Steps

1. Enter your email address and password.
2. Click **Sign in to Dashboard**.
3. Alternatively, select **Continue with Google**.

After successful authentication, users are redirected to the dashboard associated with their assigned role.

<!-- **Figure 3: Login page ** //placeholder until all the pages are completed to be able to screenshot -->

---

#3. Viewer Guide

The **Viewer** role provides read-only access to fleet information and live vehicle tracking.

Viewers can:

- Monitor active vehicles
- View fleet performance indicators
- Monitor vehicle status
- Access the live fleet map
- View real-time vehicle locations

Viewers cannot:

- Modify system settings
- Edit users
- Change user permissions

---

## 3.1 Viewer Dashboard

The Viewer Dashboard provides an overview of fleet activity.

The dashboard contains:

- Active vehicles KPI
- Total distance traveled today
- Live fleet map
- Vehicle status chart

Users can zoom and pan around the map to inspect vehicle positions.

<!-- **Figure 4: Viewer dashboard page ** //placeholder until all the pages are completed to be able to screenshot -->

## 3.2 Live Fleet Map

Selecting **Live Map** from the navigation sidebar opens a dedicated tracking interface.

The Live Fleet Map allows users to:

- View live vehicle locations
- View fleet summary statistics
- Monitor moving, idle, and offline vehicles
- View detailed information for a selected vehicle

Selecting a vehicle marker displays : 
- Current speed
- Current location
- Trip duration
- Distance traveled today

<!-- **Figure 5: Live Fleet map page ** //placeholder until all the pages are completed to be able to screenshot -->