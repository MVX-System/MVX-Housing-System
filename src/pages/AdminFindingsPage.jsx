import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Navigate,
} from "react-router-dom";

import PageHeader
  from "../components/PageHeader";

import SectionCard
  from "../components/SectionCard";

import {
  useMode,
} from "../context/ModeContext";

import {
  useTranslation,
} from "../i18n";

import {
  FINDING_TYPES,
  getAdminTestFinding,
  getAdminTestFindingScreenshot,
  getAdminTestFindings,
  readFindingScreenshotResponse,
} from "../api/findings";


const STATUSES = [
  "NEW",
  "NEEDS_INFO",
  "HOLD",
  "APPROVED",
  "IN_PROGRESS",
  "READY_FOR_RETEST",
  "VERIFIED",
  "CLOSED",
];

const LIMIT = 50;


const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  borderRadius: 9,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  font: "inherit",
};


const labelStyle = {
  display: "block",
  marginBottom: 5,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-muted, #64748b)",
};


const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};


const buttonStyle = {
  borderRadius: 9,
  padding: "9px 14px",
  fontWeight: 700,
  cursor: "pointer",
};


const primaryButtonStyle = {
  ...buttonStyle,
  border: "none",
  background: "var(--accent, #2563eb)",
  color: "#fff",
};


const secondaryButtonStyle = {
  ...buttonStyle,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
};


function emptyFilters() {
  return {
    number: "",
    status: "",
    type: "",
    tester: "",
    role: "",
    route: "",
    version: "",
    blocking: "",
    from: "",
    to: "",
  };
}


function apiError(result, fallback) {
  return result?.error || fallback;
}


function formatDate(value, language) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const locale =
    language === "lv"
      ? "lv-LV"
      : language === "ru"
        ? "ru-RU"
        : "en-GB";

  return date.toLocaleString(locale);
}


function buildQuery(filters, offset) {
  const params = {
    limit: LIMIT,
    offset,
  };

  for (const key of [
    "number",
    "status",
    "type",
    "tester",
    "role",
    "route",
    "version",
    "blocking",
  ]) {
    const value = String(
      filters[key] || ""
    ).trim();

    if (value) {
      params[key] = value;
    }
  }

  if (filters.from) {
    params.from =
      `${filters.from}T00:00:00.000Z`;
  }

  if (filters.to) {
    params.to =
      `${filters.to}T23:59:59.999Z`;
  }

  return params;
}


function StatusChip({
  status,
  label,
}) {
  const tones = {
    NEW: ["#e0f2fe", "#075985"],
    NEEDS_INFO: ["#fef3c7", "#92400e"],
    HOLD: ["#f3f4f6", "#4b5563"],
    APPROVED: ["#ede9fe", "#6d28d9"],
    IN_PROGRESS: ["#dbeafe", "#1d4ed8"],
    READY_FOR_RETEST: ["#cffafe", "#0e7490"],
    VERIFIED: ["#dcfce7", "#15803d"],
    CLOSED: ["#e5e7eb", "#374151"],
  };

  const [
    background,
    color,
  ] = tones[status] || tones.HOLD;

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 9px",
        borderRadius: 999,
        background,
        color,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}


function Notice({
  kind = "error",
  children,
}) {
  if (!children) {
    return null;
  }

  const palette = {
    error: {
      background: "#fee2e2",
      border: "#fecaca",
      color: "#991b1b",
    },
    info: {
      background: "#eff6ff",
      border: "#bfdbfe",
      color: "#1e40af",
    },
  };

  const selected =
    palette[kind] || palette.error;

  return (
    <div
      style={{
        marginBottom: 14,
        padding: "10px 12px",
        borderRadius: 10,
        border:
          `1px solid ${selected.border}`,
        background:
          selected.background,
        color: selected.color,
      }}
    >
      {children}
    </div>
  );
}


function DetailRow({
  label,
  children,
}) {
  return (
    <div
      style={{
        padding: "8px 0",
        borderBottom:
          "1px solid var(--border)",
      }}
    >
      <div
        style={{
          marginBottom: 3,
          fontSize: 12,
          fontWeight: 700,
          color:
            "var(--text-muted, #64748b)",
        }}
      >
        {label}
      </div>

      <div
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          color: "var(--text)",
        }}
      >
        {children ?? "—"}
      </div>
    </div>
  );
}


