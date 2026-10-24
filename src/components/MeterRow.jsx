import { useTranslation } from "../i18n";
import {

  meterCard,

  meterLeft,

  meterHistoryButton,

} from "../styles/theme";

export default function MeterRow({

  meter,

  onOpen,

  onHistory,

}) {

  const { t } = useTranslation();
  return (

    <div

      onClick={() => onOpen?.(meter)}

      style={meterCard}

    >

      <div style={meterLeft}>

        <div style={{ fontSize: 22 }}>

          {meter.type === "hot"

            ? "🔴"

            : "🔵"}

        </div>

        <div>

          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: "var(--text-h)",
            }}
          >

            {meter.type === "hot"

              ? t("water.card.hotWater")

              : t("water.card.coldWater")}

          </div>

          <div
            style={{
              fontSize: 13,
              color: "var(--text)",
            }}
          >

            SN {meter.serial_number}

          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--text)",
            }}
          >

            Reading

            {" "}

            <strong>

              {meter.lastReading ?? "—"}

            </strong>

            {" "}

            {meter.unit ?? "L"}

          </div>

          <div
            style={{
              fontSize: 11,
              color: "var(--text)",
            }}
          >

            {meter.lastReadingDate ?? ""}

          </div>

        </div>

      </div>

      <button

        onClick={(e) => {

          e.stopPropagation();

          onHistory?.(meter);

        }}

        style={meterHistoryButton}

      >

        History

      </button>

    </div>

  );

}
