import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import useChangePassword
  from "../hooks/useChangePassword";

import {
  useTranslation,
} from "../i18n";

import {
  useAuth,
} from "../context/AuthContext";

import {
  useMode,
} from "../context/ModeContext";

import {
  api,
} from "../services/api";


const TEXT = {
  en: {
    title: "Settings",
    subtitle:
      "Manage your personal account and system settings.",
    security: "Security",
    password: "Password",
    hint:
      "Use at least 8 characters. The new password must be different from the current password.",
    current:
      "Current password",
    next:
      "New password",
    confirm:
      "Confirm new password",
    change:
      "Change password",
    saving:
      "Changing password...",
    required:
      "Complete all password fields.",
    mismatch:
      "The new password confirmation does not match.",
    short:
      "The new password must contain at least 8 characters.",
    same:
      "The new password must be different from the current password.",
    success:
      "Password changed successfully.",
    incorrect:
      "The current password is incorrect.",
    failed:
      "The password could not be changed.",
    mandatoryTitle:
      "Temporary password",
    mandatoryMessage:
      "For security, replace the temporary password before using the rest of MVX System.",

    waterSection:
      "Water readings",
    waterTitle:
      "Collection period",
    waterHint:
      "Set how many days before and after the last day of each month residents may submit water meter readings.",
    daysBefore:
      "Days before month end",
    daysAfter:
      "Days after month end",
    timezone:
      "Timezone",
    managedMonth:
      "Managed reporting month",
    currentStatus:
      "Current status",
    calculatedPeriod:
      "Calculated collection period",
    saveWater:
      "Save period settings",
    savingWater:
      "Saving settings...",
    loadingWater:
      "Loading water reporting settings...",
    waterSaved:
      "Water reporting settings saved.",
    waterLoadFailed:
      "Water reporting settings could not be loaded.",
    waterSaveFailed:
      "Water reporting settings could not be saved.",
    invalidDays:
      "Enter a whole number from 0 to 31.",
    scheduled:
      "Scheduled",
    open:
      "Open",
    closed:
      "Closed",
    finalized:
      "Finalized",
    unknown:
      "Unknown",

    notificationsSection:
      "Notifications",
    notificationsTitle:
      "Urgent announcements",
    notificationsHint:
      "Enable system notifications so you do not miss urgent announcements from MVX.",
    notificationsUnsupported:
      "Push notifications are not supported in this browser or device mode.",
    notificationsBlocked:
      "Notifications are blocked in the browser settings.",
    notificationsEnabled:
      "Urgent notifications are enabled on this device.",
    notificationsDisabled:
      "Urgent notifications are disabled on this device.",
    notificationsLoading:
      "Checking notification status...",
    notificationsEnabling:
      "Enabling notifications...",
    notificationsDisabling:
      "Disabling notifications...",
    notificationsEnable:
      "Enable urgent notifications",
    notificationsDisable:
      "Disable urgent notifications",
    notificationsFailed:
      "Notification settings could not be updated.",
    notificationsIosHint:
      "On iPhone or iPad, add MVX to the Home Screen and open it from there before enabling notifications.",

    backupSection:
      "Backup management",
    backupTitle:
      "Backup protection",
    backupHint:
      "Review backup protection, automatic backup status, and recent backup runs.",
    automaticBackup:
      "Automatic backup",
    automaticOn:
      "Enabled",
    automaticOff:
      "Disabled",
    backupEnable:
      "Enable automatic backup",
    backupDisable:
      "Disable automatic backup",
    backupSaving:
      "Updating backup setting...",
    backupLoading:
      "Loading backup status...",
    backupLoadFailed:
      "Backup status could not be loaded.",
    backupSaveFailed:
      "Automatic backup setting could not be updated.",
    backupSaved:
      "Automatic backup setting updated.",
    createBackup:
      "Create backup now",
    creatingBackup:
      "Starting backup...",
    backupCreated:
      "Backup request accepted.",
    backupCreateFailed:
      "Backup could not be started.",
    backupAlreadyRunning:
      "A backup is already in progress.",
    lastBackup:
      "Last backup",
    lastSuccessfulBackup:
      "Last successful backup",
    noBackupRuns:
      "No backup runs recorded yet.",
    recentRuns:
      "Recent backup runs",
    protection:
      "Protection",
    d1Main:
      "Main D1 Time Travel",
    d1Pii:
      "PII D1 Time Travel",
    r2Protection:
      "R2 Bucket Lock",
    offsite:
      "Offsite backup",
    retention:
      "Retention",
    days:
      "days",
    schedule:
      "Schedule",
    destination:
      "Destination",
    provider:
      "Provider",
    statusRequested:
      "Requested",
    statusRunning:
      "Running",
    statusSuccess:
      "Success",
    statusFailed:
      "Failed",
    statusSkipped:
      "Skipped",
    requestedBy:
      "Requested by",
    started:
      "Started",
    completed:
      "Completed",
    archive:
      "Archive",
    archiveSize:
      "Archive size",
    integrity:
      "Integrity",
    mainDb:
      "Main DB",
    piiDb:
      "PII DB",
    r2Objects:
      "R2 objects",
    refreshBackup:
      "Refresh backup status",
  },

  lv: {
    title: "Iestatījumi",
    subtitle:
      "Pārvaldiet personīgos un sistēmas iestatījumus.",
    security: "Drošība",
    password: "Parole",
    hint:
      "Izmantojiet vismaz 8 rakstzīmes. Jaunajai parolei jāatšķiras no pašreizējās.",
    current:
      "Pašreizējā parole",
    next:
      "Jaunā parole",
    confirm:
      "Atkārtojiet jauno paroli",
    change:
      "Mainīt paroli",
    saving:
      "Parole tiek mainīta...",
    required:
      "Aizpildiet visus paroles laukus.",
    mismatch:
      "Jaunās paroles atkārtojums nesakrīt.",
    short:
      "Jaunajai parolei jābūt vismaz 8 rakstzīmes garai.",
    same:
      "Jaunajai parolei jāatšķiras no pašreizējās.",
    success:
      "Parole ir veiksmīgi nomainīta.",
    incorrect:
      "Pašreizējā parole nav pareiza.",
    failed:
      "Paroli neizdevās nomainīt.",
    mandatoryTitle:
      "Pagaidu parole",
    mandatoryMessage:
      "Drošības nolūkā pirms pārējās MVX System izmantošanas nomainiet pagaidu paroli.",

    waterSection:
      "Ūdens skaitītāju rādījumi",
    waterTitle:
      "Rādījumu iesniegšanas periods",
    waterHint:
      "Norādiet, cik dienas pirms un pēc mēneša pēdējās dienas iedzīvotāji drīkst iesniegt ūdens skaitītāju rādījumus.",
    daysBefore:
      "Dienas pirms mēneša beigām",
    daysAfter:
      "Dienas pēc mēneša beigām",
    timezone:
      "Laika josla",
    managedMonth:
      "Pārvaldāmais pārskata mēnesis",
    currentStatus:
      "Pašreizējais statuss",
    calculatedPeriod:
      "Aprēķinātais iesniegšanas periods",
    saveWater:
      "Saglabāt perioda iestatījumus",
    savingWater:
      "Iestatījumi tiek saglabāti...",
    loadingWater:
      "Tiek ielādēti ūdens rādījumu iestatījumi...",
    waterSaved:
      "Ūdens rādījumu iestatījumi ir saglabāti.",
    waterLoadFailed:
      "Neizdevās ielādēt ūdens rādījumu iestatījumus.",
    waterSaveFailed:
      "Neizdevās saglabāt ūdens rādījumu iestatījumus.",
    invalidDays:
      "Ievadiet veselu skaitli no 0 līdz 31.",
    scheduled:
      "Ieplānots",
    open:
      "Atvērts",
    closed:
      "Slēgts",
    finalized:
      "Pabeigts",
    unknown:
      "Nav zināms",

    notificationsSection:
      "Paziņojumi",
    notificationsTitle:
      "Steidzami paziņojumi",
    notificationsHint:
      "Ieslēdziet sistēmas paziņojumus, lai nepalaistu garām steidzamus MVX paziņojumus.",
    notificationsUnsupported:
      "Šī pārlūkprogramma vai ierīces režīms neatbalsta push paziņojumus.",
    notificationsBlocked:
      "Paziņojumi ir bloķēti pārlūkprogrammas iestatījumos.",
    notificationsEnabled:
      "Steidzamie paziņojumi šajā ierīcē ir ieslēgti.",
    notificationsDisabled:
      "Steidzamie paziņojumi šajā ierīcē ir izslēgti.",
    notificationsLoading:
      "Pārbauda paziņojumu statusu...",
    notificationsEnabling:
      "Paziņojumi tiek ieslēgti...",
    notificationsDisabling:
      "Paziņojumi tiek izslēgti...",
    notificationsEnable:
      "Ieslēgt steidzamos paziņojumus",
    notificationsDisable:
      "Izslēgt steidzamos paziņojumus",
    notificationsFailed:
      "Neizdevās atjaunināt paziņojumu iestatījumus.",
    notificationsIosHint:
      "iPhone vai iPad ierīcē vispirms pievienojiet MVX sākuma ekrānam un atveriet to no sākuma ekrāna.",

    backupSection:
      "Rezerves kopiju pārvaldība",
    backupTitle:
      "Rezerves kopiju aizsardzība",
    backupHint:
      "Pārskatiet aizsardzības stāvokli, automātiskās rezerves kopijas un pēdējos izpildes rezultātus.",
    automaticBackup:
      "Automātiskā rezerves kopija",
    automaticOn:
      "Ieslēgta",
    automaticOff:
      "Izslēgta",
    backupEnable:
      "Ieslēgt automātisko rezerves kopiju",
    backupDisable:
      "Izslēgt automātisko rezerves kopiju",
    backupSaving:
      "Tiek atjaunināts rezerves kopijas iestatījums...",
    backupLoading:
      "Tiek ielādēts rezerves kopiju statuss...",
    backupLoadFailed:
      "Neizdevās ielādēt rezerves kopiju statusu.",
    backupSaveFailed:
      "Neizdevās mainīt automātiskās rezerves kopijas iestatījumu.",
    backupSaved:
      "Automātiskās rezerves kopijas iestatījums ir atjaunināts.",
    createBackup:
      "Izveidot rezerves kopiju tagad",
    creatingBackup:
      "Rezerves kopija tiek sākta...",
    backupCreated:
      "Rezerves kopijas pieprasījums ir pieņemts.",
    backupCreateFailed:
      "Neizdevās sākt rezerves kopiju.",
    backupAlreadyRunning:
      "Rezerves kopija jau tiek veidota.",
    lastBackup:
      "Pēdējā rezerves kopija",
    lastSuccessfulBackup:
      "Pēdējā veiksmīgā rezerves kopija",
    noBackupRuns:
      "Rezerves kopiju izpildes vēl nav reģistrētas.",
    recentRuns:
      "Pēdējie izpildes rezultāti",
    protection:
      "Aizsardzība",
    d1Main:
      "Galvenās D1 Time Travel",
    d1Pii:
      "PII D1 Time Travel",
    r2Protection:
      "R2 Bucket Lock",
    offsite:
      "Ārējā rezerves kopija",
    retention:
      "Saglabāšana",
    days:
      "dienas",
    schedule:
      "Grafiks",
    destination:
      "Galamērķis",
    provider:
      "Pakalpojuma sniedzējs",
    statusRequested:
      "Pieprasīta",
    statusRunning:
      "Notiek",
    statusSuccess:
      "Veiksmīga",
    statusFailed:
      "Neizdevās",
    statusSkipped:
      "Izlaista",
    requestedBy:
      "Pieprasīja",
    started:
      "Sākts",
    completed:
      "Pabeigts",
    archive:
      "Arhīvs",
    archiveSize:
      "Arhīva izmērs",
    integrity:
      "Integritāte",
    mainDb:
      "Galvenā DB",
    piiDb:
      "PII DB",
    r2Objects:
      "R2 objekti",
    refreshBackup:
      "Atjaunināt rezerves kopiju statusu",
  },

  ru: {
    title: "Настройки",
    subtitle:
      "Управление персональными и системными настройками.",
    security: "Безопасность",
    password: "Пароль",
    hint:
      "Используйте не менее 8 символов. Новый пароль должен отличаться от текущего.",
    current:
      "Текущий пароль",
    next:
      "Новый пароль",
    confirm:
      "Повторите новый пароль",
    change:
      "Изменить пароль",
    saving:
      "Изменение пароля...",
    required:
      "Заполните все поля пароля.",
    mismatch:
      "Подтверждение нового пароля не совпадает.",
    short:
      "Новый пароль должен содержать не менее 8 символов.",
    same:
      "Новый пароль должен отличаться от текущего.",
    success:
      "Пароль успешно изменен.",
    incorrect:
      "Текущий пароль указан неверно.",
    failed:
      "Не удалось изменить пароль.",
    mandatoryTitle:
      "Временный пароль",
    mandatoryMessage:
      "В целях безопасности замените временный пароль до использования остальных разделов MVX System.",

    waterSection:
      "Показания воды",
    waterTitle:
      "Период приёма показаний",
    waterHint:
      "Укажите, за сколько дней до и после последнего дня месяца жители могут передавать показания счётчиков воды.",
    daysBefore:
      "Дней до конца месяца",
    daysAfter:
      "Дней после конца месяца",
    timezone:
      "Часовой пояс",
    managedMonth:
      "Управляемый отчётный месяц",
    currentStatus:
      "Текущий статус",
    calculatedPeriod:
      "Рассчитанный период приёма",
    saveWater:
      "Сохранить настройки периода",
    savingWater:
      "Сохранение настроек...",
    loadingWater:
      "Загрузка настроек периода...",
    waterSaved:
      "Настройки периода приёма показаний сохранены.",
    waterLoadFailed:
      "Не удалось загрузить настройки периода.",
    waterSaveFailed:
      "Не удалось сохранить настройки периода.",
    invalidDays:
      "Введите целое число от 0 до 31.",
    scheduled:
      "Запланирован",
    open:
      "Открыт",
    closed:
      "Закрыт",
    finalized:
      "Завершён",
    unknown:
      "Неизвестно",

    notificationsSection:
      "Уведомления",
    notificationsTitle:
      "Срочные объявления",
    notificationsHint:
      "Включите системные уведомления, чтобы не пропускать срочные объявления MVX.",
    notificationsUnsupported:
      "Этот браузер или режим устройства не поддерживает push-уведомления.",
    notificationsBlocked:
      "Уведомления заблокированы в настройках браузера.",
    notificationsEnabled:
      "Срочные уведомления включены на этом устройстве.",
    notificationsDisabled:
      "Срочные уведомления отключены на этом устройстве.",
    notificationsLoading:
      "Проверка статуса уведомлений...",
    notificationsEnabling:
      "Включение уведомлений...",
    notificationsDisabling:
      "Отключение уведомлений...",
    notificationsEnable:
      "Включить срочные уведомления",
    notificationsDisable:
      "Отключить срочные уведомления",
    notificationsFailed:
      "Не удалось изменить настройки уведомлений.",
    notificationsIosHint:
      "На iPhone или iPad сначала добавьте MVX на экран «Домой» и откройте приложение с этого экрана.",

    backupSection:
      "Резервное копирование",
    backupTitle:
      "Управление резервными копиями",
    backupHint:
      "Просмотр защиты, статуса автоматического резервного копирования и последних запусков.",
    automaticBackup:
      "Автоматическое резервное копирование",
    automaticOn:
      "Включено",
    automaticOff:
      "Выключено",
    backupEnable:
      "Включить автоматическое резервное копирование",
    backupDisable:
      "Отключить автоматическое резервное копирование",
    backupSaving:
      "Изменение настройки резервного копирования...",
    backupLoading:
      "Загрузка статуса резервного копирования...",
    backupLoadFailed:
      "Не удалось загрузить статус резервного копирования.",
    backupSaveFailed:
      "Не удалось изменить автоматическое резервное копирование.",
    backupSaved:
      "Настройка автоматического резервного копирования изменена.",
    createBackup:
      "Создать резервную копию сейчас",
    creatingBackup:
      "Запуск резервного копирования...",
    backupCreated:
      "Запрос на резервное копирование принят.",
    backupCreateFailed:
      "Не удалось запустить резервное копирование.",
    backupAlreadyRunning:
      "Резервное копирование уже выполняется.",
    lastBackup:
      "Последняя резервная копия",
    lastSuccessfulBackup:
      "Последняя успешная резервная копия",
    noBackupRuns:
      "Запуски резервного копирования пока не зарегистрированы.",
    recentRuns:
      "Последние запуски",
    protection:
      "Защита",
    d1Main:
      "Main D1 Time Travel",
    d1Pii:
      "PII D1 Time Travel",
    r2Protection:
      "R2 Bucket Lock",
    offsite:
      "Внешняя резервная копия",
    retention:
      "Хранение",
    days:
      "дней",
    schedule:
      "Расписание",
    destination:
      "Хранилище",
    provider:
      "Провайдер",
    statusRequested:
      "Запрошено",
    statusRunning:
      "Выполняется",
    statusSuccess:
      "Успешно",
    statusFailed:
      "Ошибка",
    statusSkipped:
      "Пропущено",
    requestedBy:
      "Запросил",
    started:
      "Начато",
    completed:
      "Завершено",
    archive:
      "Архив",
    archiveSize:
      "Размер архива",
    integrity:
      "Целостность",
    mainDb:
      "Основная БД",
    piiDb:
      "PII БД",
    r2Objects:
      "Объекты R2",
    refreshBackup:
      "Обновить статус резервного копирования",
  },
};


