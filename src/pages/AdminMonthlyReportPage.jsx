import {
  useEffect,
  useState,
} from "react";

import useWater from "../hooks/useWater";

export default function AdminMonthlyReportPage() {

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

      const periods =
        await loadAdminReadingEntryPeriods();

      const defaultPeriod =
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
        await loadCurrentWaterReportingPeriod();
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

  const selectedEntryPeriod =
    adminReadingEntryPeriods.find(
      (item) =>
        String(item.id) ===
        String(selectedPeriodId)
    ) ||
    period ||
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
      "en-GB",
      {
        month: "long",
        year: "numeric",
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
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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

    if (!value) {
      return "Unknown";
    }

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
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
      return "Cold Water";
    }

    if (normalizedValue === "hot") {
      return "Hot Water";
    }

    return value || "Water";
  };

  const formatRowStatus = (
    value
  ) => {

    const labels = {
      complete: "Complete",
      missing_current:
        "Missing current",
      missing_previous:
        "Missing previous",
      negative_consumption:
        "Negative consumption",
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
        "XLSX library is not available."
      );

      return;
    }

    if (
      !adminMonthlyReport ||
      !summary ||
      !period
    ) {

      alert(
        "Monthly report data is not available."
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
        "Water Monthly Report",
      ],
      [],
      [
        "Reporting period",
        periodName,
      ],
      [
        "Status",
        formatStatus(
          period.status
        ),
      ],
      [
        "Collection opens",
        formatDateTime(
          period.collection_opens_at
        ),
      ],
      [
        "Collection closes",
        formatDateTime(
          period.collection_closes_at
        ),
      ],
      [
        "Generated at",
        generatedAt.toLocaleString(
          "en-GB"
        ),
      ],
      [],
      [
        "Apartments total",
        Number(
          summary.apartments_total ||
          0
        ),
      ],
      [
        "Apartments submitted",
        Number(
          summary.apartments_submitted ||
          0
        ),
      ],
      [
        "Apartments missing",
        Number(
          summary.apartments_missing ||
          0
        ),
      ],
      [],
      [
        "Meters total",
        Number(
          summary.meters_total ||
          0
        ),
      ],
      [
        "Meters submitted",
        Number(
          summary.meters_submitted ||
          0
        ),
      ],
      [
        "Meters missing",
        Number(
          summary.meters_missing ||
          0
        ),
      ],
      [],
      [
        "Cold Water, m³",
        toCubicMeters(
          coldTotal
        ),
      ],
      [
        "Hot Water, m³",
        toCubicMeters(
          hotTotal
        ),
      ],
      [
        "Total Water, m³",
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
      "Summary"
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
            Apartment:
              String(
                group.apartment_number
              ),

            "Cold Water, m³":
              toCubicMeters(
                cold
              ),

            "Hot Water, m³":
              toCubicMeters(
                hot
              ),

            "Total Water, m³":
              toCubicMeters(
                cold + hot
              ),

            Meters:
              rows.length,

            Status:
              hasProblems
                ? "Requires attention"
                : "Complete",
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
      "Apartments"
    );

    // =====================================
    // METER DETAILS
    // =====================================

    const meterRows =
      reportRows.map(
        (row) => ({

          Apartment:
            String(
              row.apartment_number
            ),

          Type:
            formatMeterType(
              row.type
            ),

          Location:
            row.local_label || "",

          "Serial Number":
            String(
              row.serial_number ||
              ""
            ),

          Riser:
            String(
              row.riser_code ||
              ""
            ),

          "Previous Reading, m³":
            toCubicMeters(
              row.previous_reading
            ),

          "Current Reading, m³":
            toCubicMeters(
              row.current_reading
            ),

          "Consumption, m³":
            toCubicMeters(
              row.consumption
            ),

          Status:
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
      "Meter Details"
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

            Apartment:
              String(
                row.apartment_number
              ),

            Type:
              formatMeterType(
                row.type
              ),

            Location:
              row.local_label || "",

            "Serial Number":
              String(
                row.serial_number ||
                ""
              ),

            Riser:
              String(
                row.riser_code ||
                ""
              ),

            Problem:
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
      "Missing Data"
    );

    const safeMonth =
      String(
        period.period_month
      ).padStart(2, "0");

    const fileName =
      `MVX_Water_Monthly_Report_${period.period_year}-${safeMonth}.xlsx`;

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
        adminReadingEntryPeriods.find(
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
          "Enter at least one reading"
        );

        return;
      }

      if (
        !String(
          receiveReadingNote || ""
        ).trim()
      ) {

        alert(
          "Enter a source note"
        );

        return;
      }

      if (!receiveReadingDate) {
        alert(
          "Select reading date"
        );
        return;
      }

      if (
        !selectedEntryPeriod?.id
      ) {
        alert(
          "Select reporting period"
        );
        return;
      }

      if (
        isClosedEntryPeriod &&
        !confirmClosedPeriodEntry
      ) {
        alert(
          "Confirm the late entry for the closed reporting period"
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
              ? "Reading received"
              : `${successfulCount} readings received`
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
            Monthly Report
          </h1>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "#6b7280",
              lineHeight: 1.5,
            }}
          >
            Water meter collection
            status and monthly
            consumption summary.
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
          Download XLSX
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
          Loading monthly report...
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
                  Reporting period
                </div>

                {adminReadingEntryPeriods.length > 1 ? (

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
                    {adminReadingEntryPeriods.map(
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
                label="Collection opens"
                value={formatDateTime(
                  period.collection_opens_at
                )}
              />

              <InfoItem
                label="Collection closes"
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
              title="Apartments"
              primaryValue={
                summary.apartments_total
              }
              items={[
                {
                  label: "Submitted",
                  value:
                    summary.apartments_submitted,
                },
                {
                  label: "Missing",
                  value:
                    summary.apartments_missing,
                  warning:
                    summary.apartments_missing >
                    0,
                },
              ]}
            />

            <SummaryGroupCard
              title="Meters"
              primaryValue={
                summary.meters_total
              }
              items={[
                {
                  label: "Submitted",
                  value:
                    summary.meters_submitted,
                },
                {
                  label: "Missing",
                  value:
                    summary.meters_missing,
                  warning:
                    summary.meters_missing >
                    0,
                },
              ]}
            />

            <SummaryGroupCard
              title="Water consumption"
              primaryLabel="Total"
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
                  label: "Cold Water",
                  value:
                    formatConsumption(
                      summary.cold_consumption
                    ),
                },
                {
                  label: "Hot Water",
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
                  Apartments requiring
                  attention
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
                  Apartments with one or
                  more missing meter
                  readings.
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
                All apartments have
                submitted readings for
                every active meter.
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
                                Apartment #
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
                                Missing readings
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
                              apartment
                                .missing_meter_count
                            }
                            {" "}
                            {
                              apartment
                                .missing_meter_count ===
                              1
                                ? "meter"
                                : "meters"
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
                                No detailed meter
                                data available.
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
                                          {row.local_label ||
                                            "Location not assigned"}
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
                                        Serial number
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
                                        Riser
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
                                      "1px solid #c2410c",
                                    borderRadius: 9,
                                    background:
                                      "#ffffff",
                                    color:
                                      "#9a3412",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor:
                                      "pointer",
                                  }}
                                >
                                  Receive readings
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
                                    Receive readings for
                                    Apartment #
                                    {
                                      apartment
                                        .apartment_number
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
                                            ? ` · ${row.local_label}`
                                            : ""}
                                          {" — "}
                                          {row.serial_number ||
                                            "No serial"}
                                        </span>

                                        <span
                                          style={{
                                            color:
                                              "#6b7280",
                                            fontSize: 11,
                                            lineHeight: 1.35,
                                          }}
                                        >
                                          Previous:{" "}
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
                                              ? "Enter reading"
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
                                      Reading date
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
                                        This reporting period is closed. I confirm this late administrative entry.
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
                                      Source
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
                                        Paper note
                                      </option>
                                      <option
                                        value="email"
                                      >
                                        Email
                                      </option>
                                      <option
                                        value="phone"
                                      >
                                        Phone
                                      </option>
                                      <option
                                        value="admin_manual"
                                      >
                                        Admin manual
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
                                      Source note
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
                                      placeholder="Example: Paper note received in mailbox"
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
                                      Cancel
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
                                        ? "Saving..."
                                        : "Save readings"}
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
                  Meter details
                </h2>

                <p
                  style={{
                    marginTop: 5,
                    marginBottom: 0,
                    color: "#6b7280",
                    fontSize: 13,
                  }}
                >
                  Previous and current
                  readings for every
                  active water meter.
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
                No active water meters
                found for this report.
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
                      formatMeterType={
                        formatMeterType
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
  formatMeterType,
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
            Apartment #
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
            {rows.length}
            {" "}
            {rows.length === 1
              ? "active meter"
              : "active meters"}
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
            label="Cold Water"
            value={
              formatConsumption(
                coldConsumption
              )
            }
          />

          <ApartmentTotal
            label="Hot Water"
            value={
              formatConsumption(
                hotConsumption
              )
            }
          />

          <ApartmentTotal
            label="Total Water"
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
                  formatMeterType={
                    formatMeterType
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
            formatMeterType={
              formatMeterType
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
  formatMeterType,
  formatConsumption,
  formatRowStatus,
  getRowStatusStyle,
  hideApartmentColumn = false,
}) {

  const headings = [
    ...(hideApartmentColumn
      ? []
      : ["Apartment"]),
    "Type / Location",
    "Serial Number",
    "Riser",
    "Previous",
    "Current",
    "Consumption",
    "Status",
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
                      {row.local_label ||
                        "—"}
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
  formatMeterType,
  formatConsumption,
  formatRowStatus,
  getRowStatusStyle,
}) {

  const values = [
    [
      "Serial number",
      row.serial_number || "—",
    ],
    [
      "Riser",
      row.riser_code || "—",
    ],
    [
      "Previous",
      row.previous_reading ===
        null ||
      row.previous_reading ===
        undefined
        ? "—"
        : formatConsumption(
            row.previous_reading
          ),
    ],
    [
      "Current",
      row.current_reading ===
        null ||
      row.current_reading ===
        undefined
        ? "—"
        : formatConsumption(
            row.current_reading
          ),
    ],
    [
      "Consumption",
      row.consumption === null ||
      row.consumption ===
        undefined
        ? "—"
        : formatConsumption(
            row.consumption
          ),
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
              {row.local_label}
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
          ([label, value]) => (
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
                    label ===
                    "Consumption"
                      ? 700
                      : 600,
                  color:
                    label ===
                      "Consumption" &&
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
