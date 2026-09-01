import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  accountRecoveryReset,
} from "../api/auth";

import {
  buttonStyle,
  inputStyle,
} from "../styles/theme";

export default function AccountRecoveryPage() {
  const navigate =
    useNavigate();

  const [
    nick,
    setNick,
  ] = useState("");

  const [
    recoveryCode,
    setRecoveryCode,
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
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState(false);

  const submit =
    async () => {
      if (submitting) {
        return;
      }

      setError("");

      const normalizedNick =
        nick.trim();

      const normalizedCode =
        recoveryCode.trim();

      if (
        !normalizedNick ||
        !normalizedCode ||
        !newPassword ||
        !confirmPassword
      ) {
        setError(
          "Please complete all fields."
        );
        return;
      }

      if (
        newPassword.length < 8
      ) {
        setError(
          "The new password must contain at least 8 characters."
        );
        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setError(
          "The passwords do not match."
        );
        return;
      }

      setSubmitting(
        true
      );

      try {
        const result =
          await accountRecoveryReset(
            normalizedNick,
            normalizedCode,
            newPassword
          );

        if (
          result?.error ||
          result?.ok === false
        ) {
          throw new Error(
            result?.error ||
            "account_recovery_failed"
          );
        }

        setSuccess(
          true
        );

        setRecoveryCode(
          ""
        );

        setNewPassword(
          ""
        );

        setConfirmPassword(
          ""
        );
      } catch (
        recoveryError
      ) {
        console.error(
          "ACCOUNT RECOVERY ERROR:",
          recoveryError
        );

        setError(
          "The recovery request could not be completed. Check the Nick and Recovery Code and try again."
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  if (success) {
    return (
      <div
        style={
          pageStyle
        }
      >
        <div
          style={
            cardStyle
          }
        >
          <h1
            style={
              titleStyle
            }
          >
            <div
              style={{
                fontSize:
                  "0.8em",
              }}
            >
              MVX System
            </div>

            <div>
              DzĪKS IRLAVA 20
            </div>
          </h1>

          <h2
            style={
              sectionTitleStyle
            }
          >
            Password changed
          </h2>

          <div
            style={
              successStyle
            }
          >
            Your password has been changed successfully. Existing sessions have been closed.
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/login"
              )
            }
            style={
              buttonStyle
            }
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={
        pageStyle
      }
    >
      <div
        style={
          cardStyle
        }
      >
        <h1
          style={
            titleStyle
          }
        >
          <div
            style={{
              fontSize:
                "0.8em",
            }}
          >
            MVX System
          </div>

          <div>
            DzĪKS IRLAVA 20
          </div>
        </h1>

        <h2
          style={
            sectionTitleStyle
          }
        >
          Account recovery
        </h2>

        <p
          style={
            descriptionStyle
          }
        >
          Enter your Nick, the Recovery Code provided by the administrator, and a new password.
        </p>

        <label
          style={
            labelStyle
          }
        >
          Nick

          <input
            type="text"
            value={nick}
            onChange={
              (event) =>
                setNick(
                  event.target.value
                )
            }
            style={
              inputStyle
            }
            autoComplete=
              "username"
            autoCapitalize=
              "none"
            spellCheck={
              false
            }
            disabled={
              submitting
            }
          />
        </label>

        <label
          style={
            labelStyle
          }
        >
          Recovery Code

          <input
            type="text"
            value={
              recoveryCode
            }
            onChange={
              (event) =>
                setRecoveryCode(
                  event.target.value
                )
            }
            style={
              inputStyle
            }
            autoComplete=
              "one-time-code"
            autoCapitalize=
              "characters"
            spellCheck={
              false
            }
            disabled={
              submitting
            }
          />
        </label>

        <label
          style={
            labelStyle
          }
        >
          New password

          <input
            type="password"
            value={
              newPassword
            }
            onChange={
              (event) =>
                setNewPassword(
                  event.target.value
                )
            }
            style={
              inputStyle
            }
            autoComplete=
              "new-password"
            disabled={
              submitting
            }
          />
        </label>

        <label
          style={
            labelStyle
          }
        >
          Confirm new password

          <input
            type="password"
            value={
              confirmPassword
            }
            onChange={
              (event) =>
                setConfirmPassword(
                  event.target.value
                )
            }
            onKeyDown={
              (event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  submit();
                }
              }
            }
            style={
              inputStyle
            }
            autoComplete=
              "new-password"
            disabled={
              submitting
            }
          />
        </label>

        {error && (
          <div
            role="alert"
            style={
              errorStyle
            }
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={
            submit
          }
          disabled={
            submitting
          }
          style={{
            ...buttonStyle,
            opacity:
              submitting
                ? 0.65
                : 1,
            cursor:
              submitting
                ? "default"
                : "pointer",
          }}
        >
          {submitting
            ? "Changing password..."
            : "Change password"}
        </button>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/login"
            )
          }
          disabled={
            submitting
          }
          style={
            backButtonStyle
          }
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent:
    "center",
  alignItems: "center",
  padding: 20,
  boxSizing:
    "border-box",
};

const cardStyle = {
  width: "100%",
  maxWidth: 400,
  padding: 30,
  boxSizing:
    "border-box",
  border:
    "1px solid #ccc",
  borderRadius: 10,
};

const titleStyle = {
  lineHeight: 1.2,
  textAlign:
    "center",
};

const sectionTitleStyle = {
  marginTop: 24,
  marginBottom: 10,
  textAlign:
    "center",
  fontSize: 20,
};

const descriptionStyle = {
  margin:
    "0 0 18px",
  color:
    "var(--text)",
  fontSize: 12,
  lineHeight: 1.5,
  textAlign:
    "center",
};

const labelStyle = {
  display: "grid",
  gap: 5,
  marginBottom: 12,
  color:
    "var(--text-h)",
  fontSize: 11,
  fontWeight: 700,
};

const errorStyle = {
  marginBottom: 12,
  padding: 10,
  border:
    "1px solid #fecaca",
  borderRadius: 8,
  background:
    "#fef2f2",
  color:
    "#b91c1c",
  fontSize: 12,
  lineHeight: 1.45,
};

const successStyle = {
  marginBottom: 18,
  padding: 12,
  border:
    "1px solid #bbf7d0",
  borderRadius: 8,
  background:
    "#f0fdf4",
  color:
    "#166534",
  fontSize: 12,
  lineHeight: 1.5,
};

const backButtonStyle = {
  width: "100%",
  marginTop: 10,
  padding:
    "8px 12px",
  border:
    "1px solid var(--border)",
  borderRadius: 8,
  background:
    "var(--surface)",
  color:
    "var(--text-h)",
  fontWeight: 700,
  cursor: "pointer",
};
