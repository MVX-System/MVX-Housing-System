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

              ? "Hot Water"

              : "Cold Water"}

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
