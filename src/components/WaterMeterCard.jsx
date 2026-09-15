export default function WaterMeterCard({

  meter,

}) {

  return (

    <div
      style={{

        background: "var(--surface)",

        border: "1px solid var(--border)",

        borderRadius: 18,

        padding: 18,

        marginBottom: 16,

        boxShadow:
          "0 6px 18px rgba(15,23,42,.06)",

      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >

        <strong>

          Apartment {meter.apartment_number}

        </strong>

        <span>

          {meter.type === "hot"

            ? "🔴 Hot"

            : "🔵 Cold"}

        </span>

      </div>

      <div
        style={{
          marginBottom: 10,
        }}
      >

        <div
          style={{
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          Serial Number
        </div>

        <div>

          {meter.serial_number}

        </div>

      </div>

      <div
        style={{
          marginBottom: 10,
        }}
      >

        <div
          style={{
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          Installed
        </div>

        <div>

          {meter.installed_at
            ? meter.installed_at.slice(0,10)
            : "-"}

        </div>

      </div>

      <div>

        <span

          style={{

            display:"inline-block",

            padding:"6px 12px",

            borderRadius:999,

            fontWeight:600,

            background:

              meter.active

                ? "#dcfce7"

                : "#f3f4f6",

            color:

              meter.active

                ? "#15803d"

                : "#6b7280",

          }}

        >

          {meter.active

            ? "Active"

            : "Inactive"}

        </span>

      </div>

    </div>

  );

}
