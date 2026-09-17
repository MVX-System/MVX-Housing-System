import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Modal
  from "../components/Modal";

import { api }
  from "../services/api";

import useWater
  from "../hooks/useWater";

import {
  useTranslation,
} from "../i18n";

const LOCALE_MAP = {
  lv: "lv-LV",
  en: "en-GB",
  ru: "ru-RU",
};

const TEXT = {
  lv: {
    title: "Ūdens skaitītāju pārvaldība",
    subtitle: "Pārvaldiet dzīvokļu aktīvos un neaktīvos ūdens skaitītājus.",
    refresh: "Atjaunot",
    addMeter: "Pievienot skaitītāju",
    deactivate: "Deaktivizēt",
    valid: "Derīga",
    expiresSoon: "Drīz beigsies",
    expired: "Termiņš beidzies",
    noCalibration: "Nav kalibrēšanas",
    searchPlaceholder: "Meklēt pēc dzīvokļa, sērijas numura vai stāvvada...",
    allTypes: "Visi veidi",
    coldWater: "Aukstais ūdens",
    hotWater: "Karstais ūdens",
    allStatuses: "Visi statusi",
    active: "Aktīvs",
    inactive: "Neaktīvs",
    allCalibrationStatuses: "Visi kalibrēšanas statusi",
    loadingWaterMeters: "Ielādē ūdens skaitītājus...",
    noMetersMatch: "Neviens ūdens skaitītājs neatbilst atlasītajiem filtriem.",
    apartment: "Dzīvoklis",
    apartmentPrefix: "Dzīvoklis Nr.",
    typeLocation: "Veids / atrašanās vieta",
    serialNumber: "Sērijas numurs",
    riser: "Stāvvads",
    installed: "Uzstādīts",
    calibration: "Kalibrēšana",
    expires: "Derīga līdz",
    calibrationStatus: "Kalibrēšanas statuss",
    document: "Dokuments",
    lastReading: "Pēdējais rādījums",
    lastDate: "Pēdējais datums",
    status: "Statuss",
    actions: "Darbības",
    view: "Skatīt",
    numberAbbreviation: "Nr.",
    edit: "Rediģēt",
    addWaterMeter: "Pievienot ūdens skaitītāju",
    general: "Vispārīgi",
    selectApartment: "Izvēlieties dzīvokli",
    loadingRisers: "Ielādē stāvvadus...",
    selectRiser: "Izvēlieties stāvvadu",
    type: "Veids",
    manufacturer: "Ražotājs",
    model: "Modelis",
    installation: "Uzstādīšana",
    installedDate: "Uzstādīšanas datums",
    initialReading: "Sākotnējais rādījums, m³",
    initialReadingPlaceholder: "0,000",
    readingAtInstallation: "Rādījums uzstādīšanas brīdī kubikmetros.",
    certificateAvailable: "Vai kalibrēšanas sertifikāts ir pieejams?",
    yes: "Jā",
    noUnavailable: "Nē / nav pieejams",
    certificateUnavailableWarning: "Skaitītāju var reģistrēt bez kalibrēšanas dokumenta. Pirms saglabāšanas būs nepieciešams atsevišķs apstiprinājums.",
    calibrationOnInstallationDate: "Kalibrēšana veikta uzstādīšanas datumā",
    calibrationDate: "Kalibrēšanas datums",
    validityPeriod: "Derīguma termiņš",
    months12: "12 mēneši",
    months24: "24 mēneši",
    months48: "48 mēneši",
    months60: "60 mēneši",
    months72: "72 mēneši",
    custom: "Cits...",
    months: "Mēneši",
    expiresAt: "Derīga līdz",
    calculatedAutomatically: "Aprēķina automātiski",
    certificateNumber: "Sertifikāta numurs",
    calibrationLaboratory: "Kalibrēšanas laboratorija",
    calibrationDocument: "Kalibrēšanas dokuments",
    supportedFormats: "Atbalstītie formāti: PDF, eDoc, ASiC-E. Maksimālais izmērs: 10 MB.",
    calibrationNotes: "Kalibrēšanas piezīmes",
    cancel: "Atcelt",
    adding: "Pievieno...",
    editWaterMeter: "Rediģēt ūdens skaitītāju",
    notAssigned: "Nav piešķirts",
    installedDateOptional: "Uzstādīšanas datums (nav obligāts)",
    initialReadingDate: "Sākotnējā rādījuma datums",
    correctionReason: "Labošanas iemesls",
    correctionReasonHint: "Obligāts, ja tiek mainīts sākotnējais rādījums vai tā datums.",
    saving: "Saglabā...",
    saveChanges: "Saglabāt izmaiņas",
    meter: "Skaitītājs",
    calibrationHistory: "Kalibrēšanas vēsture",
    addCalibration: "Pievienot kalibrēšanu",
    validityPeriodMonths: "Derīguma termiņš, mēneši",
    notes: "Piezīmes",
    history: "Vēsture",
    loading: "Ielādē...",
    noCalibrationHistory: "Kalibrēšanas vēstures nav.",
    certificate: "Sertifikāts",
    laboratory: "Laboratorija",
    viewDocument: "Skatīt dokumentu",
    editMeter: "Rediģēt skaitītāju",
    viewCalibrationDocument: "Skatīt kalibrēšanas dokumentu",
    deactivateWaterMeters: "Deaktivizēt ūdens skaitītājus",
    deactivateDescription: "Izvēlieties vienu vai vairākus aktīvus ūdens skaitītājus. Vēsturiskie rādījumi tiks saglabāti.",
    serial: "Sērijas numurs",
    reason: "Iemesls",
    replacement: "Nomaiņa",
    fault: "Bojājums",
    removed: "Noņemts",
    other: "Cits",
    deactivating: "Deaktivizē...",
    dataLoadFailed: "Neizdevās ielādēt ūdens skaitītāju datus.",
    invalidInitialReading: "Ievadiet sākotnējo rādījumu m³ ar ne vairāk kā 3 zīmēm aiz komata.",
    meterUpdated: "Ūdens skaitītājs atjaunināts.",
    selectRiserAlert: "Izvēlieties stāvvadu.",
    selectCalibrationDate: "Izvēlieties kalibrēšanas datumu.",
    selectCalibrationDocument: "Izvēlieties kalibrēšanas dokumentu.",
    confirmWithoutCertificate: "Kalibrēšanas sertifikāts nav pieejams. Vai pievienot šo ūdens skaitītāju bez kalibrēšanas dokumenta?",
    meterAndCalibrationAdded: "Ūdens skaitītājs un kalibrēšanas dokuments pievienoti.",
    meterAddedWithoutCalibration: "Ūdens skaitītājs pievienots bez kalibrēšanas dokumenta.",
    calibrationSaveFailed: "Ūdens skaitītājs tika izveidots, bet kalibrēšanas dokuments netika saglabāts.",
    calibrationAdded: "Kalibrēšana pievienota.",
    selectActiveMeter: "Izvēlieties vismaz vienu aktīvu ūdens skaitītāju.",
    meterDeactivated: "Ūdens skaitītājs deaktivizēts.",
    metersDeactivated: "Deaktivizēti {count} ūdens skaitītāji.",
    expiresInDays: "Beidzas pēc {days} d.",
  },
  en: {
    title: "Water Meter Management",
    subtitle: "Manage active and inactive apartment water meters.",
    refresh: "Refresh",
    addMeter: "Add Meter",
    deactivate: "Deactivate",
    valid: "Valid",
    expiresSoon: "Expires soon",
    expired: "Expired",
    noCalibration: "No calibration",
    searchPlaceholder: "Search apartment, serial, riser...",
    allTypes: "All types",
    coldWater: "Cold Water",
    hotWater: "Hot Water",
    allStatuses: "All statuses",
    active: "Active",
    inactive: "Inactive",
    allCalibrationStatuses: "All calibration statuses",
    loadingWaterMeters: "Loading water meters...",
    noMetersMatch: "No water meters match the selected filters.",
    apartment: "Apartment",
    apartmentPrefix: "Apartment #",
    typeLocation: "Type / Location",
    serialNumber: "Serial Number",
    riser: "Riser",
    installed: "Installed",
    calibration: "Calibration",
    expires: "Expires",
    calibrationStatus: "Calibration Status",
    document: "Document",
    lastReading: "Last Reading",
    lastDate: "Last Date",
    status: "Status",
    actions: "Actions",
    view: "View",
    numberAbbreviation: "No.",
    edit: "Edit",
    addWaterMeter: "Add Water Meter",
    general: "General",
    selectApartment: "Select apartment",
    loadingRisers: "Loading risers...",
    selectRiser: "Select riser",
    type: "Type",
    manufacturer: "Manufacturer",
    model: "Model",
    installation: "Installation",
    installedDate: "Installed Date",
    initialReading: "Initial Reading, m³",
    initialReadingPlaceholder: "0.000",
    readingAtInstallation: "Reading at installation, in cubic metres.",
    certificateAvailable: "Calibration Certificate Available?",
    yes: "Yes",
    noUnavailable: "No / unavailable",
    certificateUnavailableWarning: "The meter can be registered without a calibration document. A separate confirmation will be requested before saving.",
    calibrationOnInstallationDate: "Calibration performed on installation date",
    calibrationDate: "Calibration Date",
    validityPeriod: "Validity Period",
    months12: "12 months",
    months24: "24 months",
    months48: "48 months",
    months60: "60 months",
    months72: "72 months",
    custom: "Custom...",
    months: "Months",
    expiresAt: "Expires At",
    calculatedAutomatically: "Calculated automatically",
    certificateNumber: "Certificate Number",
    calibrationLaboratory: "Calibration Laboratory",
    calibrationDocument: "Calibration Document",
    supportedFormats: "Supported formats: PDF, eDoc, ASiC-E. Maximum size: 10 MB.",
    calibrationNotes: "Calibration Notes",
    cancel: "Cancel",
    adding: "Adding...",
    editWaterMeter: "Edit Water Meter",
    notAssigned: "Not assigned",
    installedDateOptional: "Installed Date (optional)",
    initialReadingDate: "Initial Reading Date",
    correctionReason: "Reason for correction",
    correctionReasonHint: "Required when the initial reading or its date is changed.",
    saving: "Saving...",
    saveChanges: "Save Changes",
    meter: "Meter",
    calibrationHistory: "Calibration History",
    addCalibration: "Add Calibration",
    validityPeriodMonths: "Validity Period, months",
    notes: "Notes",
    history: "History",
    loading: "Loading...",
    noCalibrationHistory: "No calibration history.",
    certificate: "Certificate",
    laboratory: "Laboratory",
    viewDocument: "View Document",
    editMeter: "Edit Meter",
    viewCalibrationDocument: "View Calibration Document",
    deactivateWaterMeters: "Deactivate Water Meters",
    deactivateDescription: "Select one or more active water meters. Historical readings will be preserved.",
    serial: "Serial",
    reason: "Reason",
    replacement: "Replacement",
    fault: "Fault",
    removed: "Removed",
    other: "Other",
    deactivating: "Deactivating...",
    dataLoadFailed: "Water meter data load failed.",
    invalidInitialReading: "Enter initial reading in m³ with up to 3 decimal places.",
    meterUpdated: "Water meter updated.",
    selectRiserAlert: "Select a riser.",
    selectCalibrationDate: "Select calibration date.",
    selectCalibrationDocument: "Select calibration document.",
    confirmWithoutCertificate: "The calibration certificate is unavailable. Add this water meter without a calibration document?",
    meterAndCalibrationAdded: "Water meter and calibration document added.",
    meterAddedWithoutCalibration: "Water meter added without calibration document.",
    calibrationSaveFailed: "Water meter was created, but the calibration document was not saved.",
    calibrationAdded: "Calibration added.",
    selectActiveMeter: "Select at least one active water meter.",
    meterDeactivated: "Water meter deactivated.",
    metersDeactivated: "{count} water meters deactivated.",
    expiresInDays: "Expires in {days} d",
  },
  ru: {
    title: "Управление счётчиками воды",
    subtitle: "Управляйте активными и неактивными квартирными счётчиками воды.",
    refresh: "Обновить",
    addMeter: "Добавить счётчик",
    deactivate: "Деактивировать",
    valid: "Действует",
    expiresSoon: "Скоро истекает",
    expired: "Срок истёк",
    noCalibration: "Нет калибровки",
    searchPlaceholder: "Поиск по квартире, серийному номеру или стояку...",
    allTypes: "Все типы",
    coldWater: "Холодная вода",
    hotWater: "Горячая вода",
    allStatuses: "Все статусы",
    active: "Активен",
    inactive: "Неактивен",
    allCalibrationStatuses: "Все статусы калибровки",
    loadingWaterMeters: "Загрузка счётчиков воды...",
    noMetersMatch: "Нет счётчиков воды, соответствующих выбранным фильтрам.",
    apartment: "Квартира",
    apartmentPrefix: "Квартира №",
    typeLocation: "Тип / расположение",
    serialNumber: "Серийный номер",
    riser: "Стояк",
    installed: "Установлен",
    calibration: "Калибровка",
    expires: "Действует до",
    calibrationStatus: "Статус калибровки",
    document: "Документ",
    lastReading: "Последнее показание",
    lastDate: "Последняя дата",
    status: "Статус",
    actions: "Действия",
    view: "Открыть",
    numberAbbreviation: "№",
    edit: "Изменить",
    addWaterMeter: "Добавить счётчик воды",
    general: "Основные данные",
    selectApartment: "Выберите квартиру",
    loadingRisers: "Загрузка стояков...",
    selectRiser: "Выберите стояк",
    type: "Тип",
    manufacturer: "Производитель",
    model: "Модель",
    installation: "Установка",
    installedDate: "Дата установки",
    initialReading: "Начальное показание, м³",
    initialReadingPlaceholder: "0,000",
    readingAtInstallation: "Показание в момент установки в кубических метрах.",
    certificateAvailable: "Сертификат калибровки доступен?",
    yes: "Да",
    noUnavailable: "Нет / недоступен",
    certificateUnavailableWarning: "Счётчик можно зарегистрировать без документа о калибровке. Перед сохранением потребуется отдельное подтверждение.",
    calibrationOnInstallationDate: "Калибровка выполнена в дату установки",
    calibrationDate: "Дата калибровки",
    validityPeriod: "Срок действия",
    months12: "12 месяцев",
    months24: "24 месяца",
    months48: "48 месяцев",
    months60: "60 месяцев",
    months72: "72 месяца",
    custom: "Другой...",
    months: "Месяцы",
    expiresAt: "Действует до",
    calculatedAutomatically: "Рассчитывается автоматически",
    certificateNumber: "Номер сертификата",
    calibrationLaboratory: "Калибровочная лаборатория",
    calibrationDocument: "Документ о калибровке",
    supportedFormats: "Поддерживаемые форматы: PDF, eDoc, ASiC-E. Максимальный размер: 10 МБ.",
    calibrationNotes: "Примечания к калибровке",
    cancel: "Отмена",
    adding: "Добавление...",
    editWaterMeter: "Изменить счётчик воды",
    notAssigned: "Не назначен",
    installedDateOptional: "Дата установки (необязательно)",
    initialReadingDate: "Дата начального показания",
    correctionReason: "Причина исправления",
    correctionReasonHint: "Обязательно при изменении начального показания или его даты.",
    saving: "Сохранение...",
    saveChanges: "Сохранить изменения",
    meter: "Счётчик",
    calibrationHistory: "История калибровки",
    addCalibration: "Добавить калибровку",
    validityPeriodMonths: "Срок действия, месяцев",
    notes: "Примечания",
    history: "История",
    loading: "Загрузка...",
    noCalibrationHistory: "История калибровки отсутствует.",
    certificate: "Сертификат",
    laboratory: "Лаборатория",
    viewDocument: "Открыть документ",
    editMeter: "Изменить счётчик",
    viewCalibrationDocument: "Открыть документ о калибровке",
    deactivateWaterMeters: "Деактивировать счётчики воды",
    deactivateDescription: "Выберите один или несколько активных счётчиков воды. История показаний будет сохранена.",
    serial: "Серийный номер",
    reason: "Причина",
    replacement: "Замена",
    fault: "Неисправность",
    removed: "Снят",
    other: "Другое",
    deactivating: "Деактивация...",
    dataLoadFailed: "Не удалось загрузить данные счётчиков воды.",
    invalidInitialReading: "Введите начальное показание в м³ с точностью не более 3 знаков после запятой.",
    meterUpdated: "Счётчик воды обновлён.",
    selectRiserAlert: "Выберите стояк.",
    selectCalibrationDate: "Выберите дату калибровки.",
    selectCalibrationDocument: "Выберите документ о калибровке.",
    confirmWithoutCertificate: "Сертификат калибровки недоступен. Добавить этот счётчик воды без документа о калибровке?",
    meterAndCalibrationAdded: "Счётчик воды и документ о калибровке добавлены.",
    meterAddedWithoutCalibration: "Счётчик воды добавлен без документа о калибровке.",
    calibrationSaveFailed: "Счётчик воды создан, но документ о калибровке не сохранён.",
    calibrationAdded: "Калибровка добавлена.",
    selectActiveMeter: "Выберите хотя бы один активный счётчик воды.",
    meterDeactivated: "Счётчик воды деактивирован.",
    metersDeactivated: "Деактивировано счётчиков: {count}.",
    expiresInDays: "Истекает через {days} дн.",
  },
};

