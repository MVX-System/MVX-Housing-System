import {
  Link,
} from "react-router-dom";

import {
  useTranslation,
} from "../i18n";

import {
  cardStyle,
} from "../styles/theme";

const LEGAL_DOCUMENTS = [
  {
    slug: "privacy-notice",
    labelKey:
      "legal.links.privacyNotice",
  },
  {
    slug:
      "device-storage-notice",
    labelKey:
      "legal.links.deviceStorageNotice",
  },
  {
    slug:
      "operator-information",
    labelKey:
      "legal.links.operatorInformation",
  },
  {
    slug: "user-rules",
    labelKey:
      "legal.links.userRules",
  },
];

export default function DocumentsPage() {
  const {
    t,
  } = useTranslation();

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <header
        style={{
          marginBottom: 22,
        }}
      >
        <h1
          style={{
            margin: 0,
            color:
              "var(--text-h)",
            fontSize: 28,
            lineHeight: 1.2,
          }}
        >
          {t(
            "documents.title"
          )}
        </h1>

        <div
          style={{
            marginTop: 7,
            color:
              "var(--text)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {t(
            "documents.subtitle"
          )}
        </div>
      </header>

      <section
        style={{
          ...cardStyle,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            margin: "0 0 16px",
            color:
              "var(--text-h)",
            fontSize: 19,
            lineHeight: 1.3,
          }}
        >
          {t(
            "documents.legalTitle"
          )}
        </h2>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {LEGAL_DOCUMENTS.map(
            (
              document
            ) => (
              <Link
                key={
                  document.slug
                }
                to={
                  `/documents/${document.slug}`
                }
                style={{
                  display: "block",
                  padding:
                    "13px 14px",
                  border:
                    "1px solid var(--border)",
                  borderRadius: 10,
                  background:
                    "var(--surface-soft)",
                  color:
                    "var(--text-h)",
                  fontSize: 13,
                  fontWeight: 700,
                  lineHeight: 1.4,
                  textDecoration:
                    "none",
                  overflowWrap:
                    "anywhere",
                }}
              >
                {t(
                  document.labelKey
                )}
              </Link>
            )
          )}
        </div>
      </section>
    </div>
  );
}
