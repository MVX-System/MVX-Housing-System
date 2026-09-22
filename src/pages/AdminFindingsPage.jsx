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


export default function AdminFindingsPage() {

  const {
    mode,
  } = useMode();

  const {
    t,
  } = useTranslation();

  if (
    mode !==
      "admin"
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
          "findings.admin.title"
        )}
        subtitle={t(
          "findings.admin.subtitle"
        )}
      />

      <SectionCard
        title={t(
          "findings.admin.sectionTitle"
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
            "findings.admin.foundation"
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