export default function WaterMetersPage() {

  const {
    language,
  } = useTranslation();

  const text =
    TEXT[language] ||
    TEXT.en;

  const locale =
    LOCALE_MAP[language] ||
    LOCALE_MAP.en;

  const {
    adminWaterMeters,
    loadAdminWaterMeters,
    addWaterMeter,
    updateWaterMeter,
    loadApartmentRisers,
    uploadCalibrationDocument,
    loadWaterMeterCalibrations,
    clearWaterMeterCalibrations,
    meterCalibrations,
    meterCalibrationsLoading,
    openCalibrationDocument,
    deactivateMeter,
  } = useWater();

  const [
    isMobile,
    setIsMobile
  ] = useState(
    window.innerWidth < 768
  );

  const [
    apartments,
    setApartments
  ] = useState([]);

  const [
    apartmentRisers,
    setApartmentRisers
  ] = useState([]);

  const [
    risersLoading,
    setRisersLoading
  ] = useState(false);

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    filter,
    setFilter
  ] = useState({
    search: "",
    type: "all",
    status: "active",
    calibration: "all",
  });

  const [
    addOpen,
    setAddOpen
  ] = useState(false);

  const [
    addSubmitting,
    setAddSubmitting
  ] = useState(false);

  const [
    editOpen,
    setEditOpen
  ] = useState(false);

  const [
    editSubmitting,
    setEditSubmitting
  ] = useState(false);

  const [
    editRisers,
    setEditRisers
  ] = useState([]);

  const [
    editForm,
    setEditForm
  ] = useState({
    id: null,
    apartmentId: "",
    apartmentRiserId: "",
    type: "cold",
    serialNumber: "",
    manufacturer: "",
    model: "",
    installedAt: "",
    initialReading: "",
    initialReadingDate: "",
    correctionReason: "",
  });

  const [
    addForm,
    setAddForm
  ] = useState({
    apartmentId: "",
    apartmentRiserId: "",
    type: "cold",
    serialNumber: "",
    manufacturer: "",
    model: "",
    installedAt: "",
    initialReading: "",
    calibrationSameAsInstallation: true,
    calibrationDate: "",
    validityPreset: "12",
    validityMonths: "12",
    certificateNumber: "",
    calibrationLaboratory: "",
    calibrationNotes: "",
    calibrationDocument: null,
    certificateAvailable: true,
  });

  const [
    deactivateOpen,
    setDeactivateOpen
  ] = useState(false);

  const [
    selectedMeterIds,
    setSelectedMeterIds
  ] = useState([]);

  const [
    deactivateReason,
    setDeactivateReason
  ] = useState("replacement");

  const [
    deactivateSubmitting,
    setDeactivateSubmitting
  ] = useState(false);

  const [
    calibrationOpen,
    setCalibrationOpen
  ] = useState(false);

  const [
    selectedCalibrationMeter,
    setSelectedCalibrationMeter
  ] = useState(null);

  const [
    calibrationSubmitting,
    setCalibrationSubmitting
  ] = useState(false);

  const [
    calibrationForm,
    setCalibrationForm
  ] = useState({
    calibrationDate: "",
    validityMonths: "12",
    certificateNumber: "",
    calibrationLaboratory: "",
    notes: "",
    document: null,
  });

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

  const loadPageData =
    async () => {

      setLoading(true);

      try {

        const [
          apartmentData,
        ] = await Promise.all([
          api(
            "/api/admin/apartments"
          ),

          loadAdminWaterMeters(),
        ]);

        setApartments(
          Array.isArray(
            apartmentData
          )
            ? apartmentData
            : []
        );

      } catch (error) {

        console.error(
          "Load water meter management failed:",
          error
        );

        alert(
          text.dataLoadFailed
        );

      } finally {

        setLoading(false);
      }
    };

  useEffect(() => {

    loadPageData();

  }, []);

  const normalizedMeters =
    useMemo(
      () =>
        adminWaterMeters.map(
          (meter) => ({

            ...meter,

            status:
              Number(
                meter.active
              ) === 1
                ? "active"
                : "inactive",

            riser:
              meter.riser_code ||
              text.notAssigned,

            location:
              meter.local_label ||
              text.notAssigned,

            calibration_status:
              calculateCalibrationStatus(
                meter.calibration_expires_at,
                text
              ).key,
          })
        ),
      [
        adminWaterMeters,
        text,
      ]
    );

  const filteredMeters =
    useMemo(
      () =>
        normalizedMeters.filter(
          (meter) => {

            const search =
              filter.search
                .trim()
                .toLowerCase();

            if (search) {

              const searchable =
                [
                  meter.apartment_number,
                  meter.type,
                  meter.serial_number,
                  meter.riser,
                  meter.location,
                ]
                  .map(
                    (value) =>
                      String(
                        value ?? ""
                      ).toLowerCase()
                  )
                  .join(" ");

              if (
                !searchable.includes(
                  search
                )
              ) {
                return false;
              }
            }

            if (
              filter.type !== "all" &&
              meter.type !==
                filter.type
            ) {
              return false;
            }

            if (
              filter.status !== "all" &&
              meter.status !==
                filter.status
            ) {
              return false;
            }

            if (
              filter.calibration !== "all" &&
              meter.calibration_status !==
                filter.calibration
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        normalizedMeters,
        filter,
      ]
    );

  const groupedMeters =
    useMemo(
      () =>
        Object.values(
          filteredMeters.reduce(
            (
              groups,
              meter
            ) => {

              const key =
                String(
                  meter.apartment_id
                );

              if (!groups[key]) {

                groups[key] = {
                  apartment_id:
                    meter.apartment_id,

                  apartment_number:
                    meter.apartment_number,

                  meters: [],
                };
              }

              groups[key]
                .meters.push(
                  meter
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
        ),
      [filteredMeters]
    );

  const activeMeters =
    normalizedMeters.filter(
      (meter) =>
        meter.status ===
        "active"
    );

  const calibrationSummary =
    useMemo(
      () => {

        const summary = {
          valid: 0,
          warning: 0,
          expired: 0,
          missing: 0,
        };

        normalizedMeters
          .filter(
            (meter) =>
              meter.status ===
              "active"
          )
          .forEach(
            (meter) => {

              const key =
                meter.calibration_status;

              if (
                Object.prototype
                  .hasOwnProperty.call(
                    summary,
                    key
                  )
              ) {
                summary[key] += 1;
              }
            }
          );

        return summary;
      },
      [normalizedMeters]
    );

  const resetAddForm = () => {

    setAddForm({
      apartmentId: "",
      apartmentRiserId: "",
      type: "cold",
      serialNumber: "",
      manufacturer: "",
      model: "",
      installedAt: "",
      initialReading: "",
      calibrationSameAsInstallation: true,
      calibrationDate: "",
      validityPreset: "12",
      validityMonths: "12",
      certificateNumber: "",
      calibrationLaboratory: "",
      calibrationNotes: "",
      calibrationDocument: null,
      certificateAvailable: true,
    });

    setApartmentRisers([]);
  };

  const handleApartmentChange =
    async (
      apartmentId
    ) => {

      setAddForm(
        (current) => ({
          ...current,
          apartmentId,
          apartmentRiserId: "",
        })
      );

      setApartmentRisers([]);

      if (!apartmentId) {
        return;
      }

      setRisersLoading(true);

      try {

        const risers =
          await loadApartmentRisers(
            apartmentId
          );

        setApartmentRisers(
          risers
        );

      } finally {

        setRisersLoading(false);
      }
    };

  const openEditMeter =
    async (meter) => {

      const risers =
        await loadApartmentRisers(
          meter.apartment_id
        );

      setEditRisers(
        Array.isArray(risers)
          ? risers
          : []
      );

      setEditForm({
        id: meter.id,
        apartmentId:
          String(meter.apartment_id),
        apartmentRiserId:
          meter.apartment_riser_id
            ? String(
                meter.apartment_riser_id
              )
            : "",
        type: meter.type || "cold",
        serialNumber:
          meter.serial_number || "",
        manufacturer:
          meter.manufacturer || "",
        model: meter.model || "",
        installedAt:
          meter.installed_at
            ? String(
                meter.installed_at
              ).slice(0, 10)
            : "",
        initialReading:
          meter.initial_reading === null ||
          meter.initial_reading === undefined
            ? ""
            : (
                Number(
                  meter.initial_reading
                ) / 1000
              )
                .toFixed(3)
                .replace(
                  ".",
                  text.initialReadingPlaceholder.includes(",")
                    ? ","
                    : "."
                ),
        initialReadingDate:
          meter.initial_reading_date
            ? String(
                meter.initial_reading_date
              ).slice(0, 10)
            : "",
        correctionReason: "",
      });

      setEditOpen(true);
    };

  const handleEditMeter =
    async () => {

      if (editSubmitting) {
        return;
      }

      const initialReading =
        parseReadingValue(
          editForm.initialReading
        );

      if (
        editForm.initialReading &&
        initialReading === null
      ) {
        alert(
          text.invalidInitialReading
        );
        return;
      }

      setEditSubmitting(true);

      try {
        const result =
          await updateWaterMeter({
            meterId: editForm.id,
            apartmentId:
              editForm.apartmentId,
            apartmentRiserId:
              editForm.apartmentRiserId ||
              null,
            type: editForm.type,
            serialNumber:
              editForm.serialNumber,
            manufacturer:
              editForm.manufacturer,
            model: editForm.model,
            installedAt:
              editForm.installedAt ||
              null,
            initialReading,
            initialReadingDate:
              editForm.initialReadingDate ||
              null,
            correctionReason:
              editForm.correctionReason,
          });

        if (result?.ok) {
          setEditOpen(false);
          await loadAdminWaterMeters();
          alert(
            text.meterUpdated
          );
        }
      } finally {
        setEditSubmitting(false);
      }
    };

  const calculatedExpiresAt =
    useMemo(
      () => {

        if (
          !addForm.calibrationDate ||
          !addForm.validityMonths
        ) {
          return "";
        }

        const [
          year,
          month,
          day,
        ] =
          addForm.calibrationDate
            .split("-")
            .map(Number);

        const months =
          Number(
            addForm.validityMonths
          );

        if (
          !year ||
          !month ||
          !day ||
          !Number.isInteger(
            months
          ) ||
          months <= 0
        ) {
          return "";
        }

        const date =
          new Date(
            Date.UTC(
              year,
              month - 1 + months,
              1
            )
          );

        const lastDay =
          new Date(
            Date.UTC(
              date.getUTCFullYear(),
              date.getUTCMonth() + 1,
              0
            )
          ).getUTCDate();

        date.setUTCDate(
          Math.min(
            day,
            lastDay
          )
        );

        return date
          .toISOString()
          .slice(0, 10);
      },
      [
        addForm.calibrationDate,
        addForm.validityMonths,
      ]
    );

  const parseReadingValue =
    (
      value
    ) => {

      const normalized =
        String(
          value || ""
        )
          .trim()
          .replace(
            ",",
            "."
          );

      if (!normalized) {
        return null;
      }

      if (
        !/^\d+(\.\d{1,3})?$/.test(
          normalized
        )
      ) {
        return null;
      }

      return Math.round(
        Number(
          normalized
        ) * 1000
      );
    };

  const handleAddMeter =
    async () => {

      if (addSubmitting) {
        return;
      }

      setAddSubmitting(true);

      try {

        if (
          !addForm.apartmentRiserId
        ) {

          alert(
            text.selectRiserAlert
          );

          return;
        }

        if (
          addForm.certificateAvailable &&
          !addForm.calibrationDate
        ) {

          alert(
            text.selectCalibrationDate
          );

          return;
        }

        if (
          addForm.certificateAvailable &&
          !addForm.calibrationDocument
        ) {

          alert(
            text.selectCalibrationDocument
          );

          return;
        }

        if (
          !addForm.certificateAvailable &&
          !window.confirm(
            text.confirmWithoutCertificate
          )
        ) {
          return;
        }

        const initialReading =
          parseReadingValue(
            addForm.initialReading
          );

        if (
          addForm.initialReading &&
          initialReading === null
        ) {

          alert(
            text.invalidInitialReading
          );

          return;
        }

        const meterResult =
          await addWaterMeter({
            apartmentId:
              addForm.apartmentId,

            apartmentRiserId:
              addForm.apartmentRiserId,

            type:
              addForm.type,

            serialNumber:
              addForm.serialNumber,

            manufacturer:
              addForm.manufacturer,

            model:
              addForm.model,

            installedAt:
              addForm.installedAt,

            initialReading,

            initialReadingDate:
              addForm.installedAt ||
              addForm.calibrationDate ||
              new Date()
                .toISOString()
                .slice(0, 10),

            options: {
              suppressSuccessAlert:
                true,

              suppressReload:
                true,
            },
          });

        if (!meterResult?.ok) {
          return;
        }

        let calibrationResult = {
          ok: true,
          skipped: true,
        };

        if (
          addForm.certificateAvailable
        ) {
          calibrationResult =
            await uploadCalibrationDocument({
            meterId:
              meterResult.meter_id,

            calibrationDate:
              addForm.calibrationDate,

            validityMonths:
              Number(
                addForm.validityMonths
              ),

            notes:
              addForm.calibrationNotes,

            certificateNumber:
              addForm.certificateNumber,

            calibrationLaboratory:
              addForm.calibrationLaboratory,

            certificate:
              addForm.calibrationDocument,

            options: {
              suppressSuccessAlert:
                true,

              suppressReload:
                true,
            },
          });


        }

        await loadAdminWaterMeters();

        if (
          calibrationResult?.ok
        ) {

          setAddOpen(false);
          resetAddForm();

          alert(
            addForm.certificateAvailable
              ? text.meterAndCalibrationAdded
              : text.meterAddedWithoutCalibration
          );

        } else {

          alert(
            text.calibrationSaveFailed
          );
        }

      } finally {

        setAddSubmitting(false);
      }
    };

  const openCalibrationHistory =
    async (
      meter
    ) => {

      setSelectedCalibrationMeter(
        meter
      );

      setCalibrationForm({
        calibrationDate: "",
        validityMonths: "12",
        certificateNumber: "",
        calibrationLaboratory: "",
        notes: "",
        document: null,
      });

      setCalibrationOpen(true);

      await loadWaterMeterCalibrations(
        meter.id
      );
    };

  const closeCalibrationHistory =
    () => {

      setCalibrationOpen(false);
      setSelectedCalibrationMeter(null);
      clearWaterMeterCalibrations();
    };

  const handleAddCalibration =
    async () => {

      if (
        !selectedCalibrationMeter ||
        calibrationSubmitting
      ) {
        return;
      }

      setCalibrationSubmitting(
        true
      );

      try {

        const result =
          await uploadCalibrationDocument({
            meterId:
              selectedCalibrationMeter.id,

            calibrationDate:
              calibrationForm.calibrationDate,

            validityMonths:
              Number(
                calibrationForm.validityMonths
              ),

            certificateNumber:
              calibrationForm.certificateNumber,

            calibrationLaboratory:
              calibrationForm.calibrationLaboratory,

            notes:
              calibrationForm.notes,

            certificate:
              calibrationForm.document,

            options: {
              suppressSuccessAlert:
                true,

              suppressReload:
                true,
            },
          });

        if (result?.ok) {

          await Promise.all([
            loadAdminWaterMeters(),

            loadWaterMeterCalibrations(
              selectedCalibrationMeter.id
            ),
          ]);

          setCalibrationForm({
            calibrationDate: "",
            validityMonths: "12",
            certificateNumber: "",
            calibrationLaboratory: "",
            notes: "",
            document: null,
          });

          alert(
            text.calibrationAdded
          );
        }

      } finally {

        setCalibrationSubmitting(
          false
        );
      }
    };

  const toggleSelectedMeter =
    (meterId) => {

      setSelectedMeterIds(
        (current) =>
          current.includes(
            meterId
          )
            ? current.filter(
                (id) =>
                  id !== meterId
              )
            : [
                ...current,
                meterId,
              ]
      );
    };

  const openDeactivate = () => {

    setSelectedMeterIds([]);
    setDeactivateReason(
      "replacement"
    );
    setDeactivateOpen(true);
  };

  const handleDeactivate =
    async () => {

      if (
        deactivateSubmitting
      ) {
        return;
      }

      if (
        selectedMeterIds.length ===
        0
      ) {

        alert(
          text.selectActiveMeter
        );

        return;
      }

      setDeactivateSubmitting(
        true
      );

      let successCount = 0;

      try {

        for (
          const meterId of
          selectedMeterIds
        ) {

          const success =
            await deactivateMeter(
              meterId,
              deactivateReason,
              {
                suppressSuccessAlert:
                  true,

                suppressReload:
                  true,
              }
            );

          if (!success) {
            break;
          }

          successCount += 1;
        }

        if (
          successCount > 0
        ) {

          await loadAdminWaterMeters();
        }

        if (
          successCount ===
          selectedMeterIds.length
        ) {

          setDeactivateOpen(false);
          setSelectedMeterIds([]);

          alert(
            successCount === 1
              ? text.meterDeactivated
              : text.metersDeactivated.replace(
                  "{count}",
                  successCount
                )
          );
        }

      } finally {

        setDeactivateSubmitting(
          false
        );
      }
    };

  const formatType = (
    type
  ) =>
    type === "hot"
      ? text.hotWater
      : text.coldWater;

  const formatDate = (
    value
  ) => {

    if (!value) {
      return "—";
    }

    const date =
      new Date(
        `${String(value).slice(
          0,
          10
        )}T00:00:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return date.toLocaleDateString(
      locale,
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );
  };

  const formatReading = (
    value
  ) => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    const storedValue =
      Number(value);

    if (
      !Number.isFinite(
        storedValue
      )
    ) {
      return String(value);
    }

    return `${new Intl.NumberFormat(
      locale,
      {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }
    ).format(storedValue / 1000)} m³`;
  };

  const getCalibrationStatus =
    (
      expiresAt
    ) =>
      calculateCalibrationStatus(
        expiresAt,
        text
      );

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
          marginBottom: 22,
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
              color:
                "var(--text)",
              lineHeight: 1.5,
            }}
          >
            {text.subtitle}
          </p>

        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >

          <button
            type="button"
            onClick={
              loadPageData
            }
            style={secondaryButton}
          >
            {text.refresh}
          </button>

          <button
            type="button"
            onClick={() =>
              setAddOpen(true)
            }
            style={primaryButton}
          >
            {text.addMeter}
          </button>

          <button
            type="button"
            onClick={
              openDeactivate
            }
            disabled={
              activeMeters.length ===
              0
            }
            style={{
              ...dangerButton,

              opacity:
                activeMeters.length ===
                0
                  ? 0.55
                  : 1,

              cursor:
                activeMeters.length ===
                0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {text.deactivate}
          </button>

        </div>

      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >

        <CalibrationSummaryCard
          label={text.valid}
          value={
            calibrationSummary.valid
          }
          tone="success"
          active={
            filter.calibration ===
            "valid"
          }
          onClick={() =>
            setFilter(
              (current) => ({
                ...current,
                calibration:
                  current.calibration ===
                    "valid"
                    ? "all"
                    : "valid",
              })
            )
          }
        />

        <CalibrationSummaryCard
          label={text.expiresSoon}
          value={
            calibrationSummary.warning
          }
          tone="warning"
          active={
            filter.calibration ===
            "warning"
          }
          onClick={() =>
            setFilter(
              (current) => ({
                ...current,
                calibration:
                  current.calibration ===
                    "warning"
                    ? "all"
                    : "warning",
              })
            )
          }
        />

        <CalibrationSummaryCard
          label={text.expired}
          value={
            calibrationSummary.expired
          }
          tone="danger"
          active={
            filter.calibration ===
            "expired"
          }
          onClick={() =>
            setFilter(
              (current) => ({
                ...current,
                calibration:
                  current.calibration ===
                    "expired"
                    ? "all"
                    : "expired",
              })
            )
          }
        />

        <CalibrationSummaryCard
          label={text.noCalibration}
          value={
            calibrationSummary.missing
          }
          tone="neutral"
          active={
            filter.calibration ===
            "missing"
          }
          onClick={() =>
            setFilter(
              (current) => ({
                ...current,
                calibration:
                  current.calibration ===
                    "missing"
                    ? "all"
                    : "missing",
              })
            )
          }
        />

      </div>

      <section
        style={{
          marginBottom: 18,
          padding: 14,
          border:
            "1px solid var(--border)",
          borderRadius: 14,
          background:
            "var(--surface)",
        }}
      >

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 10,
          }}
        >

          <input
            type="search"
            value={
              filter.search
            }
            onChange={(event) =>
              setFilter(
                (current) => ({
                  ...current,

                  search:
                    event.target.value,
                })
              )
            }
            placeholder={
              text.searchPlaceholder
            }
            style={fieldStyle}
          />

          <select
            value={filter.type}
            onChange={(event) =>
              setFilter(
                (current) => ({
                  ...current,

                  type:
                    event.target.value,
                })
              )
            }
            style={fieldStyle}
          >
            <option value="all">
              {text.allTypes}
            </option>
            <option value="cold">
              {text.coldWater}
            </option>
            <option value="hot">
              {text.hotWater}
            </option>
          </select>

          <select
            value={
              filter.status
            }
            onChange={(event) =>
              setFilter(
                (current) => ({
                  ...current,

                  status:
                    event.target.value,
                })
              )
            }
            style={fieldStyle}
          >
            <option value="all">
              {text.allStatuses}
            </option>
            <option value="active">
              {text.active}
            </option>
            <option value="inactive">
              {text.inactive}
            </option>
          </select>

          <select
            value={
              filter.calibration
            }
            onChange={(event) =>
              setFilter(
                (current) => ({
                  ...current,

                  calibration:
                    event.target.value,
                })
              )
            }
            style={fieldStyle}
          >
            <option value="all">
              {text.allCalibrationStatuses}
            </option>
            <option value="valid">
              {text.valid}
            </option>
            <option value="warning">
              {text.expiresSoon}
            </option>
            <option value="expired">
              {text.expired}
            </option>
            <option value="missing">
              {text.noCalibration}
            </option>
          </select>

        </div>

      </section>

      {loading ? (

        <div
          style={emptyState}
        >
          {text.loadingWaterMeters}
        </div>

      ) : filteredMeters.length ===
        0 ? (

        <div
          style={emptyState}
        >
          {text.noMetersMatch}
        </div>

      ) : isMobile ? (

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >

          {groupedMeters.map(
            (apartment) => (

              <section
                key={
                  apartment
                    .apartment_id
                }
                style={apartmentCard}
              >

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: 10,
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom:
                      "1px solid var(--border)",
                  }}
                >

                  <strong
                    style={{
                      color:
                        "var(--text-h)",
                      fontSize: 16,
                    }}
                  >
                    {text.apartmentPrefix}
                    {" "}
                    {
                      apartment
                        .apartment_number
                    }
                  </strong>

                  <span
                    style={countBadge}
                  >
                    {
                      apartment
                        .meters.length
                    }
                  </span>

                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >

                  {apartment
                    .meters.map(
                      (meter) => (

                        <MeterCard
                          key={
                            meter.id
                          }
                          meter={meter}
                          formatType={
                            formatType
                          }
                          formatDate={
                            formatDate
                          }
                          formatReading={
                            formatReading
                          }
                          getCalibrationStatus={
                            getCalibrationStatus
                          }
                          onOpenDocument={
                            openCalibrationDocument
                          }
                          onOpenCalibrationHistory={
                            openCalibrationHistory
                          }
                          onEdit={
                            openEditMeter
                          }
                          text={text}
                        />

                      )
                    )}

                </div>

              </section>

            )
          )}

        </div>

      ) : (

        <div
          style={{
            overflowX: "auto",
            border:
              "1px solid var(--border)",
            borderRadius: 14,
            background:
              "var(--surface)",
          }}
        >

          <table
            style={{
              width: "100%",
              minWidth: 1450,
              borderCollapse:
                "collapse",
              fontSize: 13,
            }}
          >

            <thead>

              <tr
                style={{
                  background:
                    "var(--surface-soft)",
                }}
              >

                {[
                  text.apartment,
                  text.typeLocation,
                  text.serialNumber,
                  text.riser,
                  text.installed,
                  text.calibration,
                  text.expires,
                  text.calibrationStatus,
                  text.document,
                  text.lastReading,
                  text.lastDate,
                  text.status,
                  text.actions,
                ].map(
                  (heading) => (

                    <th
                      key={heading}
                      style={tableHeader}
                    >
                      {heading}
                    </th>

                  )
                )}

              </tr>

            </thead>

            <tbody>

              {filteredMeters.map(
                (
                  meter,
                  index
                ) => (

                  <tr
                    key={meter.id}
                    style={{
                      background:
                        index % 2 === 0
                          ? "var(--surface)"
                          : "var(--surface-soft)",
                    }}
                  >

                    <td style={tableCellStrong}>
                      #
                      {
                        meter.apartment_number
                      }
                    </td>

                    <td style={tableCell}>
                      <div
                        style={{
                          fontWeight: 700,
                          color:
                            "var(--text-h)",
                        }}
                      >
                        {formatType(
                          meter.type
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 2,
                          color:
                            "var(--text)",
                          fontSize: 11,
                        }}
                      >
                        {meter.location}
                      </div>
                    </td>

                    <td style={tableCellStrong}>
                      <div>
                        {meter.serial_number ||
                          "—"}
                      </div>

                      {(meter.manufacturer ||
                        meter.model) && (

                        <div
                          style={{
                            marginTop: 2,
                            color:
                              "var(--text)",
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          {[
                            meter.manufacturer,
                            meter.model,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>

                      )}
                    </td>

                    <td
                      style={{
                        ...tableCell,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        fontSize: 11,
                      }}
                    >
                      {meter.riser}
                    </td>

                    <td style={tableCell}>
                      {formatDate(
                        meter.installed_at
                      )}
                    </td>

                    <td style={tableCell}>
                      {formatDate(
                        meter.calibration_date
                      )}
                    </td>

                    <td style={tableCell}>
                      {formatDate(
                        meter.calibration_expires_at
                      )}
                    </td>

                    <td style={tableCell}>
                      <button
                        type="button"
                        onClick={() =>
                          openCalibrationHistory(
                            meter
                          )
                        }
                        style={plainButton}
                      >
                        <CalibrationBadge
                          status={
                            getCalibrationStatus(
                              meter.calibration_expires_at
                            )
                          }
                          text={text}
                        />
                      </button>
                    </td>

                    <td style={tableCell}>
                      {meter.calibration_id ? (

                        <div
                          style={{
                            display: "grid",
                            gap: 4,
                            justifyItems: "start",
                          }}
                        >

                          <button
                            type="button"
                            onClick={() =>
                              openCalibrationDocument(
                                meter.calibration_id,
                                meter.calibration_document_name
                              )
                            }
                            style={documentButton}
                          >
                            {text.view}
                          </button>

                          {meter
                            .calibration_certificate_number && (

                            <span
                              style={{
                                fontSize: 10,
                                color:
                                  "var(--text)",
                              }}
                            >
                              {text.numberAbbreviation}{" "}
                              {
                                meter
                                  .calibration_certificate_number
                              }
                            </span>

                          )}

                          {meter
                            .calibration_laboratory && (

                            <span
                              style={{
                                maxWidth: 150,
                                fontSize: 10,
                                color:
                                  "var(--text)",
                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              {
                                meter
                                  .calibration_laboratory
                              }
                            </span>

                          )}

                        </div>

                      ) : (
                        "—"
                      )}
                    </td>

                    <td
                      style={{
                        ...tableCellStrong,
                        textAlign: "left",
                        fontVariantNumeric:
                          "tabular-nums",
                      }}
                    >
                      {formatReading(
                        meter.last_reading
                      )}
                    </td>

                    <td style={tableCell}>
                      {formatDate(
                        meter.last_reading_date
                      )}
                    </td>

                    <td style={tableCell}>
                      <StatusBadge
                        active={
                          meter.status ===
                          "active"
                        }
                        text={text}
                      />
                    </td>

                    <td style={tableCell}>
                      <button
                        type="button"
                        onClick={() =>
                          openEditMeter(
                            meter
                          )
                        }
                        style={secondaryButton}
                      >
                        {text.edit}
                      </button>
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}

      <Modal
        open={addOpen}
        title={text.addWaterMeter}
        onClose={() => {

          if (!addSubmitting) {
            setAddOpen(false);
          }
        }}
      >

        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >

          <SectionHeading>
            {text.general}
          </SectionHeading>

          <FormField
            label={text.apartment}
          >
            <select
              value={
                addForm.apartmentId
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                handleApartmentChange(
                  event.target.value
                )
              }
              style={fieldStyle}
            >
              <option value="">
                {text.selectApartment}
              </option>

              {apartments.map(
                (apartment) => (

                  <option
                    key={
                      apartment.id
                    }
                    value={
                      apartment.id
                    }
                  >
                    {text.apartmentPrefix}{" "}
                    {apartment.number}
                  </option>

                )
              )}
            </select>
          </FormField>

          <FormField
            label={text.riser}
          >
            <select
              value={
                addForm.apartmentRiserId
              }
              disabled={
                addSubmitting ||
                risersLoading ||
                !addForm.apartmentId
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,

                    apartmentRiserId:
                      event.target.value,
                  })
                )
              }
              style={fieldStyle}
            >
              <option value="">
                {risersLoading
                  ? text.loadingRisers
                  : text.selectRiser}
              </option>

              {apartmentRisers
                .filter(
                  (riser) => {

                    const systemType =
                      String(
                        riser.system_type ||
                        ""
                      )
                        .trim()
                        .toLowerCase();

                    const riserCode =
                      String(
                        riser.riser_code ||
                        ""
                      )
                        .trim()
                        .toLowerCase();

                    const combinedType =
                      `${systemType} ${riserCode}`;

                    const isCold =
                      /(^|[^a-z])(cw|cold|cold_water|cold-water)([^a-z]|$)/.test(
                        combinedType
                      );

                    const isHot =
                      /(^|[^a-z])(hw|hot|hot_water|hot-water)([^a-z]|$)/.test(
                        combinedType
                      );

                    if (
                      !isCold &&
                      !isHot
                    ) {
                      return true;
                    }

                    return (
                      addForm.type ===
                        "cold"
                        ? isCold
                        : isHot
                    );
                  }
                )
                .map(
                  (riser) => (

                    <option
                      key={
                        riser.apartment_riser_id
                      }
                      value={
                        riser.apartment_riser_id
                      }
                    >
                      {riser.riser_code}
                      {riser.local_label
                        ? ` · ${riser.local_label}`
                        : ""}
                    </option>

                  )
                )}
            </select>
          </FormField>

          <FormField
            label={text.type}
          >
            <select
              value={
                addForm.type
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,

                    type:
                      event.target.value,

                    apartmentRiserId:
                      "",
                  })
                )
              }
              style={fieldStyle}
            >
              <option value="cold">
                {text.coldWater}
              </option>
              <option value="hot">
                {text.hotWater}
              </option>
            </select>
          </FormField>

          <FormField
            label={text.serialNumber}
          >
            <input
              type="text"
              value={
                addForm.serialNumber
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,

                    serialNumber:
                      event.target.value,
                  })
                )
              }
              style={fieldStyle}
            />
          </FormField>

          <FormField
            label={text.manufacturer}
          >
            <input
              type="text"
              value={
                addForm.manufacturer
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,
                    manufacturer:
                      event.target.value,
                  })
                )
              }
              style={fieldStyle}
            />
          </FormField>

          <FormField
            label={text.model}
          >
            <input
              type="text"
              value={
                addForm.model
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,
                    model:
                      event.target.value,
                  })
                )
              }
              style={fieldStyle}
            />
          </FormField>

          <SectionHeading>
            {text.installation}
          </SectionHeading>

          <FormField
            label={text.installedDate}
          >
            <input
              type="date"
              value={
                addForm.installedAt
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,

                    installedAt:
                      event.target.value,

                    calibrationDate:
                      current
                        .calibrationSameAsInstallation
                        ? event.target.value
                        : current.calibrationDate,
                  })
                )
              }
              style={fieldStyle}
            />
          </FormField>

          <FormField
            label={text.initialReading}
          >
            <input
              type="text"
              inputMode="decimal"
              placeholder={text.initialReadingPlaceholder}
              value={
                addForm.initialReading
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,

                    initialReading:
                      event.target.value,
                  })
                )
              }
              style={fieldStyle}
            />

            <span
              style={{
                color:
                  "var(--text)",
                fontSize: 11,
              }}
            >
              {text.readingAtInstallation}
            </span>
          </FormField>

          <div
            style={{
              marginTop: 6,
              paddingTop: 14,
              borderTop:
                "1px solid var(--border)",
            }}
          >

            <SectionHeading
              compact
            >
              {text.calibration}
            </SectionHeading>

            <FormField
              label={text.certificateAvailable}
            >
              <select
                value={
                  addForm.certificateAvailable
                    ? "yes"
                    : "no"
                }
                disabled={
                  addSubmitting
                }
                onChange={(event) =>
                  setAddForm(
                    (current) => ({
                      ...current,
                      certificateAvailable:
                        event.target.value ===
                        "yes",
                    })
                  )
                }
                style={fieldStyle}
              >
                <option value="yes">
                  {text.yes}
                </option>
                <option value="no">
                  {text.noUnavailable}
                </option>
              </select>
            </FormField>

            {!addForm.certificateAvailable && (
              <div
                style={{
                  padding: 10,
                  border:
                    "1px solid #f59e0b",
                  borderRadius: 9,
                  background: "#fffbeb",
                  color: "#92400e",
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                {text.certificateUnavailableWarning}
              </div>
            )}

            {addForm.certificateAvailable && (
              <>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                color:
                  "var(--text-h)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={
                  addForm
                    .calibrationSameAsInstallation
                }
                disabled={
                  addSubmitting
                }
                onChange={(event) =>
                  setAddForm(
                    (current) => ({
                      ...current,

                      calibrationSameAsInstallation:
                        event.target.checked,

                      calibrationDate:
                        event.target.checked
                          ? current.installedAt
                          : current.calibrationDate,
                    })
                  )
                }
              />

              {text.calibrationOnInstallationDate}
            </label>

            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >

              <FormField
                label={text.calibrationDate}
              >
                <input
                  type="date"
                  value={
                    addForm.calibrationDate
                  }
                  disabled={
                    addSubmitting ||
                    addForm
                      .calibrationSameAsInstallation
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        calibrationDate:
                          event.target.value,
                      })
                    )
                  }
                  style={fieldStyle}
                />
              </FormField>

              <FormField
                label={text.validityPeriod}
              >
                <select
                  value={
                    addForm.validityPreset
                  }
                  disabled={
                    addSubmitting
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        validityPreset:
                          event.target.value,

                        validityMonths:
                          event.target.value ===
                            "custom"
                            ? current.validityMonths
                            : event.target.value,
                      })
                    )
                  }
                  style={fieldStyle}
                >
                  <option value="12">
                    {text.months12}
                  </option>
                  <option value="24">
                    {text.months24}
                  </option>
                  <option value="48">
                    {text.months48}
                  </option>
                  <option value="60">
                    {text.months60}
                  </option>
                  <option value="72">
                    {text.months72}
                  </option>
                  <option value="custom">
                    {text.custom}
                  </option>
                </select>

                {addForm.validityPreset ===
                  "custom" && (

                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={
                      addForm.validityMonths
                    }
                    disabled={
                      addSubmitting
                    }
                    onChange={(event) =>
                      setAddForm(
                        (current) => ({
                          ...current,

                          validityMonths:
                            event.target.value,
                        })
                      )
                    }
                    placeholder={text.months}
                    style={fieldStyle}
                  />

                )}
              </FormField>

              <FormField
                label={text.expiresAt}
              >
                <input
                  type="text"
                  value={
                    calculatedExpiresAt
                      ? formatDate(
                          calculatedExpiresAt
                        )
                      : text.calculatedAutomatically
                  }
                  readOnly
                  style={{
                    ...fieldStyle,

                    background:
                      calculatedExpiresAt
                        ? getCalibrationStatus(
                            calculatedExpiresAt
                          ).tone ===
                            "danger"
                          ? "#fee2e2"
                          : getCalibrationStatus(
                              calculatedExpiresAt
                            ).tone ===
                              "warning"
                            ? "#fef3c7"
                            : "#dcfce7"
                        : "var(--surface-muted)",

                    color:
                      calculatedExpiresAt
                        ? "#111827"
                        : "var(--text)",
                  }}
                />
              </FormField>

              <FormField
                label={text.certificateNumber}
              >
                <input
                  type="text"
                  value={
                    addForm.certificateNumber
                  }
                  disabled={
                    addSubmitting
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        certificateNumber:
                          event.target.value,
                      })
                    )
                  }
                  style={fieldStyle}
                />
              </FormField>

              <FormField
                label={text.calibrationLaboratory}
              >
                <input
                  type="text"
                  value={
                    addForm.calibrationLaboratory
                  }
                  disabled={
                    addSubmitting
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        calibrationLaboratory:
                          event.target.value,
                      })
                    )
                  }
                  style={fieldStyle}
                />
              </FormField>

              <FormField
                label={text.calibrationDocument}
              >
                <input
                  type="file"
                  accept=".pdf,.edoc,.asice,application/pdf,application/octet-stream"
                  disabled={
                    addSubmitting
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        calibrationDocument:
                          event.target.files?.[0] ||
                          null,
                      })
                    )
                  }
                  style={fieldStyle}
                />

                <span
                  style={{
                    color:
                      "var(--text)",
                    fontSize: 11,
                  }}
                >
                  {text.supportedFormats}
                </span>
              </FormField>

              <FormField
                label={text.calibrationNotes}
              >
                <textarea
                  rows={2}
                  value={
                    addForm.calibrationNotes
                  }
                  disabled={
                    addSubmitting
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        calibrationNotes:
                          event.target.value,
                      })
                    )
                  }
                  style={{
                    ...fieldStyle,
                    resize: "vertical",
                    fontFamily:
                      "inherit",
                  }}
                />
              </FormField>

            </div>
              </>
            )}

          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 8,
              marginTop: 4,
            }}
          >

            <button
              type="button"
              onClick={() =>
                setAddOpen(false)
              }
              disabled={
                addSubmitting
              }
              style={secondaryButton}
            >
              {text.cancel}
            </button>

            <button
              type="button"
              onClick={
                handleAddMeter
              }
              disabled={
                addSubmitting
              }
              style={{
                ...primaryButton,

                opacity:
                  addSubmitting
                    ? 0.65
                    : 1,
              }}
            >
              {addSubmitting
                ? text.adding
                : text.addMeter}
            </button>

          </div>

        </div>

      </Modal>


      <Modal
        open={editOpen}
        title={text.editWaterMeter}
        onClose={() => {
          if (!editSubmitting) {
            setEditOpen(false);
          }
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          <FormField label={text.type}>
            <select
              value={editForm.type}
              disabled={editSubmitting}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  type: event.target.value,
                  apartmentRiserId: "",
                }))
              }
              style={fieldStyle}
            >
              <option value="cold">{text.coldWater}</option>
              <option value="hot">{text.hotWater}</option>
            </select>
          </FormField>

          <FormField label={text.riser}>
            <select
              value={editForm.apartmentRiserId}
              disabled={editSubmitting}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  apartmentRiserId: event.target.value,
                }))
              }
              style={fieldStyle}
            >
              <option value="">{text.notAssigned}</option>
              {editRisers
                .filter((riser) => {
                  const value = `${riser.system_type || ""} ${riser.riser_code || ""}`.toLowerCase();
                  const isCold = /(^|[^a-z])(cw|cold|cold_water|cold-water)([^a-z]|$)/.test(value);
                  const isHot = /(^|[^a-z])(hw|hot|hot_water|hot-water)([^a-z]|$)/.test(value);
                  return editForm.type === "cold" ? isCold : isHot;
                })
                .map((riser) => (
                  <option
                    key={riser.apartment_riser_id}
                    value={riser.apartment_riser_id}
                  >
                    {riser.riser_code}
                    {riser.local_label ? ` · ${riser.local_label}` : ""}
                  </option>
                ))}
            </select>
          </FormField>

          <FormField label={text.serialNumber}>
            <input
              type="text"
              value={editForm.serialNumber}
              disabled={editSubmitting}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  serialNumber: event.target.value,
                }))
              }
              style={fieldStyle}
            />
          </FormField>

          <FormField label={text.manufacturer}>
            <input type="text" value={editForm.manufacturer} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, manufacturer: event.target.value}))} style={fieldStyle} />
          </FormField>

          <FormField label={text.model}>
            <input type="text" value={editForm.model} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, model: event.target.value}))} style={fieldStyle} />
          </FormField>

          <FormField label={text.installedDateOptional}>
            <input type="date" value={editForm.installedAt} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, installedAt: event.target.value}))} style={fieldStyle} />
          </FormField>

          <FormField label={text.initialReading}>
            <input type="text" inputMode="decimal" placeholder={text.initialReadingPlaceholder} value={editForm.initialReading} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, initialReading: event.target.value}))} style={fieldStyle} />
          </FormField>

          <FormField label={text.initialReadingDate}>
            <input type="date" value={editForm.initialReadingDate} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, initialReadingDate: event.target.value}))} style={fieldStyle} />
          </FormField>

          <FormField label={text.correctionReason}>
            <textarea rows={3} value={editForm.correctionReason} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, correctionReason: event.target.value}))} style={{...fieldStyle, resize: "vertical"}} />
            <span style={{color: "var(--text)", fontSize: 11}}>{text.correctionReasonHint}</span>
          </FormField>

          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8}}>
            <button type="button" onClick={() => setEditOpen(false)} disabled={editSubmitting} style={secondaryButton}>{text.cancel}</button>
            <button type="button" onClick={handleEditMeter} disabled={editSubmitting} style={{...primaryButton, opacity: editSubmitting ? 0.65 : 1}}>
              {editSubmitting ? text.saving : text.saveChanges}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={calibrationOpen}
        title={
          selectedCalibrationMeter
            ? `${text.calibrationHistory} · ${selectedCalibrationMeter.serial_number || text.meter}`
            : text.calibrationHistory
        }
        onClose={
          closeCalibrationHistory
        }
      >

        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >

          <section
            style={{
              display: "grid",
              gap: 10,
              padding: 12,
              border:
                "1px solid var(--border)",
              borderRadius: 12,
              background:
                "var(--surface-soft)",
            }}
          >

            <strong
              style={{
                color:
                  "var(--text-h)",
              }}
            >
              {text.addCalibration}
            </strong>

            <FormField
              label={text.calibrationDate}
            >
              <input
                type="date"
                value={
                  calibrationForm.calibrationDate
                }
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      calibrationDate:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </FormField>

            <FormField
              label={text.validityPeriodMonths}
            >
              <input
                type="number"
                min="1"
                max="120"
                value={
                  calibrationForm.validityMonths
                }
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      validityMonths:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </FormField>

            <FormField
              label={text.certificateNumber}
            >
              <input
                type="text"
                value={
                  calibrationForm.certificateNumber
                }
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      certificateNumber:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </FormField>

            <FormField
              label={text.calibrationLaboratory}
            >
              <input
                type="text"
                value={
                  calibrationForm.calibrationLaboratory
                }
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      calibrationLaboratory:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </FormField>

            <FormField
              label={text.calibrationDocument}
            >
              <input
                type="file"
                accept=".pdf,.edoc,.asice"
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      document:
                        event.target.files?.[0] ||
                        null,
                    })
                  )
                }
                style={fieldStyle}
              />
            </FormField>

            <FormField
              label={text.notes}
            >
              <textarea
                rows={3}
                value={
                  calibrationForm.notes
                }
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      notes:
                        event.target.value,
                    })
                  )
                }
                style={{
                  ...fieldStyle,
                  resize: "vertical",
                }}
              />
            </FormField>

            <button
              type="button"
              onClick={
                handleAddCalibration
              }
              disabled={
                calibrationSubmitting
              }
              style={{
                ...primaryButton,
                opacity:
                  calibrationSubmitting
                    ? 0.65
                    : 1,
              }}
            >
              {calibrationSubmitting
                ? text.saving
                : text.addCalibration}
            </button>

          </section>

          <section>

            <strong
              style={{
                color:
                  "var(--text-h)",
              }}
            >
              {text.history}
            </strong>

            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 10,
              }}
            >

              {meterCalibrationsLoading ? (

                <div style={emptyState}>
                  {text.loading}
                </div>

              ) : !meterCalibrations
                  ?.calibrations
                  ?.length ? (

                <div style={emptyState}>
                  {text.noCalibrationHistory}
                </div>

              ) : (

                meterCalibrations.calibrations.map(
                  (item) => (

                    <div
                      key={item.id}
                      style={{
                        padding: 12,
                        border:
                          "1px solid var(--border)",
                        borderRadius: 10,
                        background:
                          "var(--surface)",
                      }}
                    >

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >

                        <strong
                          style={{
                            color:
                              "var(--text-h)",
                          }}
                        >
                          {formatDate(
                            item.calibration_date
                          )}
                        </strong>

                        <CalibrationBadge
                          status={
                            getCalibrationStatus(
                              item.expires_at
                            )
                          }
                          text={text}
                        />

                      </div>

                      <div
                        style={{
                          display: "grid",
                          gap: 4,
                          marginTop: 8,
                          fontSize: 12,
                        }}
                      >
                        <span>
                          {text.expires}:{" "}
                          {formatDate(
                            item.expires_at
                          )}
                        </span>

                        <span>
                          {text.certificate}:{" "}
                          {item.certificate_number ||
                            "—"}
                        </span>

                        <span>
                          {text.laboratory}:{" "}
                          {item.calibration_laboratory ||
                            "—"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openCalibrationDocument(
                            item.id,
                            item.certificate_file_name
                          )
                        }
                        style={{
                          ...documentButton,
                          marginTop: 10,
                        }}
                      >
                        {text.viewDocument}
                      </button>

                    </div>

                  )
                )

              )}

            </div>

          </section>

        </div>

      </Modal>

      <Modal
        open={deactivateOpen}
        title={text.deactivateWaterMeters}
        onClose={() => {

          if (
            !deactivateSubmitting
          ) {
            setDeactivateOpen(false);
          }
        }}
      >

        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >

          <p
            style={{
              color:
                "var(--text)",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {text.deactivateDescription}
          </p>

          <div
            style={{
              maxHeight: 320,
              overflowY: "auto",
              display: "grid",
              gap: 8,
              paddingRight: 4,
            }}
          >

            {activeMeters.map(
              (meter) => (

                <label
                  key={meter.id}
                  style={{
                    display: "flex",
                    alignItems:
                      "flex-start",
                    gap: 10,
                    padding: 10,
                    border:
                      "1px solid var(--border)",
                    borderRadius: 9,
                    background:
                      selectedMeterIds
                        .includes(
                          meter.id
                        )
                        ? "var(--surface-muted)"
                        : "var(--surface)",
                    cursor: "pointer",
                  }}
                >

                  <input
                    type="checkbox"
                    checked={
                      selectedMeterIds
                        .includes(
                          meter.id
                        )
                    }
                    disabled={
                      deactivateSubmitting
                    }
                    onChange={() =>
                      toggleSelectedMeter(
                        meter.id
                      )
                    }
                  />

                  <span
                    style={{
                      minWidth: 0,
                    }}
                  >

                    <strong
                      style={{
                        color:
                          "var(--text-h)",
                        fontSize: 13,
                      }}
                    >
                      {text.apartmentPrefix}{" "}
                      {
                        meter.apartment_number
                      }
                      {" · "}
                      {formatType(
                        meter.type
                      )}
                    </strong>

                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        color:
                          "var(--text)",
                        fontSize: 11,
                      }}
                    >
                      {text.serial}{" "}
                      {
                        meter.serial_number ||
                        "—"
                      }
                      {" · "}
                      {meter.riser}
                    </span>

                  </span>

                </label>

              )
            )}

          </div>

          <FormField
            label={text.reason}
          >
            <select
              value={
                deactivateReason
              }
              disabled={
                deactivateSubmitting
              }
              onChange={(event) =>
                setDeactivateReason(
                  event.target.value
                )
              }
              style={fieldStyle}
            >
              <option value="replacement">
                {text.replacement}
              </option>
              <option value="fault">
                {text.fault}
              </option>
              <option value="removed">
                {text.removed}
              </option>
              <option value="other">
                {text.other}
              </option>
            </select>
          </FormField>

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
              onClick={() =>
                setDeactivateOpen(false)
              }
              disabled={
                deactivateSubmitting
              }
              style={secondaryButton}
            >
              {text.cancel}
            </button>

            <button
              type="button"
              onClick={
                handleDeactivate
              }
              disabled={
                deactivateSubmitting
              }
              style={{
                ...dangerButton,

                opacity:
                  deactivateSubmitting
                    ? 0.65
                    : 1,
              }}
            >
              {deactivateSubmitting
                ? text.deactivating
                : text.deactivate}
            </button>

          </div>

        </div>

      </Modal>

    </div>
  );
}

function calculateCalibrationStatus(
  expiresAt,
  text
) {

  if (!expiresAt) {
    return {
      key: "missing",
      label: text.noCalibration,
      tone: "neutral",
    };
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const expiry =
    new Date(
      `${expiresAt}T00:00:00`
    );

  if (
    Number.isNaN(
      expiry.getTime()
    )
  ) {
    return {
      key: "missing",
      label: text.noCalibration,
      tone: "neutral",
    };
  }

  const daysRemaining =
    Math.ceil(
      (
        expiry.getTime() -
        today.getTime()
      ) /
      86400000
    );

  if (daysRemaining < 0) {
    return {
      key: "expired",
      label: text.expired,
      tone: "danger",
    };
  }

  if (
    daysRemaining <= 30
  ) {
    return {
      key: "warning",
      label:
        text.expiresInDays.replace(
          "{days}",
          daysRemaining
        ),
      tone: "warning",
    };
  }

  return {
    key: "valid",
    label: text.valid,
    tone: "success",
  };
}

function CalibrationSummaryCard({
  label,
  value,
  tone,
  active,
  onClick,
}) {

  const tones = {

    success: {
      background: "#dcfce7",
      color: "#166534",
      border: "#86efac",
    },

    warning: {
      background: "#fef3c7",
      color: "#92400e",
      border: "#fcd34d",
    },

    danger: {
      background: "#fee2e2",
      color: "#991b1b",
      border: "#fca5a5",
    },

    neutral: {
      background:
        "var(--surface)",
      color:
        "var(--text-h)",
      border:
        "var(--border)",
    },
  };

  const style =
    tones[tone] ||
    tones.neutral;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 14,
        border:
          `2px solid ${
            active
              ? style.color
              : style.border
          }`,
        borderRadius: 14,
        background:
          style.background,
        color:
          style.color,
        textAlign: "left",
        cursor: "pointer",
        boxShadow:
          active
            ? "0 0 0 2px rgba(37,99,235,.12)"
            : "none",
      }}
    >

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          opacity: 0.85,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 24,
          lineHeight: 1,
          fontWeight: 800,
        }}
      >
        {value}
      </div>

    </button>
  );
}

function SectionHeading({
  children,
  compact = false,
}) {

  return (
    <div
      style={{
        marginTop:
          compact ? 0 : 6,
        paddingTop:
          compact ? 0 : 14,
        borderTop:
          compact
            ? "none"
            : "1px solid var(--border)",
        color:
          "var(--text-h)",
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

function FormField({
  label,
  children,
}) {

  return (
    <label
      style={{
        display: "grid",
        gap: 5,
      }}
    >

      <span
        style={{
          color:
            "var(--text-h)",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {label}
      </span>

      {children}

    </label>
  );
}

function StatusBadge({
  active,
  text,
}) {

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: 999,
        background:
          active
            ? "#dcfce7"
            : "var(--surface-muted)",
        color:
          active
            ? "#166534"
            : "var(--text)",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {active
        ? text.active
        : text.inactive}
    </span>
  );
}

function MeterCard({
  meter,
  formatType,
  formatDate,
  formatReading,
  getCalibrationStatus,
  onOpenDocument,
  onOpenCalibrationHistory,
  onEdit,
  text,
}) {

  return (
    <div
      style={{
        padding: 12,
        border:
          "1px solid var(--border)",
        borderRadius: 12,
        background:
          "var(--surface-soft)",
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
              color:
                "var(--text-h)",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {formatType(
              meter.type
            )}
          </div>

          <div
            style={{
              marginTop: 2,
              color:
                "var(--text)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {meter.location}
          </div>

        </div>

        <StatusBadge
          active={
            meter.status ===
            "active"
          }
          text={text}
        />

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

        {[
          [
            text.serialNumber,
            meter.serial_number ||
              "—",
          ],
          [
            text.manufacturer,
            meter.manufacturer ||
              "—",
          ],
          [
            text.model,
            meter.model ||
              "—",
          ],
          [
            text.riser,
            meter.riser,
          ],
          [
            text.installed,
            formatDate(
              meter.installed_at
            ),
          ],
          [
            text.calibration,
            formatDate(
              meter.calibration_date
            ),
          ],
          [
            text.expires,
            formatDate(
              meter.calibration_expires_at
            ),
          ],
          [
            text.calibrationStatus,
            getCalibrationStatus(
              meter.calibration_expires_at
            ).label,
          ],
          [
            text.certificateNumber,
            meter
              .calibration_certificate_number ||
              "—",
          ],
          [
            text.laboratory,
            meter
              .calibration_laboratory ||
              "—",
          ],
          [
            text.lastReading,
            formatReading(
              meter.last_reading
            ),
          ],
          [
            text.lastDate,
            formatDate(
              meter.last_reading_date
            ),
          ],
        ].map(
          ([
            label,
            value,
          ]) => (

            <>
              <span
                key={
                  `${label}-label`
                }
                style={{
                  color:
                    "var(--text)",
                }}
              >
                {label}
              </span>

              <span
                key={
                  `${label}-value`
                }
                style={{
                  color:
                    "var(--text-h)",
                  textAlign: "right",
                  fontWeight: 600,
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

      <button
        type="button"
        onClick={() =>
          onEdit(meter)
        }
        style={{
          ...secondaryButton,
          width: "100%",
          marginTop: 10,
        }}
      >
        {text.editMeter}
      </button>

      <button
        type="button"
        onClick={() =>
          onOpenCalibrationHistory(
            meter
          )
        }
        style={{
          ...secondaryButton,
          width: "100%",
          marginTop: 10,
        }}
      >
        {text.calibrationHistory}
      </button>

      {meter.calibration_id && (

        <button
          type="button"
          onClick={() =>
            onOpenDocument(
              meter.calibration_id,
              meter.calibration_document_name
            )
          }
          style={{
            ...documentButton,
            width: "100%",
            marginTop: 10,
          }}
        >
          {text.viewCalibrationDocument}
        </button>

      )}

    </div>
  );
}

function CalibrationBadge({
  status,
  text,
}) {

  const styles = {

    success: {
      background: "#dcfce7",
      color: "#166534",
    },

    warning: {
      background: "#fef3c7",
      color: "#92400e",
    },

    danger: {
      background: "#fee2e2",
      color: "#991b1b",
    },

    neutral: {
      background:
        "var(--surface-muted)",
      color:
        "var(--text)",
    },
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...styles[
          status?.tone ||
          "neutral"
        ],
      }}
    >
      {status?.label ||
        text.noCalibration}
    </span>
  );
}

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  border:
    "1px solid var(--input-border)",
  borderRadius: 9,
  background:
    "var(--input-bg)",
  color:
    "var(--input-text)",
  fontSize: 13,
};

const primaryButton = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 9,
  background: "#2563eb",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton = {
  padding: "10px 14px",
  border:
    "1px solid var(--border)",
  borderRadius: 9,
  background:
    "var(--surface)",
  color:
    "var(--text-h)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButton = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 9,
  background: "#dc2626",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const plainButton = {
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

const documentButton = {
  padding: "7px 10px",
  border:
    "1px solid #2563eb",
  borderRadius: 8,
  background:
    "var(--surface)",
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const emptyState = {
  padding: 24,
  border:
    "1px solid var(--border)",
  borderRadius: 14,
  background:
    "var(--surface)",
  color:
    "var(--text)",
};

const apartmentCard = {
  padding: 14,
  border:
    "1px solid var(--border)",
  borderRadius: 16,
  background:
    "var(--surface)",
  boxShadow:
    "var(--shadow)",
};

const countBadge = {
  minWidth: 28,
  padding: "4px 8px",
  borderRadius: 999,
  background:
    "var(--surface-muted)",
  color:
    "var(--text)",
  textAlign: "center",
  fontSize: 11,
  fontWeight: 700,
};

const tableHeader = {
  padding: "10px 12px",
  borderBottom:
    "1px solid var(--border)",
  color:
    "var(--text-h)",
  fontWeight: 700,
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tableCell = {
  padding: "10px 12px",
  borderBottom:
    "1px solid var(--border-soft)",
  color:
    "var(--text)",
  verticalAlign: "middle",
};

const tableCellStrong = {
  ...tableCell,
  color:
    "var(--text-h)",
  fontWeight: 600,
};
