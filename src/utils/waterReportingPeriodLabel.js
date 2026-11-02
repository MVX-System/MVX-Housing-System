const MONTHS = {
  lv: [
    "janv.", "febr.", "mar.", "apr.",
    "mai", "jūn.", "jūl.", "aug.",
    "sept.", "okt.", "nov.", "dec."
  ],
  en: [
    "Jan", "Feb", "Mar", "Apr",
    "May", "Jun", "Jul", "Aug",
    "Sep", "Oct", "Nov", "Dec"
  ],
  ru: [
    "янв.", "февр.", "мар.", "апр.",
    "май", "июн.", "июл.", "авг.",
    "сент.", "окт.", "нояб.", "дек."
  ]
};

export function formatWaterReportingPeriodLabel(
  period,
  locale = "lv"
) {
  const raw = String(period ?? "").trim();
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(raw);

  if (!match) return raw || "—";

  const lang = String(locale)
    .toLowerCase()
    .split(/[-_]/)[0];

  const names = MONTHS[lang] || MONTHS.lv;

  return `${names[Number(match[2]) - 1]} ${match[1]}`;
}

export function waterReportingPeriodHeading(locale = "lv") {
  const lang = String(locale)
    .toLowerCase()
    .split(/[-_]/)[0];

  return {
    lv: "Periods",
    en: "Period",
    ru: "Период",
  }[lang] || "Period";
}
