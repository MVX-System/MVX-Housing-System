const layout = {
  display: "flex",
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--text)",
};

const sidebar = {
  width: 240,
  minWidth: 240,
  maxWidth: 240,
  flex: "0 0 240px",
  flexShrink: 0,
  background: "#111827",
  color: "white",
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  position: "sticky",
  top: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

const sidebarTitle = {
  color: "white",
  margin:
    "0 0 10px",
  lineHeight: 1.25,
};

const sidebarUser = {
  color: "#d1d5db",
  marginBottom: 10,
  fontSize: 12,
  lineHeight: 1.35,
  overflowWrap:
    "anywhere",
};

const divider = {
  borderColor: "#374151",
  width: "100%",
  margin:
    "8px 0",
};

const modeBlock = {
  marginBottom: 8,
};

const content = {
  flex: "1 1 auto",
  minWidth: 0,
  padding: 30,
  color: "var(--text)",
};

const loginPage = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "var(--bg)",
  padding: 20,
};

const loginCard = {
  background: "var(--surface)",
  color: "var(--text)",
  padding: 30,
  borderRadius: 20,
  width: "100%",
  maxWidth: 420,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};

const inputStyle = {
  width: "100%",
  padding: 12,
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--input-text)",
  boxSizing: "border-box",
};

const buttonStyle = {
  marginTop: 8,
  padding: "9px 10px",
  minHeight: 36,
  borderRadius: 9,
  border: "1px solid var(--accent)",
  background: "var(--accent)",
  color: "#ffffff",
  cursor: "pointer",
  width: "100%",
  boxSizing:
    "border-box",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.2,
  whiteSpace: "normal",
  overflowWrap:
    "anywhere",
};

const menuButton = {
  width: "100%",
  minHeight: 34,
  padding: "7px 9px",
  marginTop: 6,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  boxSizing:
    "border-box",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.2,
  textAlign: "center",
  whiteSpace: "normal",
  overflowWrap:
    "break-word",
  wordBreak:
    "normal",
  hyphens:
    "none",
};

const activeButton = {
  ...menuButton,
  background: "#2563eb",
  color: "white",
};

const cardStyle = {
  background: "var(--surface)",
  color: "var(--text)",
  padding: 20,
  borderRadius: 20,
  marginBottom: 20,
  border: "1px solid var(--border)",
};

const labelStyle = {
  textAlign: "right",
  paddingRight: 20,
  fontWeight: "bold",
  color: "var(--text-h)",
};

const tableStyle = {
  width: "100%",
  background: "var(--surface)",
  color: "var(--text)",
  borderCollapse: "collapse",
};

const dashboardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 20,
};

const dashboardCard = {
  background: "var(--surface)",
  color: "var(--text)",
  borderRadius: 20,
  padding: 28,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  transition: "all 0.2s ease",
  minHeight: 130,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const modalStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const modalContentStyle = {
  background: "var(--surface)",
  color: "var(--text)",
  padding: 30,
  borderRadius: 20,
  width: "100%",
  maxWidth: 500,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};

export {
  layout,
  sidebar,
  sidebarTitle,
  sidebarUser,
  divider,
  modeBlock,
  content,
  loginPage,
  loginCard,
  inputStyle,
  buttonStyle,
  menuButton,
  activeButton,
  cardStyle,
  labelStyle,
  tableStyle,
  dashboardGrid,
  dashboardCard,
  modalStyle,
  modalContentStyle,
};

export const pageHeader = {
  position: "sticky",
  top: 0,
  zIndex: 100,
  background: "var(--bg)",
  paddingBottom: 16,
  marginBottom: 20,
};

export const pageHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

export const pageHeaderButtons = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

export const actionButton = {
  height: 42,
  padding: "0 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  transition: "0.15s",
};

export const dangerButton = {
  ...actionButton,
  background: "#dc2626",
};

export const modernTable = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  background: "var(--surface)",
  color: "var(--text)",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "var(--shadow)",
};

export const modernTh = {
  background: "var(--surface-soft)",
  padding: "18px 20px",
  textAlign: "left",
  color: "var(--text-h)",
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: ".03em",
  borderBottom: "1px solid var(--border)",
};

export const modernTd = {
  padding: "18px 20px",
  fontSize: 15,
  color: "var(--text)",
  borderBottom: "1px solid var(--border-soft)",
};

export const statusActive = {
  display: "inline-block",
  padding: "6px 14px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#15803d",
  fontWeight: 600,
  fontSize: 14,
};

export const statusInactive = {
  display: "inline-block",
  padding: "6px 14px",
  borderRadius: 999,
  background: "var(--surface-muted)",
  color: "var(--text)",
  fontWeight: 600,
  fontSize: 14,
};

export const tableContainer = {
  background: "var(--surface)",
  borderRadius: 18,
  overflowX: "auto",
  overflowY: "hidden",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  marginTop: 20,
};

export const apartmentCard = {
  background: "var(--surface)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 18,
  padding: 20,
  marginBottom: 24,
  boxShadow: "var(--shadow)",
};

export const apartmentTitle = {
  border: "none",
  background: "none",
  padding: 0,
  cursor: "pointer",
  fontSize: 18,
  fontWeight: 600,
  color: "var(--accent)",
};

export const riserBlock = {
  marginBottom: 18,
  borderTop: "1px solid var(--border-soft)",
  paddingTop: 14,
};

export const riserTitle = {
  fontWeight: 700,
  color: "var(--text-h)",
  marginBottom: 10,
};

export const meterCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--surface-soft)",
  color: "var(--text)",
  cursor: "pointer",
  transition: "0.15s",
};

export const meterLeft = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: 1,
};

export const meterHistoryButton = {
  padding: "5px 10px",
  borderRadius: 6,
  border: "1px solid var(--accent)",
  background: "var(--surface)",
  color: "var(--accent)",
  fontSize: 11,
  cursor: "pointer",
  fontWeight: 600,
};
