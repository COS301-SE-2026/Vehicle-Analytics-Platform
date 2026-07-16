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

# 4. Manager Guide

Managers have access to all Viewer functionality together with operational analytics.

The Manager Dashboard includes:

- Active vehicles
- Total distance today
- Registered users
- Data feed status

Additional operational widgets include:

- FLeet status
- Most active vehicles today
- Recent vehicle events
- Fleet activity today

These components update automcatically as anew telemetry data is received.

<!-- **Figure 6: Manager Dashboard page ** //placeholder until all the pages are completed to be able to screenshot -->

---

# 5. Administrator Guide

Administrators have unrestricted access to platform management features.

Administrators can:

- Add users 
- Edit user information 
- Assign user roles
- Deactivate user accounts
- Export user information 
- Monitor fleet performance

---

## 5.1 User Management 

The User Management table provides an overview of all registered users.

The table includes :
- Name
- Email
- Role
- Status
- Last Active
- Available Actions

<!-- **Figure 7: Admin Dashboard page ** //placeholder until all the pages are completed to be able to screenshot -->

---
### 5.2 Editing User Roles

Selecting `Edit` opens the User Role Assingnment window.

### Steps

1. Select a new role from the dropdown menu.
2. Review the permissions associated with that role.
3. Click **Save Changes**.

If the **Administrator** role is selected, the system displays an additional warning before confirming the changes.

Selecting **Cancel** closes the dialog without saving any modifications.

<!-- **Figure 8: User role assignment model ** //placeholder until all the pages are completed to be able to screenshot -->

---

# 6. Live Fleet Tracking

The Live Fleet Tracking interface provides a comprehensive geographic overview of the fleet.

Users can:

- Monitor live vehicle locations
- Identify offline vehicles
- Monitor active alerts
- View fleet movement statistics
- Inspect individual vehicle information

Vehicle telemetry updates automatically as new information is received by the platform.

---
# 7. Troubleshooting

## 7.1 Common Issues

### 7.1.1 Unable to Log In

If you are unable to access your account:

- Ensure your email address and password are entered correctly.
- Check that your email address has been verified.
- If you have forgotten your password, use the **Forgot Password** option on the login page.
- If the problem persists, contact your system administrator.

---

### 7.1.2 Verification Code Expired

Email verification codes are only valid for a limited time.

If your code has expired:

- Select **Resend Code** to receive a new verification email.
- Check your spam or junk folder if the email does not arrive within a few minutes.
- Ensure you are entering the most recently received verification code.

---

### 7.1.3 Live Map Not Displaying

If the Live Fleet Map does not load correctly:

- Verify that you have a stable internet connection.
- Refresh the webpage.
- Try opening the application in a supported browser such as Google Chrome or Microsoft Edge.

---

### 7.1.4 Vehicle Information Not Updating

If vehicle locations or telemetry information appear outdated:

- Wait a few moments for the next telemetry update.
- Refresh the dashboard.
- Confirm that the vehicle's telemetry device is online and transmitting data.
- Contact your fleet administrator if the issue persists.

---

### 7.1.5 Unable to Manage Users

If the **User Management** section is unavailable or editing options are disabled:

- Verify that you are logged in using an **Administrator** account.
- Refresh the page and try again.
- If your permissions have recently changed, log out and log back in.

---

### 7.1.6 Dashboard Data Not Loading

If dashboard cards or charts remain empty:

- Check your internet connection.
- Refresh the dashboard.
- Wait a few moments while data is retrieved from the server.
- Contact your system administrator if the issue continues.

---

# 8. Frequently Asked Questions

### Why can't I access the Manager Dashboard?

Your account may not have the necessary permissions. Contact an Administrator to request the appropriate role.

---

### How often is fleet information updated?

Vehicle telemetry is updated in near real time as new data is received from connected vehicles.

---

### Can Viewers modify fleet information?

No. Viewer accounts have read-only access to the platform.

---

### What happens if my verification code expires?

Click **Resend Code** to receive a new verification code via email.

---

# 9. Contact Information

For technical support, feature requests, or general enquiries, please contact the system administrators.

**Email:** kilimanjaro.capstone@gmail.com

**Developed by:** Team Kilimanjaro StoneCap