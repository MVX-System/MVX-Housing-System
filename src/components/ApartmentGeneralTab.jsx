function InfoRow({

  label,

  value,

}) {

  return (

    <div
      style={{

        display: "flex",

        justifyContent: "space-between",

        padding: "12px 0",

        borderBottom:
          "1px solid var(--border)",

      }}
    >

      <strong>

        {label}

      </strong>

      <span>

        {value}

      </span>

    </div>

  );

}

export default function ApartmentGeneralTab({

  apartment,

}) {

  return (

    <>

      <InfoRow
        label="Owner"
        value={
          apartment.owner ||
          "Not assigned"
        }
      />

      <InfoRow
        label="Resident"
        value={
          apartment.resident ||
          "Not assigned"
        }
      />

      <InfoRow
        label="Area"
        value={
          apartment.area
            ? `${apartment.area} m²`
            : "-"
        }
      />

      <InfoRow
        label="Floor"
        value={
          apartment.floor ?? "-"
        }
      />

      <InfoRow
        label="Entrance"
        value={
          apartment.entrance ?? "-"
        }
      />

    </>

  );

}
