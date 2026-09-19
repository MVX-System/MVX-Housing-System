---
document_id: MAN-RES-01
version: "1.0"
language: en
translation_of: lv
status: draft
applies_to: "MVX V0.0"
mode: resident
source_revision: TBD
last_reviewed: TBD
public: false
requires_acceptance: false
---

# MVX V0.0 Resident Mode User Manual

> This manual is a translation of the Latvian master. If the meaning differs, the Latvian version prevails.

## 1. About this manual

This manual explains the MVX V0.0 functions available in **Resident Mode**. It is intended for users with the technical role `resident` or `owner`.

MVX allows users to view information related to their apartment, submit water meter readings, read announcements, open documents available to users, and manage personal settings.

The manual describes only the user actions visible in MVX V0.0. It does not replace the legal documents and does not describe functions planned for future versions.

## 2. Opening MVX and selecting a language

Open the MVX address assigned to your facility. On the login page, check:

- the facility name;
- the environment if a **TEST** or **DEMO** label is displayed;
- the facility address and current contact details under **Address and Contacts**.

You can select the language in the **Language** field. MVX V0.0 is available in Latvian, English, and Russian. Changing the language does not change user data or access rights.

> **Important:** use only the environment address assigned to you. TEST and DEMO are not production environments, and their data may be synthetic.

## 3. Login and logout

### 3.1. Login

1. In the login form, enter your user identifier in the **Nick** field.
2. Enter your password in the **Password** field.
3. Select **Login**.

After a successful login, MVX opens a mode available to the user. If both Resident Mode and Admin Mode are available to the account, you can select the mode in the sidebar.

### 3.2. Logout

To end your session, select **Logout** in the sidebar. When using a shared device, always log out of MVX and close the browser window after completing your work.

## 4. Temporary password and account recovery

### 4.1. Changing a temporary password

If the administrator has assigned a temporary password, MVX requires you to change it before using other sections.

1. Open **Settings** if this page did not open automatically.
2. Enter the temporary password in **Current password**.
3. Enter a new password containing at least 8 characters in **New password**.
4. Enter the same new password in **Confirm new password**.
5. Select **Change password**.

The new password must be different from the current password. The rest of the MVX navigation remains unavailable until the password is changed successfully.

### 4.2. If you have forgotten your Nick or password

On the login page, select **Forgot your Nick or password?** MVX displays the current information for contacting the MVX Administrator.

The administrator can check the user account and issue a single-use recovery code. Do not disclose your password or recovery code to anyone else.

### 4.3. Recovering access with a Recovery Code

1. On the login page, select **I have a Recovery Code**.
2. On the **Account recovery** page, enter your **Nick**.
3. Enter the **Recovery Code** issued by the administrator.
4. Enter and confirm the new password.
5. Select **Change password**.

After successful recovery, all previous active sessions are closed. Log in again with the new password.

## 5. Resident Mode navigation and access boundaries

The following sections are available in the Resident Mode sidebar:

- **Dashboard**;
- **Water Meters**;
- **Announcements**;
- **Documents**;
- **Settings**.

On a small screen, use the menu button to open the sidebar. In the desktop view, you can collapse and reopen it.

The `resident` and `owner` roles use the same Resident Mode. Other technical role names do not mean that MVX V0.0 provides separate user modes for those roles.

Users see only the functions assigned to their account and data linked to that account. If the required apartment, meter, or section is not visible, contact the MVX Administrator.

## 6. Dashboard

The **Dashboard** brings together the information most important to the user in one view.

Depending on the data assigned to the account, the dashboard may show:

- **My Apartment** — apartment profile and home information;
- **Readings** — the latest water meter values and an available consumption comparison;
- **Announcements** — current facility announcements;
- administration contact details.

If no apartment or active water meter is linked, MVX displays an appropriate message instead of empty invented data.

## 7. Water meter readings

### 7.1. Collection period status

Open **Water Meters**. At the top of the **Water Readings** page, MVX displays the **Water reading collection status**:

- **Water reading collection is open** — you can submit a reading until the date and time displayed on the screen;
- **Water reading collection is closed** — the input fields and submission action are unavailable;
- if the period information cannot be loaded, MVX displays an error or unavailability message.

Use the date and time displayed by MVX. This manual does not define a permanent collection period.

### 7.2. Meter card

Meters are grouped by apartment. A card may show:

- **Cold Water** or **Hot Water**;
- the meter location;
- **Riser**;
- **Serial number**;
- **Current reading**;
- the last submission date.

Before submitting a reading, check the apartment, water type, location, and serial number to avoid entering the value for the wrong meter.

### 7.3. Submitting a new reading

