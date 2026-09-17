import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
    title: "Ūdens rādījumu vēsture",
    subtitle: "Iesniegto, laboto un aizstāto ūdens skaitītāju rādījumu audita vēsture.",
    refresh: "Atjaunot",
    allRecords: "Visi ieraksti",
    activeRecords: "Aktīvie",
    supersededRecords: "Aizstātie",
    adminReceived: "Administrācijas saņemtie",
    searchPlaceholder: "Meklēt pēc dzīvokļa, sērijas numura vai lietotāja...",
    allPeriods: "Visi periodi",
    allWaterTypes: "Visi ūdens veidi",
    coldWater: "Aukstais ūdens",
    hotWater: "Karstais ūdens",
    allSources: "Visi avoti",
    residentPortal: "Iedzīvotāja portāls",
    paperNote: "Papīra pieraksts",
    email: "E-pasts",
    phone: "Tālrunis",
    manualAdminEntry: "Administratora manuāla ievade",
    allStatuses: "Visi statusi",
    active: "Aktīvs",
    superseded: "Aizstāts",
    exportXlsx: "Eksportēt XLSX",
    loadingHistory: "Ielādē vēsturi...",
    noMatches: "Neviens rādījumu ieraksts neatbilst atlasītajiem filtriem.",
    noPeriod: "Nav perioda",
    systemUnknown: "Sistēma / nav zināms",
    unknown: "Nav zināms",
    dateTime: "Datums / laiks",
    period: "Periods",
    apartment: "Dzīvoklis",
    meter: "Skaitītājs",
    reading: "Rādījums",
    source: "Avots",
    submittedBy: "Iesniedza",
    status: "Statuss",
    correction: "Labojums",
    readingDate: "Rādījuma datums",
    replacedBy: "Aizstāts ar",
    noReasonRecorded: "Iemesls nav norādīts",
    by: "Veica",
    noSerial: "Nav sērijas numura",
    riser: "Stāvvads",
    submitted: "Iesniegts",
    xlsxLibraryMissing: "XLSX bibliotēka nav ielādēta.",
    noExportRecords: "Nav eksportējamu rādījumu ierakstu.",
    exportSheetName: "Rādījumu vēsture",
    exportReadingDate: "Rādījuma datums",
    exportReportingPeriod: "Pārskata periods",
    exportWaterType: "Ūdens veids",
    exportSerialNumber: "Sērijas numurs",
    exportLocation: "Atrašanās vieta",
    exportReading: "Rādījums, m³",
    exportSourceNote: "Avota piezīme",
    exportCorrectionReason: "Labošanas iemesls",
    exportCorrectedBy: "Laboja",
    exportCorrectedAt: "Labots",
    exportReplacementReading: "Aizstājošais rādījums, m³",
  },
  en: {
    title: "Water Reading History",
    subtitle: "Audit history of submitted, corrected and superseded water readings.",
    refresh: "Refresh",
    allRecords: "All records",
    activeRecords: "Active",
    supersededRecords: "Superseded",
    adminReceived: "Admin received",
    searchPlaceholder: "Search apartment, serial, user...",
    allPeriods: "All periods",
    allWaterTypes: "All water types",
    coldWater: "Cold Water",
    hotWater: "Hot Water",
    allSources: "All sources",
    residentPortal: "Resident portal",
    paperNote: "Paper note",
    email: "Email",
    phone: "Phone",
    manualAdminEntry: "Manual admin entry",
    allStatuses: "All statuses",
    active: "Active",
    superseded: "Superseded",
    exportXlsx: "Export XLSX",
    loadingHistory: "Loading history...",
    noMatches: "No reading records match the selected filters.",
    noPeriod: "No period",
    systemUnknown: "System / Unknown",
    unknown: "Unknown",
    dateTime: "Date / Time",
    period: "Period",
    apartment: "Apartment",
    meter: "Meter",
    reading: "Reading",
    source: "Source",
    submittedBy: "Submitted by",
    status: "Status",
    correction: "Correction",
    readingDate: "Reading date",
    replacedBy: "Replaced by",
    noReasonRecorded: "No reason recorded",
    by: "By",
    noSerial: "No serial",
    riser: "Riser",
    submitted: "Submitted",
    xlsxLibraryMissing: "XLSX library is not loaded.",
    noExportRecords: "No reading records to export.",
    exportSheetName: "Reading History",
    exportReadingDate: "Reading Date",
    exportReportingPeriod: "Reporting Period",
    exportWaterType: "Water Type",
    exportSerialNumber: "Serial Number",
    exportLocation: "Location",
    exportReading: "Reading, m³",
    exportSourceNote: "Source Note",
    exportCorrectionReason: "Correction Reason",
    exportCorrectedBy: "Corrected By",
    exportCorrectedAt: "Corrected At",
    exportReplacementReading: "Replacement Reading, m³",
  },
  ru: {
    title: "История показаний воды",
    subtitle: "История аудита переданных, исправленных и заменённых показаний воды.",
    refresh: "Обновить",
    allRecords: "Все записи",
    activeRecords: "Активные",
    supersededRecords: "Заменённые",
    adminReceived: "Получено администрацией",
    searchPlaceholder: "Поиск по квартире, серийному номеру или пользователю...",
    allPeriods: "Все периоды",
    allWaterTypes: "Все типы воды",
    coldWater: "Холодная вода",
    hotWater: "Горячая вода",
    allSources: "Все источники",
    residentPortal: "Портал жильца",
    paperNote: "Бумажная запись",
    email: "Электронная почта",
    phone: "Телефон",
    manualAdminEntry: "Ручной ввод администратором",
    allStatuses: "Все статусы",
    active: "Активно",
    superseded: "Заменено",
    exportXlsx: "Экспортировать XLSX",
    loadingHistory: "Загрузка истории...",
    noMatches: "Нет записей показаний, соответствующих выбранным фильтрам.",
    noPeriod: "Без периода",
    systemUnknown: "Система / неизвестно",
    unknown: "Неизвестно",
    dateTime: "Дата / время",
    period: "Период",
    apartment: "Квартира",
    meter: "Счётчик",
    reading: "Показание",
    source: "Источник",
    submittedBy: "Передал",
    status: "Статус",
    correction: "Исправление",
    readingDate: "Дата показания",
    replacedBy: "Заменено на",
    noReasonRecorded: "Причина не указана",
    by: "Кем",
    noSerial: "Без серийного номера",
    riser: "Стояк",
    submitted: "Передано",
    xlsxLibraryMissing: "Библиотека XLSX не загружена.",
    noExportRecords: "Нет записей показаний для экспорта.",
    exportSheetName: "История показаний",
    exportReadingDate: "Дата показания",
    exportReportingPeriod: "Отчётный период",
    exportWaterType: "Тип воды",
    exportSerialNumber: "Серийный номер",
    exportLocation: "Расположение",
    exportReading: "Показание, м³",
    exportSourceNote: "Примечание к источнику",
    exportCorrectionReason: "Причина исправления",
    exportCorrectedBy: "Исправил",
    exportCorrectedAt: "Исправлено",
    exportReplacementReading: "Заменяющее показание, м³",
  },
};

