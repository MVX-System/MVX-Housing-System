export default function TabBar({

  tabs,

  value,

  onChange,

}) {

  return (

    <div
      style={{

        display: "flex",

        gap: 8,

        marginBottom: 24,

        flexWrap: "wrap",

      }}
    >

      {tabs.map((tab) => (

        <button

          key={tab}

          onClick={() => onChange(tab)}

          style={{

            padding: "10px 18px",

            borderRadius: 10,

            border:

              value === tab

                ? "2px solid var(--accent)"

                : "1px solid var(--input-border)",

            background:

              value === tab

                ? "var(--accent-bg)"

                : "var(--surface)",

            color:

              value === tab

                ? "var(--accent)"

                : "var(--text-h)",

            cursor: "pointer",

            fontWeight: 600,

          }}

        >

          {tab}

        </button>

      ))}

    </div>

  );

}