export default function AdminFindingsPage() {
  const {
    mode,
  } = useMode();

  const {
    t,
    language,
  } = useTranslation();

  const [
    draftFilters,
    setDraftFilters,
  ] = useState(
    emptyFilters
  );

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(
    emptyFilters
  );

  const [
    offset,
    setOffset,
  ] = useState(0);

  const [
    findings,
    setFindings,
  ] = useState([]);

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    selected,
    setSelected,
  ] = useState(null);

  const [
    selectedEvents,
    setSelectedEvents,
  ] = useState([]);

  const [
    selectedRetests,
    setSelectedRetests,
  ] = useState([]);

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    screenshotUrl,
    setScreenshotUrl,
  ] = useState(null);

  const screenshotUrlRef =
    useRef(null);

  const [
    screenshotLoading,
    setScreenshotLoading,
  ] = useState(false);

  const [
    screenshotError,
    setScreenshotError,
  ] = useState("");


  const revokeScreenshotUrl =
    () => {
      if (
        screenshotUrlRef.current
      ) {
        URL.revokeObjectURL(
          screenshotUrlRef.current
        );

        screenshotUrlRef.current =
          null;
      }

      setScreenshotUrl(null);
    };


  useEffect(
    () => () => {
      if (
        screenshotUrlRef.current
      ) {
        URL.revokeObjectURL(
          screenshotUrlRef.current
        );
      }
    },
    []
  );


  useEffect(() => {
    if (mode !== "admin") {
      return undefined;
    }

    let cancelled = false;

    const timerId =
      window.setTimeout(
        async () => {
          setLoading(true);
          setError("");

          try {
            const result =
              await getAdminTestFindings(
                buildQuery(
                  appliedFilters,
                  offset
                )
              );

            if (!result?.ok) {
              throw new Error(
                apiError(
                  result,
                  "findings_load_failed"
                )
              );
            }

            if (!cancelled) {
              setFindings(
                Array.isArray(
                  result.findings
                )
                  ? result.findings
                  : []
              );

              setTotal(
                Number(
                  result.total || 0
                )
              );
            }
          } catch (
            loadError
          ) {
            if (!cancelled) {
              setError(
                `${t(
                  "findings.admin.loadFailed"
                )} ${
                  loadError?.message
                    ? `(${loadError.message})`
                    : ""
                }`
              );

              setFindings([]);
              setTotal(0);
            }
          } finally {
            if (!cancelled) {
              setLoading(false);
            }
          }
        },
        0
      );

    return () => {
      cancelled = true;

      window.clearTimeout(
        timerId
      );
    };
  }, [
    appliedFilters,
    offset,
    mode,
    t,
  ]);


  const loadScreenshot =
    async (findingId) => {
      revokeScreenshotUrl();

      setScreenshotError("");
      setScreenshotLoading(true);

      try {
        const response =
          await getAdminTestFindingScreenshot(
            findingId
          );

        const parsed =
          await readFindingScreenshotResponse(
            response
          );

        if (
          !parsed.ok ||
          !parsed.blob
        ) {
          throw new Error(
            parsed.error ||
            "screenshot_load_failed"
          );
        }

        const url =
          URL.createObjectURL(
            parsed.blob
          );

        screenshotUrlRef.current =
          url;

        setScreenshotUrl(url);
      } catch (
        screenshotLoadError
      ) {
        setScreenshotError(
          screenshotLoadError
            ?.message ||
          "screenshot_load_failed"
        );
      } finally {
        setScreenshotLoading(false);
      }
    };


  const openFinding =
    async (findingId) => {
      setDetailLoading(true);
      setError("");

      revokeScreenshotUrl();
      setScreenshotError("");

      try {
        const result =
          await getAdminTestFinding(
            findingId
          );

        if (!result?.ok) {
          throw new Error(
            apiError(
              result,
              "finding_load_failed"
            )
          );
        }

        const finding =
          result.finding || null;

        setSelected(finding);

        setSelectedEvents(
          Array.isArray(
            result.events
          )
            ? result.events
            : []
        );

        setSelectedRetests(
          Array.isArray(
            result.retests
          )
            ? result.retests
            : []
        );

        if (
          finding?.has_screenshot
        ) {
          await loadScreenshot(
            finding.id
          );
        }
      } catch (
        detailError
      ) {
        setError(
          `${t(
            "findings.admin.detailFailed"
          )} ${
            detailError?.message
              ? `(${detailError.message})`
              : ""
          }`
        );
      } finally {
        setDetailLoading(false);
      }
    };


  const closeDetail =
    () => {
      revokeScreenshotUrl();

      setSelected(null);
      setSelectedEvents([]);
      setSelectedRetests([]);
      setScreenshotError("");
    };


  const applyFilters =
    (event) => {
      event.preventDefault();

      setOffset(0);

      setAppliedFilters({
        ...draftFilters,
      });
    };


  const resetFilters =
    () => {
      const clean =
        emptyFilters();

      setDraftFilters(clean);
      setAppliedFilters(clean);
      setOffset(0);
    };


  if (
    mode !== "admin"
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }


  const pageNumber =
    Math.floor(
      offset / LIMIT
    ) + 1;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total / LIMIT
      )
    );


  return (
    <>
      <PageHeader
        title={t(
          "findings.admin.title"
        )}
        subtitle={t(
          "findings.admin.subtitle"
        )}
      />

      <Notice kind="error">
        {error}
      </Notice>

      <Notice kind="info">
        {t(
          "findings.admin.readOnlyNotice"
        )}
      </Notice>

      <SectionCard
        title={t(
          "findings.admin.filters"
        )}
      >
        <form
          onSubmit={
            applyFilters
          }
        >
          <div
            style={gridStyle}
          >
            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.number"
                )}
              </label>

              <input
                value={
                  draftFilters.number
                }
                onChange={(
                  event
                ) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      number:
                        event.target.value,
                    })
                  )
                }
                placeholder="MVX-F-0001"
                style={fieldStyle}
              />
            </div>

            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.statusFilter"
                )}
              </label>

              <select
                value={
                  draftFilters.status
                }
                onChange={(
                  event
                ) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      status:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              >
                <option value="">
                  {t(
                    "findings.admin.allStatuses"
                  )}
                </option>

                {STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {t(
                        `findings.status.${status}`
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.typeFilter"
                )}
              </label>

              <select
                value={
                  draftFilters.type
                }
                onChange={(
                  event
                ) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      type:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              >
                <option value="">
                  {t(
                    "findings.admin.allTypes"
                  )}
                </option>

                {FINDING_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {t(
                        `findings.types.${type}`
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.tester"
                )}
              </label>

              <input
                value={
                  draftFilters.tester
                }
                maxLength={120}
                onChange={(
                  event
                ) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      tester:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </div>

            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.role"
                )}
              </label>

              <input
                value={
                  draftFilters.role
                }
                maxLength={64}
                onChange={(
                  event
                ) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      role:
                        event.target.value,
                    })
                  )
                }
                placeholder="resident"
                style={fieldStyle}
              />
            </div>

            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.route"
                )}
              </label>

              <input
                value={
                  draftFilters.route
                }
                maxLength={500}
                onChange={(
                  event
                ) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      route:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </div>

            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.version"
                )}
              </label>

              <input
                value={
                  draftFilters.version
                }
                maxLength={64}
                onChange={(
                  event
                ) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      version:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </div>

            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.blockingFilter"
                )}
              </label>

              <select
                value={
                  draftFilters.blocking
                }
                onChange={(
                  event
                ) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      blocking:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              >
                <option value="">
                  {t(
                    "findings.admin.allBlocking"
                  )}
                </option>

                <option value="1">
                  {t(
                    "findings.admin.blockingYes"
                  )}
                </option>

                <option value="0">
                  {t(
                    "findings.admin.blockingNo"
                  )}
                </option>
              </select>
            </div>

            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.from"
                )}
              </label>

              <input
                type="date"
                value={
                  draftFilters.from
                }
                onChange={(
                  event
                ) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      from:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </div>

            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.to"
                )}
              </label>

              <input
                type="date"
                value={
                  draftFilters.to
                }
                onChange={(
                  event
                ) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      to:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 16,
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              style={
                primaryButtonStyle
              }
            >
              {t(
                "findings.admin.applyFilters"
              )}
            </button>

            <button
              type="button"
              onClick={
                resetFilters
              }
              style={
                secondaryButtonStyle
              }
            >
              {t(
                "findings.admin.resetFilters"
              )}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title={t(
          "findings.admin.sectionTitle"
        )}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <strong>
            {t(
              "findings.admin.total"
            )}
            : {total}
          </strong>

          <div>
            {t(
              "findings.admin.page"
            )}{" "}
            {pageNumber} /{" "}
            {totalPages}
          </div>
        </div>

        {loading ? (
          <div>
            {t(
              "findings.admin.loading"
            )}
          </div>
        ) : findings.length ===
          0 ? (
          <div>
            {t(
              "findings.admin.noFindings"
            )}
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: 900,
              }}
            >
              <thead>
                <tr>
                  {[
                    "columnNumber",
                    "columnTitle",
                    "columnTester",
                    "columnType",
                    "columnStatus",
                    "columnBlocking",
                    "columnCreated",
                  ].map(
                    (key) => (
                      <th
                        key={key}
                        style={{
                          padding:
                            "9px 8px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid var(--border)",
                          fontSize:
                            12,
                        }}
                      >
                        {t(
                          `findings.admin.${key}`
                        )}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {findings.map(
                  (finding) => (
                    <tr
                      key={
                        finding.id
                      }
                    >
                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid var(--border)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            openFinding(
                              finding.id
                            )
                          }
                          style={{
                            border:
                              "none",
                            padding: 0,
                            background:
                              "transparent",
                            color:
                              "var(--accent, #2563eb)",
                            cursor:
                              "pointer",
                            fontWeight:
                              800,
                          }}
                        >
                          {
                            finding
                              .display_id
                          }
                        </button>
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid var(--border)",
                        }}
                      >
                        {
                          finding.title
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid var(--border)",
                        }}
                      >
                        {
                          finding
                            .author_nick ||
                          "—"
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid var(--border)",
                        }}
                      >
                        {t(
                          `findings.types.${finding.finding_type}`
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid var(--border)",
                        }}
                      >
                        <StatusChip
                          status={
                            finding.status
                          }
                          label={t(
                            `findings.status.${finding.status}`
                          )}
                        />
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid var(--border)",
                        }}
                      >
                        {finding.blocking
                          ? t(
                              "findings.admin.yes"
                            )
                          : t(
                              "findings.admin.no"
                            )}
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid var(--border)",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {formatDate(
                          finding.created_at,
                          language
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 8,
            marginTop: 14,
          }}
        >
          <button
            type="button"
            disabled={
              offset === 0 ||
              loading
            }
            onClick={() =>
              setOffset(
                Math.max(
                  0,
                  offset - LIMIT
                )
              )
            }
            style={{
              ...secondaryButtonStyle,
              opacity:
                offset === 0 ||
                loading
                  ? 0.5
                  : 1,
            }}
          >
            {t(
              "findings.admin.previous"
            )}
          </button>

          <button
            type="button"
            disabled={
              offset + LIMIT >=
                total ||
              loading
            }
            onClick={() =>
              setOffset(
                offset + LIMIT
              )
            }
            style={{
              ...secondaryButtonStyle,
              opacity:
                offset + LIMIT >=
                  total ||
                loading
                  ? 0.5
                  : 1,
            }}
          >
            {t(
              "findings.admin.next"
            )}
          </button>
        </div>
      </SectionCard>

      {detailLoading && (
        <SectionCard
          title={t(
            "findings.admin.detailTitle"
          )}
        >
          {t(
            "findings.admin.loading"
          )}
        </SectionCard>
      )}

      {!detailLoading &&
        selected && (
        <SectionCard
          title={`${t(
            "findings.admin.detailTitle"
          )} — ${
            selected.display_id
          }`}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              marginBottom: 10,
            }}
          >
            <button
              type="button"
              onClick={
                closeDetail
              }
              style={
                secondaryButtonStyle
              }
            >
              {t(
                "findings.admin.closeDetail"
              )}
            </button>
          </div>

          <div
            style={gridStyle}
          >
            <DetailRow
              label={t(
                "findings.admin.columnStatus"
              )}
            >
              <StatusChip
                status={
                  selected.status
                }
                label={t(
                  `findings.status.${selected.status}`
                )}
              />
            </DetailRow>

            <DetailRow
              label={t(
                "findings.admin.columnType"
              )}
            >
              {t(
                `findings.types.${selected.finding_type}`
              )}
            </DetailRow>

            <DetailRow
              label={t(
                "findings.admin.author"
              )}
            >
              {
                selected.author_nick ||
                "—"
              }
            </DetailRow>

            <DetailRow
              label={t(
                "findings.admin.authorRoles"
              )}
            >
              {Array.isArray(
                selected.author_roles
              ) &&
              selected.author_roles
                .length
                ? selected.author_roles
                    .join(", ")
                : "—"}
            </DetailRow>

            <DetailRow
              label={t(
                "findings.admin.authorMode"
              )}
            >
              {
                selected.author_mode ||
                "—"
              }
            </DetailRow>

            <DetailRow
              label={t(
                "findings.admin.route"
              )}
            >
              {
                selected.route ||
                "—"
              }
            </DetailRow>

            <DetailRow
              label={t(
                "findings.admin.blocking"
              )}
            >
              {selected.blocking
                ? t(
                    "findings.admin.yes"
                  )
                : t(
                    "findings.admin.no"
                  )}
            </DetailRow>

            <DetailRow
              label={t(
                "findings.admin.created"
              )}
            >
              {formatDate(
                selected.created_at,
                language
              )}
            </DetailRow>

            <DetailRow
              label={t(
                "findings.admin.updated"
              )}
            >
              {formatDate(
                selected.updated_at,
                language
              )}
            </DetailRow>
          </div>

          <DetailRow
            label={t(
              "findings.admin.steps"
            )}
          >
            {
              selected
                .reproduction_steps
            }
          </DetailRow>

          <DetailRow
            label={t(
              "findings.admin.expected"
            )}
          >
            {
              selected
                .expected_result
            }
          </DetailRow>

          <DetailRow
            label={t(
              "findings.admin.actual"
            )}
          >
            {
              selected
                .actual_result
            }
          </DetailRow>

          {selected
            .extra_explanation && (
            <DetailRow
              label={t(
                "findings.admin.explanation"
              )}
            >
              {
                selected
                  .extra_explanation
              }
            </DetailRow>
          )}

          {(selected
            .status_reason_code ||
            selected
              .status_reason_text) && (
            <DetailRow
              label={t(
                "findings.admin.reason"
              )}
            >
              {[
                selected
                  .status_reason_code,
                selected
                  .status_reason_text,
              ]
                .filter(Boolean)
                .join(" — ")}
            </DetailRow>
          )}

          <div
            style={{
              marginTop: 22,
            }}
          >
            <h3>
              {t(
                "findings.admin.implementation"
              )}
            </h3>

            <DetailRow
              label={t(
                "findings.admin.githubIssue"
              )}
            >
              {selected
                .github_issue_url ? (
                <a
                  href={
                    selected
                      .github_issue_url
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {
                    selected
                      .github_issue_url
                  }
                </a>
              ) : (
                "—"
              )}
            </DetailRow>

            <DetailRow
              label={t(
                "findings.admin.implementationRef"
              )}
            >
              {
                selected
                  .implementation_ref ||
                "—"
              }
            </DetailRow>
          </div>

          <div
            style={{
              marginTop: 22,
            }}
          >
            <h3>
              {t(
                "findings.admin.screenshot"
              )}
            </h3>

            {screenshotLoading && (
              <div>
                {t(
                  "findings.admin.loadingScreenshot"
                )}
              </div>
            )}

            {screenshotUrl && (
              <img
                src={
                  screenshotUrl
                }
                alt={
                  selected.display_id
                }
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: 600,
                  borderRadius: 10,
                  border:
                    "1px solid var(--border)",
                }}
              />
            )}

            {screenshotError && (
              <Notice kind="error">
                {t(
                  "findings.admin.screenshotUnavailable"
                )}{" "}
                ({screenshotError})
              </Notice>
            )}

            {!selected
              .has_screenshot &&
              !screenshotLoading && (
              <div>
                {t(
                  "findings.admin.noScreenshot"
                )}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 22,
            }}
          >
            <h3>
              {t(
                "findings.admin.history"
              )}
            </h3>

            {selectedEvents.length ===
              0 ? (
              <div>
                {t(
                  "findings.admin.noHistory"
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {selectedEvents.map(
                  (event) => (
                    <div
                      key={event.id}
                      style={{
                        padding: 11,
                        border:
                          "1px solid var(--border)",
                        borderRadius:
                          10,
                      }}
                    >
                      <strong>
                        {t(
                          `findings.event.${event.event_type}`
                        )}
                      </strong>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color:
                            "var(--text-muted, #64748b)",
                        }}
                      >
                        {formatDate(
                          event.created_at,
                          language
                        )}
                        {" · "}
                        {t(
                          "findings.admin.actor"
                        )}
                        :{" "}
                        {
                          event.actor_nick ||
                          "—"
                        }
                      </div>

                      {(event
                        .from_status ||
                        event
                          .to_status) && (
                        <div
                          style={{
                            marginTop: 6,
                          }}
                        >
                          {t(
                            "findings.admin.fromStatus"
                          )}
                          :{" "}
                          {
                            event
                              .from_status ||
                            "—"
                          }
                          {" · "}
                          {t(
                            "findings.admin.toStatus"
                          )}
                          :{" "}
                          {
                            event
                              .to_status ||
                            "—"
                          }
                        </div>
                      )}

                      {event
                        .reason_code && (
                        <div
                          style={{
                            marginTop: 6,
                          }}
                        >
                          {t(
                            "findings.admin.eventReason"
                          )}
                          :{" "}
                          {
                            event
                              .reason_code
                          }
                        </div>
                      )}

                      {event.comment && (
                        <div
                          style={{
                            marginTop: 6,
                            whiteSpace:
                              "pre-wrap",
                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {t(
                            "findings.admin.eventComment"
                          )}
                          :{" "}
                          {
                            event.comment
                          }
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 22,
            }}
          >
            <h3>
              {t(
                "findings.admin.retests"
              )}
            </h3>

            {selectedRetests.length ===
              0 ? (
              <div>
                {t(
                  "findings.admin.noRetests"
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {selectedRetests.map(
                  (retest) => (
                    <div
                      key={retest.id}
                      style={{
                        padding: 11,
                        border:
                          "1px solid var(--border)",
                        borderRadius:
                          10,
                      }}
                    >
                      <DetailRow
                        label={t(
                          "findings.admin.assignedTo"
                        )}
                      >
                        {
                          retest
                            .assigned_nick ||
                          "—"
                        }
                      </DetailRow>

                      <DetailRow
                        label={t(
                          "findings.admin.assignedBy"
                        )}
                      >
                        {
                          retest
                            .assigned_by_nick ||
                          "—"
                        }
                      </DetailRow>

                      <DetailRow
                        label={t(
                          "findings.admin.assignedAt"
                        )}
                      >
                        {formatDate(
                          retest
                            .assigned_at,
                          language
                        )}
                      </DetailRow>

                      <DetailRow
                        label={t(
                          "findings.admin.outcome"
                        )}
                      >
                        {
                          retest.outcome ||
                          "—"
                        }
                      </DetailRow>

                      <DetailRow
                        label={t(
                          "findings.admin.completedAt"
                        )}
                      >
                        {formatDate(
                          retest
                            .completed_at,
                          language
                        )}
                      </DetailRow>

                      <DetailRow
                        label={t(
                          "findings.admin.retestComment"
                        )}
                      >
                        {
                          retest.comment ||
                          "—"
                        }
                      </DetailRow>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 22,
              paddingTop: 12,
              borderTop:
                "1px solid var(--border)",
              fontSize: 12,
              color:
                "var(--text-muted, #64748b)",
              lineHeight: 1.6,
            }}
          >
            {t(
              "findings.admin.environment"
            )}
            :{" "}
            {
              selected.environment ||
              "—"
            }
            {" · "}
            {t(
              "findings.admin.language"
            )}
            :{" "}
            {
              selected.language ||
              "—"
            }

            <br />

            {t(
              "findings.admin.commit"
            )}
            :{" "}
            {
              selected
                .app_commit_sha ||
              "—"
            }

            <br />

            {t(
              "findings.admin.operatingSystem"
            )}
            :{" "}
            {
              selected
                .operating_system ||
              "—"
            }
            {" · "}
            {t(
              "findings.admin.screen"
            )}
            :{" "}
            {selected
              .screen_width &&
            selected
              .screen_height
              ? `${selected.screen_width} × ${selected.screen_height}`
              : "—"}

            <br />

            {t(
              "findings.admin.browser"
            )}
            :{" "}
            {
              selected.browser ||
              "—"
            }
          </div>
        </SectionCard>
      )}

      <div
        style={{
          marginBottom: 16,
          fontSize: 12,
          color:
            "var(--text-muted, #64748b)",
        }}
      >
        {t(
          "findings.testOnly"
        )}
      </div>
    </>
  );
}
