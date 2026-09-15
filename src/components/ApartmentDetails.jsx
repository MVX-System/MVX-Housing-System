import { useState } from "react";

import Drawer from "./Drawer";
import SectionCard from "./SectionCard";
import TabBar from "./TabBar";
import WaterMeterDetails from "./WaterMeterDetails";

import ApartmentWaterTab
  from "./apartment/ApartmentWaterTab";

export default function ApartmentDetails({
  apartment,
}) {

  const [tab, setTab] =
    useState("Water");

  const [
    selectedMeter,
    setSelectedMeter,
  ] = useState(null);

  if (!apartment) {
    return null;
  }

  return (

    <div>

      <TabBar
        tabs={[
          "Water",
          "Residents",
          "Documents",
          "Tasks",
          "History",
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "Water" && (

        <ApartmentWaterTab
          apartment={apartment}
          onOpenMeter={setSelectedMeter}
        />

      )}

      {tab === "Residents" && (

        <SectionCard>

          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text)",
            }}
          >
            No residents data
          </div>

        </SectionCard>

      )}

      {tab === "Documents" && (

        <SectionCard>

          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text)",
            }}
          >
            No documents
          </div>

        </SectionCard>

      )}

      {tab === "Tasks" && (

        <SectionCard>

          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text)",
            }}
          >
            No tasks
          </div>

        </SectionCard>

      )}

      {tab === "History" && (

        <SectionCard>

          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text)",
            }}
          >
            No history
          </div>

        </SectionCard>

      )}

      <Drawer
        open={!!selectedMeter}
        title={
          selectedMeter
            ? `Meter ${selectedMeter.serial_number}`
            : "Water Meter"
        }
        onClose={() =>
          setSelectedMeter(null)
        }
      >

        <WaterMeterDetails
          meter={selectedMeter}
        />

      </Drawer>

    </div>

  );

}