function urlBase64ToUint8Array(
  base64String
) {
  const padding =
    "=".repeat(
      (
        4 -
        (
          base64String.length %
          4
        )
      ) % 4
    );

  const base64 =
    (
      base64String +
      padding
    )
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData =
    window.atob(base64);

  return Uint8Array.from(
    rawData,
    (character) =>
      character.charCodeAt(0)
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(
    navigator.userAgent
  );
}

function isStandaloneMode() {
  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator
      .standalone === true
  );
}

function mapMessage(
  message,
  text
) {
  const messages = {
    "Complete all password fields.":
      text.required,

    "The new password must contain at least 8 characters.":
      text.short,

    "The new password must be different from the current password.":
      text.same,

    "The current password is incorrect.":
      text.incorrect,

    "Password changed successfully.":
      text.success,
  };

  return (
    messages[message] ||
    text.failed
  );
}

function formatMonth(
  year,
  month,
  language
) {
  if (!year || !month) {
    return "—";
  }

  const localeMap = {
    lv: "lv-LV",
    en: "en-GB",
    ru: "ru-RU",
  };

  const date =
    new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        1
      )
    );

  return new Intl.DateTimeFormat(
    localeMap[language] ||
      "en-GB",
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }
  ).format(date);
}

function formatDateTime(
  value,
  language,
  timeZone
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  const localeMap = {
    lv: "lv-LV",
    en: "en-GB",
    ru: "ru-RU",
  };

  return new Intl.DateTimeFormat(
    localeMap[language] ||
      "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        timeZone ||
        "Europe/Riga",
    }
  ).format(date);
}

