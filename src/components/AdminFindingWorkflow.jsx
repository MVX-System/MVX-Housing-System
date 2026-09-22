import {
  useState,
} from "react";

import AdminFindingRetestAssignment
  from "./AdminFindingRetestAssignment";

import {
  requestAdminTestFindingInfo,
  setAdminTestFindingStatus,
  updateAdminTestFindingImplementation,
} from "../api/findings";


const CLOSE_REASONS = [
  "duplicate",
  "expected_behaviour",
  "not_reproduced",
  "test_data_issue",
  "documentation_issue",
  "wont_fix",
];


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


const textareaStyle = {
  ...fieldStyle,
  minHeight: 90,
  resize: "vertical",
};


const labelStyle = {
  display: "block",
  marginBottom: 5,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-muted, #64748b)",
};


const buttonStyle = {
  border: "none",
  borderRadius: 9,
  padding: "9px 14px",
  background: "var(--accent, #2563eb)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};


function apiError(
  result,
  fallback
) {
  return (
    result?.error ||
    fallback
  );
}


function latestHoldResumeStatus(
  events
) {
  if (!Array.isArray(events)) {
    return null;
  }

  for (
    let index =
      events.length - 1;
    index >= 0;
    index -= 1
  ) {
    const event =
      events[index];

    if (
      event?.event_type ===
        "status_changed" &&
      event?.to_status ===
        "HOLD" &&
      event?.from_status
    ) {
      return event.from_status;
    }
  }

  return null;
}


function allowedTargets(
  finding,
  events
) {
  switch (
    finding?.status
  ) {
    case "NEW":
      return [
        "HOLD",
        "APPROVED",
        "CLOSED",
      ];

    case "NEEDS_INFO":
      return [
        "HOLD",
        "APPROVED",
        "CLOSED",
      ];

    case "HOLD": {
      const resume =
        latestHoldResumeStatus(
          events
        );

      return [
        ...(resume
          ? [resume]
          : []),
        "CLOSED",
      ];
    }

    case "APPROVED":
      return [
        "IN_PROGRESS",
        "HOLD",
        "CLOSED",
      ];

    case "IN_PROGRESS":
      return [
        "READY_FOR_RETEST",
        "HOLD",
        "CLOSED",
      ];

    case "READY_FOR_RETEST":
      return [
        "VERIFIED",
        "HOLD",
        "CLOSED",
      ];

    default:
      return [];
  }
}


function hasPassingLatestRetest(
  retests
) {
  if (
    !Array.isArray(retests) ||
    retests.length === 0
  ) {
    return false;
  }

  const latest =
    retests[
      retests.length - 1
    ];

  return (
    latest?.outcome ===
      "PASS" &&
    Boolean(
      latest?.completed_at
    )
  );
}


export default function AdminFindingWorkflow({
  finding,
  events,
  retests,
  t,
  onChanged,
}) {
  const [
    targetStatus,
    setTargetStatus,
  ] = useState("");

  const [
    statusComment,
    setStatusComment,
  ] = useState("");

  const [
    reasonText,
    setReasonText,
  ] = useState("");

  const [
    closeReason,
    setCloseReason,
  ] = useState("");

  const [
    infoRequest,
    setInfoRequest,
  ] = useState("");

  const [
    githubIssueUrl,
    setGithubIssueUrl,
  ] = useState(
    finding?.github_issue_url ||
    ""
  );

  const [
    implementationRef,
    setImplementationRef,
  ] = useState(
    finding?.implementation_ref ||
    ""
  );

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  const targets =
    allowedTargets(
      finding,
      events
    );

  const passingRetest =
    hasPassingLatestRetest(
      retests
    );

  const implementationChanged =
    String(
      githubIssueUrl || ""
    ).trim() !==
      String(
        finding
          ?.github_issue_url ||
        ""
      ).trim() ||
    String(
      implementationRef || ""
    ).trim() !==
      String(
        finding
          ?.implementation_ref ||
        ""
      ).trim();


  const runChanged =
    async () => {
      if (
        typeof onChanged ===
        "function"
      ) {
        await onChanged();
      }
    };


  const submitStatus =
    async () => {
      if (!targetStatus) {
        return;
      }

      if (
        targetStatus ===
          "HOLD" &&
        !reasonText.trim()
      ) {
        setError(
          t(
            "findings.admin.workflow.holdReasonRequired"
          )
        );

        return;
      }

      if (
        targetStatus ===
          "CLOSED" &&
        !closeReason
      ) {
        setError(
          t(
            "findings.admin.workflow.closeReasonRequired"
          )
        );

        return;
      }

      if (
        targetStatus ===
          "VERIFIED" &&
        !passingRetest
      ) {
        setError(
          t(
            "findings.admin.workflow.passRetestRequired"
          )
        );

        return;
      }

      setBusy(true);
      setError("");
      setSuccess("");

      try {
        const payload = {
          finding_id:
            finding.id,

          status:
            targetStatus,
        };

        const comment =
          statusComment.trim();

        if (comment) {
          payload.comment =
            comment;
        }

        if (
          targetStatus ===
          "HOLD"
        ) {
          payload.reason_text =
            reasonText.trim();
        }

        if (
          targetStatus ===
          "CLOSED"
        ) {
          payload.reason_code =
            closeReason;

          if (
            reasonText.trim()
          ) {
            payload.reason_text =
              reasonText.trim();
          }
        }

        const result =
          await setAdminTestFindingStatus(
            payload
          );

        if (!result?.ok) {
          throw new Error(
            apiError(
              result,
              "status_update_failed"
            )
          );
        }

        setSuccess(
          t(
            "findings.admin.workflow.statusUpdated"
          )
        );

        await runChanged();
      } catch (
        statusError
      ) {
        setError(
          `${t(
            "findings.admin.workflow.operationFailed"
          )}: ${
            statusError?.message ||
            "status_update_failed"
          }`
        );
      } finally {
        setBusy(false);
      }
    };


  const submitInfoRequest =
    async () => {
      const request =
        infoRequest.trim();

      if (!request) {
        setError(
          t(
            "findings.admin.workflow.infoRequired"
          )
        );

        return;
      }

      setBusy(true);
      setError("");
      setSuccess("");

      try {
        const result =
          await requestAdminTestFindingInfo({
            finding_id:
              finding.id,

            request,
          });

        if (!result?.ok) {
          throw new Error(
            apiError(
              result,
              "request_info_failed"
            )
          );
        }

        setSuccess(
          t(
            "findings.admin.workflow.infoRequested"
          )
        );

        await runChanged();
      } catch (
        infoError
      ) {
        setError(
          `${t(
            "findings.admin.workflow.operationFailed"
          )}: ${
            infoError?.message ||
            "request_info_failed"
          }`
        );
      } finally {
        setBusy(false);
      }
    };


  const saveImplementation =
    async () => {
      if (
        !implementationChanged
      ) {
        return;
      }

      setBusy(true);
      setError("");
      setSuccess("");

      try {
        const result =
          await updateAdminTestFindingImplementation({
            finding_id:
              finding.id,

            github_issue_url:
              githubIssueUrl
                .trim() ||
              null,

            implementation_ref:
              implementationRef
                .trim() ||
              null,
          });

        if (!result?.ok) {
          throw new Error(
            apiError(
              result,
              "implementation_update_failed"
            )
          );
        }

        setSuccess(
          t(
            "findings.admin.workflow.implementationSaved"
          )
        );

        await runChanged();
      } catch (
        implementationError
      ) {
        setError(
          `${t(
            "findings.admin.workflow.operationFailed"
          )}: ${
            implementationError
              ?.message ||
            "implementation_update_failed"
          }`
        );
      } finally {
        setBusy(false);
      }
    };


  return (
    <div
      style={{
        marginTop: 22,
        padding: 16,
        border:
          "1px solid var(--border)",
        borderRadius: 12,
      }}
    >
      <h3
        style={{
          marginTop: 0,
        }}
      >
        {t(
          "findings.admin.workflow.title"
        )}
      </h3>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 9,
            background:
              "#fee2e2",
            color:
              "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 9,
            background:
              "#dcfce7",
            color:
              "#166534",
          }}
        >
          {success}
        </div>
      )}

      {finding.status ===
        "NEW" && (
        <div
          style={{
            marginBottom: 20,
          }}
        >
          <strong>
            {t(
              "findings.admin.workflow.requestInfo"
            )}
          </strong>

          <textarea
            value={
              infoRequest
            }
            maxLength={8000}
            onChange={(
              event
            ) =>
              setInfoRequest(
                event.target.value
              )
            }
            placeholder={t(
              "findings.admin.workflow.infoPlaceholder"
            )}
            style={{
              ...textareaStyle,
              marginTop: 8,
            }}
          />

          <button
            type="button"
            disabled={
              busy ||
              !infoRequest.trim()
            }
            onClick={
              submitInfoRequest
            }
            style={{
              ...buttonStyle,
              marginTop: 8,
              opacity:
                busy ||
                !infoRequest.trim()
                  ? 0.5
                  : 1,
            }}
          >
            {t(
              "findings.admin.workflow.requestInfo"
            )}
          </button>
        </div>
      )}

      {targets.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <strong>
            {t(
              "findings.admin.workflow.changeStatus"
            )}
          </strong>

          <div>
            <label
              style={labelStyle}
            >
              {t(
                "findings.admin.workflow.targetStatus"
              )}
            </label>

            <select
              value={
                targetStatus
              }
              onChange={(
                event
              ) => {
                setTargetStatus(
                  event.target.value
                );

                setReasonText("");
                setCloseReason("");
              }}
              style={fieldStyle}
            >
              <option value="">
                —
              </option>

              {targets.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                    disabled={
                      status ===
                        "VERIFIED" &&
                      !passingRetest
                    }
                  >
                    {t(
                      `findings.status.${status}`
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          {targetStatus ===
            "VERIFIED" &&
            !passingRetest && (
            <div
              style={{
                fontSize: 13,
                color:
                  "#92400e",
              }}
            >
              {t(
                "findings.admin.workflow.passRetestRequired"
              )}
            </div>
          )}

          {targetStatus ===
            "HOLD" && (
            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.workflow.holdReason"
                )} *
              </label>

              <textarea
                value={
                  reasonText
                }
                maxLength={4000}
                onChange={(
                  event
                ) =>
                  setReasonText(
                    event.target.value
                  )
                }
                style={
                  textareaStyle
                }
              />
            </div>
          )}

          {targetStatus ===
            "CLOSED" && (
            <>
              <div>
                <label
                  style={labelStyle}
                >
                  {t(
                    "findings.admin.workflow.closeReason"
                  )} *
                </label>

                <select
                  value={
                    closeReason
                  }
                  onChange={(
                    event
                  ) =>
                    setCloseReason(
                      event.target.value
                    )
                  }
                  style={
                    fieldStyle
                  }
                >
                  <option value="">
                    —
                  </option>

                  {CLOSE_REASONS.map(
                    (
                      reason
                    ) => (
                      <option
                        key={
                          reason
                        }
                        value={
                          reason
                        }
                      >
                        {t(
                          `findings.admin.workflow.closeReasons.${reason}`
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
                    "findings.admin.workflow.reasonDetails"
                  )}
                </label>

                <textarea
                  value={
                    reasonText
                  }
                  maxLength={4000}
                  onChange={(
                    event
                  ) =>
                    setReasonText(
                      event.target.value
                    )
                  }
                  style={
                    textareaStyle
                  }
                />
              </div>
            </>
          )}

          {targetStatus && (
            <div>
              <label
                style={labelStyle}
              >
                {t(
                  "findings.admin.workflow.statusComment"
                )}
              </label>

              <textarea
                value={
                  statusComment
                }
                maxLength={4000}
                onChange={(
                  event
                ) =>
                  setStatusComment(
                    event.target.value
                  )
                }
                style={
                  textareaStyle
                }
              />
            </div>
          )}

          <button
            type="button"
            disabled={
              busy ||
              !targetStatus
            }
            onClick={
              submitStatus
            }
            style={{
              ...buttonStyle,
              justifySelf:
                "start",
              opacity:
                busy ||
                !targetStatus
                  ? 0.5
                  : 1,
            }}
          >
            {busy
              ? t(
                  "findings.admin.workflow.saving"
                )
              : t(
                  "findings.admin.workflow.apply"
                )}
          </button>
        </div>
      ) : (
        <div
          style={{
            marginBottom: 14,
            color:
              "var(--text-muted, #64748b)",
          }}
        >
          {t(
            "findings.admin.workflow.noStatusActions"
          )}
        </div>
      )}

      <AdminFindingRetestAssignment
        finding={finding}
        retests={retests}
        t={t}
        onChanged={
          onChanged
        }
      />

      <div
        style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop:
            "1px solid var(--border)",
        }}
      >
        <strong>
          {t(
            "findings.admin.workflow.implementationTitle"
          )}
        </strong>

        <div
          style={{
            display: "grid",
            gap: 10,
            marginTop: 10,
          }}
        >
          <div>
            <label
              style={labelStyle}
            >
              {t(
                "findings.admin.githubIssue"
              )}
            </label>

            <input
              value={
                githubIssueUrl
              }
              maxLength={2048}
              onChange={(
                event
              ) =>
                setGithubIssueUrl(
                  event.target.value
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
                "findings.admin.implementationRef"
              )}
            </label>

            <input
              value={
                implementationRef
              }
              maxLength={500}
              onChange={(
                event
              ) =>
                setImplementationRef(
                  event.target.value
                )
              }
              style={fieldStyle}
            />
          </div>

          <button
            type="button"
            disabled={
              busy ||
              !implementationChanged
            }
            onClick={
              saveImplementation
            }
            style={{
              ...buttonStyle,
              justifySelf:
                "start",
              opacity:
                busy ||
                !implementationChanged
                  ? 0.5
                  : 1,
            }}
          >
            {t(
              "findings.admin.workflow.saveImplementation"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
