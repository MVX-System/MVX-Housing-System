import TableSection from "./TableSection";

import Badge from "./ui/Badge";

import {

  tableContainer,

  modernTable,

  modernTh,

  modernTd,

  statusActive,

  statusInactive,

} from "../styles/theme";

export default function WaterMeterTable({

  meters,

}) {

  return (

     <TableSection>
      
      <table style={modernTable}>

        <thead>

          <tr>

            <th style={modernTh}>
              Apartment
            </th>

            <th style={modernTh}>
              Type
            </th>

            <th style={modernTh}>
              Serial Number
            </th>

            <th style={modernTh}>
              Installed
            </th>

            <th style={modernTh}>
              Status
            </th>

          </tr>

        </thead>

        <tbody>

          {meters.map((meter) => (

          <tr
            key={meter.id}
            style={{
              transition: "background-color .15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-soft)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface)";
            }}
          >

              <td style={modernTd}>
                {meter.apartment_number}
              </td>

              <td style={modernTd}>

                {meter.type === "hot"

                  ? "🔴 Hot"

                  : "🔵 Cold"}

              </td>

              <td style={modernTd}>
                {meter.serial_number}
              </td>

              <td style={modernTd}>

                {meter.installed_at

                  ? meter.installed_at.slice(0, 10)

                  : "-"}

              </td>

              <td style={modernTd}>

                <Badge
                  color={
                    meter.active
                      ? "green"
                      : "gray"
                  }
                >
                
                  {meter.active
                    ? "Active"
                    : "Inactive"}
                
                </Badge>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </TableSection>

  );

}
