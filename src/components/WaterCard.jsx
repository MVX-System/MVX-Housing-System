import {
  useState,
} from "react";

import {
  inputStyle,
  buttonStyle,
} from "../styles/theme";

import {
  useTranslation,
} from "../i18n";

export default function WaterCard({
  meter,
  onSubmit,
  onHistory,
  submissionDisabled = false,
}) {

  const {
    t,
  } = useTranslation();

  const [value, setValue] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting
  ] = useState(false);

  const controlsDisabled =
    submissionDisabled ||
    isSubmitting;

  const formatValue = (value) => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    return value;
  };

  const formatReading = (value) => {

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
      return value;
    }

    return (
      (storedValue / 1000)
        .toFixed(3)
        .replace(".", ",") +
      " m³"
    );
  };

  const formatReadingInput =
    (value) => {

      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        return "0,000";
      }

      const storedValue =
        Number(value);

      if (
        !Number.isFinite(
          storedValue
        )
      ) {
        return "0,000";
      }

      return (
        storedValue / 1000
      )
        .toFixed(3)
        .replace(".", ",");
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

      if (!type) {
        return t(
          "water.card.water"
        );
      }

      const normalizedType =
        String(type)
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
        "water.card.customWater",
        {
          type,
        }
      );
    };

  const normalizedMeterType =
    String(
      meter.type || ""
    )
      .trim()
      .toLowerCase();

  const isHotWater =
    normalizedMeterType === "hot";

  const handleInputChange =
    (event) => {

      const inputValue =
        event.target.value;

      if (
        /^[0-9]*([,.][0-9]{0,3})?$/.test(
          inputValue
        )
      ) {
        setValue(inputValue);
      }
    };

  const handleSubmit =
    async () => {

      if (
        controlsDisabled
      ) {
        return;
      }

      setIsSubmitting(true);

      try {

        const success =
          await onSubmit(
            meter.id,
            value
          );

        if (success) {
          setValue("");
        }

      } finally {

        setIsSubmitting(false);
      }
    };

  const handleHistory = () => {

    if (
      typeof onHistory ===
      "function"
    ) {
      onHistory(meter.id);
    }
  };

  const rowStyle = {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 12,
    padding: "5px 0",
  };

  const labelStyle = {
    color: "var(--text)",
    fontSize: 13,
  };

  const valueStyle = {
    fontWeight: 600,
    textAlign: "right",
    color: "var(--text-h)",
    fontSize: 14,
  };

  return (
    <div
      style={{
        padding: 14,
        border:
          "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--surface-soft)",
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 10,
        }}
      >

        <div>

          <h3
            style={{
              margin: 0,
              fontSize: 17,
              lineHeight: 1.25,
            }}
          >
            {formatMeterType(
              meter.type
            )}
          </h3>

          {meter.local_label && (

            <div
              style={{
                marginTop: 2,
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {meter.local_label}
            </div>

          )}

        </div>

        <span
          style={{
            padding: "4px 9px",
            borderRadius: 999,
            background:
              isHotWater
                ? "#fff7ed"
                : "#eff6ff",
            color:
              isHotWater
                ? "#c2410c"
                : "#1d4ed8",
            fontSize: 11,
            fontWeight: 700,
            textTransform:
              "capitalize",
            whiteSpace: "nowrap",
          }}
        >
          {formatMeterType(
            meter.type
          )}
        </span>

      </div>

      <div
        style={{
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom:
            "1px solid var(--border)",
        }}
      >

        <div style={rowStyle}>

          <span style={labelStyle}>
            {t(
              "water.card.riser"
            )}
          </span>

          <span
            style={{
              ...valueStyle,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
            }}
          >
            {formatValue(
              meter.riser_code
            )}
          </span>

        </div>

        <div style={rowStyle}>

          <span style={labelStyle}>
            {t(
              "water.card.serialNumber"
            )}
          </span>

          <span style={valueStyle}>
            {formatValue(
              meter.serial_number
            )}
          </span>

        </div>

        <div style={rowStyle}>

          <span style={labelStyle}>
            {t(
              "water.card.currentReading"
            )}
          </span>

          <span
            style={{
              ...valueStyle,
              fontSize: 18,
            }}
          >
            {formatReading(
              meter.last_reading
            )}
          </span>

        </div>

        <div style={rowStyle}>

          <span style={labelStyle}>
            {t(
              "water.card.lastSubmitted"
            )}
          </span>

          <span style={valueStyle}>
            {formatDate(
              meter.last_date
            )}
          </span>

        </div>

      </div>

      <div
        style={{
          opacity:
            submissionDisabled
              ? 0.5
              : 1,
          transition:
            "opacity 0.2s ease",
        }}
      >

        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-h)",
          }}
        >
          {t(
            "water.card.newReading"
          )}
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) auto",
            gap: 8,
            alignItems: "stretch",
          }}
        >

          <input
            type="text"
            inputMode="decimal"
            placeholder={
              formatReadingInput(
                meter.last_reading
              )
            }
            value={value}
            disabled={
              controlsDisabled
            }
            onChange={
              handleInputChange
            }
            style={{
              ...inputStyle,
              width: "100%",
              margin: 0,
              boxSizing:
                "border-box",
              cursor:
                controlsDisabled
                  ? "not-allowed"
                  : "text",
              background:
                controlsDisabled
                  ? "var(--surface-muted)"
                  : inputStyle
                      .background,
            }}
          />

          <button
            type="button"
            disabled={
              controlsDisabled
            }
            onClick={handleSubmit}
            style={{
              ...buttonStyle,
              minWidth: 120,
              margin: 0,
              opacity:
                controlsDisabled
                  ? 0.65
                  : 1,
              cursor:
                controlsDisabled
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isSubmitting
              ? t(
                  "water.card.submitting"
                )
              : t(
                  "water.card.submit"
                )}
          </button>

        </div>

        <div
          style={{
            marginTop: 7,
            color: "var(--text)",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          {t(
            "water.card.inputHint"
          )}
        </div>

      </div>

      <button
        type="button"
        onClick={handleHistory}
        style={{
          width: "100%",
          marginTop: 10,
          padding: "9px 12px",
          border:
            "1px solid var(--border)",
          borderRadius: 9,
          background: "var(--surface)",
          color: "var(--text-h)",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {t(
          "water.card.viewHistory"
        )}
      </button>

    </div>
  );
}
