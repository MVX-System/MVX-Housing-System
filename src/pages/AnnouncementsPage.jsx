import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import useAnnouncements
  from "../hooks/useAnnouncements";

import {
  useFacility,
} from "../context/FacilityContext";

import {
  useTranslation,
} from "../i18n";

function getAnnouncementDate(
  announcement
) {
  return (
    announcement.published_at ||
    announcement.publish_from ||
    announcement.created_at
  );
}

function getPreview(content) {
  const normalized =
    String(
      content || ""
    )
      .replace(/\s+/g, " ")
      .trim();

  if (
    normalized.length <= 220
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    217
  )}...`;
}

function AnnouncementCard({
  announcement,
  expanded,
  onToggle,
  onOpen,
  formatDate,
  t,
}) {
  const isImportant =
    announcement.priority ===
      "important";

  const fullContent =
    String(
      announcement.content || ""
    ).trim();

  const visibleContent =
    expanded
      ? fullContent
      : getPreview(
          fullContent
        );

  const canExpand =
    fullContent.length > 220;

  return (
    <article
      style={{
        padding: 20,
        border:
          "1px solid var(--border)",
        borderLeft:
          isImportant
            ? "3px solid #b45353"
            : "3px solid var(--border)",
        borderRadius: 12,
        background:
          "var(--surface)",
        boxShadow:
          "0 4px 14px rgba(15,23,42,.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 11,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 24,
            padding: "3px 8px",
            border:
              isImportant
                ? "1px solid rgba(180,83,83,.30)"
                : "1px solid var(--border)",
            borderRadius: 999,
            background:
              isImportant
                ? "rgba(180,83,83,.07)"
                : "var(--surface-soft)",
            color:
              isImportant
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
          {isImportant
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

      <h2
        style={{
          margin:
            "0 0 9px",
          color:
            "var(--text-h)",
          fontSize: 18,
          lineHeight: 1.35,
        }}
      >
        {announcement.title}
      </h2>

      <div
        style={{
          color:
            "var(--text)",
          fontSize: 13,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          overflowWrap:
            "anywhere",
        }}
      >
        {visibleContent}
      </div>

      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          marginTop: 14,
        }}
      >
        {canExpand && (
          <button
            type="button"
            onClick={onToggle}
            style={textButtonStyle}
          >
            {expanded
              ? t(
                  "announcements.resident.showLess"
                )
              : t(
                  "announcements.resident.readPreview"
                )}
          </button>
        )}

        <button
          type="button"
          onClick={onOpen}
          style={textButtonStyle}
        >
          {t(
            "announcements.resident.openAnnouncement"
          )}
        </button>
      </div>
    </article>
  );
}

export default function AnnouncementsPage() {
  const navigate =
    useNavigate();

  const {
    facility,
    loading: facilityLoading,
  } = useFacility();

  const facilityDisplayName =
    facilityLoading
      ? "..."
      : facility?.display_name ||
        "Facility";

  const {
    t,
    language,
  } = useTranslation();

  const {
    announcements,
    loading,
    error,
    refreshAnnouncements,
  } =
    useAnnouncements();

  const [
    expandedIds,
    setExpandedIds,
  ] = useState(
    () => new Set()
  );

  const formatDate =
    (value) => {
      if (!value) {
        return "";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "";
      }

      const localeMap = {
        lv: "lv-LV",
        en: "en-GB",
        ru: "ru-RU",
      };

      return new Intl.DateTimeFormat(
        localeMap[language] ||
          "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      ).format(date);
    };

  const toggleAnnouncement =
    (announcementId) => {
      setExpandedIds(
        (current) => {
          const next =
            new Set(current);

          if (
            next.has(
              announcementId
            )
          ) {
            next.delete(
              announcementId
            );
          } else {
            next.add(
              announcementId
            );
          }

          return next;
        }
      );
    };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 860,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems:
            "flex-start",
          justifyContent:
            "space-between",
          gap: 18,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >
        <div>
          <h1
            style={{
              margin:
                "0 0 6px",
              color:
                "var(--text-h)",
              fontSize: 28,
              lineHeight: 1.2,
            }}
          >
            {t(
              "announcements.resident.title"
            )}
          </h1>

          <p
            style={{
              margin: 0,
              color:
                "var(--text)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {t(
              "announcements.resident.subtitle",
              {
                facilityName:
                  facilityDisplayName,
              }
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={
            refreshAnnouncements
          }
          disabled={loading}
          style={{
            minHeight: 38,
            padding:
              "8px 13px",
            border:
              "1px solid var(--border)",
            borderRadius: 9,
            background:
              "var(--surface)",
            color:
              "var(--text-h)",
            fontSize: 12,
            fontWeight: 700,
            cursor: loading
              ? "default"
              : "pointer",
            opacity: loading
              ? 0.65
              : 1,
          }}
        >
          {loading
            ? t(
                "announcements.common.loading"
              )
            : t(
                "announcements.common.refresh"
              )}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: 14,
            border:
              "1px solid rgba(180,83,83,.30)",
            borderRadius: 10,
            background:
              "rgba(180,83,83,.07)",
            color: "#9f3f3f",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        announcements.length ===
          0 && (
          <div
            style={{
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
            }}
          >
            {t(
              "announcements.resident.noCurrent"
            )}
          </div>
        )}

      <div
        style={{
          display: "grid",
          gap: 14,
        }}
      >
        {announcements.map(
          (announcement) => (
            <AnnouncementCard
              key={
                announcement.id
              }
              announcement={
                announcement
              }
              expanded={
                expandedIds.has(
                  announcement.id
                )
              }
              onToggle={() =>
                toggleAnnouncement(
                  announcement.id
                )
              }
              onOpen={() =>
                navigate(
                  `/announcement?id=${encodeURIComponent(
                    announcement.id
                  )}`
                )
              }
              formatDate={
                formatDate
              }
              t={t}
            />
          )
        )}
      </div>
    </div>
  );
}

const textButtonStyle = {
  padding: 0,
  border: "none",
  background:
    "transparent",
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};
