---
document_id: MAN-ADM-01
version: "1.0"
language: en
translation_of: lv
status: draft
applies_to: "MVX V0.0"
mode: admin
source_revision: TBD
last_reviewed: TBD
public: false
requires_acceptance: false
---

# MVX V0.0 Admin Mode Manual

> **Translation notice:** this is a controlled translation of the Latvian master. If the meanings differ, the Latvian version prevails.

## 1. About this manual

This manual explains the MVX V0.0 functions available in **Admin Mode**. It is intended for users with the technical role `admin`.

Admin Mode can be used to manage users and apartments, water meters and readings, announcements, monthly reports, contact information shown to users, and other system settings.

The manual describes only user-visible actions in MVX V0.0. It does not replace legal documents, incident recovery procedures, or technical infrastructure documentation, and it does not describe features planned for later versions.

> **Important:** administrative actions can affect multiple users and historical data. Before saving, always check the selected facility, user, apartment, meter, period, and environment.

## 2. Opening MVX and selecting a language

Open the MVX address provided for the facility being administered. On the login page, check:

- the facility name;
- the environment if a **TEST** or **DEMO** marker is shown;
- the facility address and current contact information under **Address and Contacts**.

The language can be selected in the **Language** field. MVX V0.0 is available in Latvian, English, and Russian. Changing the language does not change data, the active environment, or access rights.

> **Important:** TEST and DEMO are not the production environment. Before an administrative action, check that the correct environment is open. Data used in a test environment may be synthetic.

## 3. Signing in and signing out

### 3.1. Signing in

1. In the login form, enter your user identifier in the **Nick** field.
2. Enter your password in the **Password** field.
3. Select **Login**.

After a successful login, MVX opens a mode available to the user. If the account has access to both Resident Mode and Admin Mode, select **Admin Mode** in the sidebar.

### 3.2. Signing out

To finish working, select **Logout** in the sidebar. After using a shared device, always log out of MVX and close the browser window.

## 4. Temporary password and personal account security

If a temporary password has been assigned to the account, MVX requires it to be changed before other sections can be used.

1. Open **Settings** if this page did not open automatically.
2. Enter the temporary password in **Current password**.
3. Enter a new password containing at least 8 characters in **New password**.
4. Enter the same new password in **Confirm new password**.
5. Select **Change password**.

The new password must differ from the current password. The rest of the MVX navigation remains unavailable until the password is changed successfully.

An administrator password must not be shared with another person. Do not ask users to send their passwords. To restore a user's access, use only the Recovery Code procedure described in section 7.6.

## 5. Technical roles, Admin Mode, and access boundaries

A separate Admin Mode in MVX V0.0 is available to the technical role `admin`. The roles `resident` and `owner` use Resident Mode.

The technical roles `cooperative_member`, `board_member`, `manager`, `accountant`, and `worker` exist in the data model, but MVX V0.0 does not provide separate role-specific modes for them. A role name alone does not grant Admin Mode.

The Admin Mode sidebar contains the following sections:

- **Dashboard**;
- **Users**;
- **Apartments**;
- **Water Meter Management**;
- **Water Reading History**;
- **Announcements**;
- **Monthly Report**;
- **Documents**;
- **Settings**.

On a small screen, open the sidebar with the menu button. In desktop view, the sidebar can be collapsed and opened again.

## 6. Dashboard

The **Dashboard** section shows a summary of the facility.

The **Building Summary** block may show:

- the number of apartments;
- the number of users or residents;
- the total living area;
- the total non-living area;
- the total heated area.

The summary values depend on active data stored in the system. If a number appears incorrect, first check **Apartments** and **Users** instead of creating a duplicate record.

## 7. Users

### 7.1. Search and user information

Open **Users**. The list can be filtered by **All**, **Active**, or **Inactive** status and searched by Nick, name, email address, telephone number, or apartment.

Select **View** to open information about one user, the account status, and the access-recovery state. Use personal data only for the administrative task and do not leave it visible to unauthorized persons.

### 7.2. Creating a user

1. Select **+ Add User**.
2. Enter a **Nick**.
3. Enter the user's first name and last name.
4. Enter an email address and, if needed, a telephone number.
5. Enter a **Temporary password**.
6. Select **Create User**.

Provide the temporary password to the verified user through an agreed secure channel. The user must change it during the first login.

