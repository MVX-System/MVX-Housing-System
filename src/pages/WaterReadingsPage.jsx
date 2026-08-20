import {
  useEffect,
  useMemo,
  useState,
} from "react";

import useWater
  from "../hooks/useWater";

export default function WaterReadingsPage() {

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
                row.submission_source
              ),

            status_label:
              formatStatus(
                row.status
              ),

            period_label:
              row.period_year &&
              row.period_month
                ? `${row.period_year}-${String(
                    row.period_month
                  ).padStart(2, "0")}`
                : "No period",

            submitted_by_name:
              row.submitted_by_nick ||
              "System / Unknown",

            corrected_by_name:
              row.corrected_by_nick ||
              "",
          })
        ),
      [adminWater]
    );

  const periods =
    useMemo(
      () =>
        Array.from(
          new Set(
            normalizedRows.map(
              (row) =>
                row.period_label
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
              row.period_label !==
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
          "XLSX library is not loaded"
        );

        return;
      }

      if (
        filteredRows.length === 0
      ) {

        alert(
          "No reading records to export"
        );

        return;
      }

      const exportRows =
        filteredRows.map(
          (row) => ({

            "Date / Time":
              formatDateTime(
                row.submitted_at ||
                row.created_at
              ),

            "Reading Date":
              formatDate(
                row.reading_date
              ),

            "Reporting Period":
              row.period_label,

            "Apartment":
              row.apartment_number,

            "Water Type":
              row.type === "hot"
                ? "Hot Water"
                : "Cold Water",

            "Serial Number":
              row.serial_number ||
              "",

            "Riser":
              row.riser_code ||
              "",

            "Location":
              row.local_label ||
              "",

            "Reading, m³":
              formatReadingNumber(
                row.reading_value
              ),

            "Source":
              row.source_label,

            "Source Note":
              row.source_note ||
              "",

            "Submitted By":
              row.submitted_by_name,

            "Status":
              row.status_label,

            "Correction Reason":
              row.correction_reason ||
              "",

            "Corrected By":
              row.corrected_by_name ||
              "",

            "Corrected At":
              row.corrected_at
                ? formatDateTime(
                    row.corrected_at
                  )
                : "",

            "Replacement Reading, m³":
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
        "Reading History"
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
            Water Reading History
          </h1>

          <p
            style={{
              marginTop: 8,
              color:
                "var(--text)",
              lineHeight: 1.5,
            }}
          >
            Audit history of submitted,
            corrected and superseded
            water readings.
          </p>

        </div>

        <button
          type="button"
          onClick={
            loadHistory
          }
          style={secondaryButton}
        >
          Refresh
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
          label="All records"
          value={summary.total}
        />

        <SummaryCard
          label="Active"
          value={summary.active}
        />

        <SummaryCard
          label="Superseded"
          value={summary.superseded}
        />

        <SummaryCard
          label="Admin received"
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
            placeholder="Search apartment, serial, user..."
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
              All periods
            </option>

            {periods.map(
              (period) => (

                <option
                  key={period}
                  value={period}
                >
                  {period}
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
              All water types
            </option>
            <option value="cold">
              Cold Water
            </option>
            <option value="hot">
              Hot Water
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
              All sources
            </option>
            <option value="resident_portal">
              Resident portal
            </option>
            <option value="paper_note">
              Paper note
            </option>
            <option value="email">
              Email
            </option>
            <option value="phone">
              Phone
            </option>
            <option value="admin_manual">
              Admin manual
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
              All statuses
            </option>
            <option value="active">
              Active
            </option>
            <option value="superseded">
              Superseded
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
          Export XLSX
        </button>

      </div>

      {loading ? (

        <div style={emptyState}>
          Loading history...
        </div>

      ) : filteredRows.length ===
        0 ? (

        <div style={emptyState}>
          No reading records match the
          selected filters.
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
                  "Date / Time",
                  "Period",
                  "Apartment",
                  "Meter",
                  "Reading",
                  "Source",
                  "Submitted by",
                  "Status",
                  "Correction",
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
                          row.created_at
                        )}
                      </strong>

                      <div
                        style={subText}
                      >
                        Reading date:{" "}
                        {formatDate(
                          row.reading_date
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
                          ? "Hot Water"
                          : "Cold Water"}
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
                        row.reading_value
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
                            Replaced by{" "}
                            {formatReading(
                              row
                                .replacement_reading_value
                            )}
                          </div>

                          <div style={subText}>
                            {
                              row.correction_reason ||
                              "No reason recorded"
                            }
                          </div>

                          {row.corrected_by_name && (

                            <div style={subText}>
                              By{" "}
                              {
                                row.corrected_by_name
                              }
                            </div>

                          )}

                          {row.corrected_at && (

                            <div style={subText}>
                              {formatDateTime(
                                row.corrected_at
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
            Apartment #
            {row.apartment_number}
          </strong>

          <div style={subText}>
            {row.type === "hot"
              ? "Hot Water"
              : "Cold Water"}
            {" · "}
            {row.serial_number ||
              "No serial"}
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
          label="Reading"
          value={
            formatReading(
              row.reading_value
            )
          }
        />

        <CardRow
          label="Period"
          value={row.period_label}
        />

        <CardRow
          label="Submitted"
          value={
            formatDateTime(
              row.submitted_at ||
              row.created_at
            )
          }
        />

        <CardRow
          label="Source"
          value={row.source_label}
        />

        <CardRow
          label="Submitted by"
          value={
            row.submitted_by_name
          }
        />

        <CardRow
          label="Riser"
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
          Replaced by{" "}
          {formatReading(
            row
              .replacement_reading_value
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
  source
) {

  const labels = {

    resident_portal:
      "Resident portal",

    paper_note:
      "Paper note",

    email:
      "Email",

    phone:
      "Phone",

    admin_manual:
      "Admin manual",
  };

  return (
    labels[source] ||
    source ||
    "Unknown"
  );
}

function formatStatus(
  status
) {

  const labels = {
    active: "Active",
    superseded: "Superseded",
  };

  return (
    labels[status] ||
    status ||
    "Unknown"
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
  value
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

  return (
    (numeric / 1000)
      .toFixed(3)
      .replace(".", ",") +
    " m³"
  );
}

function formatDate(
  value
) {

  if (!value) {
    return "—";
  }

  return String(value)
    .slice(0, 10);
}

function formatDateTime(
  value
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
    undefined,
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