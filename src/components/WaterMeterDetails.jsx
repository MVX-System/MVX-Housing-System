import { useTranslation } from "../i18n";
import { formatMvxDate } from "../utils/displayDate";
import InfoRow from "./InfoRow";
import SectionCard from "./SectionCard";
import StatusBadge from "./StatusBadge";

export default function WaterMeterDetails({

  meter,

}) {

  const { t } = useTranslation();
  if (!meter) {

    return null;

  }

  return (

    <div>

      <div

        style={{

          fontSize: 22,

          fontWeight: 700,

          marginBottom: 20,

        }}

      >

        Water Meter

      </div>

      <SectionCard title="General">

        <InfoRow

          label="Type"

          value={

            meter.type === "hot"

              ? t("water.card.hotWater")

              : t("water.card.coldWater")

          }

        />

        <InfoRow

          label="Serial Number"

          value={

            meter.serial_number ||

            "-"

          }

        />

        <InfoRow

          label="Riser"

          value={

            meter.riser ||

            "-"

          }

        />

        <InfoRow

          label="Installed"

          value={

            meter.installed_at

              ? formatMvxDate(meter.installed_at)

              : "-"

          }

        />

        <InfoRow

          label="Status"

          value={

            <StatusBadge

              active={meter.active}

            />

          }

        />

        <InfoRow

          label="Current Reading"

          value={

            meter.lastReading ??

            "—"

          }

        />

      </SectionCard>

    </div>

  );

}
