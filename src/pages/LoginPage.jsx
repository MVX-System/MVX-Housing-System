import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import LanguageSelector
  from "../components/LanguageSelector";

import {
  useAuth,
} from "../context/AuthContext";

import {
  useFacility,
} from "../context/FacilityContext";

import {
  usePublicContact,
} from "../context/PublicContactContext";

import {
  useTranslation,
} from "../i18n";

import {
  buttonStyle,
  inputStyle,
  loginCard,
} from "../styles/theme";

export default function LoginPage() {
  const {
    login,
  } = useAuth();

  const {
    facility,
    environment,
    loading: facilityLoading,
  } = useFacility();

  const {
    t,
  } = useTranslation();

  const navigate =
    useNavigate();

  const [
    nick,
    setNick,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    recoveryHelpOpen,
    setRecoveryHelpOpen,
  ] = useState(false);

  const [
    contactDetailsOpen,
    setContactDetailsOpen,
  ] = useState(
    () =>
      typeof window === "undefined" ||
      typeof window.matchMedia !==
        "function" ||
      !window
        .matchMedia(
          "(max-width: 800px)"
        )
        .matches
  );

  const [
    legalDetailsOpen,
    setLegalDetailsOpen,
  ] = useState(
    () =>
      typeof window === "undefined" ||
      typeof window.matchMedia !==
        "function" ||
      !window
        .matchMedia(
          "(max-width: 800px)"
        )
        .matches
  );

  const {
    publicContact,
    refreshPublicContact,
  } = usePublicContact();

  useEffect(() => {
    refreshPublicContact();
  }, [refreshPublicContact]);

  const submit =
    async () => {
      const ok =
        await login(
          nick,
          password
        );

      if (!ok) {
        return;
      }

      navigate("/");
    };

  const facilityDisplayName =
    facilityLoading
      ? "..."
      : facility?.display_name ||
        t(
          "login.facilityFallback"
        );

  const facilityAddress =
    [
      facility?.address_line,
      facility?.city,
      facility?.postal_code,
      facility?.country,
    ]
      .map(
        (value) =>
          typeof value === "string"
            ? value.trim()
            : ""
      )
      .filter(Boolean)
      .join(", ");

  const supportEmail =
    publicContact.support_email;

  const supportPhone =
    publicContact.support_phone;

  const supportPhoneHref =
    supportPhone.replace(
      /[^\d+]/g,
      ""
    );

  const environmentLabel =
    environment === "test"
      ? "TEST"
      : environment === "demo"
        ? "DEMO"
        : "";

  return (
    <div
      className="public-login-page"
    >
      <div
        className="public-login-shell"
      >
        <header
          className="public-login-topbar"
        >
          <div
            className="public-login-brand-row"
          >
            <div
              className="public-login-brand"
            >
              MVX System
            </div>

            {environmentLabel && (
              <span
                className="public-login-environment"
                aria-label={
                  `${environmentLabel} environment`
                }
              >
                {environmentLabel}
              </span>
            )}
          </div>

          <LanguageSelector
            variant="compact"
          />
        </header>

        <main
          className="public-login-grid"
        >
          <section
            className="public-login-identity"
            aria-labelledby=
              "public-login-facility-title"
          >
            <div
              className="public-login-kicker"
            >
              MVX System
            </div>

            <h1
              id="public-login-facility-title"
            >
              {facilityDisplayName}
            </h1>

            <p
              className="public-login-description"
            >
              {t(
                "login.landing.description"
              )}
            </p>
          </section>

          <section
            className="public-login-card"
            style={{
              ...loginCard,
              maxWidth: "none",
              boxSizing:
                "border-box",
            }}
            aria-labelledby=
              "public-login-form-title"
          >
            <h2
              id="public-login-form-title"
              className="public-login-form-title"
            >
              {t(
                "login.form.title"
              )}
            </h2>

            <label
              className="public-login-field"
            >
              <span>
                {t("login.nick")}
              </span>

              <input
                type="text"
                placeholder={
                  t("login.nick")
                }
                value={nick}
                onChange={
                  (event) =>
                    setNick(
                      event.target.value
                    )
                }
                style={inputStyle}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>

            <label
              className="public-login-field"
            >
              <span>
                {t("login.password")}
              </span>

              <input
                type="password"
                placeholder={
                  t(
                    "login.placeholders.password"
                  )
                }
                value={password}
                onChange={
                  (event) =>
                    setPassword(
                      event.target.value
                    )
                }
                style={inputStyle}
                autoComplete=
                  "current-password"
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
              />
            </label>

            <button
              type="button"
              onClick={submit}
              style={buttonStyle}
            >
              {t("login.login")}
            </button>

            <button
              type="button"
              onClick={() =>
                setRecoveryHelpOpen(
                  true
                )
              }
              className=
                "public-login-link-button public-login-link-button-primary"
            >
              {t(
                "login.forgotCredentials"
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account-recovery"
                )
              }
              className=
                "public-login-link-button"
            >
              {t(
                "login.haveRecoveryCode"
              )}
            </button>
          </section>

          <section
            className="public-login-details"
          >
            <div
              className="public-login-disclosure"
            >
              <button
                type="button"
                className="public-login-disclosure-button"
                aria-expanded={
                  contactDetailsOpen
                }
                aria-controls=
                  "public-login-contact-details"
                onClick={() =>
                  setContactDetailsOpen(
                    (current) =>
                      !current
                  )
                }
              >
                <span>
                  {t(
                    "login.landing.addressAndContacts"
                  )}
                </span>

                <span
                  className={
                    `public-login-disclosure-chevron${
                      contactDetailsOpen
                        ? " is-open"
                        : ""
                    }`
                  }
                  aria-hidden="true"
                >
                  ⌄
                </span>
              </button>

              <div
                id="public-login-contact-details"
                className={
                  `public-login-disclosure-content${
                    contactDetailsOpen
                      ? " is-open"
                      : ""
                  }`
                }
                aria-hidden={
                  !contactDetailsOpen
                }
                inert={
                  !contactDetailsOpen
                }
              >
                <div
                  className="public-login-disclosure-overflow"
                >
                  <div
                    className="public-login-disclosure-body"
                  >
                    {facilityAddress && (
                      <div
                        className="public-login-info-block"
                      >
                        <div
                          className="public-login-info-label"
                        >
                          {t(
                            "login.landing.address"
                          )}
                        </div>

                        <div
                          className="public-login-info-value"
                        >
                          {facilityAddress}
                        </div>
                      </div>
                    )}

                    {(supportEmail ||
                      supportPhone) && (
                      <div
                        className="public-login-info-block"
                      >
                        <div
                          className="public-login-info-label"
                        >
                          {t(
                            "login.landing.contacts"
                          )}
                        </div>

                        <div
                          className="public-login-contact-list"
                        >
                          {supportEmail && (
                            <div>
                              <span>
                                {t(
                                  "login.landing.email"
                                )}:
                              </span>{" "}

                              <a
                                href={
                                  `mailto:${supportEmail}`
                                }
                              >
                                {supportEmail}
                              </a>
                            </div>
                          )}

                          {supportPhone && (
                            <div>
                              <span>
                                {t(
                                  "login.landing.phone"
                                )}:
                              </span>{" "}

                              <a
                                href={
                                  `tel:${supportPhoneHref}`
                                }
                              >
                                {supportPhone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="public-login-disclosure"
            >
              <button
                type="button"
                className="public-login-disclosure-button"
                aria-expanded={
                  legalDetailsOpen
                }
                aria-controls=
                  "public-login-legal-details"
                onClick={() =>
                  setLegalDetailsOpen(
                    (current) =>
                      !current
                  )
                }
              >
                <span>
                  {t(
                    "legal.links.title"
                  )}
                </span>

                <span
                  className={
                    `public-login-disclosure-chevron${
                      legalDetailsOpen
                        ? " is-open"
                        : ""
                    }`
                  }
                  aria-hidden="true"
                >
                  ⌄
                </span>
              </button>

              <div
                id="public-login-legal-details"
                className={
                  `public-login-disclosure-content${
                    legalDetailsOpen
                      ? " is-open"
                      : ""
                  }`
                }
                aria-hidden={
                  !legalDetailsOpen
                }
                inert={
                  !legalDetailsOpen
                }
              >
                <div
                  className="public-login-disclosure-overflow"
                >
                  <div
                    className="public-login-disclosure-body"
                  >
                    <nav
                      className="public-login-legal"
                      aria-label={
                        t(
                          "legal.links.title"
                        )
                      }
                    >
                      <div
                        className="public-login-legal-links"
                      >
                        <Link
                          to="/documents/privacy-notice"
                        >
                          {t(
                            "legal.links.privacyNotice"
                          )}
                        </Link>

                        <Link
                          to="/documents/device-storage-notice"
                        >
                          {t(
                            "legal.links.deviceStorageNotice"
                          )}
                        </Link>

                        <Link
                          to="/documents/operator-information"
                        >
                          {t(
                            "legal.links.operatorInformation"
                          )}
                        </Link>

                        <Link
                          to="/documents/user-rules"
                        >
                          {t(
                            "legal.links.userRules"
                          )}
                        </Link>
                      </div>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {recoveryHelpOpen && (
        <div
          role="presentation"
          onClick={() =>
            setRecoveryHelpOpen(
              false
            )
          }
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            padding: 20,
            background:
              "rgba(15, 23, 42, 0.45)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby=
              "recovery-help-title"
            onClick={
              (event) =>
                event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: 420,
              padding: 24,
              borderRadius: 12,
              background:
                "var(--surface, #fff)",
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
                color:
                  "var(--text-h, #111827)",
                fontSize: 20,
              }}
            >
              {t(
                "login.help.title"
              )}
            </h2>

            <p
              style={{
                margin:
                  "12px 0 18px",
                color:
                  "var(--text, #4b5563)",
                lineHeight: 1.5,
              }}
            >
              {t(
                "login.help.message"
              )}
            </p>

            {(supportEmail ||
              supportPhone) && (
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
                      {t(
                        "login.help.email"
                      )}:
                    </strong>{" "}

                    <a
                      href={
                        `mailto:${supportEmail}`
                      }
                      style={{
                        color:
                          "var(--accent, #2563eb)",
                        fontWeight: 700,
                        textDecoration:
                          "none",
                      }}
                    >
                      {supportEmail}
                    </a>
                  </div>
                )}

                {supportPhone && (
                  <div>
                    <strong>
                      {t(
                        "login.help.phone"
                      )}:
                    </strong>{" "}

                    <a
                      href={
                        `tel:${supportPhoneHref}`
                      }
                      style={{
                        color:
                          "var(--accent, #2563eb)",
                        fontWeight: 700,
                        textDecoration:
                          "none",
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
                setRecoveryHelpOpen(
                  false
                )
              }
              style={{
                ...buttonStyle,
                marginTop: 18,
              }}
            >
              {t(
                "login.help.close"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
