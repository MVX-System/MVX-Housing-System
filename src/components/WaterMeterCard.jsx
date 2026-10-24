import { useTranslation } from "../i18n";
import { formatMvxDate } from "../utils/displayDate";
export default function WaterMeterCard({

  meter,

}) {

  const {t, language} = useTranslation();
  const names = {
    lv: ["Dzīvoklis", "Sērijas numurs", "Uzstādīts", "Aktīvs", "Neaktīvs"],
    en: ["Apartment", "Serial number", "Installed", "Active", "Inactive"],
    ru: ["Квартира", "Серийный номер", "Установлен", "Активен", "Неактивен"],
  }[language] || ["Apartment", "Serial number", "Installed", "Active", "Inactive"];
  return (

    <div
      style={{

        background: "var(--surface)",

        border: "1px solid var(--border)",

        borderRadius: 18,

        padding: 18,

        marginBottom: 16,

        boxShadow:
          "0 6px 18px rgba(15,23,42,.06)",

      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >

        <strong>

          {names[0]} {meter.apartment_number}

        </strong>

        <span>

          {meter.type === "hot"

            ? `🔴 ${t("water.card.hotWater")}`

            : `🔵 ${t("water.card.coldWater")}`}

        </span>

      </div>

      <div
        style={{
          marginBottom: 10,
        }}
      >

        <div
          style={{
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          {names[1]}
        </div>

        <div>

          {meter.serial_number}

        </div>

      </div>

      <div
        style={{
          marginBottom: 10,
        }}
      >

        <div
          style={{
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          {names[2]}
        </div>

        <div>

          {meter.installed_at
            ? formatMvxDate(meter.installed_at)
            : "-"}

        </div>

      </div>

      <div>

        <span

          style={{

            display:"inline-block",

            padding:"6px 12px",

            borderRadius:999,

            fontWeight:600,

            background:

              meter.active

                ? "#dcfce7"

                : "#f3f4f6",

            color:

              meter.active

                ? "#15803d"

                : "#6b7280",

          }}

        >

          {meter.active

            ? names[3]

            : names[4]}

        </span>

      </div>

    </div>

  );

}
