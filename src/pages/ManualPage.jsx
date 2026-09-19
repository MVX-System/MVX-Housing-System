import {
  useEffect,
} from "react";

import {
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import {
  useMode,
} from "../context/ModeContext";

import {
  useTranslation,
} from "../i18n";

import LanguageSelector
  from "../components/LanguageSelector";

import ManualMarkdown
  from "../manual/ManualMarkdown";

import {
  getManualDocument,
} from "../manual/manualDocuments";

const TEXT = {
  lv: {
    section: "Lietotāja rokasgrāmata",
    residentMode: "Iedzīvotāja režīms",
    adminMode: "Administratora režīms",
    version: "Versija",
    appliesTo: "Attiecas uz",
    close: "Aizvērt",
    unavailable:
      "Rokasgrāmata nav pieejama.",
  },
  en: {
    section: "User Manual",
    residentMode: "Resident Mode",
    adminMode: "Admin Mode",
    version: "Version",
    appliesTo: "Applies to",
    close: "Close",
    unavailable:
      "The manual is unavailable.",
  },
  ru: {
    section: "Руководство пользователя",
    residentMode: "Режим жильца",
    adminMode: "Режим администратора",
    version: "Версия",
    appliesTo: "Применимо к",
    close: "Закрыть",
    unavailable:
      "Руководство недоступно.",
  },
};

export default function ManualPage() {
  const {
    mode: activeMode,
  } = useMode();

  const {
    me,
  } = useAuth();

  const location =
    useLocation();

  const {
    language,
  } = useTranslation();

  const text =
    TEXT[language] || TEXT.en;

  const requestedMode =
    new URLSearchParams(
      location.search
    ).get("mode");

  const roles =
    Array.isArray(me?.roles)
      ? me.roles
      : [];

  const requestedModeAllowed =
    requestedMode === "admin"
      ? roles.includes("admin")
      : requestedMode ===
          "resident"
        ? roles.includes(
            "resident"
          ) ||
          roles.includes("owner")
        : false;

  const manualMode =
    requestedModeAllowed
      ? requestedMode
      : activeMode;

  const manualDocument =
    getManualDocument({
      mode: manualMode,
      language,
    });

  const modeLabel =
    manualMode === "admin"
      ? text.adminMode
      : text.residentMode;

  useEffect(() => {
    const targetId =
      location.hash.replace(
        /^#/,
        ""
      );

    if (
      !manualDocument ||
      !/^manual-section-\d+(?:-\d+)?$/.test(
        targetId
      )
    ) {
      return undefined;
    }

    const frame =
      window.requestAnimationFrame(
        () => {
          document
            .getElementById(
              targetId
            )
            ?.scrollIntoView({
              block: "start",
            });
        }
      );

    return () =>
      window.cancelAnimationFrame(
        frame
      );
  }, [
    language,
    location.hash,
    manualDocument,
  ]);

  useEffect(() => {
    const previousTitle =
      document.title;

    document.title =
      `${text.section} — MVX`;

    return () => {
      document.title =
        previousTitle;
    };
  }, [text.section]);

  return (
    <div
      className="manual-page"
    >
      <header
        className="manual-page-header"
      >
        <div>
          <div
            className="manual-page-section"
          >
            {text.section}
          </div>

          <div
            className="manual-page-mode"
          >
            {modeLabel}
          </div>
        </div>

        <div
          className="manual-page-actions"
        >
          <LanguageSelector
            variant="compact"
          />

          <button
            type="button"
            className="manual-close-button"
            onClick={() =>
              window.close()
            }
          >
            {text.close}
          </button>
        </div>
      </header>

      {!manualDocument && (
        <div
          className="manual-state"
          role="alert"
        >
          {text.unavailable}
        </div>
      )}

      {manualDocument && (
        <article
          className="manual-document"
        >
          <div
            className="manual-meta"
          >
            <span>
              <strong>
                {text.version}:
              </strong>{" "}
              {
                manualDocument.metadata
                  .version
              }
            </span>

            <span>
              <strong>
                {text.appliesTo}:
              </strong>{" "}
              {
                manualDocument.metadata
                  .applies_to
              }
            </span>
          </div>

          <div
            className="manual-markdown"
          >
            <ManualMarkdown
              markdown={
                manualDocument.body
              }
            />
          </div>
        </article>
      )}
    </div>
  );
}
