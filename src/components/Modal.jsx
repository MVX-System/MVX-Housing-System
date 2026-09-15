import { useEffect } from "react";

import {
  modalStyle,
  modalContentStyle,
} from "../styles/theme";

export default function Modal({
  open,
  title,
  children,
  onClose,
}) {

  useEffect(() => {

    if (!open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {

      document.body.style.overflow =
        previousOverflow;
    };

  }, [open]);

  useEffect(() => {

    if (!open) {
      return undefined;
    }

    const handleKeyDown =
      (event) => {

        if (
          event.key === "Escape"
        ) {
          onClose();
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };

  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (

    <div
      style={{
        ...modalStyle,

        overflowY: "auto",

        padding:
          "20px 12px",

        boxSizing:
          "border-box",
      }}
    >

      <div
        style={{
          ...modalContentStyle,

          width: "100%",

          maxWidth: 560,

          maxHeight:
            "calc(100vh - 40px)",

          overflowY: "auto",

          boxSizing:
            "border-box",

          margin: "auto",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >

          <h2
            style={{
              margin: 0,
              fontSize: 20,
              lineHeight: 1.25,
            }}
          >
            {title}
          </h2>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              flexShrink: 0,

              width: 36,
              height: 36,

              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",

              padding: 0,

              border: "none",
              borderRadius: 8,

              background:
                "transparent",

              color: "var(--text-h)",
              fontSize: 24,
              lineHeight: 1,

              cursor: "pointer",
            }}
          >
            ×
          </button>

        </div>

        {children}

      </div>

    </div>

  );
}
