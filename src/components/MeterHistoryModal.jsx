import {
  useEffect,
  useState,
} from "react";

import Modal
  from "./Modal";

import {
  useTranslation,
} from "../i18n";

const DEFAULT_REASON =
  "incorrectDigit";

export default function MeterHistoryModal({
  open,
  history,
  loading,
  onCorrect,
  onClose,
}) {

  const {
    t,
  } = useTranslation();

  const [
    correctionOpen,
    setCorrectionOpen
  ] = useState(false);

  const [
    correctedValue,
    setCorrectedValue
  ] = useState("");

  const [
    correctionReason,
    setCorrectionReason
  ] = useState(
    DEFAULT_REASON
  );

  const [
    otherReason,
    setOtherReason
  ] = useState("");

  const [
    isCorrecting,
    setIsCorrecting
  ] = useState(false);

  const meter =
    history?.meter || null;

  const readings =
    Array.isArray(
      history?.readings
    )
      ? history.readings
      : [];

  const latestReading =
    readings[0] || null;

  useEffect(() => {

    setCorrectionOpen(false);
    setCorrectedValue("");

    setCorrectionReason(
      DEFAULT_REASON
    );

    setOtherReason("");
    setIsCorrecting(false);

  }, [
    open,
    latestReading?.id,
  ]);

  const formatStoredReading = (
    value
  ) => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    const storedValue =
      Number(value);

    if (
      !Number.isFinite(
        storedValue
      )
    ) {
      return "—";
    }

    return (
      storedValue / 1000
    )
      .toFixed(3)
      .replace(".", ",");
  };

  const calculateConsumption = (
    currentValue,
    previousValue
  ) => {

    if (
      currentValue === null ||
      currentValue === undefined ||
      previousValue === null ||
      previousValue === undefined
    ) {
      return null;
    }

    const current =
      Number(currentValue);

    const previous =
      Number(previousValue);

    if (
      !Number.isFinite(current) ||
      !Number.isFinite(previous)
    ) {
      return null;
    }

    return current - previous;
  };

  const formatDate = (value) => {

    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-GB"
    );
  };

  const formatMeterType =
    (type) => {

      const normalizedType =
        String(type || "")
          .trim()
          .toLowerCase();

      if (normalizedType === "cold") {
        return t(
          "water.card.coldWater"
        );
      }

      if (normalizedType === "hot") {
        return t(
          "water.card.hotWater"
        );
      }

      return t(
        "water.history.waterMeter"
      );
    };

  const title = meter
    ? t(
        "water.history.typeHistory",
        {
          type:
            formatMeterType(
              meter.type
            ),
        }
      )
    : t(
        "water.history.title"
      );

  const handleOpenCorrection =
    () => {

      if (!latestReading) {
        return;
      }

      setCorrectedValue(
        formatStoredReading(
          latestReading.reading_value
        )
      );

      setCorrectionReason(
        DEFAULT_REASON
      );

      setOtherReason("");
      setCorrectionOpen(true);
    };

  const handleCancelCorrection =
    () => {

      setCorrectionOpen(false);
      setCorrectedValue("");

      setCorrectionReason(
        DEFAULT_REASON
      );

      setOtherReason("");
    };

  const handleCorrectedValueChange =
    (event) => {

      const inputValue =
        event.target.value;

      if (
        /^[0-9]*([,.][0-9]{0,3})?$/.test(
          inputValue
        )
      ) {
        setCorrectedValue(
          inputValue
        );
      }
    };

  const handleReasonChange =
    (event) => {

      const selectedReason =
        event.target.value;

      setCorrectionReason(
        selectedReason
      );

      if (
        selectedReason !== "other"
      ) {
        setOtherReason("");
      }
    };

  const getCorrectionReason =
    () => {

      if (
        correctionReason === "other"
      ) {
        return String(
          otherReason
        ).trim();
      }

      return t(
        `water.history.reasons.${correctionReason}`
      );
    };

  const handleSaveCorrection =
    async () => {

      if (
        !latestReading ||
        isCorrecting
      ) {
        return;
      }

      const finalReason =
        getCorrectionReason();

      if (!finalReason) {

        alert(
          t(
            "water.history.enterCorrectionReason"
          )
        );

        return;
      }

      setIsCorrecting(true);

      try {

        const success =
          await onCorrect(
            latestReading.id,
            correctedValue,
            finalReason
          );

        if (success) {

          setCorrectionOpen(false);
          setCorrectedValue("");

          setCorrectionReason(
            DEFAULT_REASON
          );

          setOtherReason("");
        }

      } finally {

        setIsCorrecting(false);
      }
    };

  const headerCellStyle = {
    padding: "7px 5px",
    fontWeight: 700,
    color: "var(--text-h)",
    borderBottom:
      "1px solid var(--border)",
    position: "sticky",
    top: 0,
    background: "var(--surface-muted)",
    lineHeight: 1.15,
    fontSize: 11,
    verticalAlign: "bottom",
  };

  const bodyCellStyle = {
    padding: "7px 5px",
    fontSize: 11,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    fontVariantNumeric:
      "tabular-nums",
  };

  const correctionFieldStyle = {
    width: "100%",
    padding: "8px 10px",
    border:
      "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--surface)",
    color: "var(--text-h)",
    fontSize: 13,
    boxSizing:
      "border-box",
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
    >

      {loading ? (

        <div
          style={{
            padding: "14px 0",
            color: "var(--text)",
            fontSize: 14,
          }}
        >
          {t(
            "water.history.loading"
          )}
        </div>

      ) : (

        <>

          {meter && (

            <div
              style={{
                marginBottom: 12,
                paddingBottom: 10,
                borderBottom:
                  "1px solid var(--border)",
              }}
            >

              {meter.local_label && (

                <div
                  style={{
                    marginBottom: 6,
                    color: "var(--text-h)",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {meter.local_label}
                </div>

              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "auto minmax(0, 1fr)",
                  columnGap: 10,
                  rowGap: 3,
                  color: "var(--text)",
                  fontSize: 12,
                  lineHeight: 1.35,
                }}
              >

                <span>
                  {t(
                    "water.history.apartment"
                  )}
                </span>

                <span
                  style={{
                    textAlign: "right",
                    fontWeight: 600,
                    color: "var(--text-h)",
                  }}
                >
                  {meter.apartment_number
                    ? `#${meter.apartment_number}`
                    : "—"}
                </span>

                <span>
                  {t(
                    "water.card.riser"
                  )}
                </span>

                <span
                  style={{
                    textAlign: "right",
                    fontWeight: 600,
                    color: "var(--text-h)",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 11,
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {meter.riser_code || "—"}
                </span>

                <span>
                  {t(
                    "water.card.serialNumber"
                  )}
                </span>

                <span
                  style={{
                    textAlign: "right",
                    fontWeight: 600,
                    color: "var(--text-h)",
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {meter.serial_number || "—"}
                </span>

              </div>

            </div>

          )}

          {readings.length === 0 ? (

            <div
              style={{
                padding: "12px 0",
                color: "var(--text)",
                fontSize: 13,
              }}
            >
              {t(
                "water.history.noPreviousReadings"
              )}
            </div>

          ) : (

            <div
              style={{
                width: "100%",
                maxHeight: 360,
                overflowY: "auto",
                overflowX: "hidden",
                border:
                  "1px solid var(--border)",
                borderRadius: 8,
                boxSizing:
                  "border-box",
              }}
            >

              <table
                style={{
                  width: "100%",
                  tableLayout: "fixed",
                  borderCollapse:
                    "collapse",
                }}
              >

                <colgroup>

                  <col
                    style={{
                      width: "34%",
                    }}
                  />

                  <col
                    style={{
                      width: "31%",
                    }}
                  />

                  <col
                    style={{
                      width: "35%",
                    }}
                  />

                </colgroup>

                <thead>

                  <tr>

                    <th
                      style={{
                        ...headerCellStyle,
                        textAlign: "left",
                      }}
                    >
                      {t(
                        "water.history.date"
                      )}
                    </th>

                    <th
                      style={{
                        ...headerCellStyle,
                        textAlign: "right",
                      }}
                    >
                      {t(
                        "water.history.reading"
                      )}
                      <br />

                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        (m³)
                      </span>
                    </th>

                    <th
                      style={{
                        ...headerCellStyle,
                        textAlign: "right",
                      }}
                    >
                      {t(
                        "water.history.consumption"
                      )}
                      <br />

                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        (m³)
                      </span>
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {readings.map(
                    (
                      reading,
                      index
                    ) => {

                      const previousReading =
                        readings[
                          index + 1
                        ];

                      const consumption =
                        previousReading
                          ? calculateConsumption(
                              reading.reading_value,
                              previousReading.reading_value
                            )
                          : null;

                      const isNegative =
                        consumption !== null &&
                        consumption < 0;

                      const isLastRow =
                        index ===
                        readings.length - 1;

                      const isLatest =
                        index === 0;

                      return (

                        <tr
                          key={reading.id}
                          style={{
                            background:
                              index % 2 === 0
                                ? "var(--surface)"
                                : "var(--surface-soft)",
                          }}
                        >

                          <td
                            style={{
                              ...bodyCellStyle,
                              textAlign: "left",
                              color: "var(--text)",
                              borderBottom:
                                isLastRow
                                  ? "none"
                                  : "1px solid var(--border)",
                            }}
                          >

                            {formatDate(
                              reading.reading_date
                            )}

                            {isLatest && (

                              <button
                                type="button"
                                onClick={
                                  handleOpenCorrection
                                }
                                style={{
                                  display: "block",
                                  marginTop: 3,
                                  padding: 0,
                                  border: "none",
                                  background:
                                    "transparent",
                                  color: "#2563eb",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                {t(
                                  "water.history.correct"
                                )}
                              </button>

                            )}

                          </td>

                          <td
                            style={{
                              ...bodyCellStyle,
                              textAlign: "right",
                              fontWeight: 600,
                              color: "var(--text-h)",
                              verticalAlign: "top",
                              borderBottom:
                                isLastRow
                                  ? "none"
                                  : "1px solid var(--border)",
                            }}
                          >
                            {formatStoredReading(
                              reading.reading_value
                            )}
                          </td>

                          <td
                            style={{
                              ...bodyCellStyle,
                              textAlign: "right",
                              fontWeight: 600,
                              color:
                                isNegative
                                  ? "#b91c1c"
                                  : "var(--text-h)",
                              verticalAlign: "top",
                              borderBottom:
                                isLastRow
                                  ? "none"
                                  : "1px solid var(--border)",
                            }}
                          >
                            {consumption === null
                              ? "—"
                              : formatStoredReading(
                                  consumption
                                )}
                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

          {correctionOpen &&
            latestReading && (

            <div
              style={{
                marginTop: 12,
                padding: 12,
                border:
                  "1px solid #bfdbfe",
                borderRadius: 10,
                background: "#eff6ff",
              }}
            >

              <div
                style={{
                  marginBottom: 10,
                  color: "#1e3a8a",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {t(
                  "water.history.correctLatestReading"
                )}
              </div>

              <label
                style={{
                  display: "block",
                  marginBottom: 4,
                  color: "var(--text-h)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {t(
                  "water.history.correctedReading"
                )}
              </label>

              <input
                type="text"
                inputMode="decimal"
                value={correctedValue}
                disabled={isCorrecting}
                onChange={
                  handleCorrectedValueChange
                }
                style={{
                  ...correctionFieldStyle,
                  fontSize: 14,
                }}
              />

              <label
                style={{
                  display: "block",
                  marginTop: 9,
                  marginBottom: 4,
                  color: "var(--text-h)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {t(
                  "water.history.correctionReason"
                )}
              </label>

              <select
                value={correctionReason}
                disabled={isCorrecting}
                onChange={
                  handleReasonChange
                }
                style={{
                  ...correctionFieldStyle,
                  cursor:
                    isCorrecting
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <option
                  value="incorrectDigit"
                >
                  {t(
                    "water.history.reasons.incorrectDigit"
                  )}
                </option>

                <option
                  value="wrongMeter"
                >
                  {t(
                    "water.history.reasons.wrongMeter"
                  )}
                </option>

                <option
                  value="decimalPoint"
                >
                  {t(
                    "water.history.reasons.decimalPoint"
                  )}
                </option>

                <option value="other">
                  {t(
                    "water.history.reasons.other"
                  )}
                </option>
              </select>

              {correctionReason ===
                "other" && (

                <>

                  <label
                    style={{
                      display: "block",
                      marginTop: 9,
                      marginBottom: 4,
                      color: "var(--text-h)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {t(
                      "water.history.otherReason"
                    )}
                  </label>

                  <input
                    type="text"
                    value={otherReason}
                    disabled={
                      isCorrecting
                    }
                    placeholder={t(
                      "water.history.describeReason"
                    )}
                    onChange={(event) =>
                      setOtherReason(
                        event.target.value
                      )
                    }
                    style={
                      correctionFieldStyle
                    }
                  />

                </>

              )}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: 8,
                  marginTop: 10,
                }}
              >

                <button
                  type="button"
                  disabled={isCorrecting}
                  onClick={
                    handleCancelCorrection
                  }
                  style={{
                    padding: "7px 11px",
                    border:
                      "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--surface)",
                    color: "var(--text-h)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor:
                      isCorrecting
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {t(
                    "water.history.cancel"
                  )}
                </button>

                <button
                  type="button"
                  disabled={isCorrecting}
                  onClick={
                    handleSaveCorrection
                  }
                  style={{
                    padding: "7px 11px",
                    border: "none",
                    borderRadius: 8,
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 700,
                    opacity:
                      isCorrecting
                        ? 0.65
                        : 1,
                    cursor:
                      isCorrecting
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {isCorrecting
                    ? t(
                        "water.history.saving"
                      )
                    : t(
                        "water.history.saveCorrection"
                      )}
                </button>

              </div>

            </div>

          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "9px 12px",
              border:
                "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--surface)",
              color: "var(--text-h)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t(
              "water.history.close"
            )}
          </button>

        </>

      )}

    </Modal>
  );
}
