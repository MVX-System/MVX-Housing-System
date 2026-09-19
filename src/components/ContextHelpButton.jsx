import {
  useLocation,
} from "react-router-dom";

import {
  useMode,
} from "../context/ModeContext";

import {
  useTranslation,
} from "../i18n";

import {
  openManualWindow,
} from "../manual/manualNavigation";

const TEXT = {
  lv: {
    label: "Palīdzība",
    title:
      "Atvērt palīdzību par šo lapu atsevišķā logā",
  },
  en: {
    label: "Help",
    title:
      "Open help for this page in a separate window",
  },
  ru: {
    label: "Помощь",
    title:
      "Открыть справку для этой страницы в отдельном окне",
  },
};

export default function ContextHelpButton() {
  const {
    pathname,
  } = useLocation();

  const {
    mode,
  } = useMode();

  const {
    language,
  } = useTranslation();

  if (
    pathname === "/manual" ||
    pathname.startsWith(
      "/manual/"
    )
  ) {
    return null;
  }

  const text =
    TEXT[language] || TEXT.en;

  const openHelp = () => {
    openManualWindow({
      mode,
      pathname,
      contextual: true,
    });
  };

  return (
    <button
      type="button"
      className="context-help-button"
      onClick={openHelp}
      aria-label={text.title}
      title={text.title}
    >
      <span
        className="context-help-symbol"
        aria-hidden="true"
      >
        ?
      </span>

      <span
        className="context-help-label"
      >
        {text.label}
      </span>
    </button>
  );
}