### 7.3. Editing user data

Select **Edit**, change the necessary fields, and select **Save changes**. Before saving, check that the correct Nick is being edited.

### 7.4. Changing status

In the edit window, select **Change status**, then **Set Active** or **Set Inactive**.

> **Warning:** changing the status does not delete the user. All records and apartment-assignment history remain in the system. Before deactivation, verify the user's identity and make sure that blocking access is justified.

### 7.5. Apartment assignments

1. In the user card, select **Assignments**.
2. Select an apartment.
3. Under **Relation**, select **Owner** or **Resident**.
4. Select **Add assignment**.

An existing assignment can be removed with **Remove**. Before removing it, check the apartment number and relation because the assignment determines which apartment data the user can see in Resident Mode.

### 7.6. Administrator-assisted account recovery

The **Account recovery** block in the user-information window shows the Recovery Code status.

To issue a code:

1. before the action, verify the user's identity through an organization-approved channel;
2. select **Issue Recovery Code**;
3. confirm the action;
4. immediately copy the displayed code;
5. send it to the verified user through the agreed manual channel.

> **Important:** the Recovery Code is displayed only once. Issuing a new code revokes the previous active code. A code can be issued only for an active user.

An active code can be revoked with **Revoke Recovery Code**. Do not ask the user to send you the new password, and do not retain the Recovery Code outside the approved support process.

## 8. Apartments

### 8.1. Search and overview

Open **Apartments**. An apartment can be found by its number or a user's Nick and filtered by building section and floor.

The apartment view may show general information, areas, numbers of rooms and residents, number of levels and hot-water risers, the alternative-heating indicator, notes, owners, and residents.

Selecting an associated user can open the **Users** section. The back action preserves the working context if the open view supports it.

### 8.2. Creating an apartment

1. Select **+ Add Apartment**.
2. Enter the apartment number, building section, and floor.
3. Enter the numbers of rooms, residents, hot-water risers, and levels.
4. Enter the living, non-living, heated, alternative-heating, and land-tax areas in square metres.
5. If applicable, select **Alternative heating** and add notes.
6. Select **Save Apartment**.

Before saving, check the apartment number and building section. Do not create a second apartment record to correct a user assignment for an existing apartment.

## 9. Water Meter Management

### 9.1. List and filters

Open **Water Meter Management**. Summary cards show meters with valid calibration, calibration expiring soon, expired calibration, or no calibration.

The list can be searched and filtered by water type, active status, and calibration status. Before an action, compare the apartment, water type, location, serial number, and riser.

### 9.2. Adding a meter

1. Select **Add Meter**.
2. Select the apartment and riser.
3. Select the water type and enter the serial number.
4. If the information is available, enter the manufacturer and model.
5. Specify the installed date and **Initial Reading, m³**.
6. Specify whether a calibration certificate is available.
7. If a certificate is available, enter the calibration date, validity period, certificate number, and laboratory, and attach the document.
8. Check the entered data and select **Add Water Meter**.

The initial reading is the full meter reading. Enter no more than three digits after the decimal separator. MVX accepts a comma or a full stop.

Supported calibration-document formats are PDF, eDoc, and ASiC-E; the maximum size is 10 MB. If a certificate is unavailable, MVX requires a separate confirmation before registering the meter without a calibration document.

### 9.3. Editing a meter

Select **Edit**, change the necessary meter data, and select **Save Changes**.

If the initial reading or its date is changed, a justification must be entered in **Reason for correction**. This change affects the reading audit history; before saving, check the value, date, and reason.

### 9.4. Calibration history

In the meter view, open **Calibration History**. Previous records and calibration documents can be reviewed there. If needed, select **Add Calibration**, enter the new data, and attach the document.

### 9.5. Deactivating a meter

1. Select **Deactivate**.
2. Select one or more active meters.
3. For each meter, select a reason such as replacement, fault, or removal.
4. Check the selection and confirm deactivation.

> **Warning:** a deactivated meter can no longer be used to submit new readings, but its historical readings are retained. Before the action, check the serial number and apartment.

## 10. Water Reading History

The **Water Reading History** section is an audit overview of submitted, corrected, and superseded water-meter readings.

The summary shows the number of all, active, superseded, and admin-received records. Records can be:

- searched by apartment, serial number, or user;
- filtered by reporting period, water type, source, and status;
- reviewed by date, apartment, meter, reading, source, submitter, and correction information;
- exported with **Export XLSX**.

The source may be Resident portal, Paper note, Email, Phone, or Manual admin entry. The **Superseded** status means that a newer audit record has replaced the record; a historical record must not be interpreted as the current active reading.

Filters also affect the set of records exported. If no records match the selected filters, MVX does not create an empty export.

## 11. Monthly Report and administrative receipt of readings

### 11.1. Selecting a report and reviewing the summary

Open **Monthly Report** and select a reporting period. MVX shows the period status, reading-collection opening and closing times, apartment and meter submission summaries, and calculated water consumption.

The **Apartments requiring attention** block shows apartments where readings are missing for one or more active meters. Under **Meter details**, the previous and current reading, consumption, and data status can be reviewed.

Select **Download XLSX** to save the report for the selected period. Before using the file, check the period and generation time.

### 11.2. Administrative receipt of readings

An administrator may enter a reading that the administration actually received outside the Resident portal.

1. In the correct apartment card, select **Receive readings**.
2. Enter the full reading for at least one displayed meter.
3. Specify the **Reading date**.
4. Under **Source**, select the actual receipt channel.
5. Under **Source note**, enter a short, verifiable explanation.
6. Select **Save readings**.

> **Important:** do not use administrative entry to invent or estimate a user's reading. Save only the full meter value actually received and the true source.

If the reporting period is closed, MVX requires **This reporting period is closed. I confirm this late administrative entry.** to be selected. Perform a late entry only after checking the period, meter, receipt date, source, and justification.

## 12. Announcement Management

### 12.1. Creating an announcement

Open **Announcements**. On the **Announcement Management** page:

1. enter the announcement title and text;
2. select the priority;
3. if needed, specify **Visible from** and **Visible until**;
4. under **Recipients**, select everyone, building sections, apartments, roles, or individual users;
5. select **Save draft** or **Save and publish**.

Selecting **Everyone** replaces the other recipients. The end date cannot be earlier than the start date.

> **Warning:** before publication, check the text, priority, visibility period, and recipients again. Publishing can make the announcement visible immediately and trigger push notifications to applicable devices.

### 12.2. Editing, publishing, and archiving

The list can be filtered by status and priority. Select **Edit** to change an announcement or **Publish** to publish a saved draft.

Select **Archive** to remove the announcement from current content visible to residents. Archiving should not be used as temporary hiding without a prior check.

## 13. Documents and legal information

Open **Documents** and **Legal information**. MVX V0.0 provides access to the following public documents:

- **Personal Data Processing Notice**;
- **Device Storage and Cookie Notice**;
- **Operator and Contact Information**;
- **MVX User Rules**.

Select a document title to open it. On the document page, use **Back to Documents** to return to the list.

This manual does not repeat or replace the content of the legal documents. Always use the current document version displayed by MVX.

## 14. Administrative Settings

Administrative blocks are shown under **Settings** when Admin Mode is active, the account has the `admin` role, and the mandatory temporary-password change has been completed.

### 14.1. Public contact

Under **Public contact**, the **MVX Administrator contact** can be changed — the email address and telephone number shown to users who need help signing in.

After checking the data, select **Save contact details**. Do not enter private or unapproved contact information.

### 14.2. Collection period

Under **Water readings**, administrators can set how many days before and after the final day of the month residents may submit readings and can check the time zone, managed month, current status, and calculated period.

Change only the necessary values and select **Save period settings**. Before saving, assess whether the change could unexpectedly open or close reading submission.

### 14.3. Backup management

Under **Backup management**, administrators can review protection state, automatic-backup status, the last successful backup, and recent execution results.

Depending on the environment and system state, the following actions may be available:

- enable or disable automatic backup;
- select **Create backup now**;
- refresh the displayed status.

> **Warning:** disabling automatic backup may cause scheduled backups to be skipped. Do this only for an approved reason, and then verify when protection has been restored. Acceptance of a manual-backup request does not mean that the backup has already completed successfully.

If backup management is disabled in a particular environment, do not treat this as an error or try to bypass the environmental restriction.

### 14.4. Restore and controlled rollback management

Under **Restore management**, available recovery points and their readiness can be reviewed. Regular restore operations in the MVX V0.0 interface may be available only in read-only mode.

