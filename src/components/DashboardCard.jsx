import { dashboardCard } from "../styles/theme";

export default function DashboardCard({
  title,
  value,
}) {
  return (
    <div
      style={dashboardCard}
    >
      <div
        style={{
          fontSize: 14,
          color: "var(--text)",
          marginBottom: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 42,
          fontWeight: 700,
          color: "var(--text-h)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
