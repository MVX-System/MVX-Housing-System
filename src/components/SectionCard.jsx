export default function SectionCard({

  title,

  children,

}) {

  return (

    <div

      style={{

        background: "var(--surface)",

        border: "1px solid var(--border)",

        borderRadius: 16,

        padding: 20,

        marginBottom: 20,

      }}

    >

      {title && (

        <div

          style={{

            fontSize: 17,

            fontWeight: 700,

            color: "var(--text-h)",

            marginBottom: 18,

          }}

        >

          {title}

        </div>

      )}

      {children}

    </div>

  );

}