export default function WaterReadingsPage() {

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
    adminWater,
    loadAdminWater,
  } = useWater();

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    isMobile,
    setIsMobile
  ] = useState(
    window.innerWidth < 768
  );

  const [
    filter,
    setFilter
  ] = useState({
    search: "",
    type: "all",
    source: "all",
    status: "all",
    period: "all",
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

  const loadHistory =
    async () => {

      setLoading(true);

      try {

        await loadAdminWater();

      } finally {

        setLoading(false);
      }
    };

  useEffect(() => {

    loadHistory();

  }, []);

  // Stage 2I-5B2:
  // Water Reading History uses only pseudonymous Nick identity.
  // Legacy first_name / last_name fallbacks have been removed.
  const normalizedRows =
    useMemo(
      () =>
        adminWater.map(
          (row) => ({

            ...row,

            source_label:
              formatSource(
                row.submission_source,
                text
              ),

            status_label:
              formatStatus(
                row.status,
                text
              ),

            period_label:
              row.period_year &&
              row.period_month
                ? `${row.period_year}-${String(
                    row.period_month
                  ).padStart(2, "0")}`
                : text.noPeriod,

            period_key:
              row.period_year &&
              row.period_month
                ? `${row.period_year}-${String(
                    row.period_month
                  ).padStart(2, "0")}`
                : "none",

            submitted_by_name:
              row.submitted_by_nick ||
              text.systemUnknown,

            corrected_by_name:
              row.corrected_by_nick ||
              "",
          })
        ),
      [
        adminWater,
        text,
      ]
    );

  const periods =
    useMemo(
      () =>
        Array.from(
          new Set(
            normalizedRows.map(
              (row) =>
                row.period_key
            )
          )
        ).sort().reverse(),
      [normalizedRows]
    );

  const filteredRows =
    useMemo(
      () =>
        normalizedRows.filter(
          (row) => {

            const search =
              filter.search
                .trim()
                .toLowerCase();

            if (search) {

              const searchable =
                [
                  row.apartment_number,
                  row.serial_number,
                  row.riser_code,
                  row.local_label,
                  row.submitted_by_name,
                  row.source_note,
                  row.correction_reason,
                ]
                  .map(
                    (value) =>
                      String(
                        value || ""
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
              row.type !== filter.type
            ) {
              return false;
            }

            if (
              filter.source !== "all" &&
              row.submission_source !==
                filter.source
            ) {
              return false;
            }

            if (
              filter.status !== "all" &&
              row.status !==
                filter.status
            ) {
              return false;
            }

            if (
              filter.period !== "all" &&
              row.period_key !==
                filter.period
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        normalizedRows,
        filter,
      ]
    );

  const summary =
    useMemo(
      () => ({

        total:
          normalizedRows.length,

        active:
          normalizedRows.filter(
            (row) =>
              row.status ===
              "active"
          ).length,

        superseded:
          normalizedRows.filter(
            (row) =>
              row.status ===
              "superseded"
          ).length,

        admin:
          normalizedRows.filter(
            (row) =>
              row.submission_source !==
              "resident_portal"
          ).length,
      }),
      [normalizedRows]
    );

  const exportToXlsx =
    () => {

      const XLSX =
        window.XLSX;

      if (!XLSX) {

        alert(
          text.xlsxLibraryMissing
        );

        return;
      }

      if (
        filteredRows.length === 0
      ) {

        alert(
          text.noExportRecords
        );

        return;
      }

      const exportRows =
        filteredRows.map(
          (row) => ({

            [text.dateTime]:
              formatDateTime(
                row.submitted_at ||
                row.created_at,
                locale
              ),

            [text.exportReadingDate]:
              formatDate(
                row.reading_date,
                locale
              ),

            [text.exportReportingPeriod]:
              row.period_label,

            [text.apartment]:
              row.apartment_number,

            [text.exportWaterType]:
              row.type === "hot"
                ? text.hotWater
                : text.coldWater,

            [text.exportSerialNumber]:
              row.serial_number ||
              "",

            [text.riser]:
              row.riser_code ||
              "",

            [text.exportLocation]:
              row.local_label ||
              "",

            [text.exportReading]:
              formatReadingNumber(
                row.reading_value
              ),

            [text.source]:
              row.source_label,

            [text.exportSourceNote]:
              row.source_note ||
              "",

            [text.submittedBy]:
              row.submitted_by_name,

            [text.status]:
              row.status_label,

            [text.exportCorrectionReason]:
              row.correction_reason ||
              "",

            [text.exportCorrectedBy]:
              row.corrected_by_name ||
              "",

            [text.exportCorrectedAt]:
              row.corrected_at
                ? formatDateTime(
                    row.corrected_at,
                    locale
                  )
                : "",

            [text.exportReplacementReading]:
              row
                .replacement_reading_value !==
                null &&
              row
                .replacement_reading_value !==
                undefined
                ? formatReadingNumber(
                    row
                      .replacement_reading_value
                  )
                : "",
          })
        );

      const worksheet =
        XLSX.utils.json_to_sheet(
          exportRows
        );

      worksheet["!cols"] = [
        { wch: 18 },
        { wch: 12 },
        { wch: 16 },
        { wch: 11 },
        { wch: 14 },
        { wch: 18 },
        { wch: 20 },
        { wch: 18 },
        { wch: 14 },
        { wch: 18 },
        { wch: 28 },
        { wch: 22 },
        { wch: 14 },
        { wch: 30 },
        { wch: 22 },
        { wch: 18 },
        { wch: 22 },
      ];

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        text.exportSheetName
      );

      const periodPart =
        filter.period === "all"
          ? "all-periods"
          : filter.period;

      XLSX.writeFile(
        workbook,
        `water-reading-history-${periodPart}.xlsx`
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
          marginBottom: 20,
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

        <button
          type="button"
          onClick={
            loadHistory
          }
          style={secondaryButton}
        >
          {text.refresh}
        </button>

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

        <SummaryCard
          label={text.allRecords}
          value={summary.total}
        />

        <SummaryCard
          label={text.activeRecords}
          value={summary.active}
        />

        <SummaryCard
          label={text.supersededRecords}
          value={summary.superseded}
        />

        <SummaryCard
          label={text.adminReceived}
          value={summary.admin}
        />

      </div>

      <section
        style={{
          padding: 14,
          marginBottom: 16,
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
              "repeat(auto-fit, minmax(165px, 1fr))",
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
            value={filter.period}
            onChange={(event) =>
              setFilter(
                (current) => ({
                  ...current,
                  period:
                    event.target.value,
                })
              )
            }
            style={fieldStyle}
          >
            <option value="all">
              {text.allPeriods}
            </option>

            {periods.map(
              (period) => (

                <option
                  key={period}
                  value={period}
                >
                  {period === "none"
                    ? text.noPeriod
                    : period}
                </option>

              )
            )}
          </select>

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
              {text.allWaterTypes}
            </option>
            <option value="cold">
              {text.coldWater}
            </option>
            <option value="hot">
              {text.hotWater}
            </option>
          </select>

          <select
            value={filter.source}
            onChange={(event) =>
              setFilter(
                (current) => ({
                  ...current,
                  source:
                    event.target.value,
                })
              )
            }
            style={fieldStyle}
          >
            <option value="all">
              {text.allSources}
            </option>
            <option value="resident_portal">
              {text.residentPortal}
            </option>
            <option value="paper_note">
              {text.paperNote}
            </option>
            <option value="email">
              {text.email}
            </option>
            <option value="phone">
              {text.phone}
            </option>
            <option value="admin_manual">
              {text.manualAdminEntry}
            </option>
          </select>

          <select
            value={filter.status}
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
            <option value="superseded">
              {text.superseded}
            </option>
          </select>

        </div>

      </section>

      <div
        style={{
          display: "flex",
          justifyContent:
            "flex-end",
          marginBottom: 16,
        }}
      >

        <button
          type="button"
          onClick={
            exportToXlsx
          }
          style={{
            ...primaryButton,
            minWidth: 150,
          }}
        >
          {text.exportXlsx}
        </button>

      </div>

      {loading ? (

        <div style={emptyState}>
          {text.loadingHistory}
        </div>

      ) : filteredRows.length ===
        0 ? (

        <div style={emptyState}>
          {text.noMatches}
        </div>

      ) : isMobile ? (

        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >

          {filteredRows.map(
            (row) => (

              <ReadingCard
                key={row.reading_id}
                row={row}
                text={text}
                locale={locale}
              />

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
              minWidth: 1500,
              borderCollapse:
                "collapse",
              fontSize: 12,
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
                  text.dateTime,
                  text.period,
                  text.apartment,
                  text.meter,
                  text.reading,
                  text.source,
                  text.submittedBy,
                  text.status,
                  text.correction,
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

              {filteredRows.map(
                (
                  row,
                  index
                ) => (

                  <tr
                    key={
                      row.reading_id
                    }
                    style={{
                      background:
                        index % 2 === 0
                          ? "var(--surface)"
                          : "var(--surface-soft)",
                    }}
                  >

                    <td style={tableCell}>
                      <strong
                        style={{
                          color:
                            "var(--text-h)",
                        }}
                      >
                        {formatDateTime(
                          row.submitted_at ||
                          row.created_at,
                          locale
                        )}
                      </strong>

                      <div
                        style={subText}
                      >
                        {text.readingDate}:{" "}
                        {formatDate(
                          row.reading_date,
                          locale
                        )}
                      </div>
                    </td>

                    <td style={tableCell}>
                      {row.period_label}
                    </td>

                    <td style={tableCellStrong}>
                      #
                      {row.apartment_number}

                      <div style={subText}>
                        {row.local_label ||
                          "—"}
                      </div>
                    </td>

                    <td style={tableCell}>
                      <div
                        style={{
                          color:
                            "var(--text-h)",
                          fontWeight: 700,
                        }}
                      >
                        {row.type === "hot"
                          ? text.hotWater
                          : text.coldWater}
                      </div>

                      <div style={subText}>
                        {row.serial_number ||
                          "—"}
                      </div>

                      <div style={subText}>
                        {row.riser_code ||
                          "—"}
                      </div>
                    </td>

                    <td style={tableCellStrong}>
                      {formatReading(
                        row.reading_value,
                        locale
                      )}
                    </td>

                    <td style={tableCell}>
                      <SourceBadge
                        source={
                          row.submission_source
                        }
                        label={
                          row.source_label
                        }
                      />

                      {row.source_note && (

                        <div
                          style={{
                            ...subText,
                            marginTop: 4,
                            maxWidth: 220,
                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {row.source_note}
                        </div>

                      )}
                    </td>

                    <td style={tableCell}>
                      {row.submitted_by_name}
                    </td>

                    <td style={tableCell}>
                      <StatusBadge
                        status={row.status}
                        label={
                          row.status_label
                        }
                      />
                    </td>

                    <td style={tableCell}>
                      {row.status ===
                        "superseded" ? (

                        <div
                          style={{
                            maxWidth: 260,
                          }}
                        >

                          <div
                            style={{
                              color:
                                "var(--text-h)",
                              fontWeight: 700,
                            }}
                          >
                            {text.replacedBy}{" "}
                            {formatReading(
                              row
                                .replacement_reading_value,
                              locale
                            )}
                          </div>

                          <div style={subText}>
                            {
                              row.correction_reason ||
                              text.noReasonRecorded
                            }
                          </div>

                          {row.corrected_by_name && (

                            <div style={subText}>
                              {text.by}{" "}
                              {
                                row.corrected_by_name
                              }
                            </div>

                          )}

                          {row.corrected_at && (

                            <div style={subText}>
                              {formatDateTime(
                                row.corrected_at,
                                locale
                              )}
                            </div>

                          )}

                        </div>

                      ) : (
                        "—"
                      )}
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}

function ReadingCard({
  row,
  text,
  locale,
}) {

  return (
    <article
      style={{
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
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: 10,
          marginBottom: 12,
        }}
      >

        <div>

          <strong
            style={{
              color:
                "var(--text-h)",
              fontSize: 15,
            }}
          >
            {text.apartment} #
            {row.apartment_number}
          </strong>

          <div style={subText}>
            {row.type === "hot"
              ? text.hotWater
              : text.coldWater}
            {" · "}
            {row.serial_number ||
              text.noSerial}
          </div>

        </div>

        <StatusBadge
          status={row.status}
          label={row.status_label}
        />

      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "auto minmax(0, 1fr)",
          gap: "6px 12px",
          fontSize: 12,
        }}
      >

        <CardRow
          label={text.reading}
          value={
            formatReading(
              row.reading_value,
              locale
            )
          }
        />

        <CardRow
          label={text.period}
          value={row.period_label}
        />

        <CardRow
          label={text.submitted}
          value={
            formatDateTime(
              row.submitted_at ||
              row.created_at,
              locale
            )
          }
        />

        <CardRow
          label={text.source}
          value={row.source_label}
        />

        <CardRow
          label={text.submittedBy}
          value={
            row.submitted_by_name
          }
        />

        <CardRow
          label={text.riser}
          value={
            row.riser_code || "—"
          }
        />

      </div>

      {row.source_note && (

        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 9,
            background:
              "var(--surface-soft)",
            fontSize: 12,
          }}
        >
          {row.source_note}
        </div>

      )}

      {row.status ===
        "superseded" && (

        <div
          style={{
            marginTop: 10,
            padding: 10,
            border:
              "1px solid #fca5a5",
            borderRadius: 9,
            background:
              "#fee2e2",
            color: "#991b1b",
            fontSize: 12,
          }}
        >
          {text.replacedBy}{" "}
          {formatReading(
            row
              .replacement_reading_value,
            locale
          )}
          {row.correction_reason
            ? ` · ${row.correction_reason}`
            : ""}
        </div>

      )}

    </article>
  );
}

function CardRow({
  label,
  value,
}) {

  return (
    <>
      <span
        style={{
          color:
            "var(--text)",
        }}
      >
        {label}
      </span>

      <span
        style={{
          color:
            "var(--text-h)",
          textAlign: "right",
          fontWeight: 600,
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </span>
    </>
  );
}

function SummaryCard({
  label,
  value,
}) {

  return (
    <div
      style={{
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
          color:
            "var(--text)",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          color:
            "var(--text-h)",
          fontSize: 24,
          fontWeight: 800,
        }}
      >
        {value}
      </div>

    </div>
  );
}

function SourceBadge({
  source,
  label,
}) {

  const colors = {

    resident_portal: {
      background: "#dbeafe",
      color: "#1d4ed8",
    },

    paper_note: {
      background: "#fef3c7",
      color: "#92400e",
    },

    email: {
      background: "#ede9fe",
      color: "#6d28d9",
    },

    phone: {
      background: "#cffafe",
      color: "#155e75",
    },

    admin_manual: {
      background: "#f3f4f6",
      color: "#374151",
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
        ...(
          colors[source] ||
          colors.admin_manual
        ),
      }}
    >
      {label}
    </span>
  );
}

function StatusBadge({
  status,
  label,
}) {

  const active =
    status === "active";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 8px",
        borderRadius: 999,
        background:
          active
            ? "#dcfce7"
            : "#fee2e2",
        color:
          active
            ? "#166534"
            : "#991b1b",
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function formatSource(
  source,
  text
) {

  const labels = {

    resident_portal:
      text.residentPortal,

    paper_note:
      text.paperNote,

    email:
      text.email,

    phone:
      text.phone,

    admin_manual:
      text.manualAdminEntry,
  };

  return (
    labels[source] ||
    source ||
    text.unknown
  );
}

function formatStatus(
  status,
  text
) {

  const labels = {
    active: text.active,
    superseded:
      text.superseded,
  };

  return (
    labels[status] ||
    status ||
    text.unknown
  );
}

function formatReadingNumber(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return "";
  }

  return numeric / 1000;
}

function formatReading(
  value,
  locale
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric
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
  ).format(numeric / 1000)} m³`;
}

function formatDate(
  value,
  locale
) {

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
}

function formatDateTime(
  value,
  locale
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

  return date.toLocaleString(
    locale,
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
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
  verticalAlign: "top",
};

const tableCellStrong = {
  ...tableCell,
  color:
    "var(--text-h)",
  fontWeight: 700,
};

const subText = {
  marginTop: 3,
  color:
    "var(--text)",
  fontSize: 10,
  fontWeight: 500,
};
