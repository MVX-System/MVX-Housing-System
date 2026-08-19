import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import useDashboard
  from "../hooks/useDashboard";

import {
  useMode,
} from "../context/ModeContext";

import {
  useAuth,
} from "../context/AuthContext";

import {
  useTranslation,
} from "../i18n";

import useApartments
  from "../hooks/useApartments";

import useWater
  from "../hooks/useWater";

import {
  api,
} from "../services/api";

import Drawer
  from "../components/Drawer";

import {
  cardStyle,
} from "../styles/theme";

const CONTACTS = [
  {
    roleKey: "manager",
    name: "Jevgēnijs Anosovs",
    phone: "+371 27424549",
  },
  {
    roleKey: "accountant",
    name: "Maija Malmigo",
    phone: "+371 29283923",
  },
  {
    roleKey: "heatingTechnician",
    name: "Igors Guļko",
    phone: "+371 28218233",
  },
];

export default function DashboardPage() {

  const {
    mode,
  } = useMode();

  const {
    me,
  } = useAuth();

  const {
    t,
  } = useTranslation();

  const navigate =
    useNavigate();

  const {
    dashboard,
    loadDashboard,
  } = useDashboard();

  const {
    apartments,
    loadApartments,
  } = useApartments();

  const {
    waterMeters,
    loadMyWater,
  } = useWater();

  const [
    apartmentRows,
    setApartmentRows
  ] = useState([]);

  const [
    announcementRows,
    setAnnouncementRows
  ] = useState([]);

  const [
    residentLoading,
    setResidentLoading
  ] = useState(false);

  const [
    meterHistories,
    setMeterHistories
  ] = useState({});

  const [
    apartmentOpen,
    setApartmentOpen
  ] = useState(false);

  useEffect(() => {

    if (mode === "admin") {

      loadDashboard();
      loadApartments();
    }

  }, [mode]);

  useEffect(() => {

    if (mode !== "resident") {
      return;
    }

    const loadResident =
      async () => {

        setResidentLoading(true);

        try {

          const [
            result,
            announcementsResult,
          ] = await Promise.all([
            api(
              "/api/my-apartments"
            ),

            api(
              "/api/announcements"
            ),

            loadMyWater(),
          ]);

          setApartmentRows(
            Array.isArray(result)
              ? result
              : []
          );

          setAnnouncementRows(
            Array.isArray(
              announcementsResult
            )
              ? announcementsResult
              : []
          );

          const meterResult =
            await api(
              "/api/my-water-meters"
            );

          const meters =
            Array.isArray(
              meterResult
            )
              ? meterResult
              : [];

          const historyEntries =
            await Promise.all(
              meters.map(
                async (
                  meter
                ) => {

                  const history =
                    await api(
                      `/api/my-water-meter-history?id=${meter.id}`
                    );

                  return [
                    meter.id,
                    Array.isArray(
                      history?.readings
                    )
                      ? history.readings
                      : [],
                  ];
                }
              )
            );

          setMeterHistories(
            Object.fromEntries(
              historyEntries
            )
          );

        } finally {

          setResidentLoading(false);
        }
      };

    loadResident();

  }, [mode]);

  const myApartments =
    useMemo(
      () =>
        mergeApartments(
          apartmentRows
        ),
      [apartmentRows]
    );

  const waterSummary =
    useMemo(
      () =>
        buildWaterSummary(
          waterMeters,
          meterHistories
        ),
      [
        waterMeters,
        meterHistories,
      ]
    );

  const latestAnnouncements =
    useMemo(
      () =>
        getLatestAnnouncements(
          announcementRows
        ),
      [announcementRows]
    );

  const userName =
    me?.user?.nick ||
    t("dashboard.relations.resident");

  const livingArea =
    apartments.reduce(
      (
        sum,
        apartment
      ) =>
        sum +
        Number(
          apartment.living_area ||
          0
        ),
      0
    );

  const nonLivingArea =
    apartments.reduce(
      (
        sum,
        apartment
      ) =>
        sum +
        Number(
          apartment.non_living_area ||
          0
        ),
      0
    );

  const heatedArea =
    apartments.reduce(
      (
        sum,
        apartment
      ) =>
        sum +
        Number(
          apartment.heated_area ||
          0
        ),
      0
    );

  return (
    <div>

      <div
        style={{
          marginBottom: 24,
        }}
      >

        <h1
          style={{
            margin: 0,
            lineHeight: 1.2,
            color:
              "var(--text-h)",
          }}
        >
          {t("dashboard.title")}{" "}

          <span
            style={{
              fontSize: "0.6em",
              fontWeight: 700,
              color:
                "var(--text)",
            }}
          >
            MVX System
          </span>
        </h1>

        <div
          style={{
            marginTop: 6,
            color:
              "var(--text)",
            fontSize: 13,
          }}
        >
          {mode === "resident"
            ? t("dashboard.subtitleResident")
            : t("dashboard.subtitleAdmin")}
        </div>

        {mode === "resident" && (

          <div
            style={{
              marginTop: 12,
              color:
                "var(--text-h)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing:
                "0.04em",
            }}
          >
            DzĪKS IRLAVA 20
          </div>

        )}

      </div>

      {mode === "resident" && (

        <>

          <div
            className="resident-home-grid"
          >

            <HomeTile
              title={t("dashboard.myApartment.title")}
              subtitle={t("dashboard.myApartment.subtitle")}
              wide
              onClick={() =>
                setApartmentOpen(true)
              }
            >

              {residentLoading ? (

                <Placeholder>
                  {t("dashboard.common.loading")}
                </Placeholder>

              ) : myApartments.length ===
                0 ? (

                <Placeholder>
                  {t("dashboard.myApartment.noApartment")}
                </Placeholder>

              ) : (

                <>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >

                    <div>

                      <div
                        style={{
                          color:
                            "var(--text-h)",
                          fontSize: 24,
                          fontWeight: 800,
                        }}
                      >
                        {formatApartmentTitle(
                          myApartments,
                          t
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          color:
                            "var(--text)",
                          fontSize: 13,
                        }}
                      >
                        {userName}
                      </div>

                    </div>

                    <RelationBadge
                      relations={
                        collectRelations(
                          myApartments
                        )
                      }
                    />

                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >

                    {myApartments.map(
                      (apartment) => (

                        <span
                          key={apartment.id}
                          style={pillStyle}
                        >
                          {t(
                            "dashboard.apartment.section"
                          )}{" "}
                          {apartment.section ??
                            "—"}
                          {" · "}
                          {t(
                            "dashboard.apartment.floor"
                          )}{" "}
                          {apartment.floor ??
                            "—"}
                        </span>

                      )
                    )}

                  </div>

                </>

              )}

            </HomeTile>

            <HomeTile
              title={t("dashboard.announcements.title")}
              subtitle={t("dashboard.announcements.subtitle")}
              onClick={() =>
                navigate(
                  "/announcements"
                )
              }
            >

              {residentLoading ? (

                <Placeholder>
                  {t("dashboard.common.loading")}
                </Placeholder>

              ) : latestAnnouncements.length >
                0 ? (

                <AnnouncementsPreviewList
                  announcements={
                    latestAnnouncements
                  }
                  onOpen={(
                    event,
                    announcement
                  ) => {
                    event.stopPropagation();

                    navigate(
                      `/announcement?id=${encodeURIComponent(
                        announcement.id
                      )}`
                    );
                  }}
                  onViewAll={(
                    event
                  ) => {
                    event.stopPropagation();

                    navigate(
                      "/announcements"
                    );
                  }}
                />

              ) : (

                <Placeholder>
                  <strong
                    style={{
                      display: "block",
                      marginBottom: 5,
                      color:
                        "var(--text-h)",
                    }}
                  >
                    {t("dashboard.announcements.upToDate")}
                  </strong>

                  {t("dashboard.announcements.noNew")}
                </Placeholder>

              )}

            </HomeTile>

            <HomeTile
              title={t("dashboard.readings.title")}
              subtitle={t("dashboard.readings.subtitle")}
              onClick={() =>
                navigate("/water")
              }
            >

              {residentLoading ? (

                <Placeholder>
                  {t("dashboard.common.loading")}
                </Placeholder>

              ) : waterSummary
                  .meters.length === 0 ? (

                <Placeholder>
                  {t("dashboard.readings.noMeters")}
                </Placeholder>

              ) : (

                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >

                  <div
                    style={{
                      overflowX: "auto",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse:
                          "collapse",
                        fontSize: 10,
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={readingTh}>
                            {t("dashboard.readings.meter")}
                          </th>
                          <th style={readingTh}>
                            {t("dashboard.readings.latest")}
                          </th>
                          <th style={readingTh}>
                            {t("dashboard.readings.date")}
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {waterSummary
                          .meters
                          .map(
                            (meter) => (

                              <tr
                                key={meter.id}
                              >
                                <td style={readingTd}>
                                  <div
                                    style={{
                                      color:
                                        "var(--text-h)",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {meter.type ===
                                    "hot"
                                      ? t("dashboard.readings.hot")
                                      : t("dashboard.readings.cold")}
                                    {" · "}
                                    {meter.local_label ||
                                      meter.riser_code ||
                                      t("dashboard.readings.meter")}
                                  </div>

                                </td>

                                <td style={readingTd}>
                                  {formatReading(
                                    meter.last_reading
                                  )}
                                </td>

                                <td style={readingTd}>
                                  {formatDate(
                                    meter.last_date
                                  )}
                                </td>
                              </tr>

                            )
                          )}
                      </tbody>
                    </table>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 7,
                      paddingTop: 10,
                      borderTop:
                        "1px solid var(--border)",
                    }}
                  >

                    <ConsumptionLine
                      label={t("dashboard.readings.coldConsumption")}
                      current={
                        waterSummary
                          .coldCurrent
                      }
                      previous={
                        waterSummary
                          .coldPrevious
                      }
                    />

                    <ConsumptionLine
                      label={t("dashboard.readings.hotConsumption")}
                      current={
                        waterSummary
                          .hotCurrent
                      }
                      previous={
                        waterSummary
                          .hotPrevious
                      }
                    />

                  </div>

                </div>

              )}

            </HomeTile>

            <HomeTile
              title={t("dashboard.contacts.title")}
              subtitle="DzĪKS Irlava 20"
              wide
            >

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(220px,0.85fr) minmax(280px,1.4fr)",
                  gap: 22,
                  alignItems: "start",
                }}
                className="administration-contact-layout"
              >

                <div
                  style={{
                    color:
                      "var(--text)",
                    fontSize: 11,
                    lineHeight: 1.55,
                  }}
                >

                  <div
                    style={{
                      color:
                        "var(--text-h)",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    DzĪKS Irlava 20
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                    }}
                  >
                    Irlavas iela 20,
                    Rīga, LV-1046,
                    Latvija
                  </div>

                  <div
                    style={{
                      marginTop: 9,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      {t("dashboard.contacts.email")}:
                    </span>{" "}

                    <a
                      href="mailto:irlavas20@inbox.lv"
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                      style={{
                        ...contactLink,
                        marginTop: 0,
                      }}
                    >
                      irlavas20@inbox.lv
                    </a>
                  </div>

                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 0,
                  }}
                >

                  {CONTACTS.map(
                    (
                      contact,
                      index
                    ) => (

                      <div
                        key={contact.roleKey}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(120px,0.8fr) minmax(150px,1fr) auto",
                          gap: 12,
                          alignItems: "center",
                          padding:
                            index === 0
                              ? "0 0 9px"
                              : "9px 0",
                          borderTop:
                            index === 0
                              ? "none"
                              : "1px solid var(--border)",
                        }}
                        className="administration-contact-row"
                      >

                        <div
                          style={{
                            color:
                              "var(--text-h)",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {t(`dashboard.contacts.${contact.roleKey}`)}
                        </div>

                        <div
                          style={{
                            color:
                              "var(--text)",
                            fontSize: 11,
                          }}
                        >
                          {contact.name}
                        </div>

                        <a
                          href={`tel:${contact.phone.replace(
                            /\s+/g,
                            ""
                          )}`}
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          style={{
                            ...contactLink,
                            marginTop: 0,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {contact.phone}
                        </a>

                      </div>

                    )
                  )}

                </div>

              </div>

            </HomeTile>

          </div>

          <Drawer
            open={apartmentOpen}
            title={t("dashboard.myApartment.title")}
            onClose={() =>
              setApartmentOpen(false)
            }
          >

            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >

              <div
                style={{
                  color:
                    "var(--text-h)",
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                {userName}
              </div>

              {myApartments.map(
                (apartment) => (

                  <ApartmentDetails
                    key={apartment.id}
                    apartment={
                      apartment
                    }
                  />

                )
              )}

            </div>

          </Drawer>


        </>

      )}

      {mode === "admin" && (

        <AdminDashboard
          dashboard={dashboard}
          livingArea={livingArea}
          nonLivingArea={
            nonLivingArea
          }
          heatedArea={heatedArea}
        />

      )}

    </div>
  );
}

function HomeTile({
  title,
  subtitle,
  wide = false,
  onClick,
  children,
}) {

  const clickable =
    typeof onClick ===
    "function";

  return (
    <section
      onClick={onClick}
      role={
        clickable
          ? "button"
          : undefined
      }
      tabIndex={
        clickable
          ? 0
          : undefined
      }
      style={{
        ...tileStyle,
        gridColumn:
          wide
            ? "span 2"
            : "span 1",
        cursor:
          clickable
            ? "pointer"
            : "default",
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
          marginBottom: 16,
        }}
      >

        <div>

          <h3
            style={{
              margin: 0,
              color:
                "var(--text-h)",
              fontSize: 17,
            }}
          >
            {title}
          </h3>

          <div
            style={{
              marginTop: 3,
              color:
                "var(--text)",
              fontSize: 11,
            }}
          >
            {subtitle}
          </div>

        </div>

        {clickable && (

          <span
            style={{
              color:
                "var(--text)",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            →
          </span>

        )}

      </div>

      {children}

    </section>
  );
}


function AnnouncementsPreviewList({
  announcements,
  onOpen,
  onViewAll,
}) {

  const {
    t,
  } = useTranslation();

  return (
    <div
      style={{
        display: "grid",
        gap: 0,
      }}
    >

      {announcements.map(
        (announcement) => {

          const isImportant =
            announcement.priority ===
            "important";

          return (
            <button
              key={announcement.id}
              type="button"
              onClick={(event) =>
                onOpen(
                  event,
                  announcement
                )
              }
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0,1fr) auto",
                gap: 12,
                alignItems: "start",
                width: "100%",
                padding: "10px 0",
                border: "none",
                borderBottom:
                  "1px solid var(--border)",
                background:
                  "transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
            >

              <div
                style={{
                  minWidth: 0,
                }}
              >

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    marginBottom: 4,
                  }}
                >

                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      flex: "0 0 7px",
                      borderRadius: 999,
                      background:
                        isImportant
                          ? "#b91c1c"
                          : "var(--text)",
                      opacity:
                        isImportant
                          ? 1
                          : 0.45,
                    }}
                  />

                  <span
                    style={{
                      color:
                        isImportant
                          ? "#b91c1c"
                          : "var(--text)",
                      fontSize: 9,
                      fontWeight: 800,
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.06em",
                    }}
                  >
                    {isImportant
                      ? t("dashboard.announcements.important")
                      : t("dashboard.announcements.information")}
                  </span>

                </div>

                <strong
                  style={{
                    display: "block",
                    color:
                      "var(--text-h)",
                    fontSize: 12,
                    lineHeight: 1.35,
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {announcement.title}
                </strong>

                <div
                  style={{
                    marginTop: 3,
                    color:
                      "var(--text)",
                    fontSize: 10,
                    lineHeight: 1.4,
                  }}
                >
                  {getAnnouncementPreview(
                    announcement.content,
                    82
                  )}
                </div>

              </div>

              <span
                style={{
                  paddingTop: 1,
                  color:
                    "var(--text)",
                  fontSize: 9,
                  whiteSpace: "nowrap",
                }}
              >
                {formatAnnouncementDate(
                  getAnnouncementDate(
                    announcement
                  )
                )}
              </span>

            </button>
          );
        }
      )}

      <button
        type="button"
        onClick={onViewAll}
        style={{
          justifySelf: "start",
          marginTop: 10,
          padding: 0,
          border: "none",
          background:
            "transparent",
          color: "#2563eb",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {t("dashboard.announcements.viewAll")} →
      </button>

    </div>
  );
}


function ConsumptionLine({
  label,
  current,
  previous,
}) {

  const {
    t,
  } = useTranslation();

  const hasCurrent =
    current !== null &&
    current !== undefined;

  const hasPrevious =
    previous !== null &&
    previous !== undefined;

  const difference =
    hasCurrent &&
    hasPrevious
      ? current - previous
      : null;

  const trendStyle =
    difference === null
      ? {
          color:
            "var(--text)",
        }
      : difference > 0
        ? {
            color: "#b91c1c",
          }
        : difference < 0
          ? {
              color: "#15803d",
            }
          : {
              color:
                "var(--text)",
            };

  const trendLabel =
    difference === null
      ? t("dashboard.readings.noComparison")
      : difference > 0
        ? `+${formatReading(
            difference
          )}`
        : difference < 0
          ? formatReading(
              difference
            )
          : t("dashboard.readings.noChange");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(0,1fr) auto",
        gap: 8,
        alignItems: "center",
      }}
    >

      <div
        style={{
          color:
            "var(--text)",
          fontSize: 10,
        }}
      >
        {label}
      </div>

      <div
        style={{
          textAlign: "right",
        }}
      >
        <div
          style={{
            color:
              "var(--text-h)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {hasCurrent
            ? formatReading(
                current
              )
            : "—"}
        </div>

        <div
          style={{
            marginTop: 2,
            fontSize: 9,
            fontWeight: 700,
            ...trendStyle,
          }}
        >
          {trendLabel}
          {hasPrevious
            ? ` ${t(
                "dashboard.readings.vsPreviousMonth"
              )}`
            : ""}
        </div>
      </div>

    </div>
  );
}

function ApartmentDetails({
  apartment,
}) {

  const {
    t,
  } = useTranslation();

  const details = [
    {
      label: t("dashboard.apartment.apartment"),
      value:
        apartment.number ??
        "—",
    },
    {
      label: t("dashboard.apartment.section"),
      value:
        apartment.section ??
        apartment.entrance ??
        "—",
    },
    {
      label: t("dashboard.apartment.floor"),
      value:
        apartment.floor ??
        "—",
    },
    {
      label: t("dashboard.apartment.rooms"),
      value:
        apartment.room_count ??
        apartment.rooms ??
        "—",
    },
    {
      label: t("dashboard.apartment.residents"),
      value:
        apartment.residents_count ??
        apartment.resident_count ??
        "—",
    },
    {
      label: t("dashboard.apartment.livingArea"),
      value:
        formatArea(
          apartment.living_area
        ),
    },
    {
      label: t("dashboard.apartment.nonLivingArea"),
      value:
        formatArea(
          apartment.non_living_area
        ),
    },
    {
      label: t("dashboard.apartment.heatedArea"),
      value:
        formatArea(
          apartment.heated_area
        ),
    },
    {
      label: t("dashboard.apartment.totalArea"),
      value:
        formatArea(
          apartment.total_area
        ),
    },
    {
      label: t("dashboard.apartment.ownership"),
      value:
        apartment.ownership_type ??
        apartment.ownership ??
        "—",
    },
    {
      label: t("dashboard.apartment.status"),
      value:
        apartment.status ??
        (
          Number(
            apartment.active ?? 1
          ) === 1
            ? t("dashboard.apartment.active")
            : t("dashboard.apartment.inactive")
        ),
    },
    {
      label: t("dashboard.apartment.notes"),
      value:
        apartment.notes ??
        apartment.comment ??
        "—",
      wide: true,
    },
  ];

  return (
    <div
      style={{
        padding: 14,
        border:
          "1px solid var(--border)",
        borderRadius: 12,
        background:
          "var(--surface-soft)",
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >

        <strong
          style={{
            color:
              "var(--text-h)",
            fontSize: 17,
          }}
        >
          {t("dashboard.apartment.number", {
            number: apartment.number,
          })}
        </strong>

        <RelationBadge
          relations={
            apartment.relations
          }
        />

      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2,minmax(0,1fr))",
          gap: 8,
        }}
      >

        {details.map(
          (detail) => (

            <div
              key={detail.label}
              style={{
                gridColumn:
                  detail.wide
                    ? "1 / -1"
                    : "auto",
              }}
            >
              <DetailBox
                label={detail.label}
                value={detail.value}
              />
            </div>

          )
        )}

      </div>

    </div>
  );
}

function RelationBadge({
  relations = [],
}) {

  const {
    t,
  } = useTranslation();

  const label =
    relations
      .map(
        (relation) =>
          relation === "owner"
            ? t("dashboard.relations.owner")
            : relation === "resident"
              ? t("dashboard.relations.resident")
              : relation
      )
      .join(" / ") ||
    t("dashboard.relations.resident");

  return (
    <span
      style={{
        padding: "5px 9px",
        border:
          "1px solid var(--border)",
        borderRadius: 999,
        background:
          "var(--surface-soft)",
        color:
          "var(--text-h)",
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function DetailBox({
  label,
  value,
}) {

  return (
    <div
      style={{
        padding: 10,
        borderRadius: 9,
        background:
          "var(--surface)",
      }}
    >

      <div
        style={{
          color:
            "var(--text)",
          fontSize: 10,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 3,
          color:
            "var(--text-h)",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {value}
      </div>

    </div>
  );
}

function Placeholder({
  children,
}) {

  return (
    <div
      style={{
        padding: 16,
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

function InfoLine({
  label,
  value,
}) {

  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        gap: 12,
        paddingTop: 8,
        borderTop:
          "1px solid var(--border)",
      }}
    >

      <span
        style={{
          color:
            "var(--text)",
          fontSize: 11,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color:
            "var(--text-h)",
          fontSize: 11,
        }}
      >
        {value}
      </strong>

    </div>
  );
}

function AdminDashboard({
  dashboard,
  livingArea,
  nonLivingArea,
  heatedArea,
}) {

  const {
    t,
  } = useTranslation();

  return (
    <div style={cardStyle}>

      <h2
        style={{
          marginTop: 0,
        }}
      >
        {t("dashboard.admin.buildingSummary")}
      </h2>

      <InfoLine
        label={t("dashboard.admin.apartments")}
        value={
          dashboard?.stats
            ?.apartments ||
          0
        }
      />

      <InfoLine
        label={t("dashboard.admin.residents")}
        value={
          dashboard?.stats
            ?.users ||
          0
        }
      />

      <InfoLine
        label={t("dashboard.admin.livingArea")}
        value={
          `${livingArea.toFixed(
            2
          )} ㎡`
        }
      />

      <InfoLine
        label={t("dashboard.admin.nonLivingArea")}
        value={
          `${nonLivingArea.toFixed(
            2
          )} ㎡`
        }
      />

      <InfoLine
        label={t("dashboard.admin.heatedArea")}
        value={
          `${heatedArea.toFixed(
            2
          )} ㎡`
        }
      />

    </div>
  );
}

function mergeApartments(
  rows
) {

  const map =
    new Map();

  rows.forEach(
    (row) => {

      const key =
        String(
          row.id ??
          row.apartment_id ??
          row.number
        );

      if (!map.has(key)) {

        map.set(
          key,
          {
            ...row,
            relations: [],
          }
        );
      }

      const item =
        map.get(key);

      const relation =
        row.relation_type ||
        row.relation ||
        row.user_relation;

      if (
        relation &&
        !item.relations.includes(
          relation
        )
      ) {

        item.relations.push(
          relation
        );
      }
    }
  );

  return Array.from(
    map.values()
  );
}

function collectRelations(
  apartments
) {

  return Array.from(
    new Set(
      apartments.flatMap(
        (apartment) =>
          apartment.relations
      )
    )
  );
}

function buildWaterSummary(
  meters,
  histories
) {

  const active =
    meters.filter(
      (meter) =>
        Number(
          meter.active ?? 1
        ) === 1
    );

  const calculateMeterConsumption =
    (
      meter
    ) => {

      const readings =
        Array.isArray(
          histories[meter.id]
        )
          ? histories[meter.id]
          : [];

      const latest =
        readings[0];

      const previous =
        readings[1];

      const beforePrevious =
        readings[2];

      const currentConsumption =
        latest &&
        previous
          ? Number(
              latest.reading_value
            ) -
            Number(
              previous.reading_value
            )
          : null;

      const previousConsumption =
        previous &&
        beforePrevious
          ? Number(
              previous.reading_value
            ) -
            Number(
              beforePrevious.reading_value
            )
          : null;

      return {
        ...meter,
        currentConsumption:
          Number.isFinite(
            currentConsumption
          )
            ? currentConsumption
            : null,

        previousConsumption:
          Number.isFinite(
            previousConsumption
          )
            ? previousConsumption
            : null,
      };
    };

  const enriched =
    active.map(
      calculateMeterConsumption
    );

  const sumConsumption =
    (
      type,
      field
    ) => {

      const values =
        enriched
          .filter(
            (meter) =>
              meter.type === type &&
              meter[field] !== null
          )
          .map(
            (meter) =>
              meter[field]
          );

      if (
        values.length === 0
      ) {
        return null;
      }

      return values.reduce(
        (
          sum,
          value
        ) =>
          sum + value,
        0
      );
    };

  return {
    meters:
      enriched,

    coldCurrent:
      sumConsumption(
        "cold",
        "currentConsumption"
      ),

    coldPrevious:
      sumConsumption(
        "cold",
        "previousConsumption"
      ),

    hotCurrent:
      sumConsumption(
        "hot",
        "currentConsumption"
      ),

    hotPrevious:
      sumConsumption(
        "hot",
        "previousConsumption"
      ),
  };
}

function getLatestAnnouncements(
  announcements
) {

  if (
    !Array.isArray(
      announcements
    ) ||
    announcements.length === 0
  ) {
    return [];
  }

  return [...announcements]
    .sort(
      (left, right) =>
        getAnnouncementTime(
          right
        ) -
        getAnnouncementTime(
          left
        )
    )
    .slice(0, 3);
}

function getAnnouncementTime(
  announcement
) {

  const value =
    getAnnouncementDate(
      announcement
    );

  const time =
    new Date(value).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}

function getAnnouncementDate(
  announcement
) {

  return (
    announcement.published_at ||
    announcement.publish_from ||
    announcement.created_at ||
    ""
  );
}

function formatAnnouncementDate(
  value
) {

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
    return String(value)
      .slice(0, 10);
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function getAnnouncementPreview(
  content,
  maxLength = 145
) {

  const normalized =
    String(content || "")
      .replace(/\s+/g, " ")
      .trim();

  if (
    normalized.length <=
    maxLength
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    Math.max(
      0,
      maxLength - 3
    )
  )}...`;
}


function formatApartmentTitle(
  apartments,
  t
) {

  return apartments.length === 1
    ? t(
        "dashboard.apartment.number",
        {
          number:
            apartments[0].number,
        }
      )
    : apartments
        .map(
          (apartment) =>
            `#${apartment.number}`
        )
        .join(", ");
}

function formatReading(
  value
) {

  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return "—";
  }

  return (
    (numeric / 1000)
      .toFixed(3)
      .replace(".", ",") +
    " m³"
  );
}

function formatArea(
  value
) {

  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return "—";
  }

  return `${numeric.toFixed(
    2
  )} ㎡`;
}

function formatDate(
  value
) {

  if (!value) {
    return "—";
  }

  return String(value)
    .slice(0, 10);
}

const tileStyle = {
  minWidth: 0,
  padding: 18,
  border:
    "1px solid var(--border)",
  borderRadius: 16,
  background:
    "var(--surface)",
  boxShadow:
    "0 8px 24px rgba(15,23,42,.06)",
  boxSizing: "border-box",
};

const pillStyle = {
  display: "inline-block",
  padding: "6px 9px",
  borderRadius: 999,
  background:
    "var(--surface-soft)",
  color:
    "var(--text-h)",
  fontSize: 10,
  fontWeight: 700,
};

const readingTh = {
  padding: "4px 6px",
  borderBottom:
    "1px solid var(--border)",
  color:
    "var(--text)",
  textAlign: "left",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const readingTd = {
  padding: "4px 6px",
  borderBottom:
    "1px solid var(--border-soft)",
  color:
    "var(--text)",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const contactLink = {
  display: "inline-block",
  marginTop: 7,
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 700,
  textDecoration: "none",
};

const contactPreview = {
  padding: 10,
  border:
    "1px solid var(--border)",
  borderRadius: 10,
  background:
    "var(--surface-soft)",
};