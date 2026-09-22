import {
  Navigate,
} from "react-router-dom";

import PageHeader
  from "../components/PageHeader";

import SectionCard
  from "../components/SectionCard";

import {
  useMode,
} from "../context/ModeContext";

import {
  useTranslation,
} from "../i18n";


export default function FindingsPage() {

  const {
    mode,
  } = useMode();

  const {
    t,
  } = useTranslation();

  if (
    mode !==
      "resident"
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return (
    <>
      <PageHeader
        title={t(
          "findings.resident.title"
        )}
        subtitle={t(
          "findings.resident.subtitle"
        )}
      />

      <SectionCard
        title={t(
          "findings.resident.sectionTitle"
        )}
      >
        <div
          style={{
            color:
              "var(--text)",
            lineHeight: 1.6,
          }}
        >
          {t(
            "findings.resident.foundation"
          )}
        </div>

        <div
          style={{
            marginTop: 12,
            color:
              "var(--text-muted, #64748b)",
            fontSize: 13,
          }}
        >
          {t(
            "findings.testOnly"
          )}
        </div>
      </SectionCard>
    </>
  );
}
