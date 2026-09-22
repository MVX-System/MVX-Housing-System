import {
  useCallback,
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
  FINDING_SCREENSHOT_MAX_SIZE_BYTES,
  FINDING_SCREENSHOT_MIME_TYPES,
  FINDING_TYPES,
  addTestFindingInfo,
  createTestFinding,
  getMyTestFinding,
  getMyTestFindingScreenshot,
  getMyTestFindings,
  getMyTestRetests,
  readFindingScreenshotResponse,
  submitTestRetest,
  uploadTestFindingScreenshot,
} from "../api/findings";


const REPORT_ORIGIN_KEY =
  "mvx:test-finding-origin-route";


const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  border:
    "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  background:
    "var(--surface)",
  color:
    "var(--text)",
  font: "inherit",
};


const textareaStyle = {
  ...fieldStyle,
  minHeight: 110,
  resize: "vertical",
};


const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 700,
  color:
    "var(--text-h)",
};


const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};


const buttonStyle = {
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};


const primaryButtonStyle = {
  ...buttonStyle,
  background:
    "var(--accent, #2563eb)",
  color: "#fff",
};


const secondaryButtonStyle = {
  ...buttonStyle,
  background:
    "var(--surface)",
  color:
    "var(--text-h)",
  border:
    "1px solid var(--border)",
};


const dangerButtonStyle = {
  ...buttonStyle,
  background: "#b91c1c",
  color: "#fff",
};


const successButtonStyle = {
  ...buttonStyle,
  background: "#15803d",
  color: "#fff",
};


function initialRoute() {

  const stored =
    sessionStorage.getItem(
      REPORT_ORIGIN_KEY
    );

  if (
    stored &&
    stored.startsWith("/") &&
    stored !== "/findings"
  ) {
    return stored;
  }

  return "/";
}


function emptyForm() {

  return {
    finding_type:
      "bug",

    title:
      "",

    reproduction_steps:
      "",

    expected_result:
      "",

    actual_result:
      "",

    blocking:
      false,

    extra_explanation:
      "",

    route:
      initialRoute(),
  };
}


function messageWithId(
  template,
  id
) {

  return String(
    template || ""
  )
    .replace(
      "{id}",
      id || ""
    );
}


function apiError(
  result,
  fallback
) {

  return (
    result?.error ||
    fallback
  );
}


function formatDate(
  value,
  language
) {

  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(
      value
    );
  }

  const locale =
    language === "lv"
      ? "lv-LV"
      : language === "ru"
        ? "ru-RU"
        : "en-GB";

  return date.toLocaleString(
    locale
  );
}


