# MVX V0.0 Manual Terminology Contract

## 1. Purpose

This file controls recurring terminology in the MVX V0.0 Resident Mode and Admin Mode manuals.

It records approved user-facing terms and their active UI sources. It does not replace application localization. When the UI and this contract differ, the difference must be reviewed rather than silently normalized in the manuals.

## 2. Usage rules

- Use an exact UI label when instructing the user to select, open, or enter something.
- Preserve capitalization used by the active UI when quoting a label.
- Use natural grammatical forms in explanatory prose when the term is not being quoted as a UI label.
- Keep code identifiers and routes in backticks.
- Keep `Nick` and `Recovery Code` unchanged when referring to the corresponding input labels or credential names.
- Do not derive terminology from `.bak`, `.OLD`, or `.copy` files.
- Latvian is the controlling language for explanatory meaning; active UI labels remain controlling for click-by-click instructions.

## 3. Product and document names

| Concept | LV | EN | RU | Source or rule |
|---|---|---|---|---|
| Product name | MVX | MVX | MVX | Brand name; never translated |
| Official expansion | Management • Visibility • eXecution | Management • Visibility • eXecution | Management • Visibility • eXecution | Official brand expansion; preserve spelling and capitalization |
| System name in prose | MVX sistēma | MVX System | Система MVX | `common.appName`; grammatical capitalization may follow sentence position |
| Resident manual | MVX V0.0 iedzīvotāja režīma rokasgrāmata | MVX V0.0 Resident Mode Manual | Руководство по режиму жильца MVX V0.0 | `MAN-RES-01` |
| Admin manual | MVX V0.0 administratora režīma rokasgrāmata | MVX V0.0 Admin Mode Manual | Руководство по режиму администратора MVX V0.0 | `MAN-ADM-01` |

## 4. Modes, navigation, and access

| Concept or key | LV | EN | RU | Active source |
|---|---|---|---|---|
| `sidebar.residentMode` | Iedzīvotāja režīms | Resident Mode | Режим жильца | `src/locales/*/sidebar.js` |
| `sidebar.adminMode` | Administratora režīms | Admin Mode | Режим администратора | `src/locales/*/sidebar.js` |
| `dashboard.title` / `sidebar.dashboard` | Informācijas panelis | Dashboard | Главная | `src/locales/*/dashboard.js`, `sidebar.js` |
| `sidebar.users` | Lietotāji | Users | Пользователи | `src/locales/*/sidebar.js` |
| `sidebar.apartments` | Dzīvokļi | Apartments | Квартиры | `src/locales/*/sidebar.js` |
| Resident navigation label `sidebar.waterMeters` | Ūdens skaitītāji | Water Meters | Счётчики воды | `src/locales/*/sidebar.js` |
| Resident page title `water.resident.title` | Ūdens skaitītāju rādījumi | Water Readings | Показания счётчиков воды | `src/locales/*/water.js` |
| `sidebar.waterMeterManagement` | Ūdens skaitītāju pārvaldība | Water Meter Management | Управление счётчиками воды | `src/locales/*/sidebar.js` |
| `sidebar.waterReadingHistory` | Ūdens rādījumu vēsture | Water Reading History | История показаний воды | `src/locales/*/sidebar.js` |
| `sidebar.monthlyReport` | Mēneša pārskats | Monthly Report | Ежемесячный отчёт | `src/locales/*/sidebar.js` |
| `sidebar.announcements` | Paziņojumi | Announcements | Объявления | `src/locales/*/sidebar.js` |
| Admin announcement page | Paziņojumu pārvaldība | Announcement Management | Управление объявлениями | `src/locales/*/announcements.js` |
| `sidebar.documents` | Dokumenti | Documents | Документы | `src/locales/*/sidebar.js` |
| Settings | Iestatījumi | Settings | Настройки | `src/components/Sidebar.jsx`, active `SETTINGS_LABELS` |
| `sidebar.logout` | Iziet | Logout | Выйти | `src/locales/*/sidebar.js` |
| Language | Valoda | Language | Язык | `src/locales/*/common.js` |
| Facility | Objekts | Facility | Объект | `login.facilityFallback` |

The Resident navigation label and Resident page title for water are intentionally recorded separately because the active UI uses different wording.

## 5. Sign-in, security, and recovery

