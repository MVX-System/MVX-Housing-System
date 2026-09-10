import {
  useEffect,
  useMemo,
  useState,
} from "react";

import useWater from "../hooks/useWater";

import {
  useTranslation,
} from "../i18n";

const LOCALE_MAP = {
  lv: "lv-LV",
  en: "en-GB",
  ru: "ru-RU",
};

const TEXT = {
  en: {
    unknown: "Unknown",
    scheduled: "Scheduled",
    open: "Open",
    closed: "Closed",
    finalized: "Finalized",

    coldWater: "Cold Water",
    hotWater: "Hot Water",
    water: "Water",

    complete: "Complete",
    missingCurrent:
      "Missing current",
    missingPrevious:
      "Missing previous",
    negativeConsumption:
      "Negative consumption",

    title:
      "Monthly Report",
    subtitle:
      "Water meter collection status and monthly consumption summary.",
    downloadXlsx:
      "Download XLSX",
    loadingMonthlyReport:
      "Loading monthly report...",
    reportingPeriod:
      "Reporting period",
    collectionOpens:
      "Collection opens",
    collectionCloses:
      "Collection closes",

    apartments:
      "Apartments",
    submitted:
      "Submitted",
    missing:
      "Missing",
    meters:
      "Meters",
    waterConsumption:
      "Water consumption",
    total:
      "Total",

    attentionTitle:
      "Apartments requiring attention",
    attentionSubtitle:
      "Apartments with one or more missing meter readings.",
    allApartmentsSubmitted:
      "All apartments have submitted readings for every active meter.",

    apartmentNumberPrefix:
      "Apartment #",
    missingReadings:
      "Missing readings",
    meterCount:
      (count) =>
        `${count} ${count === 1 ? "meter" : "meters"}`,

    noDetailedMeterData:
      "No detailed meter data available.",
    locationNotAssigned:
      "Location not assigned",
    serialNumber:
      "Serial number",
    riser:
      "Riser",
    receiveReadings:
      "Receive readings",

    meterDetails:
      "Meter details",
    meterDetailsSubtitle:
      "Previous and current readings for every active water meter.",
    noActiveWaterMeters:
      "No active water meters found for this report.",

    apartment:
      "Apartment",
    totalWater:
      "Total Water",
    activeMeterCount:
      (count) =>
        `Active meters: ${count}`,

    receiveReadingsForApartment:
      (number) =>
        `Receive readings for Apartment #${number}`,
    noSerial:
      "No serial number",
    previous:
      "Previous",
    current:
      "Current",
    consumption:
      "Consumption",
    status:
      "Status",
    enterReading:
      "Enter reading",
    readingDate:
      "Reading date",
    closedLateEntryConfirmation:
      "This reporting period is closed. I confirm this late administrative entry.",
    source:
      "Source",
    paperNote:
      "Paper note",
    email:
      "Email",
    phone:
      "Phone",
    adminManual:
      "Admin manual",
    sourceNote:
      "Source note",
    sourceNotePlaceholder:
      "Example: Paper note received in mailbox",
    cancel:
      "Cancel",
    saving:
      "Saving...",
    saveReadings:
      "Save readings",

    typeLocation:
      "Type / Location",
    kitchen:
      "Kitchen",
    bathroom:
      "Bathroom",

    xlsxReportTitle:
      "Water Monthly Report",
    generatedAt:
      "Generated at",
    apartmentsTotal:
      "Apartments total",
    apartmentsSubmitted:
      "Apartments submitted",
    apartmentsMissing:
      "Apartments missing",
    metersTotal:
      "Meters total",
    metersSubmitted:
      "Meters submitted",
    metersMissing:
      "Meters missing",
    requiresAttention:
      "Requires attention",
    type:
      "Type",
    location:
      "Location",
    previousReading:
      "Previous Reading",
    currentReading:
      "Current Reading",
    problem:
      "Problem",

    xlsxSheetSummary:
      "Summary",
    xlsxSheetApartments:
      "Apartments",
    xlsxSheetMeterDetails:
      "Meter Details",
    xlsxSheetMissingData:
      "Missing Data",
    xlsxFilePrefix:
      "MVX_Water_Monthly_Report",

    xlsxUnavailable:
      "XLSX library is not available.",
    monthlyReportUnavailable:
      "Monthly report data is not available.",

    enterAtLeastOneReading:
      "Enter at least one reading",
    enterSourceNote:
      "Enter a source note",
    selectReadingDate:
      "Select reading date",
    selectReportingPeriod:
      "Select reporting period",
    confirmLateClosed:
      "Confirm the late entry for the closed reporting period",

    readingReceived:
      "Reading received",
    readingsReceived:
      (count) =>
        `${count} readings received`,
  },

  lv: {
    unknown: "Nezināms",
    scheduled: "Plānots",
    open: "Atvērts",
    closed: "Slēgts",
    finalized: "Pabeigts",

    coldWater: "Aukstais ūdens",
    hotWater: "Karstais ūdens",
    water: "Ūdens",

    complete: "Pilnīgi dati",
    missingCurrent:
      "Trūkst pašreizējā rādījuma",
    missingPrevious:
      "Trūkst iepriekšējā rādījuma",
    negativeConsumption:
      "Negatīvs patēriņš",

    title:
      "Mēneša pārskats",
    subtitle:
      "Ūdens skaitītāju rādījumu apkopošanas statuss un mēneša patēriņa kopsavilkums.",
    downloadXlsx:
      "Lejupielādēt XLSX",
    loadingMonthlyReport:
      "Notiek mēneša pārskata ielāde...",
    reportingPeriod:
      "Pārskata periods",
    collectionOpens:
      "Rādījumu iesniegšana sākas",
    collectionCloses:
      "Rādījumu iesniegšana beidzas",

    apartments:
      "Dzīvokļi",
    submitted:
      "Iesniegts",
    missing:
      "Trūkst",
    meters:
      "Skaitītāji",
    waterConsumption:
      "Ūdens patēriņš",
    total:
      "Kopā",

    attentionTitle:
      "Dzīvokļi, kuriem jāpievērš uzmanība",
    attentionSubtitle:
      "Dzīvokļi, kuros trūkst viena vai vairāku skaitītāju rādījumu.",
    allApartmentsSubmitted:
      "Visiem aktīvajiem skaitītājiem visos dzīvokļos rādījumi ir iesniegti.",

    apartmentNumberPrefix:
      "Dzīvoklis Nr. ",
    missingReadings:
      "Trūkst rādījumu",
    meterCount:
      (count) =>
        `${count} ${count === 1 ? "skaitītājs" : "skaitītāji"}`,

    noDetailedMeterData:
      "Detalizēti skaitītāju dati nav pieejami.",
    locationNotAssigned:
      "Atrašanās vieta nav norādīta",
    serialNumber:
      "Sērijas numurs",
    riser:
      "Stāvvads",
    receiveReadings:
      "Saņemt rādījumus",

    meterDetails:
      "Skaitītāju dati",
    meterDetailsSubtitle:
      "Iepriekšējie un pašreizējie visu aktīvo ūdens skaitītāju rādījumi.",
    noActiveWaterMeters:
      "Šim pārskatam nav atrasti aktīvi ūdens skaitītāji.",

    apartment:
      "Dzīvoklis",
    totalWater:
      "Ūdens kopā",
    activeMeterCount:
      (count) =>
        `Aktīvo skaitītāju skaits: ${count}`,

    receiveReadingsForApartment:
      (number) =>
        `Saņemt rādījumus dzīvoklim Nr. ${number}`,
    noSerial:
      "Sērijas numurs nav norādīts",
    previous:
      "Iepriekšējais",
    current:
      "Pašreizējais",
    consumption:
      "Patēriņš",
    status:
      "Statuss",
    enterReading:
      "Ievadiet rādījumu",
    readingDate:
      "Rādījuma datums",
    closedLateEntryConfirmation:
      "Šis pārskata periods ir slēgts. Es apstiprinu šo novēloto administratīvo ievadi.",
    source:
      "Avots",
    paperNote:
      "Papīra piezīme",
    email:
      "E-pasts",
    phone:
      "Tālrunis",
    adminManual:
      "Administratora manuāla ievade",
    sourceNote:
      "Piezīme par avotu",
    sourceNotePlaceholder:
      "Piemērs: papīra piezīme saņemta pastkastē",
    cancel:
      "Atcelt",
    saving:
      "Saglabā...",
    saveReadings:
      "Saglabāt rādījumus",

    typeLocation:
      "Tips / atrašanās vieta",
    kitchen:
      "Virtuve",
    bathroom:
      "Vannas istaba",

    xlsxReportTitle:
      "Ūdens mēneša pārskats",
    generatedAt:
      "Izveidots",
    apartmentsTotal:
      "Dzīvokļi kopā",
    apartmentsSubmitted:
      "Dzīvokļi ar iesniegtiem rādījumiem",
    apartmentsMissing:
      "Dzīvokļi ar trūkstošiem rādījumiem",
    metersTotal:
      "Skaitītāji kopā",
    metersSubmitted:
      "Skaitītāji ar iesniegtiem rādījumiem",
    metersMissing:
      "Skaitītāji ar trūkstošiem rādījumiem",
    requiresAttention:
      "Jāpievērš uzmanība",
    type:
      "Tips",
    location:
      "Atrašanās vieta",
    previousReading:
      "Iepriekšējais rādījums",
    currentReading:
      "Pašreizējais rādījums",
    problem:
      "Problēma",

    xlsxSheetSummary:
      "Kopsavilkums",
    xlsxSheetApartments:
      "Dzīvokļi",
    xlsxSheetMeterDetails:
      "Skaitītāju dati",
    xlsxSheetMissingData:
      "Trūkstošie dati",
    xlsxFilePrefix:
      "MVX_Ūdens_mēneša_pārskats",

    xlsxUnavailable:
      "XLSX bibliotēka nav pieejama.",
    monthlyReportUnavailable:
      "Mēneša pārskata dati nav pieejami.",

    enterAtLeastOneReading:
      "Ievadiet vismaz vienu rādījumu",
    enterSourceNote:
      "Ievadiet piezīmi par avotu",
    selectReadingDate:
      "Izvēlieties rādījuma datumu",
    selectReportingPeriod:
      "Izvēlieties pārskata periodu",
    confirmLateClosed:
      "Apstipriniet novēloto ievadi slēgtajam pārskata periodam",

    readingReceived:
      "Rādījums saņemts",
    readingsReceived:
      (count) =>
        `Saņemto rādījumu skaits: ${count}`,
  },

  ru: {
    unknown: "Неизвестно",
    scheduled: "Запланирован",
    open: "Открыт",
    closed: "Закрыт",
    finalized: "Завершён",

    coldWater: "Холодная вода",
    hotWater: "Горячая вода",
    water: "Вода",

    complete: "Полные данные",
    missingCurrent:
      "Отсутствует текущее показание",
    missingPrevious:
      "Отсутствует предыдущее показание",
    negativeConsumption:
      "Отрицательный расход",

    title:
      "Ежемесячный отчёт",
    subtitle:
      "Статус сбора показаний водомеров и сводка месячного потребления.",
    downloadXlsx:
      "Скачать XLSX",
    loadingMonthlyReport:
      "Загрузка ежемесячного отчёта...",
    reportingPeriod:
      "Отчётный период",
    collectionOpens:
      "Начало сбора показаний",
    collectionCloses:
      "Окончание сбора показаний",

    apartments:
      "Квартиры",
    submitted:
      "Сданы",
    missing:
      "Отсутствуют",
    meters:
      "Счётчики",
    waterConsumption:
      "Потребление воды",
    total:
      "Всего",

    attentionTitle:
      "Квартиры, требующие внимания",
    attentionSubtitle:
      "Квартиры, в которых отсутствуют показания одного или нескольких счётчиков.",
    allApartmentsSubmitted:
      "По всем активным счётчикам всех квартир показания получены.",

    apartmentNumberPrefix:
      "Квартира № ",
    missingReadings:
      "Отсутствуют показания",
    meterCount:
      (count) => {
        const value =
          Math.abs(Number(count));

        const mod10 =
          value % 10;

        const mod100 =
          value % 100;

        const word =
          mod10 === 1 &&
          mod100 !== 11
            ? "счётчик"
            : (
                mod10 >= 2 &&
                mod10 <= 4 &&
                !(
                  mod100 >= 12 &&
                  mod100 <= 14
                )
                  ? "счётчика"
                  : "счётчиков"
              );

        return `${count} ${word}`;
      },

    noDetailedMeterData:
      "Подробные данные счётчиков недоступны.",
    locationNotAssigned:
      "Расположение не указано",
    serialNumber:
      "Серийный номер",
    riser:
      "Стояк",
    receiveReadings:
      "Принять показания",

    meterDetails:
      "Данные счётчиков",
    meterDetailsSubtitle:
      "Предыдущие и текущие показания всех активных водомеров.",
    noActiveWaterMeters:
      "Для этого отчёта активные водомеры не найдены.",

    apartment:
      "Квартира",
    totalWater:
      "Вода всего",
    activeMeterCount:
      (count) =>
        `Активных счётчиков: ${count}`,

    receiveReadingsForApartment:
      (number) =>
        `Принять показания для квартиры № ${number}`,
    noSerial:
      "Серийный номер не указан",
    previous:
      "Предыдущее",
    current:
      "Текущее",
    consumption:
      "Расход",
    status:
      "Статус",
    enterReading:
      "Введите показание",
    readingDate:
      "Дата показания",
    closedLateEntryConfirmation:
      "Этот отчётный период закрыт. Я подтверждаю поздний административный ввод.",
    source:
      "Источник",
    paperNote:
      "Бумажная записка",
    email:
      "Электронная почта",
    phone:
      "Телефон",
    adminManual:
      "Ручной ввод администратором",
    sourceNote:
      "Примечание об источнике",
    sourceNotePlaceholder:
      "Например: бумажная записка получена в почтовом ящике",
    cancel:
      "Отмена",
    saving:
      "Сохранение...",
    saveReadings:
      "Сохранить показания",

    typeLocation:
      "Тип / расположение",
    kitchen:
      "Кухня",
    bathroom:
      "Ванная",

    xlsxReportTitle:
      "Ежемесячный отчёт по воде",
    generatedAt:
      "Сформирован",
    apartmentsTotal:
      "Квартир всего",
    apartmentsSubmitted:
      "Квартиры с полученными показаниями",
    apartmentsMissing:
      "Квартиры с отсутствующими показаниями",
    metersTotal:
      "Счётчиков всего",
    metersSubmitted:
      "Счётчики с полученными показаниями",
    metersMissing:
      "Счётчики с отсутствующими показаниями",
    requiresAttention:
      "Требует внимания",
    type:
      "Тип",
    location:
      "Расположение",
    previousReading:
      "Предыдущее показание",
    currentReading:
      "Текущее показание",
    problem:
      "Проблема",

    xlsxSheetSummary:
      "Сводка",
    xlsxSheetApartments:
      "Квартиры",
    xlsxSheetMeterDetails:
      "Данные счётчиков",
    xlsxSheetMissingData:
      "Отсутствующие данные",
    xlsxFilePrefix:
      "MVX_Ежемесячный_отчёт_по_воде",

    xlsxUnavailable:
      "Библиотека XLSX недоступна.",
    monthlyReportUnavailable:
      "Данные ежемесячного отчёта недоступны.",

    enterAtLeastOneReading:
      "Введите хотя бы одно показание",
    enterSourceNote:
      "Введите примечание об источнике",
    selectReadingDate:
      "Выберите дату показания",
    selectReportingPeriod:
      "Выберите отчётный период",
    confirmLateClosed:
      "Подтвердите поздний ввод для закрытого отчётного периода",

    readingReceived:
      "Показание принято",
    readingsReceived:
      (count) =>
        `Получено показаний: ${count}`,
  },
};

