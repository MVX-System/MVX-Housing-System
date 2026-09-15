export default function TableSection({ children }) {

  return (

    <div
      style={{

        background: "var(--surface)",

        border: "1px solid var(--border)",

        borderRadius: 18,

        overflow: "hidden",

        boxShadow:
          "0 8px 24px rgba(15,23,42,.06)",

      }}
    >

      {children}

    </div>

  );

}
