# MVX V0.0 Manual Package

## 1. Purpose

This directory is the source of truth for the authenticated MVX V0.0 manuals.

The package contains two separate, standalone manuals:

- `MAN-RES-01` — MVX V0.0 Resident Mode Manual;
- `MAN-ADM-01` — MVX V0.0 Admin Mode Manual.

The manuals describe only functionality that exists in MVX V0.0. They do not document planned modules or present roadmap items as available features.

## 2. Directory contract

```text
docs/manual/v0.0/
├── README.md
├── terminology.md
├── resident-mode/
│   ├── lv.md
│   ├── en.md
│   └── ru.md
└── admin-mode/
    ├── lv.md
    ├── en.md
    └── ru.md
```

`lv.md` is the master version in each manual set. `en.md` and `ru.md` are controlled translations of the corresponding Latvian master.

The two manuals are independent user-facing documents. Common instructions may be repeated so that each manual remains complete when displayed in MVX, exported, printed, or used as the basis for a training video. Shared-fragment or include processing is intentionally not used in V0.0.

## 3. Document identity and titles

| Document ID | Language | Official title |
|---|---|---|
| `MAN-RES-01` | LV | MVX V0.0 iedzīvotāja režīma rokasgrāmata |
| `MAN-RES-01` | EN | MVX V0.0 Resident Mode Manual |
| `MAN-RES-01` | RU | Руководство по режиму жильца MVX V0.0 |
| `MAN-ADM-01` | LV | MVX V0.0 administratora režīma rokasgrāmata |
| `MAN-ADM-01` | EN | MVX V0.0 Admin Mode Manual |
| `MAN-ADM-01` | RU | Руководство по режиму администратора MVX V0.0 |

Document version `1.0` is the first controlled version of a manual. It is independent of the application release designation `V0.0`.

## 4. Audience and access model

The Resident Mode Manual is intended for users who have access to Resident Mode in V0.0: the technical roles `resident` and `owner`.

The Admin Mode Manual is intended for users who have the technical role `admin` and access to Admin Mode.

The technical roles `cooperative_member`, `board_member`, `manager`, `accountant`, and `worker` exist in the data model but do not have separate role-specific modes in V0.0. The manuals must not imply otherwise.

A user who has access to both UI modes may be offered both manuals. Manual availability must be based on the same effective mode and role rules as the application navigation.

## 5. Source-of-truth precedence

Manual content must be verified against the active application code and the deployed V0.0 candidate. Sources have the following precedence:

1. verified behavior of the active V0.0 UI;
2. active centralized translations in `src/locales/`;
3. active page-local translation dictionaries;
4. the controlled terminology in `terminology.md`;
5. explanatory prose in the manuals.

Files ending in `.bak`, `.OLD`, or `.copy` are legacy snapshots and must not be used as sources.

The terminology contract does not silently redefine an existing UI label. A difference between an approved manual term and the active UI must be recorded and resolved as a product or documentation defect before content approval.

## 6. Required front matter

Each manual language file must begin with YAML front matter using this schema:

```yaml
---
document_id: MAN-RES-01
version: "1.0"
language: lv
translation_of: null
status: draft
applies_to: "MVX V0.0"
mode: resident
source_revision: TBD
last_reviewed: TBD
public: false
requires_acceptance: false
---
```

For the Admin Mode Manual, `document_id` is `MAN-ADM-01` and `mode` is `admin`.

For English and Russian translations:

- `language` is `en` or `ru`;
- `translation_of` is `lv`;
- all other control fields must match the corresponding Latvian master.

Allowed status values are:

- `draft` — content is being prepared;
- `reviewed` — functional and language review is complete;
- `approved-for-v0.0` — the document passed the final release gate.

`source_revision` remains `TBD` while the manual is being drafted. Before approval, it must contain the full Git commit hash of the application revision against which the complete manual was verified. `last_reviewed` must then contain an ISO date in `YYYY-MM-DD` format.

## 7. Language and translation rules

- Latvian is the master language.
- English and Russian must preserve the same scope, section order, warnings, procedures, and limitations as the Latvian master.
- EN and RU must contain a short notice stating that they are translations and that the Latvian master prevails if meanings differ.
- Heading hierarchy and numbered procedures must remain structurally equivalent across all three languages.
- Approved UI labels must follow `terminology.md` and the active source identified there.
- Technical identifiers, route paths, role IDs, `Nick`, `Recovery Code`, PWA, and product names must not be translated unless the active UI provides a separate approved display label.
- Explanations may be natural in each language, but they must not change functional meaning.

## 8. Content rules

Each manual must:

- be understandable without consulting the other manual;
- distinguish technical roles from available UI modes;
- describe only visible user actions, relevant limitations, and expected results;
- describe security and recovery only to the extent required by the user;
- use the dates and status displayed by MVX instead of hardcoded reporting-period dates;
- direct users to the legal documents without reproducing or replacing their content;
- state limitations where a feature depends on the browser, device, role, mode, reporting-period state, or environment;
- avoid internal database, HMAC, rate-limit, secret, infrastructure, and implementation details;
- avoid describing BIM, GIS, IoT, Warehouse, Procurement, Preventive Maintenance, Digital Archive, or other future modules as V0.0 functionality.

Screenshots are optional supporting material and are not a source of truth. If added later, they must be captured only after the relevant UI has passed functional and language verification.

## 9. Dynamic facility and contact data

The Markdown files must not contain literal facility contact values such as an email address or telephone number.

The manuals should tell the user where current support details are displayed in MVX. Runtime UI integration must obtain facility and public-contact data from the existing centralized contexts. A future generated PDF may contain a generated snapshot of those values, but the Markdown source must not become another configuration source.

## 10. Resident Mode Manual content contract

The Resident Mode Manual must cover:

1. MVX V0.0 purpose and scope;
2. opening MVX, selecting a language, and identifying the facility;
3. signing in with `Nick` and password and signing out;
4. temporary-password replacement and account recovery;
5. Resident Mode navigation and access boundaries;
6. the Resident Dashboard;
7. water meter readings, collection-period states, submission, validation, and history;
8. announcements and announcement details;
9. Documents and the four public legal documents;
10. Settings available to a resident, including password and urgent notifications;
11. mobile, PWA installation, and push-notification prerequisites;
12. troubleshooting;
13. support, contacts, and V0.0 limitations.

## 11. Admin Mode Manual content contract

The Admin Mode Manual must cover:

1. MVX V0.0 purpose and scope;
2. opening MVX, selecting a language, and identifying the facility;
3. signing in with `Nick` and password and signing out;
4. temporary-password replacement and personal account security;
5. technical roles, Admin Mode, and access boundaries;
6. the Admin Dashboard;
7. Users, assignments, status changes, and administrator-assisted account recovery;
8. Apartments;
9. Water Meter Management;
10. Water Reading History;
11. Monthly Report and permitted administrative reading entry;
12. Announcement Management;
13. Documents and the four public legal documents;
14. administrative Settings: public contacts, collection period, backup management, and recovery/restore controls;
15. personal Settings: password and urgent notifications;
16. mobile, PWA installation, and push-notification prerequisites;
17. troubleshooting;
18. support, contacts, and V0.0 limitations.

Infrastructure details must not replace user-level procedures in the Admin Mode Manual. Destructive or high-impact administrative operations require explicit warnings and must be documented only after their actual V0.0 behavior is verified.

## 12. Legal-document boundary

Legal documents remain under:

```text
docs/legal/public/<document_set_key>/...
```

The manual package must not duplicate their legal text or become a source of truth for privacy, retention, lawful basis, operator identity, or user rules.

The manual explains how to locate and use legal documents. The legal documents define the applicable notices and rules.

## 13. Runtime integration boundary

PR-6B creates documentation architecture only. It does not add routes, navigation items, loaders, permissions, or deployments.

Later UI integration should provide an authenticated `/manual` entry and mode-appropriate access. It must preserve:

- `ProtectedRoute`;
- the mandatory password-change gate;
- existing role and mode restrictions;
- PROD, TEST, and DEMO isolation;
- the separate legal-document loader and legal source tree.

Manual rendering must have its own domain wrapper. A genuinely generic restricted-Markdown primitive may be shared later, but the legal loader and its whitelist contract must not be repurposed as the manual loader.

## 14. Validation gates

Before `approved-for-v0.0`, the package must pass all of the following:

- two document IDs and exactly three language files for each document;
- valid required front matter;
- LV master and EN/RU translation relationships;
- heading and procedure parity across each language set;
- terminology audit against active source;
- functional verification against the V0.0 candidate;
- no hardcoded facility contact values;
- no unresolved `TBD` control values;
- no future functionality presented as implemented;
- no contradiction with public legal documents;
- authenticated route, mode, and password-gate verification after UI integration.

## 15. Baseline audit finding

The PR-6B audit baseline is:

```text
e5ea2f14dd6d2453726adfc82a809a8f8c9887bd
```

At this baseline, `src/pages/WaterMetersPage.jsx` and `src/pages/WaterReadingsPage.jsx` are active Admin Mode pages but do not use the LV/EN/RU translation system. Their page content is English-only, while the corresponding Sidebar labels are localized.

This mismatch must be resolved or explicitly dispositioned before the Latvian Admin Mode Manual is frozen. The manuals must not conceal the mismatch by presenting non-existent translated UI labels as though they were already displayed by the application.