export default function AdminMonthlyReportPage() {

  const {
    language,
  } = useTranslation();

  const text =
    useMemo(
      () =>
        TEXT[language] ||
        TEXT.en,
      [language]
    );

  const locale =
    LOCALE_MAP[language] ||
    "en-GB";

  const [
    isMobile,
    setIsMobile
  ] = useState(
    window.innerWidth < 768
  );

  const [
    expandedAttentionApartments,
    setExpandedAttentionApartments
  ] = useState({});

  const [
    receiveReadingsApartmentId,
    setReceiveReadingsApartmentId
  ] = useState(null);

  const [
    receiveReadingValues,
    setReceiveReadingValues
  ] = useState({});

  const [
    receiveReadingSource,
    setReceiveReadingSource
  ] = useState("paper_note");

  const [
    receiveReadingNote,
    setReceiveReadingNote
  ] = useState("");

  const [
    receiveReadingDate,
    setReceiveReadingDate
  ] = useState("");

  const [
    confirmClosedPeriodEntry,
    setConfirmClosedPeriodEntry
  ] = useState(false);

  const [
    selectedPeriodId,
    setSelectedPeriodId
  ] = useState("");

  const [
    receiveReadingsSubmitting,
    setReceiveReadingsSubmitting
  ] = useState(false);

  const {

    currentWaterReportingPeriod,
    currentWaterReportingPeriodLoading,
    currentWaterReportingPeriodError,
    loadCurrentWaterReportingPeriod,

    adminReadingEntryPeriods,
    adminReadingEntryPeriodsLoading,
    adminReadingEntryPeriodsError,
    loadAdminReadingEntryPeriods,

    adminMonthlyReport,
    adminMonthlyReportLoading,
    adminMonthlyReportError,
    loadAdminMonthlyReport,
    submitAdminReading,

  } = useWater();

  useEffect(() => {

    const handleResize = () => {

      setIsMobile(
        window.innerWidth < 768
      );
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        handleResize
      );

  }, []);

  useEffect(() => {

    const loadReport = async () => {

      const current =
        await loadCurrentWaterReportingPeriod();

      const periods =
        await loadAdminReadingEntryPeriods();

      const currentPeriod =
        current?.period || null;

      const defaultPeriod =
        currentPeriod ||
        periods.find(
          (item) =>
            item.status === "open"
        ) ||
        periods.find(
          (item) =>
            item.status === "closed"
        ) ||
        null;

      if (!defaultPeriod) {
        return;
      }

      setSelectedPeriodId(
        String(defaultPeriod.id)
      );

      await loadAdminMonthlyReport(
        defaultPeriod.period_year,
        defaultPeriod.period_month
      );
    };

    loadReport();

  }, []);

  const summary =
    adminMonthlyReport?.summary;

  const period =
    adminMonthlyReport?.period ||
    currentWaterReportingPeriod?.period;

  const reportingPeriods = [
    ...(
      currentWaterReportingPeriod?.period
        ? [
            currentWaterReportingPeriod.period
          ]
        : []
    ),
    ...adminReadingEntryPeriods,
  ]
    .filter(
      (
        item,
        index,
        items
      ) =>
        items.findIndex(
          (candidate) =>
            String(candidate.id) ===
            String(item.id)
        ) === index
    )
    .sort(
      (a, b) =>
        Number(b.period_year) -
          Number(a.period_year) ||
        Number(b.period_month) -
          Number(a.period_month)
    );

  const selectedEntryPeriod =
    adminReadingEntryPeriods.find(
      (item) =>
        String(item.id) ===
        String(selectedPeriodId)
    ) ||
    null;

  const isClosedEntryPeriod =
    selectedEntryPeriod?.status ===
    "closed";

  const missingApartments =
    Array.isArray(
      adminMonthlyReport
        ?.missing_apartments
    )
      ? adminMonthlyReport
          .missing_apartments
      : [];

  const reportRows =
    Array.isArray(
      adminMonthlyReport?.rows
    )
      ? adminMonthlyReport.rows
      : [];

  const apartmentGroups =
    Object.values(
      reportRows.reduce(
        (
          groups,
          row
        ) => {

          const key =
            String(
              row.apartment_id
            );

          if (!groups[key]) {

            groups[key] = {
              apartment_id:
                row.apartment_id,

              apartment_number:
                row.apartment_number,

              rows: [],
            };
          }

          groups[key].rows.push(
            row
          );

          return groups;
        },
        {}
      )
    ).sort(
      (a, b) =>
        Number(
          a.apartment_number
        ) -
        Number(
          b.apartment_number
        )
    );

  const isLoading =
    currentWaterReportingPeriodLoading ||
    adminReadingEntryPeriodsLoading ||
    adminMonthlyReportLoading;

  const errorMessage =
    currentWaterReportingPeriodError ||
    adminReadingEntryPeriodsError ||
    adminMonthlyReportError;

  const formatMonth = (
    year,
    month
  ) => {

    if (!year || !month) {
      return "—";
    }

    const date = new Date(
      Date.UTC(
        year,
        month - 1,
        1
      )
    );

    return date.toLocaleDateString(
      locale,
      {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }
    );
  };

  const formatDateTime = (
    value
  ) => {

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
      return value;
    }

    return date.toLocaleString(
      locale,
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Riga",
      }
    );
  };

  const formatConsumption = (
    value
  ) => {

    const storedValue =
      Number(value);

    if (
      !Number.isFinite(
        storedValue
      )
    ) {
      return "0,000 m³";
    }

    return (
      (storedValue / 1000)
        .toFixed(3)
        .replace(".", ",") +
      " m³"
    );
  };

  const formatStatus = (
    value
  ) => {

    const normalizedValue =
      String(value || "")
        .trim()
        .toLowerCase();

    if (!normalizedValue) {
      return text.unknown;
    }

    const labels = {
      scheduled: text.scheduled,
      open: text.open,
      closed: text.closed,
      finalized: text.finalized,
    };

    return (
      labels[normalizedValue] ||
      (
        normalizedValue
          .charAt(0)
          .toUpperCase() +
        normalizedValue.slice(1)
      )
    );
  };

  const getStatusStyle = (
    status
  ) => {

    const normalizedStatus =
      String(status || "")
        .toLowerCase();

    if (
      normalizedStatus === "open"
    ) {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (
      normalizedStatus === "closed"
    ) {
      return {
        background: "#fef3c7",
        color: "#92400e",
      };
    }

    if (
      normalizedStatus ===
      "finalized"
    ) {
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    return {
      background: "#f3f4f6",
      color: "#4b5563",
    };
  };

  const formatMeterType = (
    value
  ) => {

    const normalizedValue =
      String(value || "")
        .trim()
        .toLowerCase();

    if (normalizedValue === "cold") {
      return text.coldWater;
    }

    if (normalizedValue === "hot") {
      return text.hotWater;
    }

    return value || text.water;
  };

  const formatLocation = (
    value
  ) => {

    const normalizedValue =
      String(value || "")
        .trim()
        .toLowerCase();

    if (
      normalizedValue === "kitchen" ||
      normalizedValue === "k"
    ) {
      return text.kitchen;
    }

    if (
      normalizedValue === "bathroom" ||
      normalizedValue === "b"
    ) {
      return text.bathroom;
    }

    return value || "";
  };

  const formatRowStatus = (
    value
  ) => {

    const labels = {
      complete:
        text.complete,
      missing_current:
        text.missingCurrent,
      missing_previous:
        text.missingPrevious,
      negative_consumption:
        text.negativeConsumption,
    };

    return (
      labels[value] ||
      formatStatus(value)
    );
  };

  const getRowStatusStyle = (
    value
  ) => {

    if (value === "complete") {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (
      value ===
      "negative_consumption"
    ) {
      return {
        background: "#fee2e2",
        color: "#b91c1c",
      };
    }

    return {
      background: "#ffedd5",
      color: "#9a3412",
    };
  };

  const toCubicMeters = (
    value
  ) => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const storedValue =
      Number(value);

    if (
      !Number.isFinite(
        storedValue
      )
    ) {
      return null;
    }

    return storedValue / 1000;
  };

  const getApartmentConsumption =
    (
      rows,
      type = null
    ) => {

      return rows
        .filter(
          (row) => {

            if (!type) {
              return true;
            }

            return (
              String(
                row.type || ""
              )
                .trim()
                .toLowerCase() ===
              type
            );
          }
        )
        .reduce(
          (
            total,
            row
          ) => {

            const value =
              Number(
                row.consumption
              );

            if (
              !Number.isFinite(
                value
              ) ||
              value < 0
            ) {
              return total;
            }

            return total + value;
          },
          0
        );
    };

  const setWorksheetColumns =
    (
      worksheet,
      widths
    ) => {

      worksheet["!cols"] =
        widths.map(
          (width) => ({
            wch: width,
          })
        );
    };

  const applyThreeDecimalFormat =
    (
      worksheet,
      columns,
      startRow,
      endRow
    ) => {

      for (
        let row = startRow;
        row <= endRow;
        row += 1
      ) {

        columns.forEach(
          (column) => {

            const address =
              `${column}${row}`;

            const cell =
              worksheet[address];

            if (
              cell &&
              cell.t === "n"
            ) {
              cell.z = "0.000";
            }
          }
        );
      }
    };

  const handleDownloadXlsx = () => {

    const XLSX =
      window.XLSX;

    if (!XLSX) {

      alert(
        text.xlsxUnavailable
      );

      return;
    }

    if (
      !adminMonthlyReport ||
      !summary ||
      !period
    ) {

      alert(
        text.monthlyReportUnavailable
      );

      return;
    }

    const generatedAt =
      new Date();

    const periodName =
      formatMonth(
        period.period_year,
        period.period_month
      );

    const coldTotal =
      Number(
        summary.cold_consumption ||
        0
      );

    const hotTotal =
      Number(
        summary.hot_consumption ||
        0
      );

    const totalWater =
      coldTotal +
      hotTotal;

    const workbook =
      XLSX.utils.book_new();

    // =====================================
    // SUMMARY
    // =====================================

    const summaryData = [
      [
        "MVX System",
        text.xlsxReportTitle,
      ],
      [],
      [
        text.reportingPeriod,
        periodName,
      ],
      [
        text.status,
        formatStatus(
          period.status
        ),
      ],
      [
        text.collectionOpens,
        formatDateTime(
          period.collection_opens_at
        ),
      ],
      [
        text.collectionCloses,
        formatDateTime(
          period.collection_closes_at
        ),
      ],
      [
        text.generatedAt,
        generatedAt.toLocaleString(
          locale,
          {
            timeZone: "Europe/Riga",
          }
        ),
      ],
      [],
      [
        text.apartmentsTotal,
        Number(
          summary.apartments_total ||
          0
        ),
      ],
      [
        text.apartmentsSubmitted,
        Number(
          summary.apartments_submitted ||
          0
        ),
      ],
      [
        text.apartmentsMissing,
        Number(
          summary.apartments_missing ||
          0
        ),
      ],
      [],
      [
        text.metersTotal,
        Number(
          summary.meters_total ||
          0
        ),
      ],
      [
        text.metersSubmitted,
        Number(
          summary.meters_submitted ||
          0
        ),
      ],
      [
        text.metersMissing,
        Number(
          summary.meters_missing ||
          0
        ),
      ],
      [],
      [
        `${text.coldWater}, m³`,
        toCubicMeters(
          coldTotal
        ),
      ],
      [
        `${text.hotWater}, m³`,
        toCubicMeters(
          hotTotal
        ),
      ],
      [
        `${text.totalWater}, m³`,
        toCubicMeters(
          totalWater
        ),
      ],
    ];

    const summarySheet =
      XLSX.utils.aoa_to_sheet(
        summaryData
      );

    setWorksheetColumns(
      summarySheet,
      [28, 26]
    );

    applyThreeDecimalFormat(
      summarySheet,
      ["B"],
      17,
      19
    );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      text.xlsxSheetSummary
    );

    // =====================================
    // APARTMENTS
    // =====================================

    const apartmentRows =
      apartmentGroups.map(
        (group) => {

          const rows =
            group.rows || [];

          const cold =
            getApartmentConsumption(
              rows,
              "cold"
            );

          const hot =
            getApartmentConsumption(
              rows,
              "hot"
            );

          const hasProblems =
            rows.some(
              (row) =>
                row.status !==
                "complete"
            );

          return {
            [text.apartment]:
              String(
                group.apartment_number
              ),

            [`${text.coldWater}, m³`]:
              toCubicMeters(
                cold
              ),

            [`${text.hotWater}, m³`]:
              toCubicMeters(
                hot
              ),

            [`${text.totalWater}, m³`]:
              toCubicMeters(
                cold + hot
              ),

            [text.meters]:
              rows.length,

            [text.status]:
              hasProblems
                ? text.requiresAttention
                : text.complete,
          };
        }
      );

    const apartmentsSheet =
      XLSX.utils.json_to_sheet(
        apartmentRows
      );

    setWorksheetColumns(
      apartmentsSheet,
      [12, 18, 18, 18, 10, 22]
    );

    if (
      apartmentRows.length > 0
    ) {

      apartmentsSheet[
        "!autofilter"
      ] = {
        ref:
          apartmentsSheet["!ref"],
      };

      applyThreeDecimalFormat(
        apartmentsSheet,
        ["B", "C", "D"],
        2,
        apartmentRows.length + 1
      );
    }

    XLSX.utils.book_append_sheet(
      workbook,
      apartmentsSheet,
      text.xlsxSheetApartments
    );

    // =====================================
    // METER DETAILS
    // =====================================

    const meterRows =
      reportRows.map(
        (row) => ({

          [text.apartment]:
            String(
              row.apartment_number
            ),

          [text.type]:
            formatMeterType(
              row.type
            ),

          [text.location]:
            formatLocation(
              row.local_label
            ),

          [text.serialNumber]:
            String(
              row.serial_number ||
              ""
            ),

          [text.riser]:
            String(
              row.riser_code ||
              ""
            ),

          [`${text.previousReading}, m³`]:
            toCubicMeters(
              row.previous_reading
            ),

          [`${text.currentReading}, m³`]:
            toCubicMeters(
              row.current_reading
            ),

          [`${text.consumption}, m³`]:
            toCubicMeters(
              row.consumption
            ),

          [text.status]:
            formatRowStatus(
              row.status
            ),
        })
      );

    const meterDetailsSheet =
      XLSX.utils.json_to_sheet(
        meterRows
      );

    setWorksheetColumns(
      meterDetailsSheet,
      [
        12,
        16,
        18,
        20,
        20,
        22,
        22,
        20,
        24,
      ]
    );

    if (meterRows.length > 0) {

      meterDetailsSheet[
        "!autofilter"
      ] = {
        ref:
          meterDetailsSheet["!ref"],
      };

      applyThreeDecimalFormat(
        meterDetailsSheet,
        ["F", "G", "H"],
        2,
        meterRows.length + 1
      );
    }

    XLSX.utils.book_append_sheet(
      workbook,
      meterDetailsSheet,
      text.xlsxSheetMeterDetails
    );

    // =====================================
    // MISSING DATA
    // =====================================

    const missingRows =
      reportRows
        .filter(
          (row) =>
            row.status !==
            "complete"
        )
        .map(
          (row) => ({

            [text.apartment]:
              String(
                row.apartment_number
              ),

            [text.type]:
              formatMeterType(
                row.type
              ),

            [text.location]:
              formatLocation(
                row.local_label
              ),

            [text.serialNumber]:
              String(
                row.serial_number ||
                ""
              ),

            [text.riser]:
              String(
                row.riser_code ||
                ""
              ),

            [text.problem]:
              formatRowStatus(
                row.status
              ),
          })
        );

    const missingDataSheet =
      XLSX.utils.json_to_sheet(
        missingRows
      );

    setWorksheetColumns(
      missingDataSheet,
      [12, 16, 18, 20, 20, 24]
    );

    if (
      missingRows.length > 0
    ) {

      missingDataSheet[
        "!autofilter"
      ] = {
        ref:
          missingDataSheet["!ref"],
      };
    }

    XLSX.utils.book_append_sheet(
      workbook,
      missingDataSheet,
      text.xlsxSheetMissingData
    );

    const safeMonth =
      String(
        period.period_month
      ).padStart(2, "0");

    const fileName =
      `${text.xlsxFilePrefix}_${period.period_year}-${safeMonth}.xlsx`;

    XLSX.writeFileXLSX(
      workbook,
      fileName,
      {
        compression: true,
      }
    );
  };

  const getLastDayOfPeriodMonth =
    (periodValue) => {

      if (
        !periodValue?.period_year ||
        !periodValue?.period_month
      ) {
        return "";
      }

      const lastDay =
        new Date(
          Date.UTC(
            Number(
              periodValue.period_year
            ),
            Number(
              periodValue.period_month
            ),
            0
          )
        )
          .getUTCDate();

      return `${periodValue.period_year}-${String(
        periodValue.period_month
      ).padStart(2, "0")}-${String(
        lastDay
      ).padStart(2, "0")}`;
    };

  const getPeriodDateLimits =
    (periodValue) => {

      if (
        !periodValue?.period_year ||
        !periodValue?.period_month
      ) {
        return {
          min: "",
          max: "",
        };
      }

      const prefix =
        `${periodValue.period_year}-${String(
          periodValue.period_month
        ).padStart(2, "0")}`;

      return {
        min: `${prefix}-01`,
        max:
          getLastDayOfPeriodMonth(
            periodValue
          ),
      };
    };

  const handlePeriodChange =
    async (value) => {

      const nextPeriod =
        reportingPeriods.find(
          (item) =>
            String(item.id) ===
            String(value)
        );

      if (!nextPeriod) {
        return;
      }

      closeReceiveReadings();
      setSelectedPeriodId(
        String(nextPeriod.id)
      );

      await loadAdminMonthlyReport(
        nextPeriod.period_year,
        nextPeriod.period_month
      );
    };

  const openReceiveReadings =
    (
      apartmentId,
      apartmentRows
    ) => {

      const initialValues = {};

      apartmentRows.forEach(
        (row) => {

          initialValues[
            row.meter_id
          ] = "";
        }
      );

      setReceiveReadingsApartmentId(
        apartmentId
      );

      setReceiveReadingValues(
        initialValues
      );

      setReceiveReadingSource(
        "paper_note"
      );

      setReceiveReadingNote(
        ""
      );

      setReceiveReadingDate(
        getLastDayOfPeriodMonth(
          selectedEntryPeriod
        )
      );

      setConfirmClosedPeriodEntry(
        false
      );
    };

  const closeReceiveReadings =
    () => {

      if (
        receiveReadingsSubmitting
      ) {
        return;
      }

      setReceiveReadingsApartmentId(
        null
      );

      setReceiveReadingValues(
        {}
      );

      setReceiveReadingNote(
        ""
      );

      setReceiveReadingDate(
        ""
      );

      setConfirmClosedPeriodEntry(
        false
      );
    };

  const handleReceiveValueChange =
    (
      meterId,
      value
    ) => {

      if (
        /^[0-9]*([,.][0-9]{0,3})?$/.test(
          value
        )
      ) {

        setReceiveReadingValues(
          (current) => ({
            ...current,
            [meterId]: value,
          })
        );
      }
    };

  const saveReceivedReadings =
    async (
      apartmentRows
    ) => {

      const rowsToSubmit =
        apartmentRows.filter(
          (row) =>
            String(
              receiveReadingValues[
                row.meter_id
              ] || ""
            ).trim() !== ""
        );

      if (
        rowsToSubmit.length === 0
      ) {

        alert(
          text.enterAtLeastOneReading
        );

        return;
      }

      if (
        !String(
          receiveReadingNote || ""
        ).trim()
      ) {

        alert(
          text.enterSourceNote
        );

        return;
      }

      if (!receiveReadingDate) {
        alert(
          text.selectReadingDate
        );
        return;
      }

      if (
        !selectedEntryPeriod?.id
      ) {
        alert(
          text.selectReportingPeriod
        );
        return;
      }

      if (
        isClosedEntryPeriod &&
        !confirmClosedPeriodEntry
      ) {
        alert(
          text.confirmLateClosed
        );
        return;
      }

      setReceiveReadingsSubmitting(
        true
      );

      let successfulCount = 0;

      try {

        for (
          const row of rowsToSubmit
        ) {

          const success =
            await submitAdminReading(
              row.meter_id,
              receiveReadingValues[
                row.meter_id
              ],
              receiveReadingSource,
              receiveReadingNote,
              {
                suppressSuccessAlert:
                  true,
                suppressReload:
                  true,
                reportingPeriodId:
                  selectedEntryPeriod.id,
                readingDate:
                  receiveReadingDate,
                confirmClosedPeriod:
                  confirmClosedPeriodEntry,
              }
            );

          if (!success) {
            break;
          }

          successfulCount += 1;
        }

        if (
          successfulCount > 0
        ) {

          await loadAdminMonthlyReport(
            period.period_year,
            period.period_month
          );
        }

        if (
          successfulCount ===
          rowsToSubmit.length
        ) {

          setReceiveReadingsApartmentId(
            null
          );

          setReceiveReadingValues(
            {}
          );

          setReceiveReadingNote(
            ""
          );

          setReceiveReadingDate(
            ""
          );

          setConfirmClosedPeriodEntry(
            false
          );

          alert(
            successfulCount === 1
              ? text.readingReceived
              : text.readingsReceived(
                  successfulCount
                )
          );
        }

      } finally {

        setReceiveReadingsSubmitting(
          false
        );
      }
    };

  const toggleAttentionApartment =
    (apartmentId) => {

      setExpandedAttentionApartments(
        (current) => ({
          ...current,

          [apartmentId]:
            !current[apartmentId],
        })
      );
    };

  return (
    <div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >

        <div>

          <h1
            style={{
              margin: 0,
            }}
          >
            {text.title}
          </h1>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "#6b7280",
              lineHeight: 1.5,
            }}
          >
            {text.subtitle}
          </p>

        </div>

        <button
          type="button"
          onClick={
            handleDownloadXlsx
          }
          disabled={
            isLoading ||
            !adminMonthlyReport ||
            !summary ||
            !period
          }
          style={{
            padding:
              "10px 14px",
            border:
              "1px solid #1d4ed8",
            borderRadius: 10,
            background:
              isLoading ||
              !adminMonthlyReport ||
              !summary ||
              !period
                ? "#e5e7eb"
                : "#2563eb",
            color:
              isLoading ||
              !adminMonthlyReport ||
              !summary ||
              !period
                ? "#6b7280"
                : "#ffffff",
            fontSize: 13,
            fontWeight: 700,
            cursor:
              isLoading ||
              !adminMonthlyReport ||
              !summary ||
              !period
                ? "not-allowed"
                : "pointer",
            whiteSpace:
              "nowrap",
          }}
        >
          {text.downloadXlsx}
        </button>

      </div>

      {isLoading && (

        <div
          style={{
            padding: 20,
            border:
              "1px solid #e5e7eb",
            borderRadius: 14,
            background: "#ffffff",
            color: "#6b7280",
          }}
        >
          {text.loadingMonthlyReport}
        </div>

      )}

      {!isLoading &&
        errorMessage && (

        <div
          style={{
            padding: 16,
            border:
              "1px solid #fecaca",
            borderRadius: 12,
            background: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          {errorMessage}
        </div>

      )}

      {!isLoading &&
        !errorMessage &&
        adminMonthlyReport &&
        summary &&
        period && (

        <>

          <section
            style={{
              marginBottom: 20,
              padding: 18,
              border:
                "1px solid #e5e7eb",
              borderRadius: 16,
              background: "#ffffff",
              boxShadow:
                "0 4px 16px rgba(15, 23, 42, 0.05)",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >

              <div>

                <div
                  style={{
                    color: "#6b7280",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      "0.04em",
                    marginBottom: 5,
                  }}
                >
                  {text.reportingPeriod}
                </div>

                {reportingPeriods.length > 1 ? (

                  <select
                    value={
                      selectedPeriodId
                    }
                    onChange={(event) =>
                      handlePeriodChange(
                        event.target.value
                      )
                    }
                    style={{
                      minWidth: 220,
                      padding: "8px 10px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: 8,
                      background:
                        "#ffffff",
                      color: "#111827",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {reportingPeriods.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {formatMonth(
                            item.period_year,
                            item.period_month
                          )}
                          {" · "}
                          {formatStatus(
                            item.status
                          )}
                        </option>
                      )
                    )}
                  </select>

                ) : (

                  <h2
                    style={{
                      margin: 0,
                      fontSize: 22,
                    }}
                  >
                    {formatMonth(
                      period.period_year,
                      period.period_month
                    )}
                  </h2>

                )}

              </div>

              <span
                style={{
                  ...getStatusStyle(
                    period.status
                  ),
                  padding: "6px 11px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.03em",
                }}
              >
                {formatStatus(
                  period.status
                )}
              </span>

            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
                marginTop: 16,
                paddingTop: 14,
                borderTop:
                  "1px solid #e5e7eb",
              }}
            >

              <InfoItem
                label={text.collectionOpens}
                value={formatDateTime(
                  period.collection_opens_at
                )}
              />

              <InfoItem
                label={text.collectionCloses}
                value={formatDateTime(
                  period.collection_closes_at
                )}
              />

            </div>

          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >

            <SummaryGroupCard
              title={text.apartments}
              primaryLabel={text.total}
              primaryValue={
                summary.apartments_total
              }
              items={[
                {
                  label: text.submitted,
                  value:
                    summary.apartments_submitted,
                },
                {
                  label: text.missing,
                  value:
                    summary.apartments_missing,
                  warning:
                    summary.apartments_missing >
                    0,
                },
              ]}
            />

            <SummaryGroupCard
              title={text.meters}
              primaryLabel={text.total}
              primaryValue={
                summary.meters_total
              }
              items={[
                {
                  label: text.submitted,
                  value:
                    summary.meters_submitted,
                },
                {
                  label: text.missing,
                  value:
                    summary.meters_missing,
                  warning:
                    summary.meters_missing >
                    0,
                },
              ]}
            />

            <SummaryGroupCard
              title={text.waterConsumption}
              primaryLabel={text.total}
              primaryValue={
                formatConsumption(
                  Number(
                    summary.cold_consumption ||
                    0
                  ) +
                  Number(
                    summary.hot_consumption ||
                    0
                  )
                )
              }
              items={[
                {
                  label: text.coldWater,
                  value:
                    formatConsumption(
                      summary.cold_consumption
                    ),
                },
                {
                  label: text.hotWater,
                  value:
                    formatConsumption(
                      summary.hot_consumption
                    ),
                },
              ]}
            />

          </div>

          <section
            style={{
              padding: 18,
              border:
                "1px solid #e5e7eb",
              borderRadius: 16,
              background: "#ffffff",
              boxShadow:
                "0 4px 16px rgba(15, 23, 42, 0.05)",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
                paddingBottom: 12,
                borderBottom:
                  "1px solid #e5e7eb",
              }}
            >

              <div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                  }}
                >
                  {text.attentionTitle}
                </h2>

                <p
                  style={{
                    marginTop: 5,
                    marginBottom: 0,
                    color: "#6b7280",
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  {text.attentionSubtitle}
                </p>

              </div>

              <span
                style={{
                  minWidth: 32,
                  padding: "5px 9px",
                  borderRadius: 999,
                  background:
                    missingApartments
                      .length > 0
                      ? "#ffedd5"
                      : "#dcfce7",
                  color:
                    missingApartments
                      .length > 0
                      ? "#9a3412"
                      : "#166534",
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {
                  missingApartments.length
                }
              </span>

            </div>

            {missingApartments.length ===
            0 ? (

              <div
                style={{
                  padding: "14px 0",
                  color: "#166534",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {text.allApartmentsSubmitted}
              </div>

            ) : (

              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >

                {missingApartments.map(
                  (apartment) => {

                    const apartmentId =
                      apartment
                        .apartment_id;

                    const isExpanded =
                      Boolean(
                        expandedAttentionApartments[
                          apartmentId
                        ]
                      );

                    const apartmentRows =
                      reportRows.filter(
                        (row) =>
                          row.apartment_id ===
                            apartmentId &&
                          row.status !==
                            "complete"
                      );

                    return (

                      <div
                        key={apartmentId}
                        style={{
                          border:
                            "1px solid #fed7aa",
                          borderRadius: 10,
                          background:
                            "#fff7ed",
                          overflow: "hidden",
                        }}
                      >

                        <button
                          type="button"
                          onClick={() =>
                            toggleAttentionApartment(
                              apartmentId
                            )
                          }
                          aria-expanded={
                            isExpanded
                          }
                          style={{
                            width: "100%",
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            gap: 12,
                            padding:
                              "10px 12px",
                            border: "none",
                            background:
                              "transparent",
                            color:
                              "#111827",
                            textAlign:
                              "left",
                            cursor:
                              "pointer",
                          }}
                        >

                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: 9,
                              minWidth: 0,
                            }}
                          >

                            <span
                              aria-hidden="true"
                              style={{
                                color:
                                  "#9a3412",
                                fontSize: 13,
                                fontWeight: 700,
                                transform:
                                  isExpanded
                                    ? "rotate(90deg)"
                                    : "rotate(0deg)",
                                transition:
                                  "transform 0.18s ease",
                              }}
                            >
                              ▶
                            </span>

                            <div>

                              <div
                                style={{
                                  color:
                                    "#111827",
                                  fontSize: 14,
                                  fontWeight: 700,
                                }}
                              >
                                {
                                  text
                                    .apartmentNumberPrefix
                                }
                                {
                                  apartment
                                    .apartment_number
                                }
                              </div>

                              <div
                                style={{
                                  marginTop: 2,
                                  color:
                                    "#9a3412",
                                  fontSize: 12,
                                }}
                              >
                                {text.missingReadings}
                              </div>

                            </div>

                          </div>

                          <span
                            style={{
                              padding:
                                "5px 9px",
                              borderRadius:
                                999,
                              background:
                                "#ffffff",
                              border:
                                "1px solid #fed7aa",
                              color:
                                "#9a3412",
                              fontSize: 12,
                              fontWeight: 700,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              text.meterCount(
                                apartment
                                  .missing_meter_count
                              )
                            }
                          </span>

                        </button>

                        {isExpanded && (

                          <div
                            style={{
                              display: "grid",
                              gap: 8,
                              padding:
                                "0 12px 12px",
                              borderTop:
                                "1px solid #fed7aa",
                            }}
                          >

                            {apartmentRows.length ===
                            0 ? (

                              <div
                                style={{
                                  paddingTop: 10,
                                  color:
                                    "#9a3412",
                                  fontSize: 12,
                                }}
                              >
                                {
                                  text
                                    .noDetailedMeterData
                                }
                              </div>

                            ) : (

                              apartmentRows.map(
                                (row) => (

                                  <div
                                    key={
                                      row.meter_id
                                    }
                                    style={{
                                      marginTop: 8,
                                      padding:
                                        "9px 10px",
                                      border:
                                        "1px solid #fed7aa",
                                      borderRadius: 8,
                                      background:
                                        "#ffffff",
                                    }}
                                  >

                                    <div
                                      style={{
                                        display:
                                          "flex",
                                        justifyContent:
                                          "space-between",
                                        alignItems:
                                          "flex-start",
                                        gap: 10,
                                        marginBottom: 7,
                                      }}
                                    >

                                      <div>

                                        <div
                                          style={{
                                            color:
                                              "#111827",
                                            fontSize: 13,
                                            fontWeight: 700,
                                          }}
                                        >
                                          {formatMeterType(
                                            row.type
                                          )}
                                        </div>

                                        <div
                                          style={{
                                            marginTop: 2,
                                            color:
                                              "#6b7280",
                                            fontSize: 11,
                                          }}
                                        >
                                          {formatLocation(
                                            row.local_label
                                          ) ||
                                            text.locationNotAssigned}
                                        </div>

                                      </div>

                                      <span
                                        style={{
                                          ...getRowStatusStyle(
                                            row.status
                                          ),
                                          padding:
                                            "4px 8px",
                                          borderRadius:
                                            999,
                                          fontSize: 10,
                                          fontWeight: 700,
                                          whiteSpace:
                                            "nowrap",
                                        }}
                                      >
                                        {formatRowStatus(
                                          row.status
                                        )}
                                      </span>

                                    </div>

                                    <div
                                      style={{
                                        display:
                                          "grid",
                                        gridTemplateColumns:
                                          "auto minmax(0, 1fr)",
                                        columnGap: 10,
                                        rowGap: 4,
                                        fontSize: 11,
                                        lineHeight: 1.35,
                                      }}
                                    >

                                      <span
                                        style={{
                                          color:
                                            "#6b7280",
                                        }}
                                      >
                                        {text.serialNumber}
                                      </span>

                                      <span
                                        style={{
                                          textAlign:
                                            "right",
                                          color:
                                            "#111827",
                                          fontWeight: 600,
                                          overflowWrap:
                                            "anywhere",
                                        }}
                                      >
                                        {row.serial_number ||
                                          "—"}
                                      </span>

                                      <span
                                        style={{
                                          color:
                                            "#6b7280",
                                        }}
                                      >
                                        {text.riser}
                                      </span>

                                      <span
                                        style={{
                                          textAlign:
                                            "right",
                                          color:
                                            "#111827",
                                          fontWeight: 600,
                                          fontFamily:
                                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                          overflowWrap:
                                            "anywhere",
                                        }}
                                      >
                                        {row.riser_code ||
                                          "—"}
                                      </span>

                                    </div>

                                  </div>

                                )
                              )

                            )}

                            <div
                              style={{
                                marginTop: 4,
                                paddingTop: 10,
                                borderTop:
                                  "1px solid #fed7aa",
                              }}
                            >

                              {receiveReadingsApartmentId !==
                              apartmentId ? (

                                <button
                                  type="button"
                                  disabled={
                                    !selectedEntryPeriod?.id
                                  }
                                  onClick={() =>
                                    openReceiveReadings(
                                      apartmentId,
                                      apartmentRows
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    padding:
                                      "9px 12px",
                                    border:
                                      selectedEntryPeriod?.id
                                        ? "1px solid #c2410c"
                                        : "1px solid #d1d5db",
                                    borderRadius: 9,
                                    background:
                                      selectedEntryPeriod?.id
                                        ? "#ffffff"
                                        : "#f3f4f6",
                                    color:
                                      selectedEntryPeriod?.id
                                        ? "#9a3412"
                                        : "#9ca3af",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor:
                                      selectedEntryPeriod?.id
                                        ? "pointer"
                                        : "not-allowed",
                                  }}
                                >
                                  {text.receiveReadings}
                                </button>

                              ) : (

                                <div
                                  style={{
                                    display: "grid",
                                    gap: 10,
                                    padding: 10,
                                    border:
                                      "1px solid #d1d5db",
                                    borderRadius: 10,
                                    background:
                                      "#f9fafb",
                                  }}
                                >

                                  <div
                                    style={{
                                      color:
                                        "#111827",
                                      fontSize: 13,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {
                                      text.receiveReadingsForApartment(
                                        apartment
                                          .apartment_number
                                      )
                                    }
                                  </div>

                                  {apartmentRows.map(
                                    (row) => (

                                      <label
                                        key={
                                          row.meter_id
                                        }
                                        style={{
                                          display:
                                            "grid",
                                          gap: 5,
                                        }}
                                      >

                                        <span
                                          style={{
                                            color:
                                              "#374151",
                                            fontSize: 12,
                                            fontWeight: 600,
                                          }}
                                        >
                                          {formatMeterType(
                                            row.type
                                          )}
                                          {row.local_label
                                            ? ` · ${formatLocation(
                                                row.local_label
                                              )}`
                                            : ""}
                                          {" — "}
                                          {row.serial_number ||
                                            text.noSerial}
                                        </span>

                                        <span
                                          style={{
                                            color:
                                              "#6b7280",
                                            fontSize: 11,
                                            lineHeight: 1.35,
                                          }}
                                        >
                                          {text.previous}:{" "}
                                          {row.previous_reading ===
                                            null ||
                                          row.previous_reading ===
                                            undefined
                                            ? "—"
                                            : formatConsumption(
                                                row.previous_reading
                                              )}
                                        </span>

                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          placeholder={
                                            row.previous_reading ===
                                              null ||
                                            row.previous_reading ===
                                              undefined
                                              ? text.enterReading
                                              : formatConsumption(
                                                  row.previous_reading
                                                ).replace(
                                                  " m³",
                                                  ""
                                                )
                                          }
                                          value={
                                            receiveReadingValues[
                                              row.meter_id
                                            ] || ""
                                          }
                                          disabled={
                                            receiveReadingsSubmitting
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            handleReceiveValueChange(
                                              row.meter_id,
                                              event.target.value
                                            )
                                          }
                                          style={{
                                            width:
                                              "100%",
                                            boxSizing:
                                              "border-box",
                                            padding:
                                              "9px 10px",
                                            border:
                                              "1px solid #d1d5db",
                                            borderRadius: 8,
                                            background:
                                              "#ffffff",
                                            color:
                                              "#111827",
                                            fontSize: 14,
                                          }}
                                        />

                                      </label>

                                    )
                                  )}

                                  <label
                                    style={{
                                      display: "grid",
                                      gap: 5,
                                    }}
                                  >

                                    <span
                                      style={{
                                        color:
                                          "#374151",
                                        fontSize: 12,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {text.readingDate}
                                    </span>

                                    <input
                                      type="date"
                                      value={
                                        receiveReadingDate
                                      }
                                      min={
                                        getPeriodDateLimits(
                                          selectedEntryPeriod
                                        ).min
                                      }
                                      max={
                                        getPeriodDateLimits(
                                          selectedEntryPeriod
                                        ).max
                                      }
                                      disabled={
                                        receiveReadingsSubmitting
                                      }
                                      onChange={(event) =>
                                        setReceiveReadingDate(
                                          event.target.value
                                        )
                                      }
                                      style={{
                                        width: "100%",
                                        boxSizing:
                                          "border-box",
                                        padding:
                                          "9px 10px",
                                        border:
                                          "1px solid #d1d5db",
                                        borderRadius: 8,
                                        background:
                                          "#ffffff",
                                        color:
                                          "#111827",
                                        fontSize: 13,
                                      }}
                                    />

                                  </label>

                                  {isClosedEntryPeriod && (

                                    <label
                                      style={{
                                        display: "flex",
                                        alignItems:
                                          "flex-start",
                                        gap: 8,
                                        padding: 10,
                                        border:
                                          "1px solid #f59e0b",
                                        borderRadius: 8,
                                        background:
                                          "#fffbeb",
                                        color:
                                          "#92400e",
                                        fontSize: 12,
                                        lineHeight: 1.4,
                                        cursor:
                                          "pointer",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={
                                          confirmClosedPeriodEntry
                                        }
                                        disabled={
                                          receiveReadingsSubmitting
                                        }
                                        onChange={(event) =>
                                          setConfirmClosedPeriodEntry(
                                            event.target.checked
                                          )
                                        }
                                      />

                                      <span>
                                        {text.closedLateEntryConfirmation}
                                      </span>
                                    </label>

                                  )}

                                  <label
                                    style={{
                                      display: "grid",
                                      gap: 5,
                                    }}
                                  >

                                    <span
                                      style={{
                                        color:
                                          "#374151",
                                        fontSize: 12,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {text.source}
                                    </span>

                                    <select
                                      value={
                                        receiveReadingSource
                                      }
                                      disabled={
                                        receiveReadingsSubmitting
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setReceiveReadingSource(
                                          event.target.value
                                        )
                                      }
                                      style={{
                                        width: "100%",
                                        padding:
                                          "9px 10px",
                                        border:
                                          "1px solid #d1d5db",
                                        borderRadius: 8,
                                        background:
                                          "#ffffff",
                                        color:
                                          "#111827",
                                        fontSize: 13,
                                      }}
                                    >
                                      <option
                                        value="paper_note"
                                      >
                                        {text.paperNote}
                                      </option>
                                      <option
                                        value="email"
                                      >
                                        {text.email}
                                      </option>
                                      <option
                                        value="phone"
                                      >
                                        {text.phone}
                                      </option>
                                      <option
                                        value="admin_manual"
                                      >
                                        {text.adminManual}
                                      </option>
                                    </select>

                                  </label>

                                  <label
                                    style={{
                                      display: "grid",
                                      gap: 5,
                                    }}
                                  >

                                    <span
                                      style={{
                                        color:
                                          "#374151",
                                        fontSize: 12,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {text.sourceNote}
                                    </span>

                                    <textarea
                                      rows={3}
                                      value={
                                        receiveReadingNote
                                      }
                                      disabled={
                                        receiveReadingsSubmitting
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setReceiveReadingNote(
                                          event.target.value
                                        )
                                      }
                                      placeholder={
                                        text.sourceNotePlaceholder
                                      }
                                      style={{
                                        width: "100%",
                                        boxSizing:
                                          "border-box",
                                        padding:
                                          "9px 10px",
                                        border:
                                          "1px solid #d1d5db",
                                        borderRadius: 8,
                                        resize:
                                          "vertical",
                                        background:
                                          "#ffffff",
                                        color:
                                          "#111827",
                                        fontSize: 13,
                                        fontFamily:
                                          "inherit",
                                      }}
                                    />

                                  </label>

                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "1fr 1fr",
                                      gap: 8,
                                    }}
                                  >

                                    <button
                                      type="button"
                                      onClick={
                                        closeReceiveReadings
                                      }
                                      disabled={
                                        receiveReadingsSubmitting
                                      }
                                      style={{
                                        padding:
                                          "9px 10px",
                                        border:
                                          "1px solid #d1d5db",
                                        borderRadius: 8,
                                        background:
                                          "#ffffff",
                                        color:
                                          "#374151",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor:
                                          receiveReadingsSubmitting
                                            ? "not-allowed"
                                            : "pointer",
                                      }}
                                    >
                                      {text.cancel}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        saveReceivedReadings(
                                          apartmentRows
                                        )
                                      }
                                      disabled={
                                        receiveReadingsSubmitting
                                      }
                                      style={{
                                        padding:
                                          "9px 10px",
                                        border:
                                          "1px solid #2563eb",
                                        borderRadius: 8,
                                        background:
                                          receiveReadingsSubmitting
                                            ? "#d1d5db"
                                            : "#2563eb",
                                        color:
                                          receiveReadingsSubmitting
                                            ? "#6b7280"
                                            : "#ffffff",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor:
                                          receiveReadingsSubmitting
                                            ? "not-allowed"
                                            : "pointer",
                                      }}
                                    >
                                      {receiveReadingsSubmitting
                                        ? text.saving
                                        : text.saveReadings}
                                    </button>

                                  </div>

                                </div>

                              )}

                            </div>

                          </div>

                        )}

                      </div>

                    );
                  }
                )}

              </div>

            )}

          </section>

          <section
            style={{
              marginTop: 20,
              padding: 18,
              border:
                "1px solid #e5e7eb",
              borderRadius: 16,
              background: "#ffffff",
              boxShadow:
                "0 4px 16px rgba(15, 23, 42, 0.05)",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
                paddingBottom: 12,
                borderBottom:
                  "1px solid #e5e7eb",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                  }}
                >
                  {text.meterDetails}
                </h2>

                <p
                  style={{
                    marginTop: 5,
                    marginBottom: 0,
                    color: "#6b7280",
                    fontSize: 13,
                  }}
                >
                  {text.meterDetailsSubtitle}
                </p>
              </div>

              <span
                style={{
                  padding: "5px 9px",
                  borderRadius: 999,
                  background: "#f3f4f6",
                  color: "#4b5563",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {reportRows.length}
              </span>
            </div>

            {apartmentGroups.length ===
            0 ? (

              <div
                style={{
                  padding: "14px 0",
                  color: "#6b7280",
                  fontSize: 14,
                }}
              >
                {text.noActiveWaterMeters}
              </div>

            ) : (

              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >

                {apartmentGroups.map(
                  (
                    apartmentGroup
                  ) => (

                    <ApartmentMeterGroup
                      key={
                        apartmentGroup
                          .apartment_id
                      }
                      apartmentGroup={
                        apartmentGroup
                      }
                      isMobile={
                        isMobile
                      }
                      text={text}
                      formatMeterType={
                        formatMeterType
                      }
                      formatLocation={
                        formatLocation
                      }
                      formatConsumption={
                        formatConsumption
                      }
                      formatRowStatus={
                        formatRowStatus
                      }
                      getRowStatusStyle={
                        getRowStatusStyle
                      }
                    />

                  )
                )}

              </div>

            )}

          </section>

        </>

      )}

    </div>
  );
}

function InfoItem({
  label,
  value,
}) {

  return (
    <div>

      <div
        style={{
          marginBottom: 4,
          color: "#6b7280",
          fontSize: 12,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#111827",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {value}
      </div>

    </div>
  );
}

function SummaryGroupCard({
  title,
  primaryLabel = "Total",
  primaryValue,
  items = [],
}) {

  return (
    <section
      style={{
        padding: 16,
        border:
          "1px solid #e5e7eb",
        borderRadius: 14,
        background: "#ffffff",
        boxShadow:
          "0 3px 12px rgba(15, 23, 42, 0.04)",
      }}
    >

      <div
        style={{
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom:
            "1px solid #e5e7eb",
        }}
      >

        <div
          style={{
            marginBottom: 5,
            color: "#6b7280",
            fontSize: 12,
            fontWeight: 700,
            textTransform:
              "uppercase",
            letterSpacing:
              "0.04em",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >

          <span
            style={{
              color: "#6b7280",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {primaryLabel}
          </span>

          <span
            style={{
              color: "#111827",
              fontSize: 25,
              fontWeight: 700,
              fontVariantNumeric:
                "tabular-nums",
              textAlign: "right",
            }}
          >
            {primaryValue}
          </span>

        </div>

      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
        }}
      >

        {items.map(
          (item) => (

            <div
              key={item.label}
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 12,
                padding:
                  item.warning
                    ? "8px 9px"
                    : "3px 0",
                borderRadius:
                  item.warning
                    ? 8
                    : 0,
                background:
                  item.warning
                    ? "#fff7ed"
                    : "transparent",
              }}
            >

              <span
                style={{
                  color:
                    item.warning
                      ? "#9a3412"
                      : "#6b7280",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {item.label}
              </span>

              <span
                style={{
                  color:
                    item.warning
                      ? "#9a3412"
                      : "#111827",
                  fontSize: 15,
                  fontWeight: 700,
                  fontVariantNumeric:
                    "tabular-nums",
                  textAlign: "right",
                }}
              >
                {item.value}
              </span>

            </div>

          )
        )}

      </div>

    </section>
  );
}

function ApartmentMeterGroup({
  apartmentGroup,
  isMobile,
  text,
  formatMeterType,
  formatLocation,
  formatConsumption,
  formatRowStatus,
  getRowStatusStyle,
}) {

  const rows =
    apartmentGroup.rows || [];

  const sumConsumption =
    (type) =>
      rows
        .filter(
          (row) =>
            String(
              row.type || ""
            )
              .trim()
              .toLowerCase() ===
              type
        )
        .reduce(
          (
            total,
            row
          ) => {

            const value =
              Number(
                row.consumption
              );

            if (
              !Number.isFinite(
                value
              ) ||
              value < 0
            ) {
              return total;
            }

            return total + value;
          },
          0
        );

  const coldConsumption =
    sumConsumption("cold");

  const hotConsumption =
    sumConsumption("hot");

  const totalConsumption =
    coldConsumption +
    hotConsumption;

  const hasProblems =
    rows.some(
      (row) =>
        row.status !==
        "complete"
    );

  return (
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#ffffff",
          overflow: "hidden",
        }}
      >

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: 14,
          flexWrap: "wrap",
          padding: 14,
          background: "#f8fafc",
          borderBottom:
            "1px solid #e5e7eb",
        }}
      >

        <div>

          <div
            style={{
              color: "#111827",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {
              text.apartmentNumberPrefix
            }
            {
              apartmentGroup
                .apartment_number
            }
          </div>

          <div
            style={{
              marginTop: 3,
              color: "#6b7280",
              fontSize: 12,
            }}
          >
            {
              text.activeMeterCount(
                rows.length
              )
            }
          </div>

        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              isMobile
                ? "1fr"
                : "repeat(3, minmax(120px, 1fr))",
            gap: 8,
            width:
              isMobile
                ? "100%"
                : "auto",
            minWidth:
              isMobile
                ? 0
                : 420,
          }}
        >

          <ApartmentTotal
            label={text.coldWater}
            value={
              formatConsumption(
                coldConsumption
              )
            }
          />

          <ApartmentTotal
            label={text.hotWater}
            value={
              formatConsumption(
                hotConsumption
              )
            }
          />

          <ApartmentTotal
            label={text.totalWater}
            value={
              formatConsumption(
                totalConsumption
              )
            }
            emphasized
          />

        </div>

      </div>

      <div
        style={{
          padding: 12,
        }}
      >

        {isMobile ? (

          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >

            {rows.map(
              (row) => (

                <MeterDetailCard
                  key={
                    row.meter_id
                  }
                  row={row}
                  text={text}
                  formatMeterType={
                    formatMeterType
                  }
                  formatLocation={
                    formatLocation
                  }
                  formatConsumption={
                    formatConsumption
                  }
                  formatRowStatus={
                    formatRowStatus
                  }
                  getRowStatusStyle={
                    getRowStatusStyle
                  }
                />

              )
            )}

          </div>

        ) : (

          <MeterDetailsTable
            rows={rows}
            text={text}
            formatMeterType={
              formatMeterType
            }
            formatLocation={
              formatLocation
            }
            formatConsumption={
              formatConsumption
            }
            formatRowStatus={
              formatRowStatus
            }
            getRowStatusStyle={
              getRowStatusStyle
            }
            hideApartmentColumn
          />

        )}

      </div>

    </section>
  );
}

function ApartmentTotal({
  label,
  value,
  emphasized = false,
}) {

  return (
    <div
      style={{
        padding: "8px 10px",
        border:
          emphasized
            ? "1px solid #cbd5e1"
            : "1px solid #e5e7eb",
        borderRadius: 9,
        background:
          emphasized
            ? "#f3f4f6"
            : "#ffffff",
      }}
    >

      <div
        style={{
          marginBottom: 3,
          color:
            emphasized
              ? "#374151"
              : "#6b7280",
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#111827",
          fontSize: 14,
          fontWeight: 700,
          textAlign: "right",
          fontVariantNumeric:
            "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>

    </div>
  );
}

function MeterDetailsTable({
  rows,
  text,
  formatMeterType,
  formatLocation,
  formatConsumption,
  formatRowStatus,
  getRowStatusStyle,
  hideApartmentColumn = false,
}) {

  const headings = [
    ...(hideApartmentColumn
      ? []
      : [text.apartment]),
    text.typeLocation,
    text.serialNumber,
    text.riser,
    text.previous,
    text.current,
    text.consumption,
    text.status,
  ];

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        border:
          "1px solid #e5e7eb",
        borderRadius: 10,
      }}
    >
      <table
        style={{
          width: "100%",
          minWidth:
            hideApartmentColumn
              ? 940
              : 1080,
          borderCollapse:
            "collapse",
          fontSize: 12,
        }}
      >
        <thead>
          <tr
            style={{
              background: "#f3f4f6",
            }}
          >
            {headings.map(
              (heading, index) => (
                <th
                  key={heading}
                  style={{
                    padding:
                      "9px 10px",
                    textAlign:
                      (
                        hideApartmentColumn
                          ? index >= 3 &&
                            index <= 5
                          : index >= 4 &&
                            index <= 6
                      )
                        ? "right"
                        : "left",
                    color: "#374151",
                    fontWeight: 700,
                    borderBottom:
                      "1px solid #d1d5db",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {heading}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (row, index) => {

              const isLast =
                index ===
                rows.length - 1;

              const borderBottom =
                isLast
                  ? "none"
                  : "1px solid #e5e7eb";

              return (
                <tr
                  key={row.meter_id}
                  style={{
                    background:
                      index % 2 === 0
                        ? "#ffffff"
                        : "#f9fafb",
                  }}
                >
                  {!hideApartmentColumn && (

                    <td
                      style={{
                        padding:
                          "8px 10px",
                        borderBottom,
                        fontWeight: 700,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      #{row.apartment_number}
                    </td>

                  )}

                  <td
                    style={{
                      padding:
                        "8px 10px",
                      borderBottom,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {formatMeterType(
                        row.type
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        color: "#6b7280",
                        fontSize: 11,
                      }}
                    >
                      {formatLocation(
                        row.local_label
                      ) || "—"}
                    </div>
                  </td>

                  <td
                    style={{
                      padding:
                        "8px 10px",
                      borderBottom,
                      fontWeight: 600,
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {row.serial_number ||
                      "—"}
                  </td>

                  <td
                    style={{
                      padding:
                        "8px 10px",
                      borderBottom,
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: 11,
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {row.riser_code ||
                      "—"}
                  </td>

                  {[
                    row.previous_reading,
                    row.current_reading,
                    row.consumption,
                  ].map(
                    (
                      value,
                      valueIndex
                    ) => (
                      <td
                        key={
                          valueIndex
                        }
                        style={{
                          padding:
                            "8px 10px",
                          borderBottom,
                          textAlign:
                            "right",
                          fontWeight:
                            valueIndex ===
                            2
                              ? 700
                              : 600,
                          color:
                            valueIndex ===
                              2 &&
                            Number(value) <
                              0
                              ? "#b91c1c"
                              : "#111827",
                          whiteSpace:
                            "nowrap",
                          fontVariantNumeric:
                            "tabular-nums",
                        }}
                      >
                        {value === null ||
                        value ===
                          undefined
                          ? "—"
                          : formatConsumption(
                              value
                            )}
                      </td>
                    )
                  )}

                  <td
                    style={{
                      padding:
                        "8px 10px",
                      borderBottom,
                    }}
                  >
                    <span
                      style={{
                        ...getRowStatusStyle(
                          row.status
                        ),
                        display:
                          "inline-block",
                        padding:
                          "4px 8px",
                        borderRadius:
                          999,
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {formatRowStatus(
                        row.status
                      )}
                    </span>
                  </td>
                </tr>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  );
}

function MeterDetailCard({
  row,
  text,
  formatMeterType,
  formatLocation,
  formatConsumption,
  formatRowStatus,
  getRowStatusStyle,
}) {

  const values = [
    [
      text.serialNumber,
      row.serial_number || "—",
      false,
    ],
    [
      text.riser,
      row.riser_code || "—",
      false,
    ],
    [
      text.previous,
      row.previous_reading ===
        null ||
      row.previous_reading ===
        undefined
        ? "—"
        : formatConsumption(
            row.previous_reading
          ),
      false,
    ],
    [
      text.current,
      row.current_reading ===
        null ||
      row.current_reading ===
        undefined
        ? "—"
        : formatConsumption(
            row.current_reading
          ),
      false,
    ],
    [
      text.consumption,
      row.consumption === null ||
      row.consumption ===
        undefined
        ? "—"
        : formatConsumption(
            row.consumption
          ),
      true,
    ],
  ];

  return (
    <div
      style={{
        padding: 12,
        border:
          "1px solid #e5e7eb",
        borderLeft:
          row.status === "complete"
            ? "1px solid #e5e7eb"
            : "4px solid #fdba74",
        borderRadius: 12,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              color: "#111827",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {formatMeterType(
              row.type
            )}
          </div>

          {row.local_label && (
            <div
              style={{
                marginTop: 2,
                color: "#6b7280",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {formatLocation(
                row.local_label
              )}
            </div>
          )}
        </div>

        <span
          style={{
            ...getRowStatusStyle(
              row.status
            ),
            padding: "4px 8px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {formatRowStatus(
            row.status
          )}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "auto minmax(0, 1fr)",
          columnGap: 10,
          rowGap: 5,
          fontSize: 12,
        }}
      >
        {values.map(
          ([
            label,
            value,
            isConsumption,
          ]) => (
            <>
              <span
                key={`${label}-label`}
                style={{
                  color: "#6b7280",
                }}
              >
                {label}
              </span>

              <span
                key={`${label}-value`}
                style={{
                  textAlign: "right",
                  fontWeight:
                    isConsumption
                      ? 700
                      : 600,
                  color:
                    isConsumption &&
                    Number(
                      row.consumption
                    ) < 0
                      ? "#b91c1c"
                      : "#111827",
                  overflowWrap:
                    "anywhere",
                  fontVariantNumeric:
                    "tabular-nums",
                }}
              >
                {value}
              </span>
            </>
          )
        )}
      </div>
    </div>
  );
}
