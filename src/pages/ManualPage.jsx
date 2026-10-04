import {
  useEffect,
  useMemo,
  useState,
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

import {
  searchManual,
} from "../manual/manualSearch";

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
    searchLabel:
      "Meklēt rokasgrāmatā",
    searchPlaceholder:
      "Aprakstiet, ko vēlaties atrast…",
    searchClear:
      "Notīrīt",
    searchResults:
      "Atrasti rezultāti",
    searchNone:
      "Nekas nav atrasts. Mēģiniet citus vārdus.",
    searchOpen:
      "Atvērt sadaļu",
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
    searchLabel:
      "Search the manual",
    searchPlaceholder:
      "Describe what you want to find…",
    searchClear:
      "Clear",
    searchResults:
      "Results found",
    searchNone:
      "No results found. Try different words.",
    searchOpen:
      "Open section",
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
    searchLabel:
      "Поиск по руководству",
    searchPlaceholder:
      "Опишите, что хотите найти…",
    searchClear:
      "Очистить",
    searchResults:
      "Найдено результатов",
    searchNone:
      "Ничего не найдено. Попробуйте другие слова.",
    searchOpen:
      "Открыть раздел",
  },
};


function escapeSearchRegExp(
  value
) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}

function highlightSearchText(
  value,
  terms
) {
  const source =
    String(value ?? "");

  const cleanedTerms = [
    ...new Set(
      (Array.isArray(terms)
        ? terms
        : []
      )
        .map((term) =>
          String(term).trim()
        )
        .filter(
          (term) =>
            term.length >= 2
        )
    ),
  ].sort(
    (left, right) =>
      right.length -
      left.length
  );

  if (
    cleanedTerms.length === 0
  ) {
    return source;
  }

  const pattern =
    cleanedTerms
      .map(
        escapeSearchRegExp
      )
      .join("|");

  const splitter =
    new RegExp(
      `(${pattern})`,
      "giu"
    );

  const exact =
    new RegExp(
      `^(?:${pattern})$`,
      "iu"
    );

  return source
    .split(splitter)
    .map(
      (part, index) =>
        exact.test(part)
          ? (
              <mark
                key={
                  `${part}-${index}`
                }
                className="manual-search-highlight"
              >
                {part}
              </mark>
            )
          : part
    );
}

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

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const searchResults =
    useMemo(
      () =>
        manualDocument
          ? searchManual({
              markdown:
                manualDocument.body,
              query:
                searchQuery,
              language,
              mode:
                manualMode,
              limit: 8,
            })
          : [],
      [
        language,
        manualDocument,
        manualMode,
        searchQuery,
      ]
    );

  useEffect(() => {
    setSearchQuery("");
  }, [
    language,
    manualMode,
  ]);

  const openSearchResult =
    (result) => {
      const targetId =
        result?.id;

      if (
        !/^manual-section-\d+(?:-\d+)?$/.test(
          String(targetId || "")
        )
      ) {
        return;
      }

      const url =
        new URL(
          window.location.href
        );

      url.hash = targetId;

      window.history
        .replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`
        );

      window
        .requestAnimationFrame(
          () => {
            document
              .querySelectorAll(
                ".manual-search-target"
              )
              .forEach(
                (element) =>
                  element
                    .classList
                    .remove(
                      "manual-search-target"
                    )
              );

            const target =
              document
                .getElementById(
                  targetId
                );

            if (!target) {
              return;
            }

            target.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });

            target
              .classList
              .add(
                "manual-search-target"
              );

            window.setTimeout(
              () => {
                target
                  .classList
                  .remove(
                    "manual-search-target"
                  );
              },
              1800
            );
          }
        );
    };

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


      {manualDocument && (
        <section
          className="manual-search-panel"
          aria-label={
            text.searchLabel
          }
        >
          <label
            className="manual-search-label"
          >
            <span>
              {text.searchLabel}
            </span>

            <div
              className="manual-search-row"
            >
              <input
                type="search"
                value={
                  searchQuery
                }
                onChange={
                  (event) =>
                    setSearchQuery(
                      event.target.value
                    )
                }
                placeholder={
                  text.searchPlaceholder
                }
                className="manual-search-input"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
              />

              {searchQuery && (
                <button
                  type="button"
                  className="manual-search-clear"
                  onClick={() =>
                    setSearchQuery("")
                  }
                >
                  {text.searchClear}
                </button>
              )}
            </div>
          </label>

          {searchQuery
            .trim()
            .length >= 2 && (
            <div
              className="manual-search-status"
              role="status"
              aria-live="polite"
            >
              {searchResults.length
                ? `${text.searchResults}: ${searchResults.length}`
                : text.searchNone}
            </div>
          )}

          {searchResults.length >
            0 && (
            <div
              className="manual-search-results"
            >
              {searchResults.map(
                (result) => (
                  <button
                    key={
                      result.id
                    }
                    type="button"
                    className="manual-search-result"
                    onClick={() =>
                      openSearchResult(
                        result
                      )
                    }
                  >
                    <span
                      className="manual-search-result-title"
                    >
                      {
                        highlightSearchText(
                          result.title,
                          result.terms
                        )
                      }
                    </span>

                    {result.snippet && (
                      <span
                        className="manual-search-result-snippet"
                      >
                        {
                          highlightSearchText(
                            result.snippet,
                            result.terms
                          )
                        }
                      </span>
                    )}

                    <span
                      className="manual-search-result-open"
                    >
                      {text.searchOpen}
                    </span>
                  </button>
                )
              )}
            </div>
          )}
        </section>
      )}

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