1. Make sure the collection period is open.
2. Find the correct meter.
3. In **New reading, m³**, enter the full value shown on the meter, not the monthly consumption.
4. Enter no more than three digits after the decimal separator. MVX accepts either a comma or a full stop, for example `123,456` or `123.456`.
5. Compare the entered value with the meter again.
6. Select **Submit**.

The digits before the decimal separator represent cubic metres, and the three digits after it represent litres. The value cannot be negative. A second active submission cannot be created for the same meter in the same reporting period.

After a successful submission, the card is updated. If MVX does not accept the reading, check the collection period status, the selected meter, and the input format.

### 7.4. Meter history

Select **View history** to open the history of a specific meter. It shows the reading date, the reading, and the consumption when it can be calculated.

If the **Correct** action is available in the history, it applies to the latest reading that may be corrected. Enter the full corrected reading, select a correction reason, and save the correction. If the action is unavailable or MVX does not accept the correction, contact the MVX Administrator.

## 8. Announcements

The **Announcements** section displays current information from the facility administration.

An announcement may have the priority **Important**, **Information**, or **Normal**. To read the full text:

1. expand the announcement preview if it is collapsed;
2. select **Open announcement →**;
3. after reading, select **← Back to announcements**.

If there are no current announcements intended for this user, MVX displays **There are no current announcements.**

## 9. Documents and legal information

Open **Documents**, then **Legal information**. MVX V0.0 provides access to the following public documents:

- **Personal Data Processing Notice**;
- **Device Storage and Cookie Notice**;
- **Operator and Contact Information**;
- **MVX User Rules**.

Select a document title to open it. On the document page, use **Back to Documents** to return to the list.

This manual does not repeat or replace the content of the legal documents. Always use the current document version displayed in MVX.

## 10. Personal settings

### 10.1. Changing the password

You can change your password in the **Security** block under **Settings**:

1. enter the **Current password**;
2. enter the **New password**;
3. enter the **Confirm new password**;
4. select **Change password**.

The new password must contain at least 8 characters, differ from the current password, and match in both new-password fields.

### 10.2. Urgent notifications

In the **Notifications** block, you can enable or disable **Urgent announcements** on this device.

To enable them:

1. select **Enable urgent notifications**;
2. allow notifications when prompted by the browser or operating system;
3. check that MVX displays the enabled status.

The permission applies to the specific browser and device. If notifications are blocked in the browser or operating-system settings, MVX cannot enable them itself.

## 11. Mobile use, PWA installation, and push notifications

MVX can be used in a browser. On a supported device, it can also be added as a PWA for quicker access.

If the login page displays **Install MVX on this device?**, select **Install** and follow the displayed instructions. Selecting **Not now** postpones the installation.

### 11.1. iPhone or iPad

1. Open MVX in Safari.
2. Tap **Share**.
3. Select **Add to Home Screen**, then tap **Add**.
4. Close the previously opened MVX tab in Safari.
5. From then on, open MVX using the new MVX icon on the Home Screen.

For push notifications on an iPhone or iPad, first add MVX to the Home Screen and open it from that icon.

### 11.2. Android, Mac, and other desktop devices

- In the Android browser menu, use **Install app** or **Add to Home screen**.
- In Safari on Mac, choose **File → Add to Dock**.
- In another supported desktop browser, use **Install MVX** or **Install app**.

The available commands and notification support depend on the device, operating system, browser, and its settings.

## 12. Troubleshooting

| Problem | What to check or do |
|---|---|
| Cannot log in | Check the MVX address, **Nick**, password, and selected environment. If access is still unavailable, use **Forgot your Nick or password?** |
| Only Settings is available | Change the temporary password as described in section 4.1. |
| Apartment or meter is not visible | Check that Resident Mode is selected and contact the MVX Administrator about the account linkage. |
| Reading cannot be submitted | Check the collection period status, the correct meter, and the input format. |
| Notifications cannot be enabled | Check the browser and operating-system permissions. On an iPhone or iPad, open the installed MVX from the Home Screen. |
| The page does not load data | Check the internet connection, refresh the page, and try again. Do not repeat a submission if it is unclear whether the previous action was already saved. |

## 13. Support and MVX V0.0 limitations

Current support contacts are available under **Address and Contacts** on the login page and in the **Forgot your Nick or password?** window. Contact details are not duplicated in this manual because the facility administrator may change them.

When contacting the administrator, provide:

- the environment or MVX address used;
- your **Nick**, but never your password;
- the section where the problem occurred;
- the displayed error text and the approximate time.

MVX V0.0 functions depend on the user's roles, account linkages, facility settings, reporting-period state, and the capabilities of the device and browser. Apple Watch is not a separate MVX application; the operating system may only mirror compatible notifications from the iPhone.
