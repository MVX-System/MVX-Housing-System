import {
  Link,
  useParams,
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
  useTranslation,
} from "../i18n";

import LegalMarkdown
  from "../legal/LegalMarkdown";

import usePublicLegalDocument
  from "../legal/usePublicLegalDocument";

export default function PublicLegalDocumentPage() {
  const {
    documentSlug,
  } = useParams();

  const {
    facility,
    environment,
    loading: facilityLoading,
  } = useFacility();

  const {
    t,
  } = useTranslation();

  const {
    token,
    me,
  } = useAuth();

  const authenticated =
    Boolean(
      token &&
      me?.user
    );

  const backTarget =
    authenticated
      ? "/documents"
      : "/login";

  const backLabel =
    authenticated
      ? t(
          "documents.backToDocuments"
        )
      : t(
          "legal.backToLogin"
        );

  const {
    document,
    loading,
    error,
  } = usePublicLegalDocument(
    documentSlug
  );

  const facilityDisplayName =
    facilityLoading
      ? "..."
      : facility?.display_name ||
        t(
          "login.facilityFallback"
        );

  const environmentLabel =
    environment === "test"
      ? "TEST"
      : environment === "demo"
        ? "DEMO"
        : "";

  return (
    <div
      className="public-legal-page"
    >
      <div
        className="public-legal-shell"
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
              >
                {environmentLabel}
              </span>
            )}
          </div>

          <LanguageSelector
            variant="compact"
          />
        </header>

        <div
          className="public-legal-object"
        >
          {facilityDisplayName}
        </div>

        <div
          className="public-legal-toolbar"
        >
          <Link
            to={backTarget}
            className="public-legal-back"
          >
            {backLabel}
          </Link>
        </div>

        {loading && (
          <div
            className="public-legal-state"
            role="status"
          >
            {t(
              "legal.loading"
            )}
          </div>
        )}

        {!loading &&
          (error || !document) && (
            <div
              className="public-legal-state public-legal-state-error"
              role="alert"
            >
              {t(
                "legal.unavailable"
              )}
            </div>
          )}

        {!loading &&
          !error &&
          document && (
            <article
              className="public-legal-document"
            >
              <div
                className="public-legal-meta"
              >
                {document.metadata
                  .version && (
                  <span>
                    <strong>
                      {t(
                        "legal.version"
                      )}:
                    </strong>{" "}
                    {
                      document.metadata
                        .version
                    }
                  </span>
                )}

                {document.metadata
                  .last_reviewed && (
                  <span>
                    <strong>
                      {t(
                        "legal.lastReviewed"
                      )}:
                    </strong>{" "}
                    {
                      document.metadata
                        .last_reviewed
                    }
                  </span>
                )}
              </div>

              <div
                className="public-legal-markdown"
              >
                <LegalMarkdown
                  markdown={
                    document.body
                  }
                />
              </div>
            </article>
          )}
      </div>
    </div>
  );
}
