import {
  useEffect,
  useState,
} from "react";

import WaterCard from "../components/WaterCard";
import MeterHistoryModal
  from "../components/MeterHistoryModal";

import useWater from "../hooks/useWater";

import {
  useTranslation,
} from "../i18n";

export default function ResidentWaterPage() {

  const {
    t,
  } = useTranslation();

  const {
    waterMeters,

    waterReportingPeriod,
    waterReportingPeriodLoading,
    waterReportingPeriodError,

    meterHistory,
    meterHistoryLoading,

    loadMyWater,
    loadWaterReportingPeriod,

    loadMeterHistory,
    clearMeterHistory,

    submitReading,
    correctReading,
  } = useWater();

  const [
    historyOpen,
    setHistoryOpen
  ] = useState(false);

  useEffect(() => {

    Promise.all([
      loadMyWater(),
      loadWaterReportingPeriod(),
    ]);

  }, []);

  const handleOpenHistory =
    async (meterId) => {

      setHistoryOpen(true);

      await loadMeterHistory(
        meterId
      );
    };

  const handleCloseHistory =
    () => {

      setHistoryOpen(false);

      clearMeterHistory();
    };

  const getDateLocale = () => {

    const htmlLanguage =
      String(
        document
          .documentElement
          .lang || "en"
      )
        .trim()
        .toLowerCase();

    if (
      htmlLanguage.startsWith(
        "lv"
      )
    ) {
      return "lv-LV";
    }

    if (
      htmlLanguage.startsWith(
        "ru"
      )
    ) {
      return "ru-RU";
    }

    return "en-GB";
  };

  const formatPeriodDateTime =
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
        return value;
      }

      return date.toLocaleString(
        getDateLocale(),
        {
          timeZone:
            "Europe/Riga",

          day: "2-digit",
          month: "short",
          year: "numeric",

          hour: "2-digit",
          minute: "2-digit",
        }
      );
    };

  const submissionAllowed =
    waterReportingPeriod
      ?.submission_allowed === true;

  const periodState =
    waterReportingPeriod
      ?.state || "unavailable";

  const period =
    waterReportingPeriod
      ?.period || null;

  let periodTitle =
    t(
      "water.resident.period.statusTitle"
    );

  let periodMessage =
    t(
      "water.resident.period.unavailable"
    );

  if (
    waterReportingPeriodLoading
  ) {

    periodMessage =
      t(
        "water.resident.period.loading"
      );

  } else if (
    waterReportingPeriodError
  ) {

    periodMessage =
      t(
        "water.resident.period.loadFailed"
      );

  } else if (
    periodState === "open" &&
    period
  ) {

    periodTitle =
      t(
        "water.resident.period.openTitle"
      );

    periodMessage =
      t(
        "water.resident.period.openUntil",
        {
          date:
            formatPeriodDateTime(
              period
                .collection_closes_at
            ),
        }
      );

  } else if (
    periodState === "scheduled" &&
    period
  ) {

    periodTitle =
      t(
        "water.resident.period.closedTitle"
      );

    periodMessage =
      t(
        "water.resident.period.opensOn",
        {
          date:
            formatPeriodDateTime(
              period
                .collection_opens_at
            ),
        }
      );

  } else if (
    [
      "closed",
      "finalized",
    ].includes(
      periodState
    ) &&
    period
  ) {

    periodTitle =
      t(
        "water.resident.period.closedTitle"
      );

    periodMessage =
      t(
        "water.resident.period.closedOn",
        {
          date:
            formatPeriodDateTime(
              period
                .collection_closes_at
            ),
        }
      );
  }

  const metersByApartment =
    waterMeters.reduce(
      (
        groupedMeters,
        meter
      ) => {

        const apartmentNumber =
          meter.apartment_number ??
          "Unknown";

        if (
          !groupedMeters[
            apartmentNumber
          ]
        ) {
          groupedMeters[
            apartmentNumber
          ] = [];
        }

        groupedMeters[
          apartmentNumber
        ].push(meter);

        return groupedMeters;
      },
      {}
    );

  const apartmentGroups =
    Object.entries(
      metersByApartment
    ).sort(
      ([numberA], [numberB]) =>
        String(numberA).localeCompare(
          String(numberB),
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        )
    );

  return (
    <div>

      <div
        style={{
          marginBottom: 18,
        }}
      >

        <h1
          style={{
            margin: 0,
          }}
        >
          {t(
            "water.resident.title"
          )}
        </h1>

        <p
          style={{
            marginTop: 8,
            marginBottom: 0,
            color: "var(--text)",
            lineHeight: 1.5,
          }}
        >
          {t(
            "water.resident.subtitle"
          )}
        </p>

      </div>

      <div
        style={{
          marginBottom: 24,
          padding: "14px 16px",
          border:
            submissionAllowed
              ? "1px solid #86efac"
              : "1px solid var(--border)",
          borderRadius: 14,
          background:
            submissionAllowed
              ? "#f0fdf4"
              : "var(--surface-soft)",
          color:
            submissionAllowed
              ? "#166534"
              : "var(--text)",
        }}
      >

        <div
          style={{
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          {periodTitle}
        </div>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {periodMessage}
        </div>

      </div>

      {apartmentGroups.length === 0 ? (

        <div
          style={{
            padding: 24,
            border:
              "1px solid var(--border)",
            borderRadius: 16,
            background: "var(--surface)",
            color: "var(--text)",
          }}
        >
          {t(
            "water.resident.noMeters"
          )}
        </div>

      ) : (

        apartmentGroups.map(
          ([
            apartmentNumber,
            meters,
          ]) => (

            <section
              key={apartmentNumber}
              style={{
                marginBottom: 28,
                padding: 20,
                border:
                  "1px solid var(--border)",
                borderRadius: 18,
                background: "var(--surface)",
                boxShadow:
                  "0 4px 16px rgba(15, 23, 42, 0.05)",
              }}
            >

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 18,
                  paddingBottom: 14,
                  borderBottom:
                    "1px solid var(--border)",
                }}
              >

                <div>

                  <div
                    style={{
                      color: "var(--text)",
                      fontSize: 13,
                      fontWeight: 600,
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.04em",
                      marginBottom: 4,
                    }}
                  >
                    {t(
                      "water.resident.apartment"
                    )}
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      fontSize: 22,
                    }}
                  >
                    {apartmentNumber ===
                    "Unknown"
                      ? t(
                          "water.resident.notAssigned"
                        )
                      : `#${apartmentNumber}`}
                  </h2>

                </div>

                <div
                  style={{
                    padding: "6px 11px",
                    borderRadius: 999,
                    background: "var(--surface-muted)",
                    color: "var(--text)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {t(
                    meters.length === 1
                      ? "water.resident.meterCount.one"
                      : "water.resident.meterCount.other",
                    {
                      count:
                        meters.length,
                    }
                  )}
                </div>

              </div>

              <div
                style={{
                  display: "grid",
                  gap: 16,
                }}
              >

                {meters.map(
                  (meter) => (

                    <WaterCard
                      key={meter.id}
                      meter={meter}
                      onSubmit={
                        submitReading
                      }
                      onHistory={
                        handleOpenHistory
                      }
                      submissionDisabled={
                        !submissionAllowed
                      }
                    />

                  )
                )}

              </div>

            </section>

          )
        )

      )}

      <MeterHistoryModal
        open={historyOpen}
        history={meterHistory}
        loading={
          meterHistoryLoading
        }
        onCorrect={
          correctReading
        }
        onClose={
          handleCloseHistory
        }
      />

    </div>
  );
}
