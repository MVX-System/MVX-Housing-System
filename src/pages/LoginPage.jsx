import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import { api } from "../services/api";

import {
  buttonStyle,
  inputStyle,
} from "../styles/theme";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();

  const navigate = useNavigate();

  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryHelpOpen, setRecoveryHelpOpen] = useState(false);
  const [publicContact, setPublicContact] = useState({
    support_email: "",
    support_phone: "",
  });

  useEffect(() => {
    let cancelled = false;

    const loadPublicContact = async () => {
      try {
        const result = await api(
          "/api/public/contact-settings"
        );

        if (
          cancelled ||
          !result ||
          result.error ||
          result.ok === false
        ) {
          return;
        }

        setPublicContact({
          support_email: String(
            result.support_email || ""
          ).trim(),
          support_phone: String(
            result.support_phone || ""
          ).trim(),
        });
      } catch (error) {
        console.error(
          "LOAD PUBLIC CONTACT SETTINGS ERROR:",
          error
        );
      }
    };

    loadPublicContact();

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    const ok = await login(nick, password);

    if (!ok) {
      return;
    }

    navigate("/");
  };

  const supportEmail = publicContact.support_email;
  const supportPhone = publicContact.support_phone;
  const supportPhoneHref = supportPhone.replace(
    /[^\d+]/g,
    ""
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 400,
          padding: 30,
          border: "1px solid #ccc",
          borderRadius: 10,
        }}
      >
        <h1
          style={{
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.8em" }}>
            MVX System
          </div>

          <div>DzĪKS IRLAVA 20</div>
        </h1>

        <input
          placeholder="Nick"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          style={inputStyle}
          autoComplete="username"
        />

        <input
          type="password"
          placeholder={t("login.placeholders.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submit();
            }
          }}
        />

        <button
          onClick={submit}
          style={buttonStyle}
        >
          {t("login.login")}
        </button>

        <button
          type="button"
          onClick={() =>
            setRecoveryHelpOpen(true)
          }
          style={{
            width: "100%",
            marginTop: 10,
            padding: "8px 12px",
            border: "none",
            background: "none",
            color: "#2563eb",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("login.forgotCredentials")}
        </button>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/account-recovery"
            )
          }
          style={{
            width: "100%",
            padding: "6px 12px 8px",
            border: "none",
            background: "none",
            color: "#2563eb",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t("login.haveRecoveryCode")}
        </button>
      </div>

      {recoveryHelpOpen && (
        <div
          role="presentation"
          onClick={() =>
            setRecoveryHelpOpen(false)
          }
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(15, 23, 42, 0.45)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-help-title"
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: 420,
              padding: 24,
              borderRadius: 12,
              background: "var(--surface, #fff)",
              border:
                "1px solid var(--border, #d1d5db)",
              boxShadow:
                "0 20px 50px rgba(15, 23, 42, 0.22)",
            }}
          >
            <h2
              id="recovery-help-title"
              style={{
                margin: 0,
                color: "var(--text-h, #111827)",
                fontSize: 20,
              }}
            >
              {t("login.help.title")}
            </h2>

            <p
              style={{
                margin: "12px 0 18px",
                color: "var(--text, #4b5563)",
                lineHeight: 1.5,
              }}
            >
              {t("login.help.message")}
            </p>

            {(supportEmail || supportPhone) && (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 14,
                  borderRadius: 10,
                  background:
                    "var(--surface-soft, #f8fafc)",
                }}
              >
                {supportEmail && (
                  <div>
                    <strong>
                      {t("login.help.email")}:
                    </strong>{" "}
                    <a
                      href={`mailto:${supportEmail}`}
                      style={{
                        color: "#2563eb",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      {supportEmail}
                    </a>
                  </div>
                )}

                {supportPhone && (
                  <div>
                    <strong>
                      {t("login.help.phone")}:
                    </strong>{" "}
                    <a
                      href={`tel:${supportPhoneHref}`}
                      style={{
                        color: "#2563eb",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      {supportPhone}
                    </a>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setRecoveryHelpOpen(false)
              }
              style={{
                ...buttonStyle,
                marginTop: 18,
              }}
            >
              {t("login.help.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
