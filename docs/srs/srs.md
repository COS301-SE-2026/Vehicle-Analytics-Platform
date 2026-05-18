# Software Requirements Specification (SRS)

## Vehicle Analytics Platform

## Introduction 

 The business need for this application stems from the fact that modern fleet management requires far more than simple location tracking. While raw GPS and speed data provide a basic map, fleet operators need a system that translates raw, continuous vehicle data, like harsh braking and speeding, into actionable insights so they can actively improve driver safety, optimize their operations, and cut costs. Currently, without this level of analysis, unsafe behaviors often go undetected, leaving managers in a reactive cycle where they only address issues after an incident has already occurred. This platform turns that underutilized telemetry into a proactive tool for smarter, faster decision-making. 

 To solve this problem, the project focuses on developing a cloud-based Vehicle Analytics Platform for FuseIT, deployed entirely on AWS. The system will process live telemetry data from 50 different vehicles though AWS Kinesis streams and use serverless AWS services to analyse driver behaviour in real time. The overall goal is to transform raw vehicle data into meaningful insights that help fleet managers make faster, smarter, and safer operational decisions.

## 1. Functional Requirements (FR)

### UC04 — Live Vehicle Mapping

- **FR-4.1:** The system shall display the current GPS position of all active vehicles on an interactive map.
- **FR-4.2:** The system shall update vehicle positions on the map within 10 seconds of receiving a telemetry event.
- **FR-4.3:** The system shall display a minimum of 50 concurrently tracked vehicles without performance degradation.
- **FR-4.4:** The system shall visually distinguish between active and inactive vehicles on the map.
- **FR-4.5:** The system shall allow the fleet manager to click a vehicle marker to view its current speed and status.
- **FR-4.6:** The system shall centre the map on the fleet manager's monitored fleet by default on login.

### UC05 — Fleet Dashboard and Analytics

- **FR-5.1:** The system shall display a KPI summary showing total active vehicles, average fleet speed, and total unsafe events.
- **FR-5.2:** The system shall display a time-series chart of vehicle speed over a selectable time range.
- **FR-5.3:** The system shall display a ranked list of drivers ordered by safety score from lowest to highest.
- **FR-5.4:** The system shall display a breakdown of unsafe driving events by type — speeding, harsh braking, rapid acceleration.
- **FR-5.5:** The system shall allow the fleet manager to filter dashboard data by individual vehicle or entire fleet.
- **FR-5.6:** The system shall display the timestamp of the last telemetry update for each vehicle.
- **FR-5.7:** The system shall refresh dashboard data automatically without requiring a manual page reload.

## 2. User Stories (US)

### US01: User Registration

**As a** new user  
**I want to** create an account using my name, email, and password  
**So that** I can access the vehicle analytics platform.

**Acceptance Criteria:**
* User can fill in a registration form with name, email, and password.
* System validates that all fields are filled in correctly.
* System rejects duplicate email addresses.
* User receives confirmation that their account was created.
* Passwords must meet minimum security requirements.
* All self-registered accounts are assigned the **Viewer** role by default.
* Users cannot select or request a role during registration.
* **Fleet Manager** and **Admin** roles can only be assigned by an existing Admin.
* **Technical Note:** The initial System Administrator account will be provisioned directly via an AdminCreateUser API call during AWS infrastructure deployment.

---

### US02: User Login

**As a** registered user  
**I want to** log into the platform using my email and password  
**So that** I can securely access my fleet's data and dashboards.

**Acceptance Criteria:**
* User can enter their email and password to log in.
* System rejects incorrect credentials with an error message.
* System identifies the user's role after authentication and redirects accordingly:
    * **Admin:** Redirected to full admin dashboard with system controls.
    * **Fleet Manager:** Redirected to fleet dashboard with full analytics.
    * **Viewer:** Redirected to a read-only dashboard.
* User session is managed using JWT.
* User can log out at any time.

---

### US03: Admin Role Management

**As an** Admin  
**I want to** assign and change user roles  
**So that** I can control which users have access to fleet management features.

**Acceptance Criteria:**
* Admin can view a list of all registered users and their current roles.
* Admin can promote a Viewer to Fleet Manager.
* Admin can demote a Fleet Manager to Viewer.
* Admin can deactivate any user account.
* Admin cannot change or remove their own Admin role.
* Role changes take effect on the affected user's next login.

---

### US04: View Live Vehicle Map

**As a** fleet manager  
**I want to** see all my vehicles displayed on a live interactive map  
**So that** I can monitor where every vehicle in my fleet is at any given moment.

**Acceptance Criteria:**
* Map displays all active vehicles as markers in real time.
* Vehicle positions update automatically every 5-10 seconds.
* Each vehicle marker is clickable to see basic vehicle info.
* Map is interactive and allows a user to zoom in, out and pan around the map.
* Map remains responsive and does not freeze during updates.

---

### US05: View Fleet Dashboard and KPIs

**As a** fleet manager  
**I want to** see a summary dashboard showing key metrics about my entire fleet  
**So that** I can quickly understand the overall performance and health of my fleet at a glance.

**Acceptance Criteria:**
* Dashboard displays total number of active vehicles.
* Dashboard shows average fleet safety score.
* Dashboard shows number of safety alerts triggered today.
* All metrics update in near real time.
* Dashboard loads within 3 seconds.

---

## 3. Use Cases (UC)

### UC01: User Registration

**Actor:** New User