| Concept or key | LV | EN | RU | Active source or rule |
|---|---|---|---|---|
| Sign-in form title | Pieslēgšanās | Login | Вход | `login.form.title` |
| Sign-in action | Pieslēgties | Login | Войти | `login.login` |
| User credential label | Nick | Nick | Nick | `login.nick`; preserve exactly |
| Password | Parole | Password | Пароль | `login.password` |
| Temporary password | Pagaidu parole | Temporary password | Временный пароль | `SettingsPage.jsx` page-local `TEXT` |
| Recover access | Atjaunot piekļuvi | Recover access | Восстановить доступ | `login.recoverAccess` |
| Account recovery page | Piekļuves atjaunošana | Account recovery | Восстановление доступа | `login.recovery.title` |
| Recovery credential label | Recovery Code | Recovery Code | Recovery Code | `login.recovery.code`; preserve exactly in form instructions |
| Recovery code in explanatory prose | atjaunošanas kods | recovery code | код восстановления | Natural prose and `UsersPage.jsx`; capitalize only when quoting the credential label |
| New password | Jaunā parole | New password | Новый пароль | `login.recovery.newPassword` |
| Confirm new password | Atkārtojiet jauno paroli | Confirm new password | Повторите новый пароль | `login.recovery.confirmPassword` |
| Change password | Mainīt paroli | Change password | Изменить пароль | `SettingsPage.jsx` page-local `TEXT` |

The manuals must distinguish the public user recovery workflow from the administrator action that issues or revokes a recovery code.

## 6. Resident water workflow

| Concept or key | LV | EN | RU | Active source |
|---|---|---|---|---|
| Apartment | Dzīvoklis | Apartment | Квартира | `water.resident.apartment` |
| Water meter | Ūdens skaitītājs | Water Meter | Счётчик воды | `water.history.waterMeter` |
| Cold Water | Aukstais ūdens | Cold Water | Холодная вода | `water.card.coldWater` |
| Hot Water | Karstais ūdens | Hot Water | Горячая вода | `water.card.hotWater` |
| Riser | Stāvvads | Riser | Стояк | `water.card.riser` |
| Serial number | Sērijas numurs | Serial number | Серийный номер | `water.card.serialNumber` |
| Current reading | Pašreizējais rādījums | Current reading | Текущее показание | `water.card.currentReading` |
| New reading | Jaunais rādījums, m³ | New reading, m³ | Новое показание, м³ | `water.card.newReading` |
| Submit | Iesniegt | Submit | Передать | `water.card.submit` |
| View history | Skatīt vēsturi | View history | Посмотреть историю | `water.card.viewHistory` |
| Meter History | Skaitītāja vēsture | Meter History | История счётчика | `water.history.title` |
| Collection status | Ūdens skaitītāju rādījumu iesniegšanas statuss | Water reading collection status | Статус приёма показаний воды | `water.resident.period.statusTitle` |
| Collection is open | Ūdens skaitītāju rādījumu iesniegšana ir atvērta | Water reading collection is open | Приём показаний воды открыт | `water.resident.period.openTitle` |
| Collection is closed | Ūdens skaitītāju rādījumu iesniegšana ir slēgta | Water reading collection is closed | Приём показаний воды закрыт | `water.resident.period.closedTitle` |

Exact accepted input, decimal-separator, validation, correction, and late-entry behavior must be confirmed during functional verification before it is stated normatively in a manual.

## 7. Announcements

| Concept or key | LV | EN | RU | Active source |
|---|---|---|---|---|
| Important | Svarīgi | Important | Важно | `announcements.common.important` |
| Information | Informācija | Information | Информация | `announcements.common.information` |
| Draft | Melnraksts | Draft | Черновик | `announcements.admin.status.draft` |
| Published | Publicēts | Published | Опубликовано | `announcements.admin.status.published` |
| Archived | Arhivēts | Archived | В архиве | `announcements.admin.status.archived` |
| Recipients | Saņēmēji | Recipients | Получатели | `announcements.admin.recipients.title` |
| Everyone | Visiem | Everyone | Все | `announcements.admin.recipients.everyone` |
| Publish | Publicēt | Publish | Опубликовать | `announcements.admin.publish` |
| Archive | Arhivēt | Archive | Архивировать | `announcements.admin.archive` |

## 8. Documents and legal information

| Concept or key | LV | EN | RU | Active source |
|---|---|---|---|---|
| Legal information | Juridiskā informācija | Legal information | Юридическая информация | `documents.legalTitle`, `legal.links.title` |
| Privacy document | Personas datu apstrādes paziņojums | Personal Data Processing Notice | Уведомление об обработке персональных данных | `legal.links.privacyNotice` |
| Device storage document | Ierīces datu glabāšanas un sīkdatņu paziņojums | Device Storage and Cookie Notice | Уведомление о хранении данных на устройстве и использовании файлов cookie | `legal.links.deviceStorageNotice` |
| Operator document | Operatora un kontaktinformācija | Operator and Contact Information | Информация об операторе и контактные данные | `legal.links.operatorInformation` |
| User rules | MVX lietošanas noteikumi | MVX User Rules | Правила использования MVX | `legal.links.userRules` |

