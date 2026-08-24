import {
  useMemo,
  useState,
} from "react";

import useAdminAnnouncements
  from "../hooks/useAdminAnnouncements";

import {
  useTranslation,
} from "../i18n";


const FILTER_LABELS = {
  en: {
    status: "Status",
    priority: "Priority",
    allStatuses: "All statuses",
    active: "Active",
    published: "Published",
    draft: "Draft",
    archived: "Archived",
    allPriorities: "All priorities",
    important: "Important",
    normal: "Normal",
    shown: "Shown",
    noMatches: "No announcements match the selected filters.",
  },

  lv: {
    status: "Statuss",
    priority: "Prioritāte",
    allStatuses: "Visi statusi",
    active: "Aktīvie",
    published: "Publicētie",
    draft: "Melnraksti",
    archived: "Arhivētie",
    allPriorities: "Visas prioritātes",
    important: "Svarīgi",
    normal: "Parasti",
    shown: "Parādīti",
    noMatches: "Neviens paziņojums neatbilst izvēlētajiem filtriem.",
  },

  ru: {
    status: "Статус",
    priority: "Приоритет",
    allStatuses: "Все статусы",
    active: "Активные",
    published: "Опубликованные",
    draft: "Черновики",
    archived: "Архивированные",
    allPriorities: "Все приоритеты",
    important: "Важные",
    normal: "Обычные",
    shown: "Показано",
    noMatches: "Нет объявлений, соответствующих выбранным фильтрам.",
  },
};

const EMPTY_FORM = {
  id: null,
  title: "",
  content: "",
  priority: "normal",
  publish_from: "",
  publish_until: "",
  targets: [
    {
      type: "all",
      value: null,
    },
  ],
};

function toDateTimeLocal(
  value
) {
  if (!value) {
    return "";
  }

  const text =
    String(value);

  return text
    .replace("Z", "")
    .replace(" ", "T")
    .slice(0, 16);
}

function toApiDateTime(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toISOString();
}

function getStatusStyle(
  status
) {
  if (
    status === "published"
  ) {
    return {
      border:
        "1px solid rgba(21,128,61,.25)",
      background:
        "rgba(21,128,61,.07)",
      color: "#15803d",
    };
  }

  if (
    status === "archived"
  ) {
    return {
      border:
        "1px solid var(--border)",
      background:
        "var(--surface-soft)",
      color:
        "var(--text)",
    };
  }

  return {
    border:
      "1px solid rgba(180,83,83,.20)",
    background:
      "rgba(180,83,83,.06)",
    color: "#9f3f3f",
  };
}


function formatPushDelivery(
  pushDelivery,
  language
) {
  if (!pushDelivery) {
    return "";
  }

  const recipients =
    Number(
      pushDelivery.recipients || 0
    );

  const sent =
    Number(
      pushDelivery.sent || 0
    );

  const failed =
    Number(
      pushDelivery.failed || 0
    );

  const skipped =
    Number(
      pushDelivery.skipped || 0
    );

  const labels = {
    en: {
      title: "Push",
      recipients: "recipients",
      sent: "sent",
      failed: "failed",
      skipped: "skipped",
    },
    lv: {
      title: "Push",
      recipients: "saņēmēji",
      sent: "nosūtīti",
      failed: "neizdevās",
      skipped: "izlaisti",
    },
    ru: {
      title: "Push",
      recipients: "получателей",
      sent: "отправлено",
      failed: "ошибок",
      skipped: "пропущено",
    },
  };

  const text =
    labels[language] ||
    labels.en;

  return `${text.title}: ${recipients} ${text.recipients}, ${sent} ${text.sent}, ${failed} ${text.failed}, ${skipped} ${text.skipped}.`;
}

