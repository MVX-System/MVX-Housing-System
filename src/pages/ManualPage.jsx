import {
  useMode,
} from "../context/ModeContext";

import {
  useTranslation,
} from "../i18n";

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
    unavailable:
      "Rokasgrāmata nav pieejama.",
  },
  en: {
    section: "User Manual",
    residentMode: "Resident Mode",
    adminMode: "Admin Mode",
    version: "Version",
    appliesTo: "Applies to",
    unavailable:
      "The manual is unavailable.",
  },
  ru: {
    section: "Руководство пользователя",
    residentMode: "Режим жильца",
    adminMode: "Режим администратора",
    version: "Версия",
    appliesTo: "Применимо к",
    unavailable:
      "Руководство недоступно.",
  },
};

export default function ManualPage() {
  const {
    mode,
  } = useMode();

  const {
    language,
  } = useTranslation();

  const text =
    TEXT[language] || TEXT.en;

  const document =
    getManualDocument({
      mode,
      language,
    });

  const modeLabel =
    mode === "admin"
      ? text.adminMode
      : text.residentMode;

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
      </header>

      {!document && (
        <div
          className="manual-state"
          role="alert"
        >
          {text.unavailable}
        </div>
      )}

      {document && (
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
                document.metadata
                  .version
              }
            </span>

            <span>
              <strong>
                {text.appliesTo}:
              </strong>{" "}
              {
                document.metadata
                  .applies_to
              }
            </span>
          </div>

          <div
            className="manual-markdown"
          >
            <ManualMarkdown
              markdown={
                document.body
              }
            />
          </div>
        </article>
      )}
    </div>
  );
}
