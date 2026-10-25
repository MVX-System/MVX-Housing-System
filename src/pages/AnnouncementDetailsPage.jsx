import { formatMvxDate } from "../utils/displayDate";

import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  getAnnouncement,
} from "../api/announcements";

import {
  useTranslation,
} from "../i18n";

function getAnnouncementDate(
  announcement
) {
  return (
    announcement?.published_at ||
    announcement?.publish_from ||
    announcement?.created_at
  );
}

export default function AnnouncementDetailsPage() {
  const navigate =
    useNavigate();

  const {
    t,
    language,
  } = useTranslation();

  const [
    searchParams,
  ] = useSearchParams();

  const announcementId =
    searchParams.get("id");

  const [
    announcement,
    setAnnouncement,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const formatDate =
    (value) => {
      if (!value) {
        return "—";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return String(value);
      }

      const localeMap = {
        lv: "lv-LV",
        en: "en-GB",
        ru: "ru-RU",
      };

      return formatMvxDate(value);
    };

  useEffect(() => {
    let active = true;

    const loadAnnouncement =
      async () => {
        setLoading(true);
        setError("");

        if (!announcementId) {
          setError(
            t(
              "announcements.details.missingIdentifier"
            )
          );
          setLoading(false);
          return;
        }

        try {
          const result =
            await getAnnouncement(
              announcementId
            );

          if (!active) {
            return;
          }

          if (
            !result ||
            result.error
          ) {
            throw new Error(
              result?.error ||
              t(
                "announcements.details.notFound"
              )
            );
          }

          setAnnouncement(result);
        } catch (loadError) {
          if (!active) {
            return;
          }

          console.error(
            "LOAD ANNOUNCEMENT ERROR:",
            loadError
          );

          setAnnouncement(null);

          setError(
            loadError?.message ||
            t(
              "announcements.details.loadFailed"
            )
          );
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    loadAnnouncement();

    return () => {
      active = false;
    };
  }, [
    announcementId,
    t,
  ]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 820,
        margin: "0 auto",
      }}
    >
      <button
        type="button"
        onClick={() =>
          navigate(
            "/announcements"
          )
        }
        style={backButtonStyle}
      >
        {t(
          "announcements.details.back"
        )}
      </button>

      {loading && (
        <div style={stateStyle}>
          {t(
            "announcements.details.loading"
          )}
        </div>
      )}

      {!loading &&
        error && (
          <div
            role="alert"
            style={errorStyle}
          >
            {error}
          </div>
        )}

      {!loading &&
        !error &&
        announcement && (
          <article
            style={{
              padding: 24,
              border:
                "1px solid var(--border)",
              borderLeft:
                announcement.priority ===
                "important"
                  ? "3px solid #b45353"
                  : "3px solid var(--border)",
              borderRadius: 14,
              background:
                "var(--surface)",
              boxShadow:
                "0 6px 20px rgba(15,23,42,.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 24,
                  padding: "3px 8px",
                  border:
                    announcement.priority ===
                    "important"
                      ? "1px solid rgba(180,83,83,.30)"
                      : "1px solid var(--border)",
                  borderRadius: 999,
                  background:
                    announcement.priority ===
                    "important"
                      ? "rgba(180,83,83,.07)"
                      : "var(--surface-soft)",
                  color:
                    announcement.priority ===
                    "important"
                      ? "#9f3f3f"
                      : "var(--text)",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing:
                    "0.05em",
                  textTransform:
                    "uppercase",
                }}
              >
                {announcement.priority ===
                "important"
                  ? t(
                      "announcements.common.important"
                    )
                  : t(
                      "announcements.common.information"
                    )}
              </span>

              <time
                dateTime={
                  getAnnouncementDate(
                    announcement
                  ) || undefined
                }
                style={{
                  color:
                    "var(--text)",
                  fontSize: 11,
                }}
              >
                {formatDate(
                  getAnnouncementDate(
                    announcement
                  )
                )}
              </time>
            </div>

            <h1
              style={{
                margin:
                  "0 0 18px",
                color:
                  "var(--text-h)",
                fontSize: 28,
                lineHeight: 1.3,
              }}
            >
              {announcement.title}
            </h1>

            <div
              style={{
                paddingTop: 18,
                borderTop:
                  "1px solid var(--border)",
                color:
                  "var(--text)",
                fontSize: 14,
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
                overflowWrap:
                  "anywhere",
              }}
            >
              {announcement.content}
            </div>
          </article>
        )}
    </div>
  );
}

const backButtonStyle = {
  marginBottom: 16,
  padding: 0,
  border: "none",
  background:
    "transparent",
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const stateStyle = {
  padding: 22,
  border:
    "1px solid var(--border)",
  borderRadius: 12,
  background:
    "var(--surface)",
  color:
    "var(--text)",
  fontSize: 13,
  textAlign: "center",
};

const errorStyle = {
  padding: 16,
  border:
    "1px solid rgba(180,83,83,.30)",
  borderRadius: 10,
  background:
    "rgba(180,83,83,.07)",
  color: "#9f3f3f",
  fontSize: 13,
};