function getStatusLabel(
  status,
  text
) {
  const normalized =
    String(status || "")
      .trim()
      .toLowerCase();

  return (
    text[normalized] ||
    text.unknown
  );
}

function getBackupStatusLabel(
  status,
  text
) {
  const normalized =
    String(status || "")
      .trim()
      .toLowerCase();

  const labels = {
    requested:
      text.statusRequested,
    running:
      text.statusRunning,
    success:
      text.statusSuccess,
    failed:
      text.statusFailed,
    skipped:
      text.statusSkipped,
  };

  return (
    labels[normalized] ||
    text.unknown
  );
}

function formatBytes(
  value
) {
  const bytes =
    Number(value);

  if (
    !Number.isFinite(bytes) ||
    bytes < 0
  ) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = [
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  let size =
    bytes / 1024;

  let unitIndex = 0;

  while (
    size >= 1024 &&
    unitIndex <
      units.length - 1
  ) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(
    size >= 10 ? 1 : 2
  )} ${units[unitIndex]}`;
}

export default function SettingsPage() {
  const {
    language,
  } = useTranslation();

  const {
    me,
    refreshMe,
  } = useAuth();

  const {
    mode,
  } = useMode();

  const navigate =
    useNavigate();

  const roles =
    me?.roles || [];

  const isAdmin =
    roles.includes("admin");

  const mustChangePassword =
    Number(
      me?.user
        ?.must_change_password
    ) === 1;

  const text =
    useMemo(
      () =>
        TEXT[language] ||
        TEXT.en,
      [language]
    );

  const {
    saving,
    error,
    success,
    submit,
    clearMessages,
  } =
    useChangePassword();

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    validationError,
    setValidationError,
  ] = useState("");

  const [
    waterLoading,
    setWaterLoading,
  ] = useState(false);

  const [
    waterSaving,
    setWaterSaving,
  ] = useState(false);

  const [
    waterError,
    setWaterError,
  ] = useState("");

  const [
    waterSuccess,
    setWaterSuccess,
  ] = useState("");

  const [
    daysBefore,
    setDaysBefore,
  ] = useState("5");

  const [
    daysAfter,
    setDaysAfter,
  ] = useState("5");

  const [
    waterTimezone,
    setWaterTimezone,
  ] = useState(
    "Europe/Riga"
  );

  const [
    managedPeriod,
    setManagedPeriod,
  ] = useState(null);

  const [
    calculatedPeriod,
    setCalculatedPeriod,
  ] = useState(null);


  const [
    pushSupported,
    setPushSupported,
  ] = useState(true);

  const [
    pushLoading,
    setPushLoading,
  ] = useState(true);

  const [
    pushSaving,
    setPushSaving,
  ] = useState(false);

  const [
    pushSubscribed,
    setPushSubscribed,
  ] = useState(false);

  const [
    pushPermission,
    setPushPermission,
  ] = useState(
    typeof Notification !==
      "undefined"
      ? Notification.permission
      : "unsupported"
  );

  const [
    pushError,
    setPushError,
  ] = useState("");

  const [
    backupLoading,
    setBackupLoading,
  ] = useState(false);

  const [
    backupSaving,
    setBackupSaving,
  ] = useState(false);

  const [
    backupCreating,
    setBackupCreating,
  ] = useState(false);

  const [
    backupError,
    setBackupError,
  ] = useState("");

  const [
    backupSuccess,
    setBackupSuccess,
  ] = useState("");

  const [
    backupStatus,
    setBackupStatus,
  ] = useState(null);

  const [
    backupRuns,
    setBackupRuns,
  ] = useState([]);

  useEffect(() => {
    if (
      !isAdmin ||
      mustChangePassword
    ) {
      return;
    }

    const loadWaterSettings =
      async () => {
        setWaterLoading(true);
        setWaterError("");

        try {
          const result =
            await api(
              "/api/admin/water-reporting-settings"
            );

          if (
            !result ||
            result.error ||
            result.ok === false
          ) {
            throw new Error(
              result?.error ||
              "water_settings_load_failed"
            );
          }

          setDaysBefore(
            String(
              result.settings
                ?.days_before_month_end ??
              5
            )
          );

          setDaysAfter(
            String(
              result.settings
                ?.days_after_month_end ??
              5
            )
          );

          setWaterTimezone(
            result.settings
              ?.timezone ||
            "Europe/Riga"
          );

          setManagedPeriod(
            result.managed_period ||
            null
          );

          setCalculatedPeriod(
            result.calculated_period ||
            null
          );
        } catch (loadError) {
          console.error(
            "LOAD WATER REPORTING SETTINGS ERROR:",
            loadError
          );

          setWaterError(
            text.waterLoadFailed
          );
        } finally {
          setWaterLoading(false);
        }
      };

    loadWaterSettings();
  }, [
    isAdmin,
    mustChangePassword,
    text.waterLoadFailed,
  ]);


  useEffect(() => {
    if (
      !isAdmin ||
      mode !== "admin" ||
      mustChangePassword
    ) {
      return;
    }

    const loadBackupManagement =
      async () => {
        setBackupLoading(true);
        setBackupError("");

        try {
          const [
            statusResult,
            runsResult,
          ] =
            await Promise.all([
              api(
                "/api/admin/backup/status"
              ),
              api(
                "/api/admin/backup/runs?limit=10"
              ),
            ]);

          if (
            !statusResult ||
            statusResult.error ||
            statusResult.ok === false
          ) {
            throw new Error(
              statusResult?.error ||
              "backup_status_load_failed"
            );
          }

          if (
            !runsResult ||
            runsResult.error ||
            runsResult.ok === false
          ) {
            throw new Error(
              runsResult?.error ||
              "backup_runs_load_failed"
            );
          }

          setBackupStatus(
            statusResult
          );

          setBackupRuns(
            runsResult.runs || []
          );
        } catch (loadError) {
          console.error(
            "LOAD BACKUP MANAGEMENT ERROR:",
            loadError
          );

          setBackupError(
            text.backupLoadFailed
          );
        } finally {
          setBackupLoading(false);
        }
      };

    loadBackupManagement();
  }, [
    isAdmin,
    mode,
    mustChangePassword,
    text.backupLoadFailed,
  ]);


  useEffect(() => {
    if (mustChangePassword) {
      return;
    }

    const supported =
      "serviceWorker" in
        navigator &&
      "PushManager" in
        window &&
      "Notification" in
        window;

    setPushSupported(
      supported
    );

    if (!supported) {
      setPushLoading(false);
      return;
    }

    const loadPushStatus =
      async () => {
        setPushLoading(true);
        setPushError("");

        try {
          const registration =
            await navigator
              .serviceWorker
              .ready;

          const subscription =
            await registration
              .pushManager
              .getSubscription();

          setPushSubscribed(
            Boolean(subscription)
          );

          setPushPermission(
            Notification.permission
          );
        } catch (statusError) {
          console.error(
            "LOAD PUSH STATUS ERROR:",
            statusError
          );

          setPushError(
            text.notificationsFailed
          );
        } finally {
          setPushLoading(false);
        }
      };

    loadPushStatus();
  }, [
    mustChangePassword,
    text.notificationsFailed,
  ]);

  const changeField =
    (setter) =>
      (event) => {
        setter(
          event.target.value
        );

        setValidationError("");
        clearMessages();
      };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setValidationError("");

      if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {
        setValidationError(
          text.required
        );
        return;
      }

      if (
        newPassword.length < 8
      ) {
        setValidationError(
          text.short
        );
        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setValidationError(
          text.mismatch
        );
        return;
      }

      if (
        currentPassword ===
        newPassword
      ) {
        setValidationError(
          text.same
        );
        return;
      }

      const changed =
        await submit({
          currentPassword,
          newPassword,
        });

      if (changed) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        const refreshed =
          await refreshMe();

        if (
          Number(
            refreshed?.user
              ?.must_change_password
          ) === 0
        ) {
          navigate(
            "/",
            {
              replace: true,
            }
          );
        }
      }
    };

  const handleWaterSubmit =
    async (event) => {
      event.preventDefault();

      setWaterError("");
      setWaterSuccess("");

      const before =
        Number(daysBefore);

      const after =
        Number(daysAfter);

      if (
        !Number.isInteger(before) ||
        before < 0 ||
        before > 31 ||
        !Number.isInteger(after) ||
        after < 0 ||
        after > 31
      ) {
        setWaterError(
          text.invalidDays
        );
        return;
      }

      setWaterSaving(true);

      try {
        const result =
          await api(
            "/api/admin/water-reporting-settings",
            {
              method: "POST",
              body: JSON.stringify({
                days_before_month_end:
                  before,
                days_after_month_end:
                  after,
                timezone:
                  waterTimezone,
              }),
            }
          );

        if (
          !result ||
          result.error ||
          result.ok === false
        ) {
          throw new Error(
            result?.error ||
            "water_settings_save_failed"
          );
        }

        const refreshed =
          await api(
            "/api/admin/water-reporting-settings"
          );

        if (
          refreshed &&
          !refreshed.error &&
          refreshed.ok !== false
        ) {
          setManagedPeriod(
            refreshed.managed_period ||
            null
          );

          setCalculatedPeriod(
            refreshed.calculated_period ||
            null
          );

          setDaysBefore(
            String(
              refreshed.settings
                ?.days_before_month_end ??
              before
            )
          );

          setDaysAfter(
            String(
              refreshed.settings
                ?.days_after_month_end ??
              after
            )
          );

          setWaterTimezone(
            refreshed.settings
              ?.timezone ||
            waterTimezone
          );
        }

        setWaterSuccess(
          text.waterSaved
        );
      } catch (saveError) {
        console.error(
          "SAVE WATER REPORTING SETTINGS ERROR:",
          saveError
        );

        setWaterError(
          text.waterSaveFailed
        );
      } finally {
        setWaterSaving(false);
      }
    };


  const handleEnablePush =
    async () => {
      setPushError("");
      setPushSaving(true);

      try {
        if (
          !pushSupported
        ) {
          throw new Error(
            "push_not_supported"
          );
        }

        const permission =
          await Notification
            .requestPermission();

        setPushPermission(
          permission
        );

        if (
          permission !==
          "granted"
        ) {
          if (
            permission ===
            "denied"
          ) {
            setPushError(
              text.notificationsBlocked
            );
          }

          return;
        }

        const config =
          await api(
            "/api/push/config"
          );

        if (
          !config?.configured ||
          !config
            ?.vapid_public_key
        ) {
          throw new Error(
            "push_not_configured"
          );
        }

        const registration =
          await navigator
            .serviceWorker
            .ready;

        let subscription =
          await registration
            .pushManager
            .getSubscription();

        if (!subscription) {
          subscription =
            await registration
              .pushManager
              .subscribe({
                userVisibleOnly:
                  true,

                applicationServerKey:
                  urlBase64ToUint8Array(
                    config
                      .vapid_public_key
                  ),
              });
        }

        const result =
          await api(
            "/api/push/subscribe",
            {
              method: "POST",
              body:
                JSON.stringify({
                  subscription:
                    subscription
                      .toJSON(),

                  language,

                  device_label:
                    isIosDevice()
                      ? "iPhone / iPad"
                      : "Browser device",
                }),
            }
          );

        if (
          !result?.ok
        ) {
          throw new Error(
            result?.error ||
            "push_subscribe_failed"
          );
        }

        setPushSubscribed(true);

      } catch (pushEnableError) {
        console.error(
          "ENABLE PUSH ERROR:",
          pushEnableError
        );

        setPushError(
          text.notificationsFailed
        );
      } finally {
        setPushSaving(false);
      }
    };

  const handleDisablePush =
    async () => {
      setPushError("");
      setPushSaving(true);

      try {
        const registration =
          await navigator
            .serviceWorker
            .ready;

        const subscription =
          await registration
            .pushManager
            .getSubscription();

        if (subscription) {
          await api(
            "/api/push/unsubscribe",
            {
              method: "POST",
              body:
                JSON.stringify({
                  endpoint:
                    subscription
                      .endpoint,
                }),
            }
          );

          await subscription
            .unsubscribe();
        }

        setPushSubscribed(false);

      } catch (pushDisableError) {
        console.error(
          "DISABLE PUSH ERROR:",
          pushDisableError
        );

        setPushError(
          text.notificationsFailed
        );
      } finally {
        setPushSaving(false);
      }
    };

  const refreshBackupManagement =
    async () => {
      const [
        statusResult,
        runsResult,
      ] =
        await Promise.all([
          api(
            "/api/admin/backup/status"
          ),
          api(
            "/api/admin/backup/runs?limit=10"
          ),
        ]);

      if (
        !statusResult ||
        statusResult.error ||
        statusResult.ok === false ||
        !runsResult ||
        runsResult.error ||
        runsResult.ok === false
      ) {
        throw new Error(
          statusResult?.error ||
          runsResult?.error ||
          "backup_refresh_failed"
        );
      }

      setBackupStatus(
        statusResult
      );

      setBackupRuns(
        runsResult.runs || []
      );

      return {
        statusResult,
        runsResult,
      };
    };

  const handleToggleAutomaticBackup =
    async () => {
      setBackupError("");
      setBackupSuccess("");
      setBackupSaving(true);

      try {
        const currentEnabled =
          Boolean(
            backupStatus
              ?.settings
              ?.automatic_enabled
          );

        const result =
          await api(
            "/api/admin/backup/settings",
            {
              method: "POST",
              body:
                JSON.stringify({
                  automatic_enabled:
                    !currentEnabled,
                }),
            }
          );

        if (
          !result ||
          result.error ||
          result.ok === false
        ) {
          throw new Error(
            result?.error ||
            "backup_settings_save_failed"
          );
        }

        await refreshBackupManagement();

        setBackupSuccess(
          text.backupSaved
        );
      } catch (saveError) {
        console.error(
          "SAVE BACKUP SETTINGS ERROR:",
          saveError
        );

        setBackupError(
          text.backupSaveFailed
        );
      } finally {
        setBackupSaving(false);
      }
    };

  const handleCreateBackup =
    async () => {
      setBackupError("");
      setBackupSuccess("");
      setBackupCreating(true);

      try {
        const result =
          await api(
            "/api/admin/backup/create",
            {
              method: "POST",
            }
          );

        if (
          result?.error ===
          "backup_already_in_progress"
        ) {
          setBackupError(
            text.backupAlreadyRunning
          );

          await refreshBackupManagement();
          return;
        }

        if (
          !result ||
          result.error ||
          result.ok === false
        ) {
          throw new Error(
            result?.error ||
            "backup_create_failed"
          );
        }

        setBackupSuccess(
          text.backupCreated
        );

        await refreshBackupManagement();
      } catch (createError) {
        console.error(
          "CREATE BACKUP ERROR:",
          createError
        );

        setBackupError(
          text.backupCreateFailed
        );
      } finally {
        setBackupCreating(false);
      }
    };

  const handleRefreshBackup =
    async () => {
      setBackupError("");
      setBackupSuccess("");
      setBackupLoading(true);

      try {
        await refreshBackupManagement();
      } catch (refreshError) {
        console.error(
          "REFRESH BACKUP MANAGEMENT ERROR:",
          refreshError
        );

        setBackupError(
          text.backupLoadFailed
        );
      } finally {
        setBackupLoading(false);
      }
    };

  const visibleError =
    validationError ||
    (
      error
        ? mapMessage(
            error,
            text
          )
        : ""
    );

  const visibleSuccess =
    success
      ? mapMessage(
          success,
          text
        )
      : "";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          marginBottom: 22,
        }}
      >
        <h1
          style={{
            margin: 0,
            color:
              "var(--text-h)",
            fontSize: 34,
            lineHeight: 1.2,
          }}
        >
          {text.title}
        </h1>

        <div
          style={{
            marginTop: 6,
            color:
              "var(--text)",
            fontSize: 13,
          }}
        >
          {text.subtitle}
        </div>
      </div>

      {mustChangePassword && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: 14,
            border:
              "1px solid rgba(180,83,83,.28)",
            borderRadius: 11,
            background:
              "rgba(180,83,83,.06)",
          }}
        >
          <div
            style={{
              color:
                "var(--text-h)",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {text.mandatoryTitle}
          </div>

          <div
            style={{
              marginTop: 5,
              color:
                "var(--text)",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {text.mandatoryMessage}
          </div>
        </div>
      )}

      {isAdmin &&
        mode === "admin" &&
        !mustChangePassword && (
          <section
            style={{
              ...sectionStyle,
              marginBottom: 18,
            }}
          >
            <SectionHeader
              eyebrow={
                text.waterSection
              }
              title={
                text.waterTitle
              }
              hint={
                text.waterHint
              }
            />

            {waterLoading ? (
              <div
                style={noticeStyle}
              >
                {text.loadingWater}
              </div>
            ) : (
              <form
                onSubmit={
                  handleWaterSubmit
                }
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(210px,1fr))",
                    gap: 14,
                  }}
                >
                  <NumberField
                    label={
                      text.daysBefore
                    }
                    value={
                      daysBefore
                    }
                    onChange={(
                      event
                    ) => {
                      setDaysBefore(
                        event.target.value
                      );
                      setWaterError("");
                      setWaterSuccess("");
                    }}
                  />

                  <NumberField
                    label={
                      text.daysAfter
                    }
                    value={
                      daysAfter
                    }
                    onChange={(
                      event
                    ) => {
                      setDaysAfter(
                        event.target.value
                      );
                      setWaterError("");
                      setWaterSuccess("");
                    }}
                  />
                </div>

                <ReadOnlyField
                  label={
                    text.timezone
                  }
                  value={
                    waterTimezone
                  }
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(210px,1fr))",
                    gap: 10,
                  }}
                >
                  <InfoBox
                    label={
                      text.managedMonth
                    }
                    value={
                      formatMonth(
                        managedPeriod
                          ?.period_year ||
                          calculatedPeriod
                            ?.period_year,
                        managedPeriod
                          ?.period_month ||
                          calculatedPeriod
                            ?.period_month,
                        language
                      )
                    }
                  />

                  <InfoBox
                    label={
                      text.currentStatus
                    }
                    value={
                      getStatusLabel(
                        managedPeriod
                          ?.status,
                        text
                      )
                    }
                  />
                </div>

                <InfoBox
                  label={
                    text.calculatedPeriod
                  }
                  value={`${formatDateTime(
                    calculatedPeriod
                      ?.collection_opens_at,
                    language,
                    waterTimezone
                  )} — ${formatDateTime(
                    calculatedPeriod
                      ?.collection_closes_at,
                    language,
                    waterTimezone
                  )}`}
                />

                {waterError && (
                  <div
                    role="alert"
                    style={errorStyle}
                  >
                    {waterError}
                  </div>
                )}

                {waterSuccess && (
                  <div
                    role="status"
                    style={successStyle}
                  >
                    {waterSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    waterSaving
                  }
                  style={
                    primaryButtonStyle(
                      waterSaving
                    )
                  }
                >
                  {waterSaving
                    ? text.savingWater
                    : text.saveWater}
                </button>
              </form>
            )}
          </section>
        )}

      {isAdmin &&
        mode === "admin" &&
        !mustChangePassword && (
          <section
            style={{
              ...sectionStyle,
              marginBottom: 18,
            }}
          >
            <SectionHeader
              eyebrow={
                text.backupSection
              }
              title={
                text.backupTitle
              }
              hint={
                text.backupHint
              }
            />

            {backupLoading ? (
              <div
                style={noticeStyle}
              >
                {text.backupLoading}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(210px,1fr))",
                    gap: 10,
                  }}
                >
                  <InfoBox
                    label={
                      text.automaticBackup
                    }
                    value={
                      backupStatus
                        ?.settings
                        ?.automatic_enabled
                        ? text.automaticOn
                        : text.automaticOff
                    }
                  />

                  <InfoBox
                    label={
                      text.lastBackup
                    }
                    value={
                      backupStatus
                        ?.last_run
                        ? `${getBackupStatusLabel(
                            backupStatus
                              .last_run
                              .status,
                            text
                          )} · ${formatDateTime(
                            backupStatus
                              .last_run
                              .completed_at ||
                            backupStatus
                              .last_run
                              .started_at ||
                            backupStatus
                              .last_run
                              .created_at,
                            language,
                            "Europe/Riga"
                          )}`
                        : text.noBackupRuns
                    }
                  />

                  <InfoBox
                    label={
                      text.lastSuccessfulBackup
                    }
                    value={
                      backupStatus
                        ?.last_successful_run
                        ? formatDateTime(
                            backupStatus
                              .last_successful_run
                              .completed_at ||
                            backupStatus
                              .last_successful_run
                              .created_at,
                            language,
                            "Europe/Riga"
                          )
                        : text.noBackupRuns
                    }
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(210px,1fr))",
                    gap: 10,
                  }}
                >
                  <InfoBox
                    label={
                      text.d1Main
                    }
                    value={
                      backupStatus
                        ?.protection
                        ?.main_d1_time_travel
                        ?.enabled
                        ? text.automaticOn
                        : text.automaticOff
                    }
                  />

                  <InfoBox
                    label={
                      text.d1Pii
                    }
                    value={
                      backupStatus
                        ?.protection
                        ?.pii_d1_time_travel
                        ?.enabled
                        ? text.automaticOn
                        : text.automaticOff
                    }
                  />

                  <InfoBox
                    label={
                      text.r2Protection
                    }
                    value={
                      backupStatus
                        ?.protection
                        ?.r2_bucket_lock
                        ?.enabled
                        ? `${text.automaticOn} · ${backupStatus
                            ?.protection
                            ?.r2_bucket_lock
                            ?.retention_days || "—"} ${text.days}`
                        : text.automaticOff
                    }
                  />

                  <InfoBox
                    label={
                      text.offsite
                    }
                    value={
                      backupStatus
                        ?.protection
                        ?.offsite_backup
                        ?.enabled
                        ? `${backupStatus
                            ?.protection
                            ?.offsite_backup
                            ?.provider || "—"} · ${backupStatus
                            ?.protection
                            ?.offsite_backup
                            ?.destination || "—"}`
                        : text.automaticOff
                    }
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(210px,1fr))",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    disabled={
                      backupSaving
                    }
                    onClick={
                      handleToggleAutomaticBackup
                    }
                    style={
                      secondaryButtonStyle(
                        backupSaving
                      )
                    }
                  >
                    {backupSaving
                      ? text.backupSaving
                      : backupStatus
                          ?.settings
                          ?.automatic_enabled
                        ? text.backupDisable
                        : text.backupEnable}
                  </button>

                  <button
                    type="button"
                    disabled={
                      backupCreating
                    }
                    onClick={
                      handleCreateBackup
                    }
                    style={
                      primaryButtonStyle(
                        backupCreating
                      )
                    }
                  >
                    {backupCreating
                      ? text.creatingBackup
                      : text.createBackup}
                  </button>

                  <button
                    type="button"
                    disabled={
                      backupLoading
                    }
                    onClick={
                      handleRefreshBackup
                    }
                    style={
                      secondaryButtonStyle(
                        backupLoading
                      )
                    }
                  >
                    {text.refreshBackup}
                  </button>
                </div>

                {backupError && (
                  <div
                    role="alert"
                    style={errorStyle}
                  >
                    {backupError}
                  </div>
                )}

                {backupSuccess && (
                  <div
                    role="status"
                    style={successStyle}
                  >
                    {backupSuccess}
                  </div>
                )}

                <div>
                  <div
                    style={{
                      marginBottom: 8,
                      color:
                        "var(--text-h)",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {text.recentRuns}
                  </div>

                  {backupRuns.length ===
                  0 ? (
                    <div
                      style={noticeStyle}
                    >
                      {text.noBackupRuns}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      {backupRuns.map(
                        (run) => (
                          <div
                            key={
                              run.id
                            }
                            style={{
                              padding: 12,
                              border:
                                "1px solid var(--border)",
                              borderRadius: 10,
                              background:
                                "var(--surface-soft)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent:
                                  "space-between",
                                gap: 12,
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              <div
                                style={{
                                  color:
                                    "var(--text-h)",
                                  fontSize: 12,
                                  fontWeight: 800,
                                }}
                              >
                                #{run.id} ·{" "}
                                {getBackupStatusLabel(
                                  run.status,
                                  text
                                )}
                              </div>

                              <div
                                style={{
                                  color:
                                    "var(--text)",
                                  fontSize: 11,
                                }}
                              >
                                {formatDateTime(
                                  run.completed_at ||
                                  run.started_at ||
                                  run.created_at,
                                  language,
                                  "Europe/Riga"
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: 8,
                                display:
                                  "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit,minmax(160px,1fr))",
                                gap: 8,
                              }}
                            >
                              <InfoBox
                                label={
                                  text.requestedBy
                                }
                                value={
                                  run.requested_by_nick ||
                                  "—"
                                }
                              />

                              <InfoBox
                                label={
                                  text.archive
                                }
                                value={
                                  run.archive_name ||
                                  "—"
                                }
                              />

                              <InfoBox
                                label={
                                  text.archiveSize
                                }
                                value={
                                  run.archive_size_bytes ===
                                    null ||
                                  run.archive_size_bytes ===
                                    undefined
                                    ? "—"
                                    : formatBytes(
                                        run.archive_size_bytes
                                      )
                                }
                              />

                              <InfoBox
                                label={
                                  text.r2Objects
                                }
                                value={
                                  run.r2_object_count ===
                                    null ||
                                  run.r2_object_count ===
                                    undefined
                                    ? "—"
                                    : String(
                                        run.r2_object_count
                                      )
                                }
                              />

                              <InfoBox
                                label={
                                  text.integrity
                                }
                                value={`${text.mainDb}: ${
                                  run.main_integrity ||
                                  "—"
                                } · ${text.piiDb}: ${
                                  run.pii_integrity ||
                                  "—"
                                }`}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

      {!mustChangePassword && (
        <section
          style={{
            ...sectionStyle,
            marginBottom: 18,
          }}
        >
          <SectionHeader
            eyebrow={
              text.notificationsSection
            }
            title={
              text.notificationsTitle
            }
            hint={
              text.notificationsHint
            }
          />

          {pushLoading ? (
            <div
              style={noticeStyle}
            >
              {text.notificationsLoading}
            </div>
          ) : !pushSupported ? (
            <div
              style={noticeStyle}
            >
              {text.notificationsUnsupported}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={
                  pushSubscribed
                    ? successStyle
                    : noticeStyle
                }
              >
                {pushSubscribed
                  ? text.notificationsEnabled
                  : pushPermission ===
                      "denied"
                    ? text.notificationsBlocked
                    : text.notificationsDisabled}
              </div>

              {isIosDevice() &&
                !isStandaloneMode() && (
                  <div
                    style={noticeStyle}
                  >
                    {text.notificationsIosHint}
                  </div>
                )}

              {pushError && (
                <div
                  role="alert"
                  style={errorStyle}
                >
                  {pushError}
                </div>
              )}

              <button
                type="button"
                disabled={
                  pushSaving ||
                  pushPermission ===
                    "denied"
                }
                onClick={
                  pushSubscribed
                    ? handleDisablePush
                    : handleEnablePush
                }
                style={
                  primaryButtonStyle(
                    pushSaving ||
                    pushPermission ===
                      "denied"
                  )
                }
              >
                {pushSaving
                  ? pushSubscribed
                    ? text.notificationsDisabling
                    : text.notificationsEnabling
                  : pushSubscribed
                    ? text.notificationsDisable
                    : text.notificationsEnable}
              </button>
            </div>
          )}
        </section>
      )}

      <section
        style={sectionStyle}
      >
        <SectionHeader
          eyebrow={
            text.security
          }
          title={
            text.password
          }
          hint={
            text.hint
          }
        />

        <form
          onSubmit={
            handleSubmit
          }
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          <PasswordField
            label={
              text.current
            }
            value={
              currentPassword
            }
            onChange={changeField(
              setCurrentPassword
            )}
            autoComplete="current-password"
          />

          <PasswordField
            label={
              text.next
            }
            value={
              newPassword
            }
            onChange={changeField(
              setNewPassword
            )}
            autoComplete="new-password"
          />

          <PasswordField
            label={
              text.confirm
            }
            value={
              confirmPassword
            }
            onChange={changeField(
              setConfirmPassword
            )}
            autoComplete="new-password"
          />

          {visibleError && (
            <div
              role="alert"
              style={errorStyle}
            >
              {visibleError}
            </div>
          )}

          {visibleSuccess && (
            <div
              role="status"
              style={successStyle}
            >
              {visibleSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={
              primaryButtonStyle(
                saving
              )
            }
          >
            {saving
              ? text.saving
              : text.change}
          </button>
        </form>
      </section>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  hint,
}) {
  return (
    <div
      style={{
        marginBottom: 18,
      }}
    >
      <div
        style={{
          color:
            "var(--text)",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing:
            "0.06em",
          textTransform:
            "uppercase",
        }}
      >
        {eyebrow}
      </div>

      <h2
        style={{
          margin:
            "5px 0 0",
          color:
            "var(--text-h)",
          fontSize: 19,
        }}
      >
        {title}
      </h2>

      <div
        style={{
          marginTop: 6,
          color:
            "var(--text)",
          fontSize: 11,
          lineHeight: 1.55,
        }}
      >
        {hint}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}) {
  return (
    <label style={fieldLabelStyle}>
      {label}

      <input
        type="password"
        value={value}
        onChange={onChange}
        autoComplete={
          autoComplete
        }
        style={inputStyle}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}) {
  return (
    <label style={fieldLabelStyle}>
      {label}

      <input
        type="number"
        min="0"
        max="31"
        step="1"
        value={value}
        onChange={onChange}
        inputMode="numeric"
        style={inputStyle}
      />
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
}) {
  return (
    <label style={fieldLabelStyle}>
      {label}

      <input
        type="text"
        value={value}
        readOnly
        style={{
          ...inputStyle,
          background:
            "var(--surface-soft)",
          cursor: "default",
        }}
      />
    </label>
  );
}

function InfoBox({
  label,
  value,
}) {
  return (
    <div
      style={{
        padding: 12,
        border:
          "1px solid var(--border)",
        borderRadius: 10,
        background:
          "var(--surface-soft)",
      }}
    >
      <div
        style={{
          color:
            "var(--text)",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          color:
            "var(--text-h)",
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.45,
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

const sectionStyle = {
  padding: 20,
  border:
    "1px solid var(--border)",
  borderRadius: 14,
  background:
    "var(--surface)",
  boxShadow:
    "0 6px 20px rgba(15,23,42,.05)",
};

const fieldLabelStyle = {
  display: "grid",
  gap: 6,
  color:
    "var(--text-h)",
  fontSize: 11,
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  minWidth: 0,
  minHeight: 42,
  boxSizing: "border-box",
  padding:
    "9px 11px",
  border:
    "1px solid var(--border)",
  borderRadius: 9,
  outline: "none",
  background:
    "var(--surface)",
  color:
    "var(--text-h)",
  font: "inherit",
  fontSize: 14,
};

const noticeStyle = {
  padding: 12,
  border:
    "1px solid var(--border)",
  borderRadius: 9,
  background:
    "var(--surface-soft)",
  color:
    "var(--text)",
  fontSize: 12,
};

const errorStyle = {
  padding: 12,
  border:
    "1px solid rgba(180,83,83,.28)",
  borderRadius: 9,
  background:
    "rgba(180,83,83,.06)",
  color: "#9f3f3f",
  fontSize: 12,
};

const successStyle = {
  padding: 12,
  border:
    "1px solid rgba(21,128,61,.24)",
  borderRadius: 9,
  background:
    "rgba(21,128,61,.06)",
  color: "#15803d",
  fontSize: 12,
};

function secondaryButtonStyle(
  disabled
) {
  return {
    minHeight: 42,
    padding:
      "9px 14px",
    border:
      "1px solid var(--border)",
    borderRadius: 9,
    background:
      disabled
        ? "var(--surface-soft)"
        : "var(--surface)",
    color:
      "var(--text-h)",
    fontSize: 12,
    fontWeight: 800,
    cursor:
      disabled
        ? "default"
        : "pointer",
  };
}

function primaryButtonStyle(
  disabled
) {
  return {
    minHeight: 42,
    padding:
      "9px 14px",
    border:
      "1px solid #1d4ed8",
    borderRadius: 9,
    background:
      disabled
        ? "#93a4c7"
        : "#2563eb",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 800,
    cursor:
      disabled
        ? "default"
        : "pointer",
  };
}
