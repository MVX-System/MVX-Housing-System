import {
  useState,
} from "react";

import {
  assignAdminTestFindingRetest,
  getAdminTestRoles,
  getAdminTestUserRoles,
  getAdminTestUsers,
} from "../api/findings";


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
  minHeight: 80,
  resize: "vertical",
};


const labelStyle = {
  display: "block",
  marginBottom: 5,
  fontSize: 12,
  fontWeight: 700,
  color:
    "var(--text-muted, #64748b)",
};


const buttonStyle = {
  border: "none",
  borderRadius: 9,
  padding: "9px 14px",
  background:
    "var(--accent, #2563eb)",
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


function activeRetestFrom(
  retests
) {

  if (
    !Array.isArray(
      retests
    )
  ) {
    return null;
  }

  return (
    retests.find(
      (retest) =>
        !retest?.completed_at
    ) ||
    null
  );
}


export default function AdminFindingRetestAssignment({
  finding,
  retests,
  t,
  onChanged,
}) {

  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    roles,
    setRoles,
  ] = useState([]);

  const [
    candidatesLoaded,
    setCandidatesLoaded,
  ] = useState(false);

  const [
    loadBusy,
    setLoadBusy,
  ] = useState(false);

  const [
    selectedUserId,
    setSelectedUserId,
  ] = useState("");

  const [
    roleCheck,
    setRoleCheck,
  ] = useState(null);

  const [
    roleBusy,
    setRoleBusy,
  ] = useState(false);

  const [
    comment,
    setComment,
  ] = useState("");

  const [
    assignBusy,
    setAssignBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  if (
    finding?.status !==
      "READY_FOR_RETEST"
  ) {
    return null;
  }


  const activeRetest =
    activeRetestFrom(
      retests
    );


  const activeUsers =
    users.filter(
      (user) =>
        Number(
          user?.is_active
        ) === 1
    );


  const currentRoleCheck =
    roleCheck &&
    String(
      roleCheck.userId
    ) ===
      String(
        selectedUserId
      )
      ? roleCheck
      : null;


  const loadCandidates =
    async () => {

      setLoadBusy(true);
      setError("");
      setSuccess("");

      try {

        const [
          usersResult,
          rolesResult,
        ] =
          await Promise.all([
            getAdminTestUsers(),
            getAdminTestRoles(),
          ]);

        if (
          !Array.isArray(
            usersResult
          )
        ) {
          throw new Error(
            apiError(
              usersResult,
              "users_load_failed"
            )
          );
        }

        if (
          !Array.isArray(
            rolesResult
          )
        ) {
          throw new Error(
            apiError(
              rolesResult,
              "roles_load_failed"
            )
          );
        }

        setUsers(
          usersResult
        );

        setRoles(
          rolesResult
        );

        setCandidatesLoaded(
          true
        );

      } catch (
        loadError
      ) {

        setError(
          `${t(
            "findings.admin.workflow.retestAssignment.operationFailed"
          )}: ${
            loadError?.message ||
            "retest_candidates_load_failed"
          }`
        );

      } finally {

        setLoadBusy(false);
      }
    };


  const checkUserRoles =
    async (
      userId
    ) => {

      setSelectedUserId(
        userId
      );

      setRoleCheck(
        null
      );

      setError("");
      setSuccess("");

      if (!userId) {
        return;
      }

      setRoleBusy(true);

      try {

        const result =
          await getAdminTestUserRoles(
            userId
          );

        if (
          !result ||
          !Array.isArray(
            result.roles
          )
        ) {
          throw new Error(
            apiError(
              result,
              "user_roles_load_failed"
            )
          );
        }

        const roleIds =
          new Set(
            result.roles
              .map(
                (value) =>
                  Number(
                    value
                  )
              )
              .filter(
                Number.isInteger
              )
          );

        const roleNames =
          roles
            .filter(
              (role) =>
                roleIds.has(
                  Number(
                    role.id
                  )
                )
            )
            .map(
              (role) =>
                String(
                  role.name ||
                  ""
                )
                  .trim()
                  .toLowerCase()
            )
            .filter(
              Boolean
            );

        const eligible =
          roleNames.includes(
            "resident"
          ) ||
          roleNames.includes(
            "owner"
          );

        setRoleCheck({
          userId:
            Number(
              userId
            ),

          roleNames,

          eligible,
        });

      } catch (
        roleError
      ) {

        setError(
          `${t(
            "findings.admin.workflow.retestAssignment.operationFailed"
          )}: ${
            roleError?.message ||
            "user_roles_load_failed"
          }`
        );

      } finally {

        setRoleBusy(false);
      }
    };


  const assignRetest =
    async () => {

      if (
        !selectedUserId ||
        !currentRoleCheck ||
        !currentRoleCheck
          .eligible
      ) {
        setError(
          t(
            "findings.admin.workflow.retestAssignment.notEligible"
          )
        );

        return;
      }

      const selectedUser =
        activeUsers.find(
          (user) =>
            String(
              user.id
            ) ===
              String(
                selectedUserId
              )
        );

      if (!selectedUser) {
        setError(
          t(
            "findings.admin.workflow.retestAssignment.notEligible"
          )
        );

        return;
      }

      setAssignBusy(true);
      setError("");
      setSuccess("");

      try {

        const result =
          await assignAdminTestFindingRetest({
            finding_id:
              finding.id,

            assigned_user_id:
              Number(
                selectedUserId
              ),

            comment:
              comment.trim() ||
              null,
          });

        if (!result?.ok) {
          throw new Error(
            apiError(
              result,
              "retest_assignment_failed"
            )
          );
        }

        setSuccess(
          t(
            "findings.admin.workflow.retestAssignment.assigned"
          )
        );

        setSelectedUserId("");
        setRoleCheck(null);
        setComment("");

        if (
          typeof onChanged ===
            "function"
        ) {
          await onChanged();
        }

      } catch (
        assignmentError
      ) {

        setError(
          `${t(
            "findings.admin.workflow.retestAssignment.operationFailed"
          )}: ${
            assignmentError
              ?.message ||
            "retest_assignment_failed"
          }`
        );

      } finally {

        setAssignBusy(false);
      }
    };


  return (
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
          "findings.admin.workflow.retestAssignment.title"
        )}
      </strong>

      <div
        style={{
          marginTop: 6,
          marginBottom: 12,
          fontSize: 13,
          color:
            "var(--text-muted, #64748b)",
        }}
      >
        {t(
          "findings.admin.workflow.retestAssignment.description"
        )}
      </div>

      {error && (
        <div
          style={{
            marginBottom: 10,
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
            marginBottom: 10,
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

      {activeRetest ? (
        <div
          style={{
            padding: 11,
            borderRadius: 9,
            background:
              "#eff6ff",
            color:
              "#1e40af",
          }}
        >
          <strong>
            {t(
              "findings.admin.workflow.retestAssignment.active"
            )}
          </strong>

          <div
            style={{
              marginTop: 5,
            }}
          >
            {t(
              "findings.admin.workflow.retestAssignment.assignedTo"
            )}
            :{" "}
            {
              activeRetest
                .assigned_nick ||
              "—"
            }
          </div>

          {activeRetest.comment && (
            <div
              style={{
                marginTop: 5,
                whiteSpace:
                  "pre-wrap",
              }}
            >
              {t(
                "findings.admin.workflow.retestAssignment.comment"
              )}
              :{" "}
              {
                activeRetest
                  .comment
              }
            </div>
          )}
        </div>
      ) : (
        <>
          {!candidatesLoaded ? (
            <button
              type="button"
              disabled={
                loadBusy
              }
              onClick={
                loadCandidates
              }
              style={{
                ...buttonStyle,
                opacity:
                  loadBusy
                    ? 0.5
                    : 1,
              }}
            >
              {loadBusy
                ? t(
                    "findings.admin.workflow.retestAssignment.loadingCandidates"
                  )
                : t(
                    "findings.admin.workflow.retestAssignment.loadCandidates"
                  )}
            </button>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  {t(
                    "findings.admin.workflow.retestAssignment.tester"
                  )}
                </label>

                <select
                  value={
                    selectedUserId
                  }
                  onChange={(
                    event
                  ) =>
                    checkUserRoles(
                      event
                        .target
                        .value
                    )
                  }
                  style={
                    fieldStyle
                  }
                >
                  <option value="">
                    —
                  </option>

                  {activeUsers.map(
                    (user) => (
                      <option
                        key={
                          user.id
                        }
                        value={
                          user.id
                        }
                      >
                        {
                          user.nick ||
                          `#${user.id}`
                        }
                        {" (#"}
                        {user.id}
                        {")"}
                      </option>
                    )
                  )}
                </select>
              </div>

              {roleBusy && (
                <div
                  style={{
                    fontSize: 13,
                    color:
                      "var(--text-muted, #64748b)",
                  }}
                >
                  {t(
                    "findings.admin.workflow.retestAssignment.checkingRoles"
                  )}
                </div>
              )}

              {currentRoleCheck && (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 9,
                    background:
                      currentRoleCheck
                        .eligible
                        ? "#dcfce7"
                        : "#fee2e2",
                    color:
                      currentRoleCheck
                        .eligible
                        ? "#166534"
                        : "#991b1b",
                  }}
                >
                  {currentRoleCheck
                    .eligible
                    ? t(
                        "findings.admin.workflow.retestAssignment.eligible"
                      )
                    : t(
                        "findings.admin.workflow.retestAssignment.notEligible"
                      )}

                  {currentRoleCheck
                    .roleNames
                    .length >
                    0 && (
                    <div
                      style={{
                        marginTop:
                          4,
                        fontSize:
                          12,
                      }}
                    >
                      {t(
                        "findings.admin.workflow.retestAssignment.roles"
                      )}
                      :{" "}
                      {currentRoleCheck
                        .roleNames
                        .join(
                          ", "
                        )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  {t(
                    "findings.admin.workflow.retestAssignment.comment"
                  )}
                </label>

                <textarea
                  value={
                    comment
                  }
                  maxLength={4000}
                  onChange={(
                    event
                  ) =>
                    setComment(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder={t(
                    "findings.admin.workflow.retestAssignment.commentPlaceholder"
                  )}
                  style={
                    textareaStyle
                  }
                />
              </div>

              <button
                type="button"
                disabled={
                  assignBusy ||
                  roleBusy ||
                  !selectedUserId ||
                  !currentRoleCheck
                    ?.eligible
                }
                onClick={
                  assignRetest
                }
                style={{
                  ...buttonStyle,
                  justifySelf:
                    "start",
                  opacity:
                    assignBusy ||
                    roleBusy ||
                    !selectedUserId ||
                    !currentRoleCheck
                      ?.eligible
                      ? 0.5
                      : 1,
                }}
              >
                {assignBusy
                  ? t(
                      "findings.admin.workflow.retestAssignment.assigning"
                    )
                  : t(
                      "findings.admin.workflow.retestAssignment.assign"
                    )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
