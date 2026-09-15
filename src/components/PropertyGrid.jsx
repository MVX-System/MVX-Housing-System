export default function PropertyGrid({

  items = [],

  columns = 2,

}) {

  return (

    <div

      style={{

        display: "grid",

        gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`,

        gap: 16,

      }}

    >

      {items.map((item) => (

        <div

          key={item.label}

          style={{

            border: "1px solid var(--border)",

            borderRadius: 12,

            padding: "12px 14px",

            background: "#fafafa",

          }}

        >

          <div

            style={{

              fontSize: 12,

              color: "var(--text)",

              marginBottom: 6,

            }}

          >

            {item.label}

          </div>

          <div

            style={{

              fontWeight: 600,

              color: "var(--text-h)",

              wordBreak: "break-word",

            }}

          >

            {item.value}

          </div>

        </div>

      ))}

    </div>

  );

}