**Description:** A new user creates an account on the platform by providing their name, email address and password. All self-registered accounts are assigned the Viewer role by default.

**Pre-conditions:**
* The user does not already have an account.
* The registration page is accessible.

**Main Flow:**
1. User navigates to the registration page.
2. User fills in their name, email address and password.
3. User submits the registration form.
4. System validates all fields are correctly filled in.
5. System checks that the email address is not already registered.
6. System creates the new account and securely stores the password.
7. System assigns the **Viewer** role to the new account by default.
8. System redirects the user to the login page with a success message.

**Alternate Flows:**
* **Duplicate Email:** If the email is already registered, the system displays an error message telling the user to log in or use a different email.
* **Validation Failure:** If any field fails validation, the system highlights the invalid field and displays a helpful error message.
* **Role Escalation Attempt:** If any request attempts to set a role other than Viewer during registration (e.g. via API manipulation), the system ignores the role field and enforces the Viewer default.

**Post-conditions:** A new Viewer account exists in the system and the user can now log in.

**Diagram:**

![User Registration Use Case](./images/uc_user_reg.svg)

---

### UC02: User Login

**Actor:** Registered User (Admin, Fleet Manager, or Viewer)

**Description:** A registered user logs into the platform using their email and password. The system authenticates them and redirects them to the appropriate dashboard based on their assigned role.

**Pre-conditions:**
* The user has an existing account with an assigned role.
* The login page is accessible.

**Main Flow:**
1. User navigates to the login page.
2. User enters their email address and password.
3. User clicks the login button.
4. System authenticates the credentials against the AWS Cognito Identity Provider.
5. System receives the JWT token from Cognito, which contains the user's assigned role.
6. **If Admin:** Redirected to admin dashboard with full system controls.
7. **If Fleet Manager:** Redirected to fleet dashboard with full analytics and management.
8. **If Viewer:** Redirected to read-only dashboard.

**Alternate Flows:**
* **Incorrect Credentials:** If credentials are incorrect, the system displays an error message and the user remains on the login page.
* **Account Deactivated:** If the account has been deactivated, the system displays a message telling the user to contact their administrator.

**Post-conditions:** The user is authenticated with a valid JWT session scoped to their role.

**Diagram:**

![User Login Use Case](./images/uc_user_login.svg)

---

### UC03: Admin Role Management

**Actor:** Admin

**Description:** An Admin views all registered users and assigns or changes their roles to control access to fleet management features.

**Pre-conditions:**
* The Admin is logged in with a valid session.
* At least one other user account exists in the system.

**Main Flow:**
1. Admin navigates to the user management section of the admin dashboard.
2. System retrieves and displays a list of all registered users with their current roles.
3. Admin selects a user to modify.
4. Admin assigns a new role (Viewer or Fleet Manager) or deactivates the account.
5. System updates the user's assigned Cognito User Group.
6. System confirms the change with a success message.
7. The updated role takes effect on the affected user's next login.

**Alternate Flows:**
* **Self-role Change Attempt:** If the Admin attempts to change or remove their own Admin role, the system rejects the action and displays an error message.
* **No Other Users:** If no other user accounts exist, the system displays an empty state message.

**Post-conditions:** The selected user's role has been updated and will be enforced on their next login session.

**Diagram:**

![Admin Role Management Use Case](./images/uc_admin_role.svg)

---

### UC04: View Driver Safety Score

**Actor:** Fleet Manager

**Description:** A fleet manager views the safety score of a specific driver, calculated from telemetry data including speeding, harsh braking and rapid acceleration.

**Pre-conditions:**
* The fleet manager is logged in with a valid session.
* Telemetry data has been received and processed for the selected vehicle.
* The driver safety scoring algorithm has run on the available data.

**Main Flow:**
1. Fleet manager navigates to the driver safety section or clicks a vehicle on the map.
2. System retrieves the safety score for the selected driver from the database.
3. System displays the overall safety score prominently.
4. System displays a breakdown showing speeding, harsh braking, and rapid acceleration events.
5. System visually highlights drivers with low scores as a warning.
6. Fleet manager can view the score history over time.

**Alternate Flows:**
* **Insufficient Data:** If insufficient telemetry data exists, the system indicates the score cannot yet be calculated.

**Post-conditions:** The fleet manager has a clear view of the selected driver's safety performance.

**Diagram:**

![Driver Safety Score Use Case](./images/uc_safety_score.svg)

---

### UC05: View Fleet Dashboard and KPIs

**Actor:** Fleet Manager

**Description:** A fleet manager views a high level summary dashboard showing key performance indicators for their entire fleet.

**Pre-conditions:**
* The fleet manager is logged in with a valid session.
* Telemetry data has been received and processed for at least one vehicle.

**Main Flow:**
1. Fleet manager logs in and is redirected to the main dashboard.
2. System retrieves aggregated fleet data from the database.
3. System displays total number of active vehicles.
4. System displays the average safety score across all drivers.
5. System displays the number of safety alerts triggered today.
6. Dashboard data refreshes automatically in near real time.
7. Fleet manager can click on any KPI card to drill down into more detail.

**Alternate Flows:**
* **No Data:** If no telemetry data is available yet, the dashboard displays zeros with a "waiting for data" message.

**Post-conditions:** The fleet manager has a clear and current overview of their entire fleet's performance.

**Diagram:**

![Fleet Dashboard Use Case](./images/uc_fleet_dashboard.svg)