function StatusChip({
  status,
  label,
}) {

  const palette = {
    NEW: [
      "#e0f2fe",
      "#075985",
    ],

    NEEDS_INFO: [
      "#fef3c7",
      "#92400e",
    ],

    HOLD: [
      "#f3f4f6",
      "#4b5563",
    ],

    APPROVED: [
      "#ede9fe",
      "#6d28d9",
    ],

    IN_PROGRESS: [
      "#dbeafe",
      "#1d4ed8",
    ],

    READY_FOR_RETEST: [
      "#cffafe",
      "#0e7490",
    ],

    VERIFIED: [
      "#dcfce7",
      "#15803d",
    ],

    CLOSED: [
      "#e5e7eb",
      "#374151",
    ],
  };

  const [
    background,
    color,
  ] =
    palette[status] ||
    palette.HOLD;

  return (
    <span
      style={{
        display:
          "inline-flex",

        alignItems:
          "center",

        borderRadius: 999,

        padding:
          "5px 10px",

        background,

        color,

        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {label}
    </span>
  );
}


function Notice({
  kind,
  children,
}) {

  if (!children) {
    return null;
  }

  const styles = {
    success: {
      background:
        "#dcfce7",
      border:
        "#86efac",
      color:
        "#166534",
    },

    warning: {
      background:
        "#fef3c7",
      border:
        "#fcd34d",
      color:
        "#92400e",
    },

    error: {
      background:
        "#fee2e2",
      border:
        "#fecaca",
      color:
        "#991b1b",
    },
  };

  const selected =
    styles[kind] ||
    styles.error;

  return (
    <div
      style={{
        marginBottom: 16,
        padding:
          "11px 13px",
        borderRadius: 10,
        border:
          `1px solid ${selected.border}`,
        background:
          selected.background,
        color:
          selected.color,
        lineHeight: 1.45,
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
        padding:
          "9px 0",
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
          whiteSpace:
            "pre-wrap",

          overflowWrap:
            "anywhere",

          color:
            "var(--text)",
        }}
      >
        {children ?? "—"}
      </div>
    </div>
  );
}


export default function FindingsPage() {

  const {
    mode,
  } = useMode();

  const {
    t,
    language,
  } = useTranslation();

  const [
    form,
    setForm,
  ] = useState(
    emptyForm
  );

  const [
    screenshotFile,
    setScreenshotFile,
  ] = useState(null);

  const [
    fileInputKey,
    setFileInputKey,
  ] = useState(0);

  const [
    findings,
    setFindings,
  ] = useState([]);

  const [
    retests,
    setRetests,
  ] = useState([]);

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
    loading,
    setLoading,
  ] = useState(true);

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    infoText,
    setInfoText,
  ] = useState("");

  const [
    infoBusy,
    setInfoBusy,
  ] = useState(false);

  const [
    retryScreenshotFile,
    setRetryScreenshotFile,
  ] = useState(null);

  const [
    screenshotBusy,
    setScreenshotBusy,
  ] = useState(false);

  const [
    screenshotLoading,
    setScreenshotLoading,
  ] = useState(false);

  const [
    screenshotUrl,
    setScreenshotUrl,
  ] = useState(null);

  const screenshotUrlRef =
    useRef(null);

  const [
    screenshotError,
    setScreenshotError,
  ] = useState("");

  const [
    retestComments,
    setRetestComments,
  ] = useState({});

  const [
    retestBusyId,
    setRetestBusyId,
  ] = useState(null);

  const [
    notice,
    setNotice,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");


  const clearScreenshotUrl =
    useCallback(() => {

      if (
        screenshotUrlRef
          .current
      ) {
        URL.revokeObjectURL(
          screenshotUrlRef
            .current
        );

        screenshotUrlRef
          .current =
          null;
      }

      setScreenshotUrl(
        null
      );

    }, []);


  useEffect(
    () =>
      clearScreenshotUrl,
    [
      clearScreenshotUrl,
    ]
  );


  const loadAll =
    useCallback(async () => {

      setLoading(true);
      setError("");

      try {

        const [
          findingsResult,
          retestsResult,
        ] =
          await Promise.all([
            getMyTestFindings(),
            getMyTestRetests(),
          ]);

        if (
          !findingsResult?.ok
        ) {
          throw new Error(
            apiError(
              findingsResult,
              "findings_load_failed"
            )
          );
        }

        if (
          !retestsResult?.ok
        ) {
          throw new Error(
            apiError(
              retestsResult,
              "retests_load_failed"
            )
          );
        }

        setFindings(
          Array.isArray(
            findingsResult
              .findings
          )
            ? findingsResult
                .findings
            : []
        );

        setRetests(
          Array.isArray(
            retestsResult
              .retests
          )
            ? retestsResult
                .retests
            : []
        );

      } catch (
        loadError
      ) {

        setError(
          `${t(
            "findings.messages.loadFailed"
          )} ${
            loadError?.message
              ? `(${loadError.message})`
              : ""
          }`
        );

      } finally {

        setLoading(false);
      }

    }, [
      t,
    ]);


  useEffect(() => {

    if (
      mode !== "resident"
    ) {
      return undefined;
    }

    const timerId =
      window.setTimeout(
        () => {
          loadAll();
        },
        0
      );

    return () => {
      window.clearTimeout(
        timerId
      );
    };

  }, [
    loadAll,
    mode,
  ]);


  const loadScreenshot =
    useCallback(
      async (
        findingId
      ) => {

        clearScreenshotUrl();
        setScreenshotError("");
        setScreenshotLoading(
          true
        );

        try {

          const response =
            await getMyTestFindingScreenshot(
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

          screenshotUrlRef
            .current =
            url;

          setScreenshotUrl(
            url
          );

        } catch (
          screenshotLoadError
        ) {

          setScreenshotError(
            screenshotLoadError
              ?.message ||
            "screenshot_load_failed"
          );

        } finally {

          setScreenshotLoading(
            false
          );
        }

      },
      [
        clearScreenshotUrl,
      ]
    );


  const openFinding =
    useCallback(
      async (
        findingId
      ) => {

        setDetailLoading(true);
        setError("");
        setInfoText("");
        setRetryScreenshotFile(
          null
        );
        clearScreenshotUrl();
        setScreenshotError("");

        try {

          const result =
            await getMyTestFinding(
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

          setSelected(
            result.finding ||
            null
          );

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
            result.finding
              ?.has_screenshot
          ) {
            await loadScreenshot(
              findingId
            );
          }

        } catch (
          detailError
        ) {

          setError(
            `${t(
              "findings.messages.operationFailed"
            )}: ${
              detailError
                ?.message ||
              "finding_load_failed"
            }`
          );

        } finally {

          setDetailLoading(
            false
          );
        }

      },
      [
        clearScreenshotUrl,
        loadScreenshot,
        t,
      ]
    );


  const refreshSelected =
    async () => {

      if (
        selected?.id
      ) {
        await openFinding(
          selected.id
        );
      }
    };


  const validateScreenshot =
    (
      file
    ) => {

      if (!file) {
        return true;
      }

      return (
        FINDING_SCREENSHOT_MIME_TYPES
          .includes(
            file.type
          ) &&
        file.size > 0 &&
        file.size <=
          FINDING_SCREENSHOT_MAX_SIZE_BYTES
      );
    };


  const handleSubmit =
    async (
      event
    ) => {

      event.preventDefault();

      setError("");
      setNotice(null);

      const required = [
        form.finding_type,
        form.title,
        form.reproduction_steps,
        form.expected_result,
        form.actual_result,
        form.route,
      ];

      if (
        required.some(
          (
            value
          ) =>
            !String(
              value || ""
            ).trim()
        )
      ) {
        setError(
          t(
            "findings.messages.requiredFields"
          )
        );

        return;
      }

      if (
        screenshotFile &&
        !validateScreenshot(
          screenshotFile
        )
      ) {
        setError(
          t(
            "findings.messages.invalidScreenshot"
          )
        );

        return;
      }

      setSubmitting(true);

      try {

        const result =
          await createTestFinding(
            {
              finding_type:
                form.finding_type,

              title:
                form.title
                  .trim(),

              reproduction_steps:
                form
                  .reproduction_steps
                  .trim(),

              expected_result:
                form
                  .expected_result
                  .trim(),

              actual_result:
                form
                  .actual_result
                  .trim(),

              blocking:
                Boolean(
                  form.blocking
                ),

              extra_explanation:
                form
                  .extra_explanation
                  .trim() ||
                null,
            },
            {
              authorMode:
                "resident",

              language,

              route:
                form.route
                  .trim(),
            }
          );

        if (
          !result?.ok ||
          !result.finding
            ?.id
        ) {
          throw new Error(
            apiError(
              result,
              "finding_create_failed"
            )
          );
        }

        const created =
          result.finding;

        let screenshotFailed =
          false;

        if (
          screenshotFile
        ) {

          const screenshotResult =
            await uploadTestFindingScreenshot(
              created.id,
              screenshotFile
            );

          if (
            !screenshotResult
              ?.ok
          ) {
            screenshotFailed =
              true;
          }
        }

        if (
          screenshotFile &&
          screenshotFailed
        ) {
          setNotice({
            kind:
              "warning",

            text:
              messageWithId(
                t(
                  "findings.messages.createdScreenshotFailed"
                ),
                created.display_id
              ),
          });

        } else if (
          screenshotFile
        ) {
          setNotice({
            kind:
              "success",

            text:
              messageWithId(
                t(
                  "findings.messages.createdWithScreenshot"
                ),
                created.display_id
              ),
          });

        } else {
          setNotice({
            kind:
              "success",

            text:
              messageWithId(
                t(
                  "findings.messages.created"
                ),
                created.display_id
              ),
          });
        }

        setForm(
          (
            previous
          ) => ({
            ...emptyForm(),

            route:
              previous.route,
          })
        );

        setScreenshotFile(
          null
        );

        setFileInputKey(
          (
            value
          ) =>
            value + 1
        );

        await loadAll();

        await openFinding(
          created.id
        );

      } catch (
        submitError
      ) {

        setError(
          `${t(
            "findings.messages.operationFailed"
          )}: ${
            submitError
              ?.message ||
            "finding_create_failed"
          }`
        );

      } finally {

        setSubmitting(false);
      }
    };


  const handleInfoSubmit =
    async () => {

      const information =
        infoText.trim();

      if (
        !selected?.id ||
        !information
      ) {
        return;
      }

      setInfoBusy(true);
      setError("");

      try {

        const result =
          await addTestFindingInfo({
            findingId:
              selected.id,

            information,
          });

        if (!result?.ok) {
          throw new Error(
            apiError(
              result,
              "finding_info_failed"
            )
          );
        }

        setNotice({
          kind:
            "success",

          text:
            t(
              "findings.messages.informationSent"
            ),
        });

        setInfoText("");

        await loadAll();
        await openFinding(
          selected.id
        );

      } catch (
        infoError
      ) {

        setError(
          `${t(
            "findings.messages.operationFailed"
          )}: ${
            infoError?.message ||
            "finding_info_failed"
          }`
        );

      } finally {

        setInfoBusy(false);
      }
    };


  const handleRetryScreenshot =
    async () => {

      if (
        !selected?.id ||
        !retryScreenshotFile
      ) {
        return;
      }

      if (
        !validateScreenshot(
          retryScreenshotFile
        )
      ) {
        setError(
          t(
            "findings.messages.invalidScreenshot"
          )
        );

        return;
      }

      setScreenshotBusy(
        true
      );

      setError("");

      try {

        const result =
          await uploadTestFindingScreenshot(
            selected.id,
            retryScreenshotFile
          );

        if (!result?.ok) {
          throw new Error(
            apiError(
              result,
              "screenshot_upload_failed"
            )
          );
        }

        setNotice({
          kind:
            "success",

          text:
            t(
              "findings.messages.screenshotUploaded"
            ),
        });

        setRetryScreenshotFile(
          null
        );

        await loadAll();
        await openFinding(
          selected.id
        );

      } catch (
        uploadError
      ) {

        setError(
          `${t(
            "findings.messages.operationFailed"
          )}: ${
            uploadError
              ?.message ||
            "screenshot_upload_failed"
          }`
        );

      } finally {

        setScreenshotBusy(
          false
        );
      }
    };


  const handleRetest =
    async (
      retest,
      outcome
    ) => {

      const comment =
        String(
          retestComments[
            retest.id
          ] ||
          ""
        ).trim();

      if (!comment) {
        return;
      }

      setRetestBusyId(
        retest.id
      );

      setError("");

      try {

        const result =
          await submitTestRetest({
            retestId:
              retest.id,

            outcome,

            comment,
          });

        if (!result?.ok) {
          throw new Error(
            apiError(
              result,
              "retest_submit_failed"
            )
          );
        }

        setNotice({
          kind:
            "success",

          text:
            outcome ===
              "PASS"
              ? t(
                  "findings.messages.retestPass"
                )
              : t(
                  "findings.messages.retestFail"
                ),
        });

        setRetestComments(
          (
            previous
          ) => ({
            ...previous,
            [retest.id]:
              "",
          })
        );

        await loadAll();
        await refreshSelected();

      } catch (
        retestError
      ) {

        setError(
          `${t(
            "findings.messages.operationFailed"
          )}: ${
            retestError
              ?.message ||
            "retest_submit_failed"
          }`
        );

      } finally {

        setRetestBusyId(
          null
        );
      }
    };


  if (
    mode !==
      "resident"
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }


  return (
    <>
      <PageHeader
        title={t(
          "findings.resident.title"
        )}
        subtitle={t(
          "findings.resident.subtitle"
        )}
      />

      <Notice
        kind={
          notice?.kind
        }
      >
        {notice?.text}
      </Notice>

      <Notice
        kind="error"
      >
        {error}
      </Notice>

      <SectionCard
        title={t(
          "findings.resident.newFinding"
        )}
      >
        <form
          onSubmit={
            handleSubmit
          }
        >
          <div
            style={{
              marginBottom: 14,
              fontSize: 13,
              color:
                "var(--text-muted, #64748b)",
            }}
          >
            {t(
              "findings.form.requiredHint"
            )}
          </div>

          <div
            style={gridStyle}
          >
            <div>
              <label
                style={
                  labelStyle
                }
              >
                {t(
                  "findings.form.type"
                )} *
              </label>

              <select
                value={
                  form.finding_type
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      previous
                    ) => ({
                      ...previous,

                      finding_type:
                        event
                          .target
                          .value,
                    })
                  )
                }
                style={
                  fieldStyle
                }
              >
                {FINDING_TYPES.map(
                  (
                    type
                  ) => (
                    <option
                      key={
                        type
                      }
                      value={
                        type
                      }
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
                style={
                  labelStyle
                }
              >
                {t(
                  "findings.form.route"
                )} *
              </label>

              <input
                value={
                  form.route
                }
                maxLength={
                  500
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      previous
                    ) => ({
                      ...previous,

                      route:
                        event
                          .target
                          .value,
                    })
                  )
                }
                style={
                  fieldStyle
                }
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
            }}
          >
            <label
              style={
                labelStyle
              }
            >
              {t(
                "findings.form.title"
              )} *
            </label>

            <input
              value={
                form.title
              }
              maxLength={
                240
              }
              onChange={(
                event
              ) =>
                setForm(
                  (
                    previous
                  ) => ({
                    ...previous,

                    title:
                      event
                        .target
                        .value,
                  })
                )
              }
              style={
                fieldStyle
              }
            />
          </div>

          {[
            [
              "reproduction_steps",
              "findings.form.reproductionSteps",
            ],
            [
              "expected_result",
              "findings.form.expectedResult",
            ],
            [
              "actual_result",
              "findings.form.actualResult",
            ],
          ].map(
            ([
              field,
              label,
            ]) => (
              <div
                key={
                  field
                }
                style={{
                  marginTop: 14,
                }}
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  {t(label)} *
                </label>

                <textarea
                  value={
                    form[field]
                  }
                  maxLength={
                    8000
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,

                        [field]:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  style={
                    textareaStyle
                  }
                />
              </div>
            )
          )}

          <div
            style={{
              marginTop: 14,
            }}
          >
            <label
              style={
                labelStyle
              }
            >
              {t(
                "findings.form.extraExplanation"
              )}
            </label>

            <textarea
              value={
                form
                  .extra_explanation
              }
              maxLength={
                8000
              }
              onChange={(
                event
              ) =>
                setForm(
                  (
                    previous
                  ) => ({
                    ...previous,

                    extra_explanation:
                      event
                        .target
                        .value,
                  })
                )
              }
              style={
                textareaStyle
              }
            />
          </div>

          <div
            style={{
              marginTop: 14,
            }}
          >
            <label
              style={{
                ...labelStyle,
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={
                  form.blocking
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      previous
                    ) => ({
                      ...previous,

                      blocking:
                        event
                          .target
                          .checked,
                    })
                  )
                }
              />

              {t(
                "findings.form.blocking"
              )}
            </label>
          </div>

          <div
            style={{
              marginTop: 14,
            }}
          >
            <label
              style={
                labelStyle
              }
            >
              {t(
                "findings.form.screenshot"
              )}
            </label>

            <input
              key={
                fileInputKey
              }
              type="file"
              accept={
                FINDING_SCREENSHOT_MIME_TYPES
                  .join(",")
              }
              onChange={(
                event
              ) =>
                setScreenshotFile(
                  event
                    .target
                    .files?.[0] ||
                  null
                )
              }
            />

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color:
                  "var(--text-muted, #64748b)",
              }}
            >
              {t(
                "findings.form.screenshotHint"
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
            }}
          >
            <button
              type="submit"
              disabled={
                submitting
              }
              style={{
                ...primaryButtonStyle,
                opacity:
                  submitting
                    ? 0.6
                    : 1,
              }}
            >
              {submitting
                ? t(
                    "findings.form.submitting"
                  )
                : t(
                    "findings.form.submit"
                  )}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title={t(
          "findings.resident.myFindings"
        )}
      >
        {loading ? (
          <div>
            {t(
              "findings.messages.loading"
            )}
          </div>
        ) : findings.length ===
          0 ? (
          <div>
            {t(
              "findings.resident.noFindings"
            )}
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",
              gap: 10,
            }}
          >
            {findings.map(
              (
                finding
              ) => (
                <button
                  key={
                    finding.id
                  }
                  type="button"
                  onClick={() =>
                    openFinding(
                      finding.id
                    )
                  }
                  style={{
                    width: "100%",
                    textAlign:
                      "left",
                    cursor:
                      "pointer",
                    border:
                      "1px solid var(--border)",
                    borderRadius:
                      12,
                    padding: 14,
                    background:
                      selected?.id ===
                      finding.id
                        ? "var(--surface-active, #eff6ff)"
                        : "var(--surface)",
                    color:
                      "var(--text)",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap: 12,
                      alignItems:
                        "flex-start",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize:
                            12,
                          fontWeight:
                            800,
                          color:
                            "var(--text-muted, #64748b)",
                        }}
                      >
                        {
                          finding
                            .display_id
                        }
                      </div>

                      <div
                        style={{
                          marginTop:
                            4,
                          fontWeight:
                            800,
                          color:
                            "var(--text-h)",
                        }}
                      >
                        {
                          finding
                            .title
                        }
                      </div>

                      <div
                        style={{
                          marginTop:
                            5,
                          fontSize:
                            12,
                          color:
                            "var(--text-muted, #64748b)",
                        }}
                      >
                        {t(
                          `findings.types.${finding.finding_type}`
                        )}
                        {" · "}
                        {formatDate(
                          finding
                            .created_at,
                          language
                        )}
                      </div>
                    </div>

                    <StatusChip
                      status={
                        finding
                          .status
                      }
                      label={t(
                        `findings.status.${finding.status}`
                      )}
                    />
                  </div>
                </button>
              )
            )}
          </div>
        )}
      </SectionCard>

      {detailLoading && (
        <SectionCard
          title={t(
            "findings.detail.title"
          )}
        >
          {t(
            "findings.messages.loading"
          )}
        </SectionCard>
      )}

      {!detailLoading &&
        selected && (
        <SectionCard
          title={`${t(
            "findings.detail.title"
          )} — ${
            selected
              .display_id
          }`}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "flex-end",
              marginBottom:
                10,
            }}
          >
            <button
              type="button"
              style={
                secondaryButtonStyle
              }
              onClick={() => {
                clearScreenshotUrl();
                setSelected(
                  null
                );
                setSelectedEvents(
                  []
                );
                setSelectedRetests(
                  []
                );
              }}
            >
              {t(
                "findings.detail.close"
              )}
            </button>
          </div>

          <div
            style={gridStyle}
          >
            <DetailRow
              label={t(
                "findings.detail.number"
              )}
            >
              {
                selected
                  .display_id
              }
            </DetailRow>

            <DetailRow
              label={t(
                "findings.detail.status"
              )}
            >
              <StatusChip
                status={
                  selected
                    .status
                }
                label={t(
                  `findings.status.${selected.status}`
                )}
              />
            </DetailRow>

            <DetailRow
              label={t(
                "findings.detail.type"
              )}
            >
              {t(
                `findings.types.${selected.finding_type}`
              )}
            </DetailRow>

            <DetailRow
              label={t(
                "findings.detail.created"
              )}
            >
              {formatDate(
                selected
                  .created_at,
                language
              )}
            </DetailRow>

            <DetailRow
              label={t(
                "findings.detail.route"
              )}
            >
              {
                selected.route ||
                "—"
              }
            </DetailRow>

            <DetailRow
              label={t(
                "findings.detail.blocking"
              )}
            >
              {selected.blocking
                ? t(
                    "findings.detail.yes"
                  )
                : t(
                    "findings.detail.no"
                  )}
            </DetailRow>
          </div>

          <DetailRow
            label={t(
              "findings.detail.steps"
            )}
          >
            {
              selected
                .reproduction_steps
            }
          </DetailRow>

          <DetailRow
            label={t(
              "findings.detail.expected"
            )}
          >
            {
              selected
                .expected_result
            }
          </DetailRow>

          <DetailRow
            label={t(
              "findings.detail.actual"
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
                "findings.detail.explanation"
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
                "findings.detail.reason"
              )}
            >
              {[
                selected
                  .status_reason_code,
                selected
                  .status_reason_text,
              ]
                .filter(
                  Boolean
                )
                .join(
                  " — "
                )}
            </DetailRow>
          )}

          <div
            style={{
              marginTop: 20,
            }}
          >
            <strong>
              {t(
                "findings.detail.screenshot"
              )}
            </strong>

            {screenshotLoading && (
              <div
                style={{
                  marginTop: 10,
                }}
              >
                {t(
                  "findings.detail.loadingScreenshot"
                )}
              </div>
            )}

            {screenshotUrl && (
              <div
                style={{
                  marginTop: 12,
                }}
              >
                <img
                  src={
                    screenshotUrl
                  }
                  alt={
                    selected
                      .display_id
                  }
                  style={{
                    display:
                      "block",
                    maxWidth:
                      "100%",
                    maxHeight:
                      520,
                    borderRadius:
                      10,
                    border:
                      "1px solid var(--border)",
                  }}
                />
              </div>
            )}

            {screenshotError && (
              <Notice
                kind="error"
              >
                {t(
                  "findings.detail.screenshotUnavailable"
                )}{" "}
                ({screenshotError})
              </Notice>
            )}

            {!selected
              .has_screenshot &&
              selected.status ===
                "NEW" && (
              <div
                style={{
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    marginBottom:
                      8,
                    color:
                      "var(--text-muted, #64748b)",
                  }}
                >
                  {t(
                    "findings.detail.noScreenshot"
                  )}
                </div>

                <input
                  type="file"
                  accept={
                    FINDING_SCREENSHOT_MIME_TYPES
                      .join(",")
                  }
                  onChange={(
                    event
                  ) =>
                    setRetryScreenshotFile(
                      event
                        .target
                        .files?.[0] ||
                      null
                    )
                  }
                />

                <div
                  style={{
                    marginTop:
                      10,
                  }}
                >
                  <button
                    type="button"
                    disabled={
                      screenshotBusy ||
                      !retryScreenshotFile
                    }
                    onClick={
                      handleRetryScreenshot
                    }
                    style={{
                      ...primaryButtonStyle,
                      opacity:
                        screenshotBusy ||
                        !retryScreenshotFile
                          ? 0.5
                          : 1,
                    }}
                  >
                    {t(
                      "findings.detail.uploadScreenshot"
                    )}
                  </button>
                </div>
              </div>
            )}

            {!selected
              .has_screenshot &&
              selected.status !==
                "NEW" && (
              <div
                style={{
                  marginTop: 10,
                  color:
                    "var(--text-muted, #64748b)",
                }}
              >
                {t(
                  "findings.detail.noScreenshot"
                )}
              </div>
            )}
          </div>

          {selected.status ===
            "NEEDS_INFO" && (
            <div
              style={{
                marginTop: 22,
                padding: 16,
                border:
                  "1px solid #fcd34d",
                background:
                  "#fffbeb",
                borderRadius:
                  12,
              }}
            >
              <strong
                style={{
                  color:
                    "#92400e",
                }}
              >
                {t(
                  "findings.info.title"
                )}
              </strong>

              <div
                style={{
                  marginTop: 6,
                  marginBottom:
                    10,
                  color:
                    "#92400e",
                }}
              >
                {t(
                  "findings.info.description"
                )}
              </div>

              <textarea
                value={
                  infoText
                }
                maxLength={
                  8000
                }
                placeholder={t(
                  "findings.info.placeholder"
                )}
                onChange={(
                  event
                ) =>
                  setInfoText(
                    event
                      .target
                      .value
                  )
                }
                style={
                  textareaStyle
                }
              />

              <button
                type="button"
                disabled={
                  infoBusy ||
                  !infoText.trim()
                }
                onClick={
                  handleInfoSubmit
                }
                style={{
                  ...primaryButtonStyle,
                  marginTop: 10,
                  opacity:
                    infoBusy ||
                    !infoText.trim()
                      ? 0.5
                      : 1,
                }}
              >
                {infoBusy
                  ? t(
                      "findings.info.sending"
                    )
                  : t(
                      "findings.info.submit"
                    )}
              </button>
            </div>
          )}

          <div
            style={{
              marginTop: 24,
            }}
          >
            <h3>
              {t(
                "findings.detail.history"
              )}
            </h3>

            {selectedEvents.length ===
              0 ? (
              <div>
                {t(
                  "findings.detail.noHistory"
                )}
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",
                  gap: 8,
                }}
              >
                {selectedEvents.map(
                  (
                    event
                  ) => (
                    <div
                      key={
                        event.id
                      }
                      style={{
                        border:
                          "1px solid var(--border)",
                        borderRadius:
                          10,
                        padding:
                          11,
                      }}
                    >
                      <strong>
                        {t(
                          `findings.event.${event.event_type}`
                        )}
                      </strong>

                      <div
                        style={{
                          marginTop:
                            4,
                          fontSize:
                            12,
                          color:
                            "var(--text-muted, #64748b)",
                        }}
                      >
                        {formatDate(
                          event
                            .created_at,
                          language
                        )}
                        {event
                          .actor_nick
                          ? ` · ${event.actor_nick}`
                          : ""}
                      </div>

                      {(event
                        .from_status ||
                        event
                          .to_status) && (
                        <div
                          style={{
                            marginTop:
                              5,
                          }}
                        >
                          {event
                            .from_status ||
                            "—"}
                          {" → "}
                          {event
                            .to_status ||
                            "—"}
                        </div>
                      )}

                      {event.comment && (
                        <div
                          style={{
                            marginTop:
                              6,
                            whiteSpace:
                              "pre-wrap",
                          }}
                        >
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
              marginTop: 24,
            }}
          >
            <h3>
              {t(
                "findings.detail.retestHistory"
              )}
            </h3>

            {selectedRetests.length ===
              0 ? (
              <div>
                {t(
                  "findings.detail.noRetestHistory"
                )}
              </div>
            ) : (
              selectedRetests.map(
                (
                  retest
                ) => (
                  <div
                    key={
                      retest.id
                    }
                    style={{
                      marginBottom:
                        8,
                      border:
                        "1px solid var(--border)",
                      borderRadius:
                        10,
                      padding:
                        11,
                    }}
                  >
                    <strong>
                      {retest.outcome ||
                        t(
                          "findings.retest.active"
                        )}
                    </strong>

                    <div
                      style={{
                        marginTop:
                          4,
                        fontSize:
                          12,
                        color:
                          "var(--text-muted, #64748b)",
                      }}
                    >
                      {t(
                        "findings.retest.assignedAt"
                      )}
                      :{" "}
                      {formatDate(
                        retest
                          .assigned_at,
                        language
                      )}
                    </div>

                    {retest.comment && (
                      <div
                        style={{
                          marginTop:
                            6,
                          whiteSpace:
                            "pre-wrap",
                        }}
                      >
                        {
                          retest.comment
                        }
                      </div>
                    )}
                  </div>
                )
              )
            )}
          </div>

          <div
            style={{
              marginTop: 24,
              paddingTop:
                12,
              borderTop:
                "1px solid var(--border)",
              fontSize: 12,
              color:
                "var(--text-muted, #64748b)",
            }}
          >
            {t(
              "findings.detail.environment"
            )}
            :{" "}
            {
              selected
                .environment
            }
            {" · "}
            {t(
              "findings.detail.language"
            )}
            :{" "}
            {
              selected
                .language
            }
            {" · "}
            {t(
              "findings.detail.commit"
            )}
            :{" "}
            {
              selected
                .app_commit_sha
            }

            <br />

            {t(
              "findings.detail.operatingSystem"
            )}
            :{" "}
            {
              selected
                .operating_system ||
              "—"
            }
            {" · "}
            {t(
              "findings.detail.screen"
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
              "findings.detail.browser"
            )}
            :{" "}
            {
              selected
                .browser ||
              "—"
            }
          </div>
        </SectionCard>
      )}

      <SectionCard
        title={t(
          "findings.resident.assignedRetests"
        )}
      >
        {loading ? (
          <div>
            {t(
              "findings.messages.loading"
            )}
          </div>
        ) : retests.length ===
          0 ? (
          <div>
            {t(
              "findings.resident.noRetests"
            )}
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",
              gap: 12,
            }}
          >
            {retests.map(
              (
                retest
              ) => (
                <div
                  key={
                    retest.id
                  }
                  style={{
                    border:
                      "1px solid var(--border)",
                    borderRadius:
                      12,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap: 12,
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <strong>
                        {
                          retest
                            .finding
                            ?.display_id
                        }
                        {" — "}
                        {
                          retest
                            .finding
                            ?.title
                        }
                      </strong>

                      <div
                        style={{
                          marginTop:
                            4,
                          fontSize:
                            12,
                          color:
                            "var(--text-muted, #64748b)",
                        }}
                      >
                        {t(
                          "findings.retest.assignedBy"
                        )}
                        :{" "}
                        {
                          retest
                            .assigned_by_nick ||
                          "—"
                        }
                        {" · "}
                        {formatDate(
                          retest
                            .assigned_at,
                          language
                        )}
                      </div>
                    </div>

                    <StatusChip
                      status={
                        retest
                          .finding
                          ?.status
                      }
                      label={t(
                        `findings.status.${retest.finding?.status}`
                      )}
                    />
                  </div>

                  {retest.active ? (
                    <>
                      <div
                        style={{
                          marginTop:
                            12,
                        }}
                      >
                        <label
                          style={
                            labelStyle
                          }
                        >
                          {t(
                            "findings.retest.comment"
                          )}
                        </label>

                        <textarea
                          value={
                            retestComments[
                              retest.id
                            ] ||
                            ""
                          }
                          maxLength={
                            8000
                          }
                          placeholder={t(
                            "findings.retest.commentPlaceholder"
                          )}
                          onChange={(
                            event
                          ) =>
                            setRetestComments(
                              (
                                previous
                              ) => ({
                                ...previous,

                                [retest.id]:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          style={
                            textareaStyle
                          }
                        />
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: 8,
                          marginTop:
                            10,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <button
                          type="button"
                          disabled={
                            retestBusyId ===
                              retest.id ||
                            !String(
                              retestComments[
                                retest.id
                              ] ||
                              ""
                            ).trim()
                          }
                          onClick={() =>
                            handleRetest(
                              retest,
                              "PASS"
                            )
                          }
                          style={
                            successButtonStyle
                          }
                        >
                          {t(
                            "findings.retest.pass"
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={
                            retestBusyId ===
                              retest.id ||
                            !String(
                              retestComments[
                                retest.id
                              ] ||
                              ""
                            ).trim()
                          }
                          onClick={() =>
                            handleRetest(
                              retest,
                              "FAIL"
                            )
                          }
                          style={
                            dangerButtonStyle
                          }
                        >
                          {t(
                            "findings.retest.fail"
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        marginTop:
                          10,
                      }}
                    >
                      <strong>
                        {t(
                          "findings.retest.result"
                        )}
                        :{" "}
                        {
                          retest.outcome
                        }
                      </strong>

                      {retest.comment && (
                        <div
                          style={{
                            marginTop:
                              5,
                            whiteSpace:
                              "pre-wrap",
                          }}
                        >
                          {
                            retest.comment
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </SectionCard>

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
