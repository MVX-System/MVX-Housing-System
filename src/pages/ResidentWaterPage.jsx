import { formatMvxDateTime } from "../utils/displayDate";

import {
  useEffect,
  useState,
} from "react";

import WaterReadingUnifiedForm from "../features/water-reporting/WaterReadingUnifiedForm";
import { formatCubicMetres, getLocationName } from "../features/water-reporting/waterReadingLogic";
import { localizeMeterLocation } from "../utils/meterLocation";
import { formatWaterReportingPeriodLabel } from "../utils/waterReportingPeriodLabel";
import MeterHistoryModal
  from "../components/MeterHistoryModal";

import useWater from "../hooks/useWater";

import {
  useTranslation,
} from "../i18n";

export default function ResidentWaterPage() {

  const {
    t,
    language,
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

    submitBatchReadings,
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

  // Date labels use a stable civil-date format and react immediately to locale changes.
  const formatPeriodDateTime = (value) => formatMvxDateTime(value);

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
    waterMeters.filter(meter => meter.active !== 0 && meter.active !== false && meter.active !== "0").reduce(
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
                    language === "ru" && meters.length % 10 >= 2 && meters.length % 10 <= 4 && !(meters.length % 100 >= 12 && meters.length % 100 <= 14)
                      ? "water.resident.meterCount.few"
                      : (language === "ru"
                          ? meters.length % 10 === 1 && meters.length % 100 !== 11
                          : meters.length === 1)
                        ? "water.resident.meterCount.one"
                        : "water.resident.meterCount.other",
                    {
                      count:
                        meters.length,
                    }
                  )}
                </div>

              </div>

              <WaterReadingUnifiedForm
                key={`${apartmentNumber}:${period?.id ?? "none"}`}
                locale={language}
                apartmentLabel={`${t("water.resident.apartment")} #${apartmentNumber}`}
                periodLabel={period?.period_year && period?.period_month
                  ? formatWaterReportingPeriodLabel(
                      `${period.period_year}-${String(period.period_month).padStart(2, "0")}`,
                      language,
                    )
                  : ""}
                reportingPeriodId={period?.id ?? null}
                submissionDisabled={!submissionAllowed}
                meters={meters.map(meter => ({
                  id: meter.id,
                  kind: meter.type,
                  location: getLocationName({
                    location: meter.local_label
                      ? localizeMeterLocation(meter.local_label, language)
                      : "",
                  }, language),
                  serial: meter.serial_number,
                  previousReadingSubmittedAt: meter.last_date ?? null,
                  riser: meter.riser_code,
                  previous: Number.isSafeInteger(Number(meter.last_reading)) &&
                    meter.last_reading !== null && meter.last_reading !== ""
                    ? formatCubicMetres(Number(meter.last_reading), "en")
                    : null,
                }))}
                onHistory={handleOpenHistory}
                onSubmit={submitBatchReadings}
              />

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
