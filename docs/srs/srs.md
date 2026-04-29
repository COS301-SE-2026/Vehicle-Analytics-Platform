# Software Requirements Specification (SRS)
## Vehicle Analytics Platform

## 1. User Stories (US)

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
* **Technical Note:** The initial System Administrator account will be provisioned directly via database seeding during deployment.

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

### US05: View Driver Safety Score

**As a** fleet manager  
**I want to** view a safety score for each driver in my fleet  
**So that** I can identify dangerous drivers and take action before an incident occurs.

**Acceptance Criteria:**
* Each vehicle/driver has a visible safety score.
* Score is calculated based on speeding, harsh braking and rapid acceleration.
* Fleet manager can click on a driver to see a breakdown of their score.
* Score updates as new telemetry data comes in.
* Low scoring drivers are visually highlighted as a warning.

---

### US06: View Fleet Dashboard and KPIs

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

## 2. Use Cases (UC)

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
4. System validates the credentials against the database.
5. System identifies the user's role from the database.
6. System generates a JWT token containing the user's role.
7. **If Admin:** Redirected to admin dashboard with full system controls.
8. **If Fleet Manager:** Redirected to fleet dashboard with full analytics and management.
9. **If Viewer:** Redirected to read-only dashboard.

**Alternate Flows:**
* **Incorrect Credentials:** If credentials are incorrect, the system displays an error message and the user remains on the login page.
* **Account Deactivated:** If the account has been deactivated, the system displays a message telling the user to contact their administrator.

**Post-conditions:** The user is authenticated with a valid JWT session scoped to their role.

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
5. System updates the user's role in the database.
6. System confirms the change with a success message.
7. The updated role takes effect on the affected user's next login.

**Alternate Flows:**
* **Self-role Change Attempt:** If the Admin attempts to change or remove their own Admin role, the system rejects the action and displays an error message.
* **No Other Users:** If no other user accounts exist, the system displays an empty state message.

**Post-conditions:** The selected user's role has been updated and will be enforced on their next login session.

---

### UC04: View Live Vehicle Map

**Actor:** Fleet Manager

**Description:** A logged in fleet manager views a live interactive map showing the real time positions of all vehicles in their fleet, updated every 5-10 seconds from the AWS Kinesis data stream.

**Pre-conditions:**
* The fleet manager is logged in with a valid session.
* Vehicle telemetry data is being streamed via AWS Kinesis.
* At least one vehicle is active and transmitting data.

**Main Flow:**
1. Fleet manager navigates to the live map page.
2. System fetches the latest vehicle positions from the data pipeline.
3. System renders the interactive map with vehicle markers at their current positions.
4. Map automatically refreshes vehicle positions every 5-10 seconds.
5. Fleet manager can zoom, pan and interact with the map.
6. Fleet manager clicks on a vehicle marker to see basic vehicle information.

**Alternate Flows:**
* **No Active Vehicles:** If no vehicles are currently active, the map displays an empty state message.
* **Stream Unavailable:** If the data stream is unavailable, the system displays the last known positions with a warning.

**Post-conditions:** The fleet manager has an up to date view of all vehicle locations.

---

### UC05: View Driver Safety Score

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

---

### UC06: View Fleet Dashboard and KPIs

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

**Post-conditions:** The fleet manager has a clear and current overview of their entire fleet's performance.# Software Requirements Specification (SRS)
## Vehicle Analytics Platform

## 1. User Stories (US)

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
* **Technical Note:** The initial System Administrator account will be provisioned directly via database seeding during deployment.

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

### US05: View Driver Safety Score

**As a** fleet manager  
**I want to** view a safety score for each driver in my fleet  
**So that** I can identify dangerous drivers and take action before an incident occurs.

**Acceptance Criteria:**
* Each vehicle/driver has a visible safety score.
* Score is calculated based on speeding, harsh braking and rapid acceleration.
* Fleet manager can click on a driver to see a breakdown of their score.
* Score updates as new telemetry data comes in.
* Low scoring drivers are visually highlighted as a warning.

---

### US06: View Fleet Dashboard and KPIs

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

## 2. Use Cases (UC)

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
4. System validates the credentials against the database.
5. System identifies the user's role from the database.
6. System generates a JWT token containing the user's role.
7. **If Admin:** Redirected to admin dashboard with full system controls.
8. **If Fleet Manager:** Redirected to fleet dashboard with full analytics and management.
9. **If Viewer:** Redirected to read-only dashboard.

**Alternate Flows:**
* **Incorrect Credentials:** If credentials are incorrect, the system displays an error message and the user remains on the login page.
* **Account Deactivated:** If the account has been deactivated, the system displays a message telling the user to contact their administrator.

**Post-conditions:** The user is authenticated with a valid JWT session scoped to their role.

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
5. System updates the user's role in the database.
6. System confirms the change with a success message.
7. The updated role takes effect on the affected user's next login.

**Alternate Flows:**
* **Self-role Change Attempt:** If the Admin attempts to change or remove their own Admin role, the system rejects the action and displays an error message.
* **No Other Users:** If no other user accounts exist, the system displays an empty state message.

**Post-conditions:** The selected user's role has been updated and will be enforced on their next login session.

---

### UC04: View Live Vehicle Map

**Actor:** Fleet Manager

**Description:** A logged in fleet manager views a live interactive map showing the real time positions of all vehicles in their fleet, updated every 5-10 seconds from the AWS Kinesis data stream.

**Pre-conditions:**
* The fleet manager is logged in with a valid session.
* Vehicle telemetry data is being streamed via AWS Kinesis.
* At least one vehicle is active and transmitting data.

**Main Flow:**
1. Fleet manager navigates to the live map page.
2. System fetches the latest vehicle positions from the data pipeline.
3. System renders the interactive map with vehicle markers at their current positions.
4. Map automatically refreshes vehicle positions every 5-10 seconds.
5. Fleet manager can zoom, pan and interact with the map.
6. Fleet manager clicks on a vehicle marker to see basic vehicle information.

**Alternate Flows:**
* **No Active Vehicles:** If no vehicles are currently active, the map displays an empty state message.
* **Stream Unavailable:** If the data stream is unavailable, the system displays the last known positions with a warning.

**Post-conditions:** The fleet manager has an up to date view of all vehicle locations.

---

### UC05: View Driver Safety Score

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

---

### UC06: View Fleet Dashboard and KPIs

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