export default function AdminAnnouncementsPage() {
  const {
    t,
    language,
  } = useTranslation();

  const {
    announcements,
    targetOptions,
    loading,
    optionsLoading,
    saving,
    actionId,
    error,
    loadAnnouncements,
    saveAnnouncement,
    publishAnnouncement,
    archiveAnnouncement,
  } =
    useAdminAnnouncements();

  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM
  );

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    notice,
    setNotice,
  ] = useState("");

  const [
    targetType,
    setTargetType,
  ] = useState("section");

  const [
    targetValue,
    setTargetValue,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState("all");

  const filterText =
    FILTER_LABELS[language] ||
    FILTER_LABELS.en;

  const isEditing =
    Boolean(form.id);

  const activeCount =
    useMemo(
      () =>
        announcements.filter(
          (item) =>
            item.status !==
              "archived"
        ).length,
      [announcements]
    );

  const filteredAnnouncements =
    useMemo(
      () =>
        announcements.filter(
          (item) => {
            const statusMatches =
              statusFilter === "all" ||
              (
                statusFilter === "active"
                  ? item.status !== "archived"
                  : item.status === statusFilter
              );

            const priorityMatches =
              priorityFilter === "all" ||
              item.priority ===
                priorityFilter;

            return (
              statusMatches &&
              priorityMatches
            );
          }
        ),
      [
        announcements,
        statusFilter,
        priorityFilter,
      ]
    );

  const formatDateTime =
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

      return new Intl.DateTimeFormat(
        localeMap[language] ||
          "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(date);
    };

  const getStatusLabel =
    (status) => {
      if (
        status === "published"
      ) {
        return t(
          "announcements.admin.status.published"
        );
      }

      if (
        status === "archived"
      ) {
        return t(
          "announcements.admin.status.archived"
        );
      }

      return t(
        "announcements.admin.status.draft"
      );
    };

  const resetForm =
    () => {
      setForm(
        EMPTY_FORM
      );
      setFormError("");
    };

  const changeField =
    (
      field,
      value
    ) => {
      setForm(
        (current) => ({
          ...current,
          [field]: value,
        })
      );
    };

  const editAnnouncement =
    (announcement) => {
      setForm({
        id: announcement.id,
        title:
          announcement.title ||
          "",
        content:
          announcement.content ||
          "",
        priority:
          announcement.priority ||
          "normal",
        publish_from:
          toDateTimeLocal(
            announcement.publish_from
          ),
        publish_until:
          toDateTimeLocal(
            announcement.publish_until
          ),
        targets:
          Array.isArray(
            announcement.targets
          ) &&
          announcement.targets.length > 0
            ? announcement.targets
            : [
                {
                  type: "all",
                  value: null,
                },
              ],
      });

      setFormError("");
      setNotice("");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  const getUserTargetLabel =
    (item) => {
      const nick =
        String(
          item?.nick || ""
        ).trim();

      const apartmentNumbers =
        (
          Array.isArray(
            item?.apartment_numbers
          )
            ? item.apartment_numbers
            : []
        )
          .map(
            (value) =>
              String(
                value || ""
              ).trim()
          )
          .filter(Boolean);

      if (
        nick &&
        apartmentNumbers.length > 0
      ) {
        return `${nick} — ${t(
          "announcements.admin.recipients.apartment"
        )} ${apartmentNumbers.join(", ")}`;
      }

      if (nick) {
        return nick;
      }

      // Stage 2I-5B3:
      // Announcement target labels use only pseudonymous Nick identity.
      // Legacy first_name / last_name / email fallbacks have been removed.
      return `#${item?.id ?? ""}`;
    };

  const getTargetOptions =
    () => {
      if (
        targetType === "section"
      ) {
        return (
          targetOptions.sections ||
          []
        ).map(
          (item) => ({
            value:
              String(
                item.value
              ),
            label:
              `${t(
                "announcements.admin.recipients.section"
              )} ${item.value}`,
          })
        );
      }

      if (
        targetType ===
        "apartment"
      ) {
        return (
          targetOptions.apartments ||
          []
        ).map(
          (item) => ({
            value:
              String(item.id),
            label:
              `${t(
                "announcements.admin.recipients.apartment"
              )} ${item.number}`,
          })
        );
      }

      if (
        targetType === "role"
      ) {
        return (
          targetOptions.roles ||
          []
        ).map(
          (item) => ({
            value:
              String(item.name),
            label:
              item.name,
          })
        );
      }

      if (
        targetType === "user"
      ) {
        return (
          targetOptions.users ||
          []
        ).map(
          (item) => ({
            value:
              String(item.id),
            label:
              getUserTargetLabel(
                item
              ),
          })
        );
      }

      return [];
    };

  const getTargetLabel =
    (target) => {
      if (
        target.type === "all"
      ) {
        return t(
          "announcements.admin.recipients.everyone"
        );
      }

      if (
        target.type ===
        "section"
      ) {
        return `${t(
          "announcements.admin.recipients.section"
        )} ${target.value}`;
      }

      if (
        target.type ===
        "apartment"
      ) {
        const apartment =
          (
            targetOptions.apartments ||
            []
          ).find(
            (item) =>
              String(item.id) ===
              String(target.value)
          );

        return `${t(
          "announcements.admin.recipients.apartment"
        )} ${
          apartment?.number ||
          target.value
        }`;
      }

      if (
        target.type === "role"
      ) {
        return `${t(
          "announcements.admin.recipients.role"
        )}: ${target.value}`;
      }

      const user =
        (
          targetOptions.users ||
          []
        ).find(
          (item) =>
            String(item.id) ===
            String(target.value)
        );

      const userName =
        user
          ? getUserTargetLabel(
              user
            )
          : target.value;

      return `${t(
        "announcements.admin.recipients.user"
      )}: ${userName}`;
    };

  const addTarget =
    () => {
      if (
        !targetType ||
        !targetValue
      ) {
        return;
      }

      const nextTarget = {
        type: targetType,
        value: targetValue,
      };

      setForm(
        (current) => {
          const withoutEveryone =
            current.targets.filter(
              (target) =>
                target.type !==
                "all"
            );

          const exists =
            withoutEveryone.some(
              (target) =>
                target.type ===
                  nextTarget.type &&
                String(
                  target.value
                ) ===
                  String(
                    nextTarget.value
                  )
            );

          return {
            ...current,
            targets:
              exists
                ? withoutEveryone
                : [
                    ...withoutEveryone,
                    nextTarget,
                  ],
          };
        }
      );

      setTargetValue("");
    };

  const setEveryoneTarget =
    () => {
      changeField(
        "targets",
        [
          {
            type: "all",
            value: null,
          },
        ]
      );
    };

  const removeTarget =
    (targetToRemove) => {
      setForm(
        (current) => {
          const targets =
            current.targets.filter(
              (target) =>
                !(
                  target.type ===
                    targetToRemove.type &&
                  String(
                    target.value
                  ) ===
                    String(
                      targetToRemove.value
                    )
                )
            );

          return {
            ...current,
            targets,
          };
        }
      );
    };

  const submit =
    async (
      publishImmediately
    ) => {
      setFormError("");
      setNotice("");

      const title =
        form.title.trim();

      const content =
        form.content.trim();

      if (!title) {
        setFormError(
          t(
            "announcements.admin.validation.title"
          )
        );
        return;
      }

      if (!content) {
        setFormError(
          t(
            "announcements.admin.validation.content"
          )
        );
        return;
      }

      if (
        !Array.isArray(
          form.targets
        ) ||
        form.targets.length === 0
      ) {
        setFormError(
          t(
            "announcements.admin.validation.recipients"
          )
        );
        return;
      }

      if (
        form.publish_from &&
        form.publish_until &&
        new Date(
          form.publish_until
        ) <
          new Date(
            form.publish_from
          )
      ) {
        setFormError(
          t(
            "announcements.admin.validation.dateOrder"
          )
        );
        return;
      }

      try {
        const result =
          await saveAnnouncement({
            id: form.id,
            title,
            content,
            priority:
              form.priority,
            publish_from:
              toApiDateTime(
                form.publish_from
              ),
            publish_until:
              toApiDateTime(
                form.publish_until
              ),
            publishImmediately,
            targets:
              form.targets,
          });

        const baseNotice =
          publishImmediately
            ? t(
                "announcements.admin.notice.published"
              )
            : isEditing
              ? t(
                  "announcements.admin.notice.updated"
                )
              : t(
                  "announcements.admin.notice.draftSaved"
                );

        const pushNotice =
          formatPushDelivery(
            result?.pushDelivery,
            language
          );

        setNotice(
          pushNotice
            ? `${baseNotice} ${pushNotice}`
            : baseNotice
        );

        resetForm();
      } catch {
        setFormError(
          t(
            "announcements.admin.validation.saveFailed"
          )
        );
      }
    };

  const publish =
    async (
      announcement
    ) => {
      const approved =
        window.confirm(
          t(
            "announcements.admin.confirm.publish",
            {
              title:
                announcement.title,
            }
          )
        );

      if (!approved) {
        return;
      }

      setNotice("");

      try {
        const result =
          await publishAnnouncement(
            announcement.id
          );

        const baseNotice =
          t(
            "announcements.admin.notice.published"
          );

        const pushNotice =
          formatPushDelivery(
            result?.pushDelivery,
            language
          );

        setNotice(
          pushNotice
            ? `${baseNotice} ${pushNotice}`
            : baseNotice
        );
      } catch {
        // The hook exposes the backend error.
      }
    };

  const archive =
    async (
      announcement
    ) => {
      const approved =
        window.confirm(
          t(
            "announcements.admin.confirm.archive",
            {
              title:
                announcement.title,
            }
          )
        );

      if (!approved) {
        return;
      }

      setNotice("");

      try {
        await archiveAnnouncement(
          announcement.id
        );

        if (
          form.id ===
            announcement.id
        ) {
          resetForm();
        }

        setNotice(
          t(
            "announcements.admin.notice.archived"
          )
        );
      } catch {
        // The hook exposes the backend error.
      }
    };

  return (
    <div
      className="admin-announcements-page"
    >
      <style>
        {`
          .admin-announcements-page {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            overflow-x: hidden;
          }

          .announcement-form-grid {
            width: 100%;
            min-width: 0;
          }

          .announcement-form-grid > label {
            min-width: 0;
          }

          .announcement-form-grid input,
          .announcement-form-grid select {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .announcement-form-grid input[type="datetime-local"] {
            display: block;
            -webkit-appearance: none;
            appearance: none;
          }

          @media (max-width: 700px) {
            .admin-announcements-page {
              padding-top: 56px;
            }

            .admin-announcements-page h1 {
              font-size: 30px !important;
              line-height: 1.15 !important;
              max-width: 280px;
            }

            .announcement-form-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .announcement-actions {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .announcement-actions button {
              width: 100%;
            }

            .announcement-recipient-controls {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .announcement-recipient-controls button {
              width: 100%;
            }

            .admin-announcement-panel {
              padding: 16px !important;
              border-radius: 12px !important;
            }

            .announcement-form-grid input[type="datetime-local"] {
              font-size: 16px !important;
            }
          }
        `}
      </style>

      <div
        style={{
          marginBottom: 22,
        }}
      >
        <h1
          style={{
            margin: 0,
            color:
              "var(--text-h)",
            lineHeight: 1.2,
            fontSize: 34,
          }}
        >
          {t(
            "announcements.admin.title"
          )}
        </h1>

        <div
          style={{
            marginTop: 6,
            color:
              "var(--text)",
            fontSize: 13,
          }}
        >
          {t(
            "announcements.admin.subtitle"
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={errorStyle}
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={noticeStyle}
        >
          {notice}
        </div>
      )}

      <section
        className="admin-announcement-panel"
        style={{
          ...panelStyle,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color:
                  "var(--text-h)",
                fontSize: 18,
              }}
            >
              {isEditing
                ? t(
                    "announcements.admin.editAnnouncement"
                  )
                : t(
                    "announcements.admin.newAnnouncement"
                  )}
            </h2>

            <div
              style={{
                marginTop: 4,
                color:
                  "var(--text)",
                fontSize: 11,
              }}
            >
              {t(
                "announcements.admin.formHint"
              )}
            </div>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              style={
                secondaryButton
              }
            >
              {t(
                "announcements.admin.cancelEditing"
              )}
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          <label
            style={labelStyle}
          >
            {t(
              "announcements.admin.fields.title"
            )}

            <input
              type="text"
              value={form.title}
              maxLength={180}
              onChange={(event) =>
                changeField(
                  "title",
                  event.target.value
                )
              }
              style={inputStyle}
              placeholder={t(
                "announcements.admin.placeholders.title"
              )}
            />
          </label>

          <label
            style={labelStyle}
          >
            {t(
              "announcements.admin.fields.text"
            )}

            <textarea
              value={form.content}
              onChange={(event) =>
                changeField(
                  "content",
                  event.target.value
                )
              }
              style={{
                ...inputStyle,
                minHeight: 160,
                resize: "vertical",
                lineHeight: 1.55,
              }}
              placeholder={t(
                "announcements.admin.placeholders.text"
              )}
            />
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(210px,1fr))",
              gap: 12,
            }}
            className="announcement-form-grid"
          >
            <label
              style={labelStyle}
            >
              {t(
                "announcements.admin.fields.priority"
              )}

              <select
                value={
                  form.priority
                }
                onChange={(event) =>
                  changeField(
                    "priority",
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="normal">
                  {t(
                    "announcements.common.normal"
                  )}
                </option>

                <option value="important">
                  {t(
                    "announcements.common.important"
                  )}
                </option>
              </select>
            </label>

            <label
              style={labelStyle}
            >
              {t(
                "announcements.admin.fields.visibleFrom"
              )}

              <input
                type="datetime-local"
                value={
                  form.publish_from
                }
                onChange={(event) =>
                  changeField(
                    "publish_from",
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </label>

            <label
              style={labelStyle}
            >
              {t(
                "announcements.admin.fields.visibleUntil"
              )}

              <input
                type="datetime-local"
                value={
                  form.publish_until
                }
                onChange={(event) =>
                  changeField(
                    "publish_until",
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              padding: 14,
              border:
                "1px solid var(--border)",
              borderRadius: 11,
              background:
                "var(--surface-soft)",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "var(--text-h)",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {t(
                  "announcements.admin.recipients.title"
                )}
              </div>

              <div
                style={{
                  marginTop: 4,
                  color:
                    "var(--text)",
                  fontSize: 10,
                }}
              >
                {t(
                  "announcements.admin.recipients.hint"
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {form.targets.map(
                (target) => (
                  <span
                    key={`${target.type}:${target.value || ""}`}
                    style={targetChip}
                  >
                    {getTargetLabel(
                      target
                    )}

                    <button
                      type="button"
                      aria-label={t(
                        "announcements.admin.recipients.remove"
                      )}
                      onClick={() =>
                        removeTarget(
                          target
                        )
                      }
                      style={
                        targetRemoveButton
                      }
                    >
                      ×
                    </button>
                  </span>
                )
              )}
            </div>

            <div
              className="announcement-recipient-controls"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(130px,.7fr) minmax(180px,1.3fr) auto",
                gap: 8,
              }}
            >
              <select
                value={
                  targetType
                }
                onChange={(event) => {
                  setTargetType(
                    event.target.value
                  );
                  setTargetValue("");
                }}
                style={inputStyle}
                disabled={
                  optionsLoading
                }
              >
                <option value="section">
                  {t(
                    "announcements.admin.recipients.sections"
                  )}
                </option>

                <option value="apartment">
                  {t(
                    "announcements.admin.recipients.apartments"
                  )}
                </option>

                <option value="role">
                  {t(
                    "announcements.admin.recipients.roles"
                  )}
                </option>

                <option value="user">
                  {t(
                    "announcements.admin.recipients.users"
                  )}
                </option>
              </select>

              <select
                value={
                  targetValue
                }
                onChange={(event) =>
                  setTargetValue(
                    event.target.value
                  )
                }
                style={inputStyle}
                disabled={
                  optionsLoading
                }
              >
                <option value="">
                  {optionsLoading
                    ? t(
                        "announcements.admin.recipients.loading"
                      )
                    : t(
                        "announcements.admin.recipients.select"
                      )}
                </option>

                {getTargetOptions().map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={addTarget}
                disabled={
                  !targetValue
                }
                style={
                  secondaryButton
                }
              >
                {t(
                  "announcements.admin.recipients.add"
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={
                setEveryoneTarget
              }
              style={{
                ...secondaryButton,
                justifySelf:
                  "start",
              }}
            >
              {t(
                "announcements.admin.recipients.setEveryone"
              )}
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              style={{
                color: "#9f3f3f",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {formError}
            </div>
          )}

          <div
            className="announcement-actions"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",
              gap: 10,
            }}
          >
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                submit(false)
              }
              style={
                secondaryButton
              }
            >
              {saving
                ? t(
                    "announcements.common.saving"
                  )
                : isEditing
                  ? t(
                      "announcements.admin.saveChanges"
                    )
                  : t(
                      "announcements.admin.saveDraft"
                    )}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                submit(true)
              }
              style={
                primaryButton
              }
            >
              {saving
                ? t(
                    "announcements.common.saving"
                  )
                : t(
                    "announcements.admin.saveAndPublish"
                  )}
            </button>
          </div>
        </div>
      </section>

      <section
        className="admin-announcement-panel"
        style={panelStyle}
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
          <div>
            <h2
              style={{
                margin: 0,
                color:
                  "var(--text-h)",
                fontSize: 18,
              }}
            >
              {t(
                "announcements.admin.listTitle"
              )}
            </h2>

            <div
              style={{
                marginTop: 4,
                color:
                  "var(--text)",
                fontSize: 11,
              }}
            >
              {t(
                "announcements.admin.summary",
                {
                  active:
                    activeCount,
                  total:
                    announcements.length,
                }
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={
              loadAnnouncements
            }
            disabled={loading}
            style={
              secondaryButton
            }
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: 10,
            marginBottom: 14,
            padding: 12,
            border:
              "1px solid var(--border)",
            borderRadius: 10,
            background:
              "var(--surface-soft)",
          }}
        >
          <label
            style={labelStyle}
          >
            {filterText.status}

            <select
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              style={inputStyle}
            >
              <option value="all">
                {filterText.allStatuses}
              </option>

              <option value="active">
                {filterText.active}
              </option>

              <option value="published">
                {filterText.published}
              </option>

              <option value="draft">
                {filterText.draft}
              </option>

              <option value="archived">
                {filterText.archived}
              </option>
            </select>
          </label>

          <label
            style={labelStyle}
          >
            {filterText.priority}

            <select
              value={
                priorityFilter
              }
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value
                )
              }
              style={inputStyle}
            >
              <option value="all">
                {filterText.allPriorities}
              </option>

              <option value="important">
                {filterText.important}
              </option>

              <option value="normal">
                {filterText.normal}
              </option>
            </select>
          </label>

          <div
            style={{
              alignSelf: "end",
              minHeight: 39,
              display: "flex",
              alignItems: "center",
              padding: "0 11px",
              border:
                "1px solid var(--border)",
              borderRadius: 9,
              background:
                "var(--surface)",
              color:
                "var(--text)",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {filterText.shown}:{" "}
            {filteredAnnouncements.length}
            {" / "}
            {announcements.length}
          </div>
        </div>

        {loading ? (
          <EmptyState>
            {t(
              "announcements.admin.loadingAnnouncements"
            )}
          </EmptyState>
        ) : announcements.length ===
          0 ? (
          <EmptyState>
            {t(
              "announcements.admin.noAnnouncements"
            )}
          </EmptyState>
        ) : filteredAnnouncements.length ===
          0 ? (
          <EmptyState>
            {filterText.noMatches}
          </EmptyState>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 11,
            }}
          >
            {filteredAnnouncements.map(
              (announcement) => {
                const busy =
                  actionId ===
                    announcement.id;

                const archived =
                  announcement.status ===
                    "archived";

                return (
                  <article
                    key={
                      announcement.id
                    }
                    style={{
                      padding: 16,
                      border:
                        "1px solid var(--border)",
                      borderRadius: 11,
                      background:
                        archived
                          ? "var(--surface-soft)"
                          : "var(--surface)",
                      opacity:
                        archived
                          ? 0.78
                          : 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap: 14,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          flex: "1 1 360px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            flexWrap: "wrap",
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              ...statusBadge,
                              ...getStatusStyle(
                                announcement.status
                              ),
                            }}
                          >
                            {getStatusLabel(
                              announcement.status
                            )}
                          </span>

                          <span
                            style={{
                              ...statusBadge,

                              ...(announcement.priority ===
                              "important"
                                ? importantBadge
                                : normalPriorityBadge),
                            }}
                          >
                            {announcement.priority ===
                            "important"
                              ? t(
                                  "announcements.common.important"
                                )
                              : t(
                                  "announcements.common.normal"
                                )}
                          </span>
                        </div>

                        <h3
                          style={{
                            margin:
                              "0 0 7px",
                            color:
                              "var(--text-h)",
                            fontSize: 16,
                            lineHeight: 1.35,
                          }}
                        >
                          {announcement.title}
                        </h3>

                        <div
                          style={{
                            color:
                              "var(--text)",
                            fontSize: 12,
                            lineHeight: 1.55,
                            whiteSpace:
                              "pre-wrap",
                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {announcement.content}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            marginTop: 11,
                          }}
                        >
                          {(
                            announcement.targets ||
                            []
                          ).map(
                            (target) => (
                              <span
                                key={`${announcement.id}:${target.type}:${target.value || ""}`}
                                style={{
                                  ...targetChip,
                                  padding:
                                    "3px 8px",
                                }}
                              >
                                {getTargetLabel(
                                  target
                                )}
                              </span>
                            )
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 14,
                            flexWrap: "wrap",
                            marginTop: 11,
                            color:
                              "var(--text)",
                            fontSize: 10,
                          }}
                        >
                          <span>
                            {t(
                              "announcements.admin.updated"
                            )}
                            {": "}
                            {formatDateTime(
                              announcement.updated_at
                            )}
                          </span>

                          <span>
                            {t(
                              "announcements.admin.from"
                            )}
                            {": "}
                            {formatDateTime(
                              announcement.publish_from
                            )}
                          </span>

                          <span>
                            {t(
                              "announcements.admin.until"
                            )}
                            {": "}
                            {formatDateTime(
                              announcement.publish_until
                            )}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          justifyContent:
                            "flex-end",
                        }}
                      >
                        {!archived && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              editAnnouncement(
                                announcement
                              )
                            }
                            style={
                              secondaryButton
                            }
                          >
                            {t(
                              "announcements.admin.edit"
                            )}
                          </button>
                        )}

                        {!archived &&
                          announcement.status !==
                            "published" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                publish(
                                  announcement
                                )
                              }
                              style={
                                primaryButton
                              }
                            >
                              {busy
                                ? t(
                                    "announcements.common.working"
                                  )
                                : t(
                                    "announcements.admin.publish"
                                  )}
                            </button>
                          )}

                        {!archived && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              archive(
                                announcement
                              )
                            }
                            style={
                              archiveButton
                            }
                          >
                            {busy
                              ? t(
                                  "announcements.common.working"
                                )
                              : t(
                                  "announcements.admin.archive"
                                )}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({
  children,
}) {
  return (
    <div
      style={{
        padding: 22,
        border:
          "1px dashed var(--border)",
        borderRadius: 10,
        color:
          "var(--text)",
        fontSize: 12,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

const panelStyle = {
  padding: 18,
  border:
    "1px solid var(--border)",
  borderRadius: 14,
  background:
    "var(--surface)",
  boxShadow:
    "0 6px 20px rgba(15,23,42,.05)",
};

const labelStyle = {
  display: "grid",
  minWidth: 0,
  gap: 6,
  color:
    "var(--text-h)",
  fontSize: 11,
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  minHeight: 40,
  boxSizing: "border-box",
  padding: "9px 11px",
  border:
    "1px solid var(--border)",
  borderRadius: 9,
  outline: "none",
  background:
    "var(--surface)",
  color:
    "var(--text-h)",
  font: "inherit",
  fontSize: 13,
};

const baseButton = {
  minHeight: 36,
  padding: "8px 12px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButton = {
  ...baseButton,
  border:
    "1px solid #1d4ed8",
  background: "#2563eb",
  color: "#ffffff",
};

const secondaryButton = {
  ...baseButton,
  border:
    "1px solid var(--border)",
  background:
    "var(--surface)",
  color:
    "var(--text-h)",
};

const dangerButton = {
  ...baseButton,
  border:
    "1px solid #b91c1c",
  background:
    "#dc2626",
  color: "#ffffff",
};

const archiveButton = {
  ...baseButton,
  border:
    "1px solid #6d5cae",
  background:
    "rgba(109,92,174,.12)",
  color: "#5b4b9a",
};

const importantBadge = {
  border:
    "1px solid rgba(220,38,38,.28)",
  background:
    "rgba(220,38,38,.08)",
  color: "#dc2626",
};

const normalPriorityBadge = {
  border:
    "1px solid var(--border)",
  background:
    "var(--surface-soft)",
  color:
    "var(--text)",
};

const statusBadge = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 22,
  padding: "2px 7px",
  borderRadius: 999,
  fontSize: 9,
  fontWeight: 800,
  letterSpacing:
    "0.04em",
  textTransform:
    "uppercase",
};

const targetChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 26,
  padding: "4px 6px 4px 9px",
  border:
    "1px solid var(--border)",
  borderRadius: 999,
  background:
    "var(--surface)",
  color:
    "var(--text-h)",
  fontSize: 10,
  fontWeight: 700,
};

const targetRemoveButton = {
  width: 20,
  height: 20,
  padding: 0,
  border: 0,
  borderRadius: 999,
  background:
    "transparent",
  color:
    "var(--text)",
  cursor: "pointer",
  fontSize: 15,
  lineHeight: 1,
};

const errorStyle = {
  marginBottom: 14,
  padding: 13,
  border:
    "1px solid rgba(180,83,83,.28)",
  borderRadius: 9,
  background:
    "rgba(180,83,83,.06)",
  color: "#9f3f3f",
  fontSize: 12,
};

const noticeStyle = {
  marginBottom: 14,
  padding: 13,
  border:
    "1px solid rgba(21,128,61,.24)",
  borderRadius: 9,
  background:
    "rgba(21,128,61,.06)",
  color: "#15803d",
  fontSize: 12,
};