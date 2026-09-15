export default function Drawer({

  open,

  title,

  children,

  onClose,

}) {

  if (!open) {

    return null;

  }

  return (

    <>

      <div

        onClick={onClose}

        style={{

          position: "fixed",

          inset: 0,

          background: "rgba(0,0,0,.35)",

          zIndex: 1500,

        }}

      />

      <div

        style={{

          position: "fixed",

          top: 0,

          right: 0,

          width: 420,

          maxWidth: "100%",

          height: "100vh",

          background: "var(--surface)",

          boxShadow:

            "-8px 0 24px rgba(0,0,0,.15)",

          zIndex: 1600,

          display: "flex",

          flexDirection: "column",

        }}

      >

        <div

          style={{

            padding: 20,

            borderBottom:

              "1px solid var(--border)",

            display: "flex",

            justifyContent:

              "space-between",

            alignItems: "center",

          }}

        >

          <strong>

            {title}

          </strong>

          <button

            onClick={onClose}

          >

            ✕

          </button>

        </div>

        <div

          style={{

            padding: 20,

            overflowY: "auto",

            flex: 1,

          }}

        >

          {children}

        </div>

      </div>

    </>

  );

}
