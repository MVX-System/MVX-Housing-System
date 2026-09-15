export default function ApartmentWaterTab({
  apartment,
  onOpenMeter,
}) {

  return (

    <div>

      {apartment.risers?.map((riser) => (

        <div
          key={riser.name}
          style={{
            marginBottom: 24,
          }}
        >

          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-h)",
              marginBottom: 12,
            }}
          >
            {riser.name}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >

            {riser.meters.map((meter) => (

              <div
                key={meter.id}
                onClick={() => onOpenMeter?.(meter)}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 14,
                  background: "var(--surface)",
                  cursor: "pointer",
                }}
              >

                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {meter.type === "hot"
                    ? "🔴 Hot Water"
                    : "🔵 Cold Water"}
                </div>

                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text)",
                  }}
                >
                  SN {meter.serial_number}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text)",
                    marginTop: 4,
                  }}
                >
                  Last reading: —
                </div>

              </div>

            ))}

          </div>

        </div>

      ))}

    </div>

  );

}