Legal titles must be quoted from the active legal-link localization. The manuals must not paraphrase a title when instructing a user which document to open.

## 9. Settings

| Concept or key | LV | EN | RU | Active source |
|---|---|---|---|---|
| Security | Drošība | Security | Безопасность | `SettingsPage.jsx` page-local `TEXT` |
| Public contact | Publiskā kontaktinformācija | Public contact | Публичные контакты | `SettingsPage.jsx` page-local `TEXT` |
| MVX Administrator contact | MVX administratora kontakti | MVX Administrator contact | Контакты Администратора MVX | `SettingsPage.jsx` page-local `TEXT` |
| Water readings settings | Ūdens skaitītāju rādījumi | Water readings | Показания воды | `SettingsPage.jsx` page-local `TEXT` |
| Collection period | Rādījumu iesniegšanas periods | Collection period | Период приёма показаний | `SettingsPage.jsx` page-local `TEXT` |
| Notifications | Paziņojumi | Notifications | Уведомления | `SettingsPage.jsx` page-local `TEXT` |
| Urgent announcements | Steidzami paziņojumi | Urgent announcements | Срочные объявления | `SettingsPage.jsx` page-local `TEXT` |
| Push notifications in prose | push paziņojumi | push notifications | push-уведомления | Use only when explaining the technology rather than quoting a section label |
| Backup management | Rezerves kopiju pārvaldība | Backup management | Резервное копирование | `SettingsPage.jsx` page-local `TEXT` |
| Backup protection | Rezerves kopiju aizsardzība | Backup protection | Управление резервными копиями | `SettingsPage.jsx` page-local `TEXT` |
| Recovery/restore section | Atjaunošanas pārvaldība | Restore management | Восстановление | `SettingsPage.jsx` page-local `TEXT` |
| Recovery points | Atjaunošanas punkti | Recovery points | Точки восстановления | `SettingsPage.jsx` page-local `TEXT` |

The Admin Mode Manual must use user-level wording for backup and recovery/restore controls. It must not expose secrets or turn the manual into an infrastructure runbook.

## 10. Technical roles

Technical role identifiers must remain unchanged in code formatting. Descriptive terms explain the roles but do not imply that each role has a separate V0.0 UI mode.

| Role ID | LV descriptive term | EN descriptive term | RU descriptive term | Separate V0.0 mode |
|---|---|---|---|---|
| `resident` | iedzīvotājs | resident | жилец | Resident Mode |
| `owner` | īpašnieks | owner | собственник | Resident Mode |
| `cooperative_member` | kooperatīva biedrs | cooperative member | член кооператива | No |
| `board_member` | valdes loceklis | board member | член правления | No |
| `manager` | pārvaldnieks | manager | управляющий | No |
| `accountant` | grāmatvedis | accountant | бухгалтер | No |
| `worker` | darbinieks | worker | работник | No |
| `admin` | administrators | administrator | администратор | Admin Mode |

## 11. Mobile and PWA terms

| Concept | LV | EN | RU | Active source or rule |
|---|---|---|---|---|
| Install MVX | Instalēt MVX | Install MVX | Установить MVX | `login.install` |
| Add to Home Screen | Pievienot sākuma ekrānam | Add to Home Screen | На экран Домой | `login.install.guides.ios`; quote the operating-system label when applicable |
| PWA | PWA | PWA | PWA | Technical abbreviation; do not translate |
| Home Screen | sākuma ekrāns | Home Screen | экран «Домой» | `login.install.guides.ios` |

Apple Watch is not a separate supported MVX application or UI mode. A mirrored notification may be mentioned only as device behavior if it is verified and clearly distinguished from an MVX watch application.

## 12. Known baseline localization gap

At source baseline `e5ea2f14dd6d2453726adfc82a809a8f8c9887bd`:

- Sidebar labels for Water Meter Management and Water Reading History exist in LV, EN, and RU;
- active `src/pages/WaterMetersPage.jsx` content is English-only;
- active `src/pages/WaterReadingsPage.jsx` content is English-only.

The LV and RU manuals must not pretend that translated controls already exist on these two pages. The gap must be fixed or formally dispositioned before `MAN-ADM-01` reaches `reviewed` status.