If the system detects a protected rollback scenario after a restore, **Rollback control** and only the actions permitted for that state may appear. An action may require the current password and the exact confirmation phrase shown on the screen.

> **Critical warning:** controlled rollback can alter system data and service state. Do not start a rollback, retry, state reset, or release of an indeterminate request without an approved incident-recovery decision and authorization from the responsible person. Before the action, check the current backup, recovery point, environment, and state displayed on the screen.

This user manual does not publish confirmation phrases and does not replace the technical incident-recovery procedure. If it is unclear which action is permitted, stop and use the approved support path.

## 15. Personal Settings

### 15.1. Changing the password

The administrator's personal password can be changed under **Security** in **Settings**:

1. enter the **Current password**;
2. enter the **New password**;
3. enter **Confirm new password**;
4. select **Change password**.

The new password must contain at least 8 characters, differ from the current password, and match in both new-password fields.

### 15.2. Urgent announcements

Under **Notifications**, **Urgent announcements** can be enabled or disabled on this device.

To enable them, select **Enable urgent notifications**, allow notifications in the browser or operating-system prompt, and check the enabled status.

The permission applies to the specific browser and device. If notifications are blocked in browser or operating-system settings, MVX cannot enable them itself.

## 16. Mobile use, PWA installation, and push notifications

MVX can be used in a browser. On a supported device, it can also be installed as a PWA for faster access.

If the login page displays **Install MVX on this device?**, select **Install** and follow the displayed instructions. Selecting **Not now** postpones installation.

### 16.1. iPhone or iPad

1. Open MVX in Safari.
2. Select **Share**.
3. Select **Add to Home Screen**, then **Add**.
4. Close the previously open MVX tab in Safari.
5. In future, open MVX from the new MVX icon on the Home Screen.

For push notifications on an iPhone or iPad, first add MVX to the Home Screen and open it from that icon.

### 16.2. Android, Mac, and other desktop devices

- In the Android browser menu, use **Install app** or **Add to Home screen**.
- In Mac Safari, use **Add to Dock** from the **File** menu.
- In another supported desktop browser, use **Install MVX** or **Install app**.

Use Admin Mode on a mobile device with particular care: before confirmation, check the full identification of the record and do not allow administrative data to remain visible to other persons.

## 17. Troubleshooting

| Problem | Check or action |
|---|---|
| Unable to sign in | Check the MVX address, **Nick**, password, and selected environment. If needed, use **Forgot your Nick or password?** and contact another authorized MVX administrator. |
| Only Settings is available | Change the temporary password as described in section 4. |
| Admin Mode is unavailable | Check that the account has the technical role `admin`. A role name in another system does not grant MVX access. |
| Unable to find a user | Check the search text and status filter. When searching personal data, use only information necessary for the administrative task. |
| An apartment or meter is not shown | Check the building-section, floor, and status filters, then refresh the data. Do not create a duplicate until the existing record has been checked. |
| Unable to save a reading | Check the meter, full-reading format, reading date, source, source note, and period status. A separate confirmation is required for a closed period. |
| The XLSX file is not created | Check that the selected period or filters contain exportable data and try again. |
| Notifications cannot be enabled | Check browser and operating-system permissions. On an iPhone or iPad, open the installed MVX from the Home Screen. |
| The backup or restore block is unavailable | Check that Admin Mode and the correct environment are active. In some environments, management is intentionally disabled or available only in read-only mode. |
| The page does not load data | Check the internet connection, refresh the page, and try again. Do not repeat a high-impact action if it is unclear whether the previous request has already been accepted. |

## 18. Support and MVX V0.0 limitations

Current support details are available under **Address and Contacts** on the login page and in the **Forgot your Nick or password?** window. The manual does not duplicate contact information because it can be changed by the facility administrator.

When contacting support, provide:

- the environment or MVX address used;
- your **Nick**, but never your password;
- the section and record involved in the action;
- the displayed error text and approximate time;
- whether the action may have changed data.

MVX V0.0 functions depend on the user's role, active mode, account assignments, facility and environment settings, reporting-period state, protection controls, and device and browser capabilities.

Apple Watch is not a separate MVX application; the operating system can only mirror compatible notifications from an iPhone. Administrative actions are not available on Apple Watch.
